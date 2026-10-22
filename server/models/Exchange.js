import mongoose from 'mongoose';
const exchangeSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offerSkill: { type: String, required: true, trim: true, maxlength: 60 },
  requestSkill: { type: String, required: true, trim: true, maxlength: 60 },
  message: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending','accepted','completed','declined'], default: 'pending' }
}, { timestamps: true });
exchangeSchema.index({ requester: 1, recipient: 1, status: 1 });
export default mongoose.model('Exchange', exchangeSchema);
