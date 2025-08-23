import express from "express";
import auth from "../../middlewares/auth";
import { ChatRoomController } from "./chatRoom.controller";
import { ChatRoomValidation } from "./chatRoom.validation";
import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// Create or get chat room
router.post(
  "/",
  auth(),
  validateRequest(ChatRoomValidation.createChatRoomValidation),
  ChatRoomController.createOrGetChatRoom
);

// Get user's chat rooms
router.get("/", auth(), ChatRoomController.getUserChatRooms);

// Join a chat room
router.post("/:roomId/join", auth(), ChatRoomController.joinChatRoom);

// Get chat room messages
router.get(
  "/:roomId/messages",
  auth(),
  validateRequest(ChatRoomValidation.getChatRoomMessagesValidation),
  ChatRoomController.getChatRoomMessages
);

// Update last seen in room
router.patch("/:roomId/last-seen", auth(), ChatRoomController.updateLastSeen);

export const ChatRoomRoutes = router;
