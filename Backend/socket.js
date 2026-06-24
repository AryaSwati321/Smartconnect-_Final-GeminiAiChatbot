module.exports = function initSocket(io) {
  io.on('connection', socket => {
    console.log('socket connected', socket.id);

    socket.on('joinProvider', ({ providerId }) => {
      if (!providerId) return;
      socket.join(providerId.toString());
      console.log(`socket ${socket.id} joined provider room ${providerId}`);
    });

    socket.on('joinCategory', ({ categoryId }) => {
      if (!categoryId) return;
      const room = `category:${categoryId}`;
      socket.join(room);
      console.log(`socket ${socket.id} joined category room ${room}`);
    });

    socket.on('joinUser', ({ userId }) => {
      if (!userId) return;
      socket.join(userId.toString());
      console.log(`socket ${socket.id} joined user room ${userId}`);
    });

    socket.on('joinBookingRoom', ({ bookingId }) => {
      if (!bookingId) return;
      socket.join(`booking:${bookingId}`);
      console.log(`socket ${socket.id} joined booking room booking:${bookingId}`);
    });

    socket.on('joinBooking', ({ bookingId }) => {
      if (!bookingId) return;
      socket.join(`booking:${bookingId}`);
      console.log(`socket ${socket.id} joined booking room booking:${bookingId}`);
    });

    // provider sends live location updates
    socket.on('providerLocation', ({ bookingId, providerId, lng, lat }) => {
      // broadcast to booking room
      io.to(`booking:${bookingId}`).emit('providerLocationUpdate', { bookingId, providerId, lng, lat, at: new Date() });
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
};
