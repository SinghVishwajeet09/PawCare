const express = require('express');
const router = express.Router();
const FeedLog = require('../models/FeedLog');
const Animal = require('../models/Animal');
const { protect } = require('../middleware/auth');

// @route   POST /api/feed
// @desc    Mark an animal or location as fed
// @access  Private (Volunteers mostly)
router.post('/', protect, async (req, res) => {
  const { animalId, coordinates } = req.body;

  try {
    let feedCoordinates = coordinates;
    if (!feedCoordinates && animalId) {
      const animal = await Animal.findById(animalId);
      if (!animal) return res.status(404).json({ message: 'Animal not found' });
      if (animal.location && animal.location.coordinates) {
        feedCoordinates = animal.location.coordinates;
      }
    }

    const feedLog = await FeedLog.create({
      animalId: animalId || undefined,
      location: feedCoordinates && Array.isArray(feedCoordinates) && feedCoordinates.length === 2 
        ? { type: 'Point', coordinates: feedCoordinates } 
        : undefined,
      volunteerId: req.user._id
    });

    if (animalId) {
      await Animal.findByIdAndUpdate(animalId, { lastFed: new Date() });
    }

    res.status(201).json(feedLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/feed
// @desc    Get feed logs for map (recent feeds)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Return feed logs from last 24 hours
    const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    const logs = await FeedLog.find({ createdAt: { $gte: yesterday } }).populate('volunteerId', 'name');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/feed/active
// @desc    Get active feeders in the last 24 hours
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    const activeFeeders = await FeedLog.distinct('volunteerId', { createdAt: { $gte: yesterday } });
    res.json({ count: activeFeeders.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
