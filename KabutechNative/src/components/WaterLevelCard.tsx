import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticSelection } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

interface Props {
  waterLevel?: number; // 0 to 100 percentage
  capacityLiters?: number; // Default 20 Liters
  navigation?: any;
}

export default React.memo(function WaterLevelCard({
  waterLevel = 75,
  capacityLiters = 20,
  navigation
}: Props) {
  const { isDarkMode } = useTheme();
  const { isSmallDevice } = useResponsive();

  // Clamp percentage between 0 and 100
  const clampedLevel = Math.max(0, Math.min(100, typeof waterLevel === 'number' && !isNaN(waterLevel) ? waterLevel : 75));
  const estimatedLiters = ((clampedLevel / 100) * capacityLiters).toFixed(1);

  // Status configuration
  const statusConfig = React.useMemo(() => {
    if (clampedLevel > 50) {
      return {
        label: 'Optimal',
        color: '#0ea5e9',
        badgeBg: isDarkMode ? 'bg-sky-500/15' : 'bg-sky-50',
        badgeBorder: isDarkMode ? 'border-sky-500/30' : 'border-sky-200',
        badgeText: isDarkMode ? 'text-sky-400' : 'text-sky-600',
        dotColor: '#0ea5e9',
        gradientColors: ['#38bdf8', '#0284c7', '#0369a1'] as [string, string, string],
        desc: 'Sufficient supply for misting cycles',
        isCritical: false,
        isWarning: false,
      };
    }
    if (clampedLevel > 20) {
      return {
        label: 'Low Level',
        color: '#f59e0b',
        badgeBg: isDarkMode ? 'bg-amber-500/15' : 'bg-amber-50',
        badgeBorder: isDarkMode ? 'border-amber-500/30' : 'border-amber-200',
        badgeText: isDarkMode ? 'text-amber-400' : 'text-amber-600',
        dotColor: '#f59e0b',
        gradientColors: ['#fbbf24', '#f59e0b', '#d97706'] as [string, string, string],
        desc: 'Consider refilling reservoir soon',
        isCritical: false,
        isWarning: true,
      };
    }
    return {
      label: 'Refill Now',
      color: '#ef4444',
      badgeBg: isDarkMode ? 'bg-rose-500/20' : 'bg-rose-50',
      badgeBorder: isDarkMode ? 'border-rose-500/40' : 'border-rose-200',
      badgeText: isDarkMode ? 'text-rose-400' : 'text-rose-600',
      dotColor: '#ef4444',
      gradientColors: ['#f87171', '#ef4444', '#b91c1c'] as [string, string, string],
      desc: 'Critical! Risk of pump dry-running',
      isCritical: true,
      isWarning: true,
    };
  }, [clampedLevel, isDarkMode]);

  // Smooth animation for liquid height
  const animatedFill = useRef(new Animated.Value(clampedLevel)).current;
  // Subtle wave translation animation
  const waveAnim = useRef(new Animated.Value(0)).current;
  // Critical pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedFill, {
      toValue: clampedLevel,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedLevel]);

  // Continuous subtle surface wave loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Pulse animation when water is critically low
  useEffect(() => {
    if (statusConfig.isCritical) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [statusConfig.isCritical]);

  const fillHeightPercent = animatedFill.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -32],
  });

  const handlePress = () => {
    hapticSelection();
    if (navigation?.navigate) {
      navigation.navigate('Main', {
        screen: 'Controls',
        params: { tab: 'hum' },
      });
    }
  };

  return (
    <View style={tw`px-5 sm:px-6 pt-5`}>
      {/* Section Header */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Text
            style={[
              tw`text-base sm:text-lg tracking-tight`,
              {
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                color: isDarkMode ? '#f8fafc' : '#0f172a',
              },
            ]}
          >
            Water Level
          </Text>
          <View
            style={[
              tw`px-2 py-0.5 rounded-full border flex-row items-center gap-1.5`,
              tw`${statusConfig.badgeBg} ${statusConfig.badgeBorder}`,
            ]}
          >
            <Animated.View
              style={[
                tw`w-1.5 h-1.5 rounded-full`,
                { backgroundColor: statusConfig.dotColor },
                statusConfig.isCritical ? { opacity: pulseAnim } : null,
              ]}
            />
            <Text
              style={[
                tw`text-[10px]`,
                tw`${statusConfig.badgeText}`,
                { fontFamily: 'PlusJakartaSans_700Bold' },
              ]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handlePress}
          style={tw`flex-row items-center py-1 px-2 rounded-lg`}
        >
          <Text
            style={[
              tw`text-xs text-[#0ea5e9] mr-1`,
              { fontFamily: 'PlusJakartaSans_700Bold' },
            ]}
          >
            Misters
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* Main Container Card */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={[
          tw`bg-white dark:bg-slate-900 rounded-[28px] p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden`,
          statusConfig.isCritical && (isDarkMode ? tw`border-rose-900/60` : tw`border-rose-200`),
        ]}
      >
        <View style={tw`flex-row items-center gap-4 sm:gap-5`}>
          {/* Tank Visual Column */}
          <View style={tw`items-center`}>
            {/* Top Tank Cap / Inlet */}
            <View
              style={[
                tw`w-7 h-2 rounded-t-sm border-t border-x`,
                isDarkMode
                  ? tw`bg-slate-800 border-slate-700`
                  : tw`bg-slate-300 border-slate-400`,
              ]}
            />
            <View
              style={[
                tw`w-11 h-1.5 rounded-t-md border-t border-x`,
                isDarkMode
                  ? tw`bg-slate-700 border-slate-600`
                  : tw`bg-slate-400 border-slate-400`,
              ]}
            />

            {/* Main Tank Body */}
            <View
              style={[
                tw`w-[76px] sm:w-[84px] h-[132px] sm:h-[142px] rounded-2xl border-2 overflow-hidden relative justify-end shadow-inner`,
                isDarkMode
                  ? tw`bg-slate-950/80 border-slate-700`
                  : tw`bg-sky-50/50 border-slate-300`,
              ]}
            >
              {/* Measurement Tick Marks (Left Edge) */}
              <View style={tw`absolute left-1.5 top-0 bottom-0 justify-between py-2.5 z-20 pointer-events-none`}>
                {[100, 75, 50, 25, 0].map((tick) => (
                  <View key={tick} style={tw`flex-row items-center gap-1`}>
                    <View
                      style={[
                        tw`h-[1.5px] rounded-full`,
                        tick % 50 === 0 ? tw`w-2.5` : tw`w-1.5`,
                        isDarkMode ? tw`bg-slate-600` : tw`bg-slate-400/80`,
                      ]}
                    />
                    {tick % 50 === 0 && (
                      <Text
                        style={[
                          tw`text-[8px]`,
                          isDarkMode ? tw`text-slate-500` : tw`text-slate-400`,
                          { fontFamily: 'PlusJakartaSans_700Bold' },
                        ]}
                      >
                        {tick}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Glass Reflection Highlight Stripe */}
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tw`absolute left-0 top-0 bottom-0 w-3.5 z-20 pointer-events-none`}
              />

              {/* Animated Liquid Reservoir Fill */}
              <Animated.View
                style={[
                  tw`w-full absolute bottom-0 left-0 right-0 overflow-hidden`,
                  { height: fillHeightPercent },
                ]}
              >
                {/* Gradient Liquid Body */}
                <LinearGradient
                  colors={statusConfig.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={tw`w-full h-full relative`}
                >
                  {/* Subtle Wave Ripples at surface */}
                  <View style={tw`w-full h-3 absolute top-0 left-0 right-0 overflow-hidden`}>
                    <Animated.View
                      style={[
                        tw`flex-row w-[180px]`,
                        { transform: [{ translateX: waveTranslateX }] },
                      ]}
                    >
                      <Svg height="12" width="180" viewBox="0 0 180 12">
                        <Path
                          d="M 0,6 C 15,2 25,10 40,6 C 55,2 65,10 80,6 C 95,2 105,10 120,6 C 135,2 145,10 160,6 C 175,2 185,10 200,6 L 200,0 L 0,0 Z"
                          fill={isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.4)'}
                        />
                      </Svg>
                    </Animated.View>
                  </View>

                  {/* Surface Glow Line */}
                  <View style={tw`w-full h-[1.5px] bg-white/40 absolute top-0`} />

                  {/* Subtle Floating Bubble Accents */}
                  <View
                    style={[
                      tw`w-2 h-2 rounded-full bg-white/30 absolute left-3`,
                      { bottom: '25%' },
                    ]}
                  />
                  <View
                    style={[
                      tw`w-1.5 h-1.5 rounded-full bg-white/25 absolute right-4`,
                      { bottom: '55%' },
                    ]}
                  />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Bottom Tank Stand / Base Feet */}
            <View style={tw`flex-row justify-between w-12 mt-0.5`}>
              <View
                style={[
                  tw`w-2.5 h-1.5 rounded-b-sm`,
                  isDarkMode ? tw`bg-slate-700` : tw`bg-slate-400`,
                ]}
              />
              <View
                style={[
                  tw`w-2.5 h-1.5 rounded-b-sm`,
                  isDarkMode ? tw`bg-slate-700` : tw`bg-slate-400`,
                ]}
              />
            </View>
          </View>

          {/* Details & Statistics Column */}
          <View style={tw`flex-1 justify-between py-1`}>
            {/* Header / Subtitle */}
            <View>
              <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                <MaterialCommunityIcons
                  name="water-opacity"
                  size={15}
                  color={statusConfig.color}
                />
                <Text
                  style={[
                    tw`text-[11px] uppercase tracking-wider`,
                    isDarkMode ? tw`text-slate-400` : tw`text-slate-500`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  Container Storage
                </Text>
              </View>

              {/* Big Hero Stat */}
              <View style={tw`flex-row items-baseline gap-1`}>
                <Text
                  style={[
                    tw`text-3xl sm:text-4xl`,
                    {
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      letterSpacing: -1,
                    },
                  ]}
                >
                  {Math.round(clampedLevel)}
                </Text>
                <Text
                  style={[
                    tw`text-lg`,
                    {
                      fontFamily: 'PlusJakartaSans_800ExtraBold',
                      color: statusConfig.color,
                    },
                  ]}
                >
                  %
                </Text>
              </View>
            </View>

            {/* Volume Estimate & Details Box */}
            <View
              style={[
                tw`p-2.5 sm:p-3 rounded-2xl mt-2 border`,
                isDarkMode
                  ? tw`bg-slate-800/60 border-slate-700/60`
                  : tw`bg-slate-50 border-slate-200/60`,
              ]}
            >
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <Text
                  style={[
                    tw`text-[11px]`,
                    isDarkMode ? tw`text-slate-400` : tw`text-slate-500`,
                    { fontFamily: 'PlusJakartaSans_600SemiBold' },
                  ]}
                >
                  Remaining Volume
                </Text>
                <Text
                  style={[
                    tw`text-[12px]`,
                    isDarkMode ? tw`text-slate-200` : tw`text-slate-800`,
                    { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  ]}
                >
                  {estimatedLiters} / {capacityLiters} L
                </Text>
              </View>

              {/* Horizontal Capacity Mini-Bar */}
              <View
                style={[
                  tw`w-full h-1.5 rounded-full overflow-hidden`,
                  isDarkMode ? tw`bg-slate-700` : tw`bg-slate-200`,
                ]}
              >
                <View
                  style={[
                    tw`h-full rounded-full`,
                    {
                      width: `${clampedLevel}%`,
                      backgroundColor: statusConfig.color,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Bottom Status / Guidance Note */}
            <View style={tw`flex-row items-center gap-1.5 mt-2`}>
              <MaterialCommunityIcons
                name={
                  statusConfig.isCritical
                    ? 'alert-octagon'
                    : statusConfig.isWarning
                    ? 'alert-circle-outline'
                    : 'check-circle-outline'
                }
                size={14}
                color={statusConfig.color}
              />
              <Text
                numberOfLines={1}
                style={[
                  tw`text-[11px] flex-1`,
                  {
                    color: statusConfig.color,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                  },
                ]}
              >
                {statusConfig.desc}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});
