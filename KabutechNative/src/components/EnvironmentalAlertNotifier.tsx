import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { notifyEnvironmentalAlert } from '../utils/PushNotifications';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useFirebaseData';
import { db } from '../services/firebase';
import { ref, update } from 'firebase/database';

// Strict 5-minute cooldown between environmental push notifications
const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_LAST_NOTIFIED_KEY = '@kabutech_last_env_notif_time';

export default function EnvironmentalAlertNotifier() {
  const { user } = useAuth();
  const settings = useSettings();
  const { unreadAlerts } = useEnvironmentAlerts();

  const lastGlobalNotifiedRef = useRef<number>(0);
  const lastAlertNotifiedRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef<number>(Date.now());
  const [ticker, setTicker] = useState<number>(0);

  // Load last notified timestamp from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_LAST_NOTIFIED_KEY)
      .then((val) => {
        if (val) {
          const timestamp = parseInt(val, 10);
          if (!isNaN(timestamp)) {
            lastGlobalNotifiedRef.current = Math.max(lastGlobalNotifiedRef.current, timestamp);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Periodic heartbeat every 30 seconds to re-evaluate conditions even if sensor data is steady
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Only dispatch notifications if an authenticated user session is active
    if (!user) return;

    // Grace period of 5 seconds on initial mount to allow sensor values and dismissed states to stabilize
    if (Date.now() - mountedAtRef.current < 5000) return;

    // If there are no unread alerts, do nothing.
    // CRITICAL: DO NOT clear or reset timestamps here! Clearing timestamps on temporary
    // sensor fluctuation causes notification flapping ("flooping").
    if (!unreadAlerts || unreadAlerts.length === 0) {
      return;
    }

    const now = Date.now();

    // Check shared Firebase timestamp from other devices
    const remoteFirebaseTime = typeof settings?.lastAlertNotificationTime === 'number'
      ? settings.lastAlertNotificationTime
      : 0;

    // Check most recent notification time across memory, local storage, and remote devices
    const lastNotifiedTime = Math.max(
      lastGlobalNotifiedRef.current,
      remoteFirebaseTime
    );

    // Strict 5-minute global cooldown: only notify once every 5 minutes
    if (now - lastNotifiedTime < COOLDOWN_MS) {
      return;
    }

    // Select the highest priority alert (critical first, then warning)
    const criticalAlert = unreadAlerts.find((a) => a.type === 'critical');
    const primaryAlert = criticalAlert || unreadAlerts[0];

    // Check per-alert cooldown to prevent re-notifying the same issue prematurely
    const lastPrimaryAlertTime = lastAlertNotifiedRef.current.get(primaryAlert.id) || 0;
    if (now - lastPrimaryAlertTime < COOLDOWN_MS) {
      return;
    }

    // Build consolidated notification content (always ONE notification even if multiple issues exist)
    const otherCount = unreadAlerts.length - 1;
    let title = primaryAlert.title;
    if (otherCount > 0) {
      title = `⚠️ ${primaryAlert.title} (+${otherCount} other issue${otherCount > 1 ? 's' : ''})`;
    }

    let body = '';
    if (primaryAlert.currentValue && primaryAlert.targetValue) {
      body = `${primaryAlert.metric.toUpperCase()}: ${primaryAlert.currentValue} (Target: ${primaryAlert.targetValue}). ${primaryAlert.action}.`;
    } else if (primaryAlert.message) {
      body = `${primaryAlert.message} ${primaryAlert.action}.`;
    } else {
      body = `${primaryAlert.title}. ${primaryAlert.action}.`;
    }

    if (otherCount > 0) {
      body += ` Multiple environmental anomalies detected.`;
    }

    // Update cooldown records BEFORE dispatching to prevent racing
    lastGlobalNotifiedRef.current = now;
    lastAlertNotifiedRef.current.set(primaryAlert.id, now);
    AsyncStorage.setItem(STORAGE_LAST_NOTIFIED_KEY, String(now)).catch(() => {});

    // Sync to Firebase settings for cross-device coordination
    try {
      update(ref(db, 'kabutech/settings'), {
        lastAlertNotificationTime: now,
      }).catch(() => {});
    } catch (_) {}

    // Clean up very old entries (> 30 mins) from map so memory remains bounded
    for (const [id, time] of lastAlertNotifiedRef.current.entries()) {
      if (now - time > 30 * 60 * 1000) {
        lastAlertNotifiedRef.current.delete(id);
      }
    }

    // Dispatch the notification
    notifyEnvironmentalAlert(title, body, {
      alertId: primaryAlert.id,
      metric: primaryAlert.metric,
      type: primaryAlert.type,
      currentValue: primaryAlert.currentValue,
      targetValue: primaryAlert.targetValue,
      totalAlerts: unreadAlerts.length,
      timestamp: now,
    }).catch((err) => {
      console.log('Failed to dispatch environmental push notification:', err);
    });
  }, [unreadAlerts, settings?.lastAlertNotificationTime, user, ticker]);

  return null;
}
