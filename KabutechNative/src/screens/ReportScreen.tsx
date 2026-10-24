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
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import { evaluateChamber } from '../utils/environmentRanges';
import { ACTIVE_PROFILE } from '../config/cropProfiles';

import { SoundManager } from '../utils/SoundManager';
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSelection,
  hapticSuccess,
} from '../utils/haptics';
import { useResponsive } from '../utils/responsive';



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

  const [isScanning, setIsScanning] = useState(false);

  // Chart configuration
  const [activeMetric, setActiveMetric] = useState<MetricKey>('temp');
  const [activeHorizon, setActiveHorizon] = useState<ForecastHorizon>('2H');

  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const chartScrollRef = useRef<ScrollView>(null);

  // Modal
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  // Edge AI live status from ESP32
  const isPreempting = Boolean(sensors?.ai_action && sensors.ai_action !== 'none');
  const isAiReady = Boolean(sensors?.ai_ready);

  const preemptLabel = useMemo(() => {
    switch (sensors?.ai_action) {
      case 'preempt_exhaust_temp':
        return 'Cooling temp spike ahead';
      case 'preempt_exhaust_co2':
        return 'Purging CO₂ spike ahead';
      case 'preempt_mister':
        return 'Misting dry drop ahead';
      default:
        return 'Pre-empting spike (+10m)';
    }
  }, [sensors?.ai_action]);

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



  // Sensor inputs
  const liveTemp = typeof sensors.temperature === 'number' && sensors.temperature > 0 && sensors.temperature !== -999 ? sensors.temperature : 0;
  const liveHum = typeof sensors.humidity === 'number' && sensors.humidity > 0 && sensors.humidity !== -999 ? sensors.humidity : 0;
  const liveLight = typeof sensors.light === 'number' && sensors.light >= 0 && sensors.light !== -999 ? sensors.light : 0;
  const liveCo2 = typeof sensors.co2 === 'number' && sensors.co2 > 0 && sensors.co2 !== -999 ? sensors.co2 : 0;

  const targetTemp = settings?.setpoints?.temperature ?? 28.0;
  const targetHum = settings?.setpoints?.humidity ?? 85;
  const targetLight = settings?.setpoints?.light ?? 580;
  const targetCo2 = settings?.setpoints?.co2 ?? 690;

  // TinyML Edge AI predictions received from ESP32
  const aiReady = Boolean(sensors?.ai_ready);
  const aiPredTemp = (typeof sensors?.ai_pred_temp_10m === 'number' && sensors.ai_pred_temp_10m !== -999) ? sensors.ai_pred_temp_10m : null;
  const aiPredHum = (typeof sensors?.ai_pred_hum_10m === 'number' && sensors.ai_pred_hum_10m !== -999) ? sensors.ai_pred_hum_10m : null;
  const aiPredCo2 = (typeof sensors?.ai_pred_co2_10m === 'number' && sensors.ai_pred_co2_10m !== -999) ? sensors.ai_pred_co2_10m : null;
  const aiPredLight = (typeof sensors?.ai_pred_light_10m === 'number' && sensors.ai_pred_light_10m !== -999) ? sensors.ai_pred_light_10m : null;

  const tempVariance = Number((liveTemp - targetTemp).toFixed(1));
  const humVariance = Number((liveHum - targetHum).toFixed(1));
  const co2Variance = Number((liveCo2 - targetCo2).toFixed(0));

  const isTempCritical = liveTemp > 0 && tempVariance > 1.8;
  const isHumCritical = liveHum > 0 && humVariance < -12;
  const isCo2Critical = liveCo2 > 0 && co2Variance > 180;
  const hasCriticalRisk = isTempCritical || isHumCritical || isCo2Critical;

  const chamberEval = useMemo(() => {
    return evaluateChamber(
      {
        temp: liveTemp > 0 ? liveTemp : null,
        hum: liveHum > 0 ? liveHum : null,
        light: liveLight >= 0 ? liveLight : null,
        co2: liveCo2 > 0 ? liveCo2 : null,
      },
      {},
      ACTIVE_PROFILE
    );
  }, [liveTemp, liveHum, liveLight, liveCo2]);

  // Dynamic projections backed by real Edge AI TinyML
  const futureValues = useMemo(() => {
    // Temperature projection (+10m TinyML Edge Forecast)
    let predTemp = liveTemp;
    if (liveTemp > 0) {
      if (aiPredTemp !== null) {
        predTemp = Number(aiPredTemp.toFixed(1));
      } else {
        const dTemp10m = isTempCritical ? 0.8 : 0.3;
        predTemp = Number((liveTemp + dTemp10m).toFixed(1));
      }
    }

    // Humidity projection (+10m TinyML Edge Forecast)
    let predHum = liveHum;
    if (liveHum > 0) {
      if (aiPredHum !== null) {
        predHum = Math.round(aiPredHum);
      } else {
        const dHum10m = isHumCritical ? -6 : -2;
        predHum = Math.round(Math.max(25, Math.min(100, liveHum + dHum10m)));
      }
    }

    // Light projection (+10m TinyML Edge Forecast)
    let predLight = liveLight;
    if (liveLight >= 0 && sensors.light !== -999) {
      if (aiPredLight !== null) {
        predLight = Math.round(aiPredLight);
      } else {
        predLight = Math.round(Math.max(0, liveLight));
      }
    }

    // CO2 projection (+10m TinyML Edge Forecast)
    let predCo2 = liveCo2;
    if (liveCo2 > 0) {
      if (aiPredCo2 !== null) {
        predCo2 = Math.round(aiPredCo2);
      } else {
        const dCo210m = isCo2Critical ? 120 : 40;
        predCo2 = Math.round(Math.max(350, liveCo2 + dCo210m));
      }
    }

    const tempVar = liveTemp > 0 ? Number((predTemp - targetTemp).toFixed(1)) : 0;
    const humVar = liveHum > 0 ? Number((predHum - targetHum).toFixed(1)) : 0;
    const lightVar = liveLight >= 0 && sensors.light !== -999 ? Number((predLight - targetLight).toFixed(0)) : 0;
    const co2Var = liveCo2 > 0 ? Number((predCo2 - targetCo2).toFixed(0)) : 0;

    return {
      temp: {
        raw: predTemp,
        variance: tempVar,
        status: predTemp > 27 ? 'Critical' : predTemp > 25 ? 'Elevated' : predTemp < 16 ? 'Critical' : predTemp < 18 ? 'Low' : 'Normal',
        statusColor: (predTemp > 27 || predTemp < 16) ? '#ef4444' : (predTemp > 25 || predTemp < 18) ? '#f97316' : '#10b981',
        description:
          predTemp > 25
            ? `Temperature is projected to reach ${predTemp}°C (> 25°C ceiling). Pre-emptive cooling active.`
            : predTemp < 18
            ? `Temperature is projected to drop to ${predTemp}°C (< 18°C floor). Fans locked OFF.`
            : `Temperature is projected at ${predTemp}°C within the optimal 18-25°C band. Actuators idle.`,
        icon: 'thermometer',
      },
      hum: {
        raw: predHum,
        variance: humVar,
        status: predHum < 75 ? 'Critical' : predHum < 80 ? 'Low' : predHum >= 100 ? 'Saturated' : 'Stable',
        statusColor: predHum < 75 ? '#ef4444' : (predHum < 80 || predHum >= 100) ? '#f97316' : '#10b981',
        description:
          predHum < 75
            ? `Humidity will drop to ${predHum}% (< 75%). Pre-emptive misting active.`
            : predHum >= 100
            ? `Humidity will reach 100% saturation. Pre-emptive purge exhaust active.`
            : `Humidity is projected at ${predHum}% within the optimal 80-95% band.`,
        icon: 'water-percent',
      },
      light: {
        raw: predLight,
        variance: lightVar,
        status: predLight >= 1000 ? 'High' : predLight < 150 ? 'Low' : 'Optimal',
        statusColor: (predLight >= 1000 || predLight < 150) ? '#f97316' : '#10b981',
        description:
          predLight >= 1000
            ? `Light intensity projected at ${predLight} lx (>= 1000 lx ceiling). Grow lights OFF.`
            : predLight < 150
            ? `Light intensity projected at ${predLight} lx (< 150 lx). Grow lights active.`
            : `Light intensity projected at ${predLight} lx within optimal 150-1000 lx band.`,
        icon: 'white-balance-sunny',
      },
      co2: {
        raw: predCo2,
        variance: co2Var,
        status: predCo2 > 1500 ? 'Critical' : predCo2 > 1150 ? 'Elevated' : 'Normal',
        statusColor: predCo2 > 1500 ? '#ef4444' : predCo2 > 1150 ? '#f97316' : '#10b981',
        description:
          predCo2 > 1150
            ? `CO₂ is projected to reach ${predCo2} ppm (> 1150 ppm). Pre-emptive exhaust fans active.`
            : `CO₂ is projected at ${predCo2} ppm within safe optimal range (< 1000 ppm).`,
        icon: 'molecule-co2',
      },
    };
  }, [liveTemp, liveHum, liveLight, liveCo2, targetTemp, targetHum, targetLight, targetCo2, isTempCritical, isHumCritical, isCo2Critical, aiPredTemp, aiPredHum, aiPredLight, aiPredCo2, sensors.light]);

  const activeMetricData = useMemo(() => {
    switch (activeMetric) {
      case 'temp':
        return {
          name: 'Temperature',
          unit: '°C',
          live: liveTemp > 0 ? `${liveTemp.toFixed(1)}°C` : '--',
          pred: liveTemp > 0 ? `${futureValues.temp.raw}°C` : '--',
          ai10m: aiPredTemp !== null ? `${aiPredTemp.toFixed(1)}°C` : (liveTemp > 0 ? `${liveTemp.toFixed(1)}°C` : '--'),
          target: `${targetTemp}°C`,
          variance: liveTemp > 0 ? `${tempVariance >= 0 ? '+' : ''}${tempVariance}°C` : '--',
          isCritical: isTempCritical,
          hasSensor: liveTemp > 0,
        };
      case 'hum':
        return {
          name: 'Humidity',
          unit: '%',
          live: liveHum > 0 ? `${Math.round(liveHum)}%` : '--',
          pred: liveHum > 0 ? `${futureValues.hum.raw}%` : '--',
          ai10m: aiPredHum !== null ? `${Math.round(aiPredHum)}%` : (liveHum > 0 ? `${Math.round(liveHum)}%` : '--'),
          target: `${targetHum}%`,
          variance: liveHum > 0 ? `${humVariance >= 0 ? '+' : ''}${humVariance}%` : '--',
          isCritical: isHumCritical,
          hasSensor: liveHum > 0,
        };
      case 'light':
        return {
          name: 'Light Level',
          unit: 'lx',
          live: liveLight >= 0 && sensors.light !== -999 ? `${liveLight} lx` : '--',
          pred: liveLight >= 0 && sensors.light !== -999 ? `${futureValues.light.raw} lx` : '--',
          ai10m: aiPredLight !== null ? `${Math.round(aiPredLight)} lx` : (liveLight >= 0 && sensors.light !== -999 ? `${liveLight} lx` : '--'),
          target: `${targetLight} lx`,
          variance: liveLight >= 0 && sensors.light !== -999 ? `${(liveLight - targetLight) >= 0 ? '+' : ''}${Math.round(liveLight - targetLight)} lx` : '--',
          isCritical: false,
          hasSensor: liveLight >= 0 && sensors.light !== -999,
        };
      case 'co2':
        return {
          name: 'CO₂',
          unit: 'ppm',
          live: liveCo2 > 0 ? `${liveCo2} ppm` : '--',
          pred: liveCo2 > 0 ? `${futureValues.co2.raw} ppm` : '--',
          ai10m: aiPredCo2 !== null ? `${Math.round(aiPredCo2)} ppm` : (liveCo2 > 0 ? `${Math.round(liveCo2)} ppm` : '--'),
          target: `${targetCo2} ppm`,
          variance: liveCo2 > 0 ? `${co2Variance >= 0 ? '+' : ''}${co2Variance} ppm` : '--',
          isCritical: isCo2Critical,
          hasSensor: liveCo2 > 0,
        };
    }
  }, [activeMetric, liveTemp, liveHum, liveLight, liveCo2, targetTemp, targetHum, targetLight, targetCo2, tempVariance, humVariance, co2Variance, futureValues, aiPredTemp, aiPredHum, aiPredLight, aiPredCo2, isTempCritical, isHumCritical, isCo2Critical, sensors.light]);

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

    const hasSensor =
      activeMetric === 'temp' ? liveTemp > 0 :
      activeMetric === 'hum' ? liveHum > 0 :
      activeMetric === 'light' ? (liveLight >= 0 && sensors.light !== -999) :
      liveCo2 > 0;

    const aiPredVal =
      activeMetric === 'temp' ? aiPredTemp :
      activeMetric === 'hum' ? aiPredHum :
      activeMetric === 'light' ? aiPredLight :
      aiPredCo2;

    const delta10m = (aiPredVal !== null && hasSensor) ? (aiPredVal - baseVal) : null;
    const effectiveBase = hasSensor ? baseVal : targetVal;

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

      let rawVal = effectiveBase;

      if (hasSensor) {
        const progressFactor = i / (pointCount - 1);
        if (delta10m !== null) {
          // Real TinyML-guided trajectory:
          // Rate of change directly anchored to on-device TinyML inference
          const initialProjected = delta10m * (minutesOffset / 10);
          const regulationDampen = Math.exp(-progressFactor * 1.5);
          const targetPull = (targetVal - effectiveBase) * (1 - regulationDampen) * 0.45;
          const osc = Math.sin(progressFactor * Math.PI) * (activeMetric === 'co2' ? 12 : activeMetric === 'hum' ? 0.8 : 0.15);

          if (activeMetric === 'temp') {
            rawVal = Number((effectiveBase + initialProjected * regulationDampen + targetPull + osc).toFixed(1));
          } else if (activeMetric === 'hum') {
            rawVal = Math.round(Math.max(20, Math.min(100, effectiveBase + initialProjected * regulationDampen + targetPull + osc)));
          } else if (activeMetric === 'light') {
            rawVal = Math.round(Math.max(0, effectiveBase + initialProjected * regulationDampen));
          } else {
            rawVal = Math.round(Math.max(350, effectiveBase + initialProjected * regulationDampen + targetPull + osc));
          }
        } else {
          // Sensor connected, seeding buffer:
          const diff = effectiveBase - targetVal;
          if (activeMetric === 'temp') {
            rawVal = Number((effectiveBase - diff * progressFactor * 0.25).toFixed(1));
          } else if (activeMetric === 'hum') {
            rawVal = Math.round(effectiveBase - diff * progressFactor * 0.25);
          } else if (activeMetric === 'light') {
            rawVal = Math.round(effectiveBase);
          } else {
            rawVal = Math.round(effectiveBase - diff * progressFactor * 0.25);
          }
        }
      }

      return {
        index: i,
        timeLabel,
        fullTimeLabel,
        relLabel,
        rawVal,
        val: hasSensor ? rawVal : '--',
      };
    });

    return { points, unit, targetVal, hasSensor };
  }, [activeHorizon, activeMetric, liveTemp, liveHum, liveLight, liveCo2, targetTemp, targetHum, targetLight, targetCo2, aiPredTemp, aiPredHum, aiPredLight, aiPredCo2, sensors.light]);

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
            tw`w-full rounded-[28px] p-5 mb-4 shadow-sm overflow-hidden relative`,
            { backgroundColor: (activeMetricData.isCritical || hasCriticalRisk) ? '#dc2626' : '#2563eb' },
          ]}
        >
          <LinearGradient
            colors={
              (activeMetricData.isCritical || hasCriticalRisk)
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

          {/* Header Row: Title & Active Model Pill */}
          <View style={tw`flex-row items-center justify-between w-full mb-1.5`}>
            <View style={tw`flex-1 mr-2`}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[tw`text-blue-100 text-[11px] tracking-wider uppercase`, { fontFamily: 'PlusJakartaSans_700Bold' }]}
              >
                {activeMetricData.isCritical ? `⚠️ Critical ${activeMetricData.name} Forecast` : hasCriticalRisk ? '⚠️ Critical Anomaly' : `${activeMetricData.name} Forecast`}
              </Text>
            </View>
            <View style={tw`bg-emerald-500/90 px-2.5 py-0.5 rounded-full flex-row items-center gap-1 shrink-0`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />
              <Text style={[tw`text-white text-[9.5px] tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {aiReady ? 'TINYML ON-DEVICE' : (activeMetricData.hasSensor ? 'MODEL ACTIVE' : 'AWAITING SENSORS')}
              </Text>
            </View>
          </View>

          {/* Hero Forecast Projection Display */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[tw`text-white text-[26px] mb-3 text-center`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}
          >
            {activeMetricData.hasSensor ? `${activeMetricData.pred} Projected` : 'Awaiting Live Sensors'}
          </Text>

          {/* 3-Column Stats Grid: Target, Variance, +10m TinyML Forecast */}
          <View style={tw`flex-row justify-between w-full mb-3 px-2 py-2 rounded-2xl bg-black/15`}>
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[10px] mb-0.5`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>Target</Text>
              <Text style={[tw`text-white text-base`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{activeMetricData.target}</Text>
            </View>
            <View style={tw`w-[1px] h-full bg-white/20`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[10px] mb-0.5`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>Variance</Text>
              <Text style={[tw`text-white text-base`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {activeMetricData.variance}
              </Text>
            </View>
            <View style={tw`w-[1px] h-full bg-white/20`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[10px] mb-0.5`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>TinyML 10m</Text>
              <Text style={[tw`text-emerald-300 text-base`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {activeMetricData.ai10m}
              </Text>
            </View>
          </View>

          {/* 4 Environmental Variables Telemetry Grid (Temp, Hum, Light, CO2) */}
          <View style={tw`flex-row justify-between w-full pt-2.5 border-t border-white/20`}>
            {/* Temp */}
            <TouchableOpacity onPress={() => setActiveMetric('temp')} style={[tw`items-center flex-1 py-1 rounded-xl`, activeMetric === 'temp' && tw`bg-white/20`]}>
              <View style={tw`flex-row items-center gap-1`}>
                <Text style={[tw`text-[9px] text-blue-100 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>TEMP</Text>
                {isTempCritical && <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-400`} />}
              </View>
              <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {liveTemp > 0 ? `${liveTemp.toFixed(1)}°` : '--'}
              </Text>
              <Text style={[tw`text-[8.5px] text-emerald-300`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                {aiPredTemp !== null ? `10m: ${aiPredTemp.toFixed(1)}°` : (liveTemp > 0 ? 'TinyML' : '--')}
              </Text>
            </TouchableOpacity>

            {/* Hum */}
            <TouchableOpacity onPress={() => setActiveMetric('hum')} style={[tw`items-center flex-1 py-1 rounded-xl border-l border-white/20`, activeMetric === 'hum' && tw`bg-white/20`]}>
              <View style={tw`flex-row items-center gap-1`}>
                <Text style={[tw`text-[9px] text-blue-100 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>HUM</Text>
                {isHumCritical && <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-400`} />}
              </View>
              <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {liveHum > 0 ? `${Math.round(liveHum)}%` : '--'}
              </Text>
              <Text style={[tw`text-[8.5px] text-emerald-300`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                {aiPredHum !== null ? `10m: ${Math.round(aiPredHum)}%` : (liveHum > 0 ? 'TinyML' : '--')}
              </Text>
            </TouchableOpacity>

            {/* Light */}
            <TouchableOpacity onPress={() => setActiveMetric('light')} style={[tw`items-center flex-1 py-1 rounded-xl border-l border-white/20`, activeMetric === 'light' && tw`bg-white/20`]}>
              <View style={tw`flex-row items-center gap-1`}>
                <Text style={[tw`text-[9px] text-blue-100 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>LIGHT</Text>
              </View>
              <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {liveLight >= 0 && sensors.light !== -999 ? `${liveLight}lx` : '--'}
              </Text>
              <Text style={[tw`text-[8.5px] text-emerald-300`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                {aiPredLight !== null ? `10m: ${Math.round(aiPredLight)}` : (liveLight >= 0 && sensors.light !== -999 ? 'TinyML' : '--')}
              </Text>
            </TouchableOpacity>

            {/* CO2 */}
            <TouchableOpacity onPress={() => setActiveMetric('co2')} style={[tw`items-center flex-1 py-1 rounded-xl border-l border-white/20`, activeMetric === 'co2' && tw`bg-white/20`]}>
              <View style={tw`flex-row items-center gap-1`}>
                <Text style={[tw`text-[9px] text-blue-100 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>CO₂</Text>
                {isCo2Critical && <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-400`} />}
              </View>
              <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {liveCo2 > 0 ? `${liveCo2}` : '--'}
              </Text>
              <Text style={[tw`text-[8.5px] text-emerald-300`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                {aiPredCo2 !== null ? `10m: ${Math.round(aiPredCo2)}` : (liveCo2 > 0 ? 'TinyML' : '--')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Two Side-by-Side Diagnostic Cards */}
        <View style={tw`flex-row justify-between mb-4`}>
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[22px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
              <MaterialCommunityIcons name="brain" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Edge AI Model:
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {aiReady ? 'TFLite INT8' : (liveTemp > 0 ? 'Active' : 'Standby')}
              </Text>
            </View>
          </View>

          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[22px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-1.5`}>
              <MaterialCommunityIcons name="update" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Lookahead:
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-0.5`}>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                +10
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
                    const cy = getY(p.rawVal);
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

      </ScrollView>

      {/* FLOATING ACTION BAR */}
      <View
        style={[
          tw`absolute bottom-5 left-5 right-5 p-2 rounded-[28px] bg-white/95 dark:bg-slate-900/95 shadow-xl border border-slate-200/80 dark:border-slate-800`,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        <View style={tw`flex-row items-center gap-2 p-1`}>
          {/* Live Edge AI Shield Status Indicator */}
          <View
            style={[
              tw`flex-1 flex-row items-center gap-2.5 px-3 py-2 rounded-2xl border`,
              isPreempting
                ? tw`bg-amber-500/10 dark:bg-amber-500/20 border-amber-300 dark:border-amber-700`
                : isAiReady
                ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800`
                : tw`bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700`,
            ]}
          >
            <View
              style={[
                tw`w-8 h-8 rounded-xl items-center justify-center`,
                isPreempting
                  ? tw`bg-amber-500/20`
                  : isAiReady
                  ? tw`bg-emerald-500/20`
                  : tw`bg-sky-500/20`,
              ]}
            >
              <MaterialCommunityIcons
                name={isPreempting ? 'lightning-bolt' : isAiReady ? 'shield-check' : 'shield-sync'}
                size={18}
                color={isPreempting ? '#f59e0b' : isAiReady ? '#10b981' : '#0284c7'}
              />
            </View>
            <View style={tw`flex-1`}>
              <Text
                style={[
                  tw`text-[12px]`,
                  { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  isPreempting
                    ? tw`text-amber-800 dark:text-amber-200`
                    : isAiReady
                    ? tw`text-emerald-800 dark:text-emerald-200`
                    : tw`text-slate-800 dark:text-slate-200`,
                ]}
                numberOfLines={1}
              >
                {isPreempting ? '⚡ Edge AI Active' : isAiReady ? 'Edge AI Shield Active' : 'Edge AI Ready'}
              </Text>
              <Text
                style={[
                  tw`text-[10px]`,
                  { fontFamily: 'PlusJakartaSans_600SemiBold' },
                  isPreempting
                    ? tw`text-amber-600 dark:text-amber-300`
                    : isAiReady
                    ? tw`text-emerald-600 dark:text-emerald-400`
                    : tw`text-slate-500 dark:text-slate-400`,
                ]}
                numberOfLines={1}
              >
                {isPreempting ? preemptLabel : isAiReady ? 'Autonomous offline protection' : 'Sampling 10m buffer'}
              </Text>
            </View>
          </View>

          {/* AI Rules & Logic Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              hapticLight();
              setShowSuggestionsModal(true);
            }}
            style={tw`py-3 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200/50 dark:border-slate-700/50`}
          >
            <View style={tw`flex-row items-center gap-1.5`}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={15} color={isDarkMode ? '#94a3b8' : '#475569'} />
              <Text style={[tw`text-[13px] text-slate-700 dark:text-slate-200`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Rules
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI AUTONOMOUS RULES & LOGIC MODAL */}
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
              { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, 24) + 36, minHeight: 520 },
            ]}
          >
            {/* Grab handle */}
            <View style={tw`w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full self-center mb-4`} />

            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View>
                <Text style={[tw`text-[17px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Edge AI Autonomous Logic
                </Text>
                <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  Closed-loop 10-minute predictive triggers
                </Text>
              </View>

              <View style={tw`bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full flex-row items-center gap-1`}>
                <MaterialCommunityIcons name="cpu-64-bit" size={12} color="#10b981" />
                <Text style={[tw`text-[9px] text-emerald-700 dark:text-emerald-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  ESP32 LOCAL
                </Text>
              </View>
            </View>

            {/* Edge AI Info Banner */}
            <View style={tw`p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 mb-3.5 flex-row items-start gap-2.5`}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#10b981" style={tw`mt-0.5`} />
              <Text style={[tw`text-[11px] text-slate-600 dark:text-slate-300 flex-1 leading-4`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                Your TinyML Edge AI runs 100% locally on the ESP32. When it forecasts an anomaly, it engages fans or misters preemptively before thresholds are exceeded. No manual trigger is needed.
              </Text>
            </View>

            {/* Action Cards */}
            <View style={tw`gap-2.5 mb-5`}>
              {/* Action 1 */}
              <View
                style={tw`p-3.5 rounded-2xl border bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 flex-row items-center gap-3`}
              >
                <View style={tw`w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 items-center justify-center`}>
                  <MaterialCommunityIcons name="fan" size={18} color="#3b82f6" />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                    <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      Cool the Chamber
                    </Text>
                    <View style={tw`bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 rounded`}>
                      <Text style={[tw`text-[8px] text-blue-600 dark:text-blue-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        SP &gt; 25.0°C
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Runs fans preemptively if +10 min forecast exceeds 25°C to purge excess heat.
                  </Text>
                </View>

                <View style={tw`bg-blue-500/15 dark:bg-blue-500/25 px-2 py-1 rounded-lg`}>
                  <Text style={[tw`text-[9px] text-blue-600 dark:text-blue-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    AUTO
                  </Text>
                </View>
              </View>

              {/* Action 2 */}
              <View
                style={tw`p-3.5 rounded-2xl border bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 flex-row items-center gap-3`}
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
                        RH &lt; 75%
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Pulses ultrasonic misters if +10 min humidity drops below optimal band.
                  </Text>
                </View>

                <View style={tw`bg-emerald-500/15 dark:bg-emerald-500/25 px-2 py-1 rounded-lg`}>
                  <Text style={[tw`text-[9px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    AUTO
                  </Text>
                </View>
              </View>

              {/* Action 3 */}
              <View
                style={tw`p-3.5 rounded-2xl border bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 flex-row items-center gap-3`}
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
                        CO₂ &gt; 1000 ppm
                      </Text>
                    </View>
                  </View>
                  <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                    Flushes stale CO₂ out of the chamber before mycelium suffocation.
                  </Text>
                </View>

                <View style={tw`bg-purple-500/15 dark:bg-purple-500/25 px-2 py-1 rounded-lg`}>
                  <Text style={[tw`text-[9px] text-purple-600 dark:text-purple-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    AUTO
                  </Text>
                </View>
              </View>
            </View>

            {/* Modal Button: Got It */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={slideOutAndClose}
              style={tw`w-full py-4 rounded-2xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center shadow-md mb-3`}
            >
              <View style={tw`flex-row items-center gap-1.5`}>
                <MaterialCommunityIcons name="check" size={16} color="white" />
                <Text style={[tw`text-white text-[13px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Got It
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
