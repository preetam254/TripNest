import express from 'express';
import {
  addReview,
  editReview,
  deleteReview,
  getPropertyReviews,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/properties/:propertyId', getPropertyReviews);

router.use(protect); // Secure submission and edit actions

router.post('/', addReview);
router.put('/:id', editReview);
router.delete('/:id', deleteReview);

export default router;
