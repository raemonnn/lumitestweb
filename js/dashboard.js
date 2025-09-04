// Add this at the top of your file, after your other declarations
const EMAILJS_PUBLIC_KEY = 'BVrGFgKc_hTr1RAuP';
const EMAILJS_SERVICE_ID = 'service_ceu00nu';
const EMAILJS_TEMPLATE_ID = 'template_db0luo8';

const EMAILJS_TEMPLATE_EMAIL_CHANGE_ID = 'template_h3l9zgq';

// Add this to track your listeners
const activeListeners = {
    notifications: null,
    requests: null
};

// Add your AccuWeather API key here
const ACCUWEATHER_API_KEY = 'CF1pRBTbcQz9liDORwAW694Xlk38Z9PK';

const IS_PRODUCTION = window.location.hostname.includes('github.io');
const BASE_URL = IS_PRODUCTION ? 
    'https://raemonnn.github.io/lumitestweb' : 
    window.location.origin;

// DOM Elements
let sidebar, mobileMenuBtn, notificationBell, fileUploadForm;

// Current user data
let currentUser = null;
let familyMembers = [];

// Initialize dashboard
function initDashboard() {
    console.log("Initializing dashboard...");
    
    // Get DOM elements
    sidebar = document.querySelector('.sidebar');
    mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    notificationBell = document.querySelector('.notification-bell');
    fileUploadForm = document.querySelector('#file-upload-form');
    
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("User authenticated:", user.uid);
            
            loadUserData();
            loadFamilyMembers();
            setupWeatherLocation(); // Changed from loadWeather()
            updateDateTime();
            debugTour();
            debugNotifications();
            resetTourForNewUser();
            setupRequestStatusListener();
            
            // Setup event listeners
            setupEventListeners();
            
            // Setup notification system
            setupNotificationSystem();
            
            // Enhance functions with notifications
            enhanceExistingFunctionsWithNotifications();
            
            // Start welcome tour for new users
            startWelcomeTour();

            // File deletion handler
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-file')) {
                    const fileId = e.target.closest('.delete-file').dataset.id;
                    deleteFile(fileId);
                }
            });

            // Load files if customization tab is active
            const activeTab = document.querySelector('.tab-pane.active');
            if (activeTab && activeTab.id === 'customization') {
                loadUploadedFiles();
            }
            
            // Load uploaded files when customization tab is shown
            const customizationTab = document.querySelector('[href="#customization"]');
            if (customizationTab) {
                customizationTab.addEventListener('click', function(e) {
                    // Only handle clicks that will actually show the tab
                    if (!this.classList.contains('active')) {
                        console.log("Customization tab clicked, loading files...");
                        // Small timeout to ensure tab is visible before loading
                        setTimeout(() => {
                            loadUploadedFiles();
                        }, 100);
                    }
                });
    
                // Also load when tab is shown via Bootstrap
                document.getElementById('customization').addEventListener('shown.bs.tab', function() {
                    console.log("Customization tab shown, loading files...");
                    loadUploadedFiles();
                });
            }
            
            // Send welcome notification (only if this is a new session)
            const welcomeShown = localStorage.getItem('welcomeShown');
            if (!welcomeShown) {
                createNotification(
                    'Welcome to Lumiverse!',
                    `Hello ${user.displayName || 'there'}, welcome to your smart home dashboard. Manage your family and home automation from here.`
                );
                localStorage.setItem('welcomeShown', 'true');
            }
            
        } else {
            console.log("No user, redirecting to login");
            window.location.href = 'login.html';
        }
    });
}

function debugTour() {
    console.log("=== TOUR DEBUG ===");
    console.log("hasSeenTour in localStorage:", localStorage.getItem('hasSeenTour'));
    console.log("welcomeShown in localStorage:", localStorage.getItem('welcomeShown'));
    console.log("Current user:", currentUser ? currentUser.uid : "No user");
}

// Add debug function for notifications
function debugNotifications() {
    console.log("=== NOTIFICATIONS DEBUG ===");
    if (!currentUser) {
        console.log("No current user");
        return;
    }
    
    database.ref('notifications/' + currentUser.uid).once('value')
        .then((snapshot) => {
            console.log("Total notifications:", snapshot.numChildren());
            snapshot.forEach((childSnapshot) => {
                console.log("Notification:", childSnapshot.key, childSnapshot.val());
            });
        });
}

function resetTourForNewUser() {
    // Check if this is a new user (no user data in database yet)
    database.ref('users/' + currentUser.uid).once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                // This is a new user, clear any existing tour data
                console.log("New user detected, clearing tour data");
                localStorage.removeItem('hasSeenTour');
                localStorage.removeItem('welcomeShown');
            }
        });
}

// Add this function to handle emergency contact updates
function handleEmergencyContactUpdate() {
    const policeContact = document.querySelector('#police-contact').value;
    const fireContact = document.querySelector('#fire-contact').value;
    const ambulanceContact = document.querySelector('#ambulance-contact').value;

    // Validate inputs
    if (!policeContact && !fireContact && !ambulanceContact) {
        showToast('Error', 'Please add at least one emergency contact', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.querySelector('#save-emergency-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;

    // Prepare emergency data - matches your Firebase structure
    const emergencyData = {
        police: policeContact || '',
        fire: fireContact || '',
        ambulance: ambulanceContact || '',
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        updatedBy: currentUser.uid
    };

    // Save to database - this matches your existing structure
    database.ref('emergencyContacts/' + currentUser.uid).set(emergencyData)
        .then(() => {
            showToast('Success', 'Emergency contacts updated successfully', 'success');
            
            // Update dashboard with emergency numbers
            updateDashboardEmergencyNumbers(emergencyData);
            
            // Create notification
            createNotification(
                'Emergency Contacts Updated',
                'Your emergency contacts have been successfully updated.'
            );
        })
        .catch(error => {
            console.error("Error updating emergency contacts:", error);
            showToast('Error', 'Failed to update emergency contacts: ' + error.message, 'error');
        })
        .finally(() => {
            // Restore button state
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        });
}

// Update dashboard with emergency numbers
function updateDashboardEmergencyNumbers(emergencyData) {
    const emergencyNumbersContainer = document.querySelector('.emergency-numbers');
    
    if (!emergencyNumbersContainer) return;
    
    let html = '';
    
    if (emergencyData.police) {
        html += `
            <div class="emergency-number-item">
                <div class="emergency-icon police">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <div class="emergency-info">
                    <div class="emergency-type">Police</div>
                    <div class="emergency-number">${emergencyData.police}</div>
                </div>
            </div>
        `;
    }
    
    if (emergencyData.fire) {
        html += `
            <div class="emergency-number-item">
                <div class="emergency-icon fire">
                    <i class="fas fa-fire-extinguisher"></i>
                </div>
                <div class="emergency-info">
                    <div class="emergency-type">Fire Department</div>
                    <div class="emergency-number">${emergencyData.fire}</div>
                </div>
            </div>
        `;
    }
    
    if (emergencyData.ambulance) {
        html += `
            <div class="emergency-number-item">
                <div class="emergency-icon ambulance">
                    <i class="fas fa-ambulance"></i>
                </div>
                <div class="emergency-info">
                    <div class="emergency-type">Ambulance</div>
                    <div class="emergency-number">${emergencyData.ambulance}</div>
                </div>
            </div>
        `;
    }
    
    // Show note if it exists
    if (emergencyData.note) {
        html += `
            <div class="emergency-note mt-3 p-2 bg-dark border border-secondary rounded">
                <small class="text-muted"><strong>Note:</strong> ${emergencyData.note}</small>
            </div>
        `;
    }
    
    if (html === '') {
        html = '<p class="text-muted">No emergency numbers added yet</p>';
    }
    
    emergencyNumbersContainer.innerHTML = html;
}

// Load emergency contacts
function loadEmergencyContacts() {
    database.ref('emergencyContacts/' + currentUser.uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const contacts = snapshot.val();
                
                // Set form values (handle missing fields gracefully)
                document.querySelector('#police-contact').value = contacts.police || '';
                document.querySelector('#fire-contact').value = contacts.fire || '';
                document.querySelector('#ambulance-contact').value = contacts.ambulance || '';
                
                // Update dashboard with emergency numbers - THIS WAS MISSING
                updateDashboardEmergencyNumbers(contacts);
            }
        })
        .catch(error => {
            console.error("Error loading emergency contacts:", error);
        });
}

// Weather location functions
function setupWeatherLocation() {
    // Check if user has already made a location decision
    const locationDecision = localStorage.getItem('weatherLocationDecision');
    
    if (!locationDecision) {
        // Show location permission modal
        showLocationPermissionModal();
    } else if (locationDecision === 'granted') {
        // User previously granted permission, get their location
        getCurrentLocation();
    } else {
        // User previously denied permission, use default location
        loadWeatherWithLocation('Manila', 14.5995, 120.9842); // Manila coordinates
    }
}

function showLocationPermissionModal() {
    const modalHTML = `
        <div class="modal fade" id="locationModal" tabindex="-1" aria-labelledby="locationModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title" id="locationModalLabel">
                            <i class="fas fa-location-dot me-2"></i>Weather Location Access
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>To provide accurate weather information, we need access to your location.</p>
                        <p>You can also search for weather in any location if you prefer not to share your location.</p>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="deny-location">
                            Deny Access
                        </button>
                        <button type="button" class="btn btn-primary" id="allow-location">
                            Allow Access
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to DOM if it doesn't exist
    if (!document.getElementById('locationModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        document.getElementById('allow-location').addEventListener('click', function() {
            localStorage.setItem('weatherLocationDecision', 'granted');
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            modal.hide();
            getCurrentLocation();
        });
        
        document.getElementById('deny-location').addEventListener('click', function() {
            localStorage.setItem('weatherLocationDecision', 'denied');
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            modal.hide();
            loadWeatherWithLocation('Manila'); // Default location
        });
    }
    
    // Show the modal
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    locationModal.show();
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Error', 'Geolocation is not supported by your browser', 'error');
        loadWeatherWithLocation('Manila', 14.5995, 120.9842);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            // Get location name and weather data from AccuWeather
            getAccuWeatherLocation(latitude, longitude)
                .then(locationData => {
                    const locationName = locationData.LocalizedName;
                    const locationKey = locationData.Key;
                    loadWeatherWithLocation(locationName, latitude, longitude, locationKey);
                })
                .catch(error => {
                    console.error("Error getting AccuWeather location:", error);
                    // Fallback to OpenStreetMap if AccuWeather fails
                    getLocationName(latitude, longitude)
                        .then(locationName => {
                            loadWeatherWithLocation(locationName, latitude, longitude);
                        })
                        .catch(error => {
                            console.error("Error getting location name:", error);
                            loadWeatherWithLocation(`${latitude},${longitude}`, latitude, longitude);
                        });
                });
        },
        error => {
            console.error("Error getting location:", error);
            showToast('Info', 'Using default location. You can search for any location.', 'info');
            loadWeatherWithLocation('Manila', 14.5995, 120.9842);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Get location data from AccuWeather API
function getAccuWeatherLocation(latitude, longitude) {
    return fetch(`https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&language=en-us&details=false&toplevel=false`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`AccuWeather API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.LocalizedName) {
                return data;
            }
            throw new Error('No location data found');
        });
}

