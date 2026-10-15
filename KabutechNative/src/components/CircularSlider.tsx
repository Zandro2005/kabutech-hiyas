import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, PanResponder } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useResponsive } from '../utils/responsive';
import { hapticSelection } from '../utils/haptics';

interface Props {
  localTarget: number;
  activeTabData: {
    min: number;
    max: number;
    step?: number;
    color: string;
    unit: string;
    optimal: string;
    current: number | string;
    isDisconnected?: boolean;
    label: string;
  };
  isDarkMode: boolean;
  isOffline?: boolean;
  onValueChange?: (value: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: (value: number) => void;
}

export default function CircularSlider({
  localTarget,
  activeTabData,
  isDarkMode,
  isOffline = false,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
}: Props) {
  const { isSmallDevice, isLargeDevice } = useResponsive();

  const dialColor = isOffline
    ? (isDarkMode ? '#64748b' : '#94a3b8')
    : activeTabData.color;

  // Restored Original Circular Progress Dial Dimensions
  const size = isSmallDevice ? 285 : isLargeDevice ? 345 : 315;
  const strokeWidth = isSmallDevice ? 13 : isLargeDevice ? 16 : 14.5;
  const radius = size / 2 - strokeWidth - (isLargeDevice ? 14 : 12);
  const circumference = 2 * Math.PI * radius;

  // Progress ratio limited between 0 and 1
  const progress = Math.max(
    0,
    Math.min(1, (localTarget - activeTabData.min) / (activeTabData.max - activeTabData.min))
  );
  const strokeDashoffset = circumference - progress * circumference;

  // Exact Tip Coordinates of the Progress Arc in the size x size coordinate space
  // With rotate(-90 size/2 size/2), 0 progress is at 12 o'clock (-PI / 2)
  const thumbAngle = progress * 2 * Math.PI - Math.PI / 2;
  const thumbX = size / 2 + radius * Math.cos(thumbAngle);
  const thumbY = size / 2 + radius * Math.sin(thumbAngle);

  const isDisconnected = activeTabData.isDisconnected || activeTabData.current === '--' || activeTabData.current === -999;
  const numCurrent = typeof activeTabData.current === 'number' ? activeTabData.current : parseFloat(String(activeTabData.current));
  const diff = !isDisconnected && !isNaN(numCurrent) ? Number((numCurrent - localTarget).toFixed(1)) : 0;
  const isNearTarget = !isDisconnected && Math.abs(diff) <= 0.5;

  const valueFontSize = isSmallDevice ? 42 : isLargeDevice ? 54 : 48;
  const valueLineHeight = isSmallDevice ? 48 : isLargeDevice ? 62 : 54;
  const unitFontSize = isSmallDevice ? 18 : isLargeDevice ? 24 : 21;

  // Passive Orbiting Rotation Animation
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const propsRef = useRef({
    activeTabData,
    onValueChange,
    onSlidingStart,
    onSlidingComplete,
    isOffline,
  });
  propsRef.current = {
    activeTabData,
    onValueChange,
    onSlidingStart,
    onSlidingComplete,
    isOffline,
  };

  const isInteractingWithDial = useRef(false);
  const touchStartRef = useRef({ x: size / 2, y: size / 2 });
  const lastValueRef = useRef(localTarget);

  useEffect(() => {
    lastValueRef.current = localTarget;
  }, [localTarget]);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
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

  const processAngle = (curX: number, curY: number, isInitialTouch: boolean = false) => {
    const currentTab = propsRef.current.activeTabData;
    const onValChange = propsRef.current.onValueChange;
    const dx = curX - size / 2;
    const dy = curY - size / 2;

    // Ignore touches too close to origin
    if (Math.sqrt(dx * dx + dy * dy) < 25) return;

    let angleRad = Math.atan2(dy, dx);
    let angleFromTop = angleRad + Math.PI / 2;
    if (angleFromTop < 0) {
      angleFromTop += 2 * Math.PI;
    }

    const rawProgress = Math.max(0, Math.min(1, angleFromTop / (2 * Math.PI)));
    const range = currentTab.max - currentTab.min;
    if (range <= 0) return;

    const currentProgress = Math.max(
      0,
      Math.min(1, (lastValueRef.current - currentTab.min) / range)
    );

    // Prevent wrap-around jumping when dragging past 12 o'clock (only during continuous drag, not initial tap)
    if (!isInitialTouch) {
      if (currentProgress > 0.75 && rawProgress < 0.25) {
        if (lastValueRef.current !== currentTab.max) {
          hapticSelection();
          lastValueRef.current = currentTab.max;
          onValChange?.(currentTab.max);
        }
        return;
      }
      if (currentProgress < 0.25 && rawProgress > 0.75) {
        if (lastValueRef.current !== currentTab.min) {
          hapticSelection();
          lastValueRef.current = currentTab.min;
          onValChange?.(currentTab.min);
        }
        return;
      }
    }

    const step = currentTab.step ?? 1;
    const rawVal = currentTab.min + rawProgress * range;
    const steppedVal = Math.round(rawVal / step) * step;
    const decimals = step < 1 ? 1 : 0;
    const clampedVal = Math.max(
      currentTab.min,
      Math.min(currentTab.max, Number(steppedVal.toFixed(decimals)))
    );

    if (clampedVal !== lastValueRef.current) {
      hapticSelection();
      lastValueRef.current = clampedVal;
      onValChange?.(clampedVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (propsRef.current.isOffline) return false;
        const dx = evt.nativeEvent.locationX - size / 2;
        const dy = evt.nativeEvent.locationY - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Only accept touches strictly ON the circular track or knob
        return Math.abs(dist - radius) <= 24;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (propsRef.current.isOffline) return false;
        if (isInteractingWithDial.current) return true;
        const dx = evt.nativeEvent.locationX - size / 2;
        const dy = evt.nativeEvent.locationY - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.abs(dist - radius) <= 24 && (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6);
      },
      onPanResponderGrant: (evt) => {
        if (propsRef.current.isOffline) return;
        isInteractingWithDial.current = true;
        setIsDragging(true);
        propsRef.current.onSlidingStart?.();
        const startX = evt.nativeEvent.locationX;
        const startY = evt.nativeEvent.locationY;
        touchStartRef.current = { x: startX, y: startY };
        processAngle(startX, startY, true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (propsRef.current.isOffline || !isInteractingWithDial.current) return;
        const curX = touchStartRef.current.x + gestureState.dx;
        const curY = touchStartRef.current.y + gestureState.dy;
        processAngle(curX, curY, false);
      },
      onPanResponderRelease: () => {
        if (isInteractingWithDial.current) {
          isInteractingWithDial.current = false;
          setIsDragging(false);
          propsRef.current.onSlidingComplete?.(lastValueRef.current);
        }
      },
      onPanResponderTerminate: () => {
        if (isInteractingWithDial.current) {
          isInteractingWithDial.current = false;
          setIsDragging(false);
          propsRef.current.onSlidingComplete?.(lastValueRef.current);
        }
      },
      onPanResponderTerminationRequest: () => !isInteractingWithDial.current,
    })
  ).current;

  // Sleek, small, solid tip knob dimensions
  const knobSize = isDragging ? 22 : 18;

  return (
    <View style={tw`items-center justify-center relative mt-6 sm:mt-8 mb-10 sm:mb-12`}>
      {/* Explicit size x size interactive container so all coordinates align 100% */}
      <View
        collapsable={false}
        {...panResponder.panHandlers}
        style={[
          tw`items-center justify-center relative`,
          { width: size, height: size },
        ]}
      >
        {/* 1. Steady Subtle Ambient Glow (Constant, Non-Blinking) */}
        {!isOffline && (
          <View
            pointerEvents="none"
            style={[
              tw`absolute rounded-full`,
              {
                width: size - 20,
                height: size - 20,
                backgroundColor: dialColor,
                opacity: isDarkMode ? (isDragging ? 0.18 : 0.12) : (isDragging ? 0.14 : 0.08),
                shadowColor: dialColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDarkMode ? 0.45 : 0.25,
                shadowRadius: 22,
              },
            ]}
          />
        )}

        {/* 2. Rotating Dashed Orbit Line */}
        {!isOffline && (
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
                stroke={dialColor}
                strokeWidth={1.2}
                strokeDasharray="4 8"
                strokeOpacity={isDarkMode ? 0.32 : 0.25}
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}

        {/* Background Soft Plate */}
        <View
          pointerEvents="none"
          style={[
            tw`absolute rounded-full`,
            {
              width: size - 36,
              height: size - 36,
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              shadowColor: dialColor,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isOffline ? 0.05 : isDarkMode ? 0.25 : 0.12,
              shadowRadius: 20,
              elevation: isOffline ? 2 : 6,
            },
          ]}
        />

        <Svg pointerEvents="none" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={dialColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={dialColor} stopOpacity={isOffline ? '0.85' : '0.7'} />
            </SvgGradient>
          </Defs>

          {/* Outer subtle static guide track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius + (isLargeDevice ? 10 : 8)}
            stroke={isDarkMode ? '#1e293b' : '#e2e8f0'}
            strokeWidth={1}
            strokeDasharray="2 4"
            fill="none"
          />

          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDarkMode ? '#1e293b' : '#f1f5f9'}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Active Progress Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#dialGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* 3. Sleek, Small, Solid Tip Knob (Concentrically aligned to progress bar tip, solid fill) */}
        <View
          pointerEvents="none"
          style={[
            tw`absolute rounded-full`,
            {
              left: thumbX - knobSize / 2,
              top: thumbY - knobSize / 2,
              width: knobSize,
              height: knobSize,
              backgroundColor: dialColor,
              borderWidth: 2.5,
              borderColor: isOffline ? (isDarkMode ? '#334155' : '#cbd5e1') : '#ffffff',
              shadowColor: dialColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isOffline ? 0 : 0.65,
              shadowRadius: isDragging ? 6 : 4,
              elevation: isOffline ? 0 : 7,
            },
          ]}
        />

        {/* Central Display Content */}
        <View
          pointerEvents="none"
          style={[
            tw`absolute items-center justify-center`,
            {
              width: size - (isLargeDevice ? 62 : 54),
              height: size - (isLargeDevice ? 62 : 54),
            },
          ]}
        >
          {/* Top Mini Tag: TARGET SETTING */}
          <View style={tw`flex-row items-center gap-1.5 mb-1`}>
            <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: isOffline ? (isDarkMode ? '#64748b' : '#94a3b8') : activeTabData.color }]} />
            <Text
              style={[
                tw`text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' },
              ]}
            >
              {isOffline ? 'CONTROLLER OFFLINE' : 'TARGET SETPOINT'}
            </Text>
          </View>

          {/* Large Value & Unit */}
          <View style={tw`flex-row items-baseline justify-center`}>
            <Text
              style={[
                isOffline ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-900 dark:text-white`,
                {
                  fontSize: valueFontSize,
                  fontFamily: 'PlusJakartaSans_800ExtraBold',
                  lineHeight: valueLineHeight,
                  letterSpacing: -1.5,
                },
              ]}
            >
              {localTarget}
            </Text>
            <Text
              style={[
                tw`font-bold ml-1.5`,
                {
                  fontSize: unitFontSize,
                  color: dialColor,
                  fontFamily: 'PlusJakartaSans_800ExtraBold',
                },
              ]}
            >
              {activeTabData.unit}
            </Text>
          </View>

          {/* Live vs Target Badge */}
          <View
            style={tw`mt-1.5 sm:mt-2 flex-row items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1 sm:px-3.5 sm:py-1.2 rounded-full border border-slate-200/60 dark:border-slate-700/60`}
          >
            {isOffline ? (
              <View style={tw`flex-row items-center gap-1.5`}>
                <View style={tw`w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500`} />
                <Text
                  style={[
                    tw`text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  Offline (Read-Only)
                </Text>
              </View>
            ) : isDisconnected ? (
              <View style={tw`flex-row items-center gap-1.5`}>
                <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-500`} />
                <Text
                  style={[
                    tw`text-[11px] sm:text-[12px] text-rose-600 dark:text-rose-400`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  Sensor Not Connected
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    tw`text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400`,
                    { fontFamily: 'PlusJakartaSans_600SemiBold' },
                  ]}
                >
                  Current:{' '}
                  <Text
                    style={[
                      tw`text-slate-800 dark:text-slate-200`,
                      { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                    ]}
                  >
                    {activeTabData.current}
                    {activeTabData.unit}
                  </Text>
                </Text>
                <View style={tw`w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600`} />
                <Text
                  style={[
                    tw`text-[10.5px] sm:text-[11.5px]`,
                    isNearTarget ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-amber-600 dark:text-amber-400`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  {isNearTarget ? 'Aligned' : `${diff > 0 ? `+${diff}` : diff}${activeTabData.unit}`}
                </Text>
              </>
            )}
          </View>

          {/* Optimal Range Pill */}
          <View style={tw`mt-1.5 sm:mt-2 flex-row items-center gap-1`}>
            <MaterialCommunityIcons name="check-decagram-outline" size={12} color="#10b981" />
            <Text
              style={[
                tw`text-[10.5px] sm:text-[11.5px] text-slate-400 dark:text-slate-500`,
                { fontFamily: 'PlusJakartaSans_600SemiBold' },
              ]}
            >
              Ideal:{' '}
              <Text style={[tw`text-slate-600 dark:text-slate-300 font-bold`]}>
                {activeTabData.optimal} {activeTabData.unit}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
