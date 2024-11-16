const socket = io();

let currentZoomLevel = 16; // Default zoom level
let lastLatitude = 0;
let lastLongitude = 0;

// Prompt user for their name
const userName = prompt("Enter your name:") || "Anonymous";

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

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "By Harshal Shelke"
}).addTo(map);

const markers = {};

socket.on("receive-location", (data) => {
    const { latitude, longitude, id, name } = data;

    // Calculate distance between last position and new position (in km)
    if (lastLatitude !== 0 && lastLongitude !== 0) {
        const distance = getDistance(lastLatitude, lastLongitude, latitude, longitude);
        // Adjust zoom level based on distance
        currentZoomLevel = Math.max(10, Math.min(18, 16 - distance / 10)); // Example scaling
    }

    map.flyTo([latitude, longitude], currentZoomLevel); // Smooth zoom transition

    if (markers[id]) {
        // Update marker position
        markers[id].setLatLng([latitude, longitude]);
        markers[id].bindPopup(name).openPopup(); // Update popup with name
    } else {
        // Create a new marker with a popup displaying the name
        markers[id] = L.marker([latitude, longitude]).addTo(map);
        markers[id].bindPopup(name).openPopup();
    }

    lastLatitude = latitude;
    lastLongitude = longitude;
});

// Simple function to calculate distance in km using Haversine formula
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

socket.on("user-disconnect", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});