// Get weather data from AccuWeather API
function getAccuWeatherData(locationKey) {
    return fetch(`https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`AccuWeather API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                return data[0];
            }
            throw new Error('No weather data found');
        });
}


// Get location name from coordinates (fallback using OpenStreetMap)
function getLocationName(latitude, longitude) {
    return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                // Try to get a more readable location name
                if (data.address) {
                    if (data.address.city) return data.address.city;
                    if (data.address.town) return data.address.town;
                    if (data.address.village) return data.address.village;
                    if (data.address.municipality) return data.address.municipality;
                }
                return data.display_name.split(',')[0]; // Return the first part of the address
            }
            return `${latitude},${longitude}`;
        });
}

function loadWeatherWithLocation(locationName, latitude = null, longitude = null, locationKey = null) {
    // Show loading state
    const weatherWidget = document.querySelector('.weather-widget');
    if (weatherWidget) {
        weatherWidget.innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-1 small">Loading weather...</div>
            </div>
        `;
    }
    
    // Store location data
    if (latitude && longitude) {
        if (weatherWidget) {
            weatherWidget.dataset.lat = latitude;
            weatherWidget.dataset.lon = longitude;
            weatherWidget.dataset.locationName = locationName;
            if (locationKey) {
                weatherWidget.dataset.locationKey = locationKey;
            }
        }
    }
    
    // Get weather data if we have a location key
    if (locationKey) {
        getAccuWeatherData(locationKey)
            .then(weatherData => {
                updateWeatherWidget(locationName, weatherData);
            })
            .catch(error => {
                console.error("Error getting weather data:", error);
                // Fallback to static weather display
                updateWeatherWidget(locationName, null);
            });
    } else {
        // No location key, just show the location name
        updateWeatherWidget(locationName, null);
    }
    
    // Set up search functionality
    setupWeatherSearch(locationName);
}

function updateWeatherWidget(locationName, weatherData) {
    const weatherWidget = document.querySelector('.weather-widget');
    if (!weatherWidget) return;
    
    if (weatherData) {
        // We have real weather data from AccuWeather
        const temperature = weatherData.Temperature.Metric.Value;
        const weatherText = weatherData.WeatherText;
        const weatherIcon = getWeatherIcon(weatherData.WeatherIcon);
        
        weatherWidget.innerHTML = `
            <div class="weather-icon">${weatherIcon}</div>
            <div>
                <div class="weather-temp">${temperature}°C</div>
                <div class="weather-details">${weatherText} • ${locationName}</div>
            </div>
        `;
    } else {
        // No weather data, just show location
        weatherWidget.innerHTML = `
            <div class="weather-icon">⛅</div>
            <div>
                <div class="weather-temp">--°C</div>
                <div class="weather-details">${locationName}</div>
            </div>
        `;
    }
}

// Map AccuWeather icon numbers to emojis
function getWeatherIcon(iconNumber) {
    const iconMap = {
        1: '☀️',  // Sunny
        2: '🌤️',  // Mostly Sunny
        3: '🌤️',  // Partly Sunny
        4: '🌤️',  // Intermittent Clouds
        5: '🌤️',  // Hazy Sunshine
        6: '🌥️',  // Mostly Cloudy
        7: '☁️',  // Cloudy
        8: '☁️',  // Dreary
        11: '🌫️', // Fog
        12: '🌧️', // Showers
        13: '🌦️', // Mostly Cloudy w/ Showers
        14: '🌦️', // Partly Sunny w/ Showers
        15: '⛈️', // T-Storms
        16: '⛈️', // Mostly Cloudy w/ T-Storms
        17: '🌦️', // Partly Sunny w/ T-Storms
        18: '🌧️', // Rain
        19: '🌨️', // Flurries
        20: '🌨️', // Mostly Cloudy w/ Flurries
        21: '🌨️', // Partly Sunny w/ Flurries
        22: '❄️', // Snow
        23: '❄️', // Mostly Cloudy w/ Snow
        24: '🌨️', // Ice
        25: '🌨️', // Sleet
        26: '🌨️', // Freezing Rain
        29: '🌨️', // Rain and Snow
        30: '🔥', // Hot
        31: '🥶', // Cold
        32: '💨', // Windy
        33: '🌙', // Clear
        34: '🌙', // Mostly Clear
        35: '🌙', // Partly Cloudy
        36: '🌙', // Intermittent Clouds
        37: '🌫️', // Hazy Moonlight
        38: '🌙', // Mostly Cloudy
        39: '🌧️', // Partly Cloudy w/ Showers
        40: '🌧️', // Mostly Cloudy w/ Showers
        41: '⛈️', // Partly Cloudy w/ T-Storms
        42: '⛈️', // Mostly Cloudy w/ T-Storms
        43: '🌨️', // Mostly Cloudy w/ Flurries
        44: '🌨️'  // Mostly Cloudy w/ Snow
    };
    
    return iconMap[iconNumber] || '⛅';
}

function setupWeatherSearch(currentLocation) {
    const weatherSearchForm = document.querySelector('#weather-search-form');
    const weatherSearchInput = document.querySelector('#weather-search-input');
    
    if (weatherSearchForm && weatherSearchInput) {
        // Set current location as placeholder
        weatherSearchInput.placeholder = `e.g., ${currentLocation}`;
        
        weatherSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const searchQuery = weatherSearchInput.value.trim();
            if (searchQuery) {
                searchWeatherLocation(searchQuery);
            }
        });
    }
}

function searchWeatherLocation(query) {
    // Show loading state
    const weatherWidget = document.querySelector('.weather-widget');
    if (weatherWidget) {
        weatherWidget.innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="mt-1 small">Searching...</div>
            </div>
        `;
    }
    
    // Use AccuWeather API for location search
    fetch(`https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${ACCUWEATHER_API_KEY}&q=${encodeURIComponent(query)}&language=en-us&details=false`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`AccuWeather API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                const location = data[0];
                const locationName = location.LocalizedName;
                const locationKey = location.Key;
                const latitude = location.GeoPosition.Latitude;
                const longitude = location.GeoPosition.Longitude;
                
                loadWeatherWithLocation(locationName, latitude, longitude, locationKey);
                showToast('Success', `Weather location updated to ${locationName}`, 'success');
            } else {
                showToast('Error', 'Location not found. Please try another search.', 'error');
                // Reload previous weather
                const weatherWidget = document.querySelector('.weather-widget');
                if (weatherWidget.dataset.lat && weatherWidget.dataset.lon) {
                    const locationName = weatherWidget.dataset.locationName || 'Unknown Location';
                    const latitude = weatherWidget.dataset.lat;
                    const longitude = weatherWidget.dataset.lon;
                    const locationKey = weatherWidget.dataset.locationKey;
                    
                    loadWeatherWithLocation(locationName, latitude, longitude, locationKey);
                } else {
                    loadWeatherWithLocation('Manila', 14.5995, 120.9842);
                }
            }
        })
        .catch(error => {
            console.error("Error searching location:", error);
            showToast('Error', 'Failed to search location. Please try again.', 'error');
            
            // Fallback to OpenStreetMap search
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const latitude = data[0].lat;
                        const longitude = data[0].lon;
                        const locationName = data[0].display_name;
                        
                        loadWeatherWithLocation(locationName, latitude, longitude);
                        showToast('Success', `Weather location updated to ${locationName}`, 'success');
                    } else {
                        showToast('Error', 'Location not found. Please try another search.', 'error');
                    }
                })
                .catch(fallbackError => {
                    console.error("Fallback search also failed:", fallbackError);
                });
        });
}


// Load user data from database
function loadUserData() {
    database.ref('users/' + currentUser.uid).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            
            if (userData) {
                // Update UI with user data
                const userFullnameElement = document.querySelector('.user-fullname');
                const welcomeMessageElement = document.querySelector('.welcome-message');
                const avatarElement = document.querySelector('.user-avatar');
                
                if (userFullnameElement) userFullnameElement.textContent = userData.fullName;
                if (welcomeMessageElement) welcomeMessageElement.textContent = `Hello ${userData.fullName}, welcome to your family dashboard.`;
                
                // Set avatar initials
                if (avatarElement) {
                    const initials = userData.fullName.split(' ').map(name => name[0]).join('').toUpperCase();
                    avatarElement.textContent = initials.substring(0, 2);
                }
            }
            
            // Load emergency contacts after user data is loaded
            loadEmergencyContacts();
        })
        .catch(error => {
            console.error("Error loading user data:", error);
        });
}

// Load family members
function loadFamilyMembers() {
    database.ref('familyMembers/' + currentUser.uid).on('value', (snapshot) => {
        familyMembers = [];
        const membersContainer = document.querySelector('.family-members');
        const allMembersContainer = document.querySelector('.all-family-members');
        
        // Clear containers
        if (membersContainer) membersContainer.innerHTML = '';
        if (allMembersContainer) allMembersContainer.innerHTML = '';
        
        // Get data
        snapshot.forEach((childSnapshot) => {
            const member = childSnapshot.val();
            member.id = childSnapshot.key;
            familyMembers.push(member);
            
            // Create member element
            const memberElement = createMemberElement(member);
            
            // Add to appropriate container
            if (familyMembers.length <= 3 && membersContainer) {
                membersContainer.appendChild(memberElement.cloneNode(true));
            }
            
            if (allMembersContainer) {
                allMembersContainer.appendChild(memberElement);
            }
        });
        
        // Show empty state if no members
        if (snapshot.numChildren() === 0) {
            if (membersContainer) {
                membersContainer.innerHTML = '<p class="text-muted">No family members added yet.</p>';
            }
            if (allMembersContainer) {
                allMembersContainer.innerHTML = '<p class="text-muted">No family members added yet.</p>';
            }
        }
    });
}

// Create member element
// Create member element - FIXED to show only one status
function createMemberElement(member) {
    const memberElement = document.createElement('div');
    memberElement.className = 'family-member';
    
    // Get initials for avatar
    const initials = member.fullName.split(' ').map(name => name[0]).join('').toUpperCase();
    
    // Determine which status to show - prioritize email verification status
    let statusBadge = '';
    
    if (member.emailVerificationPending) {
        // Email change pending verification
        statusBadge = '<span class="badge bg-warning">Email Change Pending</span>';
    } else if (!member.emailVerified) {
        // Email not verified yet
        statusBadge = '<span class="badge bg-warning">Email Pending</span>';
    } else if (!member.verified) {
        // Member not verified (general status)
        statusBadge = '<span class="badge bg-warning">Pending</span>';
    } else {
        // Everything verified
        statusBadge = '<span class="badge bg-success">Verified</span>';
    }
    
    memberElement.innerHTML = `
        <div class="member-avatar">${initials.substring(0, 2)}</div>
        <div class="member-info">
            <div class="member-name">${member.fullName}</div>
            <div class="member-email">${member.email}</div>
            <div class="member-role">${member.role}</div>
            <div class="member-status">
                ${statusBadge}
            </div>
        </div>
        <div class="member-actions">
            <button class="btn btn-sm btn-outline-primary edit-member" data-id="${member.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-member" data-id="${member.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return memberElement;
}

// Add these missing functions
function deleteFamilyMember(memberId) {
    return database.ref('familyMembers/' + currentUser.uid + '/' + memberId).remove();
}

function updateFamilyMember(memberId, memberData) {
    return database.ref('familyMembers/' + currentUser.uid + '/' + memberId).update(memberData);
}

// Add new family member with password creation
function addFamilyMember(memberData) {
    console.log("Adding family member:", memberData);
    
    // Convert array to object for Firebase compatibility
    if (Array.isArray(memberData.access)) {
        const accessObj = {};
        memberData.access.forEach((item, index) => {
            accessObj[index] = item;
        });
        memberData.access = accessObj;
    }
    
    // Add the required fields including email verification status
    memberData.invitedBy = currentUser.uid;
    memberData.invitationSent = false;
    memberData.verified = false;
    memberData.emailVerified = false; // Add this line
    memberData.emailVerificationPending = true; // Add this line
    memberData.createdAt = firebase.database.ServerValue.TIMESTAMP;
    
    return database.ref('familyMembers/' + currentUser.uid).push(memberData)
        .then((result) => {
            const memberId = result.key;
            console.log("Member added with ID:", memberId);
            
            // Store password in a separate secure node
            if (memberData.password) {
                return database.ref('familyMemberPasswords/' + memberId).set({
                    password: memberData.password,
                    email: memberData.email,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    return { memberId, password: memberData.password };
                }).catch(error => {
                    console.error("Error storing password:", error);
                    throw new Error("Failed to store password: " + error.message);
                });
            }
            return { memberId };
        })
        .then(({ memberId, password }) => {
            // Send invitation email
            return sendInvitationEmail(memberData.email, memberData.fullName, memberId, password)
                .then(() => {
                    // Update the member record
                    return database.ref('familyMembers/' + currentUser.uid + '/' + memberId).update({
                        invitationSent: true,
                        invitationSentAt: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .catch((emailError) => {
                    console.warn("Email failed but member was added:", emailError);
                    showToast('Warning', 'Member added but email notification failed', 'warning');
                    // Still return success since member was added to database
                    return Promise.resolve();
                });
        })
        .catch(error => {
            console.error("Error in addFamilyMember:", error);
            throw error; // Re-throw the error to be caught by the caller
        });
}

// Email invitation function with password information
function sendInvitationEmail(email, name, memberId, password = null) {
    console.log("Sending NEW MEMBER invitation to:", email);
    
    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS is not loaded!');
        showToast('Error', 'Email service not available', 'error');
        return Promise.reject(new Error('EmailJS not loaded'));
    }
    
    // Validate email address
    if (!email || !validateEmail(email)) {
        console.error('Invalid email address:', email);
        showToast('Error', 'Invalid email address provided', 'error');
        return Promise.reject(new Error('Invalid email address'));
    }
    
    // Generate a verification token first
    const verificationToken = generateVerificationToken();
    
    // Store the verification token in the database
    return database.ref('emailVerifications/' + memberId).set({
        token: verificationToken,
        email: email,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        verified: false,
        userId: currentUser.uid,
        password: password
    }).then(() => {
        // Get inviter's name
        const inviterName = document.querySelector('.user-fullname').textContent;
        const inviterInitials = inviterName.split(' ').map(n => n[0]).join('').toUpperCase();
        
        // CORRECTED: Template parameters that match your HTML template EXACTLY
        const templateParams = {
            to_email: email, // For EmailJS routing
            to_name: name,
            from_name: inviterName,
            FamilyMemberName: name,
            InviterName: inviterName,
            InviterInitials: inviterInitials,
            VerificationLink: `${BASE_URL}/verify-email.html?token=${verificationToken}&member=${memberId}`, // Capital V!
            temporary_password: password || 'Please contact admin for password'
        };

        console.log("Sending NEW MEMBER email with template:", EMAILJS_TEMPLATE_ID);
        console.log("Template parameters:", templateParams);

        // Send email using EmailJS
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
            .then((response) => {
                console.log('Email sent successfully:', response);
                showToast('Invitation Sent', `An invitation has been sent to ${email}`, 'success');
                return Promise.resolve();
            })
            .catch((error) => {
                console.error('Failed to send email - full error:', error);
                console.error('Error status:', error.status);
                console.error('Error text:', error.text);
                
                let errorMessage = 'Failed to send invitation email';
                if (error.text) {
                    errorMessage += ': ' + error.text;
                } else if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                
                showToast('Error', errorMessage, 'error');
                throw error;
            });
    });
}

// Generate verification token
function generateVerificationToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Validate password strength
function validatePassword(password) {
    // At least 6 characters, 1 number, 1 uppercase letter
    const minLength = password.length >= 6;
    const hasNumber = /[0-9]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    
    return {
        isValid: minLength && hasNumber && hasUppercase,
        errors: {
            length: !minLength ? 'Password must be at least 6 characters' : null,
            number: !hasNumber ? 'Password must contain at least 1 number' : null,
            uppercase: !hasUppercase ? 'Password must contain at least 1 uppercase letter' : null
        }
    };
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show validation feedback
function showValidationFeedback(inputElement, isValid, message = '') {
    const feedbackElement = inputElement.nextElementSibling;
    
    if (isValid) {
        inputElement.classList.remove('is-invalid');
        inputElement.classList.add('is-valid');
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement.textContent = '';
        }
    } else {
        inputElement.classList.remove('is-valid');
        inputElement.classList.add('is-invalid');
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback') && message) {
            feedbackElement.textContent = message;
        }
    }
}

// Weather functions
function loadWeather() {
    // Your weather loading code here
    const weatherWidget = document.querySelector('.weather-widget');
    if (weatherWidget) {
        weatherWidget.innerHTML = `
            <div class="weather-icon">⛅</div>
            <div>
                <div class="weather-temp">24°C</div>
                <div class="weather-details">Partly Sunny • Manila</div>
            </div>
        `;
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString(undefined, options);
    const timeStr = now.toLocaleTimeString();
    
    const currentDateElement = document.querySelector('.current-date');
    const currentTimeElement = document.querySelector('.current-time');
    
    if (currentDateElement) currentDateElement.textContent = dateStr;
    if (currentTimeElement) currentTimeElement.textContent = timeStr;
    
    setTimeout(updateDateTime, 1000);
}

// Add this function to properly handle modal cleanup
function setupModalCleanup() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function() {
            // Force remove any lingering backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });
            
            // Remove modal-open class from body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    });
}

// Reset validation when edit modal is closed
const editMemberEmailInput = document.getElementById('edit-member-email');
if (editMemberEmailInput) {
    editMemberEmailInput.addEventListener('blur', function() {
        const isValid = validateEmail(this.value);
        showValidationFeedback(this, isValid, isValid ? '' : 'Please enter a valid email address');
    });
}

// Name validation for edit form
const editMemberNameInput = document.getElementById('edit-member-name');
if (editMemberNameInput) {
    editMemberNameInput.addEventListener('blur', function() {
        const isValid = this.value.trim().length > 0;
        showValidationFeedback(this, isValid, isValid ? '' : 'Please enter a name');
    });
}


// Setup event listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // File deletion handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-file')) {
            const fileId = e.target.closest('.delete-file').dataset.id;
            deleteFile(fileId);
        }
    });
        
    // Load uploaded files when customization tab is shown
    const customizationTab = document.querySelector('[href="#customization"]');
    if (customizationTab) {
        customizationTab.addEventListener('shown.bs.tab', function() {
            loadUploadedFiles();
        });
    }

    // Notification bell click
    if (notificationBell) {
        notificationBell.addEventListener('click', showNotificationsModal);
    }
    
    // Mobile menu toggle - FIXED: Remove nested event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            console.log("Mobile menu button clicked");
            if (sidebar) {
                sidebar.classList.toggle('active');
                console.log("Sidebar toggled");
            }
        });
    }

    // File upload form - MOVED OUTSIDE of mobile menu handler
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', handleFileUpload);
    }
    
    // Add member buttons - CRITICAL: This was the main issue
    document.addEventListener('click', function(e) {
        // Quick action button in dashboard
        if (e.target.closest('.btn-outline-primary') && e.target.closest('.btn-outline-primary').textContent.includes('Add Family Member')) {
            e.preventDefault();
            console.log("Quick action add member clicked");
            const addMemberModal = new bootstrap.Modal(document.getElementById('addMemberModal'));
            addMemberModal.show();
        }
        
        // Add member button in family tab
        if (e.target.closest('#add-member-btn-2')) {
            e.preventDefault();
            console.log("Family tab add member clicked");
            const addMemberModal = new bootstrap.Modal(document.getElementById('addMemberModal'));
            addMemberModal.show();
        }
        
        // Save member button - FIXED: Use proper selector
        if (e.target.closest('#save-member-btn')) {
            e.preventDefault();
            console.log("Save member button clicked");
            handleSaveMember();
        }
        
        // Update member button
        if (e.target.closest('#update-member-btn')) {
            e.preventDefault();
            console.log("Update member button clicked");
            handleUpdateMember();
        }

        // Close modal when clicking the close button or backdrop
        if (e.target.closest('.btn-close') || e.target.classList.contains('modal')) {
            const modal = bootstrap.Modal.getInstance(e.target.closest('.modal'));
            if (modal) {
                modal.hide();
            }
        }
    });
    
    // Email validation
    const memberEmailInput = document.getElementById('member-email');
    if (memberEmailInput) {
        memberEmailInput.addEventListener('blur', function() {
            const isValid = validateEmail(this.value);
            // Use the simpler validation approach from working code
            if (this.value && !isValid) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    // Email validation for edit form
    const editMemberEmailInput = document.getElementById('edit-member-email');
    if (editMemberEmailInput) {
        editMemberEmailInput.addEventListener('blur', function() {
            const isValid = validateEmail(this.value);
            showValidationFeedback(this, isValid, isValid ? '' : 'Please enter a valid email address');
        });
    }
    
    // Name validation for edit form
    const editMemberNameInput = document.getElementById('edit-member-name');
    if (editMemberNameInput) {
        editMemberNameInput.addEventListener('blur', function() {
            const isValid = this.value.trim().length > 0;
            showValidationFeedback(this, isValid, isValid ? '' : 'Please enter a name');
        });
    }
    
    // Password validation
    const memberPasswordInput = document.getElementById('member-password');
    if (memberPasswordInput) {
        memberPasswordInput.addEventListener('blur', function() {
            const validation = validatePassword(this.value);
            if (this.value) {
                if (validation.isValid) {
                    showValidationFeedback(this, true);
                } else {
                    const firstError = Object.values(validation.errors).find(error => error !== null);
                    showValidationFeedback(this, false, firstError);
                }
            }
        });
    }

    function testAllPasswordCases() {
    console.log("=== TESTING ALL PASSWORD CASES ===");
    
    const testCases = [
        { password: "", expected: false, description: "Empty password" },
        { password: "short", expected: false, description: "Too short (5 chars)" },
        { password: "longenough", expected: false, description: "No number or uppercase" },
        { password: "123456", expected: false, description: "No uppercase" },
        { password: "ABCDEF", expected: false, description: "No number" },
        { password: "abc123", expected: false, description: "No uppercase" },
        { password: "ABC123", expected: true, description: "Valid password" },
        { password: "Test123", expected: true, description: "Valid password" },
        { password: "Password1", expected: true, description: "Valid password" }
    ];
    
    testCases.forEach((testCase, index) => {
        const result = validatePassword(testCase.password);
        const passed = result.isValid === testCase.expected;
        
        console.log(`Test ${index + 1}: ${testCase.description}`);
        console.log(`  Password: "${testCase.password}"`);
        console.log(`  Expected: ${testCase.expected}, Got: ${result.isValid}`);
        console.log(`  Message: ${result.message}`);
        console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        if (!passed) {
            console.log(`  ERROR: Expected ${testCase.expected} but got ${result.isValid}`);
        }
        console.log("---");
    });
}

// Call this function during initialization
testAllPasswordCases();
    
    // View all members button
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("View all members clicked");
            // Activate family members tab
            const familyTab = document.querySelector('[href="#family-members"]');
            if (familyTab) {
                familyTab.click();
            }
        });
    }
    
    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                console.log("Sidebar link clicked:", targetId);
                
                // Hide all tab panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                
                // Show the target tab
                const targetTab = document.querySelector(targetId);
                if (targetTab) {
                    targetTab.classList.add('show', 'active');
                }
                
                // Update active states
                sidebarLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Edit and delete member handlers
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-member')) {
            handleEditMember(e);
        } else if (e.target.closest('.delete-member')) {
            handleDeleteMember(e);
        }
    });
    
    // Reset validation when modal is closed
    const addMemberModal = document.getElementById('addMemberModal');
    if (addMemberModal) {
        addMemberModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('add-member-form').reset();
            
            // Clear all validation states using the proper function
            const inputs = document.querySelectorAll('#add-member-form input, #add-member-form select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid', 'is-valid');
                const feedbackElement = input.nextElementSibling;
                if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
                    feedbackElement.textContent = '';
                }
            });
            
            // Also clear the validation info if it exists
            const validationInfo = document.querySelector('.password-validation-info');
            if (validationInfo) {
                validationInfo.querySelector('.length-check').textContent = '❌ At least 6 characters';
                validationInfo.querySelector('.length-check').className = 'length-check text-danger';
                validationInfo.querySelector('.number-check').textContent = '❌ At least 1 number';
                validationInfo.querySelector('.number-check').className = 'number-check text-danger';
                validationInfo.querySelector('.uppercase-check').textContent = '❌ At least 1 uppercase letter';
                validationInfo.querySelector('.uppercase-check').className = 'uppercase-check text-danger';
            }
        });
    }
    
    // Reset validation when edit modal is closed
    const editMemberModal = document.getElementById('editMemberModal');
    if (editMemberModal) {
        editMemberModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('edit-member-form').reset();
            
            // Clear all validation states
            const inputs = document.querySelectorAll('#edit-member-form input, #edit-member-form select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid', 'is-valid');
                const feedbackElement = input.nextElementSibling;
                if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
                    feedbackElement.textContent = '';
                }
            });
            
            // Remove the data-id attribute
            document.querySelector('#edit-member-form').removeAttribute('data-id');
        });
    }

    // Emergency contact save button
    const saveEmergencyBtn = document.querySelector('#save-emergency-btn');
    if (saveEmergencyBtn) {
        saveEmergencyBtn.addEventListener('click', handleEmergencyContactUpdate);
    }
    
    // Weather search form
    const weatherSearchForm = document.querySelector('#weather-search-form');
    if (weatherSearchForm) {
        weatherSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchQuery = document.querySelector('#weather-search-input').value.trim();
            if (searchQuery) {
                searchWeatherLocation(searchQuery);
            }
        });
    }
    
    // Load initial data
    loadEmergencyContacts();
    updateNotificationBadge();
}


