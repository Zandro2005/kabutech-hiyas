import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, PanResponder, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import tw from '../tailwind';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSensors, useSettings, useFirebaseConnection } from '../hooks/useFirebaseData';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { useAuth } from '../context/AuthContext';
import { hapticLight, hapticSelection, hapticMedium } from '../utils/haptics';
import AnalyticsScreenSkeleton from '../components/skeletons/AnalyticsScreenSkeleton';
import { useResponsive } from '../utils/responsive';
import { useTabBarScroll } from '../context/TabBarContext';

type MetricType = 'temp' | 'hum' | 'light' | 'co2';

// Smooth 60 FPS breathing status dot
const BreathingDot = React.memo(function BreathingDot({ 
  color = '#10b981', 
  size = 8 
}: { 
  color?: string; 
  size?: number;
}) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacityAnim,
      }}
    />
  );
});

// Smooth Bezier Curve generator for SVG from real telemetry points
const getBezierPath = (pts: { x: number; y: number }[]) => {
  if (pts.length < 2) {
    if (pts.length === 1) return `M 8 ${pts[0].y} L 280 ${pts[0].y}`;
    return '';
  }
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

export default function AnalyticsScreen() {
  const { onScroll: handleTabBarScroll } = useTabBarScroll();
  const { isDarkMode } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFirebaseConnected = useFirebaseConnection();
  const sensors = useSensors();
  const settings = useSettings();
  const health = useSensorHealth();
  const { width } = useResponsive();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'operator';

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => setIsReady(true));
      return () => cancelIdleCallback(handle);
    }
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const initialMetric = (route.params?.metric || route.params?.tab) as MetricType | undefined;
  const [activeMetric, setActiveMetric] = useState<MetricType>(
    initialMetric && ['temp', 'hum', 'light', 'co2'].includes(initialMetric) ? initialMetric : 'temp'
  );
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  useEffect(() => {
    const paramMetric = route.params?.metric || route.params?.tab;
    if (paramMetric && ['temp', 'hum', 'light', 'co2'].includes(paramMetric)) {
      setActiveMetric(paramMetric as MetricType);
      setSelectedPointIndex(null);
      setTimeout(() => scrollToTab(paramMetric as MetricType), 250);
    }
  }, [route.params?.metric, route.params?.tab]);

  // Extract direct live sensor values streamed strictly from Firebase Realtime Database
  const hasFirebaseTemp = typeof sensors?.temperature === 'number' && sensors.temperature > 0 && sensors.temperature !== -999;
  const hasFirebaseHum = typeof sensors?.humidity === 'number' && sensors.humidity > 0 && sensors.humidity !== -999;
  const hasFirebaseLight = typeof sensors?.light === 'number' && sensors.light >= 0 && sensors.light !== -999;
  const hasFirebaseCo2 = typeof sensors?.co2 === 'number' && sensors.co2 > 0 && sensors.co2 !== -999;

  const isTempDisconnected = Boolean(
    !isFirebaseConnected ||
    !health.isControllerOnline ||
    health.tempError ||
    !hasFirebaseTemp
  );
  const isHumDisconnected = Boolean(
    !isFirebaseConnected ||
    !health.isControllerOnline ||
    health.humError ||
    !hasFirebaseHum
  );
  const isLightDisconnected = Boolean(
    !isFirebaseConnected ||
    !health.isControllerOnline ||
    health.lightError ||
    !hasFirebaseLight
  );
  const isCo2Disconnected = Boolean(
    !isFirebaseConnected ||
    !health.isControllerOnline ||
    health.co2Error ||
    !hasFirebaseCo2
  );

  // Strictly real Firebase values only: null when disconnected/offline, never placeholder mock numbers
  const liveTemp = !isTempDisconnected && hasFirebaseTemp ? sensors.temperature : null;
  const liveHum = !isHumDisconnected && hasFirebaseHum ? sensors.humidity : null;
  const liveLight = !isLightDisconnected && hasFirebaseLight ? sensors.light : null;
  const liveCo2 = !isCo2Disconnected && hasFirebaseCo2 ? sensors.co2 : null;

  const currentLiveValues: Record<MetricType, number | string> = {
    temp: isTempDisconnected || liveTemp == null ? 'Offline' : liveTemp,
    hum: isHumDisconnected || liveHum == null ? 'Offline' : liveHum,
    light: isLightDisconnected || liveLight == null ? 'Offline' : liveLight,
    co2: isCo2Disconnected || liveCo2 == null ? 'Offline' : liveCo2,
  };

  // Target Setpoints from Firebase Settings
  const rawTargetTemp = typeof settings?.setpoints?.temperature === 'number'
    ? settings.setpoints.temperature
    : parseFloat(settings?.setpoints?.temperature as any) || 28.0;
  const targetTemp = Math.max(18, Math.min(35, rawTargetTemp));

  const rawTargetHum = typeof settings?.setpoints?.humidity === 'number'
    ? settings.setpoints.humidity
    : parseFloat(settings?.setpoints?.humidity as any) || 85;
  const targetHum = Math.max(50, Math.min(95, rawTargetHum));

  const rawTargetLight = typeof settings?.setpoints?.light === 'number'
    ? settings.setpoints.light
    : parseFloat(settings?.setpoints?.light as any) || 580;
  const targetLight = Math.max(200, Math.min(800, rawTargetLight));

  const rawTargetCO2 = typeof settings?.setpoints?.co2 === 'number'
    ? settings.setpoints.co2
    : parseFloat(settings?.setpoints?.co2 as any) || 690;
  const targetCO2 = Math.max(300, Math.min(1200, rawTargetCO2));

  const metricsInfo = {
    temp: { 
      label: 'Temperature', 
      shortLabel: 'Temp', 
      unit: '°C', 
      color: '#f97316', 
      accentBg: 'bg-orange-500/10 dark:bg-orange-500/20',
      icon: 'thermometer' as const,
      optimal: '24.0 - 28.0°C',
      min: 18,
      max: 35,
      target: targetTemp,
      liveVal: liveTemp,
      isDisconnected: isTempDisconnected,
    },
    hum: { 
      label: 'Humidity', 
      shortLabel: 'Hum', 
      unit: '%', 
      color: '#0ea5e9', 
      accentBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      icon: 'water-percent' as const,
      optimal: '80 - 90%',
      min: 50,
      max: 95,
      target: targetHum,
      liveVal: liveHum,
      isDisconnected: isHumDisconnected,
    },
    light: { 
      label: 'Light Level', 
      shortLabel: 'Light', 
      unit: 'lx', 
      color: '#f59e0b', 
      accentBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      icon: 'white-balance-sunny' as const,
      optimal: '500 - 800 lx',
      min: 200,
      max: 800,
      target: targetLight,
      liveVal: liveLight,
      isDisconnected: isLightDisconnected,
    },
    co2: { 
      label: 'CO2 Level', 
      shortLabel: 'CO2', 
      unit: 'ppm', 
      color: '#10b981', 
      accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      icon: 'molecule-co2' as const,
      optimal: '< 800 ppm',
      min: 300,
      max: 1200,
      target: targetCO2,
      liveVal: liveCo2,
      isDisconnected: isCo2Disconnected,
    },
  };

  const currentMetric = metricsInfo[activeMetric];
  const isDis = currentMetric.isDisconnected || currentMetric.liveVal == null;

  // Real-time telemetry buffer accumulated exclusively from incoming live Firebase packets
  const [telemetryHistory, setTelemetryHistory] = useState<Record<MetricType, { value: number; time: string }[]>>({
    temp: [],
    hum: [],
    light: [],
    co2: [],
  });

  useEffect(() => {
    if (!isFirebaseConnected || !health.isControllerOnline) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    setTelemetryHistory(prev => {
      const next = { ...prev };
      if (!isTempDisconnected && liveTemp != null) {
        const arr = next.temp;
        const last = arr[arr.length - 1];
        if (!last || last.value !== liveTemp || arr.length < 2) {
          next.temp = [...arr, { value: liveTemp, time: timeStr }].slice(-24);
        }
      }
      if (!isHumDisconnected && liveHum != null) {
        const arr = next.hum;
        const last = arr[arr.length - 1];
        if (!last || last.value !== liveHum || arr.length < 2) {
          next.hum = [...arr, { value: liveHum, time: timeStr }].slice(-24);
        }
      }
      if (!isLightDisconnected && liveLight != null) {
        const arr = next.light;
        const last = arr[arr.length - 1];
        if (!last || last.value !== liveLight || arr.length < 2) {
          next.light = [...arr, { value: liveLight, time: timeStr }].slice(-24);
        }
      }
      if (!isCo2Disconnected && liveCo2 != null) {
        const arr = next.co2;
        const last = arr[arr.length - 1];
        if (!last || last.value !== liveCo2 || arr.length < 2) {
          next.co2 = [...arr, { value: liveCo2, time: timeStr }].slice(-24);
        }
      }
      return next;
    });
  }, [liveTemp, liveHum, liveLight, liveCo2, isFirebaseConnected, health.isControllerOnline, isTempDisconnected, isHumDisconnected, isLightDisconnected, isCo2Disconnected]);

  // Pure Firebase Chart Data: empty when offline; real Firebase packets when online
  const chartData = useMemo(() => {
    if (isDis || currentMetric.liveVal == null) {
      return [];
    }
    const realPackets = telemetryHistory[activeMetric];
    if (realPackets.length === 0) {
      return [
        { value: currentMetric.liveVal, time: 'Live' },
        { value: currentMetric.liveVal, time: 'Now' },
      ];
    }
    if (realPackets.length === 1) {
      return [
        { value: realPackets[0].value, time: realPackets[0].time },
        { value: currentMetric.liveVal, time: 'Now' },
      ];
    }
    return realPackets;
  }, [isDis, currentMetric.liveVal, telemetryHistory, activeMetric]);

  const min = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : '--';
  const max = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : '--';

  // Status and Deviation for Active Metric
  const liveValNum = typeof currentMetric.liveVal === 'number' ? currentMetric.liveVal : 0;
  const diff = Number((liveValNum - currentMetric.target).toFixed(1));

  let statusLabel = 'Within Target';
  let statusColor = '#10b981';
  let statusBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';

  if (isDis) {
    statusLabel = 'Sensor Offline';
    statusColor = '#94a3b8';
    statusBg = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
  } else if (activeMetric === 'temp') {
    if (Math.abs(diff) <= 1.5) {
      statusLabel = 'Within Target';
    } else if (diff > 1.5) {
      statusLabel = 'Above Target';
      statusColor = '#f97316';
      statusBg = 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60';
    } else {
      statusLabel = 'Below Target';
      statusColor = '#0ea5e9';
      statusBg = 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60';
    }
  } else if (activeMetric === 'hum') {
    if (Math.abs(diff) <= 5) {
      statusLabel = 'Within Target';
    } else if (diff > 5) {
      statusLabel = 'Above Target';
      statusColor = '#0ea5e9';
      statusBg = 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60';
    } else {
      statusLabel = 'Below Target';
      statusColor = '#f59e0b';
      statusBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
    }
  } else if (activeMetric === 'co2') {
    if (liveValNum <= currentMetric.target + 50) {
      statusLabel = 'Optimal CO2';
    } else if (liveValNum <= 950) {
      statusLabel = 'Elevated CO2';
      statusColor = '#f59e0b';
      statusBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
    } else {
      statusLabel = 'High CO2';
      statusColor = '#ef4444';
      statusBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60';
    }
  } else {
    // Light
    if (Math.abs(diff) <= 100) {
      statusLabel = 'Optimal Level';
    } else if (diff > 100) {
      statusLabel = 'Bright Level';
      statusColor = '#f59e0b';
      statusBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
    } else {
      statusLabel = 'Dim Level';
      statusColor = '#64748b';
      statusBg = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  }

  // Sparkline Layout Calculations
  const sparklineHeight = 150;
  const [cardWidth, setCardWidth] = useState(width - 40);
  const sparklineWidth = Math.max(260, cardWidth - 40);

  const minVal = Math.min(...chartData.map(d => d.value), currentMetric.target);
  const maxVal = Math.max(...chartData.map(d => d.value), currentMetric.target);
  const spread = Math.max(1, maxVal - minVal);
  const paddedMin = Math.max(currentMetric.min, Number((minVal - spread * 0.12).toFixed(1)));
  const paddedMax = Math.min(currentMetric.max, Number((maxVal + spread * 0.12).toFixed(1)));
  const valueRange = Math.max(0.1, paddedMax - paddedMin);

  const points = useMemo(() => {
    const startX = 8;
    const availableWidth = sparklineWidth - 16;
    return chartData.map((data, index) => {
      const x = startX + (index / (chartData.length - 1)) * availableWidth;
      const clampedVal = Math.min(paddedMax, Math.max(paddedMin, data.value));
      const y = (sparklineHeight - 14) - ((clampedVal - paddedMin) / valueRange) * (sparklineHeight - 28);
      return { 
        x, 
        y, 
        value: data.value, 
        time: data.time, 
        index 
      };
    });
  }, [chartData, sparklineWidth, sparklineHeight, paddedMin, paddedMax, valueRange]);

  const targetY = useMemo(() => {
    const clampedTarget = Math.min(paddedMax, Math.max(paddedMin, currentMetric.target));
    return (sparklineHeight - 14) - ((clampedTarget - paddedMin) / valueRange) * (sparklineHeight - 28);
  }, [currentMetric.target, paddedMin, paddedMax, valueRange, sparklineHeight]);

  const bezierPath = useMemo(() => getBezierPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!bezierPath || points.length === 0) return '';
    return `${bezierPath} L ${points[points.length - 1].x} ${sparklineHeight} L ${points[0].x} ${sparklineHeight} Z`;
  }, [bezierPath, points, sparklineHeight]);

  const activePoint = selectedPointIndex !== null ? points[selectedPointIndex] : points[points.length - 1];
  const lastPoint = points[points.length - 1];

  const handleTouchAt = (locX: number) => {
    const startX = 8;
    const availableWidth = sparklineWidth - 16;
    const norm = Math.max(0, Math.min(1, (locX - startX) / availableWidth));
    const idx = Math.round(norm * (chartData.length - 1));
    if (idx >= 0 && idx < chartData.length && idx !== selectedPointIndex) {
      setSelectedPointIndex(idx);
    }
  };

  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3;
      },
      onPanResponderGrant: (evt) => {
        hapticLight();
        handleTouchAt(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleTouchAt(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const scrollToTab = (key: MetricType) => {
    const layout = tabLayouts.current[key];
    if (layout && tabScrollRef.current) {
      const targetScrollX = Math.max(0, layout.x - width / 2 + layout.width / 2);
      tabScrollRef.current.scrollTo({ x: targetScrollX, animated: true });
    }
  };

  const handleSelectMetric = (key: MetricType) => {
    hapticSelection();
    setActiveMetric(key);
    setSelectedPointIndex(null);
    scrollToTab(key);
  };

  const metricKeys: MetricType[] = ['temp', 'hum', 'light', 'co2'];
  const switchMetricRelative = (direction: 'next' | 'prev') => {
    const currentIndex = metricKeys.indexOf(activeMetric);
    if (currentIndex === -1) return;
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = metricKeys.length - 1;
    if (nextIndex >= metricKeys.length) nextIndex = 0;
    const nextMetric = metricKeys[nextIndex];
    handleSelectMetric(nextMetric);
  };

  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          switchMetricRelative('next');
        } else if (gestureState.dx > 40) {
          switchMetricRelative('prev');
        }
      },
    })
  ).current;

  return (
    <View style={[tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {!isReady ? (
        <AnalyticsScreenSkeleton />
      ) : (
      <ScrollView
        contentContainerStyle={tw`pb-32 pt-4`}
        showsVerticalScrollIndicator={false}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        
        {/* Header */}
        <View style={tw`px-6 mb-5 flex-row items-center`}>
          <View style={tw`flex-row items-center gap-3.5 flex-1`}>
            <TouchableOpacity 
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              onPress={() => navigation.goBack()}
              style={tw`w-11 h-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-800`}
            >
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#ffffff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={tw`flex-1`}>
              <Text numberOfLines={1} style={[tw`text-2xl text-slate-900 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Climate Analytics
              </Text>
              <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: isFirebaseConnected ? '#10b981' : '#f59e0b' }]} />
                <Text numberOfLines={1} style={[tw`text-xs text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                  {isFirebaseConnected ? 'Connected to Firebase' : 'Connecting to Firebase...'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metric Selection Tabs */}
        <View style={tw`mb-5`}>
          <ScrollView 
            ref={tabScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            decelerationRate="normal"
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            overScrollMode="never"
            contentContainerStyle={tw`px-6 gap-2.5`}
          >
            {(Object.keys(metricsInfo) as MetricType[]).map(key => {
              const isActive = activeMetric === key;
              const info = metricsInfo[key];
              const liveVal = currentLiveValues[key];
              const isMetricOffline = info.isDisconnected;

              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.75}
                  delayPressIn={50}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayouts.current[key] = { x, width };
                  }}
                  onPress={() => handleSelectMetric(key)}
                  style={[
                    tw`px-4 py-2.5 rounded-2xl border flex-row items-center gap-2 shadow-sm`,
                    isActive
                      ? [tw`bg-white dark:bg-slate-800`, { borderColor: isMetricOffline ? '#94a3b8' : info.color, borderWidth: 1.5 }]
                      : tw`bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800`
                  ]}
                >
                  <View style={[
                    tw`w-7 h-7 rounded-xl items-center justify-center`, 
                    { backgroundColor: isMetricOffline ? (isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9') : `${info.color}18` }
                  ]}>
                    <MaterialCommunityIcons 
                      name={isMetricOffline ? 'cloud-off-outline' : info.icon} 
                      size={16} 
                      color={isMetricOffline ? '#94a3b8' : info.color} 
                    />
                  </View>
                  <View>
                    <Text style={[tw`text-[10px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {info.shortLabel}
                    </Text>
                    <Text style={[
                      tw`text-[13px]`, 
                      { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                      isMetricOffline ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-800 dark:text-white`
                    ]}>
                      {liveVal}{liveVal === 'Offline' ? '' : info.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Quick Link to Schedule Config */}
            <TouchableOpacity 
              activeOpacity={0.75}
              delayPressIn={50}
              onPress={() => {
                hapticSelection();
                navigation.navigate('DeviceSchedules' as any);
              }}
              style={tw`px-3.5 py-2.5 rounded-2xl border border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 flex-row items-center gap-2`}
            >
              <View style={tw`w-7 h-7 rounded-xl items-center justify-center bg-purple-500/10`}>
                <MaterialCommunityIcons 
                  name="calendar-clock" 
                  size={16} 
                  color="#a855f7" 
                />
              </View>
              <View>
                <Text style={[tw`text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Timer
                </Text>
                <Text style={[tw`text-[12px] text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Schedule
                </Text>
              </View>
            </TouchableOpacity>

            {/* Quick Link to Controls Config */}
            {isAdmin && (
              <TouchableOpacity 
                activeOpacity={0.75}
                delayPressIn={50}
                onPress={() => {
                  hapticSelection();
                  navigation.navigate('Main' as any, {
                    screen: 'Controls',
                    params: { tab: activeMetric }
                  });
                }}
                style={tw`px-3.5 py-2.5 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 flex-row items-center gap-2`}
              >
                <View style={tw`w-7 h-7 rounded-xl items-center justify-center bg-emerald-500/10`}>
                  <MaterialCommunityIcons 
                    name="tune" 
                    size={16} 
                    color="#10b981" 
                  />
                </View>
                <View>
                  <Text style={[tw`text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    Adjust
                  </Text>
                  <Text style={[tw`text-[12px] text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Controls
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Main 24H Interactive Sparkline Card */}
        <View 
          onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
          style={tw`bg-white dark:bg-slate-900 mx-5 rounded-[28px] p-5 shadow-sm border border-slate-200/70 dark:border-slate-800 mb-5`}
        >
          {/* Card Top: Live Inspector & Status Tag */}
          <View style={tw`flex-row justify-between items-start mb-3`}>
            <View>
              <View style={tw`flex-row items-center gap-2 mb-1`}>
                <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: isDis ? '#94a3b8' : currentMetric.color }]} />
                <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {isDis 
                    ? 'Sensor Offline' 
                    : (selectedPointIndex !== null ? `Point (${activePoint?.time})` : `Live Reading (${lastPoint?.time})`)}
                </Text>
              </View>
              <View style={tw`flex-row items-baseline gap-1.5`}>
                <Text style={[
                  tw`text-3xl tracking-tight`, 
                  { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  isDis ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-900 dark:text-white`
                ]}>
                  {isDis 
                    ? 'Offline' 
                    : (selectedPointIndex !== null ? (activePoint?.value ?? currentMetric.liveVal) : currentMetric.liveVal)}
                </Text>
                {!isDis && (
                  <Text style={[tw`text-sm text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {currentMetric.unit}
                  </Text>
                )}
                {!isDis && selectedPointIndex !== null && (
                  <TouchableOpacity
                    onPress={() => setSelectedPointIndex(null)}
                    style={tw`ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800`}
                  >
                    <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Status Tag */}
            {isDis ? (
              <View style={tw`flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/60 gap-1.5`}>
                <View style={tw`w-2 h-2 rounded-full bg-slate-400`} />
                <Text style={[tw`text-[10px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Offline
                </Text>
              </View>
            ) : (
              <View style={tw`flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-2.5 py-1.5 border border-emerald-200 dark:border-emerald-800/60 gap-1.5`}>
                <BreathingDot color="#10b981" size={7} />
                <Text style={[tw`text-[10px] text-emerald-700 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Live Stream
                </Text>
              </View>
            )}
          </View>

          {/* Body: NO CHART when offline, Sparkline when online */}
          {isDis ? (
            <View style={[tw`items-center justify-center py-10`, { height: sparklineHeight }]}>
              <View style={tw`w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 items-center justify-center mb-3 border border-slate-200/60 dark:border-slate-700/60`}>
                <MaterialCommunityIcons name="cloud-off-outline" size={26} color={isDarkMode ? '#64748b' : '#94a3b8'} />
              </View>
              <Text style={[tw`text-base text-slate-800 dark:text-slate-200 mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Sensor Offline
              </Text>
              <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 text-center px-6 max-w-xs`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                No live telemetry stream. Sensor probe is offline or disconnected.
              </Text>
            </View>
          ) : (
            <>
              {/* Swipe Hint indicator */}
              <View style={tw`flex-row items-center justify-end mb-2 gap-1`}>
                <MaterialCommunityIcons name="gesture-tap" size={13} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                  Slide across curve to inspect hours
                </Text>
              </View>

              {/* Full-Width Sparkline SVG Canvas with Pan Scrubber */}
              <View 
                {...scrubberPanResponder.panHandlers}
                style={{ width: sparklineWidth, height: sparklineHeight }}
              >
                <Svg width={sparklineWidth} height={sparklineHeight}>
                  <Defs>
                    <SvgGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={currentMetric.color} stopOpacity="0.28" />
                      <Stop offset="100%" stopColor={currentMetric.color} stopOpacity="0.0" />
                    </SvgGradient>
                  </Defs>

                  {/* Dotted Target Setpoint Reference Line */}
                  <Line
                    x1="0"
                    y1={targetY}
                    x2={sparklineWidth}
                    y2={targetY}
                    stroke={isDarkMode ? '#334155' : '#e2e8f0'}
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <SvgText
                    x="6"
                    y={targetY - 5}
                    fontSize="9"
                    fontWeight="700"
                    fill={isDarkMode ? '#64748b' : '#94a3b8'}
                  >
                    Target: {currentMetric.target}{currentMetric.unit}
                  </SvgText>

                  {/* Area Gradient Underfill */}
                  {areaPath !== '' && <Path d={areaPath} fill="url(#sparklineGrad)" />}

                  {/* Smooth Bezier Sparkline Curve */}
                  {bezierPath !== '' && (
                    <Path
                      d={bezierPath}
                      stroke={currentMetric.color}
                      strokeWidth="2.75"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Active Scrubber Indicator when inspecting a point */}
                  {selectedPointIndex !== null && activePoint && (
                    <>
                      <Line
                        x1={activePoint.x}
                        y1="8"
                        x2={activePoint.x}
                        y2={sparklineHeight - 8}
                        stroke={currentMetric.color}
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                      <Circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="6"
                        fill={currentMetric.color}
                        stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                        strokeWidth="2.5"
                      />
                    </>
                  )}

                  {/* Rightmost Live Endpoint Dot (Clean Solid SVG Dot, no pulsing) */}
                  {lastPoint && selectedPointIndex === null && (
                    <Circle
                      cx={lastPoint.x}
                      cy={lastPoint.y}
                      r="4.5"
                      fill={currentMetric.color}
                      stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                      strokeWidth="2"
                    />
                  )}
                </Svg>
              </View>
            </>
          )}

          {/* Timeline Footer */}
          <View style={tw`flex-row justify-between items-center px-1 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-1`}>
            <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
              {isDis ? 'Telemetry Stream Paused' : '24H Moving Sparkline'}
            </Text>
            <View style={tw`flex-row items-center gap-1.5`}>
              <View style={[tw`w-2.5 h-[1px] border-b border-dashed`, { borderColor: isDarkMode ? '#64748b' : '#94a3b8' }]} />
              <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Target: {currentMetric.target}{currentMetric.unit}
              </Text>
            </View>
            <View style={tw`flex-row items-center gap-1`}>
              {isDis ? (
                <View style={tw`w-1.5 h-1.5 rounded-full bg-slate-400`} />
              ) : (
                <BreathingDot color="#10b981" size={6} />
              )}
              <Text style={[
                tw`text-[10px]`, 
                { fontFamily: 'PlusJakartaSans_700Bold' },
                isDis ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-700 dark:text-slate-300`
              ]}>
                {isDis ? 'Sensor Offline' : 'Live Sync'}
              </Text>
            </View>
          </View>
        </View>

        {/* Minimal Important Info Card */}
        <View 
          {...swipePanResponder.panHandlers}
          style={tw`bg-white dark:bg-slate-900 mx-5 rounded-[24px] p-5 shadow-sm border border-slate-200/70 dark:border-slate-800 mb-5`}
        >
          {/* Header Row: Status Badge & Adjust Shortcut */}
          <View style={tw`flex-row items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80`}>
            <View style={[tw`px-2.5 py-1 rounded-full border flex-row items-center gap-1.5`, tw`${statusBg}`]}>
              <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: statusColor }]} />
              <Text style={[tw`text-[11px]`, { fontFamily: 'PlusJakartaSans_700Bold', color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>

            {isAdmin && (
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  hapticSelection();
                  navigation.navigate('Main' as any, {
                    screen: 'Controls',
                    params: { tab: activeMetric }
                  });
                }}
                style={tw`flex-row items-center gap-1`}
              >
                <Text style={[tw`text-xs text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Adjust Setpoint
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#10b981" />
              </TouchableOpacity>
            )}
          </View>

          {/* 3 Metric Summary Stats in a Clean Grid */}
          <View style={tw`flex-row items-center justify-between pt-4 pb-1`}>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[10.5px] text-slate-400 uppercase tracking-wider mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Set Target
              </Text>
              <View style={tw`flex-row items-baseline gap-0.5`}>
                <Text style={[tw`text-xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {currentMetric.target}
                </Text>
                <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {currentMetric.unit}
                </Text>
              </View>
            </View>

            <View style={tw`w-[1px] h-9 bg-slate-100 dark:bg-slate-800 mx-2`} />

            <View style={tw`flex-1 items-center`}>
              <Text style={[tw`text-[10.5px] text-slate-400 uppercase tracking-wider mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                24H Low
              </Text>
              <View style={tw`flex-row items-baseline gap-0.5`}>
                <Text style={[tw`text-xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {isDis ? '--' : min}
                </Text>
                {!isDis && (
                  <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {currentMetric.unit}
                  </Text>
                )}
              </View>
            </View>

            <View style={tw`w-[1px] h-9 bg-slate-100 dark:bg-slate-800 mx-2`} />

            <View style={tw`flex-1 items-end`}>
              <Text style={[tw`text-[10.5px] text-slate-400 uppercase tracking-wider mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                24H High
              </Text>
              <View style={tw`flex-row items-baseline gap-0.5`}>
                <Text style={[tw`text-xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {isDis ? '--' : max}
                </Text>
                {!isDis && (
                  <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {currentMetric.unit}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Clean Optimal Range Sub-bar */}
          <View style={tw`mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <MaterialCommunityIcons name="target" size={14} color="#10b981" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Optimal Mushroom Range
              </Text>
            </View>
            <Text style={[tw`text-[12px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {currentMetric.optimal}
            </Text>
          </View>
        </View>

        {/* Minimal AI Forecast Banner */}
        <View style={tw`px-5`}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              hapticMedium();
              navigation.navigate('Report' as never);
            }}
            style={tw`bg-emerald-500 dark:bg-emerald-600 rounded-[20px] p-4 shadow-sm flex-row items-center justify-between`}
          >
            <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
              <View style={tw`w-8 h-8 rounded-xl bg-white/20 items-center justify-center`}>
                <MaterialCommunityIcons name="star-four-points" size={16} color="white" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-white text-xs uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  AI Forecast & Insights
                </Text>
                <Text numberOfLines={1} style={[tw`text-white/90 text-[11px]`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  View 24h predictive climate models & yield advisory
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>

      </ScrollView>
      )}
    </View>
  );
}
