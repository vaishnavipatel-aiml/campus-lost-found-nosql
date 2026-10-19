const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  reg_no: { type: String, required: true, trim: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  phone: { type: String, trim: true, default: '', maxlength: 25 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
