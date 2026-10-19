const router = require('express').Router();
const Claim = require('../models/Claim');
const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');
router.get('/mine', protect, async (req, res, next) => {
  try { const claims = await Claim.find({ claimant: req.user._id }).sort({ createdAt: -1 }).populate('item_id'); res.json({ claims }); } catch (e) { next(e); }
});
router.post('/', protect, async (req, res, next) => {
  try {
    const { item_id, proof } = req.body;
    if (!item_id || typeof proof !== 'string' || proof.trim().length < 8) return res.status(400).json({ message: 'Choose an item and provide claim details (at least 8 characters).' });
    const item = await Item.findById(item_id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.type !== 'found') return res.status(400).json({ message: 'Claims can only be submitted for found items.' });
    if (String(item.reporter) === String(req.user._id)) return res.status(400).json({ message: 'You cannot claim an item you reported as found.' });
    if (item.status !== 'Open') return res.status(409).json({ message: 'This item already has a pending claim or has been claimed.' });
    const existing = await Claim.findOne({ item_id: item._id, claimant: req.user._id, status: 'Pending' });
    if (existing) return res.status(409).json({ message: 'You already have a pending claim for this item.' });
    const claim = await Claim.create({ reg_no: req.user.reg_no, claimant: req.user._id, item_id: item._id, proof: proof.trim(), status: 'Pending' });
    item.status = 'Pending Claim'; await item.save();
    await AuditLog.create({ actor: req.user._id, actorRegNo: req.user.reg_no, action: 'CLAIM_SUBMITTED', entityType: 'claim', entityId: String(claim._id), details: { itemId: String(item._id) }, ip: req.ip });
    res.status(201).json({ claim, message: 'Claim sent to the campus administrator for review.' });
  } catch (e) { next(e); }
});
router.get('/admin/all', protect, adminOnly, async (req, res, next) => { try { const claims = await Claim.find().sort({ createdAt: -1 }).populate('item_id').populate('claimant', 'name email reg_no'); res.json({ claims }); } catch (e) { next(e); } });
router.patch('/:id/review', protect, adminOnly, async (req, res, next) => {
  try {
    const { status, reviewNote = '' } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Review status must be Approved or Rejected.' });
    const claim = await Claim.findById(req.params.id).populate('item_id');
    if (!claim) return res.status(404).json({ message: 'Claim not found.' });
    if (claim.status !== 'Pending') return res.status(409).json({ message: 'This claim has already been reviewed.' });
    const item = await Item.findById(claim.item_id._id);
    if (!item) return res.status(404).json({ message: 'Related item not found.' });
    if (status === 'Approved') {
      const otherPending = await Claim.find({ item_id: item._id, status: 'Pending', _id: { $ne: claim._id } });
      await Claim.updateMany({ _id: { $in: otherPending.map(c => c._id) } }, { $set: { status: 'Rejected', admin_id: req.user._id, reviewedAt: new Date(), reviewNote: 'Another claim was approved for this item.' } });
      item.status = 'Claimed'; item.resolvedAt = new Date();
    } else {
      const remaining = await Claim.countDocuments({ item_id: item._id, status: 'Pending', _id: { $ne: claim._id } });
      item.status = remaining ? 'Pending Claim' : 'Open';
    }
    await item.save();
    claim.status = status; claim.admin_id = req.user._id; claim.reviewedAt = new Date(); claim.reviewNote = String(reviewNote).trim().slice(0, 500); await claim.save();
    await AuditLog.create({ actor: req.user._id, actorRegNo: req.user.reg_no, action: `CLAIM_${status.toUpperCase()}`, entityType: 'claim', entityId: String(claim._id), details: { itemId: String(item._id), reviewNote: claim.reviewNote }, ip: req.ip });
    res.json({ claim, item, message: `Claim ${status.toLowerCase()}.` });
  } catch (e) { next(e); }
});
module.exports = router;
