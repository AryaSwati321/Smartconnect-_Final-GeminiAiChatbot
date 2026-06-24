// test-vendor.js (minimal)
const { io } = require('socket.io-client');

const BACKEND = 'http://localhost:5000';
const providerId = 'PUT_PROVIDER_ID_HERE'; // still useful if you want provider-specific emits

const socket = io(BACKEND, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('connected', socket.id);
  // join provider room (so notifications for provider specifically arrive)
  socket.emit('joinProvider', { providerId });
  // DO NOT join category; vendor will still receive global openRequests emitted to 'openRequests'
  console.log(`Joined provider ${providerId}. Listening to 'openRequests' room.`);
});
