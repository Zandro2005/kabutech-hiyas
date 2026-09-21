import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import tw from '../tailwind';
import { useAuth } from '../context/AuthContext';
import { hapticMedium, hapticSelection } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { showToast } from './CustomToast';

interface Props {
  envScore: string;
  isAuto: boolean;
  isScheduled?: boolean;
  isDarkMode: boolean;
  fansActive: boolean;
  misterActive: boolean;
  lightActive: boolean;
  valveActive?: boolean;
  toggleDevice: (device: 'fans' | 'misters' | 'lights' | 'co2', currentState: boolean) => void;
  navigation: any;
  readOnly?: boolean;
  warningBanner?: React.ReactNode;
  hasWarning?: boolean;
  isOffline?: boolean;
}

export default React.memo(function ScoreArch({
  envScore,
  isAuto,
  isScheduled = false,
  isDarkMode,
  fansActive,
  misterActive,
  lightActive,
  valveActive = false,
  toggleDevice,
  navigation,
  readOnly = false,
  warningBanner,
  hasWarning = false,
  isOffline = false,
}: Props) {
  const { profile } = useAuth();
  const { isSmallDevice } = useResponsive();

  const numScore = parseFloat(envScore) || 0;
  const isOptimal = numScore >= 8.0;
  const isWarning = numScore >= 6.0 && numScore < 8.0;
  const isCalibrating = numScore === 0;
  const scoreLabel = isOffline ? 'Offline' : (isCalibrating ? 'Calibrating' : isOptimal ? 'Optimal' : isWarning ? 'Moderate' : 'Attention');
  const scoreBadgeColor = isOffline ? '#94a3b8' : (isCalibrating ? '#64748b' : isOptimal ? '#10b981' : isWarning ? '#f59e0b' : '#ea580c');

  // Smart Halo Ring dimensions (Enlarged Hero Dial)
  const ringSize = isSmallDevice ? 224 : 252;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = isOffline ? 0 : Math.min(1, Math.max(0.05, numScore / 10));
  const strokeDashoffset = circumference * (1 - progress);

  const handleDevicePress = (key: 'fans' | 'misters' | 'lights' | 'co2', active: boolean, label: string) => {
    if (isAuto || isScheduled) {
      hapticSelection();
      showToast({
        type: 'info',
        text1: `${isAuto ? 'Auto' : 'Scheduled'} Mode Active`,
        text2: `Switch to Manual Mode in Controls to adjust ${label}.`,
        duration: 3000
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
    { key: 'co2' as const, label: 'Valve', active: valveActive, icon: 'weather-windy' as const },
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-2 pb-1`}>
      {/* 1. Header Row: User Greetings & Interactive Mode Badge */}
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <View style={tw`flex-1 mr-2`}>
          <Text
            numberOfLines={1}
            style={[
              tw`text-xl sm:text-[22px] text-slate-800 dark:text-white tracking-tight leading-tight`,
              { fontFamily: 'PlusJakartaSans_800ExtraBold' }
            ]}
          >
            Hi, {profile?.name ? profile.name.split(' ')[0] : 'Operator'}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5`,
              { fontFamily: 'PlusJakartaSans_500Medium' }
            ]}
          >
            {isOffline 
              ? 'Chamber A • Controller Offline' 
              : (hasWarning ? 'Chamber A • Attention Required' : 'Chamber A • All Systems Active')}
          </Text>
        </View>

        {/* Interactive Mode Badge */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticSelection();
            if (profile?.role !== 'staff') {
              navigation.navigate('Main', { screen: 'Controls' });
            } else {
              showToast({
                type: 'info',
                text1: `System Mode: ${isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}`,
                text2: 'System mode is managed by Farm Administrators.',
                duration: 2500,
              });
            }
          }}
          style={[
            tw`flex-row items-center px-3 py-1.5 rounded-full border shadow-sm`,
            isAuto
              ? (isDarkMode ? tw`bg-emerald-950/50 border-emerald-700/60` : tw`bg-emerald-50 border-emerald-200`)
              : isScheduled
              ? (isDarkMode ? tw`bg-purple-950/50 border-purple-700/60` : tw`bg-purple-50 border-purple-200`)
              : (isDarkMode ? tw`bg-amber-950/50 border-amber-700/60` : tw`bg-amber-50 border-amber-200`)
          ]}
        >
          <View
            style={[
              tw`w-2 h-2 rounded-full mr-2`,
              { backgroundColor: isAuto ? '#10b981' : isScheduled ? '#a855f7' : '#f59e0b' }
            ]}
          />
          <Text
            style={[
              tw`text-[10px] tracking-wider uppercase`,
              {
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                color: isAuto
                  ? (isDarkMode ? '#34d399' : '#059669')
                  : isScheduled
                  ? (isDarkMode ? '#c084fc' : '#7e22ce')
                  : (isDarkMode ? '#fbbf24' : '#d97706')
              }
            ]}
          >
            {isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Smart Halo Gauge (Pure Vector Ring - Zero Boxes) */}
      <View style={tw`items-center justify-center my-3`}>
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          {/* Circular SVG Ring */}
          <Svg
            width={ringSize}
            height={ringSize}
            style={{ transform: [{ rotate: '-90deg' }] }}
          >
            <Defs>
              <SvgGradient id="haloGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#059669" />
                <Stop offset="50%" stopColor="#10b981" />
                <Stop offset="100%" stopColor="#34d399" />
              </SvgGradient>
            </Defs>

            {/* High-Contrast Vector Track Circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(16, 185, 129, 0.25)'}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Glowing Active Progress Arc (only when online) */}
            {!isOffline && (
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="url(#haloGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          {/* Center Content - Pure Typography with Zero Boxes */}
          <View style={tw`absolute items-center justify-center`}>
            <Text
              style={[
                tw`text-[11px] sm:text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1`,
                { fontFamily: 'PlusJakartaSans_700Bold' }
              ]}
            >
              Environment Score
            </Text>

            <View style={tw`flex-row items-baseline mb-0.5`}>
              <Text
                style={[
                  isOffline ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-900 dark:text-white`,
                  {
                    fontSize: isSmallDevice ? 50 : 58,
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    letterSpacing: -1.5,
                    lineHeight: isSmallDevice ? 54 : 62
                  }
                ]}
              >
                {isOffline ? '--' : envScore}
              </Text>
              <Text
                style={[
                  tw`text-lg sm:text-xl text-slate-400 dark:text-slate-500 ml-1`,
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}
              >
                /10
              </Text>
            </View>

            {/* Condition Micro-Badge */}
            <View
              style={[
                tw`flex-row items-center px-3 py-1 rounded-full border mt-1.5`,
                isOffline
                  ? (isDarkMode ? tw`bg-slate-800 border-slate-700` : tw`bg-slate-100 border-slate-300`)
                  : (isDarkMode ? tw`bg-slate-900/80 border-slate-700` : tw`bg-emerald-50/90 border-emerald-200/90`)
              ]}
            >
              <View style={[tw`w-2 h-2 rounded-full mr-1.5`, { backgroundColor: scoreBadgeColor }]} />
              <Text
                style={[
                  tw`text-[11px]`,
                  {
                    fontFamily: 'PlusJakartaSans_700Bold',
                    color: isOffline 
                      ? (isDarkMode ? '#94a3b8' : '#64748b')
                      : (isDarkMode ? '#e2e8f0' : '#065f46')
                  }
                ]}
              >
                {scoreLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Subtitle / Delta Trend under Halo */}
        <View style={tw`flex-row items-center gap-1.5 mt-3`}>
          <Text
            style={[
              tw`text-[11px] sm:text-xs`,
              isOffline ? tw`text-slate-400 dark:text-slate-500` : tw`text-emerald-600 dark:text-emerald-400`,
              { fontFamily: 'PlusJakartaSans_800ExtraBold' }
            ]}
          >
            {isOffline ? 'Offline' : '▲ +6% VS last week'}
          </Text>
          <Text style={tw`text-slate-300 dark:text-slate-600`}>•</Text>
          <Text
            style={[
              tw`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400`,
              { fontFamily: 'PlusJakartaSans_600SemiBold' }
            ]}
          >
            {isOffline ? 'Controller Unreachable' : 'Chamber Optimal'}
          </Text>
        </View>
      </View>

      {/* 3. Four Interactive Circular Device Pucks (Docked Symmetrically Below) */}
      {!readOnly && (
        <View style={tw`flex-row justify-center gap-4 sm:gap-7 pt-1.5 pb-1`}>
          {devices.map((item) => {
            const showActive = item.active;
            const isLocked = isAuto || isScheduled;
            const isHighlightActive = showActive && !isLocked;
            const isAutoActive = showActive && isLocked;

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.75}
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
                    isLocked ? tw`opacity-80` : tw`opacity-100`
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
      )}

      {/* ⚠️ Warning Banners (Positioned Under the Quick Device Toggles) */}
      {hasWarning && warningBanner ? (
        <View style={tw`mt-2.5 mb-1 px-1 sm:px-2 w-full items-center`}>
          {warningBanner}
        </View>
      ) : null}
    </View>
  );
});
