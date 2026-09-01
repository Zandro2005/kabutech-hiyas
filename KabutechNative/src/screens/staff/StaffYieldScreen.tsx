import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../../tailwind';
import ScreenHeader from '../../components/ScreenHeader';
import { useBatches, useSettings } from '../../hooks/useFirebaseData';
import YieldChart from '../../components/yield/YieldChart';
import DailyHarvestList from '../../components/yield/DailyHarvestList';
import { getRackStats } from '../../utils/dataHelpers';
import { useTheme } from '../../context/ThemeContext';
import YieldScreenSkeleton from '../../components/skeletons/YieldScreenSkeleton';

export default function StaffYieldScreen() {
  const { isDarkMode } = useTheme();
  const [filterDays, setFilterDays] = useState<number | 'All'>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'Monthly' | 'Semi-Annually' | 'Annually'>('Monthly');
  const batches = useBatches();
  const settings = useSettings();

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Aggregate harvest data
  const { dailyMap, allRackNames, actualYieldKg, targetYieldKg, efficiency, sortedDates, dailyHarvestsList } = useMemo(() => {
    if (!isReady) {
      return { dailyMap: {}, allRackNames: new Set<string>(), actualYieldKg: '0.00', targetYieldKg: '0.00', efficiency: 0, sortedDates: [], dailyHarvestsList: [] };
    }
    let tGrams = 0;
    const dMap: Record<string, { count: number; grams: number; racks: Set<string>; rackYields: Record<string, number> }> = {};
    const aRackNames = new Set<string>();

    if (batches) {
      batches.forEach(rack => {
        const rackName = rack.rack || 'Unknown Rack';
        aRackNames.add(rackName);
        
        const { allHarvestLogs } = getRackStats(rack);
        
        allHarvestLogs.forEach(log => {
          tGrams += log.grams;
          if (log.date) {
            if (!dMap[log.date]) {
              dMap[log.date] = { count: 0, grams: 0, racks: new Set(), rackYields: {} };
            }
            dMap[log.date].count += 1;
            dMap[log.date].grams += log.grams;
            dMap[log.date].racks.add(rackName);
            dMap[log.date].rackYields[rackName] = (dMap[log.date].rackYields[rackName] || 0) + log.grams;
          }
        });
      });
    }

    const aYieldKg = (tGrams / 1000).toFixed(2);
    const tYieldKg = (settings?.yieldTarget || 5).toFixed(2);
    const eff = Math.min(100, Math.round((parseFloat(aYieldKg) / parseFloat(tYieldKg)) * 100)) || 0;

    // Format daily harvests for list
    const sDates = Object.keys(dMap).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const dHarvestsList = (filterDays === 'All' ? sDates : sDates.slice(0, filterDays))
      .map(dateStr => {
        const parts = dateStr.split('-');
        let formattedDate = dateStr;
        let month = '';
        let day = '';
        let year = '';
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          day = d.toLocaleDateString('en-US', { day: '2-digit' });
          year = d.toLocaleDateString('en-US', { year: 'numeric' });
        }
        const data = dMap[dateStr];
        const racksArr = Array.from(data.racks);
        return {
          date: formattedDate,
          month,
          day,
          year,
          desc: `${data.count} harvest${data.count > 1 ? 's' : ''} • ${racksArr.join(', ')}`,
          kg: `${Math.round(data.grams / 1000)} kg`,
          g: `${Math.round(data.grams)} g`
        };
      });

    return {
      dailyMap: dMap,
      allRackNames: aRackNames,
      actualYieldKg: aYieldKg,
      targetYieldKg: tYieldKg,
      efficiency: eff,
      sortedDates: sDates,
      dailyHarvestsList: dHarvestsList
    };
  }, [batches, settings?.yieldTarget, filterDays, isReady]);

  const isExporting = useRef(false);

  return (
    <View style={tw`flex-1 bg-[#f4f8f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader />

      {!isReady ? (
        <YieldScreenSkeleton />
      ) : (
      <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-36`} showsVerticalScrollIndicator={false}>

        {/* Page Title & Subtitle */}
        <View style={tw`mb-6`}>
          <Text style={[tw`text-[17px] text-gray-800 dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            Yield Overview
          </Text>
          <Text style={[tw`text-xs text-gray-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
            View harvest data and farm performance.
          </Text>
        </View>

        {/* WIDGET 1: Top Metrics */}
        <View style={tw`flex-row gap-3 mb-5`}>
          {/* Actual Yield Card */}
          <View style={tw`flex-1 bg-white dark:bg-slate-900 rounded-[26px] p-4 shadow-sm border border-slate-200/70 dark:border-slate-800 justify-between`}>
            <View style={tw`flex-row items-center gap-2 mb-2`}>
              <View style={tw`w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 items-center justify-center`}>
                <MaterialCommunityIcons name="sprout" size={15} color="#10b981" />
              </View>
              <Text numberOfLines={1} style={[tw`text-[11px] text-slate-500 dark:text-slate-400 tracking-wider uppercase flex-1`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Actual
              </Text>
            </View>
            
            <View style={tw`my-1`}>
              <View style={tw`flex-row items-baseline`}>
                <Text numberOfLines={1} style={[tw`text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {actualYieldKg}
                </Text>
                <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 ml-1 font-bold`]}>
                  kg
                </Text>
              </View>
            </View>

            <View style={tw`mt-1.5`}>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text numberOfLines={1} style={[tw`text-[9px] text-slate-400 uppercase tracking-wider flex-1 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Goal: {targetYieldKg}kg
                </Text>
                <Text numberOfLines={1} style={[tw`text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold shrink-0`]}>
                  {efficiency}%
                </Text>
              </View>
              <View style={tw`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden`}>
                <View style={[tw`h-full bg-emerald-500 rounded-full`, { width: `${Math.min(efficiency, 100)}%` }]} />
              </View>
            </View>
          </View>

          {/* Target Yield Card */}
          <View style={tw`flex-1 bg-white dark:bg-slate-900 rounded-[26px] p-3.5 sm:p-4 shadow-sm border border-slate-200/70 dark:border-slate-800 justify-between min-h-[140px]`}>
            <View style={tw`flex-row items-center gap-2 mb-1.5`}>
              <View style={tw`w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-500/15 items-center justify-center shrink-0`}>
                <MaterialCommunityIcons name="flag-checkered" size={15} color="#f59e0b" />
              </View>
              <Text numberOfLines={1} style={[tw`text-[11px] text-slate-500 dark:text-slate-400 tracking-wider uppercase flex-1`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Target
              </Text>
            </View>

            <View style={tw`my-1`}>
              <View style={tw`flex-row items-baseline`}>
                <Text numberOfLines={1} style={[tw`text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {targetYieldKg}
                </Text>
                <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 ml-1 font-bold`]}>
                  kg
                </Text>
              </View>
            </View>

            <View style={tw`mt-1.5`}>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text numberOfLines={1} style={[tw`text-[9px] text-slate-400 uppercase tracking-wider flex-1 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Capacity
                </Text>
                <Text numberOfLines={1} style={[tw`text-[9px] text-slate-500 font-bold shrink-0`]}>
                  Max: 5.0kg
                </Text>
              </View>
              <View style={tw`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden`}>
                <View style={[tw`h-full bg-amber-500 rounded-full`, { width: `${Math.min((parseFloat(targetYieldKg) / 5.0) * 100, 100)}%` }]} />
              </View>
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
      )}
    </View>
  );
}
