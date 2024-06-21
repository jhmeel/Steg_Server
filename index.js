import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const activeUsers = new Map();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.send({ fileUrl });
});

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
