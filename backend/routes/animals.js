const express = require('express');
const router = express.Router();
const Animal = require('../models/Animal');
const RescueAlert = require('../models/RescueAlert');
const { protect } = require('../middleware/auth');
const { findNgos } = require('../services/ngoDirectory');
const { notifyNgosAboutAnimal } = require('../services/notificationService');

const HELP_STATUSES = ['Injured', 'Hungry', 'Needs Rescue'];

const parseCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  return [lon, lat];
};

router.post('/', protect, async (req, res) => {
  const {
    animalType,
    description,
    photoUrl,
    status = 'Healthy',
    urgency = 'Medium',
    assistanceType = 'Other',
    coordinates,
    address,
    district,
    state
  } = req.body;

  try {
    const parsedCoordinates = parseCoordinates(coordinates);
    if (!animalType || !description) {
      return res.status(400).json({
        message: 'Animal type and description are required.'
      });
    }

    const animal = await Animal.create({
      animalType: String(animalType).trim(),
      description: String(description).trim(),
      photoUrl: photoUrl || undefined,
      status,
      urgency,
      assistanceType,
      location: parsedCoordinates ? { type: 'Point', coordinates: parsedCoordinates } : undefined,
      locationDetails: {
        address: address || undefined,
        district: district || undefined,
        state: state || undefined
      },
      reportedBy: req.user._id
    });

    const shouldNotify = HELP_STATUSES.includes(status);
    const nearbyNgos = shouldNotify
      ? findNgos({ state, district, limit: process.env.NGO_NOTIFY_LIMIT || 10 })
      : [];

    const notifications = shouldNotify
      ? await notifyNgosAboutAnimal({ ngos: nearbyNgos, animal, reporter: req.user })
      : { totalNgosMatched: 0, totalNgosAttempted: 0, attempts: [] };

    let rescueAlert = null;
    if (status === 'Injured' || status === 'Needs Rescue') {
      rescueAlert = await RescueAlert.create({
        animalId: animal._id,
        status: 'Reported',
        nearbyNgos: nearbyNgos.map((ngo) => ({
          sourceId: ngo.sourceId,
          name: ngo.name,
          district: ngo.district,
          state: ngo.state,
          contactNumber: ngo.contactNumber,
          email: ngo.email
        })),
        notificationAttempts: notifications.attempts.map((attempt) => ({
          ngoName: attempt.ngoName,
          channel: attempt.channel,
          target: attempt.target,
          status: attempt.status,
          reason: attempt.reason,
          messageId: attempt.messageId,
          sentAt: attempt.sentAt
        })),
        notes: [{ text: description, addedBy: req.user._id }]
      });
    }

    return res.status(201).json({
      animal,
      rescueAlert,
      nearbyNgos,
      notifications
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const animals = await Animal.find()
      .populate('reportedBy', 'name email phone')
      .sort({ createdAt: -1 });
    return res.json(animals);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id).populate('reportedBy', 'name email phone');
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    return res.json(animal);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });

    const allowedUpdates = ['animalType', 'description', 'photoUrl', 'status', 'urgency', 'assistanceType', 'lastFed'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) animal[field] = req.body[field];
    });

    if (req.body.locationDetails) {
      animal.locationDetails = {
        ...animal.locationDetails,
        ...req.body.locationDetails
      };
    }

    await animal.save();
    return res.json(animal);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
