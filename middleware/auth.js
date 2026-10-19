const jwt = require('jsonwebtoken');
const User = require('../models/User');
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ message: 'Your account is unavailable.' });
    req.user = user;
    next();
  } catch (error) { return res.status(401).json({ message: 'Your session expired. Please sign in again.' }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access required.' });
  next();
}
module.exports = { protect, adminOnly };
