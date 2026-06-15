import express from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Secure all wishlist requests

router.get('/', getWishlist);
router.post('/toggle/:propertyId', toggleWishlist);

export default router;
