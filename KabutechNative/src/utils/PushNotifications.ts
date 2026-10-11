import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../services/firebase';
import { ref, update, get } from 'firebase/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  let token;
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 800, 300, 800, 300, 800], // 3 long, heavy pulses
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.log('Notification channel error:', e);
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'ed204d84-9356-4c42-8b95-29def6fc864c'
    })).data;
  } catch (e) {
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (err) {
      console.log('Failed to get Expo push token:', err);
      return null;
    }
  }
  
  if (token && userId) {
    // Save token to firebase user profile
    await update(ref(db, `kabutech/users/${userId}`), {
      pushToken: token
    });
  }
  
  return token;
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    channelId: 'default',
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const resData = await response.json();
    console.log('Push notification response:', JSON.stringify(resData, null, 2));
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Notifies all admins in the system with push notifications.
 */
export async function notifyAdmins(title: string, body: string, data = {}) {
  try {
    if (!auth.currentUser) return;
    const usersSnap = await get(ref(db, 'kabutech/users'));
    if (!usersSnap.exists()) return;
    
    const users = usersSnap.val();
    const adminTokens = new Set<string>();

    Object.values(users).forEach((u: any) => {
      if (u && (u.role === 'admin' || !u.role) && u.pushToken) {
        adminTokens.add(u.pushToken);
      }
    });

    for (const token of adminTokens) {
      await sendPushNotification(token, title, body, data);
    }
  } catch (error: any) {
    if (error?.message?.includes('Permission denied') || error?.code === 'PERMISSION_DENIED') {
      return;
    }
    console.warn('Could not broadcast alert to admins:', error?.message);
  }
}

/**
 * Notifies a specific user by userId.
 */
export async function notifyUser(userId: string, title: string, body: string, data = {}) {
  try {
    if (!auth.currentUser) return;
    const userSnap = await get(ref(db, `kabutech/users/${userId}`));
    if (userSnap.exists()) {
      const userData = userSnap.val();
      if (userData && userData.pushToken) {
        await sendPushNotification(userData.pushToken, title, body, data);
      }
    }
  } catch (error: any) {
    if (error?.message?.includes('Permission denied') || error?.code === 'PERMISSION_DENIED') {
      return;
    }
    console.warn(`Could not notify user ${userId}:`, error?.message);
  }
}

/**
 * Schedules an immediate native notification banner on the user's phone.
 */
export async function scheduleLocalNotification(title: string, body: string, data = {}) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data,
      },
      trigger: null, // immediate trigger
    });
  } catch (err) {
    console.log('Error scheduling local notification:', err);
  }
}

// Strict 5-minute cooldown guardrail for environmental alerts
const ENV_NOTIF_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_LAST_ENV_NOTIF = '@kabutech_last_env_notif_time';
let lastEnvNotifMemory = 0;

// Initialize memory cache from AsyncStorage on module load
AsyncStorage.getItem(STORAGE_LAST_ENV_NOTIF)
  .then((val) => {
    if (val) {
      const ts = parseInt(val, 10);
      if (!isNaN(ts)) {
        lastEnvNotifMemory = Math.max(lastEnvNotifMemory, ts);
      }
    }
  })
  .catch(() => {});

/**
 * Notifies all registered users with an environmental alert push notification,
 * and schedules an immediate local notification banner on this device.
 * Enforces a strict 5-minute cooldown to prevent notification flooding.
 */
export async function notifyEnvironmentalAlert(title: string, body: string, data = {}) {
  const now = Date.now();

  // Guardrail 1: In-memory 5-minute cooldown check
  if (now - lastEnvNotifMemory < ENV_NOTIF_COOLDOWN_MS) {
    console.log('[PushNotifications] Cooldown active (memory). Suppressing environmental alert.');
    return;
  }

  // Guardrail 2: Persistent storage 5-minute cooldown check
  try {
    const stored = await AsyncStorage.getItem(STORAGE_LAST_ENV_NOTIF);
    if (stored) {
      const lastStoredTime = parseInt(stored, 10);
      if (!isNaN(lastStoredTime) && now - lastStoredTime < ENV_NOTIF_COOLDOWN_MS) {
        lastEnvNotifMemory = lastStoredTime;
        console.log('[PushNotifications] Cooldown active (storage). Suppressing environmental alert.');
        return;
      }
    }
  } catch (_) {}

  // Update cooldown timestamps immediately to prevent concurrent executions
  lastEnvNotifMemory = now;
  AsyncStorage.setItem(STORAGE_LAST_ENV_NOTIF, String(now)).catch(() => {});

  // Sync to Firebase settings for cross-device awareness
  try {
    update(ref(db, 'kabutech/settings'), {
      lastAlertNotificationTime: now,
    }).catch(() => {});
  } catch (_) {}

  // 1. Immediately trigger native banner on current device
  await scheduleLocalNotification(title, body, data);

  // 2. Broadcast push notification to other users registered in the database
  try {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;

    const usersSnap = await get(ref(db, 'kabutech/users'));
    if (!usersSnap.exists()) return;

    const users = usersSnap.val();
    const tokens = new Set<string>();

    Object.entries(users).forEach(([uid, u]: [string, any]) => {
      // Exclude current user's token so this device doesn't get duplicate remote + local banners
      if (uid !== currentUid && u && u.pushToken) {
        tokens.add(u.pushToken);
      }
    });

    for (const token of tokens) {
      await sendPushNotification(token, title, body, data);
    }
  } catch (error: any) {
    if (error?.message?.includes('Permission denied') || error?.code === 'PERMISSION_DENIED') {
      // User is authenticated but database rules restrict reading global users node
      return;
    }
    console.warn('Could not broadcast environmental push notifications:', error?.message);
  }
}
