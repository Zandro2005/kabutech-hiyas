import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, Alert, Vibration } from 'react-native';
import { SoundManager } from '../utils/SoundManager';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { DeviceEventEmitter } from 'react-native';

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();

  // Overrides the system to manual mode and turns on the requested device
  const overrideDevice = async (deviceKey: string, actionName: string, durationMs: number) => {
    try {
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });
      await update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: true });

      showToast({
        type: 'success',
        text1: 'AI Override Executed',
        text2: `System set to manual. ${actionName} activated.`
      });

      // Schedule revert
      setTimeout(async () => {
        try {
          await update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: false });
          await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

          // Start the nonstop alarm and vibration loop
          const alarmPattern = [0, 500, 200, 500];
          Vibration.vibrate(alarmPattern, true); // true means loop endlessly
          SoundManager.playAlarm();

          DeviceEventEmitter.emit('showAlarmModal', {
            title: "AI Action Complete",
            message: `${actionName} finished successfully. The system has returned to AUTO mode.`
          });

          showToast({ type: 'success', text1: 'AI Cycle Complete', text2: `${actionName} finished. Returned to AUTO.` });
        } catch (e) {}
      }, durationMs);
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Override Failed', text2: err.message });
    }
  };

  const handleAutoFix = async () => {
    try {
      // Set to manual to allow pre-emptive AI overrides instead of reactive auto
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });
      
      // Activate specific devices pre-emptively based on the AI recommendations
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        fans: true,
        misters: true,
        co2: true
      });

      showToast({
        type: 'success',
        text1: 'AI Overrides Applied',
        text2: 'Misting (10s), Cooling & Vent (30s) active.'
      });

      // Time the misting duration (10 seconds)
      setTimeout(async () => {
        try {
          await update(ref(db, `kabutech/settings/setpoints/devices`), { misters: false });
          SoundManager.playRing();
          showToast({ type: 'info', text1: 'AI Task Complete', text2: 'Pulse misting finished.' });
        } catch (e) {}
      }, 10000); // 10 seconds

      // Time the cooling and ventilation duration (30 seconds for testing)
      setTimeout(async () => {
        try {
          await update(ref(db, `kabutech/settings/setpoints/devices`), { fans: false, co2: false });
          await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

          // Start the nonstop alarm and vibration loop
          const alarmPattern = [0, 500, 200, 500];
          Vibration.vibrate(alarmPattern, true); // true means loop endlessly
          SoundManager.playAlarm();

          DeviceEventEmitter.emit('showAlarmModal', {
            title: "AI Cycle Complete!",
            message: "Optimal conditions have been successfully restored. The system has returned to AUTO mode."
          });

          showToast({ type: 'success', text1: 'AI Cycle Complete', text2: 'Optimal conditions met. Returned to AUTO.' });
        } catch (e) {}
      }, 30000); // 30 seconds for testing

    } catch (err: any) {
      showToast({ type: 'error', text1: 'AI Action Failed', text2: err.message });
    }
  };

  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  const handleSuggestions = () => {
    setShowSuggestionsModal(true);
  };

  return (
    <View style={tw`flex-1 bg-[#f4f7fa] dark:bg-[#020617]`}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView contentContainerStyle={[tw`px-5 pb-32`, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={tw`flex-row items-center mb-6`}>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 items-center justify-center mr-2`}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={tw.color('dark:text-white') || "#1e293b"} />
          </TouchableOpacity>
          <Text style={[tw`text-[19px] text-slate-800 dark:text-white tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Prediction Hub</Text>
        </View>

        {/* Top Main Card (Blue Gradient Style) */}
        <View style={tw`bg-[#3b82f6] rounded-[32px] p-6 mb-5 items-center shadow-md overflow-hidden relative`}>
          {/* Decorative shapes */}
          <View style={tw`absolute -top-12 -left-10 w-32 h-32 rounded-full bg-white/10`} />
          <View style={tw`absolute -bottom-16 -right-10 w-40 h-40 rounded-full bg-black/10`} />

          <Text style={[tw`text-blue-100 text-xs mb-1 tracking-wider uppercase`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Critical Forecast</Text>
          <Text style={[tw`text-white text-3xl mb-6`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>26.5°C Peak</Text>
          
          <View style={tw`flex-row justify-between w-full mb-5 px-2`}>
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Target</Text>
              <Text style={[tw`text-white text-xl`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>24.0°C</Text>
            </View>
            <View style={tw`w-[1px] h-full bg-blue-400/50`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Variance</Text>
              <Text style={[tw`text-white text-xl`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>+2.5°C</Text>
            </View>
            <View style={tw`w-[1px] h-full bg-blue-400/50`} />
            <View style={tw`items-center flex-1`}>
              <Text style={[tw`text-blue-200 text-[11px] mb-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>ETA</Text>
              <Text style={[tw`text-white text-xl`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>in 2 hrs</Text>
            </View>
          </View>

          <View style={tw`bg-[#10b981] px-4 py-1.5 rounded-full shadow-sm`}>
            <Text style={[tw`text-white text-xs tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Model Active</Text>
          </View>
        </View>

        {/* Two Side-by-Side Cards */}
        <View style={tw`flex-row justify-between mb-6`}>
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <MaterialCommunityIcons name="brain" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Confidence:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>94</Text>
              <Text style={[tw`text-[13px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>%</Text>
            </View>
          </View>

          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50`}>
            <View style={tw`flex-row items-center gap-1.5 mb-2`}>
              <MaterialCommunityIcons name="update" size={16} color="#3b82f6" />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Next Scan:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>10</Text>
              <Text style={[tw`text-[13px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>min</Text>
            </View>
          </View>
        </View>

        {/* Temp Timeline */}
        <Text style={[tw`text-[17px] text-slate-800 dark:text-white mb-4 pl-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Temperature Trend</Text>
        <View style={tw`bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex-row justify-between mb-8`}>
          <View style={tw`items-center`}>
            <View style={tw`w-[50px] h-[50px] rounded-full bg-slate-50 dark:bg-slate-700/50 items-center justify-center mb-2`}>
              <Text style={[tw`text-sm text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>24°</Text>
            </View>
            <Text style={[tw`text-[10px] text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Now</Text>
          </View>
          <View style={tw`items-center`}>
            <View style={tw`w-[50px] h-[50px] rounded-full bg-slate-50 dark:bg-slate-700/50 items-center justify-center mb-2`}>
              <Text style={[tw`text-sm text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>25°</Text>
            </View>
            <Text style={[tw`text-[10px] text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>+1 hr</Text>
          </View>
          <View style={tw`items-center`}>
            <View style={tw`w-[54px] h-[54px] rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 items-center justify-center mb-1 -mt-1 shadow-sm`}>
              <Text style={[tw`text-base text-red-600 dark:text-red-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>26°</Text>
            </View>
            <Text style={[tw`text-[11px] text-slate-800 dark:text-red-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>+2 hr</Text>
          </View>
          <View style={tw`items-center`}>
            <View style={tw`w-[50px] h-[50px] rounded-full bg-slate-50 dark:bg-slate-700/50 items-center justify-center mb-2`}>
              <Text style={[tw`text-sm text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>24°</Text>
            </View>
            <Text style={[tw`text-[10px] text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>+3 hr</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <Text style={[tw`text-[17px] text-slate-800 dark:text-white mb-4 pl-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Future Sensor Values (2h)</Text>
        <View style={tw`flex-row flex-wrap justify-between`}>
          
          {/* Temp */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="thermometer" size={16} color="#ef4444" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted Temp:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>26.5</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>°C</Text>
            </View>
            <TouchableOpacity onPress={() => overrideDevice('fans', 'Cooling fans', 300000)} style={tw`bg-blue-50 dark:bg-blue-500/10 py-2.5 rounded-[16px] items-center active:scale-95`}>
              <Text style={[tw`text-[11px] text-blue-600 dark:text-blue-400 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pre-Cool</Text>
            </TouchableOpacity>
          </View>

          {/* Humid */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="water-percent" size={18} color="#3b82f6" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted Hum:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>60</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>%</Text>
            </View>
            <TouchableOpacity onPress={() => overrideDevice('misters', 'Misters', 10000)} style={tw`bg-emerald-50 dark:bg-emerald-500/10 py-2.5 rounded-[16px] items-center active:scale-95`}>
              <Text style={[tw`text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pre-Mist</Text>
            </TouchableOpacity>
          </View>

          {/* Light */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#f59e0b" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted Lux:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>400</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>lux</Text>
            </View>
            <TouchableOpacity onPress={() => overrideDevice('lights', 'Grow lights', 60000)} style={tw`bg-amber-50 dark:bg-amber-500/10 py-2.5 rounded-[16px] items-center active:scale-95`}>
              <Text style={[tw`text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* CO2 */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="molecule-co2" size={16} color="#8b5cf6" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted CO2:</Text>
            </View>
            <View style={tw`flex-row items-baseline gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>980</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>ppm</Text>
            </View>
            <TouchableOpacity onPress={() => overrideDevice('co2', 'Ventilation system', 300000)} style={tw`bg-purple-50 dark:bg-purple-500/10 py-2.5 rounded-[16px] items-center active:scale-95`}>
              <Text style={[tw`text-[11px] text-purple-600 dark:text-purple-400 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pre-Vent</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={tw`absolute bottom-6 left-5 right-5 bg-white dark:bg-slate-800 p-2.5 rounded-[32px] flex-row gap-2.5 shadow-xl border border-slate-100 dark:border-slate-700/50`}>
        <TouchableOpacity onPress={handleAutoFix} style={tw`flex-1 bg-[#3b82f6] py-3.5 rounded-[24px] items-center flex-row justify-center gap-2 active:opacity-80`}>
          <MaterialCommunityIcons name="auto-fix" size={18} color="white" />
          <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Auto Fix</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSuggestions} style={tw`flex-1 bg-[#10b981] py-3.5 rounded-[24px] items-center flex-row justify-center gap-2 active:opacity-80`}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="white" />
          <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Suggestions</Text>
        </TouchableOpacity>
      </View>

      {/* Custom AI Recommendations Modal (Bottom Sheet Style) */}
      <Modal visible={showSuggestionsModal} transparent={true} animationType="slide" onRequestClose={() => setShowSuggestionsModal(false)}>
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <View style={tw`bg-white dark:bg-slate-900 rounded-t-[40px] p-6 pt-8 pb-12 shadow-2xl border-t border-slate-100 dark:border-slate-800`}>
            
            {/* Handle/Indicator */}
            <View style={tw`w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full self-center mb-6`} />

            <View style={tw`flex-row items-center gap-3 mb-6`}>
              <View style={tw`w-12 h-12 bg-[#10b981]/10 rounded-full items-center justify-center`}>
                <MaterialCommunityIcons name="brain" size={24} color="#10b981" />
              </View>
              <View>
                <Text style={[tw`text-[19px] text-slate-800 dark:text-white tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>AI Recommendations</Text>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Actionable insights based on predictions</Text>
              </View>
            </View>

            {/* List items */}
            <View style={tw`gap-4 mb-8`}>
              <View style={tw`flex-row items-start gap-4 p-4 rounded-[20px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30`}>
                <View style={tw`w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full items-center justify-center mt-1`}>
                  <MaterialCommunityIcons name="snowflake" size={20} color="#3b82f6" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pre-cool Environment</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Activate fans before the 26.5°C peak hits in 2 hours to offset the heat spike.</Text>
                </View>
              </View>

              <View style={tw`flex-row items-start gap-4 p-4 rounded-[20px] bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30`}>
                <View style={tw`w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full items-center justify-center mt-1`}>
                  <MaterialCommunityIcons name="weather-rainy" size={20} color="#10b981" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pulse Misters</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Run misters for 10s to prevent humidity from dropping to 60%.</Text>
                </View>
              </View>

              <View style={tw`flex-row items-start gap-4 p-4 rounded-[20px] bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30`}>
                <View style={tw`w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-full items-center justify-center mt-1`}>
                  <MaterialCommunityIcons name="fan" size={20} color="#8b5cf6" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Ventilation Flush</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Run a short 5-minute ventilation flush to clear impending CO2 spike.</Text>
                </View>
              </View>
            </View>

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity onPress={() => setShowSuggestionsModal(false)} style={tw`flex-1 py-4 rounded-[20px] bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200 dark:active:bg-slate-700`}>
                <Text style={[tw`text-slate-700 dark:text-slate-300 text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setShowSuggestionsModal(false);
                handleAutoFix();
              }} style={tw`flex-1 py-4 rounded-[20px] bg-[#10b981] items-center justify-center shadow-md active:opacity-80`}>
                <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Apply All</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}
