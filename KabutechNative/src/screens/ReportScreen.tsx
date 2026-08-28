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
import tw from 'twrnc';

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  // Overrides the system to manual mode and turns on the requested device
  const overrideDevice = (deviceKey: string, actionName: string) => {
    // 1. Force the system to manual mode
    update(ref(db, 'kabutech/settings/setpoints'), {
      mode: 'manual'
    });
    
    // 2. Turn on the specific device
    update(ref(db, `kabutech/settings/setpoints/devices`), {
      [deviceKey]: true
    }).then(() => {
      showToast({ 
        type: 'success', 
        text1: 'AI Override Executed', 
        text2: `System set to manual. ${actionName} activated.` 
      });
    }).catch((err) => {
      showToast({ type: 'error', text1: 'Override Failed', text2: err.message });
    });
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
              <Text style={tw`text-xl font-bold text-slate-800`}>Analytics Hub</Text>
              <Text style={tw`text-slate-500 text-xs mt-0.5`}>Track your farm's performance and insights</Text>
            </View>
          </View>
        </View>

        {/* AI System Status */}
        <View style={tw`bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-6`}>
          <View style={tw`flex-row justify-between items-center mb-5`}>
            <View style={tw`flex-row items-center gap-2`}>
              <MaterialCommunityIcons name="brain" size={18} color="#3b82f6" />
              <Text style={tw`text-sm font-bold text-slate-800`}>AI Predictive Models</Text>
            </View>
            <View style={tw`bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex-row items-center gap-1`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-blue-500`} />
              <Text style={tw`text-[9px] font-extrabold text-blue-600 uppercase tracking-widest`}>Active</Text>
            </View>
          </View>

          <View style={tw`flex-row flex-wrap justify-between gap-y-5`}>
            {/* Temp */}
            <View style={tw`w-[48%] bg-gray-50 border border-gray-100 rounded-2xl p-5 flex-col justify-between`}>
              <View style={tw`w-10 h-10 rounded-full bg-red-100 items-center justify-center mb-4`}>
                <MaterialCommunityIcons name="thermometer" size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={tw`text-sm font-bold text-slate-800 mb-2`}>Temp</Text>
                <Text style={tw`text-xs text-slate-500 leading-tight mb-5`} numberOfLines={3}>Peak 26°C at 2 PM. Cooling scheduled.</Text>
              </View>
              <TouchableOpacity 
                onPress={() => overrideDevice('fans', 'Cooling fans')}
                style={tw`bg-white border border-gray-200 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50`}
              >
                <MaterialCommunityIcons name="fan" size={14} color="#64748b" />
                <Text style={tw`text-[10px] font-bold text-slate-600 uppercase tracking-widest`}>Run Fans</Text>
              </TouchableOpacity>
            </View>

            {/* Humid */}
            <View style={tw`w-[48%] bg-gray-50 border border-gray-100 rounded-2xl p-5 flex-col justify-between`}>
              <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mb-4`}>
                <MaterialCommunityIcons name="water-percent" size={22} color="#3b82f6" />
              </View>
              <View>
                <Text style={tw`text-sm font-bold text-slate-800 mb-2`}>Humidity</Text>
                <Text style={tw`text-xs text-slate-500 leading-tight mb-5`} numberOfLines={3}>Stable 82%. Pulse expected next hour.</Text>
              </View>
              <TouchableOpacity 
                onPress={() => overrideDevice('misters', 'Misters')}
                style={tw`bg-white border border-gray-200 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50`}
              >
                <MaterialCommunityIcons name="water" size={14} color="#64748b" />
                <Text style={tw`text-[10px] font-bold text-slate-600 uppercase tracking-widest`}>Pulse</Text>
              </TouchableOpacity>
            </View>

            {/* Light */}
            <View style={tw`w-[48%] bg-gray-50 border border-gray-100 rounded-2xl p-5 flex-col justify-between`}>
              <View style={tw`w-10 h-10 rounded-full bg-amber-100 items-center justify-center mb-4`}>
                <MaterialCommunityIcons name="white-balance-sunny" size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={tw`text-sm font-bold text-slate-800 mb-2`}>Light</Text>
                <Text style={tw`text-xs text-slate-500 leading-tight mb-5`} numberOfLines={3}>Optimal lux levels for fruiting stage.</Text>
              </View>
              <TouchableOpacity 
                onPress={() => overrideDevice('lights', 'Grow lights')}
                style={tw`bg-white border border-gray-200 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50`}
              >
                <MaterialCommunityIcons name="lightbulb-on" size={14} color="#64748b" />
                <Text style={tw`text-[10px] font-bold text-slate-600 uppercase tracking-widest`}>Extend</Text>
              </TouchableOpacity>
            </View>

            {/* CO2 */}
            <View style={tw`w-[48%] bg-gray-50 border border-gray-100 rounded-2xl p-5 flex-col justify-between`}>
              <View style={tw`w-10 h-10 rounded-full bg-purple-100 items-center justify-center mb-4`}>
                <MaterialCommunityIcons name="molecule-co2" size={22} color="#8b5cf6" />
              </View>
              <View>
                <Text style={tw`text-sm font-bold text-slate-800 mb-2`}>CO2 Trend</Text>
                <Text style={tw`text-xs text-slate-500 leading-tight mb-5`} numberOfLines={3}>Accumulating (650ppm). Vents on standby.</Text>
              </View>
              <TouchableOpacity 
                onPress={() => overrideDevice('co2', 'Ventilation system')}
                style={tw`bg-white border border-gray-200 w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm active:bg-gray-50`}
              >
                <MaterialCommunityIcons name="air-filter" size={14} color="#64748b" />
                <Text style={tw`text-[10px] font-bold text-slate-600 uppercase tracking-widest`}>Flush</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
