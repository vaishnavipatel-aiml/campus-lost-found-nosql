require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Item = require('./models/Item');
const Claim = require('./models/Claim');
const AuditLog = require('./models/AuditLog');
async function seed() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('Configure .env first.');
  await mongoose.connect(process.env.MONGODB_URI);
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@campus.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!ChangeMe';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) admin = await User.create({ reg_no: 'ADMIN001', name: 'Campus Administrator', email: adminEmail, phone: '', passwordHash: await bcrypt.hash(adminPassword, 12), role: 'admin' });
  const demos = [
    { reg_no: '202401', name: 'Aarav Shah', email: 'aarav.demo@campus.local' },
    { reg_no: '202315', name: 'Riya Mehta', email: 'riya.demo@campus.local' },
    { reg_no: '202422', name: 'Kabir Patel', email: 'kabir.demo@campus.local' },
    { reg_no: '202407', name: 'Ananya Rao', email: 'ananya.demo@campus.local' }
  ];
  const users = {};
  for (const d of demos) {
    let u = await User.findOne({ email: d.email });
    if (!u) u = await User.create({ ...d, passwordHash: await bcrypt.hash('Student123!', 12) });
    users[d.reg_no] = u;
  }
  const examples = [
    { legacyId: 'L1001', type: 'lost', reg_no: '202401', reporter: users['202401']._id, name: 'Black Wallet', description: 'Black leather wallet with a small silver logo.', category: 'Accessories', location: 'Central Library', date: '2026-08-28', status: 'Open', image: '' },
    { legacyId: 'L1002', type: 'lost', reg_no: '202315', reporter: users['202315']._id, name: 'Wireless Earbuds', description: 'White earbuds in a grey charging case.', category: 'Electronics', location: 'Block B - Lab 2', date: '2026-08-26', status: 'Open', image: '' },
    { legacyId: 'F1003', type: 'found', reg_no: '202422', reporter: users['202422']._id, name: 'Student ID Card', description: 'ID card found near the main canteen.', category: 'Documents', location: 'Main Canteen', date: '2026-08-30', status: 'Pending Claim', image: '' },
    { legacyId: 'F1004', type: 'found', reg_no: '202407', reporter: users['202407']._id, name: 'Blue Backpack', description: 'Navy blue backpack with two front pockets.', category: 'Bags', location: 'Sports Complex', date: '2026-08-29', status: 'Open', image: '' },
    { legacyId: 'L1005', type: 'lost', reg_no: '202318', reporter: users['202315']._id, name: 'Room Keys', description: 'Two keys on a plain metal key ring.', category: 'Keys', location: 'Block C', date: '2026-08-24', status: 'Open', image: '' },
    { legacyId: 'F1006', type: 'found', reg_no: '202431', reporter: users['202401']._id, name: 'Engineering Book', description: 'Engineering mathematics book with handwritten notes.', category: 'Books', location: 'Reading Room', date: '2026-08-27', status: 'Open', image: '' }
  ];
  for (const e of examples) await Item.updateOne({ legacyId: e.legacyId }, { $setOnInsert: e }, { upsert: true });
  const idCard = await Item.findOne({ legacyId: 'F1003' });
  const existingClaim = await Claim.findOne({ legacyId: 'CDEMO1003' });
  if (!existingClaim) await Claim.create({ legacyId: 'CDEMO1003', reg_no: '202401', claimant: users['202401']._id, item_id: idCard._id, admin_id: null, proof: 'My student ID is issued in my name and I can verify the photograph and registration details in person.', status: 'Pending', claim_date: new Date('2026-08-31T09:00:00Z') });
  if (!await AuditLog.exists({ action: 'DEMO_DATA_SEEDED' })) await AuditLog.create({ actor: admin._id, actorRegNo: admin.reg_no, action: 'DEMO_DATA_SEEDED', entityType: 'system', details: { message: 'Demo dataset created.' } });
  console.log('\nSeed complete. Demo sign-in details:');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log('Students: aarav.demo@campus.local, riya.demo@campus.local, kabir.demo@campus.local, ananya.demo@campus.local');
  console.log('Student password for all demo accounts: Student123!');
  await mongoose.disconnect();
}
seed().catch(async e => { console.error(e); await mongoose.disconnect(); process.exit(1); });
