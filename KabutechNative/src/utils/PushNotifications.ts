import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../services/firebase';
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
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 300, 800, 300, 800], // 3 long, heavy pulses
      lightColor: '#FF231F7C',
    });
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
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

/**
 * Notifies a specific user by userId.
 */
export async function notifyUser(userId: string, title: string, body: string, data = {}) {
  try {
    const userSnap = await get(ref(db, `kabutech/users/${userId}`));
    if (userSnap.exists()) {
      const userData = userSnap.val();
      if (userData && userData.pushToken) {
        await sendPushNotification(userData.pushToken, title, body, data);
      }
    }
  } catch (error) {
    console.error(`Error notifying user ${userId}:`, error);
  }
}
