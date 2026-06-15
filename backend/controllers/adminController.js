import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';

// @desc    Get Admin dashboard analytics
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getStats = async (req, res, next) => {
  try {
    // 1. Basic counts
    const totalUsers = await User.countDocuments();
    const totalHosts = await User.countDocuments({ role: 'host' });
    const totalGuests = await User.countDocuments({ role: 'guest' });
    const totalProperties = await Property.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // 2. Aggregate Total Revenue
    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // 3. Monthly Bookings count (over current year)
    const bookingsByMonth = await Booking.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map month numbers to labels
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const bookingsChartData = Array(12).fill(0);
    bookingsByMonth.forEach((item) => {
      if (item._id >= 1 && item._id <= 12) {
        bookingsChartData[item._id - 1] = item.count;
      }
    });

    // 4. Monthly Revenue (over current year)
    const revenueByMonth = await Payment.aggregate([
      { $match: { status: 'captured' } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueChartData = Array(12).fill(0);
    revenueByMonth.forEach((item) => {
      if (item._id >= 1 && item._id <= 12) {
        revenueChartData[item._id - 1] = item.total;
      }
    });

    // 5. Top Cities by listing count
    const topCities = await Property.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 6. Recent payouts and transaction history
    const recentPayments = await Payment.find()
      .populate('user', 'name email')
      .populate({
        path: 'booking',
        populate: { path: 'property', select: 'title' },
      })
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalHosts,
        totalGuests,
        totalProperties,
        totalBookings,
        totalRevenue,
        charts: {
          months: monthNames,
          bookings: bookingsChartData,
          revenue: revenueChartData,
          topCities: topCities.map((c) => ({ city: c._id || 'Unknown', count: c.count })),
        },
        recentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users list with role filtering
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};

    const users = await User.find(filter).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['guest', 'host', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid user role specified' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify property listing
// @route   PUT /api/admin/properties/:id/verify
// @access  Private (Admin)
export const verifyProperty = async (req, res, next) => {
  try {
    const { isVerified } = req.body;

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isVerified: isVerified !== false },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.status(200).json({
      success: true,
      message: property.isVerified ? 'Property listing verified' : 'Property verification revoked',
      property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (Admin Audit Log)
// @route   GET /api/admin/bookings
// @access  Private (Admin)
export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('guest', 'name email')
      .populate('property', 'title city host')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Moderate Review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
export const moderateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const propertyId = review.property;

    // Remove review
    await Review.findOneAndDelete({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Review moderated and removed',
    });
  } catch (error) {
    next(error);
  }
};
