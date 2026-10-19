import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { AlertData } from '../types/firebase';
import { useEnvironmentAlerts, dismissEnvironmentAlert, dismissAllEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { hapticLight, hapticSelection, hapticSuccess } from '../utils/haptics';
import { ref, set, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from './CustomToast';

interface Props {
  alerts: AlertData[];
  onAlertPress?: (alert: AlertData) => void;
}

export default React.memo(function CriticalSystemAlerts({ alerts, onAlertPress }: Props) {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();
  const [isClearing, setIsClearing] = useState(false);
  const { unreadAlerts } = useEnvironmentAlerts();

  // Normalize alerts array and merge active environment alerts with 0ms delay
  const rawList = useMemo(() => {
    let list: AlertData[] = [];
    if (Array.isArray(alerts)) {
      list = alerts.filter(Boolean);
    } else if (typeof alerts === 'object' && alerts !== null) {
      list = Object.entries(alerts).map(([key, val]: [string, any]) => ({
        ...val,
        id: val?.id || key,
        firebaseKey: key,
      }));
    }

    if (unreadAlerts && unreadAlerts.length > 0) {
      for (const envAlert of unreadAlerts) {
        const alreadyListed = list.some(
          (a) => !a.resolved && (a.metadata?.alertId === envAlert.id || a.title === envAlert.title)
        );
        if (!alreadyListed) {
          list.unshift({
            id: envAlert.id,
            firebaseKey: `live-${envAlert.id}`,
            title: envAlert.title,
            type: envAlert.type,
            message: envAlert.message,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata: {
              alertId: envAlert.id,
              metric: envAlert.metric,
              currentValue: envAlert.currentValue || '',
              targetValue: envAlert.targetValue || '',
            },
          });
        }
      }
    }

    return list;
  }, [alerts, unreadAlerts]);

  // Filter only genuine, active alerts from the last 24 hours, deduplicated
  const unresolvedAlerts = useMemo(() => {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const alertMap = new Map<string, AlertData>();
    
    for (const a of rawList) {
      if (!a || a.resolved) continue;
      
      // If timestamp exists, enforce 24-hour recency window (stale alerts > 24h are archived)
      if (a.timestamp) {
        const time = new Date(a.timestamp).getTime();
        if (!isNaN(time) && (now - time > TWENTY_FOUR_HOURS || time - now > 300_000)) {
          continue;
        }
      }
      
      const key = `${a.type || 'warning'}-${a.title || a.message || 'alert'}`;
      const existing = alertMap.get(key);
      if (!existing) {
        alertMap.set(key, a);
      } else {
        const existingTime = existing.timestamp ? new Date(existing.timestamp).getTime() : 0;
        const thisTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        if (thisTime > existingTime) {
          alertMap.set(key, a);
        }
      }
    }
    
    return Array.from(alertMap.values()).sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [rawList]);

  const isAllClear = unresolvedAlerts.length === 0;

  const handleOpenAlerts = () => {
    hapticSelection();
    if (onAlertPress) {
      onAlertPress(unresolvedAlerts[0] || ({} as AlertData));
    } else {
      navigation.navigate('Alerts');
    }
  };

  // Resolve and clear all alerts in Firebase
  const handleClearAll = async () => {
    if (isClearing) return;
    try {
      setIsClearing(true);
      hapticSuccess();
      dismissAllEnvironmentAlerts();
      
      const updates: Record<string, any> = {};
      rawList.forEach((a, idx) => {
        const key = a.firebaseKey || a.id || String(idx);
        if (!key.startsWith('live-')) {
          updates[`kabutech/alerts/${key}/resolved`] = true;
          updates[`kabutech/alerts/${key}/resolvedAt`] = new Date().toISOString();
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }

      showToast({
        type: 'success',
        text1: 'Alerts Resolved',
        text2: 'All active hazard warnings have been cleared.',
        duration: 2500,
      });
    } catch (e) {
      console.error('Failed to resolve alerts:', e);
      showToast({
        type: 'error',
        text1: 'Sync Error',
        text2: 'Could not resolve alerts to server.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          icon: 'alert-circle-outline',
          color: '#ea580c',
          bg: 'bg-amber-50 dark:bg-amber-500/15',
          border: 'border-slate-200/60 dark:border-slate-800',
          textColor: 'text-amber-800 dark:text-amber-300',
        };
      case 'warning':
        return {
          icon: 'alert-outline',
          color: '#f59e0b',
          bg: 'bg-amber-50 dark:bg-amber-500/15',
          border: 'border-slate-200/60 dark:border-slate-800',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      default:
        return {
          icon: 'information-outline',
          color: '#3b82f6',
          bg: 'bg-blue-50 dark:bg-blue-500/15',
          border: 'border-slate-200/60 dark:border-slate-800',
          textColor: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  return (
    <View style={tw`px-5 sm:px-6 pt-6`}>
      <View
        style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-800`}
      >
        {/* Section Header (Clickable to open subpage) */}
        <View style={tw`flex-row justify-between items-center ${isAllClear ? '' : 'mb-3'}`}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenAlerts}
            style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}
          >
            <View
              style={tw`w-8 h-8 rounded-xl ${
                isAllClear ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-amber-50 dark:bg-amber-500/15'
              } items-center justify-center shrink-0`}
            >
              <MaterialCommunityIcons
                name={isAllClear ? 'shield-check-outline' : 'alert-circle-outline'}
                size={18}
                color={isAllClear ? '#10b981' : '#d97706'}
              />
            </View>
            <View style={tw`flex-1`}>
              <View style={tw`flex-row items-center gap-1`}>
                <Text numberOfLines={1} style={[tw`text-[13px] text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  System Guard & Alerts
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
              </View>
              <Text numberOfLines={1} style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                {isAllClear ? 'All sensors nominal • Tap for history' : 'Active alerts require attention'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Row: Clear All Button & Status Pill */}
          <View style={tw`flex-row items-center gap-2`}>
            {!isAllClear && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleClearAll}
                disabled={isClearing}
                style={tw`px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-row items-center gap-1`}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={12} color="#10b981" />
                    <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-300 font-bold`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Clear
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleOpenAlerts}
              style={[
                tw`flex-row items-center px-2.5 py-1 rounded-full shrink-0 border`,
                isAllClear
                  ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60`
                  : tw`bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60`
              ]}
            >
              <View
                style={[
                  tw`w-1.5 h-1.5 rounded-full mr-1.5`,
                  { backgroundColor: isAllClear ? '#10b981' : '#f59e0b' }
                ]}
              />
              <Text
                style={[
                  tw`text-[9.5px] uppercase tracking-wider ${
                    isAllClear ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300'
                  }`,
                  { fontFamily: 'PlusJakartaSans_800ExtraBold' }
                ]}
              >
                {isAllClear ? 'Nominal' : `${unresolvedAlerts.length} Active`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content for active alerts */}
        {!isAllClear && (
          <View style={tw`gap-2.5 mt-3`}>
            {unresolvedAlerts.slice(0, 3).map((alert, idx) => {
              const badge = getAlertBadge(alert.type);
              return (
                <TouchableOpacity
                  key={alert.id || idx}
                  activeOpacity={0.75}
                  onPress={handleOpenAlerts}
                  style={tw`bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 sm:p-3.5 border ${badge.border} flex-row items-start gap-3`}
                >
                  <View style={tw`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${badge.bg} items-center justify-center mt-0.5 shrink-0`}>
                    <MaterialCommunityIcons name={badge.icon as any} size={16} color={badge.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row justify-between items-center mb-0.5`}>
                      <Text numberOfLines={1} style={[tw`text-xs text-slate-900 dark:text-white flex-1 mr-2`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                        {alert.title || 'System Alert'}
                      </Text>
                      {alert.timestamp && (
                        <Text style={[tw`text-[9px] text-slate-400 shrink-0`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                          {formatTimestamp(alert.timestamp)}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[tw`text-[11px] text-slate-500 dark:text-slate-400 leading-tight`, { fontFamily: 'PlusJakartaSans_500Medium' }]}
                      numberOfLines={2}
                    >
                      {alert.message || 'Action required to restore optimal balance.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#94a3b8" style={tw`self-center shrink-0`} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Footer Link to Dedicated Alerts Subpage */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenAlerts}
          style={tw`flex-row items-center justify-between pt-3 ${isAllClear ? 'mt-2 border-t border-slate-100 dark:border-slate-800/80' : 'mt-2.5 border-t border-slate-100 dark:border-slate-800'}`}
        >
          <View style={tw`flex-row items-center gap-1.5`}>
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={13}
              color={isDarkMode ? '#38bdf8' : '#0284c7'}
            />
            <Text
              style={[
                tw`text-[11px] text-sky-700 dark:text-sky-400 font-bold`,
                { fontFamily: 'PlusJakartaSans_700Bold' },
              ]}
            >
              {isAllClear
                ? 'Open Alerts Center & Logs'
                : `View All Alerts & Logs (${rawList.length})`}
            </Text>
          </View>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={isDarkMode ? '#38bdf8' : '#0284c7'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});
