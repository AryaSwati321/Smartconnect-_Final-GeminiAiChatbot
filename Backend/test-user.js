// test-user.js
const { io } = require('socket.io-client');

const BACKEND = 'http://localhost:5000';
const userId = 'PUT_USER_ID_HERE'; // <--- replace

const socket = io(BACKEND, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('joinUser', { userId });
  console.log(`Joined user room ${userId}`);
});

socket.on('bookingAccepted', data => {
  console.log('bookingAccepted', JSON.stringify(data, null, 2));
});

socket.on('providerLocationUpdate', loc => {
  console.log('providerLocationUpdate', loc);
});

socket.on('disconnect', () => console.log('socket disconnected'));