// Add real-time password validation feedback
function setupRealTimePasswordValidation() {
    const passwordInput = document.getElementById('member-password');
    if (!passwordInput) return;
    
    const validationInfo = document.createElement('div');
    validationInfo.className = 'password-validation-info small mt-1';
    validationInfo.innerHTML = `
        <div class="length-check">❌ At least 6 characters</div>
        <div class="number-check">❌ At least 1 number</div>
        <div class="uppercase-check">❌ At least 1 uppercase letter</div>
    `;
    
    passwordInput.parentNode.appendChild(validationInfo);
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check length
        const lengthValid = password.length >= 6;
        validationInfo.querySelector('.length-check').textContent = 
            `${lengthValid ? '✅' : '❌'} At least 6 characters`;
        validationInfo.querySelector('.length-check').className = 
            `length-check ${lengthValid ? 'text-success' : 'text-danger'}`;
        
        // Check number
        const numberValid = /[0-9]/.test(password);
        validationInfo.querySelector('.number-check').textContent = 
            `${numberValid ? '✅' : '❌'} At least 1 number`;
        validationInfo.querySelector('.number-check').className = 
            `number-check ${numberValid ? 'text-success' : 'text-danger'}`;
        
        // Check uppercase
        const uppercaseValid = /[A-Z]/.test(password);
        validationInfo.querySelector('.uppercase-check').textContent = 
            `${uppercaseValid ? '✅' : '❌'} At least 1 uppercase letter`;
        validationInfo.querySelector('.uppercase-check').className = 
            `uppercase-check ${uppercaseValid ? 'text-success' : 'text-danger'}`;
            
        // Update input styling using the proper validation function
        const validation = validatePassword(password);
        if (password) {
            if (validation.isValid) {
                showValidationFeedback(this, true);
            } else {
                const firstError = Object.values(validation.errors).find(error => error !== null);
                showValidationFeedback(this, false, firstError);
            }
        } else {
            // Clear validation if empty
            this.classList.remove('is-invalid', 'is-valid');
        }
    });
}

