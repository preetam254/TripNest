import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, { _id: false });

const propertySchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a property title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a property description'],
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Please add price per night'],
      min: [1, 'Price must be at least 1'],
    },
    location: {
      type: String,
      required: [true, 'Please add a location/address'],
    },
    country: {
      type: String,
      required: [true, 'Please add a country'],
    },
    state: {
      type: String,
      required: [true, 'Please add a state'],
    },
    city: {
      type: String,
      required: [true, 'Please add a city'],
    },
    latitude: {
      type: Number,
      required: [true, 'Please add latitude'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please add longitude'],
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      required: [true, 'Please upload at least one image'],
    },
    rules: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      enum: [
        'Beachfront',
        'Cabin',
        'Modern',
        'Villa',
        'Castle',
        'Treehouse',
        'Countryside',
        'Lakefront'
      ],
    },
    maxGuests: {
      type: Number,
      required: [true, 'Please specify max guests limit'],
      min: [1, 'Must allow at least 1 guest'],
    },
    bedrooms: {
      type: Number,
      required: [true, 'Please specify bedrooms count'],
      min: [0, 'Cannot be negative'],
    },
    bathrooms: {
      type: Number,
      required: [true, 'Please specify bathrooms count'],
      min: [0, 'Cannot be negative'],
    },
    beds: {
      type: Number,
      required: [true, 'Please specify beds count'],
      min: [1, 'Must have at least 1 bed'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    availability: {
      type: [availabilitySchema],
      default: [], // If empty, property is assumed available except for custom booked ranges
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Property = mongoose.model('Property', propertySchema);
export default Property;
