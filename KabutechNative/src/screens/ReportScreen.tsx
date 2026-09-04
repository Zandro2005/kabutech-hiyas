import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Vibration,
  Animated,
  PanResponder,
  DeviceEventEmitter,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import tw from '../tailwind';
import { useSensors, useSettings, calculateEnvironmentScore } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import { SoundManager } from '../utils/SoundManager';
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSelection,
  hapticSuccess,
} from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

const globalTimeouts: ReturnType<typeof setTimeout>[] = [];
let isGlobalProcessing: string | false = false;
const globalStartTimes: Record<string, number> = {};

DeviceEventEmitter.addListener('cancelAiOverride', () => {
  globalTimeouts.forEach(clearTimeout);
  globalTimeouts.length = 0;
  isGlobalProcessing = false;
  Object.keys(globalStartTimes).forEach((k) => delete globalStartTimes[k]);
});

type MetricKey = 'temp' | 'hum' | 'light' | 'co2';
type ForecastHorizon = '2H' | '6H' | '24H';

// Smooth SVG Bezier helper
const getBezierPath = (pts: { x: number; y: number }[]) => {
  if (pts.length < 2) return '';
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

const getAreaPath = (pts: { x: number; y: number }[], height: number) => {
  if (pts.length < 2) return '';
  const curve = getBezierPath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${curve} L ${last.x} ${height} L ${first.x} ${height} Z`;
};

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();
  const { isDarkMode } = useTheme();
  const { width } = useResponsive();

  // Processing state
  const [isProcessing, setIsProcessing] = useState<string | false>(isGlobalProcessing);
  const [now, setNow] = useState(Date.now());
  const [isScanning, setIsScanning] = useState(false);

  // Chart configuration
  const [activeMetric, setActiveMetric] = useState<MetricKey>('temp');
  const [activeHorizon, setActiveHorizon] = useState<ForecastHorizon>('2H');

  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const chartScrollRef = useRef<ScrollView>(null);

  // Modal
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [selectedActions, setSelectedActions] = useState({
    fans: true,
    misters: true,
    co2: true,
  });

  // Pulse animation for alert dots
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Second ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync global device start times
  useEffect(() => {
    const currentTime = Date.now();
    ['fans', 'misters', 'lights', 'co2'].forEach((device) => {
      if (
        settings?.setpoints?.aiOverride &&
        settings?.setpoints?.devices?.[device as keyof typeof settings.setpoints.devices]
      ) {
        if (!globalStartTimes[device]) globalStartTimes[device] = currentTime;
      } else {
        delete globalStartTimes[device];
      }
    });
  }, [settings?.setpoints?.devices, settings?.setpoints?.aiOverride]);

  const setProcessingState = (state: string | false) => {
    isGlobalProcessing = state;
    DeviceEventEmitter.emit('processingStateChanged', state);
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('cancelAiOverride', () => setProcessingState(false));
    const stateSub = DeviceEventEmitter.addListener('processingStateChanged', (state) => {
      setIsProcessing(state);
    });
    setIsProcessing(isGlobalProcessing);
    return () => {
      sub.remove();
      stateSub.remove();
    };
  }, []);

  // Sensor inputs
  const liveTemp = typeof sensors.temperature === 'number' && sensors.temperature > 0 ? sensors.temperature : 25.8;
  const liveHum = typeof sensors.humidity === 'number' && sensors.humidity > 0 ? sensors.humidity : 72;
  const liveLight = typeof sensors.light === 'number' && sensors.light >= 0 ? sensors.light : 430;
  const liveCo2 = typeof sensors.co2 === 'number' && sensors.co2 > 0 ? sensors.co2 : 760;

  const targetTemp = settings?.setpoints?.temperature ?? 28.0;
  const targetHum = settings?.setpoints?.humidity ?? 85;
  const targetLight = settings?.setpoints?.light ?? 580;
  const targetCo2 = settings?.setpoints?.co2 ?? 690;

  const tempVariance = Number((liveTemp - targetTemp).toFixed(1));
  const humVariance = Number((liveHum - targetHum).toFixed(1));
  const co2Variance = Number((liveCo2 - targetCo2).toFixed(0));

  const isTempCritical = tempVariance > 1.8;
  const isHumCritical = humVariance < -12;
  const isCo2Critical = co2Variance > 180;
  const hasCriticalRisk = isTempCritical || isHumCritical || isCo2Critical;

  const stabilityScore = useMemo(() => {
    return calculateEnvironmentScore(liveTemp, liveHum, liveLight, liveCo2);
  }, [liveTemp, liveHum, liveLight, liveCo2]);

  // Dynamic 2h projections
  const futureValues = useMemo(() => {
    const predTemp = Number((liveTemp + (isTempCritical ? 1.4 : 0.7)).toFixed(1));
    const predHum = Math.max(45, Math.round(liveHum - (isHumCritical ? 14 : 7)));
    const predLight = liveLight;
    const predCo2 = Math.round(liveCo2 + (isCo2Critical ? 220 : 110));

    const tempVar = Number((predTemp - targetTemp).toFixed(1));
    const humVar = Number((predHum - targetHum).toFixed(1));
    const lightVar = Number((predLight - targetLight).toFixed(0));
    const co2Var = Number((predCo2 - targetCo2).toFixed(0));

    return {
      temp: {
        raw: predTemp,
        variance: tempVar,
        status: tempVar > 2 ? 'Critical' : tempVar > 0.8 ? 'Elevated' : 'Normal',
        statusColor: tempVar > 2 ? '#ef4444' : tempVar > 0.8 ? '#f97316' : '#10b981',
        description:
          tempVar > 2
            ? `Temperature is projected to rise ${tempVar}°C above target. Activate cooling fans immediately to prevent plant stress.`
            : tempVar > 0.8
            ? `A mild ${tempVar}°C overshoot is expected. Pre-emptive fan activation is recommended.`
            : `Temperature is on track. No intervention needed within the next 2 hours.`,
        icon: 'thermometer',
      },
      hum: {
        raw: predHum,
        variance: humVar,
        status: humVar < -12 ? 'Critical' : humVar < -5 ? 'Low' : 'Stable',
        statusColor: humVar < -12 ? '#ef4444' : humVar < -5 ? '#0284c7' : '#10b981',
        description:
          humVar < -12
            ? `Humidity will drop ${Math.abs(humVar)}% below target — severe dryness risk. Trigger misters now to protect foliage.`
            : humVar < -5
            ? `A moderate ${Math.abs(humVar)}% humidity deficit is forecast. Short misting intervals are advised.`
            : `Humidity levels are projected to remain stable. Current conditions are within the safe range.`,
        icon: 'water-percent',
      },
      light: {
        raw: predLight,
        variance: lightVar,
        status: lightVar > 60 ? 'High' : lightVar < -60 ? 'Low' : 'Optimal',
        statusColor: lightVar > 60 ? '#f97316' : lightVar < -60 ? '#6366f1' : '#10b981',
        description:
          lightVar > 60
            ? `Light intensity is above the target by ${lightVar} lx. Consider partial shading to avoid leaf scorch.`
            : lightVar < -60
            ? `Light levels are ${Math.abs(lightVar)} lx below target. Supplemental lighting may be needed for optimal growth.`
            : `Light intensity is well-balanced. Plants are receiving the recommended photoperiod dose.`,
        icon: 'white-balance-sunny',
      },
      co2: {
        raw: predCo2,
        variance: co2Var,
        status: co2Var > 180 ? 'Critical' : co2Var > 80 ? 'Elevated' : 'Normal',
        statusColor: co2Var > 180 ? '#ef4444' : co2Var > 80 ? '#a855f7' : '#10b981',
        description:
          co2Var > 180
            ? `CO2 is on a steep upward trajectory (+${co2Var} ppm). Open vents immediately to prevent toxicity.`
            : co2Var > 80
            ? `CO2 concentration is rising (+${co2Var} ppm). Schedule a ventilation cycle within 30 minutes.`
            : `CO2 levels are projected to stay within the safe range. No ventilation action required.`,
        icon: 'molecule-co2',
      },
    };
  }, [liveTemp, liveHum, liveLight, liveCo2, targetTemp, targetHum, targetLight, targetCo2, isTempCritical, isHumCritical, isCo2Critical]);

  const getElapsed = (device: string) => {
    const goalSecs = device === 'misters' ? 10 : 30;
    if (!globalStartTimes[device]) {
      return { current: '00:00', goal: `${goalSecs}s`, progress: 0, secondsRemaining: goalSecs };
    }
    const diff = Math.floor((now - globalStartTimes[device]) / 1000);
    const cappedDiff = Math.min(Math.max(0, diff), goalSecs);
    const progress = Math.min(1, cappedDiff / goalSecs);
    const secondsRemaining = Math.max(0, goalSecs - cappedDiff);
    return { current: `${cappedDiff}s`, goal: `${goalSecs}s`, progress, secondsRemaining };
  };

  // Hardware overrides
  const overrideDevice = async (deviceKey: string, actionName: string, durationMs: number) => {
    if (isGlobalProcessing) {
      showToast({ type: 'info', text1: 'Action in Progress', text2: 'Please wait for current cycle.' });
      return;
    }
    hapticMedium();
    setProcessingState(deviceKey);
    try {
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });
      await update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: true });

      showToast({
        type: 'success',
        text1: `${actionName} Started`,
        text2: `Running for ${Math.round(durationMs / 1000)}s`,
      });

      const timeoutId = setTimeout(() => {
        try {
          update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: false });
          update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

          Vibration.vibrate([0, 300, 150, 300], true);
          SoundManager.playAlarm();

          DeviceEventEmitter.emit('showAlarmModal', {
            title: 'AI Action Finished',
            message: `${actionName} complete. System returned to AUTO.`,
          });
          showToast({ type: 'success', text1: 'Cycle Finished', text2: `${actionName} returned to AUTO.` });
        } catch (e: any) {
          showToast({ type: 'error', text1: 'Revert Error', text2: e?.message || 'Error' });
        } finally {
          setProcessingState(false);
        }
      }, durationMs);
      globalTimeouts.push(timeoutId);
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Override Failed', text2: err.message });
      setProcessingState(false);
    }
  };

  const handleAutoFix = async () => {
    if (!selectedActions.fans && !selectedActions.misters && !selectedActions.co2) {
      showToast({ type: 'info', text1: 'No actions selected' });
      return;
    }
    if (isGlobalProcessing) {
      showToast({ type: 'info', text1: 'Action in Progress' });
      return;
    }
    hapticHeavy();
    setProcessingState('all');
    try {
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });

      const updates: any = {};
      if (selectedActions.fans) updates.fans = true;
      if (selectedActions.misters) updates.misters = true;
      if (selectedActions.co2) updates.co2 = true;

      await update(ref(db, `kabutech/settings/setpoints/devices`), updates);

      showToast({ type: 'success', text1: 'Auto-Fix Active', text2: 'Balancing microclimate...' });

      const maxDuration = selectedActions.fans || selectedActions.co2 ? 30000 : 10000;

      if (selectedActions.misters) {
        const mistTimeoutId = setTimeout(() => {
          try {
            update(ref(db, `kabutech/settings/setpoints/devices`), { misters: false });
            if (maxDuration > 10000) {
              SoundManager.playRing();
            }
          } catch (e) {}
        }, 10000);
        globalTimeouts.push(mistTimeoutId);
      }

      const finalTimeoutId = setTimeout(() => {
        try {
          const revertUpdates: any = {};
          if (selectedActions.fans) revertUpdates.fans = false;
          if (selectedActions.co2) revertUpdates.co2 = false;
          if (selectedActions.misters && maxDuration === 10000) revertUpdates.misters = false;

          update(ref(db, `kabutech/settings/setpoints/devices`), revertUpdates);
          update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

          Vibration.vibrate([0, 400, 200, 400], true);
          SoundManager.playAlarm();

          DeviceEventEmitter.emit('showAlarmModal', {
            title: 'Auto-Fix Completed!',
            message: 'Conditions restored. Returned to AUTO mode.',
          });
          showToast({ type: 'success', text1: 'Chamber Balanced' });
        } catch (e: any) {
          showToast({ type: 'error', text1: 'Revert Error', text2: e?.message || 'Error' });
        } finally {
          setProcessingState(false);
        }
      }, maxDuration);
      globalTimeouts.push(finalTimeoutId);
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Auto-Fix Failed', text2: err.message });
      setProcessingState(false);
    }
  };

  const cancelOverride = () => {
    hapticMedium();
    globalTimeouts.forEach(clearTimeout);
    globalTimeouts.length = 0;
    setProcessingState(false);

    try {
      update(ref(db, `kabutech/settings/setpoints/devices`), {
        fans: false,
        misters: false,
        co2: false,
        lights: false,
      });
      update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });
      showToast({ type: 'info', text1: 'Aborted', text2: 'Returned to AUTO.' });
    } catch (e: any) {
      showToast({ type: 'error', text1: 'Cancel Failed' });
    }
  };

  const handleResync = () => {
    if (isScanning) return;
    hapticLight();
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      hapticSuccess();
      showToast({ type: 'success', text1: 'Synced', text2: 'Updated AI model telemetry.' });
    }, 600);
  };

  // Reset horizontal scroll when changing metric or horizon
  useEffect(() => {
    chartScrollRef.current?.scrollTo({ x: 0, animated: true });
  }, [activeMetric, activeHorizon]);

  // Forecast Chart calculations
  const chartData = useMemo(() => {
    const pointCount = activeHorizon === '2H' ? 9 : activeHorizon === '6H' ? 13 : 13;
    const intervalMinutes = activeHorizon === '2H' ? 15 : activeHorizon === '6H' ? 30 : 120;

    const baseVal =
      activeMetric === 'temp'
        ? liveTemp
        : activeMetric === 'hum'
        ? liveHum
        : activeMetric === 'light'
        ? liveLight
        : liveCo2;
    const targetVal =
      activeMetric === 'temp'
        ? targetTemp
        : activeMetric === 'hum'
        ? targetHum
        : activeMetric === 'light'
        ? targetLight
        : targetCo2;
    const unit =
      activeMetric === 'temp'
        ? '°C'
        : activeMetric === 'hum'
        ? '%'
        : activeMetric === 'light'
        ? 'lx'
        : 'ppm';

    const points = Array.from({ length: pointCount }).map((_, i) => {
      const minutesOffset = i * intervalMinutes;
      const targetDate = new Date(Date.now() + minutesOffset * 60000);
      const rawHours = targetDate.getHours();
      const hours12 = rawHours % 12 || 12;
      const mins = targetDate.getMinutes().toString().padStart(2, '0');
      const ampm = rawHours >= 12 ? 'PM' : 'AM';
      const timeLabel = `${hours12}:${mins}`;
      const fullTimeLabel = `${hours12}:${mins} ${ampm}`;
      const relLabel = i === 0 ? 'Now' : `+${minutesOffset >= 60 ? `${(minutesOffset / 60).toFixed(0)}h` : `${minutesOffset}m`}`;

      let rawVal = baseVal;

      if (activeMetric === 'temp') {
        const diff = baseVal - targetVal;
        const trend = diff >= 0 ? 1 : -0.4;
        const drift = (i / (pointCount - 1)) * (activeHorizon === '2H' ? 1.2 : activeHorizon === '6H' ? 2.2 : 3.4);
        const osc = Math.sin((i / (pointCount - 1)) * Math.PI) * 0.3;
        rawVal = Number((baseVal + trend * drift + osc).toFixed(1));
      } else if (activeMetric === 'hum') {
        const drift = (i / (pointCount - 1)) * (activeHorizon === '2H' ? 8 : activeHorizon === '6H' ? 15 : 22);
        const osc = Math.sin((i / (pointCount - 1)) * Math.PI) * 1.5;
        rawVal = Math.round(Math.max(35, baseVal - drift + osc));
      } else if (activeMetric === 'light') {
        const drift = Math.sin((i / (pointCount - 1)) * Math.PI) * 25;
        rawVal = Math.max(0, Math.round(baseVal + drift));
      } else {
        const drift = (i / (pointCount - 1)) * (activeHorizon === '2H' ? 140 : activeHorizon === '6H' ? 260 : 420);
        const osc = Math.sin((i / (pointCount - 1)) * Math.PI) * 20;
        rawVal = Math.round(baseVal + drift + osc);
      }

      return {
        index: i,
        timeLabel,
        fullTimeLabel,
        relLabel,
        rawVal,
        val: rawVal,
      };
    });

    return { points, unit, targetVal };
  }, [activeHorizon, activeMetric, liveTemp, liveHum, liveLight, liveCo2, targetTemp, targetHum, targetLight, targetCo2]);

  const yAxisWidth = 46;
  const chartHeight = 220;
  const paddingTop = 22;
  const paddingBottom = 32;
  const plotH = chartHeight - paddingTop - paddingBottom;

  const pointSpacing = 56;
  const scrollableChartWidth = useMemo(() => {
    return Math.max(width - 50 - yAxisWidth, (chartData.points.length - 1) * pointSpacing + 50);
  }, [width, yAxisWidth, chartData.points.length, pointSpacing]);

  const paddingLeft = 24;
  const paddingRight = 24;
  const plotW = scrollableChartWidth - paddingLeft - paddingRight;

  // Allowed Y-axis steps: 5, 10, or 100 only (whole numbers only)
  const yAxisStep: 5 | 10 | 100 = useMemo(() => {
    if (activeMetric === 'temp') return 5;
    if (activeMetric === 'hum') {
      const vals = chartData.points.map((p) => p.rawVal).concat(chartData.targetVal);
      const span = Math.max(...vals) - Math.min(...vals);
      return span <= 20 ? 5 : 10;
    }
    if (activeMetric === 'light') {
      const vals = chartData.points.map((p) => p.rawVal).concat(chartData.targetVal);
      const span = Math.max(...vals) - Math.min(...vals);
      return span <= 40 ? 10 : 100;
    }
    return 100; // CO2
  }, [activeMetric, chartData]);

  const { minChartVal, maxChartVal, yTicks } = useMemo(() => {
    const vals = chartData.points.map((p) => p.rawVal);
    vals.push(chartData.targetVal);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);

    let minVal = Math.floor(rawMin / yAxisStep) * yAxisStep;
    let maxVal = Math.ceil(rawMax / yAxisStep) * yAxisStep;

    // Ensure at least 2 steps (3 ticks) for proper proportional height
    while (maxVal - minVal < yAxisStep * 2) {
      minVal = Math.max(0, minVal - yAxisStep);
      maxVal = maxVal + yAxisStep;
    }

    if (activeMetric === 'hum' && maxVal > 100) {
      maxVal = 100;
      if (maxVal - minVal < yAxisStep * 2) {
        minVal = Math.max(0, 100 - yAxisStep * 2);
      }
    }

    const ticks: number[] = [];
    for (let v = maxVal; v >= minVal; v -= yAxisStep) {
      ticks.push(Math.round(v));
    }

    return { minChartVal: minVal, maxChartVal: maxVal, yTicks: ticks };
  }, [chartData, activeMetric, yAxisStep]);

  const getY = (val: number) => {
    const range = maxChartVal - minChartVal || 1;
    return paddingTop + plotH - ((val - minChartVal) / range) * plotH;
  };

  const getX = (idx: number) => {
    return paddingLeft + (idx / (chartData.points.length - 1)) * plotW;
  };

  const rawPts = useMemo(() => chartData.points.map((p) => ({ x: getX(p.index), y: getY(p.rawVal) })), [chartData, minChartVal, maxChartVal, plotW, plotH]);
  const bezierPath = useMemo(() => getBezierPath(rawPts), [rawPts]);
  const areaPath = useMemo(() => getAreaPath(rawPts, chartHeight - paddingBottom), [rawPts, chartHeight, paddingBottom]);
  const targetY = getY(chartData.targetVal);

  const metricColor =
    activeMetric === 'temp'
    ? '#f43f5e'
    : activeMetric === 'hum'
    ? '#0284c7'
    : activeMetric === 'light'
    ? '#f59e0b'
    : '#8b5cf6';

  // Bottom modal animation
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.8) {
          slideOutAndClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const slideOutAndClose = () => {
    Animated.timing(translateY, {
      toValue: 700,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowSuggestionsModal(false));
  };

  useEffect(() => {
    if (showSuggestionsModal) {
      translateY.setValue(700);
      Animated.spring(translateY, { toValue: 0, bounciness: 3, useNativeDriver: true }).start();
    }
  }, [showSuggestionsModal, translateY]);

  const activeScrubPoint = scrubIndex !== null ? chartData.points[scrubIndex] : chartData.points[chartData.points.length - 1];

  const handleBack = () => {
    hapticLight();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as never);
    }
  };

  return (
    <View style={tw`flex-1 bg-[#f8fafc] dark:bg-[#020617]`}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={[tw`px-5 pb-32`, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sleek Minimal Header */}
        <View style={tw`mb-4 flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-3`}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              style={tw`w-10 h-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/60`}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={isDarkMode ? '#f8fafc' : '#1e293b'} />
            </TouchableOpacity>

            <View style={tw`flex-row items-center gap-2`}>
              <Text style={[tw`text-[20px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Prediction Hub
              </Text>
              <Animated.View
                style={[
                  tw`w-2 h-2 rounded-full`,
                  hasCriticalRisk ? tw`bg-rose-500` : tw`bg-emerald-500`,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleResync}
            disabled={isScanning}
            style={tw`w-10 h-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/60`}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
            )}
          </TouchableOpacity>
        </View>

        {/* Top Main Card (Rock-solid View container with gradient overlay) */}
        <View
          style={[
            tw`w-full rounded-[28px] p-5 mb-4 shadow-sm overflow-hidden relative items-center`,
            { backgroundColor: hasCriticalRisk ? '#dc2626' : '#2563eb' },
          ]}
        >
          <LinearGradient
            colors={
              hasCriticalRisk
                ? ['#dc2626', '#ea580c']
                : ['#0284c7', '#2563eb']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tw`absolute inset-0`}
            pointerEvents="none"
          />

          {/* Decorative shapes */}
          <View style={tw`absolute -top-10 -left-10 w-28 h-28 rounded-full bg-white/10`} />
          <View style={tw`absolute -bottom-12 -right-10 w-36 h-36 rounded-full bg-black/10`} />

          {/* Title */}
          <Text style={[tw`text-blue-100 text-xs mb-1 tracking-wider uppercase`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            {hasCriticalRisk ? 'Critical Forecast' : 'Microclimate Forecast'}
          </Text>

          {/* Large Peak Display */}
          <Text style={[tw`text-white text-3xl mb-4`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {futureValues?.temp?.raw ?? 26.5}°C Peak
          </Text>

          {/* 3-Column Stats Grid */}
          <View style={tw`flex-row justify-between w-full mb-4 px-2`}>
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>Target</Text>
              <Text style={[tw`text-white text-lg`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{targetTemp}°C</Text>
            </View>
            <View style={tw`w-[1px] h-full bg-blue-400/50`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>Variance</Text>
              <Text style={[tw`text-white text-lg`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {tempVariance >= 0 ? `+${tempVariance}` : `${tempVariance}`}°C
              </Text>
            </View>
            <View style={tw`w-[1px] h-full bg-blue-400/50`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>ETA</Text>
              <Text style={[tw`text-white text-lg`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>in ~2 hrs</Text>
            </View>
          </View>

          {/* Model Active Pill */}
          <View style={tw`bg-[#10b981] px-4 py-1.5 rounded-full shadow-sm flex-row items-center gap-1.5`}>
            <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />
            <Text style={[tw`text-white text-xs tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Model Active
            </Text>
          </View>
        </View>

        {/* Two Side-by-Side Diagnostic Cards */}
        <View style={tw`flex-row justify-between mb-4`}>
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[22px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
              <MaterialCommunityIcons name="brain" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Confidence:
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-0.5`}>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                96
              </Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                %
              </Text>
            </View>
          </View>

          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[22px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
              <MaterialCommunityIcons name="update" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Next Scan:
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-0.5`}>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                10
              </Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                min
              </Text>
            </View>
          </View>
        </View>

        {/* FORECAST TRAJECTORY CARD */}
        <View style={tw`bg-white dark:bg-slate-800 rounded-[26px] p-4 mb-4 shadow-sm border border-slate-200/70 dark:border-slate-700/60`}>
          {/* Header with Title and AI badge */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View>
              <Text style={[tw`text-[15px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Forecast Trajectory
              </Text>
              <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                24h Environmental Model
              </Text>
            </View>
            <View style={tw`bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full flex-row items-center gap-1`}>
              <MaterialCommunityIcons name="brain" size={11} color="#2563eb" />
              <Text style={[tw`text-[10px] text-blue-600 dark:text-blue-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                AI Model
              </Text>
            </View>
          </View>

          {/* Metric Selector (4 tabs: Temp, Hum, Light, CO2) */}
          <View style={tw`flex-row gap-1 bg-slate-100 dark:bg-slate-700/40 p-1 rounded-xl mb-2.5`}>
            {(['temp', 'hum', 'light', 'co2'] as MetricKey[]).map((m) => {
              const active = activeMetric === m;
              const label = m === 'temp' ? 'Temp' : m === 'hum' ? 'Hum' : m === 'light' ? 'Light' : 'CO2';
              return (
                <TouchableOpacity
                  key={m}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    setActiveMetric(m);
                    setScrubIndex(null);
                  }}
                  style={[
                    tw`flex-1 py-1.5 items-center justify-center rounded-lg`,
                    active && tw`bg-white dark:bg-slate-800 shadow-sm`,
                  ]}
                >
                  <Text
                    style={[
                      tw`text-[11px]`,
                      {
                        fontFamily: active ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold',
                        color: active ? (isDarkMode ? '#38bdf8' : '#0284c7') : '#94a3b8',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Horizon Selector Row */}
          <View style={tw`flex-row justify-between items-center mb-2 px-1`}>
            <Text style={[tw`text-[11px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Window
            </Text>
            <View style={tw`flex-row gap-1 bg-slate-100 dark:bg-slate-700/40 p-1 rounded-xl`}>
              {(['2H', '6H', '24H'] as ForecastHorizon[]).map((h) => {
                const active = activeHorizon === h;
                return (
                  <TouchableOpacity
                    key={h}
                    activeOpacity={0.7}
                    onPress={() => {
                      hapticLight();
                      setActiveHorizon(h);
                      setScrubIndex(null);
                    }}
                    style={[
                      tw`py-1 px-2.5 rounded-lg`,
                      active && tw`bg-white dark:bg-slate-800 shadow-sm`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[11px]`,
                        {
                          fontFamily: active ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold',
                          color: active ? (isDarkMode ? '#38bdf8' : '#0284c7') : '#94a3b8',
                        },
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Minimal Current Point & Target Readout */}
          <View style={tw`flex-row items-center justify-between px-1`}>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
              {activeScrubPoint.timeLabel} ·{' '}
              <Text style={[tw`text-slate-900 dark:text-white font-bold`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {activeScrubPoint.val} {chartData.unit}
              </Text>
            </Text>
            <View style={tw`flex-row items-center gap-1.5`}>
              <View style={[tw`w-3 h-0.5 border-b border-dashed`, { borderColor: isDarkMode ? '#94a3b8' : '#64748b' }]} />
              <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Target: {chartData.targetVal} {chartData.unit}
              </Text>
            </View>
          </View>

          {/* Main Chart Container with Fixed Y-Axis and Swipable Plot */}
          <View style={tw`flex-row items-start mt-4 pt-1`}>
            {/* Fixed Left Y-Axis */}
            <View style={{ width: yAxisWidth, height: chartHeight, position: 'relative' }}>
              {yTicks.map((val, idx) => (
                <View
                  key={`ytick-${idx}`}
                  style={{
                    position: 'absolute',
                    top: Math.round(getY(val) - 8),
                    right: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  <Text
                    style={[
                      tw`text-[11px] text-slate-400 dark:text-slate-500 font-bold`,
                      { fontFamily: 'PlusJakartaSans_700Bold' },
                    ]}
                  >
                    {val}
                  </Text>
                </View>
              ))}
            </View>

            {/* Swipable Chart Timeline */}
            <ScrollView
              ref={chartScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={{ paddingRight: 16 }}
              style={tw`flex-1`}
            >
              <View style={{ height: chartHeight, width: scrollableChartWidth }}>
                <Svg width={scrollableChartWidth} height={chartHeight}>
                  <Defs>
                    <SvgGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={metricColor} stopOpacity={0.3} />
                      <Stop offset="100%" stopColor={metricColor} stopOpacity={0.0} />
                    </SvgGradient>
                  </Defs>

                  {/* Horizontal grid lines */}
                  {yTicks.map((val, idx) => (
                    <Line
                      key={`grid-${idx}`}
                      x1={0}
                      y1={getY(val)}
                      x2={scrollableChartWidth}
                      y2={getY(val)}
                      stroke={isDarkMode ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.85)'}
                      strokeWidth={1}
                    />
                  ))}

                  {/* Target guideline (gray broken / dashed line) */}
                  <Line
                    x1={0}
                    y1={targetY}
                    x2={scrollableChartWidth}
                    y2={targetY}
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  />


                  {/* Gradient Area Fill */}
                  {areaPath ? <Path d={areaPath} fill="url(#chartGradient)" /> : null}

                  {/* Main predictive curve */}
                  {bezierPath ? (
                    <Path
                      d={bezierPath}
                      fill="none"
                      stroke={metricColor}
                      strokeWidth={2.5}
                    />
                  ) : null}

                  {/* Dot indicators and scrub guidelines */}
                  {chartData.points.map((p, idx) => {
                    const cx = getX(idx);
                    const cy = getY(p.val);
                    const isSelected = scrubIndex === idx;

                    return (
                      <React.Fragment key={`dot-${idx}`}>
                        {isSelected && (
                          <Line
                            x1={cx}
                            y1={paddingTop}
                            x2={cx}
                            y2={chartHeight - paddingBottom}
                            stroke={metricColor}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            opacity={0.6}
                          />
                        )}
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 5.5 : 3.5}
                          fill={isSelected ? metricColor : isDarkMode ? '#0f172a' : '#ffffff'}
                          stroke={metricColor}
                          strokeWidth={1.5}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Time tick labels - simplified to prevent text clutter */}
                  {chartData.points.map((p, idx) => {
                    const isSelected = scrubIndex === idx;
                    const step = chartData.points.length > 8 ? 2 : 1;
                    const isTick = idx % step === 0;
                    const isLast = idx === chartData.points.length - 1;

                    if (!isSelected && !isTick && !isLast) return null;

                    const cx = getX(idx);
                    return (
                      <SvgText
                        key={`label-${idx}`}
                        x={cx}
                        y={chartHeight - 8}
                        fill={isSelected ? (isDarkMode ? '#38bdf8' : '#0284c7') : isDarkMode ? '#64748b' : '#94a3b8'}
                        fontSize="9"
                        fontWeight={isSelected ? '800' : '600'}
                        textAnchor="middle"
                      >
                        {p.timeLabel}
                      </SvgText>
                    );
                  })}
                </Svg>

                {/* Scrubber tap overlay */}
                <View style={[tw`absolute inset-0 flex-row`, { paddingLeft, paddingRight }]}>
                  {chartData.points.map((_, idx) => (
                    <TouchableOpacity
                      key={`touch-${idx}`}
                      activeOpacity={0.7}
                      onPress={() => {
                        hapticSelection();
                        setScrubIndex(idx);
                      }}
                      style={tw`flex-1 h-full`}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* HARDWARE ACTUATORS - Clean Minimal List */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-[15px] text-slate-900 dark:text-white mb-2.5 pl-1`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            Hardware Actuators
          </Text>

          <View style={tw`flex-row flex-wrap justify-between gap-y-2.5`}>
            {[
              { key: 'fans', name: 'Fans', icon: 'fan', color: '#3b82f6', duration: 30000 },
              { key: 'misters', name: 'Misters', icon: 'water', color: '#10b981', duration: 10000 },
              { key: 'lights', name: 'Lights', icon: 'lightbulb-on', color: '#f59e0b', duration: 30000 },
              { key: 'co2', name: 'Vent', icon: 'weather-windy', color: '#8b5cf6', duration: 30000 },
            ].map((device) => {
              const active =
                settings?.setpoints?.aiOverride &&
                settings?.setpoints?.devices?.[device.key as keyof typeof settings.setpoints.devices];
              const timing = getElapsed(device.key);

              return (
                <View
                  key={device.key}
                  style={[
                    tw`w-[48.5%] bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border`,
                    active ? tw`border-blue-400 dark:border-blue-500` : tw`border-slate-200/60 dark:border-slate-700/50`,
                  ]}
                >
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <View style={tw`flex-row items-center gap-2`}>
                      <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: `${device.color}15` }]}>
                        <MaterialCommunityIcons name={device.icon as any} size={16} color={device.color} />
                      </View>
                      <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        {device.name}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={!!isProcessing}
                      onPress={() => overrideDevice(device.key, device.name, device.duration)}
                      style={[
                        tw`px-2.5 py-1 rounded-lg`,
                        active ? tw`bg-blue-500` : tw`bg-slate-100 dark:bg-slate-700`,
                        !!isProcessing && !active && tw`opacity-40`,
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[10px]`,
                          {
                            fontFamily: 'PlusJakartaSans_700Bold',
                            color: active ? 'white' : isDarkMode ? '#cbd5e1' : '#475569',
                          },
                        ]}
                      >
                        {active ? `${timing.secondsRemaining}s` : 'Run'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Progress Line */}
                  <View style={tw`h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden`}>
                    <View
                      style={[
                        tw`h-full rounded-full`,
                        {
                          width: `${Math.round(timing.progress * 100)}%`,
                          backgroundColor: active ? device.color : 'transparent',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* FLOATING ACTION BAR */}
      <View
        style={[
          tw`absolute bottom-5 left-5 right-5 p-2 rounded-[28px] bg-white/95 dark:bg-slate-900/95 shadow-xl border border-slate-200/80 dark:border-slate-800`,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        {isProcessing ? (
          <View style={tw`flex-row items-center gap-2 p-1`}>
            <View style={tw`flex-1 flex-row items-center gap-2 pl-2`}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={[tw`text-[12px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                AI Cycle Operating...
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={cancelOverride}
              style={tw`bg-rose-500 py-2.5 px-4 rounded-xl flex-row items-center gap-1`}
            >
              <Text style={[tw`text-white text-[12px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Stop
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`flex-row items-center gap-2 p-1`}>
            {/* Review Actions - secondary */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                hapticLight();
                setShowSuggestionsModal(true);
              }}
              style={tw`flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200/50 dark:border-slate-700/50`}
            >
              <View style={tw`flex-row items-center gap-1.5`}>
                <MaterialCommunityIcons name="clipboard-list" size={15} color={isDarkMode ? '#94a3b8' : '#475569'} />
                <Text style={[tw`text-[13px] text-slate-700 dark:text-slate-200`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Actions
                </Text>
              </View>
            </TouchableOpacity>

            {/* Auto-Fix - primary, same width */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAutoFix}
              style={tw`flex-1 py-3 rounded-2xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center shadow-md`}
            >
              <View style={tw`flex-row items-center gap-1.5`}>
                <MaterialCommunityIcons name="lightning-bolt" size={15} color="white" />
                <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Auto-Fix
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* AI RECOMMENDATIONS MODAL */}
      <Modal visible={showSuggestionsModal} transparent animationType="fade" onRequestClose={slideOutAndClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={tw`flex-1 justify-end bg-black/50`}
          onPress={slideOutAndClose}
        >
          <Animated.View
            {...panResponder.panHandlers}
            onStartShouldSetResponder={() => true}
            style={[
              tw`bg-white dark:bg-slate-900 rounded-t-[32px] p-5 pt-4 shadow-2xl border-t border-slate-100 dark:border-slate-800`,
              { transform: [{ translateY }], paddingBottom: insets.bottom + 16, minHeight: 520 },
            ]}
          >
            {/* Grab handle */}
            <View style={tw`w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full self-center mb-4`} />

            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={[tw`text-[17px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                AI Recommendations
              </Text>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  const allSelected = selectedActions.fans && selectedActions.misters && selectedActions.co2;
                  setSelectedActions({
                    fans: !allSelected,
                    misters: !allSelected,
                    co2: !allSelected,
                  });
                }}
              >
                <Text style={[tw`text-xs text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {selectedActions.fans && selectedActions.misters && selectedActions.co2 ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Cards */}
            <View style={tw`gap-2.5 mb-5`}>
              {/* Action 1 */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!!isProcessing}
                onPress={() => {
                  hapticSelection();
                  setSelectedActions((p) => ({ ...p, fans: !p.fans }));
                }}
                style={[
                  tw`p-3.5 rounded-2xl border flex-row items-center gap-3`,
                  selectedActions.fans
                    ? tw`bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800`
                    : tw`bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60`,
                ]}
              >
                <View style={tw`w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 items-center justify-center`}>
                  <MaterialCommunityIcons name="fan" size={18} color="#3b82f6" />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                    <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      Cool the Chamber
                    </Text>
                    <View style={tw`bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 rounded`}>
                      <Text style={[tw`text-[8px] text-rose-600 dark:text-rose-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        URGENT
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Runs fans to bring the temperature down before plants are stressed.
                  </Text>
                </View>

                <View
                  style={[
                    tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                    selectedActions.fans ? tw`bg-emerald-500 border-emerald-500` : tw`border-slate-300 dark:border-slate-600`,
                  ]}
                >
                  {selectedActions.fans && <MaterialCommunityIcons name="check" size={13} color="white" />}
                </View>
              </TouchableOpacity>

              {/* Action 2 */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!!isProcessing}
                onPress={() => {
                  hapticSelection();
                  setSelectedActions((p) => ({ ...p, misters: !p.misters }));
                }}
                style={[
                  tw`p-3.5 rounded-2xl border flex-row items-center gap-3`,
                  selectedActions.misters
                    ? tw`bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800`
                    : tw`bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60`,
                ]}
              >
                <View style={tw`w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center`}>
                  <MaterialCommunityIcons name="water" size={18} color="#10b981" />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                    <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      Restore Moisture
                    </Text>
                    <View style={tw`bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded`}>
                      <Text style={[tw`text-[8px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        ADVISED
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Pulses the misters to raise humidity and prevent foliage from drying out.
                  </Text>
                </View>

                <View
                  style={[
                    tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                    selectedActions.misters ? tw`bg-emerald-500 border-emerald-500` : tw`border-slate-300 dark:border-slate-600`,
                  ]}
                >
                  {selectedActions.misters && <MaterialCommunityIcons name="check" size={13} color="white" />}
                </View>
              </TouchableOpacity>

              {/* Action 3 */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!!isProcessing}
                onPress={() => {
                  hapticSelection();
                  setSelectedActions((p) => ({ ...p, co2: !p.co2 }));
                }}
                style={[
                  tw`p-3.5 rounded-2xl border flex-row items-center gap-3`,
                  selectedActions.co2
                    ? tw`bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800`
                    : tw`bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60`,
                ]}
              >
                <View style={tw`w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 items-center justify-center`}>
                  <MaterialCommunityIcons name="weather-windy" size={18} color="#8b5cf6" />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                    <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      Clear the Air
                    </Text>
                    <View style={tw`bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded`}>
                      <Text style={[tw`text-[8px] text-purple-600 dark:text-purple-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        SAFE
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Opens vents to flush out stale air and bring CO2 back to a healthy level.
                  </Text>
                </View>

                <View
                  style={[
                    tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                    selectedActions.co2 ? tw`bg-emerald-500 border-emerald-500` : tw`border-slate-300 dark:border-slate-600`,
                  ]}
                >
                  {selectedActions.co2 && <MaterialCommunityIcons name="check" size={13} color="white" />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Modal Buttons */}
            <View style={tw`flex-row gap-2.5`}>
              {/* Dismiss - same width as Apply */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={slideOutAndClose}
                style={tw`flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200/60 dark:border-slate-700/60`}
              >
                <View style={tw`flex-row items-center gap-1.5`}>
                  <MaterialCommunityIcons name="close" size={14} color={isDarkMode ? '#94a3b8' : '#475569'} />
                  <Text style={[tw`text-slate-700 dark:text-slate-300 text-[13px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    Dismiss
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Apply - same width */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!selectedActions.fans && !selectedActions.misters && !selectedActions.co2}
                onPress={() => {
                  slideOutAndClose();
                  handleAutoFix();
                }}
                style={[
                  tw`flex-1 py-3.5 rounded-2xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center shadow-md`,
                  (!selectedActions.fans && !selectedActions.misters && !selectedActions.co2) && tw`opacity-50`,
                ]}
              >
                <View style={tw`flex-row items-center gap-1.5`}>
                  <MaterialCommunityIcons name="lightning-bolt" size={14} color="white" />
                  <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Apply
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