// Call this in your setupEventListeners function
setupRealTimePasswordValidation();

// Save member handler with password validation
function handleSaveMember() {
    console.log("=== HANDLE SAVE MEMBER CALLED ===");
    
    const fullName = document.getElementById('member-name').value;
    const email = document.getElementById('member-email').value;
    const password = document.getElementById('member-password').value;
    const role = document.getElementById('member-role').value;
    
    console.log("Form values:", {fullName, email, role, password: password ? "***" : "empty"});
    
    // Validate inputs
    let isValid = true;
    
    // Reset validation states
    document.getElementById('member-name').classList.remove('is-invalid');
    document.getElementById('member-email').classList.remove('is-invalid');
    document.getElementById('member-password').classList.remove('is-invalid');
    document.getElementById('member-role').classList.remove('is-invalid');
    
    if (!fullName) {
        console.log("Validation failed: No full name");
        showToast('Error', 'Please enter a full name', 'error');
        document.getElementById('member-name').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!email || !validateEmail(email)) {
        console.log("Validation failed: Invalid email", email);
        showToast('Error', 'Please enter a valid email address', 'error');
        document.getElementById('member-email').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!password) {
        console.log("Validation failed: No password");
        showToast('Error', 'Please enter a password', 'error');
        document.getElementById('member-password').classList.add('is-invalid');
        isValid = false;
    } else {
        const passwordValidation = validatePassword(password);
        console.log("Password validation result:", passwordValidation);
        
        // FIXED: Clear both classes first
        document.getElementById('member-password').classList.remove('is-invalid', 'is-valid');
        
        if (passwordValidation.isValid === false) {
            console.log("Validation failed: Password", passwordValidation.message);
            showToast('Error', passwordValidation.message, 'error');
            document.getElementById('member-password').classList.add('is-invalid');
            isValid = false;
        } else {
            console.log("Password validation passed:", passwordValidation.message);
            document.getElementById('member-password').classList.add('is-valid');
        }
    }
    
    if (!role) {
        console.log("Validation failed: No role selected");
        showToast('Error', 'Please select a role', 'error');
        document.getElementById('member-role').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!isValid) {
        console.log("Form validation failed, returning");
        return;
    }
    
    console.log("Form validation passed, proceeding to save");
    
    // Show loading state
    const saveMemberBtn = document.getElementById('save-member-btn');
    const originalText = saveMemberBtn.innerHTML;
    saveMemberBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveMemberBtn.disabled = true;
    
    // Get selected access permissions
    const accessElements = document.querySelectorAll('input[name="member-access"]:checked');
    const access = Array.from(accessElements).map(el => el.value);
    console.log("Access permissions:", access);
    
    // Prepare member data
    const memberData = {
        fullName: fullName,
        email: email,
        password: password,
        role: role,
        access: access,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        invitedBy: currentUser.uid
    };
    
    console.log("Saving member data:", memberData);
    
    // Add member to Firebase
    addFamilyMember(memberData)
        .then(() => {
            console.log("Member added successfully");
            
            // Success
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMemberModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reset form
            document.getElementById('add-member-form').reset();
            
            showToast('Success', 'Family member added successfully', 'success');
        })
        .catch(error => {
            console.error("Add member error:", error);
            showToast('Error', error.message, 'error');
        })
        .finally(() => {
            // Restore button state
            saveMemberBtn.innerHTML = originalText;
            saveMemberBtn.disabled = false;
        });
}

