import Wishlist from '../models/Wishlist.js';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id }).populate({
      path: 'properties',
      select: 'title images pricePerNight city country rating numReviews category',
    });

    if (!wishlist) {
      // Create empty wishlist if none exists
      wishlist = await Wishlist.create({ user: req.user.id, properties: [] });
    }

    res.status(200).json({
      success: true,
      count: wishlist.properties.length,
      wishlist: wishlist.properties,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle property in user wishlist
// @route   POST /api/wishlist/toggle/:propertyId
// @access  Private
export const toggleWishlist = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, properties: [] });
    }

    const index = wishlist.properties.indexOf(propertyId);

    let isAdded = false;
    if (index >= 0) {
      // Remove from wishlist
      wishlist.properties.splice(index, 1);
    } else {
      // Add to wishlist
      wishlist.properties.push(propertyId);
      isAdded = true;
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      isAdded,
      message: isAdded ? 'Added to wishlist' : 'Removed from wishlist',
      count: wishlist.properties.length,
    });
  } catch (error) {
    next(error);
  }
};
