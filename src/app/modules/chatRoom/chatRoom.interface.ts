export interface ICreateChatRoomPayload {
  participantId: string;
  jobPostId: string; // Made required since all chats are job-related
  roomType?: "JOB_APPLICATION" | "INTERVIEW_CHAT" | "FOLLOW_UP";
  name?: string;
  description?: string;
}

export interface IChatRoomFilters {
  roomType?: string;
  isActive?: boolean;
}

export interface IChatRoomQueryParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  roomType?: string;
  isActive?: boolean;
}

export interface ICreateChatMessagePayload {
  message: string;
  messageType?: "TEXT" | "IMAGE" | "FILE" | "SYSTEM" | "NOTIFICATION";
  replyToId?: string;
}

export interface IChatRoomWithReceiver {
  id: string;
  roomId: string;
  roomType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date | null;
  receiverId: string | null;
  receiverName: string | null;
  receiverEmail: string | null;
  receiverProfilePic: string | null;
  receiverRole: any;
  participants: any[];
  jobPost: any;
  messages: any[];
  _count: {
    messages: number;
  };
}
