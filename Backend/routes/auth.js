// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const ServiceCategory = require('../models/ServiceCategory');
const { verifyToken } = require('../middlewares/auth');
const { signAuthToken } = require('../utils/jwt');
const Provider = require('../models/Provider');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

/* ---------- File Upload Setup (for vendor certification) ---------- */
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper to remove any uploaded files when a request fails
function cleanupUploads(req) {
  if (req?.files?.avatar?.[0]) {
    try { fs.unlinkSync(req.files.avatar[0].path); } catch (_) {}
  }
  if (req?.files?.certification?.[0]) {
    try { fs.unlinkSync(req.files.certification[0].path); } catch (_) {}
  }
}

// SMTP transport (Gmail)
const mailTransport = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // TLS upgrade
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendOtpEmail(to, otp) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not set; skipping email send.');
    return;
  }
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: 'Your Smart Connect Login OTP',
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`
  };
  try {
    await mailTransport.verify();
    await mailTransport.sendMail(mailOptions);
    console.log(`[OTP] Email sent to ${to}`);
  } catch (err) {
    console.error('Failed to send OTP email', err);
    throw err;
  }
}

async function resolveCategoryIds(categoryInput) {
  if (!categoryInput) return [];
  const text = String(categoryInput).trim();
  if (!text) return [];

  // If it looks like an ObjectId, trust it
  if (/^[a-f0-9]{24}$/i.test(text)) return [text];

  // Exact name match
  const exact = await ServiceCategory.findOne({ name: new RegExp(`^${text}$`, 'i') }).select('_id').lean();
  if (exact?._id) return [exact._id];

  // Fuzzy: singular/plural/gerund
  const variants = new Set();
  const base = text.toLowerCase();
  variants.add(base);
  if (base.endsWith('ing')) variants.add(base.slice(0, -3));
  if (base.endsWith('er')) variants.add(base.slice(0, -2));
  const snapshot = [...variants];
  snapshot.forEach((v) => {
    if (!v.endsWith('er')) variants.add(`${v}er`);
    if (!v.endsWith('ing')) variants.add(`${v}ing`);
  });

  const cats = await ServiceCategory.find({}).select('_id name keywords').lean();
  for (const cat of cats) {
    const name = String(cat.name || '').toLowerCase();
    const kws = (cat.keywords || []).map((k) => String(k).toLowerCase());
    if ([...variants].some((v) => name.includes(v) || v.includes(name) || kws.includes(v))) {
      return [cat._id];
    }
  }

  return [];
}

/* -------------------------------- REGISTER --------------------------------
 * Supports:
 * - User registration via JSON
 * - Vendor registration via multipart/form-data (with optional certification)
 * Optional fields lat/lng will be saved as GeoJSON { type: "Point", coordinates: [lng, lat] }
 * ------------------------------------------------------------------------- */
router.post('/register', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'certification', maxCount: 1 }]), async (req, res) => {
  try {
    // Works for both JSON and multipart/form-data
    const {
      name,
      email,
      password,
      phone,
      role = 'user',
      mobile,
      adhar,
      experience,
      address,
      workingArea,
      category,
      lat,
      lng,
    } = req.body || {};

    if (!name || !email || !password) {
      cleanupUploads(req);
      return res.status(400).json({ msg: 'name, email and password are required' });
    }

    if (role === 'user' && !phone) {
      cleanupUploads(req);
      return res.status(400).json({ msg: 'phone is required for user registration' });
    }

    // Email uniqueness
    const existing = await User.findOne({ email });
    if (existing) {
      cleanupUploads(req);
      return res.status(400).json({ msg: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Base user payload
    const userData = {
      name,
      email,
      passwordHash,
      role,
      phone: role === 'user' ? String(phone).trim() : undefined,
    };

    // ✅ GEO: only set location if BOTH lat & lng provided
    if (
      lat !== undefined &&
      lng !== undefined &&
      lat !== '' &&
      lng !== '' &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng))
    ) {
      userData.location = {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)], // [lng, lat]
      };
    }

    const categoryIds = await resolveCategoryIds(category);

    // Vendor extras (for multipart or JSON)
    if (role === 'vendor') {
      userData.mobile = mobile;
      userData.adhar = adhar;
      userData.experience = experience;
      userData.address = address;
      userData.workingArea = workingArea;
      userData.category = category;
      userData.vendorApproved = false;

      if (req.files?.certification?.[0]) {
        userData.certification = req.files.certification[0].filename;
      }
    }

    // Avatar for any role
    if (req.files?.avatar?.[0]) {
      userData.avatar = req.files.avatar[0].filename;
    }

    // Create user
    const user = await User.create(userData);

    // For vendors, ensure a Provider stub exists in "pending" status so admin can review.
    if (role === 'vendor') {
      const providerUpdate = {
        $setOnInsert: { status: 'pending' },
        $set: {
          businessName: name,
          description: userData.address || ''
        },
      };

      if (userData.location) {
        providerUpdate.$set.location = userData.location;
      } else {
        providerUpdate.$unset = { location: 1 };
      }
      if (categoryIds.length) {
        providerUpdate.$set.categories = categoryIds;
      }

      await Provider.findOneAndUpdate(
        { userRef: user._id },
        providerUpdate,
        { upsert: true, new: true }
      );
    }

    // Issue and persist JWT at registration time as well.
    const token = signAuthToken(user);
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          authToken: token,
          tokenIssuedAt: new Date()
        }
      },
      { new: true }
    ).select('+authToken');

    if (!updatedUser || updatedUser.authToken !== token) {
      return res.status(500).json({ msg: 'User created but failed to persist auth token' });
    }

    return res.status(201).json({
      msg: 'User created successfully',
      userId: user._id,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        vendorApproved: user.vendorApproved
      },
      tokenStored: true
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    // Clean up uploaded file on error
    cleanupUploads(req);
    return res.status(500).json({ msg: 'Server error during register' });
  }
});

/* --------------------------------- LOGIN (OTP step 1) ----------------------------------
 * Expects: { email, password }
 * Generates OTP, stores on user, returns requiresOtp + userId
 * ------------------------------------------------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ msg: 'email and password required' });
    }

    // Special-case: provide an easy admin login for local/dev environments
    // Credentials: admin@local / 1234
    if (String(email).toLowerCase() === 'admin@local' && String(password) === '1234') {
      let admin = await User.findOne({ email: 'admin@local' });
      if (!admin) {
        const passwordHash = await bcrypt.hash(password, 10);
        admin = await User.create({ name: 'Arya Swati', email: 'admin@local', passwordHash, role: 'admin' });
      } else if (admin.name !== 'Arya Swati') {
        // Ensure existing admin has the requested display name
        await User.findByIdAndUpdate(admin._id, { $set: { name: 'Arya Swati' } });
        admin.name = 'Arya Swati';
      }

      // Issue token and persist it
      const token = signAuthToken(admin);
      await User.findByIdAndUpdate(admin._id, { $set: { authToken: token, tokenIssuedAt: new Date() } });

      return res.json({
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        tokenStored: true
      });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ msg: 'Invalid credentials' });

    const otp = String(crypto.randomInt(100000, 999999));
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        otpCode: otp,
        otpExpiresAt: expires,
        authToken: null,
        tokenIssuedAt: null
      }
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (e) {
      return res.status(500).json({ msg: 'Could not send OTP email. Check SMTP settings.' });
    }

    console.log(`[OTP] Login OTP for ${user.email}: ${otp} (expires ${expires.toISOString()})`);

    return res.json({
      requiresOtp: true,
      userId: user._id,
      msg: 'OTP sent to registered email'
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ msg: 'Server error during login' });
  }
});

/* ----------------------------- VERIFY OTP (step 2) ----------------------------- */
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body || {};
    if (!userId || !otp) return res.status(400).json({ msg: 'userId and otp are required' });

    const user = await User.findById(userId).select('+otpCode +otpExpiresAt');
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ msg: 'OTP not requested or expired' });
    }

    if (String(user.otpCode) !== String(otp)) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    const token = signAuthToken(user);
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: { authToken: token, tokenIssuedAt: new Date() },
        $unset: { otpCode: 1, otpExpiresAt: 1 }
      },
      { new: true }
    );

    // Ensure vendor stub exists
    if (user.role === 'vendor') {
      const categoryIds = await resolveCategoryIds(user.category);
      const update = {
        $setOnInsert: { status: 'pending', businessName: user.name }
      };
      if (categoryIds.length) {
        update.$set = { categories: categoryIds };
      }
      // Ensure invalid geo fields don't break the upsert
      update.$unset = { location: 1 };

      await Provider.findOneAndUpdate({ userRef: user._id }, update, { upsert: true, new: true });
    }

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        vendorApproved: user.vendorApproved
      },
      tokenStored: true
    });
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    return res.status(500).json({ msg: 'Server error verifying OTP' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  return res.json({
    user: {
      id: req.user?._id || req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
      vendorApproved: req.user?.vendorApproved,
      avatar: req.user?.avatar
    }
  });
});

router.post('/logout', verifyToken, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $set: { authToken: null, tokenIssuedAt: null }
  });
  return res.json({ msg: 'Logged out' });
});

module.exports = router;
