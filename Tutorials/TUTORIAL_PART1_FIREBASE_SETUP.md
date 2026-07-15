# KabuTech IoT Tutorial — Part 1: Firebase Backend Setup

> This is a step-by-step guide to connect your KabuTech Hiyas app to real ESP32 sensors via Firebase.

---

## Prerequisites

- Google account
- Web browser (Chrome recommended)
- The KabuTech Hiyas web app files (you already have these)

---

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Enter project name: `kabutech-hiyas`
4. Disable Google Analytics (not needed) → Click **Create Project**
5. Wait for project creation → Click **Continue**

---

## Step 2: Enable Firebase Authentication

1. In the Firebase console sidebar, click **Build → Authentication**
2. Click **Get Started**
3. Under "Sign-in method" tab, click **Email/Password**
4. Toggle **Enable** → Click **Save**

---

## Step 3: Create Realtime Database

1. In sidebar, click **Build → Realtime Database**
2. Click **Create Database**
3. Choose location: **Singapore (asia-southeast1)** (closest to Philippines)
4. Select **Start in test mode** (we'll add security rules later)
5. Click **Enable**

### 3.1: Set Initial Database Structure

In the Realtime Database console, click the **"+"** icon next to your database URL and manually create this structure:

```
kabutech
├── sensors
│   ├── live
│   │   ├── temperature: 0
│   │   ├── humidity: 0
│   │   ├── co2: 0
│   │   ├── light: 0
│   │   ├── timestamp: 0
│   │   └── esp32_status: "offline"
│   └── tinyml
│       ├── anomaly_detected: false
│       ├── anomaly_type: "none"
│       └── confidence: 0
├── controls
│   ├── mode: "auto"
│   ├── fans
│   │   └── state: false
│   ├── misters
│   │   └── state: false
│   └── lights
│       └── state: false
└── setpoints
    ├── temperature: 23.5
    ├── humidity: 75
    ├── light: 500
    └── co2: 600
```

**How to enter this manually:**
1. Click the `+` next to your database root
2. Type `kabutech` as key → leave value empty → click `+` to add a child
3. Add `sensors` as child → then `live` as child of sensors
4. Under `live`, add each key-value pair (temperature: 0, humidity: 0, etc.)
5. Repeat for `controls` and `setpoints`

### 3.2: Set Security Rules

Go to the **Rules** tab in Realtime Database and paste:

```json
{
  "rules": {
    "kabutech": {
      "sensors": {
        ".read": "auth != null",
        ".write": true
      },
      "controls": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "setpoints": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "history": {
        ".read": "auth != null",
        ".write": true
      }
    }
  }
}
```

> **Note:** `.write: true` for sensors allows the ESP32 to write without user auth. For production, use a service account. This is fine for development.

Click **Publish**.

---

## Step 4: Register Your Web App in Firebase

1. In Firebase console, click the **gear icon ⚙️** → **Project Settings**
2. Scroll down to "Your apps" → Click the **Web icon `</>`**
3. Enter app nickname: `KabuTech Web`
4. Check ✅ **"Also set up Firebase Hosting"** (optional but recommended)
5. Click **Register app**
6. You'll see a config object like this — **COPY IT AND SAVE IT**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB-xxxxxxxxxxxxxxxxxxxx",
  authDomain: "kabutech-hiyas.firebaseapp.com",
  databaseURL: "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kabutech-hiyas",
  storageBucket: "kabutech-hiyas.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

> ⚠️ **IMPORTANT:** You MUST copy the `databaseURL` — it's needed for both the web app AND the ESP32.

---

## Step 5: Add Firebase SDK to Your Web App

### 5.1: Create the Firebase Config File

Create a new file `js/firebase-config.js`:

```javascript
// js/firebase-config.js — Firebase initialization for KabuTech Hiyas
// ═══════════════════════════════════════════════════════════════════

// PASTE YOUR FIREBASE CONFIG HERE (from Step 4)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export references for use in app.js
const fbAuth = firebase.auth();
const fbDB   = firebase.database();

// Connection status monitor
const connectedRef = fbDB.ref(".info/connected");
let isFirebaseConnected = false;

connectedRef.on("value", (snap) => {
  isFirebaseConnected = snap.val() === true;
  const badge = document.getElementById('header-status-badge');
  if (badge) {
    if (isFirebaseConnected) {
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span> SYSTEM LIVE';
      badge.classList.remove('bg-red-100', 'text-red-600', 'border-red-300');
      badge.classList.add('bg-[#e6fcf0]', 'text-[#15803d]', 'border-[#16a34a]/20');
    } else {
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> OFFLINE';
      badge.classList.add('bg-red-100', 'text-red-600', 'border-red-300');
      badge.classList.remove('bg-[#e6fcf0]', 'text-[#15803d]', 'border-[#16a34a]/20');
    }
  }
});

// ── Live Sensor Listener ──────────────────────────
// Replaces runSimulationTick() — reads real data from Firebase
const sensorRef = fbDB.ref("kabutech/sensors/live");

sensorRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  // Update global state (same variables the existing UI reads from)
  if (typeof state !== 'undefined') {
    state.currentTemp     = data.temperature || 0;
    state.currentHumidity = data.humidity || 0;
    state.currentCO2      = data.co2 || 0;
    state.currentLight    = data.light || 0;

    // Refresh the dashboard UI (existing function, unchanged)
    if (typeof updateSensorDOM === 'function') updateSensorDOM();
    if (typeof updateSensorCardStatus === 'function') updateSensorCardStatus();
    if (typeof updateSystemStatusMsg === 'function') updateSystemStatusMsg();
    if (typeof checkAlertThresholds === 'function') checkAlertThresholds();
  }
});

// ── TinyML Prediction Listener ────────────────────
const tinymlRef = fbDB.ref("kabutech/sensors/tinyml");

tinymlRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const banner = document.getElementById('active-alert-banner');
  if (data.anomaly_detected && banner) {
    document.getElementById('banner-alert-title').innerText = 'AI Anomaly Detected';
    document.getElementById('banner-alert-desc').innerText =
      `TinyML detected: ${data.anomaly_type} (Confidence: ${(data.confidence * 100).toFixed(0)}%)`;
    banner.classList.remove('hidden');
  }
});

// ── Controls Listener (sync device states from Firebase) ──
const controlsRef = fbDB.ref("kabutech/controls");

controlsRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data || typeof state === 'undefined') return;

  state.systemMode = data.mode || 'auto';
  state.deviceStates.fans    = data.fans?.state || false;
  state.deviceStates.misters = data.misters?.state || false;
  state.deviceStates.lights  = data.lights?.state || false;

  if (typeof syncControlsUI === 'function') syncControlsUI();
});

// ── Write Functions (app → Firebase → ESP32) ──────
function fbSetDeviceState(device, newState) {
  fbDB.ref(`kabutech/controls/${device}/state`).set(newState);
  fbDB.ref(`kabutech/controls/${device}/setBy`).set("manual");
  fbDB.ref(`kabutech/controls/${device}/timestamp`).set(Date.now());
}

function fbSetSystemMode(mode) {
  fbDB.ref("kabutech/controls/mode").set(mode);
}

function fbSetSetpoint(key, value) {
  fbDB.ref(`kabutech/setpoints/${key}`).set(value);
}

console.log("🌱 KabuTech Firebase initialized.");
```

### 5.2: Add Script Tags to index.html

Open `index.html` and add these lines **before** the closing `</head>` tag (before line 46):

```html
<!-- Firebase SDK (v9 compat mode for simplicity) -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
```

Then add this line **after** the `app.js` script tag (at the bottom of the body):

```html
<script src="./js/firebase-config.js"></script>
```

---

## Step 6: Replace Login with Firebase Auth

In `js/app.js`, modify the `handleLogin()` function (around line 2055):

**Replace the existing localStorage-based login with:**

```javascript
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields.', 'error');
        return;
    }

    showToast('Authenticating...', 'info');

    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            const displayName = user.displayName || email.split('@')[0];
            const role = email.includes('admin') ? 'admin' : 'staff';
            const initials = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

            state.currentUser = { email, role, name: displayName, initials };
            localStorage.setItem('kb_user', JSON.stringify(state.currentUser));

            applyUserProfile(state.currentUser);
            updateGreeting();
            applyRoleNavRestrictions(role);
            showToast(`Welcome back, ${displayName}!`, 'success');
            transitionToApp();
        })
        .catch((error) => {
            if (error.code === 'auth/user-not-found') {
                showToast('Account not found. Please sign up first.', 'error');
            } else if (error.code === 'auth/wrong-password') {
                showToast('Incorrect password.', 'error');
            } else {
                showToast('Login failed: ' + error.message, 'error');
            }
        });
}
```

**And modify `handleRegister()` similarly:**

```javascript
function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!name || !email || !password || !confirm) {
        showToast('Please fill in all fields.', 'error');
        return;
    }
    if (password !== confirm) {
        document.getElementById('reg-confirm-error').classList.remove('hidden');
        return;
    }

    fbAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({ displayName: name });
        })
        .then(() => {
            const role = email.includes('admin') ? 'admin' : 'staff';
            const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            state.currentUser = { email, role, name, initials };
            localStorage.setItem('kb_user', JSON.stringify(state.currentUser));

            showToast(`Account created! Welcome, ${name}.`, 'success');
            applyUserProfile(state.currentUser);
            transitionToApp();
        })
        .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
                document.getElementById('reg-email-error').classList.remove('hidden');
            } else {
                showToast('Registration failed: ' + error.message, 'error');
            }
        });
}
```

### 6.1: Create Test Users in Firebase

1. Go to Firebase Console → Authentication → Users tab
2. Click **Add user**
3. Enter: `admin@kabutech.com` / password: `kabutech2026`
4. Add another: `staff@kabutech.com` / password: `kabutech2026`

---

## ✅ Part 1 Complete!

At this point you have:
- ✅ Firebase project created
- ✅ Realtime Database with correct structure
- ✅ Security rules configured
- ✅ Firebase SDK added to web app
- ✅ Live sensor listener ready (waiting for ESP32 data)
- ✅ Authentication replaced with Firebase Auth

**Next:** Part 2 covers ESP32 hardware wiring and firmware.