// Save member handler with password validation
function handleUpdateMember() {
    console.log("Handling update member...");
    
    const memberId = document.querySelector('#edit-member-form').dataset.id;
    const fullName = document.getElementById('edit-member-name').value;
    const email = document.getElementById('edit-member-email').value;
    const role = document.getElementById('edit-member-role').value;
    
    // Get the original member data to check if email changed
    const originalMember = familyMembers.find(m => m.id === memberId);
    const emailChanged = originalMember && originalMember.email !== email;
    
    console.log("Update form values:", {memberId, fullName, email, role, emailChanged});
    
    // Validate inputs
    let isValid = true;
    
    // Reset validation states first
    document.getElementById('edit-member-name').classList.remove('is-invalid');
    document.getElementById('edit-member-email').classList.remove('is-invalid');
    document.getElementById('edit-member-role').classList.remove('is-invalid');
    
    if (!fullName) {
        showToast('Error', 'Please enter a full name', 'error');
        document.getElementById('edit-member-name').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!email || !validateEmail(email)) {
        showToast('Error', 'Please enter a valid email address', 'error');
        document.getElementById('edit-member-email').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!role) {
        showToast('Error', 'Please select a role', 'error');
        document.getElementById('edit-member-role').classList.add('is-invalid');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Show loading state
    const updateMemberBtn = document.getElementById('update-member-btn');
    const originalText = updateMemberBtn.innerHTML;
    updateMemberBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    updateMemberBtn.disabled = true;
    
    // Get selected access permissions
    const accessElements = document.querySelectorAll('input[name="edit-member-access"]:checked');
    const access = Array.from(accessElements).map(el => el.value);
    
    // Prepare member data
    const memberData = {
        fullName: fullName,
        email: email,
        role: role,
        access: access,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // If email changed, add verification status
    if (emailChanged) {
        memberData.emailVerified = false;
        memberData.emailVerificationPending = true;
        memberData.previousEmail = originalMember.email;
        memberData.verificationToken = generateVerificationToken();
        memberData.verificationSentAt = firebase.database.ServerValue.TIMESTAMP;
    }
    
    // Convert array to object for Firebase compatibility
    if (Array.isArray(memberData.access)) {
        const accessObj = {};
        memberData.access.forEach((item, index) => {
            accessObj[index] = item;
        });
        memberData.access = accessObj;
    }
    
    // Update member in Firebase
    updateFamilyMember(memberId, memberData)
        .then(() => {
            console.log("Member updated successfully");
            
            // If email changed, send verification email
            if (emailChanged) {
                return sendEmailChangeVerification(originalMember, email, memberData.verificationToken, memberId)
                    .then(() => {
                        // Also notify the head of family about the email change
                        createNotification(
                            'Email Change Requested',
                            `${fullName} has requested to change their email from ${originalMember.email} to ${email}. 
                            Verification email sent to new address.`,
                            { 
                                type: 'email_change_request',
                                memberId: memberId,
                                memberName: fullName,
                                oldEmail: originalMember.email,
                                newEmail: email
                            }
                        );
                    });
            }
        })
        .then(() => {
            // Success
            const modal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
            if (modal) {
                modal.hide();
            }
            
            if (emailChanged) {
                showToast('Success', 'Family member updated. Verification email sent to new address.', 'success');
            } else {
                showToast('Success', 'Family member updated successfully', 'success');
            }
        })
        .catch(error => {
            console.error("Update member error:", error);
            showToast('Error', error.message, 'error');
        })
        .finally(() => {
            // Restore button state
            updateMemberBtn.innerHTML = originalText;
            updateMemberBtn.disabled = false;
        });
}

// Function to send email change verification
function sendInvitationEmail(email, name, memberId, password = null) {
    console.log("Sending NEW MEMBER invitation to:", email);
    
    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS is not loaded!');
        showToast('Error', 'Email service not available', 'error');
        return Promise.reject(new Error('EmailJS not loaded'));
    }
    
    // Validate email address
    if (!email || !validateEmail(email)) {
        console.error('Invalid email address:', email);
        showToast('Error', 'Invalid email address provided', 'error');
        return Promise.reject(new Error('Invalid email address'));
    }
    
    // Generate a verification token first
    const verificationToken = generateVerificationToken();
    
    // Store the verification token in the database
    return database.ref('emailVerifications/' + memberId).set({
        token: verificationToken,
        email: email,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        verified: false,
        userId: currentUser.uid,
        password: password
    }).then(() => {
        // Get inviter's name
        const inviterName = document.querySelector('.user-fullname').textContent;
        const inviterInitials = inviterName.split(' ').map(n => n[0]).join('').toUpperCase();
        
        // CORRECTED: Proper EmailJS template parameters
        const templateParams = {
                to_email: email,
                to_name: name,
                from_name: inviterName,
                FamilyMemberName: name,
                InviterName: inviterName,
                InviterInitials: inviterInitials,
                VerificationLink: `${BASE_URL}/verify-email.html?token=${verificationToken}&member=${memberId}`,
                temporary_password: password || 'Please contact admin for password'
            };

    console.log("Sending NEW MEMBER email with template:", EMAILJS_TEMPLATE_ID);
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
        .then((response) => {

        // Send email using EmailJS
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
            .then((response) => {
                console.log('Email sent successfully:', response);
                showToast('Invitation Sent', `An invitation has been sent to ${email}`, 'success');
                return Promise.resolve();
            })
            .catch((error) => {
                console.error('Failed to send email - full error:', error);
                console.error('Error status:', error.status);
                console.error('Error text:', error.text);
                
                let errorMessage = 'Failed to send invitation email';
                if (error.text) {
                    errorMessage += ': ' + error.text;
                } else if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                
                showToast('Error', errorMessage, 'error');
                throw error;
            });
        });
    });
}

// Email change verification function - uses template_h3l9zgq
function sendEmailChangeVerification(member, newEmail, verificationToken, memberId) {
    console.log("Sending EMAIL CHANGE verification to:", newEmail);
    
    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS is not loaded!');
        showToast('Error', 'Email service not available', 'error');
        return Promise.reject(new Error('EmailJS not loaded'));
    }
    
    // Validate email address
    if (!newEmail || !validateEmail(newEmail)) {
        console.error('Invalid email address:', newEmail);
        showToast('Error', 'Invalid email address provided', 'error');
        return Promise.reject(new Error('Invalid email address'));
    }
    
    // Get head of family's name
    const headOfFamilyName = document.querySelector('.user-fullname').textContent;

    // Store verification data
    const verificationData = {
        token: verificationToken,
        oldEmail: member.email,
        newEmail: newEmail,
        userId: currentUser.uid,
        createdAt: Date.now(),
        verified: false
    };
    
    // CORRECTED: Template parameters that match your HTML template
    const templateParams = {
        to_email: newEmail, // This is for EmailJS routing
        to_name: member.fullName,
        from_name: headOfFamilyName,
        FamilyMemberName: member.fullName,
        InviterName: headOfFamilyName,
        old_email: member.email, // This matches {{old_email}} in template
        new_email: newEmail,     // This matches {{new_email}} in template
        request_date: new Date().toLocaleDateString(),
        verification_link: `${BASE_URL}/verify-email-change.html?token=${verificationToken}&member=${memberId}`
    };

    console.log("Sending EMAIL CHANGE verification with params:", templateParams);

    return database.ref('emailChangeVerifications/' + memberId).set(verificationData)
        .then(() => {
            return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_EMAIL_CHANGE_ID, templateParams, EMAILJS_PUBLIC_KEY);
        })
        .then((response) => {
            console.log('Email change verification sent successfully:', response);
            showToast('Verification Sent', `A verification email has been sent to ${newEmail}`, 'success');
            return Promise.resolve();
        })
        .catch((error) => {
            console.error('Failed to send email change verification:', error);
            let errorMessage = 'Failed to send verification email';
            if (error.text) {
                errorMessage += ': ' + error.text;
            } else if (error.message) {
                errorMessage += ': ' + error.message;
            }
            showToast('Error', errorMessage, 'error');
            throw error;
        });
}


