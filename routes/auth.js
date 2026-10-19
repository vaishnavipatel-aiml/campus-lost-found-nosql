const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const tokenFor = user => jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
const publicUser = user => ({ id: user._id, reg_no: user.reg_no, name: user.name, email: user.email, phone: user.phone, role: user.role });
router.post('/register', async (req, res, next) => {
  try {
    const { reg_no, name, email, phone = '', password } = req.body;
    if (![reg_no, name, email, password].every(v => typeof v === 'string' && v.trim())) return res.status(400).json({ message: 'Registration number, name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Use a password with at least 8 characters.' });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ $or: [{ email: normalizedEmail }, { reg_no: reg_no.trim() }] })) return res.status(409).json({ message: 'That email or registration number is already registered.' });
    const user = await User.create({ reg_no: reg_no.trim(), name: name.trim(), email: normalizedEmail, phone: String(phone).trim(), passwordHash: await bcrypt.hash(password, 12) });
    await AuditLog.create({ actor: user._id, actorRegNo: user.reg_no, action: 'USER_REGISTERED', entityType: 'user', entityId: String(user._id), ip: req.ip });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' });
    await AuditLog.create({ actor: user._id, actorRegNo: user.reg_no, action: 'USER_LOGIN', entityType: 'user', entityId: String(user._id), ip: req.ip });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { next(e); }
});
router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));
module.exports = router;
