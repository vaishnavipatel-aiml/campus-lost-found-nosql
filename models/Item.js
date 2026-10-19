const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({
  legacyId: { type: String, unique: true, sparse: true, index: true },
  type: { type: String, enum: ['lost', 'found'], required: true, index: true },
  reg_no: { type: String, required: true, trim: true, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  category: { type: String, required: true, trim: true, index: true },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  date: { type: String, required: true },
  status: { type: String, enum: ['Open', 'Pending Claim', 'Claimed'], default: 'Open', index: true },
  image: { type: String, default: '', trim: true },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });
itemSchema.index({ name: 'text', description: 'text', location: 'text', category: 'text' });
module.exports = mongoose.model('Item', itemSchema);
