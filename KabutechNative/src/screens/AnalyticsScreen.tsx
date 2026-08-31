import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';

type MetricType = 'temp' | 'hum' | 'light' | 'co2';
type TimeRange = '24H' | '7D' | '30D';

const { width } = Dimensions.get('window');

const generateMockData = (base: number, variance: number, points: number, range: TimeRange) => {
  return Array.from({ length: points }).map((_, i) => {
    let label = '';
    if (range === '24H' && i % 4 === 0) label = `${i}h`;
    if (range === '7D' && i % 1 === 0) label = `D${i + 1}`;
    if (range === '30D' && i % 5 === 0) label = `D${i + 1}`;

    return {
      value: Number((base + (Math.random() * variance * 2 - variance)).toFixed(1)),
      label
    };
  });
};

export default function AnalyticsScreen() {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeMetric, setActiveMetric] = useState<MetricType>('temp');
  const [activeRange, setActiveRange] = useState<TimeRange>('24H');

  const metricsInfo = {
    temp: { label: 'Temperature', unit: '°C', color: '#ef4444', base: 26, var: 3 },
    hum: { label: 'Humidity', unit: '%', color: '#3b82f6', base: 85, var: 8 },
    light: { label: 'Light Level', unit: 'Lux', color: '#eab308', base: 400, var: 150 },
    co2: { label: 'CO2', unit: 'ppm', color: '#10b981', base: 650, var: 100 },
  };

  const currentMetric = metricsInfo[activeMetric];

  const chartData = useMemo(() => {
    const points = activeRange === '24H' ? 24 : activeRange === '7D' ? 7 : 30;
    return generateMockData(currentMetric.base, currentMetric.var, points, activeRange);
  }, [activeMetric, activeRange]);

  const min = Math.min(...chartData.map(d => d.value));
  const max = Math.max(...chartData.map(d => d.value));
  const avg = (chartData.reduce((acc, curr) => acc + curr.value, 0) / chartData.length).toFixed(1);

  // Chart Dimensions
  const chartHeight = 180;
  const chartWidth = width - 110; // Account for padding and Y-axis labels
  const maxDataValue = max + (currentMetric.var * 0.2);
  const minDataValue = Math.max(0, min - (currentMetric.var * 0.2));
  const valueRange = maxDataValue - minDataValue;

  // Calculate points for Pure JS Line Graph
  const points = chartData.map((data, index) => {
    const x = (index / (chartData.length - 1)) * chartWidth;
    const y = chartHeight - ((data.value - minDataValue) / valueRange) * chartHeight;
    return { x, y, value: data.value, label: data.label };
  });

  return (
    <View style={[tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`, { paddingTop: insets.top }]}>

      <ScrollView contentContainerStyle={tw`pb-24 pt-6`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw`px-6 mb-8 flex-row items-center gap-4`}>
          <TouchableOpacity 
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            onPress={() => navigation.goBack()}
            style={tw`w-11 h-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50`}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#ffffff' : '#334155'} />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-2xl text-slate-800 dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              Climate Analytics
            </Text>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              Historical environmental trends
            </Text>
          </View>
        </View>

        {/* Metric Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-6 gap-3 mb-8`}>
          {(Object.keys(metricsInfo) as MetricType[]).map(key => {
            const isActive = activeMetric === key;
            const info = metricsInfo[key];
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveMetric(key)}
                style={[
                  tw`px-5 py-2.5 rounded-full border flex-row items-center gap-2`,
                  isActive
                    ? { backgroundColor: info.color, borderColor: info.color }
                    : tw`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`
                ]}
              >
                <MaterialCommunityIcons
                  name={key === 'temp' ? 'thermometer' : key === 'hum' ? 'water-percent' : key === 'light' ? 'white-balance-sunny' : 'molecule-co2'}
                  size={16}
                  color={isActive ? 'white' : info.color}
                />
                <Text style={[
                  tw`text-xs`,
                  isActive ? tw`text-white` : tw`text-slate-600 dark:text-slate-300`,
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}>
                  {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Chart Area */}
        <View style={tw`bg-white dark:bg-slate-800 mx-4 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-6`}>
          <View style={tw`flex-row justify-between items-start mb-8`}>
            <View>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {avg} <Text style={[tw`text-sm text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{currentMetric.unit}</Text>
              </Text>
              <Text style={[tw`text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Average ({activeRange})
              </Text>
            </View>

            {/* Time Range Selector */}
            <View style={tw`flex-row bg-slate-100 dark:bg-slate-900 rounded-xl p-1`}>
              {(['24H', '7D', '30D'] as TimeRange[]).map(range => (
                <TouchableOpacity
                  key={range}
                  onPress={() => setActiveRange(range)}
                  style={[
                    tw`px-3 py-1.5 rounded-lg`,
                    activeRange === range ? tw`bg-white dark:bg-slate-700 shadow-sm` : null
                  ]}
                >
                  <Text style={[
                    tw`text-[10px]`,
                    activeRange === range ? tw`text-slate-800 dark:text-white` : tw`text-slate-500 dark:text-slate-400`,
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pure JS Line Graph Area */}
          <View style={[tw`flex-row`, { height: chartHeight + 20 }]}>

            {/* Y-Axis Labels */}
            <View style={[tw`justify-between pr-3 pb-5`, { height: chartHeight + 20 }]}>
              <Text style={[tw`text-[9px] text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{maxDataValue.toFixed(0)}</Text>
              <Text style={[tw`text-[9px] text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{((maxDataValue + minDataValue) / 2).toFixed(0)}</Text>
              <Text style={[tw`text-[9px] text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{minDataValue.toFixed(0)}</Text>
            </View>

            {/* Graph Canvas */}
            <View style={{ height: chartHeight, width: chartWidth, position: 'relative' }}>
              {/* Horizontal Grid Lines */}
              <View style={[tw`w-full bg-slate-100 dark:bg-slate-700/50 absolute`, { height: 1, top: 0 }]} />
              <View style={[tw`w-full bg-slate-100 dark:bg-slate-700/50 absolute`, { height: 1, top: chartHeight / 2 }]} />
              <View style={[tw`w-full bg-slate-100 dark:bg-slate-700/50 absolute`, { height: 1, top: chartHeight }]} />

              {/* Draw Lines between points */}
              {points.map((p, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const dx = p.x - prev.x;
                const dy = p.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`line-${i}`}
                    style={{
                      position: 'absolute',
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      height: 3,
                      backgroundColor: currentMetric.color,
                      transform: [
                        { translateX: -length / 2 },
                        { rotate: `${angle}deg` },
                        { translateX: length / 2 }
                      ],
                      borderRadius: 2
                    }}
                  />
                );
              })}

              {/* Draw Points */}
              {points.map((p, i) => (
                <View
                  key={`point-${i}`}
                  style={{
                    position: 'absolute',
                    left: p.x - 4,
                    top: p.y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'white',
                    borderWidth: 2,
                    borderColor: currentMetric.color
                  }}
                />
              ))}

              {/* X-Axis Labels positioned relatively to the canvas */}
              {points.map((p, i) => {
                if (!p.label) return null;
                return (
                  <View
                    key={`label-${i}`}
                    style={{
                      position: 'absolute',
                      left: p.x - 15, // Center the label
                      top: chartHeight + 10,
                      width: 30,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={[tw`text-[9px] text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {p.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Min/Max Summary Cards */}
        <View style={tw`px-6 flex-row justify-between`}>
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-2 mb-3`}>
              <View style={tw`w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center`}>
                <MaterialCommunityIcons name="arrow-down-thick" size={12} color={currentMetric.color} />
              </View>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Minimum</Text>
            </View>
            <Text style={[tw`text-2xl text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {min} <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{currentMetric.unit}</Text>
            </Text>
          </View>

          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-2 mb-3`}>
              <View style={tw`w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center`}>
                <MaterialCommunityIcons name="arrow-up-thick" size={12} color={currentMetric.color} />
              </View>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Maximum</Text>
            </View>
            <Text style={[tw`text-2xl text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {max} <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{currentMetric.unit}</Text>
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