// Edit member handler
function handleEditMember(e) {
    const memberId = e.target.closest('.edit-member').dataset.id;
    const member = familyMembers.find(m => m.id === memberId);
    
    if (member) {
        // Populate edit form
        document.querySelector('#edit-member-name').value = member.fullName;
        document.querySelector('#edit-member-email').value = member.email;
        document.querySelector('#edit-member-role').value = member.role;
        
        // Uncheck all access options first
        document.querySelectorAll('input[name="edit-member-access"]').forEach(el => {
            el.checked = false;
        });
        
        // Check access options - handle both object and array formats
        if (member.access) {
            const accessValues = Array.isArray(member.access) ? 
                member.access : Object.values(member.access);
            
            accessValues.forEach(accessValue => {
                const checkbox = document.querySelector(`input[name="edit-member-access"][value="${accessValue}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        
        // Set member ID on form
        document.querySelector('#edit-member-form').dataset.id = memberId;
        
        // Show modal
        const editModal = new bootstrap.Modal(document.getElementById('editMemberModal'));
        editModal.show();
    }
}

// Delete member handler
function handleDeleteMember(e) {
    const memberId = e.target.closest('.delete-member').dataset.id;
    const member = familyMembers.find(m => m.id === memberId);
    
    if (member && confirm(`Are you sure you want to delete ${member.fullName}?`)) {
        deleteFamilyMember(memberId)
            .then(() => {
                showToast('Success', 'Family member deleted successfully', 'success');
            })
            .catch(error => {
                showToast('Error', error.message, 'error');
            });
    }
}

// File upload handler for Firebase Storage
function handleFileUpload(e) {
    e.preventDefault();
    
    console.log('File upload initiated with Firebase Storage');
    
    const fileInput = document.querySelector('#file-upload');
    const message = document.querySelector('#file-message').value;
    const file = fileInput.files[0];
    
    if (!file) {
        console.log('No file selected');
        showToast('Please select a file to upload');
        return;
    }
    
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Check file type (allow zip files)
    const allowedTypes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.zip')) {
        showToast('Please upload a ZIP file only');
        return;
    }
    
    // Show loading state
    const uploadBtn = document.querySelector('#upload-btn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    uploadBtn.disabled = true;
    
    // Upload to Firebase Storage
    uploadFileToFirebaseStorage(file)
        .then(uploadResponse => {
            console.log('File uploaded successfully to Firebase Storage:', uploadResponse);
            return storeFileMetadata(file, message, uploadResponse);
        })
        .then(() => {
            // Success
            showToast('Customization request submitted successfully! Your file is now uploaded.');
            document.querySelector('#file-upload-form').reset();
            
            // Create notification
            createNotification(
                'Customization Request Submitted',
                'Your file has been received and is being processed.'
            );
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('fileUploadModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload files list
            loadUploadedFiles();
        })
        .catch(error => {
            console.error('Upload failed:', error);
            showToast('Error uploading file: ' + error.message);
        })
        .finally(() => {
            // Restore button state
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        });
}

// Upload file to Firebase Storage
async function uploadFileToFirebaseStorage(file) {
    try {
        // Create a storage reference
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`customizations/${currentUser.uid}/${Date.now()}_${file.name}`);
        
        // Upload the file
        const snapshot = await fileRef.put(file);
        
        // Get the download URL
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return {
            fileUrl: downloadURL,
            fileId: snapshot.ref.fullPath,
            downloadUrl: downloadURL,
            expires: 'Never (Firebase Storage)'
        };
        
    } catch (error) {
        console.error('Firebase Storage upload error:', error);
        throw error;
    }
}

// Store file metadata in Firebase
function storeFileMetadata(file, message, uploadResponse) {
    return database.ref('customizationRequests/' + currentUser.uid).push({
        fileName: file.name,
        fileSize: file.size,
        fileUrl: uploadResponse.fileUrl,
        fileId: uploadResponse.fileId,
        downloadUrl: uploadResponse.downloadUrl,
        expires: uploadResponse.expires,
        message: message,
        status: 'pending',
        uploadedAt: firebase.database.ServerValue.TIMESTAMP,
        storageService: 'firebase_storage' // Changed from 'google_drive'
    });
}

// Load uploaded files
function loadUploadedFiles() {
    if (!currentUser) {
        console.log("No user, cannot load files");
        return;
    }
    
    console.log('Loading uploaded files for user:', currentUser.uid);
    
    const filesContainer = document.querySelector('.customization-requests');
    if (!filesContainer) {
        console.log('Files container not found');
        return;
    }
    
    // Show loading state
    filesContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading files...</p>
        </div>
    `;
    
    database.ref('customizationRequests/' + currentUser.uid).orderByChild('uploadedAt').once('value')
        .then((snapshot) => {
            filesContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                filesContainer.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="fas fa-file-archive fa-3x mb-3"></i>
                        <p>No customization requests yet</p>
                    </div>
                `;
                return;
            }
            
            console.log('Found', snapshot.numChildren(), 'files');
            
            // Create array to sort by date
            const requests = [];
            
            snapshot.forEach((childSnapshot) => {
                const fileData = childSnapshot.val();
                fileData.id = childSnapshot.key;
                requests.push(fileData);
            });
            
            // Sort by date (newest first)
            requests.sort((a, b) => b.uploadedAt - a.uploadedAt);
            
            // Create elements for each request
            requests.forEach(fileData => {
                const fileElement = createFileElement(fileData);
                filesContainer.appendChild(fileElement);
            });
        })
        .catch(error => {
            console.error('Error loading files:', error);
            filesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading files: ${error.message}
                </div>
            `;
        });
}

// Create file element for display
function createFileElement(fileData) {
    const fileElement = document.createElement('div');
    fileElement.className = 'uploaded-file-item card mb-3';
    fileElement.dataset.fileId = fileData.id;
    
    const formattedDate = new Date(fileData.uploadedAt).toLocaleDateString();
    const formattedSize = formatFileSize(fileData.fileSize);
    const statusClass = getStatusBadgeClass(fileData.status);
    
    // Add additional info for approved/declined requests
    let statusInfo = '';
    if (fileData.status === 'approved' && fileData.approvedBy) {
        statusInfo = `<small class="d-block mt-1">Approved by: ${fileData.approvedBy}</small>`;
        if (fileData.approvedAt) {
            statusInfo += `<small class="d-block">On: ${new Date(fileData.approvedAt).toLocaleDateString()}</small>`;
        }
    } else if (fileData.status === 'declined' && fileData.declinedBy) {
        statusInfo = `<small class="d-block mt-1">Declined by: ${fileData.declinedBy}</small>`;
        if (fileData.declinedAt) {
            statusInfo += `<small class="d-block">On: ${new Date(fileData.declinedAt).toLocaleDateString()}</small>`;
        }
        if (fileData.declineReason) {
            statusInfo += `<small class="d-block">Reason: ${fileData.declineReason}</small>`;
        }
    }
    
    fileElement.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="card-title mb-1">${fileData.fileName}</h6>
                    <p class="card-text small mb-1">
                        ${formattedSize} • ${formattedDate}
                    </p>
                    <p class="card-text small">${fileData.message || 'No message'}</p>
                    <span class="badge ${statusClass}">${fileData.status}</span>
                    ${statusInfo}
                </div>
                <div class="btn-group ms-3">
                    <a href="${fileData.downloadUrl || fileData.fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-download"></i> Download
                    </a>
                    <button class="btn btn-sm btn-outline-danger delete-file" data-id="${fileData.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for delete button
    const deleteBtn = fileElement.querySelector('.delete-file');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteFile(this.dataset.id);
        });
    }
    
    return fileElement;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'bg-warning text-dark';
        case 'approved': return 'bg-success';
        case 'declined': return 'bg-danger';
        case 'processing': return 'bg-info';
        case 'completed': return 'bg-success';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Delete file
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
        // First get file data to know the storage service
        const fileRef = database.ref('customizationRequests/' + currentUser.uid + '/' + fileId);
        const snapshot = await fileRef.once('value');
        const fileData = snapshot.val();
        
        if (!fileData) {
            throw new Error('File not found');
        }
        
        // If file is stored on Firebase Storage, delete it there too
        if (fileData.storageService === 'firebase_storage' && fileData.fileId) {
            try {
                // Create a reference to the file
                const fileStorageRef = storage.ref(fileData.fileId);
                // Delete the file
                await fileStorageRef.delete();
                console.log("File deleted from Firebase Storage");
            } catch (storageError) {
                console.warn("Could not delete from Firebase Storage, but continuing with Firebase deletion:", storageError);
            }
        }
        
        // Delete from Firebase Database
        await fileRef.remove();
        showToast('Success', 'File deleted successfully', 'success');
        
        // Remove the file element from UI immediately
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.remove();
        }
        
        // Reload the files list to ensure UI is updated
        loadUploadedFiles();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error', 'Failed to delete file: ' + error.message, 'error');
    }
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong>: ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function loadNotifications() {
    if (!currentUser) return;
    
    database.ref('notifications/' + currentUser.uid).once('value')
        .then((snapshot) => {
            console.log("Loaded notifications count:", snapshot.numChildren());
            updateNotificationBadge();
        })
        .catch((error) => {
            console.error("Error loading notifications:", error);
        });
}

function checkNotifications() {
    if (!currentUser) return;
    
    database.ref('notifications/' + currentUser.uid).once('value')
        .then((snapshot) => {
            console.log("Notifications in database:", snapshot.numChildren());
            snapshot.forEach((childSnapshot) => {
                console.log("Notification:", childSnapshot.key, childSnapshot.val());
            });
        })
        .catch((error) => {
            console.error("Error reading notifications:", error);
        });
}

// Update notification badge
function updateNotificationBadge() {
    if (!currentUser) return;
    
    database.ref('notifications/' + currentUser.uid).orderByChild('read').equalTo(false).once('value')
        .then((snapshot) => {
            const count = snapshot.numChildren();
            const badge = document.querySelector('.notification-badge');
            
            console.log("Unread notifications count:", count);
            
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'flex';
                    badge.classList.add('new');
                } else {
                    badge.style.display = 'none';
                    badge.classList.remove('new');
                }
            }
        })
        .catch((error) => {
            console.error("Error updating notification badge:", error);
        });
}

