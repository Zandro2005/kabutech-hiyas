import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db, auth } from '../services/firebase';
import { ref, update, get } from 'firebase/database';

export const ALERT_CHANNEL_ID = 'kabutech-alerts';

// Per-alert deduplication tracker so foreground local banner + remote push don't double-fire the same alertId,
// while allowing multiple DIFFERENT alerts (e.g. Temp + Hum + CO2) to fire simultaneously with 0ms delay!
const recentAlertDispatchMap = new Map<string, number>();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification?.request?.content?.data as any;
    const alertId = data?.alertId ? String(data.alertId) : '';
    const source = data?.source ? String(data.source) : '';

    // If this is a remote push arriving while the app is open in foreground,
    // check if EnvironmentalAlertNotifier already displayed the local banner for this alertId within 8s
    if (source === 'esp32' && alertId) {
      const lastLocal = recentAlertDispatchMap.get(alertId) || 0;
      if (Date.now() - lastLocal < 8000) {
        return {
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      }
      recentAlertDispatchMap.set(alertId, Date.now());
    }

    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

let channelsInitialized = false;

/**
 * Ensures high-priority Android notification channels exist before scheduling or receiving alerts.
 */
export async function ensureNotificationChannels() {
  if (Platform.OS !== 'android' || channelsInitialized) return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
      name: 'Chamber Environmental Alerts',
      description: 'Critical mushroom chamber environmental and hardware alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 300, 800, 300, 800],
      lightColor: '#ef4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    channelsInitialized = true;
  } catch (e) {
    console.log('Notification channel error:', e);
  }
}

export async function registerForPushNotificationsAsync(userId: string) {
  let token;
  if (Platform.OS === 'android') {
    await ensureNotificationChannels();
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
    // 1. Save token to firebase user profile
    await update(ref(db, `kabutech/users/${userId}`), {
      pushToken: token
    }).catch(() => {});

    // 2. Save token to shared setpoints/pushTokens node so the ESP32-S3 hardware controller
    // can send 24/7 remote push notifications directly to this phone even when the app is completely closed!
    await update(ref(db, `kabutech/settings/setpoints/pushTokens`), {
      [userId]: token
    }).catch(() => {});
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
    channelId: ALERT_CHANNEL_ID,
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
    await ensureNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500],
          color: '#10b981',
          data,
        },
        trigger: Platform.OS === 'android' ? { channelId: ALERT_CHANNEL_ID } : null,
      });
    } catch (_) {
      // Fallback for platforms/environments expecting null trigger
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data,
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.log('Error scheduling local notification:', err);
  }
}

/**
 * Immediately triggers a native local notification banner on this device,
 * and broadcasts a remote push notification to other registered devices.
 * Per-alert deduplication allows multiple distinct alerts to fire simultaneously at 0ms delay.
 */
export async function notifyEnvironmentalAlert(title: string, body: string, data: any = {}) {
  const now = Date.now();
  const alertKey = data?.alertId ? String(data.alertId) : `${title}:${body}`;
  const lastDispatched = recentAlertDispatchMap.get(alertKey) || 0;

  // Per-alert 300ms deduplication guard: prevents duplicate render ticks for the SAME alert
  // while allowing every DIFFERENT alert to fire simultaneously with 0ms delay!
  if (now - lastDispatched < 300) {
    return;
  }
  recentAlertDispatchMap.set(alertKey, now);

  // 1. Immediately trigger native heads-up banner on current device
  await scheduleLocalNotification(title, body, data);

  // 2. Broadcast push notification to other registered devices (from setpoints/pushTokens and users)
  try {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const tokens = new Set<string>();

    // Check shared pushTokens node first (fast & accessible to all roles)
    try {
      const tokensSnap = await get(ref(db, 'kabutech/settings/setpoints/pushTokens'));
      if (tokensSnap.exists()) {
        const tokenMap = tokensSnap.val();
        if (tokenMap && typeof tokenMap === 'object') {
          Object.entries(tokenMap).forEach(([uid, tok]: [string, any]) => {
            if (uid !== currentUid && typeof tok === 'string' && tok.startsWith('ExponentPushToken')) {
              tokens.add(tok);
            }
          });
        }
      }
    } catch (_) {}

    // Also check users node if accessible
    try {
      const usersSnap = await get(ref(db, 'kabutech/users'));
      if (usersSnap.exists()) {
        const users = usersSnap.val();
        Object.entries(users).forEach(([uid, u]: [string, any]) => {
          if (uid !== currentUid && u && u.pushToken) {
            tokens.add(u.pushToken);
          }
        });
      }
    } catch (_) {}

    for (const token of tokens) {
      await sendPushNotification(token, title, body, data);
    }
  } catch (error: any) {
    if (error?.message?.includes('Permission denied') || error?.code === 'PERMISSION_DENIED') {
      return;
    }
    console.warn('Could not broadcast environmental push notifications:', error?.message);
  }
}
