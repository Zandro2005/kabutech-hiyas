import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import tw from '../tailwind';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { useFirebaseData } from '../hooks/useFirebaseData';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { showToast } from '../components/CustomToast';

export default function YieldScreen() {
  const { isDarkMode } = useTheme();
  const [filterDays, setFilterDays] = useState<number | 'All'>(5);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'Monthly' | 'Semi-Annually' | 'Annually'>('Monthly');
  const { batches, settings } = useFirebaseData();

  // Aggregate harvest data
  const currentYear = new Date().getFullYear();
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

  const handleChartExport = async () => {
    if (isExporting.current) return;
    isExporting.current = true;
    try {
      const data = buildChartData();
      const aoaData: any[][] = [['Period', 'Total Yield (kg)']];
      data.forEach(d => {
        aoaData.push([d.label, parseFloat(d.kg.toFixed(2))]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      const colWidths = [{ wch: 15 }, { wch: 20 }];
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${chartPeriod} Yield`);
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = FileSystem.documentDirectory + `Kabutech_Yield_${chartPeriod}.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Export ${chartPeriod} Yield`
        });
      } else {
        showToast({ type: 'error', text1: 'Sharing Not Available', text2: 'Your device does not support sharing files.' });
      }
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', text1: 'Export Failed' });
    } finally {
      isExporting.current = false;
    }
  };

  const handleExport = async () => {
    if (isExporting.current) return;
    isExporting.current = true;
    try {
      const rackNamesArray = Array.from(allRackNames).sort();
      
      const aoaData = [];
      // Build header
      const headerRow = ['Date', 'Total Yield (kg)', 'Harvest Count', 'Avg Yield/Harvest (kg)'];
      rackNamesArray.forEach(rack => {
        headerRow.push(`[${rack}] Yield (kg)`);
      });
      headerRow.push('Total Yield (g)');
      aoaData.push(headerRow);

      // Build rows (export all data, not just filtered)
      sortedDates.forEach(dateStr => {
        const data = dailyMap[dateStr];
        const totalKg = parseFloat((data.grams / 1000).toFixed(2));
        const count = data.count;
        const avgYieldKg = count > 0 ? parseFloat((data.grams / 1000 / count).toFixed(3)) : 0;
        
        const formattedExportDate = dateStr;
        
        const rowData = [formattedExportDate, totalKg, count, avgYieldKg];
        
        rackNamesArray.forEach(rack => {
          const rackYg = data.rackYields[rack] || 0;
          rowData.push(parseFloat((rackYg / 1000).toFixed(2)));
        });
        
        rowData.push(data.grams);
        aoaData.push(rowData);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      
      // Auto-size columns based on header length
      const colWidths = headerRow.map(header => ({ wch: Math.max(header.length + 2, 12) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daily Harvests');
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const fileUri = FileSystem.documentDirectory + 'Kabutech_Daily_Report.xlsx';
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Daily Harvests',
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        showToast({ type: 'error', text1: 'Sharing Not Available', text2: 'Your device does not support sharing files.' });
      }
    } catch (error) {
      showToast({ type: 'error', text1: 'Export Failed', text2: 'An error occurred while exporting the data.' });
      console.error(error);
    } finally {
      isExporting.current = false;
    }
  };

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

        {/* WIDGET 2: Yield Performance Chart */}
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
              onPress={handleChartExport}
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

        {/* WIDGET 3: Daily Harvests */}
        <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700`}>
          <View style={tw`flex-row items-center justify-between mb-5`}>
            <View style={tw`flex-row items-center gap-1.5`}>
              <MaterialCommunityIcons name="calendar-blank" size={16} color={tw.color('dark:text-slate-100') || "#032514"} />
              <Text style={[tw`text-[11px] text-[#032514] dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>DAILY HARVESTS</Text>
            </View>
            
            <View style={tw`flex-row items-center gap-2 z-50 relative shrink-0`}>
              <View style={tw`relative`}>
                <TouchableOpacity 
                  onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                  style={tw`bg-[#f0fdf4] dark:bg-slate-700 px-2 py-1.5 rounded-lg flex-row items-center gap-1 border border-[#dcfce7] dark:border-slate-600`}
                >
                  <Text style={[tw`text-[10px] text-gray-800 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    {filterDays === 'All' ? 'All Time' : `Last ${filterDays} Days`}
                  </Text>
                  <MaterialCommunityIcons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={14} color={tw.color('dark:text-slate-400') || "#334155"} />
                </TouchableOpacity>
                
                {showFilterDropdown && (
                  <View style={tw`absolute top-8 right-0 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-xl w-32 z-50 overflow-hidden`}>
                    {[5, 10, 15, 30, 'All'].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={tw`px-3 py-2 border-b border-gray-50 dark:border-slate-700/50 ${filterDays === val ? 'bg-[#f0fdf4] dark:bg-slate-700' : ''}`}
                        onPress={() => {
                          setFilterDays(val as number | 'All');
                          setShowFilterDropdown(false);
                        }}
                      >
                        <Text style={[tw`text-xs text-gray-700 dark:text-slate-200`, {fontFamily: filterDays === val ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_400Regular'}]}>
                          {val === 'All' ? 'All Time' : `Last ${val} Days`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <TouchableOpacity onPress={handleExport} style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-2 py-1.5 rounded-lg flex-row items-center gap-1`}>
                <MaterialCommunityIcons name="download" size={12} color={tw.color('dark:text-emerald-400') || "#166534"} />
                <Text style={[tw`text-[10px] text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Export</Text>
              </TouchableOpacity>
            </View>
          </View>

          {dailyHarvestsList.length === 0 ? (
            <Text style={tw`text-center text-xs text-gray-400 italic py-4`}>No harvests recorded yet.</Text>
          ) : (
            <ScrollView style={tw`max-h-80 pr-1`} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {dailyHarvestsList.map((item, idx) => (
                <View key={idx} style={tw`flex-row justify-between items-center bg-[#f8fafc] dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600/50 rounded-[14px] p-4 mb-2`}>
                  <View style={tw`flex-1 pr-2`}>
                    <Text style={[tw`text-sm text-[#032514] dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{item.date}</Text>
                    <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]} numberOfLines={1}>{item.desc}</Text>
                  </View>
                  <View style={tw`items-end shrink-0`}>
                    <Text style={[tw`text-sm text-[#166534] dark:text-emerald-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{item.kg}</Text>
                    <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{item.g}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