const NOTIFICATION_TYPES = {
    WELCOME: 'welcome',
    MEMBER_ADDED: 'member_added',
    MEMBER_UPDATED: 'member_updated',
    MEMBER_DELETED: 'member_deleted',
    CUSTOMIZATION_REQUEST: 'customization_request',
    SYSTEM_UPDATE: 'system_update'
};

// Add this function to create notifications
function createNotification(title, message, data = {}) {
    const notification = {
        title: title,
        message: message,
        read: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP
        // REMOVE the 'data' field since it's not allowed by your rules
    };

    return database.ref('notifications/' + currentUser.uid).push(notification)
        .then(() => {
            updateNotificationBadge(); // Update the badge
            return true;
        })
        .catch((error) => {
            console.error("Error creating notification:", error);
            // Don't show error to user, just log it
            return false;
        });
}

// Enhanced notification system
function setupNotificationSystem() {
    console.log("Setting up enhanced notification system...");
    
    // Load initial notifications
    loadNotifications();
    
         activeListeners.notifications = database.ref('notifications/' + currentUser.uid)
        .orderByChild('createdAt')
        .on('child_added', (snapshot) => {
            console.log("New notification received!");
            const notification = snapshot.val();
            notification.id = snapshot.key;
            
            // Update badge count
            updateNotificationBadge();
            
            // Show browser notification if not in focus
            if (document.hidden && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }
            
            // Show toast notification
            showToast(notification.title, notification.message, 'info');
            
            // If notifications modal is open, refresh it
            if (document.getElementById('notificationsModal').classList.contains('show')) {
                loadNotificationsModal();
            }
        });
    
    // Also listen for changes to existing notifications
    database.ref('notifications/' + currentUser.uid).on('child_changed', (snapshot) => {
        updateNotificationBadge();
        if (document.getElementById('notificationsModal').classList.contains('show')) {
            loadNotificationsModal();
        }
    });
}

