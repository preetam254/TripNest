import express from 'express';
import {
  createOrder,
  verifyPayment,
  refundPayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Secure all payment actions

router.post('/order', createOrder);
router.post('/verify', verifyPayment);
router.post('/refund/:bookingId', authorize('host', 'admin'), refundPayment);

export default router;
