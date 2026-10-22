import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  category: { type: String, trim: true, maxlength: 40, default: 'Other' },
  level: { type: String, enum: ['Beginner','Intermediate','Advanced'], default: 'Beginner' }
}, { _id: true });
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  location: { type: String, trim: true, maxlength: 100, default: '' },
  avatar: { type: String, default: '' },
  teachSkills: { type: [skillSchema], default: [] },
  learnSkills: { type: [skillSchema], default: [] },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  isDemo: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.hash; delete ret.salt; delete ret.__v; return ret; } } });
// passport-local-mongoose stores a salted password hash, never the raw password.
userSchema.plugin(passportLocalMongoose, { usernameField: 'email', usernameLowerCase: true, errorMessages: { MissingPasswordError: 'Password is required' } });
export default mongoose.model('User', userSchema);
