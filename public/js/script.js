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

// Handle the event when the server sends all users' locations
socket.on("all-users", (allUsers) => {
    // Add markers for all users that the new user has not seen
    allUsers.forEach((data) => {
        const { latitude, longitude, id, name } = data;

        if (!markers[id]) {
            // Add new marker for the user
            markers[id] = L.marker([latitude, longitude]).addTo(map);
            markers[id].bindPopup(name).openPopup();
        } else {
            // If the marker already exists, update it
            markers[id].setLatLng([latitude, longitude]);
        }
    });

    // Update the user dropdowns to include all users
    updateUserDropdowns();
});

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

    // Update the user dropdowns when new location is received
    updateUserDropdowns();
});

// Handle user disconnection and remove their marker
socket.on("user-disconnect", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]); // Remove the marker
        delete markers[id]; // Delete the marker from the object
    }

    // Update dropdowns after user disconnects
    updateUserDropdowns();
});

// Control panel for distance calculation (initially hidden)
const controlPanel = document.createElement("div");
controlPanel.innerHTML = `
    <div style="position: absolute; top: 10px; left: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);">
        <h3 style="margin: 0 0 10px;">Distance Calculator</h3>
        <button id="togglePanel" style="width: 100%; padding: 5px; margin-bottom: 10px;">Choose Users</button>
        <div id="panelContent" style="display: none;">
            <select id="user1" style="margin-bottom: 5px; width: 100%; padding: 5px;"></select>
            <select id="user2" style="margin-bottom: 5px; width: 100%; padding: 5px;"></select>
            <select id="modeOfTransport" style="margin-bottom: 5px; width: 100%; padding: 5px;">
                <option value="driving-car">Car</option>
                <option value="cycling-regular">Bike</option>
                <option value="foot-walking">Foot</option>
            </select>
            <button id="calculateDistance" style="width: 100%; padding: 5px;">Calculate Distance</button>
            <p id="distanceResult" style="margin-top: 10px; font-size: 14px;"></p>
        </div>
    </div>
`;
document.body.appendChild(controlPanel);

// Toggle the control panel visibility when the button is clicked
document.getElementById("togglePanel").addEventListener("click", () => {
    const panelContent = document.getElementById("panelContent");
    panelContent.style.display = panelContent.style.display === "none" ? "block" : "none";
});

// Add Close Route button to the panel
const closeRouteButton = document.createElement("button");
closeRouteButton.textContent = "Close Route";
closeRouteButton.style.width = "100%";
closeRouteButton.style.padding = "5px";
closeRouteButton.style.marginTop = "10px";

// Append the button below the Calculate Distance button
document.getElementById("panelContent").appendChild(closeRouteButton);

// Event listener to remove the route
closeRouteButton.addEventListener("click", () => {
    if (routePolyline) {
        map.removeLayer(routePolyline); // Remove the route polyline from the map
        document.getElementById("distanceResult").textContent = "Route closed.";
    }
});


// Populate the dropdowns when new users join
function updateUserDropdowns() {
    const user1Select = document.getElementById("user1");
    const user2Select = document.getElementById("user2");

    // Clear existing options
    user1Select.innerHTML = "";
    user2Select.innerHTML = "";

    // Add options for each user
    Object.keys(markers).forEach((id) => {
        const option1 = document.createElement("option");
        const option2 = document.createElement("option");

        option1.value = id;
        option1.textContent = markers[id].getPopup().getContent();
        option2.value = id;
        option2.textContent = markers[id].getPopup().getContent();

        user1Select.appendChild(option1);
        user2Select.appendChild(option2);
    });
}

// Event listener for calculate button
document.getElementById("calculateDistance").addEventListener("click", () => {
    const user1Id = document.getElementById("user1").value;
    const user2Id = document.getElementById("user2").value;
    const modeOfTransport = document.getElementById("modeOfTransport").value;

    if (user1Id && user2Id && user1Id !== user2Id) {
        const user1Marker = markers[user1Id];
        const user2Marker = markers[user2Id];

        if (user1Marker && user2Marker) {
            const lat1 = user1Marker.getLatLng().lat;
            const lon1 = user1Marker.getLatLng().lng;
            const lat2 = user2Marker.getLatLng().lat;
            const lon2 = user2Marker.getLatLng().lng;

            // Call OpenRouteService API to calculate the selected mode's distance
            calculateDistance(lat1, lon1, lat2, lon2, modeOfTransport);
        }
    } else {
        document.getElementById("distanceResult").textContent = "Please select two different users.";
    }
});

// Function to calculate distance using OpenRouteService API
let routePolyline = null; // Variable to store the polyline

function calculateDistance(lat1, lon1, lat2, lon2, mode) {
    const apiKey = "5b3ce3597851110001cf62483380fc95712347738a075edc98f0bd5c"; // Replace with your API key
    const url = `https://api.openrouteservice.org/v2/directions/${mode}?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
        console.log(data);  // Log the response for debugging

        if (data.features && data.features[0] && data.features[0].geometry) {
            const routeCoordinates = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lon] for Leaflet

            // Remove any existing route polyline
            if (routePolyline) {
                map.removeLayer(routePolyline);
            }

            // Create and add the new route polyline
            routePolyline = L.polyline(routeCoordinates, { color: "blue" }).addTo(map);

            // Calculate and display the distance
            const distance = data.features[0].properties.segments[0].distance / 1000; // Distance in kilometers
            document.getElementById("distanceResult").textContent = `Distance: ${distance.toFixed(2)} km`;
        } else {
            document.getElementById("distanceResult").textContent = "Unable to calculate distance.";
        }
    })
    .catch(error => {
        console.error("Error calculating distance:", error);
        document.getElementById("distanceResult").textContent = "Error calculating distance.";
    });
}
