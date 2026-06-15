import { planTrip, getSmartRecommendations, getAIChatResponse } from '../utils/aiHelper.js';

// @desc    AI Travel Itinerary Planner
// @route   POST /api/ai/plan
// @access  Public
export const getAITripPlan = async (req, res, next) => {
  try {
    const { destination, budget, days } = req.body;

    if (!destination || !budget || !days) {
      return res.status(400).json({
        success: false,
        error: 'Please provide destination, budget (INR), and number of days',
      });
    }

    const plan = await planTrip({ destination, budget, days });

    res.status(200).json({
      success: true,
      ...plan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Smart Property Recommendation System
// @route   GET /api/ai/recommend/:propertyId
// @access  Public
export const getPropertyRecommendations = async (req, res, next) => {
  try {
    const recommendations = await getSmartRecommendations(req.params.propertyId);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    AI Chatbot Assistant
// @route   POST /api/ai/chat
// @access  Public
export const chatWithAI = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a chat message',
      });
    }

    const reply = await getAIChatResponse({ message, history });

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    next(error);
  }
};
