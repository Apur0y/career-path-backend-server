import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";
import status from "http-status";
import { IChatRoomWithReceiver } from "./chatRoom.interface";

const createOrGetChatRoom = async (
  createdBy: string,
  participantId: string,
  jobPostId: string, // Made required since all chats are job-related
  roomType:
    | "JOB_APPLICATION"
    | "INTERVIEW_CHAT"
    | "FOLLOW_UP" = "JOB_APPLICATION"
) => {
  // Validate that jobPostId is provided
  if (!jobPostId) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Job Post ID is required for all chat rooms"
    );
  }

  // Generate consistent room ID (always job-related now)
  const roomId = `job_${jobPostId}_${Math.min(
    Number(createdBy),
    Number(participantId)
  )}_${Math.max(Number(createdBy), Number(participantId))}`;

  // Check if room already exists
  let chatRoom = await prisma.chatRoom.findUnique({
    where: { roomId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
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
          title: true,
          jobId: true,
        },
      },
    },
  });

  if (!chatRoom) {
    // Always validate job application since all chats are job-related
    const hasJobApplication = await validateJobApplicationExists(
      createdBy,
      participantId,
      jobPostId
    );

    if (!hasJobApplication) {
      throw new ApiError(
        status.FORBIDDEN,
        "Chat room can only be created between users with existing job application"
      );
    }

    // Create new chat room
    chatRoom = await prisma.chatRoom.create({
      data: {
        roomId,
        roomType,
        jobPostId,
        createdBy,
        participants: {
          create: [
            {
              userId: createdBy,
              role: "ADMIN",
            },
            {
              userId: participantId,
              role: "MEMBER",
            },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
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
            title: true,
            jobId: true,
          },
        },
      },
    });
  } else {
    // Update last activity
    await prisma.chatRoom.update({
      where: { id: chatRoom.id },
      data: { lastActivity: new Date() },
    });
  }

  return chatRoom;
};

const validateJobApplicationExists = async (
  userId1: string,
  userId2: string,
  jobPostId: string
): Promise<boolean> => {
  const jobApplication = await prisma.jobApplication.findFirst({
    where: {
      OR: [
        {
          jobId: jobPostId,
          jobSeekerId: userId1,
          job: { userId: userId2 },
        },
        {
          jobId: jobPostId,
          jobSeekerId: userId2,
          job: { userId: userId1 },
        },
      ],
    },
  });

  return !!jobApplication;
};

const getUserChatRooms = async (
  userId: string
): Promise<IChatRoomWithReceiver[]> => {
  const chatRooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: {
          userId,
          isActive: true,
        },
      },
      isActive: true,
    },
    include: {
      participants: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
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
          title: true,
          jobId: true,
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              sender: {
                id: { not: userId },
              },
              isRead: false,
            },
          },
        },
      },
    },
    orderBy: { lastActivity: "desc" },
  });

  // Add receiver information to each chat room
  const chatRoomsWithReceiver = chatRooms.map((room) => {
    // Find the other participant (receiver) in this chat room
    const receiver = room.participants.find(
      (participant) => participant.user.id !== userId
    );

    return {
      ...room,
      receiverId: receiver?.user.id || null,
      receiverName: receiver?.user.fullName || null,
      receiverEmail: receiver?.user.email || null,
      receiverProfilePic: receiver?.user.profilePic || null,
      receiverRole: receiver?.user.role || null,
    };
  });

  return chatRoomsWithReceiver;
};

const joinChatRoom = async (roomId: string, userId: string) => {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new ApiError(status.NOT_FOUND, "Chat room not found");
  }

  const existingParticipant = await prisma.chatRoomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      await prisma.chatRoomParticipant.update({
        where: { id: existingParticipant.id },
        data: { isActive: true, joinedAt: new Date() },
      });
    }
    return existingParticipant;
  }

  return await prisma.chatRoomParticipant.create({
    data: {
      roomId,
      userId,
      role: "MEMBER",
    },
  });
};

const getChatRoomMessages = async (
  roomId: string,
  userId: string,
  page: number = 1,
  limit: number = 50
) => {
  // Verify user is participant in room
  const participant = await prisma.chatRoomParticipant.findFirst({
    where: {
      roomId,
      userId,
    },
  });

  if (!participant || !participant.isActive) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not a participant in this chat room"
    );
  }

  const skip = (page - 1) * limit;

  const messages = await prisma.chat.findMany({
    where: { roomId },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePic: true,
        },
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  return messages.reverse(); // Return in chronological order
};

const updateRoomParticipantLastSeen = async (
  roomId: string,
  userId: string
) => {
  await prisma.chatRoomParticipant.updateMany({
    where: {
      roomId,
      userId,
      isActive: true,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });
};

export const ChatRoomService = {
  createOrGetChatRoom,
  getUserChatRooms,
  joinChatRoom,
  getChatRoomMessages,
  updateRoomParticipantLastSeen,
  validateJobApplicationExists,
};
