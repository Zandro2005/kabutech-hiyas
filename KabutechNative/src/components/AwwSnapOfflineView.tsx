import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';

export interface AwwSnapOfflineViewProps {
  variant?: 'dashboard' | 'control';
  title?: string;
  subtitle?: string;
  metricLabel?: string;
  unit?: string;
  targetRange?: string;
  isDarkMode: boolean;
  onPressSpecs?: () => void;
  onCheckConnection?: () => void;
  freshnessText?: string;
}

export default React.memo(function AwwSnapOfflineView({
  variant = 'dashboard',
  title = 'Aw, Snap!',
  subtitle,
  metricLabel,
  isDarkMode,
}: AwwSnapOfflineViewProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const defaultSubtitle =
    variant === 'dashboard'
      ? 'Chamber telemetry is paused. Parameters in range cannot be evaluated while the controller is offline.'
      : `Live ${metricLabel || 'parameter'} gauge is unavailable. Real-time telemetry is paused while offline.`;

  const iconColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <View
      style={[
        tw`w-full max-w-[320px] items-center justify-center py-6 px-4`,
        { minHeight: 220 },
      ]}
    >
      {/* 1. Neutral Dead Icon */}
      <Animated.View
        style={[
          tw`items-center justify-center mb-3`,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <MaterialCommunityIcons
          name="emoticon-dead-outline"
          size={46}
          color={iconColor}
        />
      </Animated.View>

      {/* 2. Headline */}
      <Text
        style={[
          tw`text-2xl text-slate-800 dark:text-white tracking-tight mb-1.5 text-center`,
          { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.6 },
        ]}
      >
        {title}
      </Text>

      {/* 3. Subtitle Message */}
      <Text
        style={[
          tw`text-xs leading-relaxed text-slate-500 dark:text-slate-400 text-center px-4`,
          { fontFamily: 'PlusJakartaSans_500Medium' },
        ]}
      >
        {subtitle || defaultSubtitle}
      </Text>
    </View>
  );
});
