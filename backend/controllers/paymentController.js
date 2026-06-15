import crypto from 'crypto';
import Razorpay from 'razorpay';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';

// Initialize Razorpay SDK (works in test mode with mock keys)
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mocksecret',
  });
};

// @desc    Create Razorpay order for booking payment
// @route   POST /api/payments/order
// @access  Private (Guest)
export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.guest.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to pay for this booking' });
    }

    const instance = getRazorpayInstance();
    const amountInPaise = booking.totalPrice * 100; // Razorpay processes in paise

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_order_${booking._id}`,
    };

    // If using mock credentials, simulate the order creation response
    let order;
    if (process.env.RAZORPAY_KEY_ID === 'rzp_test_mockkey' || !process.env.RAZORPAY_KEY_ID) {
      order = {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'order',
        amount: amountInPaise,
        currency: 'INR',
        receipt: options.receipt,
        status: 'created',
      };
    } else {
      order = await instance.orders.create(options);
    }

    // Save initial Payment record in DB
    const payment = await Payment.create({
      booking: booking._id,
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: booking.totalPrice,
      currency: 'INR',
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      order,
      paymentId: payment._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private (Guest)
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const isMock = razorpayOrderId.startsWith('order_mock_') || process.env.RAZORPAY_KEY_ID === 'rzp_test_mockkey' || !process.env.RAZORPAY_KEY_ID;
    let isSignatureValid = false;

    if (isMock) {
      // Direct pass for mock orders in local testing
      isSignatureValid = true;
    } else {
      // Standard cryptography signature verification
      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mocksecret';
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      isSignatureValid = signature === razorpaySignature;
    }

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment details not found' });
    }

    if (!isSignatureValid) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Success flow
    payment.razorpayPaymentId = razorpayPaymentId || `pay_mock_${crypto.randomBytes(8).toString('hex')}`;
    payment.razorpaySignature = razorpaySignature || `sig_mock_${crypto.randomBytes(8).toString('hex')}`;
    payment.status = 'captured';
    await payment.save();

    booking.status = 'confirmed';
    booking.payment = payment._id;
    await booking.save();

    // Create notifications for Guest & Host
    await Notification.create({
      recipient: booking.guest,
      type: 'booking_confirm',
      title: 'Booking Confirmed',
      message: `Your booking at "${booking.property.title}" has been successfully paid and confirmed!`,
    });

    await Notification.create({
      recipient: booking.property.host,
      type: 'payment_success',
      title: 'New Booking Payment Received',
      message: `Payment received for booking at "${booking.property.title}" from guest ${req.user.name}.`,
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund a captured payment (Triggered via Admin/Host Cancellation)
// @route   POST /api/payments/refund/:bookingId
// @access  Private (Admin/Host)
export const refundPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('property');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Check auth: Only property host or admin
    if (booking.property.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to process refunds' });
    }

    const payment = await Payment.findById(booking.payment);
    if (!payment || payment.status !== 'captured') {
      return res.status(400).json({ success: false, error: 'No capture transaction found to refund' });
    }

    const instance = getRazorpayInstance();
    const isMock = payment.razorpayOrderId.startsWith('order_mock_');

    if (!isMock && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_mockkey') {
      // Real refund call
      await instance.payments.refund(payment.razorpayPaymentId, {
        amount: payment.amount * 100,
        speed: 'normal',
      });
    }

    payment.status = 'refunded';
    await payment.save();

    booking.status = 'cancelled';
    await booking.save();

    // Notify guest
    await Notification.create({
      recipient: booking.guest,
      type: 'booking_cancel',
      title: 'Refund Processed',
      message: `Your payment of INR ${payment.amount} for "${booking.property.title}" has been refunded.`,
    });

    res.status(200).json({
      success: true,
      message: 'Refund completed successfully',
      payment,
    });
  } catch (error) {
    next(error);
  }
};
