const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥');
  console.log('Error name:', err.name);
  console.log('Error message:', err.message);

  console.log('💥 Critical error - shutting down server...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
const opcuaService = require('./services/opcuaService');
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, async () => {
  console.log(`App running on port ${port}...`);

  // Initialize OPC UA Service
  console.log('Initializing OPC UA Service...');
  const opcInitialized = await opcuaService.initialize();
  if (opcInitialized) {
    console.log('✅ OPC UA Service ready');
  } else {
    console.log('❌ OPC UA Service failed to initialize');
  }
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    // Shutdown OPC UA Service
    opcuaService.shutdown().then(() => {
      process.exit(1);
    });
  });
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    opcuaService.shutdown().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});
// Trigger restart
