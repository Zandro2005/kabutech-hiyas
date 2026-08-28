import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import ScreenHeader from '../components/ScreenHeader';
import { useFirebaseData } from '../hooks/useFirebaseData';
import YieldChart from '../components/yield/YieldChart';
import DailyHarvestList from '../components/yield/DailyHarvestList';

export default function YieldScreen() {
  const [filterDays, setFilterDays] = useState<number | 'All'>(5);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'Monthly' | 'Semi-Annually' | 'Annually'>('Monthly');
  const { batches, settings } = useFirebaseData();

  // Aggregate harvest data
  let totalHarvestGrams = 0;
  let dailyMap: Record<string, { count: number; grams: number; racks: Set<string>; rackYields: Record<string, number> }> = {};
  const allRackNames = new Set<string>();

  if (batches) {
    batches.forEach(rack => {
      const rackName = rack.rack || 'Unknown Rack';
      allRackNames.add(rackName);
      if (rack.bags) {
        Object.values(rack.bags).filter((b: any) => b != null).forEach((bag: any) => {
          if (bag.harvestLog) {
            Object.values(bag.harvestLog).filter((l: any) => l != null).forEach((log: any) => {
              if (log.grams) {
                totalHarvestGrams += log.grams;
                
                // Track daily
                if (log.date) {
                  if (!dailyMap[log.date]) {
                    dailyMap[log.date] = { count: 0, grams: 0, racks: new Set(), rackYields: {} };
                  }
                  dailyMap[log.date].count += 1;
                  dailyMap[log.date].grams += log.grams;
                  dailyMap[log.date].racks.add(rackName);
                  dailyMap[log.date].rackYields[rackName] = (dailyMap[log.date].rackYields[rackName] || 0) + log.grams;
                }
              }
            });
          }
        });
      }
      if (rack.historicalHarvests) {
        Object.values(rack.historicalHarvests).filter((l: any) => l != null).forEach((log: any) => {
          if (log.grams) {
            totalHarvestGrams += log.grams;
            if (log.date) {
              if (!dailyMap[log.date]) {
                dailyMap[log.date] = { count: 0, grams: 0, racks: new Set(), rackYields: {} };
              }
              dailyMap[log.date].count += 1;
              dailyMap[log.date].grams += log.grams;
              dailyMap[log.date].racks.add(rackName);
              dailyMap[log.date].rackYields[rackName] = (dailyMap[log.date].rackYields[rackName] || 0) + log.grams;
            }
          }
        });
      }
    });
  }

  const actualYieldKg = (totalHarvestGrams / 1000).toFixed(2);
  const targetYieldKg = (settings?.yieldTarget || 5.00).toFixed(2);
  const efficiency = Math.min(100, Math.round((parseFloat(actualYieldKg) / parseFloat(targetYieldKg)) * 100)) || 0;

  // Format daily harvests for list
  const sortedDates = Object.keys(dailyMap).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const dailyHarvestsList = (filterDays === 'All' ? sortedDates : sortedDates.slice(0, filterDays))
    .map(dateStr => {
      const parts = dateStr.split('-');
      let formattedDate = dateStr;
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const data = dailyMap[dateStr];
      const racksArr = Array.from(data.racks);
      return {
        date: formattedDate,
        desc: `${data.count} harvest${data.count > 1 ? 's' : ''} • ${racksArr.join(', ')}`,
        kg: `${(data.grams / 1000).toFixed(2)} kg`,
        g: `${data.grams}G`
      };
    });

  const isExporting = useRef(false);

  return (
    <View style={tw`flex-1 bg-[#f4f8f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader />
      <ScrollView contentContainerStyle={tw`p-5 pb-24`} showsVerticalScrollIndicator={false}>

        {/* Page Title & Subtitle */}
        <View style={tw`mb-6`}>
          <Text style={[tw`text-[17px] text-gray-800 dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            Yield Analytics
          </Text>
          <Text style={[tw`text-xs text-gray-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
            Harvest data per rack, tracked and compared over time.
          </Text>
        </View>

        {/* WIDGET 1: Top Metrics */}
        <View style={tw`flex-row gap-3 mb-5`}>
          {/* Actual Yield */}
          <View style={tw`flex-1 bg-white dark:bg-slate-800 rounded-[24px] p-4 shadow-sm border border-gray-100 dark:border-slate-700`}>
            <View style={tw`flex-row justify-between items-center mb-3 flex-wrap gap-1`}>
              <View style={tw`flex-row items-center gap-1`}>
                <MaterialCommunityIcons name="bottle-tonic-outline" size={16} color="#166534" />
                <Text style={[tw`text-[10px] text-gray-800 dark:text-slate-200 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Actual Yield</Text>
              </View>
              <View style={tw`bg-[#f0fdf4] dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full flex-row items-center gap-0.5 border border-[#dcfce7] dark:border-emerald-800`}>
                <MaterialCommunityIcons name="trending-up" size={10} color="#166534" />
                <Text style={[tw`text-[8px] text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>+5% vs Avg</Text>
              </View>
            </View>
            
            <View style={tw`flex-row items-baseline mb-3`}>
              <Text style={[tw`text-4xl text-[#032514] dark:text-emerald-400 tracking-tighter leading-none`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{actualYieldKg}<Text style={tw`text-base`}>kg</Text></Text>
            </View>

            <View style={tw`w-full h-1.5 bg-[#e2e8f0] dark:bg-slate-700 rounded-full overflow-hidden mb-2`}>
              <View style={[tw`h-full bg-[#166534] dark:bg-emerald-500 rounded-full`, { width: `${efficiency}%` }]} />
            </View>
            <View style={tw`flex-row justify-between mt-1 flex-wrap gap-1`}>
              <Text style={[tw`text-[7.5px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>TARGET: {targetYieldKg} KG</Text>
              <Text style={[tw`text-[7.5px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>MAX: 3.0 KG</Text>
            </View>
          </View>

          {/* Target */}
          <View style={tw`flex-1 bg-white dark:bg-slate-800 rounded-[24px] p-4 shadow-sm border border-gray-100 dark:border-slate-700`}>
            <View style={tw`flex-row justify-between items-center mb-3 flex-wrap gap-1`}>
              <View style={tw`flex-row items-center gap-1`}>
                <MaterialCommunityIcons name="flag-outline" size={14} color="#166534" />
                <Text style={[tw`text-[10px] text-gray-800 dark:text-slate-200 tracking-wide uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>TARGET</Text>
              </View>
              <TouchableOpacity style={tw`bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full flex-row items-center gap-1`}>
                <MaterialCommunityIcons name="pencil" size={10} color={tw.color('dark:text-slate-300') || "#334155"} />
                <Text style={[tw`text-[8px] text-gray-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`flex-1 flex-row items-center justify-center mb-3`}>
              <Text style={[tw`text-4xl text-[#032514] dark:text-emerald-400 tracking-tighter leading-none text-center`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{targetYieldKg}<Text style={tw`text-base`}>kg</Text></Text>
            </View>

            <View style={tw`flex-row justify-between items-end mb-1 mt-auto`}>
              <Text style={[tw`text-[8px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>EFFICIENCY</Text>
              <Text style={[tw`text-[9px] text-[#eab308]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{efficiency}%</Text>
            </View>
            <View style={tw`w-full h-1.5 bg-[#fef08a] dark:bg-yellow-900/50 rounded-full overflow-hidden`}>
              <View style={[tw`h-full bg-[#166534] dark:bg-yellow-500 rounded-full`, { width: `${efficiency}%` }]} />
            </View>
          </View>
        </View>

        <YieldChart 
          dailyMap={dailyMap}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          isExporting={isExporting}
        />

        <DailyHarvestList
          filterDays={filterDays}
          setFilterDays={setFilterDays}
          showFilterDropdown={showFilterDropdown}
          setShowFilterDropdown={setShowFilterDropdown}
          dailyHarvestsList={dailyHarvestsList}
          sortedDates={sortedDates}
          dailyMap={dailyMap}
          allRackNames={allRackNames}
          isExporting={isExporting}
        />

      </ScrollView>
    </View>
  );
}
