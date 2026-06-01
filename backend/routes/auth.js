const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { verifyFirebaseIdToken } = require('../config/firebase');
const { compareCode, expiresAt, generateCode, hashCode } = require('../utils/otp');
const { NotificationConfigError, sendVerificationEmail } = require('../services/notificationService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizePhone = (phone) => String(phone || '').trim();

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  authProvider: user.authProvider
});

const validatePassword = (password) => typeof password === 'string' && password.length >= 8;

const setAccountVerificationCode = async (user) => {
  const code = generateCode();
  user.emailVerificationCodeHash = await hashCode(code);
  user.emailVerificationExpiresAt = expiresAt();
  return code;
};

const setLoginVerificationCode = async (user) => {
  const code = generateCode();
  user.loginVerificationCodeHash = await hashCode(code);
  user.loginVerificationExpiresAt = expiresAt();
  return code;
};

const handleError = (res, error) => {
  console.error('Auth route error:', error);

  if (error instanceof NotificationConfigError || error.statusCode) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Server error', error: error.message });
};

router.post('/register', async (req, res) => {
  const name = String(req.body.name || req.body.fullName || '').trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const { password } = req.body;
  let createdUserId = null;

  try {
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Full name, phone number, email, and password are required.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const phoneOwner = await User.findOne({ phone });
    if (phoneOwner && normalizeEmail(phoneOwner.email) !== email) {
      return res.status(400).json({ message: 'Phone number is already linked with another account.' });
    }

    let user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: 'User already exists. Please sign in.' });
    }

    const isNewUser = !user;
    if (isNewUser) {
      user = new User({
        name,
        email,
        phone,
        password,
        authProvider: 'local',
        isEmailVerified: false
      });
    } else {
      user.name = name;
      user.phone = phone;
      user.password = password;
      user.authProvider = 'local';
    }

    const code = await setAccountVerificationCode(user);
    await user.save();
    if (isNewUser) createdUserId = user._id;

    await sendVerificationEmail({ to: email, code, purpose: 'signup' });

    return res.status(201).json({
      message: 'Verification code sent to your email.',
      email,
      requiresVerification: true,
      purpose: 'signup'
    });
  } catch (error) {
    if (createdUserId && error instanceof NotificationConfigError) {
      await User.findByIdAndDelete(createdUserId).catch(() => {});
    }
    return handleError(res, error);
  }
});

router.post('/verify-email', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();

  try {
    const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified. Please sign in.' });
    }

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
    }

    const isMatch = await compareCode(code, user.emailVerificationCodeHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid verification code.' });

    await User.findByIdAndUpdate(user._id, {
      $set: {
        isEmailVerified: true,
        lastLoginAt: new Date()
      },
      $unset: {
        emailVerificationCodeHash: '',
        emailVerificationExpiresAt: ''
      }
    });

    user.isEmailVerified = true;

    return res.json({
      ...publicUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password +emailVerificationCodeHash +emailVerificationExpiresAt +loginVerificationCodeHash +loginVerificationExpiresAt');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const purpose = user.isEmailVerified ? 'login' : 'signup';
    const code = user.isEmailVerified
      ? await setLoginVerificationCode(user)
      : await setAccountVerificationCode(user);

    await user.save();
    await sendVerificationEmail({ to: email, code, purpose });

    return res.json({
      message: user.isEmailVerified
        ? 'Login verification code sent to your email.'
        : 'Please verify your email before signing in. A new code has been sent.',
      email,
      requiresVerification: true,
      purpose
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/verify-login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const fcmToken = req.body.fcmToken;

  try {
    const user = await User.findOne({ email }).select('+loginVerificationCodeHash +loginVerificationExpiresAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your account email first.' });
    }

    if (!user.loginVerificationExpiresAt || user.loginVerificationExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Login code expired. Please sign in again.' });
    }

    const isMatch = await compareCode(code, user.loginVerificationCodeHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid login code.' });

    const update = {
      $set: {
        lastLoginAt: new Date()
      },
      $unset: {
        loginVerificationCodeHash: '',
        loginVerificationExpiresAt: ''
      }
    };
    if (fcmToken) update.$set.fcmToken = fcmToken;
    await User.findByIdAndUpdate(user._id, update);

    return res.json({
      ...publicUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified.' });

    const code = await setAccountVerificationCode(user);
    await user.save();
    await sendVerificationEmail({ to: email, code, purpose: 'signup' });

    return res.json({
      message: 'Verification code sent to your email.',
      email,
      requiresVerification: true,
      purpose: 'signup'
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/firebase', async (req, res) => {
  const { idToken, fcmToken, coordinates } = req.body;

  try {
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token is required.' });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const email = normalizeEmail(decoded.email);
    const phone = normalizePhone(decoded.phone_number);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && email) user = await User.findOne({ email });
    if (!user && phone) user = await User.findOne({ phone });

    if (!user) {
      user = new User({
        firebaseUid: decoded.uid,
        email: email || undefined,
        phone: phone || undefined,
        name: decoded.name || email || phone || 'PawCare User',
        authProvider: 'firebase',
        isEmailVerified: Boolean(decoded.email_verified || !email),
        role: 'standard'
      });
    } else {
      user.firebaseUid = decoded.uid;
      user.authProvider = user.authProvider || 'firebase';
      if (email && !user.email) user.email = email;
      if (phone && !user.phone) user.phone = phone;
      if (decoded.name && !user.name) user.name = decoded.name;
      if (email && decoded.email_verified) user.isEmailVerified = true;
    }

    if (Array.isArray(coordinates) && coordinates.length === 2) {
      user.location = { type: 'Point', coordinates };
    }
    if (fcmToken) user.fcmToken = fcmToken;
    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      ...publicUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -emailVerificationCodeHash -loginVerificationCodeHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
});

router.put('/fcm-token', protect, async (req, res) => {
  try {
    if (!req.body.fcmToken) {
      return res.status(400).json({ message: 'FCM token is required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fcmToken = req.body.fcmToken;
    await user.save();

    return res.json({ message: 'Notification token saved.' });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/ngos', async (req, res) => {
  return res.status(410).json({ message: 'Use /api/ngos for the CSV-based NGO directory.' });
});

module.exports = router;
