// import config from "../config";
// import { ICreateChatPayload } from "../modules/chat/chat.interface";
// import { IWebSocketClient } from "../modules/chat/chat.websocket";
// import prisma from "../utils/prisma";
// import jwt from "jsonwebtoken";

// export interface IWebSocketMessage {
//   type: string;
//   payload: any;
// }

// const clients = new Map<string, IWebSocketClient[]>();

// export const handleAuthentication = async (
//   ws: IWebSocketClient,
//   token: string
// ) => {
//   try {
//     const decoded = jwt.verify(token, config.jwt.access.secret as string) as {
//       id: string;
//     };
//     const userId = decoded.id;

//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { id: true },
//     });

//     if (!user) {
//       throw new Error("User not found");
//     }

//     ws.userId = userId;
//     ws.isAuthenticated = true;

//     if (!clients.has(userId)) {
//       clients.set(userId, []);
//     }
//     clients.get(userId)?.push(ws);

//     ws.send(
//       JSON.stringify({
//         type: "authentication",
//         payload: {
//           status: "success",
//           userId,
//         },
//       })
//     );

//     console.log(`User ${userId} authenticated`);
//   } catch (error) {
//     console.error("Authentication error:", error);
//     ws.send(
//       JSON.stringify({
//         type: "authentication",
//         payload: {
//           status: "error",
//           message:
//             error instanceof Error ? error.message : "Authentication failed",
//         },
//       })
//     );
//     ws.close(1008, "Authentication failed");
//   }
// };

// // export const handleChatMessage = async (
// //   senderId: string,
// //   payload: ICreateChatPayload
// // ) => {
// //   try {
// //     const chat = await ChatService.createChatIntoDB(senderId, payload);

// //     sendToUser(payload.receiverId, {
// //       type: "chat",
// //       payload: chat,
// //     });

// //     sendToUser(senderId, {
// //       type: "chat_sent",
// //       payload: chat,
// //     });
// //   } catch (error) {
// //     console.error("Error handling chat message:", error);
// //     sendToUser(senderId, {
// //       type: "error",
// //       payload:
// //         error instanceof Error ? error.message : "Failed to send message",
// //     });
// //   }
// // };

// export const handleChatMessage = async (
//   senderId: string,
//   payload: ICreateChatPayload
// ) => {
//   try {
//     const { receiverId, message, jobPostId } = payload;

//     // Validate the receiver exists
//     const receiver = await prisma.user.findUnique({
//       where: { id: receiverId },
//       select: { id: true },
//     });

//     if (!receiver) {
//       throw new Error("Receiver not found");
//     }

//     // If jobPostId is provided, validate chat permissions
//     if (jobPostId) {
//       const jobPost = await prisma.jobPost.findUnique({
//         where: { id: jobPostId },
//         select: { userId: true },
//       });

//       if (!jobPost) {
//         throw new Error("Job post not found");
//       }

//       // Check if sender is job poster or applicant
//       const isSenderJobPoster = jobPost.userId === senderId;
//       const isReceiverJobPoster = jobPost.userId === receiverId;

//       if (isSenderJobPoster) {
//         // Check if receiver has applied to this job
//         const application = await prisma.jobApplication.findFirst({
//           where: {
//             jobId: jobPostId,
//             jobSeekerId: receiverId,
//           },
//         });

//         if (!application) {
//           throw new Error("Receiver has not applied to this job");
//         }
//       } else if (isReceiverJobPoster) {
//         // Check if sender has applied to this job
//         const application = await prisma.jobApplication.findFirst({
//           where: {
//             jobId: jobPostId,
//             jobSeekerId: senderId,
//           },
//         });

//         if (!application) {
//           throw new Error("You have not applied to this job");
//         }
//       } else {
//         throw new Error("Neither participant is associated with this job");
//       }
//     }

//     // Create the chat message
//     const chat = await prisma.chat.create({
//       data: {
//         senderId,
//         receiverId,
//         message,
//         jobPostId,
//       },
//       include: {
//         sender: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             profilePic: true,
//           },
//         },
//         receiver: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             profilePic: true,
//           },
//         },
//         jobPost: {
//           select: {
//             id: true,
//             title: true,
//           },
//         },
//       },
//     });

//     sendToUser(receiverId, {
//       type: "chat",
//       payload: chat,
//     });

//     sendToUser(senderId, {
//       type: "chat_sent",
//       payload: chat,
//     });

//     return chat;
//   } catch (error) {
//     console.error("Error handling chat message:", error);
//     sendToUser(senderId, {
//       type: "error",
//       payload:
//         error instanceof Error ? error.message : "Failed to send message",
//     });
//     throw error; // Re-throw for upstream error handling
//   }
// };

// export const sendToUser = (userId: string, message: any) => {
//   const userClients = clients.get(userId);
//   if (userClients && userClients.length > 0) {
//     const messageStr = JSON.stringify(message);
//     userClients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(messageStr);
//       }
//     });
//   }
// };

// export const removeClient = (userId: string, ws: IWebSocketClient) => {
//   const userClients = clients.get(userId);
//   if (userClients) {
//     const index = userClients.indexOf(ws);
//     if (index !== -1) {
//       userClients.splice(index, 1);
//     }

//     if (userClients.length === 0) {
//       clients.delete(userId);
//     }
//   }
// };
