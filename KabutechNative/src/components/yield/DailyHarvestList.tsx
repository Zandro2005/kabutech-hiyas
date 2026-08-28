import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../../tailwind';
import { handleExport } from '../../utils/yieldExport';

interface DailyHarvestListProps {
  filterDays: number | 'All';
  setFilterDays: (days: number | 'All') => void;
  showFilterDropdown: boolean;
  setShowFilterDropdown: (show: boolean) => void;
  dailyHarvestsList: { date: string; desc: string; kg: string; g: string }[];
  sortedDates: string[];
  dailyMap: any;
  allRackNames: Set<string>;
  isExporting: React.MutableRefObject<boolean>;
}

export default function DailyHarvestList({
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

  const onExport = () => {
    handleExport(sortedDates, dailyMap, allRackNames, isExporting);
  };

  return (
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
          
          <TouchableOpacity onPress={onExport} style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-2 py-1.5 rounded-lg flex-row items-center gap-1`}>
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
  );
}
