const mongoose = require('mongoose');
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRegNo: { type: String, default: 'SYSTEM' },
  action: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['user', 'item', 'claim', 'system'], required: true },
  entityId: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' }
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model('AuditLog', auditLogSchema);
