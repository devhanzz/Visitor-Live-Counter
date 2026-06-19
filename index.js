const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

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

    if (/android/i.test(ua)) {
        device = "Android Phone";
        if (/samsung|sm-|gt-|sch-/i.test(ua)) device = "Samsung Phone";
        else if (/redmi|xiaomi|poco|m20|m21|2201|2312/i.test(ua)) device = "Xiaomi/Redmi/Poco";
        else if (/oppo|cph|pcfm|phtm|pbgm|pact/i.test(ua)) device = "Oppo Phone";
        else if (/vivo|v20|v21|v22|v23|v19|v18|iqq/i.test(ua)) device = "Vivo Phone";
        else if (/realme|rmx[0-9]/i.test(ua)) device = "Realme Phone";
        else if (/huawei|eml-|jny-|vog-|pot-|ala-/i.test(ua)) device = "Huawei Phone";
        else if (/infinix|x6[0-9]|x67/i.test(ua)) device = "Infinix Phone";
        else if (/tecno|kg5|ki5|kf6|kh6|le7/i.test(ua)) device = "Tecno Phone";
        else if (/oneplus|one plus|nord|be2|iv2/i.test(ua)) device = "OnePlus Phone";
        else if (/google|pixel/i.test(ua)) device = "Google Pixel";
        else if (/sony|xperia|so-[0-9]/i.test(ua)) device = "Sony Xperia";
        else if (/asus|zenfone|rog phone/i.test(ua)) device = "Asus Phone/ROG";
        else if (/lenovo|legion/i.test(ua)) device = "Lenovo Phone";
        else if (/motorola|moto /i.test(ua)) device = "Motorola Phone";
        else if (/htc|desire/i.test(ua)) device = "HTC Phone";
        else if (/nokia/i.test(ua)) device = "Nokia Android";
        else if (/blackshark|shark /i.test(ua)) device = "Black Shark Phone";
        else if (/itel/i.test(ua)) device = "Itel Phone";
    } 
    else if (/iPhone/i.test(ua)) {
        device = "iPhone";
    }
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Windows/i.test(ua)) device = "Windows PC";
    else if (/Macintosh/i.test(ua)) device = "MacBook";
    else if (/linux/i.test(ua)) device = "Linux PC";

    let ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress || '';
    if (ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }

    let country = "Philippines";
    try {
        if (ip && ip !== '::1' && ip !== '127.0.0.1') {
            const response = await axios.get(`http://ip-api.com/json/${ip}?fields=country`);
            if (response.data && response.data.country) {
                country = response.data.country;
            }
        }
    } catch (error) {
        country = "Philippines";
    }

    socket.on('initUser', (data) => {
        const userTime = data.localTime || "00:00 AM";
        const userDate = data.localDate || "";

        const userData = {
            id: socket.id,
            device: device,
            country: country,
            time: userTime,
            date: userDate
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
    });

    socket.on('disconnect', () => {
        if (activeUsers[socket.id]) {
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
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Live Server running on port ${PORT}`);
});