const mongoose = require('mongoose');
const claimSchema = new mongoose.Schema({
  legacyId: { type: String, unique: true, sparse: true },
  reg_no: { type: String, required: true, index: true },
  claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  proof: { type: String, required: true, trim: true, maxlength: 1500 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  claim_date: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: '', maxlength: 500 }
}, { timestamps: true });
module.exports = mongoose.model('Claim', claimSchema);
