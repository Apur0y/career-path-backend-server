import status from "http-status";
import { Request, Response } from "express";
import { ChatService } from "./chat.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createChat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await ChatService.createChatIntoDB(userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    message: "Chat message sent successfully",
    data: result,
  });
});

const getMyChats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await ChatService.getMyChatsFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chats retrieved successfully",
    data: result.data,
  });
});

const markChatAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { chatId } = req.params;
  const result = await ChatService.markChatAsReadInDB(chatId, userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chat marked as read successfully",
    data: result,
  });
});

const getChatParticipants = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await ChatService.getChatParticipantsFromDB(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chat participants retrieved successfully",
    data: result,
  });
});

export const ChatController = {
  createChat,
  getMyChats,
  markChatAsRead,
  getChatParticipants,
};
