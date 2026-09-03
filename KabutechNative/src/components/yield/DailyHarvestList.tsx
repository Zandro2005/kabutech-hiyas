import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import tw from '../../tailwind';
import { handleExport } from '../../utils/yieldExport';
import { useTheme } from '../../context/ThemeContext';
import { hapticLight, hapticSelection } from '../../utils/haptics';

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

  // Default selected date to latest harvest date or today (YYYY-MM-DD in local time)
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const initialDate = sortedDates.length > 0 ? sortedDates[0] : today;
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const onExport = () => {
    hapticSelection();
    handleExport(sortedDates, dailyMap, allRackNames, isExporting);
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    
    // Mark dates that have harvests
    sortedDates.forEach(dateStr => {
      marked[dateStr] = {
        marked: true,
        dotColor: '#10b981',
      };
    });
    
    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#10b981',
        selectedTextColor: '#ffffff'
      };
    }
    
    return marked;
  }, [sortedDates, selectedDate]);

  // Formatted date string for selected date (e.g. "Oct 24, 2026")
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return selectedDate;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // Find the harvest details for the selected date
  const { selectedHarvests, dayTotalGrams } = useMemo(() => {
    if (!selectedDate || !dailyMap[selectedDate]) {
      return { selectedHarvests: [], dayTotalGrams: 0 };
    }
    
    const parts = selectedDate.split('-');
    if (parts.length !== 3) return { selectedHarvests: [], dayTotalGrams: 0 };
    
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    const year = d.toLocaleDateString('en-US', { year: 'numeric' });
    
    const data = dailyMap[selectedDate];
    const rackYields = data.rackYields || {};
    let totalG = 0;
    
    const list = Object.entries(rackYields).map(([rackName, grams]) => {
      const gVal = Math.round(grams as number);
      totalG += gVal;
      const weightDisplay = gVal >= 1000 ? `${(gVal / 1000).toFixed(2)} kg` : `${gVal} g`;

      return {
        id: rackName,
        month,
        day,
        year,
        rackName,
        weight: weightDisplay,
        grams: gVal
      };
    });

    return { selectedHarvests: list, dayTotalGrams: totalG };
  }, [selectedDate, dailyMap]);

  return (
    <View style={tw`bg-white dark:bg-slate-900 rounded-[28px] p-5 shadow-sm border border-slate-200/70 dark:border-slate-800 mb-6`}>
      
      {/* Header Row */}
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
          <View style={tw`w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/30 items-center justify-center shrink-0`}>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#10b981" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[15px] text-slate-900 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
              Harvest Calendar
            </Text>
            <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]} numberOfLines={1}>
              {sortedDates.length} recorded day{sortedDates.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={tw`flex-row items-center gap-1.5 shrink-0`}>
          {/* Quick jump to Today */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.75}
            onPress={() => {
              hapticLight();
              setSelectedDate(today);
            }}
            style={tw`bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700`}
          >
            <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Today
            </Text>
          </TouchableOpacity>

          {/* Export Report Pill */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.75}
            onPress={onExport} 
            style={tw`bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700 flex-row items-center gap-1`}
          >
            <MaterialCommunityIcons name="export-variant" size={11} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Export
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Card Container */}
      <View style={tw`border border-slate-100 dark:border-slate-800/90 rounded-2xl overflow-hidden mb-4 bg-slate-50/60 dark:bg-slate-800/40 p-1`}>
        <Calendar
          key={isDarkMode ? 'dark-cal' : 'light-cal'}
          current={selectedDate || today}
          hideExtraDays={true}
          enableSwipeMonths={true}
          onDayPress={(day: any) => {
            hapticLight();
            setSelectedDate(day.dateString);
          }}
          markedDates={markedDates}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: isDarkMode ? '#64748b' : '#94a3b8',
            selectedDayBackgroundColor: '#10b981',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#10b981',
            dayTextColor: isDarkMode ? '#f1f5f9' : '#1e293b',
            textDisabledColor: 'transparent',
            dotColor: '#10b981',
            selectedDotColor: '#ffffff',
            arrowColor: '#10b981',
            monthTextColor: isDarkMode ? '#ffffff' : '#0f172a',
            textDayFontFamily: 'PlusJakartaSans_700Bold',
            textMonthFontFamily: 'PlusJakartaSans_800ExtraBold',
            textDayHeaderFontFamily: 'PlusJakartaSans_800ExtraBold',
            textDayFontSize: 11.5,
            textMonthFontSize: 12.5,
            textDayHeaderFontSize: 9.5,
            'stylesheet.calendar.header': {
              header: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingLeft: 8,
                paddingRight: 8,
                marginTop: 2,
                marginBottom: 4,
                alignItems: 'center'
              },
              monthText: {
                fontSize: 12.5,
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                color: isDarkMode ? '#ffffff' : '#0f172a'
              },
              arrow: {
                padding: 4
              }
            }
          } as any}
        />
      </View>

      {/* Selected Date Header & Telemetry */}
      <View style={tw`flex-row items-center justify-between mb-3 px-1 pt-1`}>
        <View style={tw`flex-row items-center gap-1.5 flex-1 mr-2`}>
          <View style={tw`w-2 h-2 rounded-full bg-emerald-500 shrink-0`} />
          <Text numberOfLines={1} style={[tw`text-[12px] text-slate-800 dark:text-slate-200 tracking-wide uppercase`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {selectedDateFormatted}
          </Text>
        </View>

        {selectedHarvests.length > 0 && (
          <View style={tw`bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/30 px-2 py-0.5 rounded-full flex-row items-center gap-1 shrink-0`}>
            <Text style={[tw`text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold`]}>
              {selectedHarvests.length} Rack{selectedHarvests.length !== 1 ? 's' : ''} • {dayTotalGrams >= 1000 ? `${(dayTotalGrams / 1000).toFixed(2)} kg` : `${dayTotalGrams} g`}
            </Text>
          </View>
        )}
      </View>

      {/* Harvest Breakdown Items */}
      {selectedHarvests.length > 0 ? (
        <View style={tw`gap-2`}>
          {selectedHarvests.map((harvest) => (
            <View 
              key={harvest.id} 
              style={tw`flex-row justify-between items-center bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 rounded-2xl p-3 shadow-sm`}
            >
              {/* Rack Icon & Info */}
              <View style={tw`flex-row items-center gap-3 flex-1`}>
                <View style={tw`w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 items-center justify-center border border-emerald-200/50 dark:border-emerald-500/20`}>
                  <MaterialCommunityIcons name="sprout-outline" size={18} color="#10b981" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[13px] text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
                    {harvest.rackName}
                  </Text>
                  <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                    Harvest Log Completed
                  </Text>
                </View>
              </View>
              
              {/* Weight Tag */}
              <View style={tw`bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl items-end justify-center`}>
                <Text style={[tw`text-[13px] text-emerald-600 dark:text-emerald-400 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {harvest.weight}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={tw`bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl py-6 px-4 items-center justify-center`}>
          <MaterialCommunityIcons name="calendar-search" size={26} color={isDarkMode ? '#475569' : '#cbd5e1'} style={tw`mb-1.5`} />
          <Text style={[tw`text-[12px] text-slate-400 dark:text-slate-500 text-center`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            No harvests recorded for this date
          </Text>
          <Text style={[tw`text-[10px] text-slate-400/80 dark:text-slate-600 mt-0.5 text-center`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
            Dates with a green dot (●) have harvest logs
          </Text>
        </View>
      )}

    </View>
  );
});
