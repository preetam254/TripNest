import Property from '../models/Property.js';

/**
 * Calls Gemini API if GEMINI_API_KEY exists, otherwise uses advanced heuristics.
 * @param {string} prompt - Prompt sent to the model.
 * @param {string} systemInstruction - Instruction defining the AI persona.
 * @returns {string} - Response content.
 */
const getGeminiResponse = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemInstruction ? `${systemInstruction}\n\nUser Prompt: ${prompt}` : prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      console.warn('Gemini API returned unexpected format, falling back to heuristics.', data);
    } catch (error) {
      console.error('Error calling Gemini API:', error.message);
    }
  }
  return null;
};

/**
 * AI Trip Planner Engine
 */
export const planTrip = async ({ destination, budget, days }) => {
  const targetDays = parseInt(days) || 3;
  const budgetNum = parseInt(budget) || 10000;

  // 1. Fetch matching properties from DB
  const matchingProperties = await Property.find({
    $or: [
      { city: { $regex: destination, $options: 'i' } },
      { country: { $regex: destination, $options: 'i' } },
      { title: { $regex: destination, $options: 'i' } },
    ],
  }).limit(3);

  // Ask Gemini if key is present
  const geminiPrompt = `Create a detailed day-by-day travel plan for a trip to "${destination}" for ${targetDays} days with a total budget of INR ${budgetNum}.
  Suggest a breakdown of costs (stay, food, activities) and return the response in clean JSON format matching this schema:
  {
    "travelPlan": [
      { "day": 1, "title": "Day Title", "activities": ["Activity 1", "Activity 2"] },
      ...
    ],
    "estimatedBudget": {
      "accommodation": 5000,
      "foodAndBeverage": 2000,
      "sightseeingAndTransit": 2000,
      "miscellaneous": 1000,
      "total": 10000
    }
  }`;

  const geminiResponse = await getGeminiResponse(geminiPrompt, 'You are an expert travel planner.');
  if (geminiResponse) {
    try {
      // Find JSON block if wrapped in markdown
      const jsonStart = geminiResponse.indexOf('{');
      const jsonEnd = geminiResponse.lastIndexOf('}') + 1;
      const parsed = JSON.parse(geminiResponse.substring(jsonStart, jsonEnd));
      return {
        suggestedProperties: matchingProperties,
        travelPlan: parsed.travelPlan,
        estimatedBudget: parsed.estimatedBudget,
      };
    } catch (e) {
      console.warn('Failed to parse Gemini response JSON. Falling back to heuristics.', e);
    }
  }

  // Heuristic Rule-Based Fallback
  const accommodationPrice = Math.round(budgetNum * 0.45);
  const foodPrice = Math.round(budgetNum * 0.25);
  const sightseeingPrice = Math.round(budgetNum * 0.2);
  const miscPrice = Math.round(budgetNum * 0.1);

  const estimatedBudget = {
    accommodation: accommodationPrice,
    foodAndBeverage: foodPrice,
    sightseeingAndTransit: sightseeingPrice,
    miscellaneous: miscPrice,
    total: accommodationPrice + foodPrice + sightseeingPrice + miscPrice,
  };

  const genericActivities = [
    ['Explore historic downtown streets', 'Visit the local art museum', 'Dinner at a traditional diner'],
    ['Outdoor nature trail hike', 'Relaxing local park picnic', 'Sunset photography tour'],
    ['Souvenir shopping at the central market', 'Visit a historical heritage site', 'Local food tasting tour'],
    ['Day trip to nearby attractions', 'Boating or lakeside recreation', 'Evening live music lounge'],
    ['Relaxation and wellness spa', 'Farewell lunch and packing', 'Departure transit'],
  ];

  const travelPlan = [];
  for (let i = 1; i <= targetDays; i++) {
    const activitySet = genericActivities[(i - 1) % genericActivities.length];
    travelPlan.push({
      day: i,
      title: `Discover ${destination} - Day ${i}`,
      activities: activitySet.map(act => `${act} in ${destination}`),
    });
  }

  return {
    suggestedProperties: matchingProperties,
    travelPlan,
    estimatedBudget,
  };
};

/**
 * Smart Property Recommendation System
 */
export const getSmartRecommendations = async (propertyId) => {
  try {
    const target = await Property.findById(propertyId);
    if (!target) return [];

    // Find similar properties in same category or city
    let recommendations = await Property.find({
      _id: { $ne: propertyId },
      $or: [
        { category: target.category },
        { city: target.city },
      ],
    }).limit(4);

    // If we have fewer than 2, get any top rated properties
    if (recommendations.length < 2) {
      const extra = await Property.find({ _id: { $ne: propertyId } })
        .sort({ rating: -1 })
        .limit(4);
      recommendations = [...recommendations, ...extra].filter(
        (val, index, self) => self.findIndex(t => t._id.toString() === val._id.toString()) === index
      ).slice(0, 4);
    }

    return recommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error.message);
    return [];
  }
};

/**
 * AI Chatbot Assistant Engine
 */
export const getAIChatResponse = async ({ message, history = [] }) => {
  // If api key, ask Gemini
  const chatInstruction = `You are "Nestor", the TripNest AI travel assistant.
  Help users with travel ideas, booking processes on TripNest, staying rules, and local tourism suggestions.
  Keep answers friendly, clear, and under 4-5 sentences.`;

  const geminiResp = await getGeminiResponse(message, chatInstruction);
  if (geminiResp) {
    return geminiResp.trim();
  }

  // Advanced heuristic chatbot fallback
  const text = message.toLowerCase();
  
  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return "Hello! I'm Nestor, your TripNest AI Assistant. How can I help you plan your next vacation or manage your bookings today?";
  }
  if (text.includes('book') || text.includes('reserve')) {
    return "To book a stay on TripNest, just browse our Home page, apply search filters to find the perfect home, select your dates on the property detail page, and make a payment securely via Razorpay. Let me know if you need property recommendations!";
  }
  if (text.includes('payment') || text.includes('refund') || text.includes('razorpay')) {
    return "We use Razorpay for secure payments. If a booking is cancelled by a host or within the allowable cancellation period by a guest, refunds are automatically initiated. You can review your transactions in your payment history dashboard.";
  }
  if (text.includes('host') || text.includes('list')) {
    return "Listing on TripNest is simple! Register as a Host, go to your Host Dashboard, and click 'Create Listing'. You can add details, price per night, amenities, and multiple photos. Hosts can also audit stays and check earnings graphs.";
  }
  if (text.includes('cancel')) {
    return "You can cancel a booking directly from your Guest Dashboard in the Booking History tab. Check the property's cancellation rules or contact the host using our real-time messaging system if you have specific requests.";
  }
  if (text.includes('weather') || text.includes('best time')) {
    return "The best time to travel depends on your destination! For beachfronts, dry sunny seasons are ideal, while cabins are cozy during winter. Let me know which destination you have in mind so I can give you details!";
  }

  return "That's an interesting question! As your TripNest travel buddy, I can help you search properties, plan itineraries, understand host regulations, or handle payments. Could you clarify how I can assist you with this?";
};
