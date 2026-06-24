// backend/models/Service.js (verify)
const mongoose = require('mongoose');
const ServiceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  name: String,
  description: String,
  price: Number,
  status: { type: String, enum: ['pending','approved','rejected'], default:'pending' },
  visible: { type: Boolean, default:false },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Service', ServiceSchema);
