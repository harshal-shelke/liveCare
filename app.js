const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();


const server = http.createServer(app);
const io = socketio(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));


let users = {}; // Store users' locations and IDs

io.on('connection', (socket) => {

    // When a user sends their location, save it on the server
    socket.on('send-location', (data) => {
        users[socket.id] = data; // Save the user's location
        // Broadcast the location to all connected users
        io.emit('receive-location', { ...data, id: socket.id });
    });

    // Send the current locations of all users to the newly connected user
    socket.emit('all-users', Object.values(users));

    // Handle disconnection and remove the user from the list
    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user-disconnect', socket.id); // Notify all users about the disconnection
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

