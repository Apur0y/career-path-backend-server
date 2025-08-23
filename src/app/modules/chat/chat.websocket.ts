import { Server } from "http";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import { WebSocketServer, WebSocket } from "ws";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import { ChatRoomService } from "../chatRoom/chatRoom.service";

interface CustomWebSocket extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
  connectionId?: string;
  userRole?: string;
  lastActivity?: Date;
  isAlive?: boolean;
}

interface ChatMessage {
  type:
    | "message"
    | "authenticate"
    | "connection"
    | "authentication"
    | "message_status"
    | "chat_history"
    | "chat_list"
    | "typing"
    | "stop_typing"
    | "message_read"
    | "user_online"
    | "user_offline"
    | "error";
  senderId?: string;
  roomId?: string;
  receiverId?: string; // Keep for backward compatibility
  jobPostId?: string; // Keep for backward compatibility
  message?: string;
  token?: string;
  status?: string;
  userId?: string;
  messageId?: string;
  error?: string;
  statusCode?: number;
  createdAt?: string;
  connectionId?: string;
  senderFullName?: string;
  senderEmail?: string;
  senderProfilePic?: string;
  history?: any[];
  chatList?: any[];
  page?: number;
  limit?: number;
  isTyping?: boolean;
  messageIds?: string[];
}

