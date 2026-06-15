import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Notification from '../models/Notification.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

// Helper: Check Overlapping Dates
const checkDatesConflict = async (propertyId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflict = await Booking.findOne({
    property: propertyId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  return !!conflict;
};

// @desc    Check property availability for dates
// @route   POST /api/bookings/check-availability
// @access  Public
export const checkAvailability = async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate } = req.body;

    if (!propertyId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Please provide propertyId, startDate and endDate' });
    }

    const isBooked = await checkDatesConflict(propertyId, startDate, endDate);

    res.status(200).json({
      success: true,
      available: !isBooked,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new booking (pending payment)
// @route   POST /api/bookings
// @access  Private (Guest)
export const createBooking = async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate, guests } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
    }

    if (start < new Date().setHours(0,0,0,0)) {
      return res.status(400).json({ success: false, error: 'Check-in date cannot be in the past' });
    }

    // Check guests count
    if (guests > property.maxGuests) {
      return res.status(400).json({ success: false, error: `Maximum guests allowed is ${property.maxGuests}` });
    }

    // Check availability conflicts
    const conflict = await checkDatesConflict(propertyId, startDate, endDate);
    if (conflict) {
      return res.status(400).json({ success: false, error: 'Dates are already booked' });
    }

    // Calculate nights count
    const dateDiff = Math.abs(end - start);
    const nightsCount = Math.ceil(dateDiff / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = nightsCount * property.pricePerNight;

    // Create booking
    const booking = await Booking.create({
      guest: req.user.id,
      property: propertyId,
      startDate,
      endDate,
      totalPrice,
      guests,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in guest bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getGuestBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user.id })
      .populate({
        path: 'property',
        select: 'title images location city country pricePerNight rating host',
        populate: {
          path: 'host',
          select: 'name avatar',
        },
      })
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

// @desc    Get booking details for Host properties
// @route   GET /api/bookings/host-bookings
// @access  Private (Host/Admin)
export const getHostBookings = async (req, res, next) => {
  try {
    // 1. Get host's properties
    const properties = await Property.find({ host: req.user.id }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    // 2. Find bookings for these properties
    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property', 'title images city pricePerNight')
      .populate('guest', 'name email avatar')
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

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('property');

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Authorization: Only Guest who booked, Host who owns property, or Admin
    const isGuest = booking.guest.toString() === req.user.id;
    const isHost = booking.property.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Notify other party
    const recipient = isGuest ? booking.property.host : booking.guest;
    await Notification.create({
      recipient,
      sender: req.user.id,
      type: 'booking_cancel',
      title: 'Booking Cancelled',
      message: `Booking for ${booking.property.title} has been cancelled by ${req.user.name}.`,
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/bookings/:id/invoice
// @access  Private
export const getInvoice = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('property')
      .populate('guest', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Check authorization: Guest, Host or Admin
    const isGuest = booking.guest._id.toString() === req.user.id;
    const isHost = booking.property.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this invoice' });
    }

    // Set Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${booking._id}.pdf`
    );

    // Call PDF generator and stream to response
    generateInvoicePDF(booking, res);
  } catch (error) {
    next(error);
  }
};
