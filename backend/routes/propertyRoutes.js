import express from 'express';
import {
  getProperties,
  getPropertyById,
  createProperty,
  editProperty,
  deleteProperty,
} from '../controllers/propertyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getProperties);
router.get('/:id', getPropertyById);

// Protected routes (Host & Admin permissions)
router.post('/', protect, authorize('host', 'admin'), upload.array('images', 10), createProperty);
router.put('/:id', protect, authorize('host', 'admin'), upload.array('images', 10), editProperty);
router.delete('/:id', protect, authorize('host', 'admin'), deleteProperty);

export default router;
