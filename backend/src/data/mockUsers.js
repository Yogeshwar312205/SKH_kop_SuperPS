const mongoose = require('mongoose');

/**
 * Generates a valid 24-character hex MongoDB ObjectId string.
 */
const generateValidObjectId = () => new mongoose.Types.ObjectId().toString();

/**
 * In-memory fallback accounts for offline / development operation.
 * Matches accounts listed in SAMPLE_USERS.md with password 'krishi@2026'.
 */
const MOCK_USERS = [
  {
    _id: '65f1a0010000000000000001',
    name: 'Ramesh Singh',
    email: 'ramesh.farmer@krishiflow.ai',
    phone: '+91 98765 43210',
    role: 'Farmer',
    location: { address: 'Nashik Central Farm HQ, Maharashtra', coordinates: [73.7898, 19.9975] },
    primaryCrop: 'Tomato',
    password: 'krishi@2026',
  },
  {
    _id: '65f1a0010000000000000002',
    name: 'Kiran Thorat',
    email: 'kiran.farmer@krishiflow.ai',
    phone: '+91 94211 77665',
    role: 'Farmer',
    location: { address: 'Lasalgaon farm, Niphad, Nashik', coordinates: [74.2400, 20.1400] },
    primaryCrop: 'Onion',
    password: 'krishi@2026',
  },
  {
    _id: '65f1a0010000000000000003',
    name: 'Vikram Jadhav',
    email: 'vikram.fleet@krishiflow.ai',
    phone: '+91 98600 12345',
    role: 'Logistics',
    location: { address: 'Sahyadri Transport, Nashik', coordinates: [73.7898, 19.9975] },
    password: 'krishi@2026',
  },
  {
    _id: '65f1a0010000000000000004',
    name: 'Farida Shaikh',
    email: 'farida.fleet@krishiflow.ai',
    phone: '+91 97300 88221',
    role: 'Logistics',
    location: { address: 'Deccan Carriers, Pune', coordinates: [73.8567, 18.5204] },
    password: 'krishi@2026',
  },
  {
    _id: '65f1a0010000000000000005',
    name: 'Rajesh Mehta',
    email: 'rajesh.buyer@krishiflow.ai',
    phone: '+91 98200 55443',
    role: 'APMC Buyer',
    location: { address: 'Mumbai APMC, Vashi', coordinates: [73.0044, 19.0760] },
    password: 'krishi@2026',
  },
  {
    _id: '65f1a0010000000000000006',
    name: 'Ganesh Shinde (MSRTC)',
    email: 'driver.msrtc@krishiflow.ai',
    phone: '+91 98221 00112',
    role: 'MSRTC Driver',
    location: { address: 'Kopargaon ST Bus Depot, Maharashtra', coordinates: [74.4764, 19.8835] },
    password: 'krishi@2026',
  },
];

const findMockUserByEmail = (email) => {
  if (!email) return null;
  const clean = String(email).trim().toLowerCase();
  return MOCK_USERS.find((u) => u.email.toLowerCase() === clean) || null;
};

const findMockUserById = (id) => {
  if (!id) return null;
  const clean = String(id);
  return MOCK_USERS.find((u) => String(u._id) === clean) || null;
};

const addMockUser = (user) => {
  if (!user._id || !mongoose.Types.ObjectId.isValid(user._id)) {
    user._id = generateValidObjectId();
  }
  MOCK_USERS.push(user);
  return user;
};

module.exports = {
  MOCK_USERS,
  findMockUserByEmail,
  findMockUserById,
  addMockUser,
  generateValidObjectId,
};
