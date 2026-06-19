const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

let activeUsers = {};
let recentVisitors = [];

io.on('connection', async (socket) => {
    const ua = socket.handshake.headers['user-agent'] || '';
    let device = "Desktop PC";
    if (/android/i.test(ua)) device = "Android Phone";
    else if (/iPhone|iPad|iPod/i.test(ua)) device = "iPhone/iOS";
    else if (/Windows/i.test(ua)) device = "Windows PC";
    else if (/Macintosh/i.test(ua)) device = "MacBook";

    let country = socket.handshake.headers['x-viewer-country'] || "Philippines"; 
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userData = {
        id: socket.id,
        device: device,
        country: country,
        time: timeString
    };

    activeUsers[socket.id] = userData;

    recentVisitors.unshift({ ...userData, disconnected: false });
    if (recentVisitors.length > 30) { 
        recentVisitors.pop();
    }

    io.emit('updateUsers', {
        active: Object.values(activeUsers),
        recent: recentVisitors
    });

    socket.on('disconnect', () => {
        delete activeUsers[socket.id];
        
        recentVisitors = recentVisitors.map(user => {
            if (user.id === socket.id) {
                return { ...user, disconnected: true };
            }
            return user;
        });

        io.emit('updateUsers', {
            active: Object.values(activeUsers),
            recent: recentVisitors
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Live Server running on port ${PORT}`);
});