const socket = io();

let currentZoomLevel = 16; // Default zoom level
let isLocationSet = false; // Flag to track if the initial location has been set

// Prompt user for their name
const userName = prompt("Enter your name:") || "Anonymous";

// Initialize the map and set the initial view
const map = L.map("map", {
    center: [0, 0], // Initial center (global center until user's first location)
    zoom: currentZoomLevel, // Fixed zoom level
    maxZoom: 18, // Max zoom level
});

// Tile layer for the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "By Harshal Shelke"
}).addTo(map);

const markers = {}; // To store user markers

// Watch the user's position and send it to the server
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;

        // Only set the map center the first time location is received
        if (!isLocationSet) {
            map.setView([latitude, longitude], currentZoomLevel); // Set initial center
            isLocationSet = true; // Mark that location has been set
        }

        // Send the user's location to the server
        socket.emit("send-location", { latitude, longitude, name: userName });
    }, (error) => {
        console.log(error);
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

// Handle location updates from the server (other users' locations)
socket.on("receive-location", (data) => {
    const { latitude, longitude, id, name } = data;

    // Check if the user is new to the map and show toast
    if (!markers[id]) {
        // Show a toast message for the new user
        Toastify({
            text: `${name} has joined the map!`,
            duration: 5000,
            gravity: "top",
            position: "right",
            style: {
                background: "rgba(0, 0, 0, 0.8)",
                color: "#fff",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "16px",
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                textAlign: "center",
                letterSpacing: "0.5px",
            },
        }).showToast();
    }

    // Update or add markers without changing zoom or map center
    if (markers[id]) {
        // Update existing marker position
        markers[id].setLatLng([latitude, longitude]);
        markers[id].bindPopup(name).openPopup();
    } else {
        // Add new marker with name as popup
        markers[id] = L.marker([latitude, longitude]).addTo(map);
        markers[id].bindPopup(name).openPopup();
    }
});

// Simple function to calculate distance in km using the Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Handle user disconnection and remove their marker
socket.on("user-disconnect", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]); // Remove the marker
        delete markers[id]; // Delete the marker from the object
    }
});
