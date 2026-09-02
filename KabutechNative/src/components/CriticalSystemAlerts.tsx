import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { AlertData } from '../types/firebase';
import { hapticSelection } from '../utils/haptics';

interface Props {
  alerts: AlertData[];
  onAlertPress?: (alert: AlertData) => void;
}

export default React.memo(function CriticalSystemAlerts({ alerts, onAlertPress }: Props) {
  const { isDarkMode } = useTheme();
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const isAllClear = unresolvedAlerts.length === 0;

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
          icon: 'alert-circle',
          color: '#ef4444',
          bg: 'bg-rose-50 dark:bg-rose-500/15',
          border: 'border-slate-200/60 dark:border-slate-800',
          textColor: 'text-rose-600 dark:text-rose-400',
        };
      case 'warning':
        return {
          icon: 'alert',
          color: '#f59e0b',
          bg: 'bg-amber-50 dark:bg-amber-500/15',
          border: 'border-slate-200/60 dark:border-slate-800',
          textColor: 'text-amber-600 dark:text-amber-400',
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
        {/* Section Header */}
        <View style={tw`flex-row justify-between items-center ${isAllClear ? '' : 'mb-3'}`}>
          <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
            <View
              style={tw`w-8 h-8 rounded-xl ${
                isAllClear ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-rose-50 dark:bg-rose-500/15'
              } items-center justify-center shrink-0`}
            >
              <MaterialCommunityIcons
                name={isAllClear ? 'shield-check-outline' : 'alert-circle-outline'}
                size={18}
                color={isAllClear ? '#10b981' : '#ef4444'}
              />
            </View>
            <View style={tw`flex-1`}>
              <Text numberOfLines={1} style={[tw`text-[13px] text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                System Guard & Alerts
              </Text>
              <Text numberOfLines={1} style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                {isAllClear ? 'All sensors nominal • No active hazards' : 'Active alerts require attention'}
              </Text>
            </View>
          </View>

          {/* Status Pill */}
          <View
            style={[
              tw`flex-row items-center px-2.5 py-1 rounded-full shrink-0 border`,
              isAllClear
                ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60`
                : tw`bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60`
            ]}
          >
            <View
              style={[
                tw`w-1.5 h-1.5 rounded-full mr-1.5`,
                { backgroundColor: isAllClear ? '#10b981' : '#ef4444' }
              ]}
            />
            <Text
              style={[
                tw`text-[9.5px] uppercase tracking-wider ${
                  isAllClear ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' }
              ]}
            >
              {isAllClear ? 'Nominal' : `${unresolvedAlerts.length} Active`}
            </Text>
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
                  onPress={() => {
                    hapticSelection();
                    onAlertPress?.(alert);
                  }}
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
      </View>
    </View>
  );
});
