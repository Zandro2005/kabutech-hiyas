import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import tw from '../tailwind';
import { useAuth } from '../context/AuthContext';
import { hapticMedium, hapticSelection } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { showToast } from './CustomToast';

const getAvatarColor = (name: string) => {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface Props {
  envScore: string;
  isAuto: boolean;
  isScheduled?: boolean;
  isDarkMode: boolean;
  fansActive: boolean;
  misterActive: boolean;
  lightActive: boolean;
  toggleDevice: (device: 'fans' | 'misters' | 'lights' | 'co2', currentState: boolean) => void;
  navigation: any;
  readOnly?: boolean;
}

export default React.memo(function ScoreArch({
  envScore,
  isAuto,
  isScheduled = false,
  isDarkMode,
  fansActive,
  misterActive,
  lightActive,
  toggleDevice,
  navigation,
  readOnly = false
}: Props) {
  const { profile } = useAuth();
  const { isSmallDevice } = useResponsive();

  const numScore = parseFloat(envScore) || 0;
  const isOptimal = numScore >= 8.0;
  const isWarning = numScore >= 6.0 && numScore < 8.0;
  const scoreLabel = isOptimal ? 'Optimal' : isWarning ? 'Moderate' : 'Calibrate';
  const scoreBadgeColor = isOptimal ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';

  // Smart Halo Ring dimensions (Enlarged Hero Dial)
  const ringSize = isSmallDevice ? 200 : 224;
  const strokeWidth = 13;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0.05, numScore / 10));
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
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-2 pb-1`}>
      {/* 1. Header Row: User Info & Interactive Mode Badge */}
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <TouchableOpacity
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.8}
          style={tw`flex-row items-center gap-3 flex-1 mr-2`}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <View
            style={[
              tw`w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden items-center justify-center border shadow-sm shrink-0`,
              isDarkMode ? tw`bg-slate-800 border-slate-700` : tw`bg-white border-emerald-200/80`
            ]}
          >
            <Text
              style={[
                tw`text-base sm:text-lg`,
                { color: getAvatarColor(profile?.name || 'User'), fontFamily: 'PlusJakartaSans_800ExtraBold' }
              ]}
            >
              {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>

          <View style={tw`flex-1`}>
            <Text
              numberOfLines={1}
              style={[
                tw`text-base sm:text-[17px] text-slate-800 dark:text-white tracking-tight`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' }
              ]}
            >
              Hi, {profile?.name ? profile.name.split(' ')[0] : 'Operator'} 👋
            </Text>
            <Text
              numberOfLines={1}
              style={[
                tw`text-[11px] text-slate-500 dark:text-slate-400 mt-0.5`,
                { fontFamily: 'PlusJakartaSans_500Medium' }
              ]}
            >
              Chamber A • All Systems Active
            </Text>
          </View>
        </TouchableOpacity>

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

            {/* Glowing Active Progress Arc */}
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
          </Svg>

          {/* Center Content - Pure Typography with Zero Boxes */}
          <View style={tw`absolute items-center justify-center`}>
            <Text
              style={[
                tw`text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5`,
                { fontFamily: 'PlusJakartaSans_700Bold' }
              ]}
            >
              Environment Score
            </Text>

            <View style={tw`flex-row items-baseline mb-0.5`}>
              <Text
                style={[
                  tw`text-slate-900 dark:text-white`,
                  {
                    fontSize: isSmallDevice ? 44 : 50,
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    letterSpacing: -1.5,
                    lineHeight: isSmallDevice ? 48 : 54
                  }
                ]}
              >
                {envScore}
              </Text>
              <Text
                style={[
                  tw`text-base sm:text-lg text-slate-400 dark:text-slate-500 ml-1`,
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}
              >
                /10
              </Text>
            </View>

            {/* Condition Micro-Badge */}
            <View
              style={[
                tw`flex-row items-center px-2.5 py-0.5 rounded-full border mt-1`,
                isDarkMode
                  ? tw`bg-slate-900/80 border-slate-700`
                  : tw`bg-emerald-50/90 border-emerald-200/90`
              ]}
            >
              <View style={[tw`w-2 h-2 rounded-full mr-1.5`, { backgroundColor: scoreBadgeColor }]} />
              <Text
                style={[
                  tw`text-[10.5px]`,
                  {
                    fontFamily: 'PlusJakartaSans_700Bold',
                    color: isDarkMode ? '#e2e8f0' : '#065f46'
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
              tw`text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400`,
              { fontFamily: 'PlusJakartaSans_800ExtraBold' }
            ]}
          >
            ▲ +6% VS last week
          </Text>
          <Text style={tw`text-slate-300 dark:text-slate-600`}>•</Text>
          <Text
            style={[
              tw`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400`,
              { fontFamily: 'PlusJakartaSans_600SemiBold' }
            ]}
          >
            Chamber Optimal
          </Text>
        </View>
      </View>

      {/* 3. Three Interactive Circular Device Pucks (Docked Symmetrically Below) */}
      {!readOnly && (
        <View style={tw`flex-row justify-center gap-6 sm:gap-8 pt-3 pb-1`}>
          {devices.map((item) => {
            const showActive = item.active;
            const isLocked = isAuto || isScheduled;
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
                    showActive
                      ? (isDarkMode
                          ? tw`bg-emerald-950/80 border-emerald-500`
                          : tw`bg-emerald-50 border-emerald-500`)
                      : (isDarkMode
                          ? tw`bg-slate-900 border-slate-800`
                          : tw`bg-white border-slate-200/80`),
                    isLocked ? tw`opacity-75` : tw`opacity-100`
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={showActive ? '#10b981' : (isDarkMode ? '#94a3b8' : '#64748b')}
                  />
                </View>

                {/* Puck Label & Status */}
                <Text
                  style={[
                    tw`text-[11px] mt-1.5 text-slate-800 dark:text-slate-200`,
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  {item.label}
                </Text>

                <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                  <View
                    style={[
                      tw`w-1.5 h-1.5 rounded-full`,
                      { backgroundColor: showActive ? '#10b981' : (isDarkMode ? '#475569' : '#cbd5e1') }
                    ]}
                  />
                  <Text
                    style={[
                      tw`text-[9px] uppercase tracking-wider`,
                      {
                        fontFamily: 'PlusJakartaSans_800ExtraBold',
                        color: showActive ? '#10b981' : (isDarkMode ? '#64748b' : '#94a3b8')
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
    </View>
  );
});
