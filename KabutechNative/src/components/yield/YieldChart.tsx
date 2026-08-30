import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../../tailwind';
import { handleChartExport } from '../../utils/yieldExport';

interface YieldChartProps {
  dailyMap: Record<string, { count: number; grams: number; racks: Set<string>; rackYields: Record<string, number> }>;
  chartPeriod: 'Monthly' | 'Semi-Annually' | 'Annually';
  setChartPeriod: (period: 'Monthly' | 'Semi-Annually' | 'Annually') => void;
  isExporting: React.MutableRefObject<boolean>;
}

export default React.memo(function YieldChart({ dailyMap, chartPeriod, setChartPeriod, isExporting }: YieldChartProps) {
  const chartScrollRef = useRef<ScrollView>(null);

  const buildChartData = () => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    
    // Initialize buckets in chronological order
    if (chartPeriod === 'Monthly') {
       for(let i=3; i>=0; i--) {
          const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const mLabel = d.toLocaleDateString('en-US', {month: 'short'});
          buckets[`${mLabel} W${4-i}`] = 0; 
       }
    } else if (chartPeriod === 'Semi-Annually') {
       for(let i=5; i>=0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets[d.toLocaleDateString('en-US', {month: 'short'})] = 0;
       }
    } else { // Annually
       for(let i=11; i>=0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets[d.toLocaleDateString('en-US', {month: 'short'})] = 0;
       }
    }

    // Populate buckets
    Object.keys(dailyMap).forEach(dateStr => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        
        const kg = dailyMap[dateStr].grams / 1000;
        
        if (chartPeriod === 'Semi-Annually' || chartPeriod === 'Annually') {
            const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            const limit = chartPeriod === 'Semi-Annually' ? 6 : 12;
            if (monthsAgo >= 0 && monthsAgo < limit) {
                const monthLabel = d.toLocaleDateString('en-US', {month: 'short'});
                if (buckets[monthLabel] !== undefined) buckets[monthLabel] += kg;
            }
        } else {
            // monthly - group into weeks (7 days)
            const daysAgo = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
            if (daysAgo >= 0 && daysAgo < 28) {
                const weekIdx = 3 - Math.floor(daysAgo / 7); // 0 to 3 (0 is oldest, 3 is newest)
                const targetD = new Date(now.getTime() - (3 - weekIdx) * 7 * 24 * 60 * 60 * 1000);
                const mLabel = targetD.toLocaleDateString('en-US', {month: 'short'});
                const label = `${mLabel} W${weekIdx + 1}`;
                if (buckets[label] !== undefined) buckets[label] += kg;
            }
        }
    });

    return Object.keys(buckets).map(label => ({ label, kg: buckets[label] }));
  };

  const onExport = () => {
    const data = buildChartData();
    handleChartExport(data, chartPeriod, isExporting);
  };

  return (
    <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-5`}>
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`w-10 h-10 rounded-[14px] bg-emerald-50 dark:bg-slate-700 items-center justify-center`}>
            <MaterialCommunityIcons name="chart-bar" size={22} color="#166534" />
          </View>
          <View>
            <Text style={[tw`text-[15px] text-[#032514] dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Yield Performance</Text>
            <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 mt-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Total Harvest Volumes (kg)</Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity 
          style={tw`flex-row items-center gap-1.5 bg-[#f0fdf4] dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800`}
          onPress={onExport}
        >
          <MaterialCommunityIcons name="export-variant" size={12} color="#166534" />
          <Text style={[tw`text-[10px] text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Period Toggles */}
      <View style={tw`bg-gray-50 dark:bg-slate-700 rounded-full p-1 flex-row items-center border border-gray-100 dark:border-slate-600 mb-6 self-center`}>
         <TouchableOpacity 
            onPress={() => setChartPeriod('Monthly')}
            style={tw`${chartPeriod === 'Monthly' ? 'bg-[#166534] dark:bg-emerald-600' : 'bg-transparent'} rounded-full px-3 py-1.5`}
         >
            <Text style={[tw`text-[10px] ${chartPeriod === 'Monthly' ? 'text-white' : 'text-gray-500 dark:text-slate-300'}`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Monthly</Text>
         </TouchableOpacity>
         <TouchableOpacity 
            onPress={() => setChartPeriod('Semi-Annually')}
            style={tw`${chartPeriod === 'Semi-Annually' ? 'bg-[#166534] dark:bg-emerald-600' : 'bg-transparent'} rounded-full px-3 py-1.5`}
         >
            <Text style={[tw`text-[10px] ${chartPeriod === 'Semi-Annually' ? 'text-white' : 'text-gray-500 dark:text-slate-300'}`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Semi-Annually</Text>
         </TouchableOpacity>
         <TouchableOpacity 
            onPress={() => setChartPeriod('Annually')}
            style={tw`${chartPeriod === 'Annually' ? 'bg-[#166534] dark:bg-emerald-600' : 'bg-transparent'} rounded-full px-3 py-1.5`}
         >
            <Text style={[tw`text-[10px] ${chartPeriod === 'Annually' ? 'text-white' : 'text-gray-500 dark:text-slate-300'}`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Annually</Text>
         </TouchableOpacity>
      </View>

      {/* Dynamic Chart Area */}
      <View style={tw`h-48 mt-2 flex-row`}>
        {(() => {
          const chartData = buildChartData();
          if (chartData.length === 0 || chartData.every(d => d.kg === 0)) {
             return <View style={tw`flex-1 items-center justify-center`}><Text style={[tw`text-[11px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>No harvests recorded for this period</Text></View>;
          }
          const maxYield = Math.max(...chartData.map(d => d.kg), 0.1);
          const yAxisSteps = [maxYield, maxYield * 0.66, maxYield * 0.33, 0];

          return (
            <>
              {/* Y-Axis */}
              <View style={tw`justify-between items-end pr-3 py-2 w-10`}>
                {yAxisSteps.map((val, idx) => (
                  <Text key={idx} style={[tw`text-[9px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{val.toFixed(1)}</Text>
                ))}
              </View>
              
              {/* Chart Content */}
              <View style={tw`flex-1 relative`}>
                {/* Horizontal Grid Lines */}
                <View style={tw`absolute inset-0 justify-between py-2`}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={tw`w-full border-t border-gray-100 dark:border-slate-700`} />
                  ))}
                </View>

                {/* Bars */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  ref={chartScrollRef}
                  onLayout={() => setTimeout(() => chartScrollRef.current?.scrollToEnd({ animated: false }), 50)}
                  onContentSizeChange={() => setTimeout(() => chartScrollRef.current?.scrollToEnd({ animated: false }), 50)}
                  contentContainerStyle={[tw`flex-row items-end pt-2 pb-2 px-2`, { flexGrow: 1 }]}
                >
                  {chartData.map((data, idx) => {
                    const valKg = data.kg;
                    const heightPct = Math.max((valKg / maxYield) * 100, 0); 
                    
                    let containerStyle = 'w-10 mx-0.5'; // Annually
                    if (chartPeriod === 'Monthly') containerStyle = 'w-16 mx-2.5';
                    else if (chartPeriod === 'Semi-Annually') containerStyle = 'w-12 mx-1.5';
                    
                    return (
                      <View key={idx} style={tw`items-center ${containerStyle}`}>
                        {/* Value Label */}
                        <Text style={[tw`text-[8px] text-[#166534] dark:text-emerald-400 mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]} numberOfLines={1}>
                          {valKg > 0 ? valKg.toFixed(1) : ''}
                        </Text>
                        {/* Bar Wrapper */}
                        <View style={tw`h-[80%] justify-end w-full items-center`}>
                           <View style={[tw`w-5 bg-[#166534] dark:bg-emerald-500 rounded-t-md`, { height: `${heightPct}%`, minHeight: valKg > 0 ? 4 : 0 }]} />
                        </View>
                        {/* X-Axis Label */}
                        <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 mt-2 uppercase`, {fontFamily: 'PlusJakartaSans_700Bold'}]} numberOfLines={1}>
                           {data.label}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          );
        })()}
      </View>
    </View>
  );
});
