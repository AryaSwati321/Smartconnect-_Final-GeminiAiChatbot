const Service = require('../models/Service');
const Provider = require('../models/Provider');

exports.listServices = async (req, res) => {
  try {
    const q = req.query;
    const filter = {};

    const isAdmin = req.user && req.user.role === 'admin';
    const isVendor = req.user && req.user.role === 'vendor';

    // If client explicitly requests public-only
    if (q.only === 'public') {
      filter.visible = true;
      filter.status = 'approved';
    } else {
      if (!isAdmin) {
        if (isVendor) {
          // vendors see public approved + their own services (drafts/pending)
          filter.$or = [
            { visible: true, status: 'approved' },
            { owner: req.user._id }
          ];
        } else {
          // public visitors or normal users: only visible & approved
          filter.visible = true;
          filter.status = 'approved';
        }
      }
      // admin sees all (no filter)
    }

    if (q.category) filter.category = q.category;
    // limit and sort can be added
    const services = await Service.find(filter).populate('category owner', 'name businessName').lean();
    return res.json({ services, count: services.length });
  } catch (err) {
    console.error('listServices error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.createService = async (req, res) => {
  try {
    const payload = req.body;
    // ensure vendor must be logged in
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can create services' });
    }
    const provider = await Provider.findOne({ userRef: req.user._id }).select('status');
    if (!provider || provider.status !== 'verified') {
      return res.status(403).json({ msg: 'Vendor not approved by admin yet' });
    }
    const svc = new Service({
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      priceFrom: payload.priceFrom,
      category: payload.category,
      owner: req.user._id,
      status: 'pending',
      visible: false,
    });
    await svc.save();
    return res.status(201).json(svc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot create service' });
  }
};

exports.approveService = async (req, res) => {
  try {
    const id = req.params.id;
    const svc = await Service.findByIdAndUpdate(id, { status: 'approved', visible: true, approvedAt: new Date() }, { new: true }).lean();
    if (!svc) return res.status(404).json({ msg: 'Not found' });
    return res.json(svc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot approve service' });
  }
};

exports.blockService = async (req, res) => {
  try {
    const id = req.params.id;
    const svc = await Service.findByIdAndUpdate(id, { status: 'blocked', visible: false }, { new: true }).lean();
    if (!svc) return res.status(404).json({ msg: 'Not found' });
    return res.json(svc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot block service' });
  }
};

exports.toggleVisibility = async (req, res) => {
  try {
    const id = req.params.id;
    const { visible } = req.body;
    const svc = await Service.findByIdAndUpdate(id, { visible: !!visible }, { new: true }).lean();
    if (!svc) return res.status(404).json({ msg: 'Not found' });
    return res.json(svc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Cannot toggle visibility' });
  }
};
