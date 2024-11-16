const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

io.on("connection", (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on("send-location", (data) => {
        // console.log(`Location received from ${socket.id}:`, data);
        io.emit("receive-location", { id: socket.id, ...data });
    });

    socket.on("disconnect", () => {
        // console.log(`User disconnected: ${socket.id}`);
        io.emit("user-disconnect", socket.id);
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

