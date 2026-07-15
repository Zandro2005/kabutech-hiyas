# KabuTech Firebase Setup Tutorial

> **Time needed:** ~10 minutes  
> **What you need:** A Google account and a web browser  
> **After this:** Paste your config keys to the agent, and it will code everything automatically

---

## Step 1: Create a Firebase Project

1. Open your browser and go to **[console.firebase.google.com](https://console.firebase.google.com)**
2. Sign in with your Google account
3. Click the big **"Create a project"** button (or "Add project")
4. Enter the project name: **`kabutech-hiyas`**
5. Click **Continue**
6. Toggle OFF "Enable Google Analytics" (not needed for this)
7. Click **Create Project**
8. Wait ~30 seconds for it to finish → Click **Continue**

You'll land on the Firebase project dashboard. ✅

---

## Step 2: Enable Email/Password Authentication

1. In the **left sidebar**, click **Build → Authentication**
2. Click the blue **"Get started"** button
3. You'll see a list of "Sign-in providers"
4. Click **Email/Password** (first item in the list)
5. Toggle the **Enable** switch to ON
6. Leave "Email link (passwordless sign-in)" OFF
7. Click **Save**

You should see "Email/Password" with status **Enabled**. ✅

---

## Step 3: Create the Realtime Database

1. In the **left sidebar**, click **Build → Realtime Database**
2. Click **"Create Database"**
3. For Database location, select: **Singapore (asia-southeast1)** — closest to Philippines
4. Select **"Start in test mode"** (we'll set proper rules later)
5. Click **Enable**

You'll see an empty database with a URL like:  
`https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app`

Keep this page open — you'll need the URL. ✅

---

## Step 4: Register Your Web App & Get Config Keys

This is the most important step — you need to copy the config keys.

1. Click the **gear icon ⚙️** at the top-left → **Project settings**
2. Scroll down to the section **"Your apps"**
3. Click the **Web icon `</>`** (looks like angle brackets)
4. Enter app nickname: **`KabuTech Web`**
5. Leave "Firebase Hosting" unchecked (not needed now)
6. Click **Register app**
7. You'll see a code block with your Firebase config. **COPY THE ENTIRE BLOCK:**

```javascript
// It will look something like this (with YOUR unique values):
const firebaseConfig = {
  apiKey: "AIzaSyB-YOUR-UNIQUE-KEY-HERE",
  authDomain: "kabutech-hiyas.firebaseapp.com",
  databaseURL: "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kabutech-hiyas",
  storageBucket: "kabutech-hiyas.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};
```

8. Click **Continue to console**

> ⚠️ **CRITICAL:** Copy this config block somewhere safe. You'll paste it to the agent in the next step.

✅

---

## Step 5: Create Test Users

1. Go back to **Build → Authentication** (left sidebar)
2. Click the **Users** tab
3. Click **"Add user"**
4. Enter:
   - Email: **`admin@kabutech.com`**
   - Password: **`kabutech2026`**
5. Click **Add user**
6. Click **"Add user"** again
7. Enter:
   - Email: **`staff@kabutech.com`**
   - Password: **`kabutech2026`**
8. Click **Add user**

You should see 2 users in the list. ✅

---

## Step 6: Set Database Security Rules

1. Go to **Build → Realtime Database** (left sidebar)
2. Click the **"Rules"** tab
3. **Delete everything** in the rules editor
4. Paste this:

```json
{
  "rules": {
    "kabutech": {
      "users": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && (auth.uid === $uid || root.child('kabutech/users/' + auth.uid + '/role').val() === 'admin')"
        }
      },
      "batches": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "tasks": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "logs": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "alerts": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "staffReports": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "settings": {
        ".read": "auth != null",
        ".write": "auth != null && root.child('kabutech/users/' + auth.uid + '/role').val() === 'admin'"
      },
      "sensors": {
        ".read": "auth != null",
        ".write": true
      },
      "controls": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

5. Click **Publish**

✅

---

## Step 7: Give the Config to the Agent

Now paste your Firebase config block (from Step 4) into the chat. It should look like:

```
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "kabutech-hiyas.firebaseapp.com",
  databaseURL: "https://kabutech-hiyas-default-rtdb...",
  projectId: "kabutech-hiyas",
  storageBucket: "kabutech-hiyas.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

**The agent will then automatically:**
1. Create `js/firebase-config.js` with all real-time listeners
2. Add Firebase SDK to `index.html`
3. Replace login/register/logout with Firebase Auth
4. Replace all 8 save functions to write to Firebase
5. Replace staff CRUD to use Firebase user profiles
6. Add online/offline connection badge
7. Test the integration in the browser

---

## ✅ Checklist

| # | Task | Done? |
|---|---|---|
| 1 | Created Firebase project `kabutech-hiyas` | ⬜ |
| 2 | Enabled Email/Password authentication | ⬜ |
| 3 | Created Realtime Database (Singapore) | ⬜ |
| 4 | Registered web app & copied config keys | ⬜ |
| 5 | Created admin@kabutech.com test user | ⬜ |
| 6 | Created staff@kabutech.com test user | ⬜ |
| 7 | Set database security rules | ⬜ |
| 8 | Pasted config keys to the agent | ⬜ |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "Project name already taken" | Add a number: `kabutech-hiyas-2` |
| Can't find "Realtime Database" | Make sure you're clicking "Build" in sidebar, not "All products" |
| Config block doesn't show `databaseURL` | Go to Realtime Database page — copy the URL manually and add it to the config |
| "Permission denied" errors later | Double-check the security rules were published correctly |

---

> **Next:** After you paste the config, the agent handles everything else! 🚀
