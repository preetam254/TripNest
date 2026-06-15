import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Models
import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import Payment from '../models/Payment.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Newsletter from '../models/Newsletter.js';

dotenv.config();

// Connect DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tripnest');

const seedData = async () => {
  try {
    console.log('Seeding TripNest Database...');

    // 1. Clear existing database
    await User.deleteMany();
    await Property.deleteMany();
    await Booking.deleteMany();
    await Review.deleteMany();
    await Wishlist.deleteMany();
    await Payment.deleteMany();
    await Conversation.deleteMany();
    await Message.deleteMany();
    await Notification.deleteMany();
    await Newsletter.deleteMany();

    console.log('Database cleared.');

    // 2. Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 3. Create Users
    const users = await User.insertMany([
      {
        name: 'Jane Admin',
        email: 'admin@tripnest.com',
        password: hashedPassword, // save bypasses pre('save') if inserting directly, so hash manually
        role: 'admin',
        isVerified: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      },
      {
        name: 'David Host',
        email: 'host@tripnest.com',
        password: hashedPassword,
        role: 'host',
        isVerified: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      {
        name: 'Alice Guest',
        email: 'guest@tripnest.com',
        password: hashedPassword,
        role: 'guest',
        isVerified: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
    ]);

    const adminUser = users[0];
    const hostUser = users[1];
    const guestUser = users[2];

    console.log('Users seeded successfully.');

    // 4. Create Properties
    const propertiesData = [
      {
        host: hostUser._id,
        title: 'Zen Sanctuary Villa in Kyoto',
        description: 'Immerse yourself in traditional Japanese beauty. This luxury bamboo villa has a private rock garden, outdoor stone hot tub, and traditional sliding doors. Perfect for meditation and exploring historic temples.',
        pricePerNight: 8500,
        location: '12 Higashiyama Ward, Kyoto',
        city: 'Kyoto',
        state: 'Kyoto Prefecture',
        country: 'Japan',
        latitude: 35.0003,
        longitude: 135.7797,
        amenities: ['Wifi', 'Hot Tub', 'Kitchen', 'Air Conditioning', 'Dryer', 'Traditional Tea Room'],
        images: [
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
          'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
        ],
        rules: ['No shoes inside', 'Quiet hours after 10 PM', 'No smoking'],
        category: 'Villa',
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1.5,
        beds: 3,
        isVerified: true,
      },
      {
        host: hostUser._id,
        title: 'Lakeside A-Frame Cabin',
        description: 'Escape the city rush in this beautiful wooden A-frame cabin located right on the edge of the lake. Enjoy hiking trails, custom fire pits, starry nights, and morning canoeing.',
        pricePerNight: 4200,
        location: '54 Pine Ridge Road, Lake George',
        city: 'Lake George',
        state: 'New York',
        country: 'United States',
        latitude: 43.4262,
        longitude: -73.7123,
        amenities: ['Wifi', 'Fireplace', 'Kitchen', 'Free Parking', 'Canoe Access', 'Pets Allowed'],
        images: [
          'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
          'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800',
        ],
        rules: ['Clean dishes before leaving', 'Keep campfire monitored at all times'],
        category: 'Cabin',
        maxGuests: 3,
        bedrooms: 1,
        bathrooms: 1,
        beds: 2,
        isVerified: true,
      },
      {
        host: hostUser._id,
        title: 'Sunset Cliffs Beachfront Studio',
        description: 'Wake up to the sounds of ocean waves crash at your doorstep. Stylish beachfront apartment featuring glass facade, panoramic sunset views, private beach access, and modern coastal designs.',
        pricePerNight: 7200,
        location: 'Surfside Street 5, Seminyak',
        city: 'Bali',
        state: 'Bali',
        country: 'Indonesia',
        latitude: -8.6913,
        longitude: 115.1682,
        amenities: ['Wifi', 'Pool', 'Air Conditioning', 'Beach Access', 'Gym', 'Breakfast Included'],
        images: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        ],
        rules: ['No pets', 'Be mindful of sand usage'],
        category: 'Beachfront',
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        beds: 1,
        isVerified: true,
      },
      {
        host: hostUser._id,
        title: 'Skyline Penthouse with Infinity Pool',
        description: 'Live like royalty above the city. This modern, high-tech penthouse offers private infinity pool, massive terrace overlooking Manhattan, smart blinds, and state of the art sound system.',
        pricePerNight: 12500,
        location: '102 Broadway, New York City',
        city: 'New York',
        state: 'New York',
        country: 'United States',
        latitude: 40.7128,
        longitude: -74.006,
        amenities: ['Wifi', 'Pool', 'Kitchen', 'Air Conditioning', 'Elevator', 'Gym', 'Workspace'],
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        ],
        rules: ['No loud parties', 'Maximum occupancy strictly enforced'],
        category: 'Modern',
        maxGuests: 6,
        bedrooms: 3,
        bathrooms: 3,
        beds: 4,
        isVerified: true,
      },
      {
        host: hostUser._id,
        title: 'Historic Castle Suite',
        description: 'Live your fairy-tale fantasy in this meticulously preserved 16th-century stone castle. Features stone walls, fireplace, luxury canopy bed, and private tours of the estate vineyard.',
        pricePerNight: 18000,
        location: 'Chateau Route 22, Bourges',
        city: 'Bourges',
        state: 'Centre-Val de Loire',
        country: 'France',
        latitude: 47.081,
        longitude: 2.3988,
        amenities: ['Wifi', 'Fireplace', 'Free Parking', 'Historic Tours', 'Wine Cellar'],
        images: [
          'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=800',
          'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
        ],
        rules: ['Handle historic artifacts with care', 'No open flame candles'],
        category: 'Castle',
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 2,
        beds: 2,
        isVerified: false, // Start unverified for testing Admin capabilities
      },
      {
        host: hostUser._id,
        title: 'Luxury Rainforest Treehouse',
        description: 'Suspended 15 meters high in the jungle canopy, this treehouse is a sustainable paradise. Wake up next to monkeys and toucans. Features modern amenities, suspended netting, and outdoor shower.',
        pricePerNight: 5500,
        location: 'Jungle Path 18, Ubud',
        city: 'Ubud',
        state: 'Bali',
        country: 'Indonesia',
        latitude: -8.5069,
        longitude: 115.2625,
        amenities: ['Wifi', 'Kitchen', 'Outdoor Shower', 'Suspended Net Hammock', 'Eco Friendly'],
        images: [
          'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800',
          'https://images.unsplash.com/photo-1488462237308-ecaa28b729d7?w=800',
        ],
        rules: ['Eco-friendly soap only', 'Turn off lights at night to respect wildlife'],
        category: 'Treehouse',
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        beds: 1,
        isVerified: true,
      },
    ];

    const seededProperties = await Property.insertMany(propertiesData);
    console.log('Properties seeded successfully.');

    // 5. Create some sample bookings & payments for analytics
    const p1 = seededProperties[0]; // Kyoto
    const p2 = seededProperties[2]; // Bali
    const p3 = seededProperties[3]; // NYC

    // Booking 1 - Completed Stay
    const booking1 = await Booking.create({
      guest: guestUser._id,
      property: p1._id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-05'),
      totalPrice: p1.pricePerNight * 4,
      guests: 2,
      status: 'completed',
    });

    const payment1 = await Payment.create({
      booking: booking1._id,
      user: guestUser._id,
      razorpayOrderId: 'order_seed_001',
      razorpayPaymentId: 'pay_seed_001',
      razorpaySignature: 'sig_seed_001',
      amount: booking1.totalPrice,
      status: 'captured',
      createdAt: new Date('2026-05-01'),
    });

    booking1.payment = payment1._id;
    await booking1.save();

    // Review for booking 1
    await Review.create({
      guest: guestUser._id,
      property: p1._id,
      booking: booking1._id,
      rating: 5,
      comment: 'Absolutely breathtaking! The garden and host were top-notch. Highly recommended sanctuary!',
    });

    // Booking 2 - Confirmed Stay
    const booking2 = await Booking.create({
      guest: guestUser._id,
      property: p2._id,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-15'),
      totalPrice: p2.pricePerNight * 5,
      guests: 2,
      status: 'confirmed',
    });

    const payment2 = await Payment.create({
      booking: booking2._id,
      user: guestUser._id,
      razorpayOrderId: 'order_seed_002',
      razorpayPaymentId: 'pay_seed_002',
      razorpaySignature: 'sig_seed_002',
      amount: booking2.totalPrice,
      status: 'captured',
      createdAt: new Date('2026-06-08'),
    });

    booking2.payment = payment2._id;
    await booking2.save();

    // Review for booking 2
    await Review.create({
      guest: guestUser._id,
      property: p2._id,
      booking: booking2._id,
      rating: 4,
      comment: 'Super beautiful beachfront study! The ocean sounds at night were magical. Slightly sandy but that is beach life!',
    });

    // Booking 3 - Pending stay
    const booking3 = await Booking.create({
      guest: guestUser._id,
      property: p3._id,
      startDate: new Date('2026-07-20'),
      endDate: new Date('2026-07-22'),
      totalPrice: p3.pricePerNight * 2,
      guests: 4,
      status: 'pending',
    });

    console.log('Bookings and reviews seeded successfully.');

    // 6. Recalculate ratings
    await Review.getAverageRating(p1._id);
    await Review.getAverageRating(p2._id);

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedData();
