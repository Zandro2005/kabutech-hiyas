import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const sensors = useSensors();
  const settings = useSettings();

  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 0;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 0;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 0;
  const light = typeof sensors.light === 'number' ? sensors.light : 0;

  const targetTemp = settings?.setpoints?.temperature || 24;
  const targetHum = settings?.setpoints?.humidity || 70;
  const targetLight = settings?.setpoints?.light || 400;
  const targetCO2 = settings?.setpoints?.co2 || 800;

  // Overrides the system to manual mode and turns on the requested device
  const overrideDevice = async (deviceKey: string, actionName: string) => {
    try {
      // 1. Force the system to manual mode
      await update(ref(db, 'kabutech/settings/setpoints'), {
        mode: 'manual'
      });

      // 2. Turn on the specific device
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        [deviceKey]: true
      });

      showToast({
        type: 'success',
        text1: 'AI Override Executed',
        text2: `System set to manual. ${actionName} activated.`
      });
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Override Failed', text2: err.message });
    }
  };

return (
  <SafeAreaView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
    <ScrollView contentContainerStyle={tw`p-6 pt-2 pb-24`} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={tw`flex-row justify-between items-center mb-6 mt-4`}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-gray-100 mr-3`}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#64748b" />
        </TouchableOpacity>

        <View style={tw`flex-1 flex-row items-center gap-3`}>
          {/* Icon */}
          <View style={tw`w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center`}>
            <MaterialCommunityIcons name="chart-box" size={20} color="#3b82f6" />
          </View>

          {/* Texts */}
          <View style={tw`flex-1 justify-center`}>
            <Text style={tw`text-xl font-bold text-slate-800 dark:text-slate-100`}>Analytics Hub</Text>
            <Text style={tw`text-slate-500 dark:text-slate-400 text-xs mt-0.5`}>Track your farm's performance and insights</Text>
          </View>
        </View>
      </View>

      {/* AI System Status */}
      <View style={tw`bg-white dark:bg-slate-800 rounded-3xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm mb-6`}>
        <View style={tw`flex-row justify-between items-center mb-5`}>
          <View style={tw`flex-row items-center gap-2`}>
            <MaterialCommunityIcons name="chart-box-outline" size={18} color="#3b82f6" />
            <Text style={tw`text-sm font-bold text-slate-800 dark:text-slate-100`}>Environment Overview</Text>
          </View>
          <View style={tw`bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800 flex-row items-center gap-1`}>
            <View style={tw`w-1.5 h-1.5 rounded-full bg-blue-500`} />
            <Text style={tw`text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest`}>Live Data</Text>
          </View>
        </View>

        <View style={tw`flex-row flex-wrap justify-between gap-y-5`}>
          {/* Temp */}
          <View style={tw`w-[48%] bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-5 flex-col justify-between`}>
            <View style={tw`w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center mb-4`}>
              <MaterialCommunityIcons name="thermometer" size={20} color="#ef4444" />
            </View>
            <View>
              <Text style={tw`text-sm font-bold text-slate-800 dark:text-slate-100 mb-2`}>Temp Anomaly</Text>
              <Text style={tw`text-xs text-slate-500 dark:text-slate-400 leading-tight mb-5 text-justify`} numberOfLines={3}>Temp dropped to 21°C. Target is 24°C.</Text>
            </View>
            <TouchableOpacity
              onPress={() => overrideDevice('fans', 'Heating fans')}
              style={tw`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50 dark:active:bg-slate-700`}
            >
              <MaterialCommunityIcons name="fan" size={14} color={tw.color('dark:text-slate-400') || "#64748b"} />
              <Text style={tw`text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest`}>Run Fans</Text>
            </TouchableOpacity>
          </View>

          {/* Humid */}
          <View style={tw`w-[48%] bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-5 flex-col justify-between`}>
            <View style={tw`w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mb-4`}>
              <MaterialCommunityIcons name="water-percent" size={22} color="#3b82f6" />
            </View>
            <View>
              <Text style={tw`text-sm font-bold text-slate-800 dark:text-slate-100 mb-2`}>Dry Substrate</Text>
              <Text style={tw`text-xs text-slate-500 dark:text-slate-400 leading-tight mb-5 text-justify`} numberOfLines={3}>Low humidity detected. Misting required.</Text>
            </View>
            <TouchableOpacity
              onPress={() => overrideDevice('misters', 'Misters')}
              style={tw`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50 dark:active:bg-slate-700`}
            >
              <MaterialCommunityIcons name="water" size={14} color={tw.color('dark:text-slate-400') || "#64748b"} />
              <Text style={tw`text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest`}>Pulse</Text>
            </TouchableOpacity>
          </View>

          {/* Light */}
          <View style={tw`w-[48%] bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-5 flex-col justify-between`}>
            <View style={tw`w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 items-center justify-center mb-4`}>
              <MaterialCommunityIcons name="white-balance-sunny" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={tw`text-sm font-bold text-slate-800 dark:text-slate-100 mb-2`}>Light Cycle</Text>
              <Text style={tw`text-xs text-slate-500 dark:text-slate-400 leading-tight mb-5 text-justify`} numberOfLines={3}>Pinning detected. Increase light to 12h.</Text>
            </View>
            <TouchableOpacity
              onPress={() => overrideDevice('lights', 'Grow lights')}
              style={tw`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50 dark:active:bg-slate-700`}
            >
              <MaterialCommunityIcons name="lightbulb-on" size={14} color={tw.color('dark:text-slate-400') || "#64748b"} />
              <Text style={tw`text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest`}>Extend</Text>
            </TouchableOpacity>
          </View>

          {/* CO2 */}
          <View style={tw`w-[48%] bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-5 flex-col justify-between`}>
            <View style={tw`w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 items-center justify-center mb-4`}>
              <MaterialCommunityIcons name="molecule-co2" size={22} color="#8b5cf6" />
            </View>
            <View>
              <Text style={tw`text-sm font-bold text-slate-800 dark:text-slate-100 mb-2`}>CO2 Spike</Text>
              <Text style={tw`text-xs text-slate-500 dark:text-slate-400 leading-tight mb-5 text-justify`} numberOfLines={3}>CO2 near 1000ppm. Flush air needed.</Text>
            </View>
            <TouchableOpacity
              onPress={() => overrideDevice('co2', 'Ventilation system')}
              style={tw`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50 dark:active:bg-slate-700`}
            >
              <MaterialCommunityIcons name="air-filter" size={14} color={tw.color('dark:text-slate-400') || "#64748b"} />
              <Text style={tw`text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest`}>Flush</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    </ScrollView>
  </SafeAreaView>
);
}
