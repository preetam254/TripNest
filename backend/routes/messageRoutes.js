import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Secure message routes

router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', getMessages);
router.post('/', sendMessage);

export default router;
