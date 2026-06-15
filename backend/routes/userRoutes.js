import express from 'express';
import { updateProfile, uploadAvatar } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect); // All routes inside are protected

router.put('/profile', updateProfile);
router.post('/profile-image', upload.single('avatar'), uploadAvatar);

export default router;
