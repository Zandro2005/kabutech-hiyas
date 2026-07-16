// firebase-config.js
// Firebase Initialization and Realtime Listeners

const firebaseConfig = {
    apiKey: "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M",
    authDomain: "kabutech-hiyas.firebaseapp.com",
    databaseURL: "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kabutech-hiyas",
    storageBucket: "kabutech-hiyas.firebasestorage.app",
    messagingSenderId: "528459633948",
    appId: "1:528459633948:web:77f88776ee7366827cd6d9",
    measurementId: "G-T4NCN14Z4D"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const fbAuth = firebase.auth();
const fbDB = firebase.database();
window.fbAuth = fbAuth;
window.fbDB = fbDB;

// Enforce Session-only persistence (logout on browser close) - Removed so "Remember Me" works
// fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(console.error);

// State cache for staff accounts
window.fbUsersCache = [];

// --- Auth State Listener ---
fbAuth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        fbDB.ref('kabutech/users/' + user.uid).once('value').then((snapshot) => {
            let profile = snapshot.val();
            
            // Auto-create profile if it doesn't exist (handles accounts created via Firebase Console)
            if (!profile) {
                const isAdmin = user.email === 'admin@kabutech.com';
                profile = {
                    name: isAdmin ? 'Admin Renz' : 'Staff',
                    email: user.email,
                    role: isAdmin ? 'admin' : 'staff',
                    approved: true,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                // Save it to database so it exists next time
                fbDB.ref('kabutech/users/' + user.uid).set(profile);
            }

            if (!profile.approved) {
                showToast('Account pending admin approval.', 'warning');
                fbAuth.signOut();
                return;
            }
            
            // Set current user
            const initials = profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            state.currentUser = { uid: user.uid, email: user.email, role: profile.role, name: profile.name, initials, theme: profile.theme || 'light' };
            
            // Apply user-specific theme
            if (typeof setTheme === 'function') {
                setTheme(state.currentUser.theme);
            }
            
            // Transition UI based on where we are
            if (typeof transitionToApp === 'function' && 
                (!document.getElementById('scene-login').classList.contains('hidden') ||
                 !document.getElementById('scene-register').classList.contains('hidden') ||
                 !document.getElementById('scene-loading').classList.contains('hidden'))) {
                transitionToApp();
            } else {
                applyRoleNavRestrictions(profile.role);
                openSubPage('subpage-home');
            }
            
            attachDatabaseListeners();
            
            // Show connection status
            showToast('Connected to KabuTech Cloud', 'success');
        });
    } else {
        // User is signed out
        state.currentUser = null;
        const loading = document.getElementById('scene-loading');
        
        if (loading && !loading.classList.contains('hidden')) {
            // Initial boot sequence
            let hasOnboarded = false;
            try { hasOnboarded = localStorage.getItem('kb_onboarded') === '1'; } catch (e) { }
            const isDesktopOrTablet = window.innerWidth >= 768;
            
            setTimeout(() => {
                loading.classList.add('opacity-0');
                setTimeout(() => {
                    loading.classList.add('hidden');
                    if (hasOnboarded || isDesktopOrTablet) {
                        if (typeof revealLoginWithFade === 'function') revealLoginWithFade();
                    } else {
                        if (typeof revealOnboardingWithFade === 'function') revealOnboardingWithFade();
                    }
                }, 700);
            }, 1000); // Short boot delay
        } else {
            // Logged out while in app
            if (typeof revealLoginWithFade === 'function') revealLoginWithFade();
        }
    }
});

// --- Realtime Database Listeners ---

