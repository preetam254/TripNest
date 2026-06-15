import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import { uploadToCloudinary } from './userController.js';

// @desc    Get all properties (with search, filter, and sort)
// @route   GET /api/properties
// @access  Public
export const getProperties = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      bedrooms,
      guests,
      amenities,
      startDate,
      endDate,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // Category Filter
    if (category) {
      query.category = category;
    }

    // Search Query (City, Country, Title)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }

    // Price Filter
    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
    }

    // Rating Filter
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    // Bedrooms Filter
    if (bedrooms) {
      query.bedrooms = { $gte: Number(bedrooms) };
    }

    // Guests Filter
    if (guests) {
      query.maxGuests = { $gte: Number(guests) };
    }

    // Amenities Filter (checks if property has ALL selected amenities)
    if (amenities) {
      const amenitiesArr = Array.isArray(amenities) ? amenities : amenities.split(',');
      query.amenities = { $all: amenitiesArr };
    }

    // Availability Filter (Exclude properties with overlapping bookings)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const bookedStays = await Booking.find({
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { startDate: { $lt: end }, endDate: { $gt: start } },
        ],
      }).select('property');

      const bookedIds = bookedStays.map((booking) => booking.property);
      query._id = { $nin: bookedIds };
    }

    // Sorting Logic
    let sortBy = '-createdAt'; // Default sorting
    if (sort) {
      switch (sort) {
        case 'priceAsc':
          sortBy = 'pricePerNight';
          break;
        case 'priceDesc':
          sortBy = '-pricePerNight';
          break;
        case 'ratingDesc':
          sortBy = '-rating';
          break;
        case 'popularity':
          sortBy = '-numReviews';
          break;
        default:
          sortBy = '-createdAt';
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const properties = await Property.find(query)
      .populate('host', 'name avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit));

    const total = await Property.countDocuments(query);

    res.status(200).json({
      success: true,
      count: properties.length,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
      properties,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Public
export const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate('host', 'name email avatar isVerified');

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new property listing
// @route   POST /api/properties
// @access  Private (Host/Admin)
export const createProperty = async (req, res, next) => {
  try {
    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one image' });
    }

    // Upload files in parallel to Cloudinary
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'tripnest/properties')
    );
    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((result) => result.secure_url);

    const propertyData = {
      ...req.body,
      host: req.user.id,
      images: imageUrls,
      amenities: req.body.amenities ? (Array.isArray(req.body.amenities) ? req.body.amenities : JSON.parse(req.body.amenities)) : [],
      rules: req.body.rules ? (Array.isArray(req.body.rules) ? req.body.rules : JSON.parse(req.body.rules)) : [],
      // Auto verify if host is Admin
      isVerified: req.user.role === 'admin',
    };

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update property listing
// @route   PUT /api/properties/:id
// @access  Private (Host/Admin)
export const editProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Check ownership (only host or admin can update)
    if (property.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this listing' });
    }

    // Upload new images if they are supplied
    let imageUrls = property.images;
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'tripnest/properties')
      );
      const uploadResults = await Promise.all(uploadPromises);
      const newUrls = uploadResults.map((result) => result.secure_url);
      imageUrls = [...imageUrls, ...newUrls];
    }

    const updateData = {
      ...req.body,
      images: imageUrls,
    };

    if (req.body.amenities) {
      updateData.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : JSON.parse(req.body.amenities);
    }
    if (req.body.rules) {
      updateData.rules = Array.isArray(req.body.rules) ? req.body.rules : JSON.parse(req.body.rules);
    }
    if (req.body.availability) {
      updateData.availability = Array.isArray(req.body.availability) ? req.body.availability : JSON.parse(req.body.availability);
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property listing
// @route   DELETE /api/properties/:id
// @access  Private (Host/Admin)
export const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Check ownership
    if (property.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this listing' });
    }

    // Delete property
    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Property listing deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
