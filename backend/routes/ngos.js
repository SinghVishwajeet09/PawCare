const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { findNgos, listStates } = require('../services/ngoDirectory');
const { notifyNgosAboutAnimal } = require('../services/notificationService');

router.get('/', (req, res) => {
  try {
    const { state, district, limit } = req.query;
    const items = findNgos({ state, district, limit });

    return res.json({
      count: items.length,
      query: { state: state || '', district: district || '' },
      source: 'ngos.csv',
      items
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load NGO directory.', error: error.message });
  }
});

router.get('/states', (req, res) => {
  try {
    return res.json({ states: listStates() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load states.', error: error.message });
  }
});

router.post('/notify', protect, async (req, res) => {
  try {
    const { animal, state, district } = req.body;
    if (!animal) return res.status(400).json({ message: 'Animal report details are required.' });

    const ngos = findNgos({ state, district, limit: process.env.NGO_NOTIFY_LIMIT || 10 });
    const notifications = await notifyNgosAboutAnimal({
      ngos,
      animal,
      reporter: req.user
    });

    return res.json({ ngos, notifications });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to notify NGOs.', error: error.message });
  }
});

module.exports = router;
