import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useResponsive } from '../utils/responsive';
import { ParamRange, ACTIVE_PROFILE } from '../config/cropProfiles';
import { evaluateParam, ParamKey } from '../utils/environmentRanges';

interface Props {
  scaleMin: number;
  scaleMax: number;
  band: ParamRange;
  current: number | string;
  color: string;
  unit: string;
  label: string;
  isDarkMode: boolean;
  isOffline?: boolean;
  isDisconnected?: boolean;
}

export default React.memo(function RangeGauge({
  scaleMin,
  scaleMax,
  band,
  current,
  color,
  unit,
  label,
  isDarkMode,
  isOffline = false,
  isDisconnected = false,
}: Props) {
  const { isSmallDevice, isLargeDevice } = useResponsive();

  const numCurrent =
    typeof current === 'number'
      ? current
      : parseFloat(String(current));

  const isFault =
    isOffline ||
    isDisconnected ||
    isNaN(numCurrent) ||
    numCurrent === -999 ||
    (label === 'Light' ? numCurrent < 0 : numCurrent <= 0);

  const dialColor = isFault ? (isDarkMode ? '#64748b' : '#94a3b8') : color;

  // Circular gauge dimensions matching the original dial
  const size = isSmallDevice ? 285 : isLargeDevice ? 345 : 315;
  const strokeWidth = isSmallDevice ? 13 : isLargeDevice ? 16 : 14.5;
  const radius = size / 2 - strokeWidth - (isLargeDevice ? 14 : 12);
  const circumference = 2 * Math.PI * radius;

  // Band calculations
  const bandMin = band.min !== undefined ? band.min : scaleMin;
  const bandMax = band.max !== undefined ? band.max : scaleMax;
  const grace = band.graceBearing || 0;

  // Safe zone with grace bearing
  const safeMin = band.min !== undefined ? band.min - grace : scaleMin;
  const safeMax = band.max !== undefined ? band.max + grace : scaleMax;

  // Fraction mapping to circumference (0 progress at 12 o'clock, with -90 deg rotation)
  const toFrac = (v: number) => Math.max(0, Math.min(1, (v - scaleMin) / (scaleMax - scaleMin)));

  // Research optimal band arc
  const optStartFrac = toFrac(bandMin);
  const optEndFrac = toFrac(bandMax);
  const optLength = Math.max(0, (optEndFrac - optStartFrac) * circumference);
  const optDashoffset = -optStartFrac * circumference;

  // Grace zone arc (outer subtle track)
  const graceStartFrac = toFrac(safeMin);
  const graceEndFrac = toFrac(safeMax);
  const graceLength = Math.max(0, (graceEndFrac - graceStartFrac) * circumference);
  const graceDashoffset = -graceStartFrac * circumference;

  // Current reading position
  const currentProgress = isFault ? 0 : toFrac(numCurrent);
  const currentAngle = currentProgress * 2 * Math.PI - Math.PI / 2;
  const markerX = size / 2 + radius * Math.cos(currentAngle);
  const markerY = size / 2 + radius * Math.sin(currentAngle);

  // Status classification matching exact TFT display pills
  let statusText = 'Optimal';
  let statusColor = '#10b981';
  let statusBg = isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5';

  const paramKey: ParamKey | null =
    label === 'Temperature' ? 'temp' :
    label === 'Humidity' ? 'hum' :
    label.toLowerCase().includes('light') ? 'light' :
    label.toLowerCase().includes('co2') ? 'co2' : null;

  if (isFault) {
    statusText = isOffline ? 'Offline' : 'Fault';
    statusColor = '#94a3b8';
    statusBg = isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9';
  } else if (paramKey && !isNaN(numCurrent)) {
    const evaluation = evaluateParam(paramKey, numCurrent, false, ACTIVE_PROFILE);
    statusText = evaluation.statusLabel;
    if (evaluation.state === 'in_range') {
      statusColor = '#10b981';
      statusBg = isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5';
    } else {
      const isCrit = evaluation.severity === 'critical';
      statusColor = isCrit ? '#ef4444' : '#f59e0b';
      statusBg = isCrit
        ? (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
        : (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb');
    }
  } else if (numCurrent < bandMin) {
    statusText = 'Low';
    statusColor = '#f59e0b';
    statusBg = isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb';
  } else if (numCurrent > bandMax) {
    statusText = 'High';
    statusColor = '#ef4444';
    statusBg = isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
  }

  // Smooth rotating orbit animation
  const rotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 32000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();
    return () => rotateLoop.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const valueFontSize = isSmallDevice ? 42 : isLargeDevice ? 54 : 48;
  const valueLineHeight = isSmallDevice ? 48 : isLargeDevice ? 62 : 54;
  const unitFontSize = isSmallDevice ? 18 : isLargeDevice ? 24 : 21;

  return (
    <View style={tw`items-center justify-center relative mt-6 sm:mt-8 mb-8 sm:mb-10`}>
      <View
        collapsable={false}
        style={[
          tw`items-center justify-center relative`,
          { width: size, height: size },
        ]}
      >
        {/* 1. Subtle Ambient Glow */}
        {!isFault && (
          <View
            pointerEvents="none"
            style={[
              tw`absolute rounded-full`,
              {
                width: size - 24,
                height: size - 24,
                backgroundColor: dialColor,
                opacity: isDarkMode ? 0.10 : 0.06,
                shadowColor: dialColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDarkMode ? 0.35 : 0.18,
                shadowRadius: 20,
              },
            ]}
          />
        )}

        {/* 2. Rotating Dashed Orbit Line */}
        {!isFault && (
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
                strokeOpacity={isDarkMode ? 0.30 : 0.22}
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}

        {/* Background Soft Inner Plate */}
        <View
          pointerEvents="none"
          style={[
            tw`absolute rounded-full`,
            {
              width: size - 36,
              height: size - 36,
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              shadowColor: dialColor,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isFault ? 0.05 : isDarkMode ? 0.20 : 0.10,
              shadowRadius: 18,
              elevation: isFault ? 2 : 5,
            },
          ]}
        />

        <Svg pointerEvents="none" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={dialColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={dialColor} stopOpacity={isFault ? '0.8' : '0.65'} />
            </SvgGradient>
          </Defs>

          {/* Background Full Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDarkMode ? '#1e293b' : '#f1f5f9'}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Grace Zone Arc (Subtle outer buffer) */}
          {!isFault && graceLength > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={dialColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${graceLength} ${Math.max(0, circumference - graceLength)}`}
              strokeDashoffset={graceDashoffset}
              strokeOpacity={isDarkMode ? 0.22 : 0.16}
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}

          {/* Research Optimal Target Band (Solid shaded highlight) */}
          {!isFault && optLength > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#gaugeGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${optLength} ${Math.max(0, circumference - optLength)}`}
              strokeDashoffset={optDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>

        {/* 3. Live Reading Marker Dot */}
        {!isFault && (
          <View
            pointerEvents="none"
            style={[
              tw`absolute rounded-full`,
              {
                left: markerX - 9,
                top: markerY - 9,
                width: 18,
                height: 18,
                backgroundColor: statusColor,
                borderWidth: 2.5,
                borderColor: '#ffffff',
                shadowColor: statusColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.6,
                shadowRadius: 5,
                elevation: 6,
              },
            ]}
          />
        )}

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
          {/* Top Status Header */}
          <View style={tw`flex-row items-center gap-1.5 mb-1`}>
            <View
              style={[
                tw`w-1.5 h-1.5 rounded-full`,
                { backgroundColor: statusColor },
              ]}
            />
            <Text
              style={[
                tw`text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' },
              ]}
            >
              {isDisconnected ? 'SENSOR AT FAULT' : isOffline ? 'CONTROLLER OFFLINE' : 'CURRENT READING'}
            </Text>
          </View>

          {/* Large Live Reading & Unit */}
          <View style={tw`flex-row items-baseline justify-center`}>
            <Text
              style={[
                isFault ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-900 dark:text-white`,
                {
                  fontSize: valueFontSize,
                  fontFamily: 'PlusJakartaSans_800ExtraBold',
                  lineHeight: valueLineHeight,
                  letterSpacing: -1.5,
                },
              ]}
            >
              {isFault ? '--' : typeof numCurrent === 'number' ? (label === 'Temperature' ? numCurrent.toFixed(1) : Math.round(numCurrent)) : current}
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
              {unit}
            </Text>
          </View>

          {/* Status Pill Badge */}
          <View
            style={[
              tw`mt-2 flex-row items-center gap-1.5 px-3 py-1 rounded-full border`,
              {
                backgroundColor: statusBg,
                borderColor: statusColor + '30',
              },
            ]}
          >
            <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: statusColor }]} />
            <Text
              style={[
                tw`text-[11px] sm:text-[12px] font-bold`,
                { color: statusColor, fontFamily: 'PlusJakartaSans_700Bold' },
              ]}
            >
              {statusText}
            </Text>
          </View>

          {/* Optimal Band Range Pill */}
          {!isFault && (
            <Text
              style={[
                tw`mt-2 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-semibold`,
                { fontFamily: 'PlusJakartaSans_600SemiBold' },
              ]}
            >
              Optimal: {bandMin}–{bandMax} {unit}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});
