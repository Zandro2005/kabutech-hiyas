import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import tw from '../../tailwind';
import { handleExport } from '../../utils/yieldExport';
import { useTheme } from '../../context/ThemeContext';

interface DailyHarvestListProps {
  filterDays: number | 'All';
  setFilterDays: (days: number | 'All') => void;
  showFilterDropdown: boolean;
  setShowFilterDropdown: (show: boolean) => void;
  dailyHarvestsList: { date: string; month: string; day: string; year: string; desc: string; kg: string; g: string }[];
  sortedDates: string[];
  dailyMap: any;
  allRackNames: Set<string>;
  isExporting: React.MutableRefObject<boolean>;
}

export default React.memo(function DailyHarvestList({
  filterDays,
  setFilterDays,
  showFilterDropdown,
  setShowFilterDropdown,
  dailyHarvestsList,
  sortedDates,
  dailyMap,
  allRackNames,
  isExporting
}: DailyHarvestListProps) {
  
  const { isDarkMode } = useTheme();

  // Default selected date to today, formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const onExport = () => {
    handleExport(sortedDates, dailyMap, allRackNames, isExporting);
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    
    // Mark dates that have harvests
    sortedDates.forEach(dateStr => {
      marked[dateStr] = {
        marked: true,
        dotColor: tw.color('emerald-500') || '#10b981',
      };
    });
    
    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: tw.color('emerald-600') || '#059669',
        selectedTextColor: '#ffffff'
      };
    }
    
    return marked;
  }, [sortedDates, selectedDate]);

  // Find the harvest details for the selected date
  const selectedHarvests = useMemo(() => {
    if (!selectedDate || !dailyMap[selectedDate]) return [];
    
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return [];
    
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    const year = d.toLocaleDateString('en-US', { year: 'numeric' });
    
    const data = dailyMap[selectedDate];
    const rackYields = data.rackYields;
    
    return Object.entries(rackYields).map(([rackName, grams]) => {
      const totalGrams = Math.round(grams as number);
      const weightDisplay = totalGrams >= 1000 ? `${Math.round(totalGrams / 1000)} kg` : `${totalGrams} g`;

      return {
        id: rackName,
        month,
        day,
        year,
        desc: rackName,
        weight: weightDisplay
      };
    });
  }, [selectedDate, dailyMap]);

  return (
    <View style={tw`bg-white dark:bg-slate-800 rounded-[20px] p-3 shadow-sm border border-gray-100 dark:border-slate-700 mb-4`}>
      {/* Header Row */}
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <View style={tw`flex-row items-center gap-2`}>
          <MaterialCommunityIcons name="calendar-blank" size={16} color={tw.color('dark:text-slate-100') || "#032514"} />
          <Text style={[tw`text-[12px] text-[#032514] dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>HARVEST CALENDAR</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={onExport} style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-2 py-1.5 rounded-lg flex-row items-center gap-1`}>
          <MaterialCommunityIcons name="download" size={12} color={tw.color('dark:text-emerald-400') || "#166534"} />
          <Text style={[tw`text-[10px] text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={tw`border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden mb-3 bg-white dark:bg-slate-800`}>
        <View style={{ transform: [{ scale: 0.92 }], marginTop: -12, marginBottom: -12, marginHorizontal: -12 }}>
          <Calendar
          key={isDarkMode ? 'dark' : 'light'}
          current={today}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: isDarkMode ? tw.color('slate-800') : tw.color('white'),
            calendarBackground: isDarkMode ? tw.color('slate-800') : tw.color('white'),
            textSectionTitleColor: isDarkMode ? tw.color('slate-400') : tw.color('slate-500'),
            selectedDayBackgroundColor: tw.color('emerald-600'),
            selectedDayTextColor: '#ffffff',
            todayTextColor: tw.color('emerald-600'),
            dayTextColor: isDarkMode ? tw.color('slate-200') : tw.color('slate-700'),
            textDisabledColor: isDarkMode ? tw.color('slate-600') : tw.color('slate-300'),
            dotColor: tw.color('emerald-500'),
            selectedDotColor: '#ffffff',
            arrowColor: tw.color('emerald-600'),
            monthTextColor: isDarkMode ? tw.color('slate-100') : tw.color('slate-800'),
            textDayFontFamily: 'PlusJakartaSans_700Bold',
            textMonthFontFamily: 'PlusJakartaSans_800ExtraBold',
            textDayHeaderFontFamily: 'PlusJakartaSans_800ExtraBold',
            textDayFontSize: 12,
            textMonthFontSize: 13,
            textDayHeaderFontSize: 10
          }}
        />
        </View>
      </View>

      <Text style={[tw`text-[11px] text-[#032514] dark:text-slate-400 tracking-wide mb-3 px-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>HARVEST DETAILS</Text>

      {selectedHarvests.length > 0 ? (
        selectedHarvests.map((harvest, index) => (
          <View key={harvest.id} style={tw`flex-row justify-between items-center bg-[#f0fdf4] dark:bg-slate-700/50 border border-emerald-100 dark:border-slate-600 rounded-[12px] p-2.5 shadow-sm mb-2`}>
            
            <View style={tw`w-12 bg-white dark:bg-slate-800 rounded-[8px] border border-emerald-100 dark:border-slate-600 items-center justify-center py-1 shadow-sm`}>
              <Text style={[tw`text-[8px] text-[#166534] dark:text-emerald-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{harvest.month}</Text>
              <Text style={[tw`text-base text-slate-800 dark:text-slate-100 leading-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{harvest.day}</Text>
            </View>

            <View style={tw`flex-1 px-3`}>
              <Text style={[tw`text-[13px] text-[#032514] dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{harvest.year}</Text>
              <Text style={[tw`text-[11px] text-emerald-700 dark:text-emerald-400/80`, {fontFamily: 'PlusJakartaSans_700Bold'}]} numberOfLines={1}>{harvest.desc}</Text>
            </View>
            
            <View style={tw`items-end shrink-0 justify-center`}>
              <Text style={[tw`text-base text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{harvest.weight}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={tw`bg-[#f8fafc] dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-[16px] p-6 items-center justify-center`}>
          <MaterialCommunityIcons name="leaf-off" size={24} color={tw.color('slate-300')} style={tw`mb-2`} />
          <Text style={[tw`text-xs text-gray-400 dark:text-slate-500`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>No harvests recorded for this date.</Text>
        </View>
      )}

    </View>
  );
});
