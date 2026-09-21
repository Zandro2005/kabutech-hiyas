import React, { useEffect, useRef } from 'react';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { notifyEnvironmentalAlert } from '../utils/PushNotifications';
import { useAuth } from '../context/AuthContext';

// 15-minute cooldown between re-notifying the exact same active alert
const COOLDOWN_MS = 15 * 60 * 1000;

export default function EnvironmentalAlertNotifier() {
  const { user } = useAuth();
  const { unreadAlerts } = useEnvironmentAlerts();
  const lastNotifiedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Only dispatch notifications if a user session is active
    if (!user) return;

    if (!unreadAlerts || unreadAlerts.length === 0) {
      // Clear resolved alerts so they trigger notifications again if re-occurring
      lastNotifiedRef.current.clear();
      return;
    }

    const now = Date.now();
    const currentAlertIds = new Set(unreadAlerts.map(a => a.id));

    // Prune resolved alerts from the tracking map
    for (const id of Array.from(lastNotifiedRef.current.keys())) {
      if (!currentAlertIds.has(id)) {
        lastNotifiedRef.current.delete(id);
      }
    }

    // Process all currently active unread alerts
    unreadAlerts.forEach((alert) => {
      const lastSent = lastNotifiedRef.current.get(alert.id) || 0;
      const isNewAlert = !lastNotifiedRef.current.has(alert.id);
      const isCooldownElapsed = now - lastSent > COOLDOWN_MS;

      if (isNewAlert || isCooldownElapsed) {
        lastNotifiedRef.current.set(alert.id, now);

        const title = alert.title;
        let body = '';

        if (alert.currentValue && alert.targetValue) {
          body = `${alert.metric.toUpperCase()}: ${alert.currentValue} (Target: ${alert.targetValue}). ${alert.action}.`;
        } else if (alert.message) {
          body = `${alert.message} ${alert.action}.`;
        } else {
          body = `${alert.title}. ${alert.action}.`;
        }

        notifyEnvironmentalAlert(title, body, {
          alertId: alert.id,
          metric: alert.metric,
          type: alert.type,
          currentValue: alert.currentValue,
          targetValue: alert.targetValue,
          timestamp: now,
        }).catch((err) => {
          console.log('Failed to dispatch environmental push notification:', err);
        });
      }
    });
  }, [unreadAlerts]);

  return null;
}
