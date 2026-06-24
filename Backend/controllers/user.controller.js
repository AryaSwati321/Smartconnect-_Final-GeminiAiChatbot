// backend/controllers/user.controller.js
const User = require('../models/User');

// Normalize user doc to a consistent shape for the frontend
function toProfileDTO(user) {
  return {
    // prefer fullName; fall back to name
    fullName: user.fullName || user.name || '',
    phone: user.phone || '',
    defaultAddress: user.defaultAddress || '',
    location: user.location || null,
    email: user.email,
    role: user.role,
  };
}

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    'name fullName phone defaultAddress location email role'
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(toProfileDTO(user));
};

exports.updateMe = async (req, res) => {
  const { fullName, phone, defaultAddress, lat, lng } = req.body;

  if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) {
    return res.status(400).json({ message: 'Invalid phone format' });
  }

  const update = {};
  if (fullName !== undefined) {
    // keep both fields in sync
    update.fullName = fullName;
    update.name = fullName;
  }
  if (phone !== undefined) update.phone = phone;
  if (defaultAddress !== undefined) update.defaultAddress = defaultAddress;

  if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    update.location = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }

  const user = await User.findByIdAndUpdate(req.user.id, update, {
    new: true,
  }).select('name fullName phone defaultAddress location email role');

  // If the logged-in user is a vendor, keep Provider location in sync
  if (user.role === 'vendor' && lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    const Provider = require('../models/Provider');
    await Provider.findOneAndUpdate(
      { userRef: user._id },
      {
        $set: {
          location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        },
      },
      { new: true, upsert: true }
    );
  }

  res.json(toProfileDTO(user));
};