let _listenersAttached = false;
function attachDatabaseListeners() {
    if (_listenersAttached) return;
    _listenersAttached = true;

    // Users (for staff management)
    fbDB.ref('kabutech/users').on('value', (snapshot) => {
    const data = snapshot.val();
    window.fbUsersCache = [];
    if (data) {
        for (const uid in data) {
            window.fbUsersCache.push({ uid, ...data[uid] });
        }
    }
    if (typeof renderStaffAccountsList === 'function') renderStaffAccountsList();
});

// Batches
fbDB.ref('kabutech/batches').on('value', (snapshot) => {
    const data = snapshot.val();
    
    // Convert sparse arrays/objects to flat array
    let batches = data || [];
    if (!Array.isArray(batches) && typeof batches === 'object') {
        batches = Object.values(batches);
    }
    
    state.growBatches = batches.filter(r => r != null).map(rack => {
        if (rack.bags) {
            let bgs = Array.isArray(rack.bags) ? rack.bags : Object.values(rack.bags);
            rack.bags = bgs.filter(b => b != null).map(bag => {
                let hLogs = bag.harvestLog || [];
                hLogs = Array.isArray(hLogs) ? hLogs : Object.values(hLogs);
                bag.harvestLog = hLogs.filter(l => l != null);
                return bag;
            });
        } else {
            rack.bags = [];
        }
        return rack;
    });
    
    if (typeof renderBatches === 'function') renderBatches();
    if (typeof updateCropsHealthPanel === 'function') updateCropsHealthPanel();
    if (typeof renderYieldAnalytics === 'function') renderYieldAnalytics(false);
});

// Tasks
fbDB.ref('kabutech/tasks').on('value', (snapshot) => {
    const data = snapshot.val();
    let tasks = data || [];
    if (!Array.isArray(tasks) && typeof tasks === 'object') tasks = Object.values(tasks);
    
    state.tasks = tasks.filter(t => t != null);
    if (typeof renderTasks === 'function') renderTasks();
});

// Logs
fbDB.ref('kabutech/logs').on('value', (snapshot) => {
    const data = snapshot.val();
    let logs = data || [];
    if (!Array.isArray(logs) && typeof logs === 'object') logs = Object.values(logs);
    
    state.eventLogs = logs.filter(l => l != null);
    if (typeof renderLogs === 'function') renderLogs();
});

// Alerts
fbDB.ref('kabutech/alerts').on('value', (snapshot) => {
    const data = snapshot.val();
    state.alerts = data || [];
    if (typeof renderAlerts === 'function') renderAlerts();
});

// Staff Reports
fbDB.ref('kabutech/staffReports').on('value', (snapshot) => {
    const data = snapshot.val();
    state.staffReports = data || [];
    if (typeof renderStaffReports === 'function') renderStaffReports();
});

// Settings (Yield Target, Setpoints, Schedule)
// Settings (Yield Target, Setpoints, Schedule)
fbDB.ref('kabutech/settings').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return; // Do not push default placeholders to an empty database
    
    if (data.yieldTarget !== undefined) {
            state.yieldTarget = data.yieldTarget;
            const actualYieldEl = document.getElementById('actual-yield-amt');
            if (actualYieldEl) actualYieldEl.setAttribute('data-target', state.yieldTarget);
            
            // Force the UI to repaint with the new target immediately
            if (typeof syncYieldTargetUI === 'function') syncYieldTargetUI();
            if (typeof renderYieldAnalytics === 'function') renderYieldAnalytics(false);
        }
        
        if (data.setpoints) {
            // Update local state variables so saves don't overwrite with placeholders
            state.tempSetpoint = data.setpoints.temperature;
            state.humiditySetpoint = data.setpoints.humidity;
            state.lightSetpoint = data.setpoints.light;
            state.co2Setpoint = data.setpoints.co2;
            if (data.setpoints.mode) state.systemMode = data.setpoints.mode;
            if (data.setpoints.devices) state.deviceStates = data.setpoints.devices;
            
            // Update UI text labels
            document.getElementById('setpoint-val-temp').textContent = data.setpoints.temperature.toFixed(1) + '°C';
            document.getElementById('setpoint-val-humidity').textContent = data.setpoints.humidity.toFixed(0) + '%';
            document.getElementById('setpoint-val-light').textContent = data.setpoints.light.toFixed(0) + 'µ';
            document.getElementById('setpoint-val-co2').textContent = data.setpoints.co2.toFixed(0) + ' ppm';
            
            // Update device toggles if possible
            if (typeof syncControlsUI === 'function') syncControlsUI();
        }
        
        if (data.schedule && typeof applyScheduleConfig === 'function') {
            applyScheduleConfig(data.schedule);
        }
});

// Live Sensors (from ESP32)
fbDB.ref('kabutech/sensors/live').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.esp32_status === 'online') {
        // Stop simulation if it's running
        if (window.simInterval) {
            clearInterval(window.simInterval);
            window.simInterval = null;
        }
        
        state.currentTemp = data.temperature;
        state.currentHumidity = data.humidity;
        state.currentLight = data.light;
        state.currentCO2 = data.co2;
        
        // Update connection badge if it exists
        const badge = document.getElementById('esp32-status-badge');
        if (badge) {
            badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
            badge.textContent = 'ONLINE';
        }
    } else {
        // Fallback to simulation if offline
        const badge = document.getElementById('esp32-status-badge');
        if (badge) {
            badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
            badge.textContent = 'OFFLINE';
        }
    }
});

// --- Connection Status ---
const connectedRef = firebase.database().ref('.info/connected');
connectedRef.on('value', (snap) => {
    const isOnline = snap.val() === true;
    const badge = document.getElementById('cloud-status-badge');
    if (badge) {
        if (isOnline) {
            badge.className = 'w-2.5 h-2.5 rounded-full bg-success-green shadow-[0_0_8px_rgba(22,163,74,0.6)]';
        } else {
            badge.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
        }
    }
});

} // End of attachDatabaseListeners
