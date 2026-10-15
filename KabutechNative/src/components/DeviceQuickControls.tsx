import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { hapticMedium, hapticSelection } from '../utils/haptics';
import { showToast } from './CustomToast';
import { DeviceActivityExplanation } from '../utils/scheduleLogic';

interface Props {
  isAuto: boolean;
  isScheduled?: boolean;
  isDarkMode: boolean;
  fansActive: boolean;
  misterActive: boolean;
  lightActive: boolean;
  valveActive?: boolean;
  toggleDevice: (device: 'fans' | 'misters' | 'lights' | 'co2', currentState: boolean) => void;
  activities: DeviceActivityExplanation[];
  readOnly?: boolean;
}

export default React.memo(function DeviceQuickControls({
  isAuto,
  isScheduled = false,
  isDarkMode,
  fansActive,
  misterActive,
  lightActive,
  valveActive = false,
  toggleDevice,
  activities = [],
  readOnly = false,
}: Props) {
  const isLocked = isAuto || isScheduled;

  const handleDevicePress = (key: 'fans' | 'misters' | 'lights' | 'co2', active: boolean, label: string) => {
    if (readOnly) return;
    if (isLocked) {
      hapticSelection();
      showToast({
        type: 'info',
        text1: `${isAuto ? 'Auto' : 'Scheduled'} Mode Active`,
        text2: `Switch to Manual Mode in Controls to adjust ${label}.`,
        duration: 3000,
      });
      return;
    }
    hapticMedium();
    toggleDevice(key, active);
  };

  const devices = [
    { key: 'fans' as const, label: 'Fans', active: fansActive, icon: 'fan' as const },
    { key: 'misters' as const, label: 'Mister', active: misterActive, icon: 'water' as const },
    { key: 'lights' as const, label: 'Lights', active: lightActive, icon: 'lightbulb-on' as const },
    { key: 'co2' as const, label: 'Valve', active: valveActive, icon: 'valve' as const },
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-3 pb-1`}>
      {/* 1. Four Interactive Circular Device Pucks */}
      <View style={tw`flex-row justify-center gap-4 sm:gap-7 pt-1 pb-2`}>
        {devices.map((item) => {
          const showActive = item.active;
          const isHighlightActive = showActive && !isLocked;
          const isAutoActive = showActive && isLocked;

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={readOnly ? 1 : 0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => handleDevicePress(item.key, item.active, item.label)}
              style={tw`items-center`}
            >
              <View
                style={[
                  tw`w-13 h-13 sm:w-14 sm:h-14 rounded-full items-center justify-center border`,
                  isHighlightActive
                    ? (isDarkMode
                        ? tw`bg-emerald-500/20 border-emerald-400 shadow-sm`
                        : tw`bg-emerald-600 border-emerald-600 shadow-md`)
                    : isAutoActive
                    ? (isDarkMode
                        ? tw`bg-slate-800/90 border-slate-700 shadow-sm`
                        : tw`bg-slate-200/80 border-slate-300 shadow-sm`)
                    : (isDarkMode
                        ? tw`bg-slate-900 border-slate-800`
                        : tw`bg-white border-slate-200/80`),
                  isLocked ? tw`opacity-85` : tw`opacity-100`
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color={
                    isHighlightActive
                      ? (isDarkMode ? '#34d399' : '#ffffff')
                      : isAutoActive
                      ? (isDarkMode ? '#80a894' : '#4b6e5b')
                      : (isDarkMode ? '#64748b' : '#94a3b8')
                  }
                />
              </View>

              {/* Puck Label & Status */}
              <Text
                style={[
                  tw`text-[11px] mt-1.5`,
                  isHighlightActive
                    ? tw`text-slate-900 dark:text-white`
                    : isAutoActive
                    ? tw`text-slate-700 dark:text-slate-300`
                    : tw`text-slate-500 dark:text-slate-400`,
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}
              >
                {item.label}
              </Text>

              <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                <View
                  style={[
                    tw`w-1.5 h-1.5 rounded-full`,
                    {
                      backgroundColor: isHighlightActive
                        ? (isDarkMode ? '#34d399' : '#059669')
                        : isAutoActive
                        ? (isDarkMode ? '#34d39970' : '#10b98170')
                        : (isDarkMode ? '#475569' : '#cbd5e1')
                    }
                  ]}
                />
                <Text
                  style={[
                    tw`text-[9px] uppercase tracking-wider`,
                    {
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      color: isHighlightActive
                        ? (isDarkMode ? '#34d399' : '#059669')
                        : isAutoActive
                        ? (isDarkMode ? '#94a3b8' : '#64748b')
                        : (isDarkMode ? '#64748b' : '#94a3b8')
                    }
                  ]}
                >
                  {showActive ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. "What the system is doing" - Transparent Explainable Automation Card */}
      {activities.length > 0 && (
        <View
          style={[
            tw`mt-2.5 p-3 rounded-2xl border`,
            isDarkMode
              ? tw`bg-slate-900/80 border-slate-800/80`
              : tw`bg-white/90 border-slate-200/80`
          ]}
        >
          <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
            <MaterialCommunityIcons
              name="robot-industrial"
              size={14}
              color={isDarkMode ? '#34d399' : '#059669'}
            />
            <Text
              style={[
                tw`text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400`,
                { fontFamily: 'PlusJakartaSans_700Bold' }
              ]}
            >
              Control Logic Activity
            </Text>
          </View>

          <View style={tw`gap-y-1.5`}>
            {activities.map((act, index) => (
              <View key={index} style={tw`flex-row items-center gap-2`}>
                <View
                  style={[
                    tw`w-1.5 h-1.5 rounded-full`,
                    {
                      backgroundColor: act.isWarning
                        ? '#f59e0b'
                        : act.isActive
                        ? '#10b981'
                        : (isDarkMode ? '#64748b' : '#94a3b8')
                    }
                  ]}
                />
                <Text
                  style={[
                    tw`text-[11px] flex-1 leading-tight`,
                    act.isWarning
                      ? tw`text-amber-600 dark:text-amber-400 font-semibold`
                      : act.isActive
                      ? tw`text-slate-800 dark:text-slate-200 font-medium`
                      : tw`text-slate-500 dark:text-slate-400`,
                    { fontFamily: 'PlusJakartaSans_600SemiBold' }
                  ]}
                >
                  {act.reason}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});
