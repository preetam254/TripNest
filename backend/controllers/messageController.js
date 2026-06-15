import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Get user conversations
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate('participants', 'name avatar role')
      .sort('-updatedAt');

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages inside a conversation
// @route   GET /api/messages/conversations/:id
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Check authorization: User must be participant
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this chat' });
    }

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message (REST fallback / creation gateway)
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, text, conversationId } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else if (receiverId) {
      // Look for existing 1-on-1 conversation
      conversation = await Conversation.findOne({
        participants: { $all: [req.user.id, receiverId] },
      });

      // Create new conversation if none exists
      if (!conversation) {
        // Verify receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return res.status(404).json({ success: false, error: 'Receiver user not found' });
        }

        conversation = await Conversation.create({
          participants: [req.user.id, receiverId],
        });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Please provide either receiverId or conversationId' });
    }

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      text,
    });

    // Update last message in Conversation
    conversation.lastMessage = text;
    await conversation.save();

    res.status(201).json({
      success: true,
      message,
      conversationId: conversation._id,
    });
  } catch (error) {
    next(error);
  }
};
