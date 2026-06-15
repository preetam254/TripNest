import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';

// @desc    Add review for a property stay
// @route   POST /api/reviews
// @access  Private (Guest)
export const addReview = async (req, res, next) => {
  try {
    const { propertyId, bookingId, rating, comment } = req.body;

    // 1. Verify booking exists, is completed/confirmed, and belongs to user
    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to review this stay' });
    }

    // Optional constraint: Only review confirmed or completed bookings
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'You can only review confirmed or completed stays' });
    }

    // 2. Check if user already reviewed this booking
    const alreadyReviewed = await Review.findOne({ booking: bookingId });
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this booking' });
    }

    // 3. Create review
    const review = await Review.create({
      guest: req.user.id,
      property: propertyId,
      booking: bookingId,
      rating,
      comment,
    });

    // 4. Notify Host
    await Notification.create({
      recipient: booking.property.host,
      sender: req.user.id,
      type: 'review_alert',
      title: 'New Property Review',
      message: `${req.user.name} rated your property "${booking.property.title}" - ${rating}/5 stars.`,
    });

    res.status(201).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a review
// @route   PUT /api/reviews/:id
// @access  Private (Guest)
export const editReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    // Authorization
    if (review.guest.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this review' });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    // Trigger average rating recalculation
    await Review.getAverageRating(review.property);

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Guest/Admin)
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    // Authorization
    if (review.guest.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this review' });
    }

    const propertyId = review.property;

    // Trigger hook by using findOneAndDelete
    await Review.findOneAndDelete({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a property
// @route   GET /api/properties/:propertyId/reviews
// @access  Public
export const getPropertyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId })
      .populate('guest', 'name avatar')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};
