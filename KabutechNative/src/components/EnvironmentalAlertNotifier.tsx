import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { notifyEnvironmentalAlert, ensureNotificationChannels } from '../utils/PushNotifications';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useFirebaseData';
import { db } from '../services/firebase';
import { ref, update, push, set } from 'firebase/database';

// Instant notification dispatch without cooldown delay
const LEGACY_STORAGE_KEY = '@kabutech_last_env_notif_time';

export default function EnvironmentalAlertNotifier() {
  const { user } = useAuth();
  const rawAlerts = useAlerts();
  const { activeAlerts, unreadAlerts } = useEnvironmentAlerts();

  // Track which active alert IDs have already been notified during their current incident
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());
  const lastAlertLoggedRef = useRef<Map<string, number>>(new Map());
  const clearedTrackerRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef<number>(Date.now());
  const [ticker, setTicker] = useState<number>(0);

  // Normalize Firebase alerts
  const alertsList = Array.isArray(rawAlerts)
    ? rawAlerts.filter(Boolean)
    : typeof rawAlerts === 'object' && rawAlerts !== null
    ? Object.entries(rawAlerts).map(([key, val]: [string, any]) => ({
        ...val,
        id: val?.id || key,
        firebaseKey: key,
      }))
    : [];

  // Initialize notification channels & clear any legacy global cooldown key on mount
  useEffect(() => {
    ensureNotificationChannels().catch(() => {});
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
  }, []);

  // Periodic heartbeat every 15 seconds to re-evaluate conditions and cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // 1. Automatically record active environmental anomalies to Firebase kabutech/alerts & auto-resolve when normal
  useEffect(() => {
    if (!user) return;

    const elapsed = Date.now() - mountedAtRef.current;
    if (elapsed < 2000) {
      const bootTimer = setTimeout(() => setTicker((t) => t + 1), 2000 - elapsed + 50);
      return () => clearTimeout(bootTimer);
    }

    const now = Date.now();

    // A. Log new active anomalies to Firebase
    if (unreadAlerts && unreadAlerts.length > 0) {
      unreadAlerts.forEach((alert) => {
        const alreadyInDb = alertsList.some(
          (a) => !a.resolved && (a.metadata?.alertId === alert.id || a.title === alert.title)
        );

        const lastLogged = lastAlertLoggedRef.current.get(alert.id) || 0;
        if (!alreadyInDb && now - lastLogged > 45000) {
          lastAlertLoggedRef.current.set(alert.id, now);
          const alertsRef = ref(db, 'kabutech/alerts');
          const newRef = push(alertsRef);
          set(newRef, {
            id: newRef.key,
            title: alert.title,
            type: alert.type,
            message: alert.message,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata: {
              alertId: alert.id,
              metric: alert.metric,
              currentValue: alert.currentValue || '',
              targetValue: alert.targetValue || '',
            },
          }).catch((err) => console.log('Error logging alert to Firebase:', err));
        }
      });
    }

    // B. Auto-resolve in Firebase once environmental conditions have sustained normal (> 20s)
    const activeIds = new Set((activeAlerts || []).map((a) => a.id));
    alertsList.forEach((fbAlert) => {
      if (!fbAlert || fbAlert.resolved) return;
      const alertId = fbAlert.metadata?.alertId as string | undefined;
      if (alertId && !activeIds.has(alertId)) {
        const clearedSince = clearedTrackerRef.current.get(alertId);
        if (!clearedSince) {
          clearedTrackerRef.current.set(alertId, now);
        } else if (now - clearedSince > 20000) {
          clearedTrackerRef.current.delete(alertId);
          const key = fbAlert.firebaseKey || fbAlert.id;
          update(ref(db, `kabutech/alerts/${key}`), {
            resolved: true,
            resolvedAt: new Date().toISOString(),
            autoResolved: true,
          }).catch(() => {});
        }
      } else if (alertId && activeIds.has(alertId)) {
        clearedTrackerRef.current.delete(alertId);
      }
    });

    // C. Re-arm notification tracker immediately for any alert that has cleared
    for (const notifiedId of Array.from(notifiedAlertIdsRef.current)) {
      if (!activeIds.has(notifiedId)) {
        notifiedAlertIdsRef.current.delete(notifiedId);
      }
    }
  }, [activeAlerts, unreadAlerts, alertsList, user, ticker]);

  // 2. Dispatch Push & Local Heads-Up Notifications Instantly for Active Unread Alerts
  useEffect(() => {
    if (!user) return;

    // Prune any resolved alert IDs so future occurrences trigger immediately
    const currentUnreadIds = new Set((unreadAlerts || []).map((a) => a.id));
    for (const notifiedId of Array.from(notifiedAlertIdsRef.current)) {
      if (!currentUnreadIds.has(notifiedId)) {
        notifiedAlertIdsRef.current.delete(notifiedId);
      }
    }

    if (!unreadAlerts || unreadAlerts.length === 0) {
      return;
    }

    // Find all unread alerts that arrived and haven't been notified yet
    const pendingAlerts = unreadAlerts.filter((a) => !notifiedAlertIdsRef.current.has(a.id));
    if (pendingAlerts.length === 0) {
      return;
    }

    // Immediately mark as notified to avoid duplicate calls during ongoing condition
    pendingAlerts.forEach((a) => {
      notifiedAlertIdsRef.current.add(a.id);
    });

    // Prioritize critical alerts first, then warning
    const criticalAlert = pendingAlerts.find((a) => a.type === 'critical');
    const primaryAlert = criticalAlert || pendingAlerts[0];

    // Clean title with all emojis/icons removed
    const rawTitle = primaryAlert.title || 'System Alert';
    const cleanTitle = rawTitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const otherCount = pendingAlerts.length - 1;
    const title = otherCount > 0 ? `${cleanTitle} (+${otherCount} more)` : cleanTitle;

    // Straight-to-the-point description highlighting only the main problem
    let body = '';
    if (primaryAlert.currentValue && primaryAlert.targetValue) {
      body = `${primaryAlert.currentValue} (Target: ${primaryAlert.targetValue})`;
    } else if (primaryAlert.action) {
      body = primaryAlert.action;
    } else if (primaryAlert.message) {
      body = primaryAlert.message.split('.')[0].trim();
    } else {
      body = cleanTitle;
    }

    // Fire up instantly with 0 delay the moment the issue arrives
    notifyEnvironmentalAlert(title, body, {
      alertId: primaryAlert.id,
      metric: primaryAlert.metric,
      type: primaryAlert.type,
      currentValue: primaryAlert.currentValue,
      targetValue: primaryAlert.targetValue,
      totalAlerts: unreadAlerts.length,
      timestamp: Date.now(),
    }).catch((err) => {
      console.log('Failed to dispatch environmental push notification:', err);
    });
  }, [unreadAlerts, user]);

  return null;
}
