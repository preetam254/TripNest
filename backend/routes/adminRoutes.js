import express from 'express';
import {
  getStats,
  getUsers,
  updateUserRole,
  verifyProperty,
  getAllBookings,
  moderateReview,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin')); // Secure all endpoints for admins only

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/properties/:id/verify', verifyProperty);
router.get('/bookings', getAllBookings);
router.delete('/reviews/:id', moderateReview);

export default router;
