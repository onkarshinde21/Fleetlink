const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  app = require('../app'); 
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});


const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

test('POST /api/vehicles -> create vehicle', async () => {
  const res = await request(app)
    .post('/api/vehicles')
    .send({ name: 'Test Truck', capacityKg: 1000, tyres: 6 });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Test Truck');
});

test('Booking conflict is prevented', async () => {
  const vRes = await request(app).post('/api/vehicles')
    .send({ name: 'Truck A', capacityKg: 500, tyres: 4 });
  const vehicleId = vRes.body._id;
  const startTime = new Date().toISOString();

  
  const b1 = await request(app).post('/api/bookings').send({
    vehicleId,
    fromPincode: '100001',
    toPincode: '100005',
    startTime,
    customerId: 'cust1'
  });
  expect(b1.status).toBe(201);

  
  const b2 = await request(app).post('/api/bookings').send({
    vehicleId,
    fromPincode: '100001',
    toPincode: '100005',
    startTime,
    customerId: 'cust2'
  });
  expect(b2.status).toBe(409);
});
