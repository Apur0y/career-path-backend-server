import express from "express";
import auth from "../../middlewares/auth";
import { ChatController } from "./chat.controller";
import { ChatValidation } from "./chat.validation";
import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(ChatValidation.createChatValidation),
  ChatController.createChat
);

router.get("/", auth(), ChatController.getMyChats);

router.patch("/:chatId/read", auth(), ChatController.markChatAsRead);

router.get("/participants", auth(), ChatController.getChatParticipants);

export const ChatRoutes = router;
