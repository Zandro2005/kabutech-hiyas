import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../../tailwind';
import { useTheme } from '../../context/ThemeContext';
import { handleChartExport } from '../../utils/yieldExport';
import { hapticLight, hapticSelection } from '../../utils/haptics';

interface YieldChartProps {
  dailyMap: Record<string, { count: number; grams: number; racks: Set<string>; rackYields: Record<string, number> }>;
  chartPeriod: 'Monthly' | 'Semi-Annually' | 'Annually';
  setChartPeriod: (period: 'Monthly' | 'Semi-Annually' | 'Annually') => void;
  isExporting: React.MutableRefObject<boolean>;
}

export default React.memo(function YieldChart({ dailyMap, chartPeriod, setChartPeriod, isExporting }: YieldChartProps) {
  const { isDarkMode } = useTheme();
  const chartScrollRef = useRef<ScrollView>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  // Build Chronological Chart Buckets
  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    
    // Initialize buckets in chronological order
    if (chartPeriod === 'Monthly') {
       for (let i = 3; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const mLabel = d.toLocaleDateString('en-US', { month: 'short' });
          buckets[`${mLabel} W${4 - i}`] = 0; 
       }
    } else if (chartPeriod === 'Semi-Annually') {
       for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
       }
    } else { // Annually
       for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets[d.toLocaleDateString('en-US', { month: 'short' })] = 0;
       }
    }

    // Populate buckets from dailyMap
    Object.keys(dailyMap).forEach(dateStr => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const kg = (dailyMap[dateStr]?.grams || 0) / 1000;
      
      if (chartPeriod === 'Semi-Annually' || chartPeriod === 'Annually') {
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        const limit = chartPeriod === 'Semi-Annually' ? 6 : 12;
        if (monthsAgo >= 0 && monthsAgo < limit) {
          const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
          if (buckets[monthLabel] !== undefined) buckets[monthLabel] += kg;
        }
      } else {
        // monthly - group into 4 weeks (7 days each)
        const daysAgo = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
        if (daysAgo >= 0 && daysAgo < 28) {
          const weekIdx = 3 - Math.floor(daysAgo / 7);
          const targetD = new Date(now.getTime() - (3 - weekIdx) * 7 * 24 * 60 * 60 * 1000);
          const mLabel = targetD.toLocaleDateString('en-US', { month: 'short' });
          const label = `${mLabel} W${weekIdx + 1}`;
          if (buckets[label] !== undefined) buckets[label] += kg;
        }
      }
    });

    return Object.keys(buckets).map(label => ({
      label,
      kg: Number(buckets[label].toFixed(2))
    }));
  }, [dailyMap, chartPeriod]);

  // Derived Analytics Summary
  const { totalKg, maxKg, peakItem, avgKg } = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr.kg, 0);
    let peakVal = 0;
    let peakObj: { label: string; kg: number } | null = null;
    chartData.forEach(item => {
      if (item.kg > peakVal) {
        peakVal = item.kg;
        peakObj = item;
      }
    });
    const avg = chartData.length > 0 ? total / chartData.length : 0;
    return {
      totalKg: Number(total.toFixed(1)),
      maxKg: peakVal,
      peakItem: peakObj,
      avgKg: Number(avg.toFixed(1))
    };
  }, [chartData]);

  const activeBar = selectedBarIndex !== null ? chartData[selectedBarIndex] : null;

  const onExport = () => {
    hapticSelection();
    handleChartExport(chartData, chartPeriod, isExporting);
  };

  const handlePeriodChange = (period: 'Monthly' | 'Semi-Annually' | 'Annually') => {
    hapticSelection();
    setSelectedBarIndex(null);
    setChartPeriod(period);
  };

  const handleBarPress = (index: number) => {
    hapticLight();
    setSelectedBarIndex(prev => (prev === index ? null : index));
  };

  const maxYield = Math.max(maxKg, 1);
  const yAxisSteps = [maxYield, maxYield * 0.66, maxYield * 0.33, 0];

  return (
    <View style={tw`bg-white dark:bg-slate-900 rounded-[28px] p-5 shadow-sm border border-slate-200/70 dark:border-slate-800 mb-5`}>
      
      {/* Header & Export */}
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
          <View style={tw`w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/30 items-center justify-center shrink-0`}>
            <MaterialCommunityIcons name="chart-bar" size={20} color="#10b981" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[15px] text-slate-900 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
              Yield Performance
            </Text>
            <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]} numberOfLines={1}>
              Harvest output (kg)
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  
          activeOpacity={0.75}
          style={tw`flex-row items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700 shrink-0`}
          onPress={onExport}
        >
          <MaterialCommunityIcons name="export-variant" size={11} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Header: Total Volume Readout & Period Tabs */}
      <View style={tw`flex-row justify-between items-center mb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80`}>
        <View style={tw`flex-row items-baseline gap-1`}>
          <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {totalKg}
          </Text>
          <Text style={[tw`text-xs text-slate-400 font-bold`]}>kg total</Text>
        </View>

        {/* Minimalist Period Switcher */}
        <View style={tw`bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-row items-center gap-1`}>
          {(['Monthly', 'Semi-Annually', 'Annually'] as const).map((period) => {
            const isActive = chartPeriod === period;
            const shortLabel = period === 'Monthly' ? '4W' : period === 'Semi-Annually' ? '6M' : '1Y';
            return (
              <TouchableOpacity 
                key={period}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}  
                activeOpacity={0.8}
                onPress={() => handlePeriodChange(period)}
                style={[
                  tw`px-2.5 py-1 rounded-lg items-center justify-center`,
                  isActive ? tw`bg-white dark:bg-slate-700 shadow-sm` : tw`bg-transparent`
                ]}
              >
                <Text style={[
                  tw`text-[10px]`,
                  isActive 
                    ? [tw`text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }] 
                    : [tw`text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]
                ]}>
                  {shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Dynamic Bar Chart Area */}
      <View style={tw`h-44 flex-row`}>
        {chartData.length === 0 || chartData.every(d => d.kg === 0) ? (
          <View style={tw`flex-1 items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800`}>
            <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 text-center`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              No harvests recorded for this period
            </Text>
          </View>
        ) : (
          <>
            {/* Y-Axis Step Labels */}
            <View style={tw`justify-between items-end pr-2.5 py-2 w-8`}>
              {yAxisSteps.map((val, idx) => (
                <Text key={idx} style={[tw`text-[9px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {val >= 10 ? Math.round(val) : val.toFixed(1)}
                </Text>
              ))}
            </View>
            
            {/* Chart Grid & Columns */}
            <View style={tw`flex-1 relative`}>
              {/* Subtle Horizontal Reference Grid Lines */}
              <View style={tw`absolute inset-0 justify-between py-2 pointer-events-none`}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={tw`w-full border-t border-slate-100 dark:border-slate-800/80`} />
                ))}
              </View>

              {/* Scrollable / Responsive Bars */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                ref={chartScrollRef}
                onLayout={() => setTimeout(() => chartScrollRef.current?.scrollToEnd({ animated: false }), 50)}
                onContentSizeChange={() => setTimeout(() => chartScrollRef.current?.scrollToEnd({ animated: false }), 50)}
                contentContainerStyle={[tw`flex-row items-end pt-3 pb-1 px-1`, { flexGrow: 1 }]}
              >
                {chartData.map((data, idx) => {
                  const valKg = data.kg;
                  const heightPct = Math.max((valKg / maxYield) * 100, 0); 
                  const isSelected = selectedBarIndex === idx;
                  
                  let columnWidth = 'w-9 mx-1';
                  if (chartPeriod === 'Monthly') columnWidth = 'w-14 mx-2';
                  else if (chartPeriod === 'Semi-Annually') columnWidth = 'w-11 mx-1.5';
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => handleBarPress(idx)}
                      style={tw`items-center ${columnWidth}`}
                    >
                      {/* Top Value Tag */}
                      <View style={tw`h-3.5 items-center justify-center mb-1`}>
                        {valKg > 0 && (
                          <Text 
                            style={[
                              tw`text-[8px]`,
                              isSelected ? tw`text-emerald-600 dark:text-emerald-400 font-extrabold` : tw`text-slate-400 dark:text-slate-500 font-bold`,
                              { fontFamily: 'PlusJakartaSans_700Bold' }
                            ]} 
                            numberOfLines={1}
                          >
                            {valKg.toFixed(1)}
                          </Text>
                        )}
                      </View>

                      {/* Bar Visual Track */}
                      <View style={tw`h-[72%] justify-end w-full items-center`}>
                        <View 
                          style={[
                            tw`w-4.5 rounded-t-md`,
                            isSelected 
                              ? tw`bg-emerald-500 dark:bg-emerald-400 shadow-sm` 
                              : valKg > 0 
                                ? tw`bg-emerald-600 dark:bg-emerald-500` 
                                : tw`bg-slate-100 dark:bg-slate-800/80`,
                            { 
                              height: `${heightPct}%`, 
                              minHeight: valKg > 0 ? 5 : 2 
                            }
                          ]} 
                        />
                      </View>

                      {/* X-Axis Label */}
                      <Text 
                        style={[
                          tw`text-[9px] mt-1.5 uppercase text-center`,
                          isSelected 
                            ? [tw`text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }] 
                            : [tw`text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]
                        ]} 
                        numberOfLines={1}
                      >
                        {data.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}
      </View>

    </View>
  );
});

