import express from 'express';
import {
  getAITripPlan,
  getPropertyRecommendations,
  chatWithAI,
} from '../controllers/aiController.js';

const router = express.Router();

router.post('/plan', getAITripPlan);
router.get('/recommend/:propertyId', getPropertyRecommendations);
router.post('/chat', chatWithAI);

export default router;
