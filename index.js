import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.emit('messages', [...activeUsers.values()]);

  socket.on('join', (username) => {

    const existingUser = [...activeUsers.values()].find((user) => user === username);
    if (existingUser) {
   
      socket.emit('error', 'Username already taken');
      return;
    }

    activeUsers.set(socket.id, username);
    io.emit('activeUsers', [...activeUsers.values()]);
  });

  socket.on('message', (data) => {
    const { file, caption, sender } = data;
    console.log('Received message:', { file, caption, sender });
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    const username = activeUsers.get(socket.id);
    activeUsers.delete(socket.id);
    io.emit('activeUsers', [...activeUsers.values()]);
    console.log(`${username} left the chat room`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
