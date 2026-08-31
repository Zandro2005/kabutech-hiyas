import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';

interface Props {
  temp: number;
  hum: number;
  light: number;
  co2: number;
  navigation: any;
}

export default React.memo(function EnvironmentMetricsGrid({ temp, hum, light, co2, navigation }: Props) {
  const { isDarkMode } = useTheme();
  return (
    <View style={tw`px-6 pt-8`}>
      <View style={tw`flex-row justify-between items-end mb-4`}>
        <Text style={[tw`text-lg text-slate-800 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
          Environment Metrics
        </Text>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => navigation.navigate('Analytics' as never)}
          
        >
          <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
        {/* Temp Card */}
        <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
          <View style={tw`flex-row justify-between items-start mb-6`}>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Temperature</Text>
            <MaterialCommunityIcons name="thermometer" size={18} color="#ef4444" />
          </View>
          <View style={tw`flex-row items-baseline gap-1`}>
            <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{temp}</Text>
            <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>°C</Text>
          </View>
        </View>

        {/* Hum Card */}
        <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
          <View style={tw`flex-row justify-between items-start mb-6`}>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Humidity</Text>
            <MaterialCommunityIcons name="water-percent" size={20} color="#0ea5e9" />
          </View>
          <View style={tw`flex-row items-baseline gap-1`}>
            <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{hum}</Text>
            <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>%</Text>
          </View>
        </View>

        {/* Light Card */}
        <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
          <View style={tw`flex-row justify-between items-start mb-6`}>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Light Level</Text>
            <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#eab308" />
          </View>
          <View style={tw`flex-row items-baseline gap-1`}>
            <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{light}</Text>
            <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>lx</Text>
          </View>
        </View>

        {/* CO2 Card */}
        <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
          <View style={tw`flex-row justify-between items-start mb-6`}>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>CO2 Level</Text>
            <MaterialCommunityIcons name="molecule-co2" size={22} color="#a855f7" />
          </View>
          <View style={tw`flex-row items-baseline gap-1`}>
            <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{co2}</Text>
            <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>ppm</Text>
          </View>
        </View>
      </View>
    </View>
  );
});
