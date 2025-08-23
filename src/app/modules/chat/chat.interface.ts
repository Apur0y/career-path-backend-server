export interface ICreateChatPayload {
  receiverId: string;
  message: string;
  jobPostId: string; // Made required since all chats are job-related
}

export interface IChatFilters {
  receiverId?: string;
  jobPostId?: string;
}

export interface IChatQueryParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  receiverId?: string;
  jobPostId?: string;
}
