const express = require('express');
const cors = require('cors');

const vehiclesRouter = require('./routes/vehicles');
const bookingsRouter = require('./routes/bookings');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/', (req, res) => res.send('FleetLink API'));

module.exports = app;
