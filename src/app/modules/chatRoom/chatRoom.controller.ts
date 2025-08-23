import status from "http-status";
import { Request, Response } from "express";
import { ChatRoomService } from "./chatRoom.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createOrGetChatRoom = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await ChatRoomService.createOrGetChatRoom(
    userId,
    req.body.participantId,
    req.body.jobPostId,
    req.body.roomType
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chat room created/retrieved successfully",
    data: result,
  });
});

const getUserChatRooms = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result = await ChatRoomService.getUserChatRooms(userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chat rooms retrieved successfully",
    data: result,
  });
});

const joinChatRoom = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { roomId } = req.params;
  const result = await ChatRoomService.joinChatRoom(roomId, userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Joined chat room successfully",
    data: result,
  });
});

const getChatRoomMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { roomId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await ChatRoomService.getChatRoomMessages(
    roomId,
    userId,
    page,
    limit
  );

  sendResponse(res, {
    statusCode: status.OK,
    message: "Chat room messages retrieved successfully",
    data: result,
  });
});

const updateLastSeen = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { roomId } = req.params;

  await ChatRoomService.updateRoomParticipantLastSeen(roomId, userId);

  sendResponse(res, {
    statusCode: status.OK,
    message: "Last seen updated successfully",
    data: null,
  });
});

export const ChatRoomController = {
  createOrGetChatRoom,
  getUserChatRooms,
  joinChatRoom,
  getChatRoomMessages,
  updateLastSeen,
};
