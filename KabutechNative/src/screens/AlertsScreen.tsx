import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, update, set, remove } from 'firebase/database';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useAlerts } from '../hooks/useFirebaseData';
import { useEnvironmentAlerts, dismissEnvironmentAlert, dismissAllEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { db } from '../services/firebase';
import { AlertData } from '../types/firebase';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import {
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
} from '../utils/haptics';

type FilterType = 'active' | 'all' | 'critical' | 'warning' | 'resolved';
type SortOption = 'newest' | 'oldest' | 'severity' | 'unresolved';

const SORT_LABELS: Record<SortOption, { label: string; icon: string }> = {
  newest: { label: 'Newest First', icon: 'sort-clock-descending-outline' },
  oldest: { label: 'Oldest First', icon: 'sort-clock-ascending-outline' },
  severity: { label: 'Severity (High → Low)', icon: 'alert-decagram-outline' },
  unresolved: { label: 'Unresolved First', icon: 'format-list-checks' },
};

export default function AlertsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const rawAlerts = useAlerts();
  const { unreadAlerts } = useEnvironmentAlerts();

  const [activeFilter, setActiveFilter] = useState<FilterType>('active');
  const [activeSort, setActiveSort] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Normalize alerts array and seamlessly merge any unread environment alerts with 0ms delay
  const alertsList: AlertData[] = useMemo(() => {
    let list: AlertData[] = [];
    if (Array.isArray(rawAlerts)) {
      list = rawAlerts.filter(Boolean);
    } else if (typeof rawAlerts === 'object' && rawAlerts !== null) {
      list = Object.entries(rawAlerts).map(([key, val]: [string, any]) => ({
        ...val,
        id: val?.id || key,
        firebaseKey: key,
      }));
    }

    // Merge in any active unread environment alerts so there is 0ms delay between banner and subpage
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
  }, [rawAlerts, unreadAlerts]);

  // Counts for tabs & summary
  const counts = useMemo(() => {
    let active = 0;
    let critical = 0;
    let warning = 0;
    let resolved = 0;

    for (const a of alertsList) {
      if (a.resolved) {
        resolved++;
      } else {
        active++;
        if (a.type === 'critical') critical++;
        else if (a.type === 'warning') warning++;
      }
    }

    return { active, critical, warning, resolved, total: alertsList.length };
  }, [alertsList]);

  // Filtered and sorted alerts
  const processedAlerts = useMemo(() => {
    let list = [...alertsList];

    // 1. Text Search Filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        a =>
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.message && a.message.toLowerCase().includes(q)) ||
          (a.type && a.type.toLowerCase().includes(q))
      );
    }

    // 2. Category Tab Filter
    if (activeFilter === 'active') {
      list = list.filter(a => !a.resolved);
    } else if (activeFilter === 'critical') {
      list = list.filter(a => a.type === 'critical');
    } else if (activeFilter === 'warning') {
      list = list.filter(a => a.type === 'warning');
    } else if (activeFilter === 'resolved') {
      list = list.filter(a => a.resolved);
    }

    // 3. Sorting
    list.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

      if (activeSort === 'newest') {
        return timeB - timeA;
      }
      if (activeSort === 'oldest') {
        return timeA - timeB;
      }
      if (activeSort === 'severity') {
        const severityRank = (t: string) => (t === 'critical' ? 3 : t === 'warning' ? 2 : 1);
        const rankDiff = severityRank(b.type) - severityRank(a.type);
        if (rankDiff !== 0) return rankDiff;
        return timeB - timeA;
      }
      if (activeSort === 'unresolved') {
        if (!a.resolved && b.resolved) return -1;
        if (a.resolved && !b.resolved) return 1;
        return timeB - timeA;
      }
      return 0;
    });

    return list;
  }, [alertsList, searchQuery, activeFilter, activeSort]);

  // Bulk Clear / Resolve All Alerts
  const handleClearAll = async () => {
    if (isClearing) return;
    try {
      setIsClearing(true);
      hapticSuccess();
      dismissAllEnvironmentAlerts();

      const updates: Record<string, boolean> = {};
      alertsList.forEach((alert, idx) => {
        const key = alert.firebaseKey || alert.id || String(idx);
        if (!key.startsWith('live-')) {
          updates[`kabutech/alerts/${key}/resolved`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }

      showToast({
        type: 'success',
        text1: 'Alerts Cleared',
        text2: 'All alerts have been marked as resolved.',
        duration: 2500,
      });
    } catch (e) {
      console.error('Failed to clear alerts:', e);
      showToast({
        type: 'error',
        text1: 'Sync Error',
        text2: 'Could not resolve alerts to server.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Resolve Single Alert
  const handleResolveSingle = async (alert: AlertData) => {
    const key = alert.firebaseKey || alert.id;
    if (!key) return;

    try {
      setResolvingId(key);
      hapticMedium();

      if (alert.metadata?.alertId) {
        dismissEnvironmentAlert(String(alert.metadata.alertId));
      } else if (alert.id) {
        dismissEnvironmentAlert(alert.id);
      }

      if (!key.startsWith('live-')) {
        await update(ref(db), {
          [`kabutech/alerts/${key}/resolved`]: true,
          [`kabutech/alerts/${key}/resolvedAt`]: new Date().toISOString(),
        });
      }

      showToast({
        type: 'success',
        text1: 'Alert Resolved',
        text2: `Marked "${alert.title || 'Alert'}" as resolved.`,
      });
    } catch (e) {
      console.error('Failed to resolve alert:', e);
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Could not update alert status.',
      });
    } finally {
      setResolvingId(null);
    }
  };

  // Permanently delete all alert history from Firebase
  const handleDeleteAllHistory = () => {
    if (counts.total === 0) {
      showToast({
        type: 'info',
        text1: 'History Already Empty',
        text2: 'There are no alert records to delete.',
      });
      return;
    }
    Alert.alert(
      'Delete All History?',
      `Are you sure you want to permanently delete all ${counts.total} alert record${counts.total > 1 ? 's' : ''}? This will clear your database to start fresh and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (isDeleting) return;
            try {
              setIsDeleting(true);
              hapticSuccess();
              await remove(ref(db, 'kabutech/alerts'));
              showToast({
                type: 'success',
                text1: 'History Deleted',
                text2: 'All alert records have been permanently cleared.',
                duration: 2500,
              });
            } catch (e) {
              console.error('Failed to purge alerts:', e);
              showToast({
                type: 'error',
                text1: 'Delete Failed',
                text2: 'Could not purge alerts from server.',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Permanently delete a single alert record
  const handleDeleteSingle = async (alert: AlertData) => {
    const key = alert.firebaseKey || alert.id;
    if (!key) return;

    try {
      setDeletingId(key);
      hapticMedium();
      await remove(ref(db, `kabutech/alerts/${key}`));
      showToast({
        type: 'success',
        text1: 'Record Deleted',
        text2: `Deleted "${alert.title || 'Alert'}" from history.`,
      });
    } catch (e) {
      console.error('Failed to delete single alert:', e);
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Could not delete alert record.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Format timestamp into human-readable string
  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Unknown time';
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  const getAlertStyle = (type: string, isResolved: boolean) => {
    if (isResolved) {
      return {
        icon: 'check-circle-outline',
        color: '#10b981',
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        badgeBg: 'bg-emerald-100/60 dark:bg-emerald-950/40',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        badgeLabel: 'RESOLVED',
        border: 'border-slate-200/60 dark:border-slate-800',
      };
    }
    switch (type) {
      case 'critical':
        return {
          icon: 'alert-circle',
          color: '#ef4444',
          bg: 'bg-red-50 dark:bg-red-950/20',
          badgeBg: 'bg-red-100/70 dark:bg-red-950/50',
          badgeText: 'text-red-700 dark:text-red-300',
          badgeLabel: 'CRITICAL',
          border: 'border-red-200/70 dark:border-red-900/40',
        };
      case 'warning':
        return {
          icon: 'alert-outline',
          color: '#f59e0b',
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          badgeBg: 'bg-amber-100/70 dark:bg-amber-950/50',
          badgeText: 'text-amber-800 dark:text-amber-300',
          badgeLabel: 'WARNING',
          border: 'border-amber-200/70 dark:border-amber-900/40',
        };
      default:
        return {
          icon: 'information-outline',
          color: '#3b82f6',
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          badgeBg: 'bg-blue-100/70 dark:bg-blue-950/50',
          badgeText: 'text-blue-700 dark:text-blue-300',
          badgeLabel: 'INFO',
          border: 'border-blue-200/70 dark:border-blue-900/40',
        };
    }
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />

      {/* Modern Top Header */}
      <View
        style={[
          tw`px-4 sm:px-6 pb-3.5 z-10 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/70 dark:border-slate-800`,
          { paddingTop: insets.top > 0 ? insets.top + 8 : 28 },
        ]}
      >
        <View style={tw`flex-row items-center justify-between`}>
          {/* Back Button & Title */}
          <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
            <TouchableOpacity
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              onPress={() => {
                hapticLight();
                navigation.goBack();
              }}
              style={tw`w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200/70 dark:border-slate-700 shadow-sm`}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={isDarkMode ? '#f8fafc' : '#0f172a'}
              />
            </TouchableOpacity>

            <View style={tw`flex-1`}>
              <Text
                numberOfLines={1}
                style={[
                  tw`text-[19px] text-slate-900 dark:text-slate-100 tracking-tight`,
                  { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                ]}
              >
                Alerts & System Logs
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  tw`text-[11.5px] text-slate-400 dark:text-slate-500`,
                  { fontFamily: 'PlusJakartaSans_600SemiBold' },
                ]}
              >
                {counts.active > 0
                  ? `${counts.active} active issue${counts.active > 1 ? 's' : ''} require attention`
                  : 'All monitored parameters nominal'}
              </Text>
            </View>
          </View>

          {/* Header Action: Clear Active & Delete All */}
          <View style={tw`flex-row items-center gap-1.5`}>
            {counts.active > 0 && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleClearAll}
                disabled={isClearing || isDeleting}
                style={tw`px-2.5 py-1.5 rounded-xl bg-emerald-500 active:bg-emerald-600 flex-row items-center gap-1 shadow-sm`}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={13} color="#ffffff" />
                    <Text
                      style={[
                        tw`text-white text-[11px] font-bold`,
                        { fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      Clear
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleDeleteAllHistory}
              disabled={isClearing || isDeleting}
              style={tw`px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex-row items-center gap-1.5 shadow-sm`}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <MaterialCommunityIcons name="trash-can-outline" size={14} color="#ef4444" />
                  <Text
                    style={[
                      tw`text-red-600 dark:text-red-400 text-xs font-bold`,
                      { fontFamily: 'PlusJakartaSans_700Bold' },
                    ]}
                  >
                    Delete History
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats Overview Strip */}
        <View style={tw`flex-row items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80`}>
          <View style={tw`flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-200/50 dark:border-slate-800 flex-row items-center justify-between`}>
            <Text style={[tw`text-[10px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Active
            </Text>
            <Text style={[tw`text-xs ${counts.active > 0 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-500'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {counts.active}
            </Text>
          </View>

          <View style={tw`flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-200/50 dark:border-slate-800 flex-row items-center justify-between`}>
            <Text style={[tw`text-[10px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Critical
            </Text>
            <Text style={[tw`text-xs ${counts.critical > 0 ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-500'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {counts.critical}
            </Text>
          </View>

          <View style={tw`flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 border border-slate-200/50 dark:border-slate-800 flex-row items-center justify-between`}>
            <Text style={[tw`text-[10px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Resolved
            </Text>
            <Text style={[tw`text-xs text-emerald-600 dark:text-emerald-400 font-extrabold`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {counts.resolved}
            </Text>
          </View>

          {/* Sort Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticSelection();
              setIsSortModalVisible(true);
            }}
            style={tw`px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-row items-center gap-1 shrink-0`}
          >
            <MaterialCommunityIcons
              name={SORT_LABELS[activeSort].icon as any}
              size={14}
              color={isDarkMode ? '#38bdf8' : '#0284c7'}
            />
            <Text
              style={[
                tw`text-[10.5px] text-sky-700 dark:text-sky-400 font-bold`,
                { fontFamily: 'PlusJakartaSans_700Bold' },
              ]}
            >
              Sort
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={tw`mt-2.5`}>
          <View
            style={tw`flex-row items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 border border-slate-200/70 dark:border-slate-700`}
          >
            <Ionicons name="search" size={15} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter alerts by title or keyword..."
              placeholderTextColor="#94a3b8"
              style={[
                tw`flex-1 ml-2 text-xs text-slate-800 dark:text-slate-100 py-0.5`,
                { fontFamily: 'PlusJakartaSans_500Medium' },
              ]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`flex-row gap-1.5 pt-2.5`}
        >
          {(
            [
              { key: 'active', label: `Active (${counts.active})` },
              { key: 'all', label: `All (${counts.total})` },
              { key: 'critical', label: `Critical (${counts.critical})` },
              { key: 'warning', label: `Warning (${counts.warning})` },
              { key: 'resolved', label: `Resolved (${counts.resolved})` },
            ] as const
          ).map(tab => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  hapticSelection();
                  setActiveFilter(tab.key);
                }}
                activeOpacity={0.7}
                style={[
                  tw`px-3 py-1 rounded-full border`,
                  isSelected
                    ? tw`bg-slate-900 dark:bg-emerald-500 border-slate-900 dark:border-emerald-500`
                    : tw`bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700`,
                ]}
              >
                <Text
                  style={[
                    tw`text-[11px]`,
                    isSelected
                      ? tw`text-white dark:text-slate-950 font-bold`
                      : tw`text-slate-600 dark:text-slate-300 font-medium`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Alerts Content List */}
      <ScrollView
        contentContainerStyle={tw`p-4 sm:p-5 pb-32 gap-3`}
        showsVerticalScrollIndicator={false}
      >
        {processedAlerts.length === 0 ? (
          <View
            style={tw`items-center justify-center py-16 px-6 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/70 dark:border-slate-800`}
          >
            <View
              style={tw`w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 items-center justify-center mb-3`}
            >
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={32}
                color="#10b981"
              />
            </View>
            <Text
              style={[
                tw`text-[16px] text-slate-800 dark:text-white text-center`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' },
              ]}
            >
              {activeFilter === 'active'
                ? 'All Systems Nominal'
                : 'No Matching Alerts'}
            </Text>
            <Text
              style={[
                tw`text-xs text-slate-400 dark:text-slate-500 text-center mt-1 max-w-[260px]`,
                { fontFamily: 'PlusJakartaSans_500Medium' },
              ]}
            >
              {activeFilter === 'active'
                ? 'No active environmental hazards or hardware failures detected in the chamber.'
                : 'No alerts match your current filter and search query.'}
            </Text>
          </View>
        ) : (
          processedAlerts.map((alert, index) => {
            const style = getAlertStyle(alert.type, alert.resolved);
            const isResolving = resolvingId === (alert.firebaseKey || alert.id);

            return (
              <View
                key={alert.id || alert.firebaseKey || index}
                style={tw`bg-white dark:bg-slate-900 rounded-2xl p-4 border ${style.border} shadow-sm`}
              >
                <View style={tw`flex-row items-start gap-3`}>
                  {/* Left Severity Icon */}
                  <View
                    style={tw`w-9 h-9 rounded-xl ${style.bg} items-center justify-center shrink-0 mt-0.5`}
                  >
                    <MaterialCommunityIcons
                      name={style.icon as any}
                      size={20}
                      color={style.color}
                    />
                  </View>

                  {/* Center Content */}
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center justify-between gap-2 mb-1`}>
                      <Text
                        numberOfLines={1}
                        style={[
                          tw`text-[14px] text-slate-900 dark:text-slate-100 flex-1`,
                          { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                        ]}
                      >
                        {alert.title || 'System Notification'}
                      </Text>
                      {/* Badge */}
                      <View
                        style={tw`px-2 py-0.5 rounded-full ${style.badgeBg} shrink-0`}
                      >
                        <Text
                          style={[
                            tw`text-[9px] ${style.badgeText}`,
                            { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                          ]}
                        >
                          {style.badgeLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Message Body */}
                    <Text
                      style={[
                        tw`text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2`,
                        { fontFamily: 'PlusJakartaSans_500Medium' },
                      ]}
                    >
                      {alert.message || 'Environmental parameter deviation detected.'}
                    </Text>

                    {/* Footer Row: Timestamp + Action */}
                    <View style={tw`flex-row items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800`}>
                      <View style={tw`flex-row items-center gap-1.5`}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={12}
                          color="#94a3b8"
                        />
                        <Text
                          style={[
                            tw`text-[10px] text-slate-400 dark:text-slate-500`,
                            { fontFamily: 'PlusJakartaSans_600SemiBold' },
                          ]}
                        >
                          {formatTimestamp(alert.timestamp)}
                        </Text>
                      </View>

                      {/* Resolve Action Button for Active Alerts */}
                      {!alert.resolved ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleResolveSingle(alert)}
                          disabled={isResolving}
                          style={tw`px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex-row items-center gap-1`}
                        >
                          {isResolving ? (
                            <ActivityIndicator size="small" color="#10b981" />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="#10b981"
                              />
                              <Text
                                style={[
                                  tw`text-[10.5px] text-emerald-700 dark:text-emerald-400 font-bold`,
                                  { fontFamily: 'PlusJakartaSans_700Bold' },
                                ]}
                              >
                                Resolve
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={tw`flex-row items-center gap-2`}>
                          <View style={tw`flex-row items-center gap-1`}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#10b981"
                            />
                            <Text
                              style={[
                                tw`text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold`,
                                { fontFamily: 'PlusJakartaSans_600SemiBold' },
                              ]}
                            >
                              Resolved
                            </Text>
                          </View>
                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => handleDeleteSingle(alert)}
                            disabled={deletingId === (alert.firebaseKey || alert.id)}
                            style={tw`p-1 rounded-md bg-slate-100 dark:bg-slate-800`}
                          >
                            {deletingId === (alert.firebaseKey || alert.id) ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <MaterialCommunityIcons name="trash-can-outline" size={13} color="#94a3b8" />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Bottom Permanent Delete All History Button */}
        {counts.total > 0 && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleDeleteAllHistory}
            disabled={isDeleting}
            style={tw`flex-row items-center justify-center gap-2 p-3.5 bg-red-50 dark:bg-red-950/20 active:bg-red-100 dark:active:bg-red-950/40 rounded-2xl border border-red-200/80 dark:border-red-900/40 mt-1`}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
                <Text style={[tw`text-[12px] text-red-600 dark:text-red-400 font-bold`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Delete All Alert History ({counts.total})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sort Options Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
          style={tw`flex-1 bg-black/50 justify-end sm:justify-center sm:items-center sm:p-4`}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={tw`bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] p-5 w-full sm:max-w-md border-t sm:border border-slate-200 dark:border-slate-800 shadow-xl`}
          >
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View style={tw`flex-row items-center gap-2.5`}>
                <View
                  style={tw`w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 items-center justify-center`}
                >
                  <MaterialCommunityIcons
                    name="sort-variant"
                    size={18}
                    color="#0284c7"
                  />
                </View>
                <Text
                  style={[
                    tw`text-[16px] text-slate-900 dark:text-white`,
                    { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  ]}
                >
                  Sort Alerts By
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSortModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDarkMode ? '#94a3b8' : '#64748b'}
                />
              </TouchableOpacity>
            </View>

            <View style={tw`gap-2 mb-2`}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map(key => {
                const isSelected = activeSort === key;
                const item = SORT_LABELS[key];
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticSelection();
                      setActiveSort(key);
                      setIsSortModalVisible(false);
                    }}
                    style={[
                      tw`flex-row items-center justify-between p-3.5 rounded-xl border`,
                      isSelected
                        ? tw`bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700`
                        : tw`bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800`,
                    ]}
                  >
                    <View style={tw`flex-row items-center gap-3`}>
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={20}
                        color={isSelected ? '#0284c7' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          tw`text-[13px] ${
                            isSelected
                              ? 'text-sky-900 dark:text-sky-200 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`,
                          { fontFamily: 'PlusJakartaSans_700Bold' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#0284c7"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
