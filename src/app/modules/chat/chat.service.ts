import status from "http-status";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import { ICreateChatPayload } from "./chat.interface";
import { ChatRoomService } from "../chatRoom/chatRoom.service";

const createChatIntoDB = async (
  senderId: string,
  payload: ICreateChatPayload
) => {
  const { receiverId, message, jobPostId } = payload;

  // Check if receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
  });

  if (!receiver) {
    throw new ApiError(status.NOT_FOUND, "Receiver not found");
  }

  // Job Post ID is required for all chats
  if (!jobPostId) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Job Post ID is required for all chat conversations"
    );
  }

  // Create or get chat room
  const chatRoom = await ChatRoomService.createOrGetChatRoom(
    senderId,
    receiverId,
    jobPostId,
    "JOB_APPLICATION"
  );

  // Create chat message in the room
  const chat = await prisma.chat.create({
    data: {
      roomId: chatRoom!.id,
      senderId,
      message,
      messageType: "TEXT",
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
        },
      },
      room: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  fullName: true,
                  email: true,
                  profilePic: true,
                  role: true,
                },
              },
            },
          },
          jobPost: {
            select: {
              id: true,
              jobId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return chat;
};

// const getMyChatsFromDB = async (
//   userId: string,
//   query: IChatQueryParams
// ): Promise<{ data: any[]; meta: IMeta }> => {
//   const { receiverId, jobPostId, page = 1, limit = 10 } = query;

//   // Build the where condition
//   const whereCondition: any = {};

//   if (receiverId) {
//     // Get chat between current user and specific receiver
//     whereCondition.OR = [
//       {
//         senderId: userId,
//         receiverId,
//       },
//       {
//         senderId: receiverId,
//         receiverId: userId,
//       },
//     ];
//   } else {
//     // Get all chats where current user is sender or receiver
//     whereCondition.OR = [{ senderId: userId }, { receiverId: userId }];
//   }

//   // Add jobPostId filter if provided
//   if (jobPostId) {
//     whereCondition.jobPostId = jobPostId;
//   }

//   // Calculate pagination
//   const skip = (Number(page) - 1) * Number(limit);
//   const take = Number(limit);

//   // Execute query with pagination
//   const [chats, total] = await Promise.all([
//     prisma.chat.findMany({
//       where: whereCondition,
//       include: {
//         sender: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             fullName: true,
//             email: true,
//             profilePic: true,
//             role: true,
//           },
//         },
//         receiver: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             fullName: true,
//             email: true,
//             profilePic: true,
//             role: true,
//           },
//         },
//         jobPost: {
//           select: {
//             id: true,
//             jobId: true,
//             title: true,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       skip,
//       take,
//     }),
//     prisma.chat.count({
//       where: whereCondition,
//     }),
//   ]);

//   const totalPage = Math.ceil(total / Number(limit));

//   const meta: IMeta = {
//     page: Number(page),
//     limit: Number(limit),
//     total,
//     totalPage,
//   };

//   return {
//     data: chats,
//     meta,
//   };
// };

const getMyChatsFromDB = async (userId: string) => {
  // Use the new ChatRoom service to get user's chat rooms
  const chatRooms = await ChatRoomService.getUserChatRooms(userId);

  return {
    data: chatRooms,
  };
};

const markChatAsReadInDB = async (chatId: string, userId: string) => {
  // Check if chat exists
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      room: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (!chat) {
    throw new ApiError(status.NOT_FOUND, "Chat not found");
  }

  // Check if user is a participant in the room
  const isParticipant = chat.room.participants.some(
    (p: any) => p.userId === userId && p.isActive
  );

  if (!isParticipant) {
    throw new ApiError(
      status.FORBIDDEN,
      "You can only mark messages in rooms you participate in as read"
    );
  }

  // Don't allow marking own messages as read
  if (chat.senderId === userId) {
    throw new ApiError(
      status.BAD_REQUEST,
      "You cannot mark your own messages as read"
    );
  }

  // Mark chat as read
  const updatedChat = await prisma.chat.update({
    where: { id: chatId },
    data: { isRead: true },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          email: true,
          profilePic: true,
          role: true,
        },
      },
      room: {
        include: {
          jobPost: {
            select: {
              id: true,
              jobId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return updatedChat;
};

const getChatParticipantsFromDB = async (userId: string) => {
  // Get all chat rooms where the user is a participant
  const chatRooms = await ChatRoomService.getUserChatRooms(userId);

  // Extract unique participants from all rooms
  const participantIds = new Set<string>();
  const jobPostIds = new Set<string>();

  chatRooms.forEach((room: any) => {
    room.participants.forEach((participant: any) => {
      if (participant.userId !== userId) {
        participantIds.add(participant.userId);
      }
    });

    if (room.jobPostId) {
      jobPostIds.add(room.jobPostId);
    }
  });

  // Get participant details
  const participants = await prisma.user.findMany({
    where: {
      id: { in: Array.from(participantIds) },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      profilePic: true,
      role: true,
    },
  });

  const jobPosts =
    jobPostIds.size > 0
      ? await prisma.jobPost.findMany({
          where: {
            id: { in: Array.from(jobPostIds) },
          },
          select: {
            id: true,
            jobId: true,
            title: true,
          },
        })
      : [];

  return { participants, jobPosts };
};

// Function to get chat history for WebSocket - now uses rooms
const getChatHistoryFromDB = async (
  userId: string,
  roomId: string,
  page: number = 1,
  limit: number = 50
) => {
  // Use the ChatRoom service to get messages
  const messages = await ChatRoomService.getChatRoomMessages(
    userId,
    roomId,
    page,
    limit
  );
  return messages;
};

export const ChatService = {
  createChatIntoDB,
  getMyChatsFromDB,
  markChatAsReadInDB,
  getChatParticipantsFromDB,
  getChatHistoryFromDB,
};
