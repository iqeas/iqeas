import express from "express";
import {
  postTaskChat,
  getTaskChatMessages,
} from "../controllers/chat.controller.js";

const router = express.Router();

// router.post("/chat", postTaskChat);
// router.get("/:task_id", getTaskChatMessages);

export default router;
