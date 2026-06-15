import express from 'express';
import {
  checkAvailability,
  createBooking,
  getGuestBookings,
  getHostBookings,
  cancelBooking,
  getInvoice,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-availability', checkAvailability);

router.use(protect); // Secure remaining endpoints

router.post('/', createBooking);
router.get('/my-bookings', getGuestBookings);
router.get('/host-bookings', authorize('host', 'admin'), getHostBookings);
router.put('/:id/cancel', cancelBooking);
router.get('/:id/invoice', getInvoice);

export default router;
