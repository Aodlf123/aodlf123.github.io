const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('./'));

let serverStartTime = Date.now();

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('get_server_time', (callback) => {
    callback(Date.now() - serverStartTime);
  });

  socket.on('audio_data', (data) => {
    socket.broadcast.emit('receive_audio', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));