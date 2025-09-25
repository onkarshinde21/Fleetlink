// server.js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app'); 


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fleetlink'; 


async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to MongoDB');

    // Start
    app.listen(PORT, () => {
      console.log(` Server is running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error(' MongoDB connection error:', err);
    process.exit(1); 
  }
}


startServer();


process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
