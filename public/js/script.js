const socket = io();

let currentZoomLevel = 16; // Default zoom level
let lastLatitude = 0;
let lastLongitude = 0;
let mapCenter = [0, 0]; // Start with a global center

// Prompt user for their name
const userName = prompt("Enter your name:") || "Anonymous";

// Watch the user's position and send it to the server
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        socket.emit("send-location", { latitude, longitude, name: userName });
    }, (error) => {
        console.log(error);
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

// Initialize the map and set the initial view
const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "By Harshal Shelke"
}).addTo(map);

const markers = {}; // To store user markers

// Handle location updates from the server
socket.on("receive-location", (data) => {
    const { latitude, longitude, id, name } = data;

    // Check if the user is new to the map and show toast
    if (!markers[id]) {
        // Show a toast message for the new user
        Toastify({
            text: `${name} has joined the map!`,
            duration: 5000, // Duration in milliseconds
            gravity: "top", // Position: top or bottom
            position: "right", // Position: left, center, or right
            style: {
                background: "rgba(0, 0, 0, 0.8)", // Dark background with some transparency
                color: "#fff", // White text color for contrast
                borderRadius: "8px", // Rounded corners for modern look
                padding: "12px 24px", // Padding for better visual appearance
                fontSize: "16px", // Slightly larger text size for readability
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)", // Subtle shadow for depth
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Modern font family
                textAlign: "center", // Center align the text
                letterSpacing: "0.5px", // Slight letter spacing for better readability
            },
        }).showToast();
        
    }

    // Calculate distance between last position and new position (in km)
    let distance = 0;
    if (lastLatitude !== 0 && lastLongitude !== 0) {
        distance = getDistance(lastLatitude, lastLongitude, latitude, longitude);
    }

    // Adjust zoom level based on distance (max zoom 18, min zoom 10)
    currentZoomLevel = Math.max(10, Math.min(18, 16 - distance / 10));

    // Update map center only if necessary
    if (mapCenter[0] !== latitude || mapCenter[1] !== longitude) {
        map.flyTo([latitude, longitude], currentZoomLevel); // Smooth zoom transition
        mapCenter = [latitude, longitude]; // Update center
    }

    // Update or add markers
    if (markers[id]) {
        // Update existing marker position
        markers[id].setLatLng([latitude, longitude]);
        markers[id].bindPopup(name).openPopup();
    } else {
        // Add new marker with name as popup
        markers[id] = L.marker([latitude, longitude]).addTo(map);
        markers[id].bindPopup(name).openPopup();
    }

    // Update last known position
    lastLatitude = latitude;
    lastLongitude = longitude;
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
