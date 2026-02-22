const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const signalsRouter = require('./routes/signals');
const eventsRouter = require('./routes/events');
const offlineRouter = require('./routes/offline');

// Initialize App
const app = express();
const server = http.createServer(app);

// Redis setup for scaling
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};
const pubClient = new Redis(redisOptions);
const subClient = pubClient.duplicate();

const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all for PoC
        methods: ['GET', 'POST']
    }
});

// Horizontal synchronization
io.adapter(createAdapter(pubClient, subClient));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/signal', signalsRouter);
app.use('/api/offline-signal', offlineRouter);
app.use('/api/events', eventsRouter);

app.get('/', (req, res) => {
    res.send('SignalNet Backend is Running');
});

// System Status Monitoring (Offline Mode Logic)
// Initialize 
app.locals.lastOnlineSignalTime = Date.now();
let isOfflineMode = false;

// Check status every 5 seconds
setInterval(() => {
    // Threshold: 1 hour (3600000ms) to avoid reverting to offline too quickly during demo
    const threshold = 3600000;
    const timeSinceLastSignal = Date.now() - app.locals.lastOnlineSignalTime;

    const newMode = timeSinceLastSignal > threshold;

    if (newMode !== isOfflineMode) {
        isOfflineMode = newMode;
        console.log(`System Mode Change: ${isOfflineMode ? 'OFFLINE MODE' : 'ONLINE MODE'}`);
        io.emit('systemStatus', { offlineMode: isOfflineMode });
    }
}, 5000);

// Update timestamp on online signal - attach to specific route middleware logic handled in signals.js ideally, 
// but easier to intercept here if we wrap the route or just let signals.js update app.locals?
// Let's add a global middleware for /api/signal
app.use('/api/signal', (req, res, next) => {
    app.locals.lastOnlineSignalTime = Date.now();
    if (isOfflineMode) {
        isOfflineMode = false;
        io.emit('systemStatus', { offlineMode: false });
        console.log('System Mode Change: ONLINE MODE');
    }
    next();
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');
    // Send current status immediately
    socket.emit('systemStatus', { offlineMode: isOfflineMode });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io available to routes
app.set('io', io);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
