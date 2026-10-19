const router = require('express').Router();
const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect, adminOnly);
router.get('/dashboard', async (req, res, next) => {
  try {
    const [users, lost, found, pendingClaims, claimed, categoryStats, recentItems, recentClaims] = await Promise.all([
      User.countDocuments({ role: 'student' }), Item.countDocuments({ type: 'lost' }), Item.countDocuments({ type: 'found' }), Claim.countDocuments({ status: 'Pending' }), Item.countDocuments({ status: 'Claimed' }),
      Item.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
      Item.find().sort({ createdAt: -1 }).limit(8).populate('reporter', 'name reg_no'),
      Claim.find().sort({ createdAt: -1 }).limit(8).populate('item_id', 'name legacyId').populate('claimant', 'name reg_no')
    ]);
    res.json({ stats: { users, lost, found, pendingClaims, claimed, totalItems: lost + found }, categoryStats, recentItems, recentClaims });
  } catch (e) { next(e); }
});
router.get('/audit-logs', async (req, res, next) => { try { const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('actor', 'name email reg_no'); res.json({ logs }); } catch (e) { next(e); } });
module.exports = router;
