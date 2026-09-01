import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useResponsive } from '../utils/responsive';

interface Props {
  localTarget: number;
  activeTabData: {
    min: number;
    max: number;
    color: string;
    unit: string;
    optimal: string;
    current: number;
    label: string;
  };
  isDarkMode: boolean;
}

export default function CircularSlider({ localTarget, activeTabData, isDarkMode }: Props) {
  const { isSmallDevice, isLargeDevice } = useResponsive();
  
  const size = isSmallDevice ? 285 : isLargeDevice ? 345 : 315;
  const strokeWidth = isSmallDevice ? 13 : isLargeDevice ? 16 : 14.5;
  const radius = (size / 2) - strokeWidth - (isLargeDevice ? 14 : 12);
  const circumference = 2 * Math.PI * radius;
  
  // Progress ratio limited between 0 and 1
  const progress = Math.max(0, Math.min(1, (localTarget - activeTabData.min) / (activeTabData.max - activeTabData.min)));
  const strokeDashoffset = circumference - (progress * circumference);

  const diff = Number((activeTabData.current - localTarget).toFixed(1));
  const isNearTarget = Math.abs(diff) <= 0.5;

  const valueFontSize = isSmallDevice ? 42 : isLargeDevice ? 54 : 48;
  const valueLineHeight = isSmallDevice ? 48 : isLargeDevice ? 62 : 54;
  const unitFontSize = isSmallDevice ? 18 : isLargeDevice ? 24 : 21;

  // Passive Orbiting Rotation Animation
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous Subtle Orbit Rotation Loop (28s cycle)
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateLoop.start();

    return () => {
      rotateLoop.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={tw`items-center justify-center relative mt-6 sm:mt-8 mb-12 sm:mb-14`}>
      
      {/* 1. Steady Subtle Ambient Glow (Constant, Non-Blinking) */}
      <View
        style={[
          tw`absolute rounded-full`,
          {
            width: size - 20,
            height: size - 20,
            backgroundColor: activeTabData.color,
            opacity: isDarkMode ? 0.12 : 0.08,
            shadowColor: activeTabData.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isDarkMode ? 0.4 : 0.25,
            shadowRadius: 22,
          },
        ]}
      />

      {/* 2. Rotating Dashed Orbit Line */}
      <Animated.View
        style={[
          tw`absolute`,
          {
            width: size + 16,
            height: size + 16,
            transform: [{ rotate: spin }],
          },
        ]}
        pointerEvents="none"
      >
        <Svg width={size + 16} height={size + 16} viewBox={`0 0 ${size + 16} ${size + 16}`}>
          <Circle
            cx={(size + 16) / 2}
            cy={(size + 16) / 2}
            r={radius + (isLargeDevice ? 18 : 16)}
            stroke={activeTabData.color}
            strokeWidth={1.2}
            strokeDasharray="4 8"
            strokeOpacity={isDarkMode ? 0.32 : 0.25}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Background Soft Plate */}
      <View 
        style={[
          tw`absolute rounded-full`, 
          { 
            width: size - 36, 
            height: size - 36, 
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            shadowColor: activeTabData.color,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDarkMode ? 0.25 : 0.12,
            shadowRadius: 20,
            elevation: 6
          }
        ]} 
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeTabData.color} stopOpacity="1" />
            <Stop offset="100%" stopColor={activeTabData.color} stopOpacity="0.7" />
          </SvgGradient>
        </Defs>

        {/* Outer subtle static guide track */}
        <Circle 
          cx={size/2} cy={size/2} r={radius + (isLargeDevice ? 10 : 8)} 
          stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} 
          strokeWidth={1} 
          strokeDasharray="2 4"
          fill="none" 
        />

        {/* Background Track */}
        <Circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} 
          strokeWidth={strokeWidth} 
          fill="none" 
        />

        {/* Active Progress Track */}
        <Circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke="url(#dialGrad)" 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
          fill="none" 
          transform={`rotate(-90 ${size/2} ${size/2})`} 
        />
      </Svg>

      {/* Central Display Content */}
      <View style={[tw`absolute items-center justify-center`, { width: size - (isLargeDevice ? 62 : 54), height: size - (isLargeDevice ? 62 : 54) }]}>
        
        {/* Top Mini Tag: TARGET SETTING */}
        <View style={tw`flex-row items-center gap-1.5 mb-1`}>
          <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: activeTabData.color }]} />
          <Text style={[tw`text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            TARGET SETPOINT
          </Text>
        </View>

        {/* Large Value & Unit */}
        <View style={tw`flex-row items-baseline justify-center`}>
          <Text style={[tw`text-slate-900 dark:text-white`, { fontSize: valueFontSize, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: valueLineHeight, letterSpacing: -1.5 }]}>
            {localTarget}
          </Text>
          <Text style={[tw`font-bold ml-1.5`, { fontSize: unitFontSize, color: activeTabData.color, fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {activeTabData.unit}
          </Text>
        </View>

        {/* Live vs Target Badge */}
        <View style={tw`mt-1.5 sm:mt-2 flex-row items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1 sm:px-3.5 sm:py-1.2 rounded-full border border-slate-200/60 dark:border-slate-700/60`}>
          <Text style={[tw`text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
            Current: <Text style={[tw`text-slate-800 dark:text-slate-200`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{activeTabData.current}{activeTabData.unit}</Text>
          </Text>
          <View style={tw`w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600`} />
          <Text style={[tw`text-[10.5px] sm:text-[11.5px]`, isNearTarget ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-amber-600 dark:text-amber-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            {isNearTarget ? 'Aligned' : `${diff > 0 ? `+${diff}` : diff}${activeTabData.unit}`}
          </Text>
        </View>

        {/* Optimal Range Pill */}
        <View style={tw`mt-1.5 sm:mt-2 flex-row items-center gap-1`}>
          <MaterialCommunityIcons name="check-decagram-outline" size={12} color="#10b981" />
          <Text style={[tw`text-[10.5px] sm:text-[11.5px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
            Ideal: <Text style={[tw`text-slate-600 dark:text-slate-300 font-bold`]}>{activeTabData.optimal} {activeTabData.unit}</Text>
          </Text>
        </View>

      </View>
    </View>
  );
}