// Load notifications for modal
function loadNotificationsModal() {
    database.ref('notifications/' + currentUser.uid).orderByChild('createdAt').limitToLast(20).once('value')
        .then((snapshot) => {
            const notificationsList = document.querySelector('.notifications-list');
            if (!notificationsList) return;
            
            notificationsList.innerHTML = '';
            
            if (!snapshot.exists()) {
                notificationsList.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="fas fa-bell-slash fa-3x mb-3"></i>
                        <p>No notifications yet</p>
                    </div>
                `;
                return;
            }
            
            const notifications = [];
            snapshot.forEach((childSnapshot) => {
                const notification = childSnapshot.val();
                notification.id = childSnapshot.key;
                notifications.unshift(notification); // Reverse order (newest first)
            });
            
            notifications.forEach(notification => {
                const notificationElement = createNotificationElement(notification);
                notificationsList.appendChild(notificationElement);
            });
        });
}


// Create notification element
function createNotification(title, message) {
    // Check if user is authenticated
    if (!currentUser) {
        console.error("Cannot create notification: No authenticated user");
        return Promise.resolve(false);
    }
    
    const notification = {
        title: title,
        message: message,
        read: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        // REMOVE any 'data' field as it violates your database rules
    };

    console.log("Creating notification:", notification);
    
    return database.ref('notifications/' + currentUser.uid).push(notification)
        .then(() => {
            console.log("Notification created successfully");
            updateNotificationBadge();
            return true;
        })
        .catch((error) => {
            console.error("Error creating notification:", error);
            // Don't show error to user for notifications
            return false;
        });
}

function setupRequestStatusListener() {
    if (!currentUser) return;
    
    console.log("Setting up request status listener for user:", currentUser.uid);
    
    // Listen for changes to user's customization requests
    database.ref('customizationRequests/' + currentUser.uid).on('child_changed', (snapshot) => {
        const request = snapshot.val();
        request.id = snapshot.key;
        
        console.log("Request status changed:", request.status);
        
        // Only show notifications for status changes to approved/declined
        if (request.status === 'approved') {
            createNotification(
                'Request Approved!', 
                `Your customization request "${request.fileName}" has been approved by ${request.approvedBy || 'the developer'}.`
            );
            
            // Also update the UI immediately
            loadUploadedFiles();
        } 
        else if (request.status === 'declined') {
            createNotification(
                'Request Declined', 
                `Your customization request "${request.fileName}" was declined. Reason: ${request.declineReason || 'No reason provided'}.`
            );
            
            // Update the UI immediately
            loadUploadedFiles();
        }
    });
    
    // Also listen for new requests (though this shouldn't happen from developer side)
activeListeners.requests = database.ref('customizationRequests/' + currentUser.uid)
        .on('child_changed', (snapshot) => {
        console.log("New request added (shouldn't happen from developer)");
    });
}

// Add cleanup function
function cleanupFirebaseListeners() {
    if (activeListeners.notifications) {
        database.ref('notifications/' + currentUser.uid)
            .orderByChild('createdAt')
            .off('child_added', activeListeners.notifications);
    }
    
    if (activeListeners.requests) {
        database.ref('customizationRequests/' + currentUser.uid)
            .off('child_changed', activeListeners.requests);
    }
    
    // Also remove any other listeners you might have
    database.ref('familyMembers/' + currentUser.uid).off();
}

// Call cleanup on page unload or logout
window.addEventListener('beforeunload', cleanupFirebaseListeners);

// Also call cleanup when user logs out
function logout() {
    cleanupFirebaseListeners();
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Get appropriate icon for notification type
function getNotificationIcon(type) {
    const icons = {
        [NOTIFICATION_TYPES.WELCOME]: '🎉',
        [NOTIFICATION_TYPES.MEMBER_ADDED]: '👥',
        [NOTIFICATION_TYPES.MEMBER_UPDATED]: '✏️',
        [NOTIFICATION_TYPES.MEMBER_DELETED]: '❌',
        [NOTIFICATION_TYPES.CUSTOMIZATION_REQUEST]: '📦',
        [NOTIFICATION_TYPES.SYSTEM_UPDATE]: '🔄'
    };
    return icons[type] || '🔔';
}

// Format time ago
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Show notifications modal
function showNotificationsModal() {
    loadNotificationsModal();
    const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
    modal.show();
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    database.ref('notifications/' + currentUser.uid + '/' + notificationId).update({
        read: true,
        readAt: firebase.database.ServerValue.TIMESTAMP
    });
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    database.ref('notifications/' + currentUser.uid).orderByChild('read').equalTo(false).once('value')
        .then((snapshot) => {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                updates[childSnapshot.key + '/read'] = true;
                updates[childSnapshot.key + '/readAt'] = firebase.database.ServerValue.TIMESTAMP;
            });
            
            if (Object.keys(updates).length > 0) {
                database.ref('notifications/' + currentUser.uid).update(updates);
            }
        });
}

const TOUR_STEPS = [
    {
        element: '#dashboard',
        title: 'Welcome to Your Dashboard!',
        content: 'This is your main dashboard where you can see an overview of your family and home.',
        placement: 'center'
    },
    {
        element: '.weather-widget',
        title: 'Weather Information',
        content: 'Check the current weather conditions for your location.',
        placement: 'right'
    },
    {
        element: '.current-date',
        title: 'Date & Time',
        content: 'Always stay updated with the current date and time.',
        placement: 'right'
    },
    {
        element: '.btn-outline-primary',
        title: 'Quick Actions',
        content: 'Quickly add family members or upload customizations from here.',
        placement: 'left'
    },
    {
        element: '.family-members',
        title: 'Family Members',
        content: 'View and manage your family members here. Click "View All" to see everyone.',
        placement: 'top'
    },
    {
        element: '.sidebar-menu',
        title: 'Navigation Menu',
        content: 'Use this menu to navigate between different sections of your dashboard.',
        placement: 'right'
    },
    {
        element: '.notification-bell',
        title: 'Notifications',
        content: 'Click here to see all your notifications and alerts.',
        placement: 'left'
    }
];

// Create custom tour prompt with buttons
function showTourPrompt() {
    // Create prompt overlay
    const promptOverlay = document.createElement('div');
    promptOverlay.id = 'tour-prompt-overlay';
    promptOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9995;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    // Create prompt container
    const promptContainer = document.createElement('div');
    promptContainer.style.cssText = `
        background: var(--dark);
        border: 2px solid var(--secondary);
        border-radius: 16px;
        padding: 25px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    promptContainer.innerHTML = `
        <h4 style="color: var(--secondary); margin-bottom: 15px; font-family: 'Orbitron', sans-serif;">
            <i class="fas fa-rocket me-2"></i>Welcome to Lumiverse!
        </h4>
        <p style="color: var(--light); margin-bottom: 25px; line-height: 1.5;">
            Would you like a quick tour of your dashboard to get started?
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button id="tour-decline" class="btn btn-outline-secondary" style="min-width: 100px;">
                <i class="fas fa-times me-2"></i>No Thanks
            </button>
            <button id="tour-accept" class="btn btn-primary" style="min-width: 100px;">
                <i class="fas fa-play me-2"></i>Start Tour
            </button>
        </div>
        <div style="margin-top: 20px;">
            <label style="color: var(--gray); font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="dont-show-again" style="margin-right: 8px;">
                Don't show this again
            </label>
        </div>
    `;
    
    promptOverlay.appendChild(promptContainer);
    document.body.appendChild(promptOverlay);
    
    // Add event listeners
    document.getElementById('tour-accept').addEventListener('click', () => {
        const dontShowAgain = document.getElementById('dont-show-again').checked;
        if (dontShowAgain) {
            localStorage.setItem('dontShowTourPrompt', 'true');
        }
        promptOverlay.remove();
        showTourStep(0);
    });
    
    document.getElementById('tour-decline').addEventListener('click', () => {
        const dontShowAgain = document.getElementById('dont-show-again').checked;
        if (dontShowAgain) {
            localStorage.setItem('dontShowTourPrompt', 'true');
        }
        promptOverlay.remove();
        localStorage.setItem('hasSeenTour', 'true');
    });
}

// Add CSS styles for the prompt
function addTourPromptStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #tour-prompt-overlay {
            animation: fadeIn 0.3s ease-in-out;
        }
        
        #tour-prompt-overlay > div {
            animation: slideUp 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 480px) {
            #tour-prompt-overlay > div {
                width: 95% !important;
                padding: 20px 15px !important;
            }
            
            #tour-prompt-overlay .btn {
                min-width: 80px !important;
                padding: 8px 12px;
                font-size: 0.8rem;
            }
        }
    `;
    document.head.appendChild(style);
}

// Add this function to start the tour
function startWelcomeTour() {
    console.log("Starting welcome tour...");
    
    // Check if user has already seen the tour in Firebase
    database.ref('userSettings/' + currentUser.uid + '/hasSeenTour').once('value')
        .then((snapshot) => {
            if (snapshot.exists() && snapshot.val() === true) {
                console.log("User has already seen the tour");
                return;
            }
            
            // Check if user opted out of tour prompts
            const dontShowPrompt = localStorage.getItem('dontShowTourPrompt');
            if (dontShowPrompt === 'true') {
                console.log("User opted out of tour prompts");
                return;
            }
            
            // Create tour elements
            createTourElements();
            addTourPromptStyles(); // Add styles for the prompt
            
            // Show welcome notification
            createNotification(
                'Welcome to Lumiverse!',
                'Get started with a quick tour of your dashboard features.'
            );
            
            // Show custom tour prompt after delay
            setTimeout(() => {
                showTourPrompt();
            }, 2000);
        })
        .catch((error) => {
            console.error("Error checking tour status:", error);
        });
}

// Create tour overlay and elements
function createTourElements() {
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9990;
        display: none;
    `;
    
    const tooltip = document.createElement('div');
    tooltip.id = 'tour-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: var(--dark);
        border: 2px solid var(--secondary);
        border-radius: 12px;
        padding: 20px;
        max-width: 90%;
        width: 300px;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        left: 50%;
        transform: translateX(-50%);
    `;
    
    tooltip.innerHTML = `
        <h4 id="tour-title" style="color: var(--secondary); margin-bottom: 10px; font-size: 1.1rem;"></h4>
        <p id="tour-content" style="color: var(--light); margin-bottom: 15px; font-size: 0.9rem;"></p>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span id="tour-progress" style="color: var(--gray); font-size: 0.9rem;"></span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="tour-prev" class="btn btn-sm btn-outline-secondary" style="display: none;">Previous</button>
                <button id="tour-next" class="btn btn-sm btn-primary">Next</button>
                <button id="tour-skip" class="btn btn-sm btn-outline-danger">Skip</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(tooltip);
    
    // Add event listeners
    document.getElementById('tour-next').addEventListener('click', nextTourStep);
    document.getElementById('tour-prev').addEventListener('click', prevTourStep);
    document.getElementById('tour-skip').addEventListener('click', endTour);
    
    // Add responsive styles
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            #tour-tooltip {
                width: 85% !important;
                max-width: 300px !important;
                bottom: 20px;
                top: auto !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
            }
            
            #tour-tooltip .btn {
                padding: 8px 12px;
                font-size: 0.8rem;
            }
            
            #tour-title {
                font-size: 1rem !important;
            }
            
            #tour-content {
                font-size: 0.85rem !important;
            }
        }
        
        @media (max-width: 480px) {
            #tour-tooltip {
                width: 90% !important;
                padding: 15px !important;
            }
            
            #tour-tooltip .btn {
                padding: 6px 10px;
                font-size: 0.75rem;
            }
        }
    `;
    document.head.appendChild(style);
}

// Show tour step
function showTourStep(stepIndex) {
    const step = TOUR_STEPS[stepIndex];
    const element = document.querySelector(step.element);
    
    if (!element) {
        console.warn('Tour element not found:', step.element);
        nextTourStep();
        return;
    }
    
    const overlay = document.getElementById('tour-overlay');
    const tooltip = document.getElementById('tour-tooltip');
    
    // Show overlay
    overlay.style.display = 'block';
    
    // Position tooltip - RESPONSIVE VERSION
    const rect = element.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile positioning - always centered at bottom
        tooltip.style.top = 'auto';
        tooltip.style.bottom = '20px';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
    } else {
        // Desktop positioning
        let top, left;
        
        switch (step.placement) {
            case 'top':
                top = rect.top - tooltip.offsetHeight - 10;
                left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 10;
                left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltip.offsetHeight) / 2;
                left = rect.left - tooltip.offsetWidth - 10;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltip.offsetHeight) / 2;
                left = rect.right + 10;
                break;
            case 'center':
                top = window.innerHeight / 2 - tooltip.offsetHeight / 2;
                left = window.innerWidth / 2 - tooltip.offsetWidth / 2;
                break;
        }
        
        tooltip.style.top = Math.max(10, top) + 'px';
        tooltip.style.left = Math.max(10, left) + 'px';
        tooltip.style.transform = 'none';
    }
    
    // Update content
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-content').textContent = step.content;
    document.getElementById('tour-progress').textContent = `${stepIndex + 1}/${TOUR_STEPS.length}`;
    
    // Update buttons
    document.getElementById('tour-prev').style.display = stepIndex > 0 ? 'block' : 'none';
    document.getElementById('tour-next').textContent = stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
    
    // Store current step
    tooltip.dataset.currentStep = stepIndex;
}

// Next tour step
function nextTourStep() {
    const tooltip = document.getElementById('tour-tooltip');
    const currentStep = parseInt(tooltip.dataset.currentStep || 0);
    
    if (currentStep >= TOUR_STEPS.length - 1) {
        endTour();
    } else {
        showTourStep(currentStep + 1);
    }
}

// Previous tour step
function prevTourStep() {
    const tooltip = document.getElementById('tour-tooltip');
    const currentStep = parseInt(tooltip.dataset.currentStep || 0);
    
    if (currentStep > 0) {
        showTourStep(currentStep - 1);
    }
}

// End tour
function endTour() {
    document.getElementById('tour-overlay').style.display = 'none';
    document.getElementById('tour-tooltip').style.display = 'none';
    
    // Mark as seen in database
    database.ref('userSettings/' + currentUser.uid).update({
        hasSeenTour: true
    });
    
    // Show completion message
    showToast('Tour Completed', 'You\'re all set! Explore your dashboard.', 'success');
}

function enhanceExistingFunctionsWithNotifications() {
    // Store original functions
    const originalAddFamilyMember = addFamilyMember;
    const originalUpdateFamilyMember = updateFamilyMember;
    const originalDeleteFamilyMember = deleteFamilyMember;
    
    // Enhanced addFamilyMember with notification
    addFamilyMember = function(memberData) {
        return originalAddFamilyMember.call(this, memberData)
            .then((result) => {
                // Send notification after member is successfully added
                createNotification(
                    'New Family Member Added',
                    `${memberData.fullName} has been added to your family.`
                ).catch(() => {}); // Silently fail if notification fails
                return result;
            });
    };
    
    // Enhanced updateFamilyMember with notification
    updateFamilyMember = function(memberId, memberData) {
        return originalUpdateFamilyMember.call(this, memberId, memberData)
            .then(() => {
                createNotification(
                    'Member Information Updated',
                    `${memberData.fullName}'s information has been updated successfully.`
                ).catch(() => {});
            });
    };
    
    // Enhanced deleteFamilyMember with notification
    deleteFamilyMember = function(memberId) {
        return originalDeleteFamilyMember.call(this, memberId)
            .then(() => {
                const member = familyMembers.find(m => m.id === memberId);
                if (member) {
                    createNotification(
                        'Family Member Removed',
                        `${member.fullName} has been removed from your family.`
                    ).catch(() => {});
                }
            });
    };
    
    // Enhanced handleFileUpload with notification
    const originalHandleFileUpload = handleFileUpload;
    handleFileUpload = function(e) {
        return originalHandleFileUpload.call(this, e)
            .then(() => {
                createNotification(
                    'Customization Request Submitted',
                    'Your file has been received and is being processed.'
                ).catch(() => {});
            });
    };
}

    // Add refresh button functionality
    const refreshFilesBtn = document.getElementById('refresh-files-btn');
    if (refreshFilesBtn) {
        refreshFilesBtn.addEventListener('click', function() {
            loadUploadedFiles();
            showToast('Info', 'Refreshing files...', 'info');
        });
    }

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing dashboard...");
    initDashboard();
    setupModalCleanup();
});
