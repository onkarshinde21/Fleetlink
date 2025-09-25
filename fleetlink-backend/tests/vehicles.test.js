const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const express = require("express");

const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const vehicleRoutes = require("../routes/vehicles");

let app, mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use("/api/vehicles", vehicleRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Vehicle.deleteMany();
  await Booking.deleteMany();
});

describe("POST /api/vehicles", () => {
  it("should create a vehicle successfully", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .send({ name: "Truck A", capacityKg: 500, tyres: 6 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Truck A");
    expect(res.body.capacityKg).toBe(500);
  });

  it("should fail with invalid input", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .send({ name: "Bad Truck", tyres: "six" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/vehicles/available", () => {
  it("should return available vehicles", async () => {
    const vehicle = await Vehicle.create({ name: "Truck B", capacityKg: 800, tyres: 8 });

    const res = await request(app)
      .get("/api/vehicles/available")
      .query({
        capacityRequired: 500,
        fromPincode: "100001",
        toPincode: "100010",
        startTime: new Date().toISOString()
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].vehicle.name).toBe("Truck B");
  });

  it("should exclude vehicles with overlapping bookings", async () => {
    const vehicle = await Vehicle.create({ name: "Truck C", capacityKg: 600, tyres: 6 });
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    await Booking.create({
      vehicleId: vehicle._id,
      fromPincode: "200001",
      toPincode: "200010",
      startTime,
      endTime,
      customerId: "cust123"
    });

    const res = await request(app)
      .get("/api/vehicles/available")
      .query({
        capacityRequired: 500,
        fromPincode: "200001",
        toPincode: "200010",
        startTime: startTime.toISOString()
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it("should handle invalid input", async () => {
    const res = await request(app)
      .get("/api/vehicles/available")
      .query({
        capacityRequired: "not-a-number",
        fromPincode: "abc",
        toPincode: "100010",
        startTime: "invalid-date"
      });

    expect(res.status).toBe(400);
  });
});
