import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Line, Circle, Text as SvgText, G, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';
import { useSensors } from '../hooks/useFirebaseData';
import { hapticLight, hapticSelection } from '../utils/haptics';
import AnalyticsScreenSkeleton from '../components/skeletons/AnalyticsScreenSkeleton';

type MetricType = 'temp' | 'hum' | 'light' | 'co2';
type TimeRange = '24H' | '7D' | '30D';

const { width } = Dimensions.get('window');

// Generate realistic mock history
const generateHistoryData = (base: number, variance: number, points: number, range: TimeRange) => {
  return Array.from({ length: points }).map((_, i) => {
    let label = '';
    let time = '';
    if (range === '24H') {
      label = `${i}`;
      time = `${i.toString().padStart(2, '0')}:00`;
    } else if (range === '7D') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      label = days[i % 7];
      time = `${days[i % 7]} (Day ${i + 1})`;
    } else {
      label = `${i + 1}`;
      time = `Day ${i + 1}`;
    }

    const value = Number((base + (Math.sin(i / 2.5) * variance * 0.8) + (Math.random() * variance * 0.4 - variance * 0.2)).toFixed(1));

    return { value, label, time, index: i };
  });
};

// Smooth Bezier Curve generator for SVG
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

export default function AnalyticsScreen() {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const sensors = useSensors();

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => setIsReady(true));
      return () => cancelIdleCallback(handle);
    }
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const [activeMetric, setActiveMetric] = useState<MetricType>('temp');
  const [activeRange, setActiveRange] = useState<TimeRange>('24H');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const currentLiveValues = {
    temp: typeof sensors.temperature === 'number' ? sensors.temperature : 26.5,
    hum: typeof sensors.humidity === 'number' ? sensors.humidity : 82,
    light: typeof sensors.light === 'number' ? sensors.light : 640,
    co2: typeof sensors.co2 === 'number' ? sensors.co2 : 680,
  };

  const metricsInfo = {
    temp: { 
      label: 'Temperature', 
      shortLabel: 'Temp', 
      unit: '°C', 
      color: '#f97316', 
      accentBg: 'bg-orange-500/10 dark:bg-orange-500/20',
      icon: 'thermometer' as const,
      base: 25.5, 
      var: 3.5,
      optimal: '24.0 - 28.0°C',
      min: 18,
      max: 35
    },
    hum: { 
      label: 'Humidity', 
      shortLabel: 'Hum', 
      unit: '%', 
      color: '#0ea5e9', 
      accentBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      icon: 'water-percent' as const,
      base: 82, 
      var: 10,
      optimal: '80 - 90%',
      min: 50,
      max: 95
    },
    light: { 
      label: 'Light Level', 
      shortLabel: 'Light', 
      unit: 'lx', 
      color: '#f59e0b', 
      accentBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      icon: 'white-balance-sunny' as const,
      base: 580, 
      var: 160,
      optimal: '500 - 800 lx',
      min: 200,
      max: 800
    },
    co2: { 
      label: 'CO2 Level', 
      shortLabel: 'CO2', 
      unit: 'ppm', 
      color: '#10b981', 
      accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      icon: 'molecule-co2' as const,
      base: 660, 
      var: 110,
      optimal: '< 800 ppm',
      min: 300,
      max: 1200
    },
  };

  const currentMetric = metricsInfo[activeMetric];

  const chartData = useMemo(() => {
    const points = activeRange === '24H' ? 25 : activeRange === '7D' ? 7 : 30;
    return generateHistoryData(currentMetric.base, currentMetric.var, points, activeRange);
  }, [activeMetric, activeRange]);

  const min = Math.min(...chartData.map(d => d.value));
  const max = Math.max(...chartData.map(d => d.value));
  const avg = (chartData.reduce((acc, curr) => acc + curr.value, 0) / chartData.length).toFixed(1);

  // Chart Layout Calculations using Control Parameter Min/Max
  const chartHeight = 175;
  const viewportWidth = width - 40 - 52; // screen - outer padding - y-axis width
  const pointSpacing = activeRange === '24H' ? 38 : activeRange === '7D' ? Math.max(50, viewportWidth / 7) : 34;
  const chartWidth = Math.max(viewportWidth, (chartData.length - 1) * pointSpacing + 48);

  const maxDataValue = currentMetric.max;
  const minDataValue = currentMetric.min;
  const midDataValue = Number(((maxDataValue + minDataValue) / 2).toFixed(maxDataValue - minDataValue < 50 ? 1 : 0));
  const valueRange = Math.max(1, maxDataValue - minDataValue);

  const points = useMemo(() => {
    const startX = 24;
    return chartData.map((data, index) => {
      const x = startX + index * pointSpacing;
      const clampedVal = Math.min(maxDataValue, Math.max(minDataValue, data.value));
      const y = (chartHeight - 18) - ((clampedVal - minDataValue) / valueRange) * (chartHeight - 36);
      return { x, y, value: data.value, label: data.label, time: data.time, index };
    });
  }, [chartData, pointSpacing, chartHeight, minDataValue, maxDataValue, valueRange]);

  const bezierPath = useMemo(() => getBezierPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!bezierPath || points.length === 0) return '';
    return `${bezierPath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  }, [bezierPath, points, chartHeight]);

  const activePoint = selectedPointIndex !== null ? points[selectedPointIndex] : points[points.length - 1];

  const tabScrollRef = useRef<ScrollView>(null);
  const chartScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  // Auto-scroll chart to the rightmost (latest data) point when range or metric changes
  useEffect(() => {
    const t = setTimeout(() => {
      chartScrollRef.current?.scrollToEnd({ animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [activeRange, activeMetric]);

  const scrollToTab = (key: MetricType) => {
    const layout = tabLayouts.current[key];
    if (layout && tabScrollRef.current) {
      const screenWidth = Dimensions.get('window').width;
      const targetScrollX = Math.max(0, layout.x - screenWidth / 2 + layout.width / 2);
      tabScrollRef.current.scrollTo({ x: targetScrollX, animated: true });
    }
  };

  const handleSelectMetric = (key: MetricType) => {
    hapticSelection();
    setActiveMetric(key);
    setSelectedPointIndex(null);
    scrollToTab(key);
  };

  const handleSelectRange = (range: TimeRange) => {
    hapticSelection();
    setActiveRange(range);
    setSelectedPointIndex(null);
  };

  return (
    <View style={[tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {!isReady ? (
        <AnalyticsScreenSkeleton />
      ) : (
      <ScrollView contentContainerStyle={tw`pb-32 pt-4`} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={tw`px-6 mb-6 flex-row items-center`}>
          <View style={tw`flex-row items-center gap-3.5`}>
            <TouchableOpacity 
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              onPress={() => navigation.goBack()}
              style={tw`w-11 h-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-800`}
            >
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#ffffff' : '#1e293b'} />
            </TouchableOpacity>
            <View>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Climate Analytics
              </Text>
              <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Environmental trends & telemetry
              </Text>
            </View>
          </View>
        </View>

        {/* Metric Selection Tabs */}
        <View style={tw`mb-6`}>
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
                      ? [tw`bg-white dark:bg-slate-800`, { borderColor: info.color, borderWidth: 1.5 }]
                      : tw`bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800`
                  ]}
                >
                  <View style={[tw`w-7 h-7 rounded-xl items-center justify-center`, { backgroundColor: `${info.color}18` }]}>
                    <MaterialCommunityIcons name={info.icon} size={16} color={info.color} />
                  </View>
                  <View>
                    <Text style={[tw`text-[10px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {info.shortLabel}
                    </Text>
                    <Text style={[tw`text-[13px] text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      {liveVal}{info.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Chart Card */}
        <View style={tw`bg-white dark:bg-slate-900 mx-5 rounded-[28px] p-5 shadow-sm border border-slate-200/70 dark:border-slate-800 mb-6`}>
          
          {/* Card Top: Live Inspector & Time Filter */}
          <View style={tw`flex-row justify-between items-start mb-5`}>
            <View>
              <View style={tw`flex-row items-center gap-2 mb-1`}>
                <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: currentMetric.color }]} />
                <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {selectedPointIndex !== null ? `Point (${activePoint?.time})` : `Average (${activeRange})`}
                </Text>
              </View>
              <View style={tw`flex-row items-baseline gap-1.5`}>
                <Text style={[tw`text-3xl text-slate-900 dark:text-white tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {selectedPointIndex !== null ? activePoint?.value : avg}
                </Text>
                <Text style={[tw`text-sm text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {currentMetric.unit}
                </Text>
              </View>
            </View>

            {/* Time Filter Pills */}
            <View style={tw`flex-row bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1`}>
              {(['24H', '7D', '30D'] as TimeRange[]).map(range => {
                const isRActive = activeRange === range;
                return (
                  <TouchableOpacity
                    key={range}
                    activeOpacity={0.7}
                    onPress={() => handleSelectRange(range)}
                    style={[
                      tw`px-3 py-1.5 rounded-lg`,
                      isRActive ? tw`bg-white dark:bg-slate-700 shadow-sm` : null
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-[11px]`,
                        isRActive ? tw`text-slate-900 dark:text-white` : tw`text-slate-400 dark:text-slate-500`,
                        { fontFamily: 'PlusJakartaSans_700Bold' }
                      ]}
                    >
                      {range}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Swipe Hint indicator if content is wider than viewport */}
          {chartWidth > viewportWidth && (
            <View style={tw`flex-row items-center justify-end mb-2 gap-1`}>
              <MaterialCommunityIcons name="gesture-swipe-horizontal" size={13} color={isDarkMode ? '#64748b' : '#94a3b8'} />
              <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Swipe for timeline history
              </Text>
            </View>
          )}

          {/* Graph Row with Pinned Y-Axis and Swipable Chart */}
          <View style={[tw`flex-row items-start`, { height: chartHeight + 42 }]}>
            
            {/* Pinned Left Y-Axis Scale */}
            <View style={[tw`justify-between pr-2.5 z-10`, { height: chartHeight }]}>
              <Text style={[tw`text-[9.5px] text-slate-400 text-right`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {maxDataValue}
              </Text>
              <Text style={[tw`text-[9.5px] text-slate-400 text-right`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {midDataValue}
              </Text>
              <Text style={[tw`text-[9.5px] text-slate-400 text-right`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {minDataValue}
              </Text>
            </View>

            {/* Swipable Chart Area */}
            <ScrollView
              ref={chartScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
              decelerationRate="normal"
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              overScrollMode="never"
              style={tw`flex-1`}
              contentContainerStyle={{ width: chartWidth, height: chartHeight + 42, position: 'relative' }}
            >
              <Svg width={chartWidth} height={chartHeight + 40}>
                <Defs>
                  <SvgGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={currentMetric.color} stopOpacity="0.28" />
                    <Stop offset="100%" stopColor={currentMetric.color} stopOpacity="0.0" />
                  </SvgGradient>
                </Defs>

                {/* Horizontal Dashed Grid Lines spanning full scroll width */}
                <Line x1="0" y1="18" x2={chartWidth} y2="18" stroke={isDarkMode ? '#334155' : '#f1f5f9'} strokeDasharray="4 4" strokeWidth="1" />
                <Line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke={isDarkMode ? '#334155' : '#f1f5f9'} strokeDasharray="4 4" strokeWidth="1" />
                <Line x1="0" y1={chartHeight - 18} x2={chartWidth} y2={chartHeight - 18} stroke={isDarkMode ? '#334155' : '#f1f5f9'} strokeDasharray="4 4" strokeWidth="1" />

                {/* Vertical subtle guide dashes under labeled points */}
                {points.filter(p => !!p.label).map((p, idx) => (
                  <Line
                    key={`v-grid-${idx}`}
                    x1={p.x}
                    y1="10"
                    x2={p.x}
                    y2={chartHeight - 8}
                    stroke={isDarkMode ? '#1e293b' : '#f8fafc'}
                    strokeDasharray="2 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Area Gradient */}
                {areaPath !== '' && <Path d={areaPath} fill="url(#chartAreaGrad)" />}

                {/* Smooth Bezier Curve */}
                {bezierPath !== '' && (
                  <Path
                    d={bezierPath}
                    stroke={currentMetric.color}
                    strokeWidth="2.75"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}

                {/* Active Focus Scrubber line, Marker & floating value pill */}
                {activePoint && (
                  <>
                    <Line
                      x1={activePoint.x}
                      y1="10"
                      x2={activePoint.x}
                      y2={chartHeight - 8}
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

                {/* X-Axis Tick Marks & Sequential Numbers (0, 1, 2, 3... 24) */}
                {points.map((p, i) => {
                  const isSelected = activePoint?.index === p.index;

                  return (
                    <G key={`x-axis-grp-${i}`}>
                      {/* X-Axis Tick */}
                      <Line
                        x1={p.x}
                        y1={chartHeight - 12}
                        x2={p.x}
                        y2={chartHeight - 6}
                        stroke={isSelected ? currentMetric.color : (isDarkMode ? '#475569' : '#cbd5e1')}
                        strokeWidth={isSelected ? '2' : '1'}
                      />
                      {/* X-Axis Number / Label */}
                      <SvgText
                        x={p.x}
                        y={chartHeight + 14}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isSelected ? 'bold' : '600'}
                        fill={isSelected ? currentMetric.color : (isDarkMode ? '#94a3b8' : '#64748b')}
                      >
                        {p.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>

              {/* Interactive touch targets over each point */}
              <View style={tw`absolute inset-0 flex-row`}>
                {points.map((p, idx) => (
                  <TouchableOpacity
                    key={`point-touch-${idx}`}
                    activeOpacity={0.7}
                    delayPressIn={50}
                    onPress={() => {
                      hapticLight();
                      setSelectedPointIndex(idx);
                    }}
                    style={{
                      width: pointSpacing,
                      height: chartHeight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Bottom Selected Telemetry Strip */}
          <View style={tw`mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: currentMetric.color }]} />
              <Text style={[tw`text-[11.5px] text-slate-600 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {selectedPointIndex !== null ? `Timeline Point: ${activePoint?.time}` : `Current Reading: ${activePoint?.time}`}
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-[16px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold', color: currentMetric.color }]}>
                {activePoint?.value}
              </Text>
              <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {currentMetric.unit}
              </Text>
            </View>
          </View>
        </View>

        {/* 4-Column Metric Telemetry Summary Cards */}
        <View style={tw`px-5 flex-row flex-wrap justify-between gap-y-3 mb-6`}>
          
          {/* Minimum */}
          <View style={[tw`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm justify-between`, { width: '48%' }]}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <View style={tw`w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/15 items-center justify-center`}>
                <Ionicons name="arrow-down" size={13} color="#3b82f6" />
              </View>
              <Text style={[tw`text-[11px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Minimum
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {min}
              </Text>
              <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{currentMetric.unit}</Text>
            </View>
          </View>

          {/* Maximum */}
          <View style={[tw`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm justify-between`, { width: '48%' }]}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <View style={tw`w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/15 items-center justify-center`}>
                <Ionicons name="arrow-up" size={13} color="#ef4444" />
              </View>
              <Text style={[tw`text-[11px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Maximum
              </Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-2xl text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {max}
              </Text>
              <Text style={[tw`text-xs text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{currentMetric.unit}</Text>
            </View>
          </View>

          {/* Optimal Target */}
          <View style={[tw`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm justify-between`, { width: '48%' }]}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <View style={tw`w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 items-center justify-center`}>
                <MaterialCommunityIcons name="target" size={14} color="#10b981" />
              </View>
              <Text style={[tw`text-[11px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Optimal
              </Text>
            </View>
            <Text style={[tw`text-[15px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {currentMetric.optimal}
            </Text>
          </View>

          {/* Stability */}
          <View style={[tw`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm justify-between`, { width: '48%' }]}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <View style={tw`w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/15 items-center justify-center`}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#8b5cf6" />
              </View>
              <Text style={[tw`text-[11px] text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Stability
              </Text>
            </View>
            <Text style={[tw`text-[15px] text-purple-600 dark:text-purple-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              High (98.2%)
            </Text>
          </View>
        </View>

        {/* AI Prediction Hub Link Card */}
        <View style={tw`px-5`}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Report' as never)}
            style={tw`bg-emerald-500 dark:bg-emerald-600 rounded-[24px] p-5 shadow-sm flex-row items-center justify-between`}
          >
            <View style={tw`flex-1 mr-3`}>
              <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                <MaterialCommunityIcons name="star-four-points" size={16} color="white" />
                <Text style={[tw`text-white text-xs uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  AI Forecast & Insights
                </Text>
              </View>
              <Text style={[tw`text-white/90 text-xs`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                View 24h predictive model, auto-fix suggestions, and chamber alerts.
              </Text>
            </View>
            <View style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
      )}
    </View>
  );
}
