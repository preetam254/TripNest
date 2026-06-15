import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please add a rating between 1 and 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please add a comment'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from submitting more than one review per booking
reviewSchema.index({ booking: 1 }, { unique: true });

// Static method to get avg rating and save to Property model
reviewSchema.statics.getAverageRating = async function (propertyId) {
  const obj = await this.aggregate([
    {
      $match: { property: propertyId },
    },
    {
      $group: {
        _id: '$property',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  try {
    if (obj.length > 0) {
      await this.model('Property').findByIdAndUpdate(propertyId, {
        rating: Math.round(obj[0].averageRating * 10) / 10,
        numReviews: obj[0].numReviews,
      });
    } else {
      await this.model('Property').findByIdAndUpdate(propertyId, {
        rating: 0,
        numReviews: 0,
      });
    }
  } catch (err) {
    console.error(`Error updating rating on property save: ${err}`);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.property);
});

// Call getAverageRating before delete Model.findOneAndDelete()
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.getAverageRating(doc.property);
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
