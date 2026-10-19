const router = require('express').Router();
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
router.get('/', async (req, res, next) => {
  try {
    const { q = '', type = 'all', category = 'all', status = 'all' } = req.query;
    const filter = {};
    if (['lost', 'found'].includes(type)) filter.type = type;
    if (category !== 'all') filter.category = category;
    if (['Open', 'Pending Claim', 'Claimed'].includes(status)) filter.status = status;
    const query = String(q).trim();
    if (query) filter.$or = ['name', 'description', 'category', 'location', 'reg_no'].map(k => ({ [k]: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
    const items = await Item.find(filter).sort({ createdAt: -1 }).limit(200).populate('reporter', 'name reg_no');
    res.json({ items, total: items.length });
  } catch (e) { next(e); }
});
router.get('/categories', async (req, res, next) => { try { res.json({ categories: await Item.distinct('category') }); } catch (e) { next(e); } });
router.get('/:id', async (req, res, next) => {
  try { const item = await Item.findOne({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { legacyId: req.params.id }] }).populate('reporter', 'name reg_no'); if (!item) return res.status(404).json({ message: 'Item not found.' }); res.json({ item }); }
  catch (e) { next(e); }
});
router.post('/', protect, async (req, res, next) => {
  try {
    const { type, name, description, category, location, date, image = '' } = req.body;
    if (!['lost', 'found'].includes(type) || ![name, description, category, location, date].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ message: 'Please complete all required report fields.' });
    if (image && !/^https?:\/\//i.test(image)) return res.status(400).json({ message: 'Image must be a valid http(s) URL or left blank.' });
    const item = await Item.create({ type, reg_no: req.user.reg_no, reporter: req.user._id, name: name.trim(), description: description.trim(), category: category.trim(), location: location.trim(), date, image: image.trim(), status: 'Open' });
    await AuditLog.create({ actor: req.user._id, actorRegNo: req.user.reg_no, action: 'ITEM_REPORTED', entityType: 'item', entityId: String(item._id), details: { type, name: item.name }, ip: req.ip });
    res.status(201).json({ item, message: 'Your report has been published.' });
  } catch (e) { next(e); }
});
router.get('/mine/reports', protect, async (req, res, next) => { try { const items = await Item.find({ reporter: req.user._id }).sort({ createdAt: -1 }); res.json({ items }); } catch (e) { next(e); } });
module.exports = router;
