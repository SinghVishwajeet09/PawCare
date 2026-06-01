const express = require('express');
const router = express.Router();
const RescueAlert = require('../models/RescueAlert');
const Animal = require('../models/Animal');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendPushNotification } = require('../config/firebase');
const { findNgos } = require('../services/ngoDirectory');
const { notifyNgosAboutAnimal } = require('../services/notificationService');

// @route   POST /api/rescues
// @desc    Report an injured animal / Create rescue alert
// @access  Private
router.post('/', protect, async (req, res) => {
  const { animalId, notes } = req.body;

  try {
    const animal = await Animal.findById(animalId);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });

    // Update animal status to Needs Rescue or Injured
    animal.status = 'Needs Rescue';
    await animal.save();

    const rescueAlert = await RescueAlert.create({
      animalId,
      status: 'Reported',
      notes: notes ? [{ text: notes, addedBy: req.user._id }] : []
    });

    const nearbyNgos = findNgos({
      state: animal.locationDetails?.state,
      district: animal.locationDetails?.district,
      limit: process.env.NGO_NOTIFY_LIMIT || 10
    });
    const notifications = await notifyNgosAboutAnimal({
      ngos: nearbyNgos,
      animal,
      reporter: req.user
    });

    rescueAlert.nearbyNgos = nearbyNgos.map((ngo) => ({
      sourceId: ngo.sourceId,
      name: ngo.name,
      district: ngo.district,
      state: ngo.state,
      contactNumber: ngo.contactNumber,
      email: ngo.email
    }));
    rescueAlert.notificationAttempts = notifications.attempts.map((attempt) => ({
      ngoName: attempt.ngoName,
      channel: attempt.channel,
      target: attempt.target,
      status: attempt.status,
      reason: attempt.reason,
      messageId: attempt.messageId,
      sentAt: attempt.sentAt
    }));
    await rescueAlert.save();

    const usersToNotify = await User.find({ fcmToken: { $exists: true, $ne: null }, role: { $in: ['volunteer', 'ngo'] } });
    const tokens = usersToNotify.map(u => u.fcmToken);

    if (tokens.length > 0) {
      await sendPushNotification(
        tokens,
        'Rescue Alert!',
        'An injured animal needs immediate rescue nearby.',
        { rescueAlertId: rescueAlert._id.toString() }
      );
    }

    res.status(201).json({ rescueAlert, nearbyNgos, notifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/rescues
// @desc    Get all rescue alerts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const alerts = await RescueAlert.find().populate('animalId').populate('assignedTo', 'name');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/rescues/:id
// @desc    Update rescue alert status (assign, resolve)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { status, note } = req.body;

  try {
    const alert = await RescueAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    if (status) alert.status = status;
    if (status === 'In Progress' && !alert.assignedTo) {
      alert.assignedTo = req.user._id;
    }
    
    if (note) {
      alert.notes.push({ text: note, addedBy: req.user._id });
    }

    await alert.save();

    // If resolved, update animal status
    if (status === 'Resolved') {
      await Animal.findByIdAndUpdate(alert.animalId, { status: 'Healthy' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
