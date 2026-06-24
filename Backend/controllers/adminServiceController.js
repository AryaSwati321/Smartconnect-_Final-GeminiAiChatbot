const Service = require('../models/Service');

exports.listAllServices = async (req, res) => {
  try {
    // Only admins allowed
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

    const services = await Service.find().populate('category owner', 'name businessName').lean();
    return res.json({ services, count: services.length });
  } catch (err) {
    console.error('admin listAllServices error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.listPendingServices = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

    const pending = await Service.find({ status: 'pending' }).populate('category owner', 'name businessName').lean();
    return res.json({ services: pending, count: pending.length });
  } catch (err) {
    console.error('admin listPendingServices error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveService = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

    const id = req.params.id;
    const s = await Service.findByIdAndUpdate(id, { status: 'approved', visible: true, approvedAt: new Date() }, { new: true }).lean();
    if (!s) return res.status(404).json({ msg: 'Not found' });
    return res.json(s);
  } catch (err) {
    console.error('admin approveService', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};
