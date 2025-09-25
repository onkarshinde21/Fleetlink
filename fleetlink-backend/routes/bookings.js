const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const calcRideDuration = require("../utils/calcRideDuration");

// POST /api/bookings
router.post("/", async (req, res) => {
  try {
    const { vehicleId, fromPincode, toPincode, startTime, customerId } = req.body;
    if (!vehicleId || !fromPincode || !toPincode || !startTime || !customerId) {
      return res.status(400).json({
        message: "vehicleId, fromPincode, toPincode, startTime, customerId required",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: "Invalid startTime" });
    }

    const estimatedRideDurationHours = calcRideDuration(fromPincode, toPincode);
    const bookingEndTime = new Date(
      start.getTime() + estimatedRideDurationHours * 3600 * 1000
    );

    // Prevent overlap
    const conflict = await Booking.findOne({
      vehicleId,
      startTime: { $lt: bookingEndTime },
      endTime: { $gt: start },
    });

    if (conflict) {
      return res
        .status(409)
        .json({ message: "Vehicle already booked for this time window" });
    }

    const booking = new Booking({
      vehicleId,
      fromPincode,
      toPincode,
      startTime: start,
      endTime: bookingEndTime,
      customerId,
    });

    await booking.save();

    // Populate vehicle details before returning
    const savedBooking = await Booking.findById(booking._id).populate("vehicleId");

    return res.status(201).json({
      _id: savedBooking._id,
      fromPincode: savedBooking.fromPincode,
      toPincode: savedBooking.toPincode,
      startTime: savedBooking.startTime,
      endTime: savedBooking.endTime,
      customerId: savedBooking.customerId,
      vehicle: savedBooking.vehicleId
        ? {
            _id: savedBooking.vehicleId._id,
            name: savedBooking.vehicleId.name,
            capacityKg: savedBooking.vehicleId.capacityKg,
            tyres: savedBooking.vehicleId.tyres,
          }
        : null,
    });
  } catch (err) {
    console.error("POST /api/bookings error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/bookings
router.get("/", async (req, res) => {
  try {
    const { customerId } = req.query;

    let filter = {};
    if (customerId) filter.customerId = customerId;

    const bookings = await Booking.find(filter)
      .populate("vehicleId")
      .sort({ startTime: -1 });

    res.status(200).json(
      bookings.map((b) => ({
        _id: b._id,
        fromPincode: b.fromPincode,
        toPincode: b.toPincode,
        startTime: b.startTime,
        endTime: b.endTime,
        customerId: b.customerId,
        vehicle: b.vehicleId
          ? {
              _id: b.vehicleId._id,
              name: b.vehicleId.name,
              capacityKg: b.vehicleId.capacityKg,
              tyres: b.vehicleId.tyres,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error("GET /api/bookings error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/bookings/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("DELETE /api/bookings/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
