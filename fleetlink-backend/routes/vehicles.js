const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const calcRideDuration = require('../utils/calcRideDuration');


router.post('/', async (req, res) => {
  try {
    const { name, capacityKg, tyres } = req.body;
    if (!name || typeof capacityKg !== 'number' || typeof tyres !== 'number') {
      return res.status(400).json({ message: 'name, capacityKg (number) and tyres (number) required' });
    }
    const v = new Vehicle({ name, capacityKg, tyres });
    await v.save();
    return res.status(201).json(v);
  } catch (err) {
    console.error('POST /api/vehicles error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/available', async (req, res) => {
  try {
    const { capacityRequired, fromPincode, toPincode, startTime, exact } = req.query;

   
    if (!capacityRequired || !fromPincode || !toPincode || !startTime) {
      return res.status(400).json({ message: 'capacityRequired, fromPincode, toPincode and startTime are required as query params' });
    }
    const capacityNum = Number(capacityRequired);
    if (Number.isNaN(capacityNum)) {
      return res.status(400).json({ message: 'capacityRequired must be a number' });
    }
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid startTime' });

    
    let estimatedRideDurationHours;
    try {
      estimatedRideDurationHours = calcRideDuration(fromPincode, toPincode);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid pincode(s)' });
    }
    const end = new Date(start.getTime() + estimatedRideDurationHours * 60 * 60 * 1000);

   
    let candidateVehicles;
    if (exact === "true") {
      // strict mode: only exact capacity match
      candidateVehicles = await Vehicle.find({ capacityKg: capacityNum }).lean();
    } else {

      candidateVehicles = await Vehicle.find({ capacityKg: { $gte: capacityNum } })
        .sort({ capacityKg: 1 }) // smallest first
        .lean();
    }

    
    const available = await Promise.all(candidateVehicles.map(async (veh) => {
      const conflict = await Booking.exists({
        vehicleId: veh._id,
       
        $expr: {
          $and: [
            { $lt: ['$startTime', end] },
            { $gt: ['$endTime', start] }
          ]
        }
      }).catch(async () => {
       
        return Booking.exists({
          vehicleId: veh._id,
          startTime: { $lt: end },
          endTime: { $gt: start }
        });
      });

      if (!conflict) {
        return {
          vehicle: veh,
          estimatedRideDurationHours
        };
      }
      return null;
    }));


    const result = available.filter(Boolean);
    return res.status(200).json(result);
  } catch (err) {
    console.error('GET /api/vehicles/available error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
