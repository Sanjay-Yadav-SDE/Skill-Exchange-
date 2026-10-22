import mongoose from 'mongoose';
const reviewSchema = new mongoose.Schema({
  exchange: { type: mongoose.Schema.Types.ObjectId, ref: 'Exchange', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });
reviewSchema.index({ exchange: 1, reviewer: 1 }, { unique: true });
export default mongoose.model('Review', reviewSchema);