interface UserConnection {
  ws: CustomWebSocket;
  userId: string;
  connectionId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export const connectWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({ server });
  const activeConnections = new Map<string, UserConnection>();
  const userConnections = new Map<string, Set<string>>();
  // Heartbeat mechanism to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: CustomWebSocket) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  const validateChatPermission = async (
    senderId: string,
    receiverId: string,
    jobPostId: string
  ): Promise<string> => {
    if (!jobPostId) {
      throw new ApiError(400, "Job Post ID is required for all chats");
    }

    try {
      // Create or get chat room and return room ID
      const chatRoom = await ChatRoomService.createOrGetChatRoom(
        senderId,
        receiverId,
        jobPostId,
        "JOB_APPLICATION"
      );
      console.log(
        `Chat room created/found: ${chatRoom.id}, participants:`,
        chatRoom.participants?.map((p) => p.userId)
      );
      return chatRoom!.id;
    } catch (error) {
      console.error("Error validating chat permission:", error);
      throw new ApiError(500, "Error validating chat permissions");
    }
  };

  const broadcastToUser = (userId: string, message: ChatMessage): void => {
    const connections = userConnections.get(userId);
    if (connections) {
      connections.forEach((connectionId) => {
        const connection = activeConnections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(message));
        }
      });
    }
  };

  const notifyUserStatus = (
    userId: string,
    status: "online" | "offline"
  ): void => {
    const statusMessage: ChatMessage = {
      type: status === "online" ? "user_online" : "user_offline",
      userId: userId,
      createdAt: new Date().toISOString(),
    };

    // Broadcast to all connected users (you might want to optimize this)
    activeConnections.forEach((connection) => {
      if (
        connection.userId !== userId &&
        connection.ws.readyState === WebSocket.OPEN
      ) {
        connection.ws.send(JSON.stringify(statusMessage));
      }
    });
  };

  const getUserChatList = async (userId: string): Promise<any[]> => {
    try {
      // Use the new ChatRoom service
      const chatRooms = await ChatRoomService.getUserChatRooms(userId);
      return chatRooms;
    } catch (error) {
      console.error("Error fetching chat list:", error);
      throw new ApiError(500, "Error fetching chat list");
    }
  };

  const markMessagesAsRead = async (
    roomId: string,
    userId: string
  ): Promise<void> => {
    try {
      await prisma.chat.updateMany({
        where: {
          roomId: roomId,
          senderId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  wss.on("connection", (ws: CustomWebSocket) => {
    const connectionId = Math.random().toString(36).substring(2, 15);
    ws.connectionId = connectionId;
    ws.isAlive = true;
    ws.lastActivity = new Date();

    // Heartbeat response
    ws.on("pong", () => {
      ws.isAlive = true;
      ws.lastActivity = new Date();
    });

    console.log(`New client connected (ID: ${connectionId})`);

    // Send connection acknowledgment
    const connectionAck: ChatMessage = {
      type: "connection",
      status: "connected",
      message: "Please authenticate to start chatting",
      connectionId,
      createdAt: new Date().toISOString(),
    };
    ws.send(JSON.stringify(connectionAck));

    ws.on("message", async (message: string) => {
      try {
        let data: ChatMessage;

        // Update last activity
        ws.lastActivity = new Date();

        // Validate JSON format
        try {
          data = JSON.parse(message);
        } catch (e) {
          throw new ApiError(400, "Invalid JSON format");
        }

        // Validate message structure
        if (!data.type) {
          throw new ApiError(400, "Message type is required");
        }

        // Authentication handler
        if (data.type === "authenticate") {
          if (!data.token) {
            throw new ApiError(403, "No token provided");
          }

          try {
            const decoded = jwtHelpers.verifyToken(data.token);
            ws.userId = decoded.id || "";
            ws.userRole = decoded.role || "";
            ws.isAuthenticated = true;

            // Store connection
            const connection: UserConnection = {
              ws,
              userId: ws.userId!,
              connectionId,
              connectedAt: new Date(),
              lastActivity: new Date(),
            };
            activeConnections.set(connectionId, connection);

            // Track user connections
            if (!userConnections.has(ws.userId!)) {
              userConnections.set(ws.userId!, new Set());
            }
            userConnections.get(ws.userId!)!.add(connectionId);

            // Notify others about user coming online
            notifyUserStatus(ws.userId!, "online");

            const authResponse: ChatMessage = {
              type: "authentication",
              status: "success",
              message: "Authenticated successfully",
              userId: ws.userId,
              connectionId,
              createdAt: new Date().toISOString(),
            };
            ws.send(JSON.stringify(authResponse));

            // Send chat list after authentication
            const chatList = await getUserChatList(ws.userId!);
            const chatListResponse: ChatMessage = {
              type: "chat_list",
              chatList,
              createdAt: new Date().toISOString(),
            };
            ws.send(JSON.stringify(chatListResponse));

            return;
          } catch (error) {
            throw new ApiError(401, "Invalid token");
          }
        }

        // Verify authentication for other message types
        if (!ws.isAuthenticated || !ws.userId) {
          throw new ApiError(401, "Not authenticated");
        }

        // Message handler
        if (data.type === "message") {
          // Validate required fields
          const missingFields = [];
          if (!data.roomId && !data.receiverId)
            missingFields.push("roomId or receiverId");
          if (!data.message?.trim()) missingFields.push("message");

          if (missingFields.length > 0) {
            throw new ApiError(
              400,
              `Missing required fields: ${missingFields.join(", ")}`
            );
          }

          // Verify the sender is who they claim to be
          if (data.senderId && data.senderId !== ws.userId) {
            throw new ApiError(403, "Sender ID mismatch");
          }

          let roomId = data.roomId;

          // If roomId not provided, create/get room using receiverId
          if (!roomId && data.receiverId) {
            if (!data.jobPostId) {
              throw new ApiError(
                400,
                "Job Post ID is required when using receiverId"
              );
            }
            roomId = await validateChatPermission(
              ws.userId,
              data.receiverId,
              data.jobPostId
            );
          }

          if (!roomId) {
            throw new ApiError(400, "Unable to determine chat room");
          }

          // Save message to database
          const chat = await prisma.chat.create({
            data: {
              roomId: roomId,
              senderId: ws.userId,
              message: data.message?.trim() || "",
              messageType: "TEXT",
              isRead: false,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  profilePic: true,
                },
              },
              room: {
                include: {
                  participants: {
                    where: { isActive: true },
                    include: {
                      user: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Prepare message for all room participants
          const messageData: ChatMessage = {
            type: "message",
            messageId: chat.id,
            senderId: chat.senderId,
            roomId: chat.roomId,
            message: chat.message,
            createdAt: chat.createdAt.toISOString(),
            senderFullName: chat.sender.fullName || "",
            senderEmail: chat.sender.email || "",
            senderProfilePic: chat.sender.profilePic || "",
          };

          // Broadcast to all room participants except sender
          chat.room.participants.forEach((participant: any) => {
            if (participant.userId !== ws.userId) {
              broadcastToUser(participant.userId, messageData);
            }
          });

          // Send delivery confirmation to sender
          const deliveryConfirmation: ChatMessage = {
            type: "message_status",
            status: "delivered",
            messageId: chat.id,
            roomId: chat.roomId, // Include roomId in response
            createdAt: new Date().toISOString(),
          };
          ws.send(JSON.stringify(deliveryConfirmation));
        }

        // Chat history handler
        if (data.type === "chat_history") {
          // Validate required fields
          const missingFields = [];
          if (!data.roomId) missingFields.push("roomId");

          if (missingFields.length > 0) {
            throw new ApiError(
              400,
              `Missing required fields: ${missingFields.join(", ")}`
            );
          }

          // Pagination parameters
          const page = data.page || 1;
          const limit = data.limit || 50;

          try {
            // Debug: Log the roomId and userId being used
            console.log(
              `Getting chat history for room: ${data.roomId}, user: ${ws.userId}`
            );

            // Get chat history using ChatRoom service
            const chatHistory = await ChatRoomService.getChatRoomMessages(
              data.roomId!,
              ws.userId,
              page,
              limit
            );

            // Mark messages as read
            await markMessagesAsRead(data.roomId!, ws.userId);

            // Prepare history response
            const historyResponse: ChatMessage = {
              type: "chat_history",
              roomId: data.roomId,
              page,
              limit,
              history: chatHistory.map((chat: any) => ({
                id: chat.id,
                senderId: chat.senderId,
                roomId: chat.roomId,
                message: chat.message,
                messageType: chat.messageType,
                isRead: chat.isRead,
                createdAt: chat.createdAt.toISOString(),
                senderFullName: chat.sender.fullName,
                senderEmail: chat.sender.email,
                senderProfilePic: chat.sender.profilePic,
              })),
              createdAt: new Date().toISOString(),
            };

            ws.send(JSON.stringify(historyResponse));
          } catch (error) {
            console.error("Chat history error:", error);
            throw new ApiError(403, "Not authorized to view chat history");
          }
        }

        // Chat list handler
        if (data.type === "chat_list") {
          const chatList = await getUserChatList(ws.userId);
          const chatListResponse: ChatMessage = {
            type: "chat_list",
            chatList,
            createdAt: new Date().toISOString(),
          };
          ws.send(JSON.stringify(chatListResponse));
        }

        // Typing indicator
        if (data.type === "typing" || data.type === "stop_typing") {
          if (!data.roomId) {
            throw new ApiError(400, "roomId is required for typing indicators");
          }

          try {
            // Verify user is in the room
            const room = await prisma.chatRoom.findUnique({
              where: { id: data.roomId },
              include: {
                participants: {
                  where: { isActive: true },
                },
              },
            });

            if (
              !room ||
              !room.participants.some((p: any) => p.userId === ws.userId)
            ) {
              throw new ApiError(
                403,
                "Not authorized to send typing indicators"
              );
            }

            const typingMessage: ChatMessage = {
              type: data.type,
              senderId: ws.userId,
              roomId: data.roomId,
              createdAt: new Date().toISOString(),
            };

            // Broadcast to all room participants except sender
            room.participants.forEach((participant: any) => {
              if (participant.userId !== ws.userId) {
                broadcastToUser(participant.userId, typingMessage);
              }
            });
          } catch (error) {
            throw new ApiError(403, "Not authorized to send typing indicators");
          }
        }

        // Mark messages as read
        if (data.type === "message_read") {
          if (!data.messageIds || !Array.isArray(data.messageIds)) {
            throw new ApiError(400, "messageIds array is required");
          }

          await prisma.chat.updateMany({
            where: {
              id: { in: data.messageIds },
              senderId: { not: ws.userId }, // Don't mark own messages as read
            },
            data: {
              isRead: true,
            },
          });

          const readConfirmation: ChatMessage = {
            type: "message_status",
            status: "read",
            messageIds: data.messageIds,
            createdAt: new Date().toISOString(),
          };

          ws.send(JSON.stringify(readConfirmation));
        }
      } catch (error) {
        console.error("Error handling message:", error);

        const errorResponse: ChatMessage = {
          type: "error",
          error:
            error instanceof ApiError ? error.message : "Internal server error",
          statusCode: error instanceof ApiError ? error.statusCode : 500,
          createdAt: new Date().toISOString(),
        };

        ws.send(JSON.stringify(errorResponse));

        // Close connection for authentication errors
        if (error instanceof ApiError && error.statusCode === 401) {
          ws.close();
        }
      }
    });

    ws.on("close", () => {
      console.log(
        `Connection ${connectionId} (User ${
          ws.userId || "unknown"
        }) disconnected`
      );

      // Clean up connections
      activeConnections.delete(connectionId);

      if (ws.userId && userConnections.has(ws.userId)) {
        const connections = userConnections.get(ws.userId)!;
        connections.delete(connectionId);

        // If no more connections for this user, notify offline status
        if (connections.size === 0) {
          userConnections.delete(ws.userId);
          notifyUserStatus(ws.userId, "offline");
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error on connection ${connectionId}:`, error);

      // Clean up connections
      activeConnections.delete(connectionId);

      if (ws.userId && userConnections.has(ws.userId)) {
        const connections = userConnections.get(ws.userId)!;
        connections.delete(connectionId);

        if (connections.size === 0) {
          userConnections.delete(ws.userId);
          notifyUserStatus(ws.userId, "offline");
        }
      }
    });
  });

  // Cleanup on server shutdown
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  // Get the port correctly
  const address = server.address();
  const port = typeof address === "string" ? address : address?.port;
  console.log(`✅ WebSocket server is running on port ${port}`);

  // Return cleanup function
  return () => {
    console.log("Closing WebSocket server...");
    clearInterval(heartbeatInterval);
    wss.clients.forEach((client) => client.close());
    wss.close();
  };
};
