const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥');
  console.log('Error name:', err.name);
  console.log('Error message:', err.message);

  // Handle MQTT connection errors gracefully - don't shutdown server
  if (
    err.code === 'ECONNREFUSED' &&
    err.message &&
    err.message.includes('1883')
  ) {
    console.log(
      '⚠️ MQTT broker connection failed - server continuing in offline mode',
    );
    console.log(
      '🔄 Backend will operate with mock data until MQTT broker is available',
    );
    return; // Don't shutdown the server
  }

  // For other critical exceptions, shutdown the server
  console.log('💥 Critical error - shutting down server...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Store io instance globally for use in other modules
global.io = io;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
