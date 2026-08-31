import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, Alert, Vibration, Animated, PanResponder } from 'react-native';
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
import { useTheme } from '../context/ThemeContext';
import { DeviceEventEmitter } from 'react-native';

const globalTimeouts: NodeJS.Timeout[] = [];
let isGlobalProcessing: string | false = false;
const globalStartTimes: Record<string, number> = {};

// Global listener ensures timers are cleared and global state is reset even if ReportScreen is unmounted
DeviceEventEmitter.addListener('cancelAiOverride', () => {
  globalTimeouts.forEach(clearTimeout);
  globalTimeouts.length = 0;
  isGlobalProcessing = false;
  Object.keys(globalStartTimes).forEach(k => delete globalStartTimes[k]);
});

export default function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();
  const { isDarkMode } = useTheme();

  const [isProcessing, setIsProcessing] = useState<string | false>(isGlobalProcessing);
  const [selectedActions, setSelectedActions] = useState({
    fans: true,
    misters: true,
    co2: true
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentTime = Date.now();
    ['fans', 'misters', 'lights', 'co2'].forEach(device => {
       if (settings?.setpoints?.devices?.[device as keyof typeof settings.setpoints.devices]) {
          if (!globalStartTimes[device]) globalStartTimes[device] = currentTime;
       } else {
          delete globalStartTimes[device];
       }
    });
  }, [settings?.setpoints?.devices]);

  const getElapsed = (device: string) => {
     let goalSecs = 30;
     if (device === 'misters') goalSecs = 10;

     const goalM = Math.floor(goalSecs / 60).toString().padStart(2, '0');
     const goalS = (goalSecs % 60).toString().padStart(2, '0');
     const goalStr = `${goalM}:${goalS}`;

     if (!globalStartTimes[device]) return { current: "00:00", goal: goalStr };
     const diff = Math.floor((now - globalStartTimes[device]) / 1000);
     if (diff < 0) return { current: "00:00", goal: goalStr };
     
     const cappedDiff = Math.min(diff, goalSecs);
     const m = Math.floor(cappedDiff / 60).toString().padStart(2, '0');
     const s = (cappedDiff % 60).toString().padStart(2, '0');
     return { current: `${m}:${s}`, goal: goalStr };
  };

  const setProcessingState = (state: string | false) => {
    isGlobalProcessing = state;
    DeviceEventEmitter.emit('processingStateChanged', state);
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('cancelAiOverride', () => {
      setProcessingState(false);
    });
    const stateSub = DeviceEventEmitter.addListener('processingStateChanged', (state) => {
      setIsProcessing(state);
    });
    
    // Sync just in case it changed while unmounted
    setIsProcessing(isGlobalProcessing);

    return () => {
      sub.remove();
      stateSub.remove();
    };
  }, []);

  // Overrides the system to manual mode and turns on the requested device
  const overrideDevice = async (deviceKey: string, actionName: string, durationMs: number) => {
    if (isGlobalProcessing) {
      showToast({ type: 'info', text1: 'Action in Progress', text2: 'Please wait for the current action to finish.' });
      return;
    }
    setProcessingState(deviceKey);
    try {
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });
      await update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: true });

      showToast({
        type: 'success',
        text1: 'AI Override Executed',
        text2: `System set to manual. ${actionName} activated.`
      });

      // Schedule revert
      const timeoutId = setTimeout(() => {
        try {
          update(ref(db, `kabutech/settings/setpoints/devices`), { [deviceKey]: false });
          update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

          // Start the nonstop alarm and vibration loop
          const alarmPattern = [0, 500, 200, 500];
          Vibration.vibrate(alarmPattern, true); // true means loop endlessly
          SoundManager.playAlarm();

          DeviceEventEmitter.emit('showAlarmModal', {
            title: "AI Action Complete",
            message: `${actionName} finished successfully. The system has returned to AUTO mode.`
          });

          showToast({ type: 'success', text1: 'AI Cycle Complete', text2: `${actionName} finished. Returned to AUTO.` });
        } catch (e: any) {
          showToast({ type: 'error', text1: 'Revert Error', text2: e?.message || 'Failed to revert' });
        } finally {
          setProcessingState(false);
        }
      }, durationMs);
      globalTimeouts.push(timeoutId);
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Override Failed', text2: err.message });
      setProcessingState(false);
    }
  };

  const handleAutoFix = async () => {
    if (!selectedActions.fans && !selectedActions.misters && !selectedActions.co2) {
      showToast({ type: 'info', text1: 'No actions selected', text2: 'Please select at least one action to apply.' });
      return;
    }

    if (isGlobalProcessing) {
      showToast({ type: 'info', text1: 'Action in Progress', text2: 'Please wait for the current action to finish.' });
      return;
    }
    setProcessingState('all');
    try {
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'manual', aiOverride: true });
      
      const updates: any = {};
      if (selectedActions.fans) updates.fans = true;
      if (selectedActions.misters) updates.misters = true;
      if (selectedActions.co2) updates.co2 = true;
      
      await update(ref(db, `kabutech/settings/setpoints/devices`), updates);

      showToast({
        type: 'success',
        text1: 'AI Overrides Applied',
        text2: 'Selected actions are now active.'
      });

      const maxDuration = (selectedActions.fans || selectedActions.co2) ? 30000 : (selectedActions.misters ? 10000 : 0);

      if (selectedActions.misters) {
        const mistTimeoutId = setTimeout(() => {
          try {
            update(ref(db, `kabutech/settings/setpoints/devices`), { misters: false });
            if (maxDuration > 10000) {
              SoundManager.playRing();
              showToast({ type: 'info', text1: 'AI Task Complete', text2: 'Pulse misting finished.' });
            }
          } catch (e) {}
        }, 10000); // 10 seconds
        globalTimeouts.push(mistTimeoutId);
      }

      if (maxDuration > 0) {
        const finalTimeoutId = setTimeout(() => {
          try {
            const revertUpdates: any = {};
            if (selectedActions.fans) revertUpdates.fans = false;
            if (selectedActions.co2) revertUpdates.co2 = false;
            if (selectedActions.misters && maxDuration === 10000) revertUpdates.misters = false;
            
            update(ref(db, `kabutech/settings/setpoints/devices`), revertUpdates);
            update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

            const alarmPattern = [0, 500, 200, 500];
            Vibration.vibrate(alarmPattern, true); // true means loop endlessly
            SoundManager.playAlarm();

            DeviceEventEmitter.emit('showAlarmModal', {
              title: "AI Cycle Complete!",
              message: "Optimal conditions have been successfully restored. The system has returned to AUTO mode."
            });

            showToast({ type: 'success', text1: 'AI Cycle Complete', text2: 'Optimal conditions met. Returned to AUTO.' });
          } catch (e: any) {
            showToast({ type: 'error', text1: 'Revert Error', text2: e?.message || 'Failed to revert' });
          } finally {
            setProcessingState(false);
          }
        }, maxDuration);
        globalTimeouts.push(finalTimeoutId);
      }

    } catch (err: any) {
      showToast({ type: 'error', text1: 'AI Action Failed', text2: err.message });
      setProcessingState(false);
    }
  };

  const cancelOverride = () => {
    globalTimeouts.forEach(clearTimeout);
    globalTimeouts.length = 0;
    setProcessingState(false);

    try {
      update(ref(db, `kabutech/settings/setpoints/devices`), {
        fans: false,
        misters: false,
        co2: false,
        lights: false
      });
      update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

      showToast({ type: 'info', text1: 'Action Cancelled', text2: 'Override aborted. Returned to AUTO.' });
    } catch (e: any) {
      showToast({ type: 'error', text1: 'Cancel Failed', text2: e?.message || 'Failed to cancel.' });
    }
  };

  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.0) {
          slideOutAndClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const slideOutAndClose = () => {
    Animated.timing(translateY, {
      toValue: 800,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowSuggestionsModal(false));
  };

  useEffect(() => {
    if (showSuggestionsModal) {
      translateY.setValue(800);
      Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
    }
  }, [showSuggestionsModal, translateY]);

  const handleSuggestions = () => {
    setShowSuggestionsModal(true);
  };

  return (
    <View style={tw`flex-1 bg-[#f4f7fa] dark:bg-[#020617]`}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView contentContainerStyle={[tw`px-5 pb-32`, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={tw`mb-8 flex-row items-center gap-4`}>
          <TouchableOpacity 
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            onPress={() => navigation.goBack()}
            style={tw`w-11 h-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50`}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#ffffff' : '#334155'} />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-2xl text-slate-800 dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              Prediction Hub
            </Text>
            <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              Intelligent system controls
            </Text>
          </View>
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

        {/* Equipment Timers */}
        <Text style={[tw`text-[17px] text-slate-800 dark:text-white mb-4 pl-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Active Overrides</Text>
        <View style={tw`bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 flex-row justify-between mb-8`}>
          {['fans', 'misters', 'lights', 'co2'].map(device => {
             const active = settings?.setpoints?.devices?.[device as keyof typeof settings.setpoints.devices];
             const color = device === 'fans' ? '#3b82f6' : device === 'misters' ? '#10b981' : device === 'lights' ? '#f59e0b' : '#8b5cf6';
             let bgClass = tw`bg-slate-50 dark:bg-slate-700/50`;
             if (active) {
                if (device === 'fans') bgClass = tw`bg-blue-50 dark:bg-blue-500/20 border-2 border-blue-100 dark:border-blue-500/30`;
                if (device === 'misters') bgClass = tw`bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-100 dark:border-emerald-500/30`;
                if (device === 'lights') bgClass = tw`bg-amber-50 dark:bg-amber-500/20 border-2 border-amber-100 dark:border-amber-500/30`;
                if (device === 'co2') bgClass = tw`bg-purple-50 dark:bg-purple-500/20 border-2 border-purple-100 dark:border-purple-500/30`;
             }
             
             return (
               <View key={device} style={tw`items-center flex-1`}>
                 <View style={[tw`w-[48px] h-[48px] rounded-full items-center justify-center mb-2`, bgClass]}>
                   <MaterialCommunityIcons 
                     name={device === 'fans' ? 'fan' : device === 'misters' ? 'water' : device === 'lights' ? 'lightbulb-on' : 'weather-windy'} 
                     size={22} 
                     color={active ? color : '#94a3b8'} 
                   />
                 </View>
                 <Text style={[tw`text-[10px] mb-1.5 uppercase tracking-wider`, {fontFamily: 'PlusJakartaSans_700Bold', color: active ? color : '#94a3b8'}]}>{device}</Text>
                 <Text style={[tw`text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold', color: active ? color : '#cbd5e1'}]}>
                   {getElapsed(device).current}
                 </Text>
                 <View style={tw`h-[1.5px] w-6 bg-slate-100 dark:bg-slate-700/50 my-1 rounded-full`} />
                 <Text style={[tw`text-[10px]`, {fontFamily: 'PlusJakartaSans_600SemiBold', color: '#94a3b8'}]}>
                   {getElapsed(device).goal}
                 </Text>
               </View>
             );
          })}
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
            <View style={tw`flex-row items-baseline justify-center gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>26.5</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>°C</Text>
            </View>
            <View style={tw`bg-red-50 dark:bg-red-500/10 py-2.5 px-3 rounded-xl border border-red-100 dark:border-red-900/30`}>
              <Text style={[tw`text-[10px] text-red-600 dark:text-red-400 leading-4`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>+2.5°C over target. Peak heat expected in 2h.</Text>
            </View>
          </View>

          {/* Humid */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="water-percent" size={18} color="#3b82f6" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted Hum:</Text>
            </View>
            <View style={tw`flex-row items-baseline justify-center gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>60</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>%</Text>
            </View>
            <View style={tw`bg-blue-50 dark:bg-blue-500/10 py-2.5 px-3 rounded-xl border border-blue-100 dark:border-blue-900/30`}>
              <Text style={[tw`text-[10px] text-blue-600 dark:text-blue-400 leading-4`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Approaching low threshold. Misting advised.</Text>
            </View>
          </View>

          {/* Light */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#f59e0b" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted Lux:</Text>
            </View>
            <View style={tw`flex-row items-baseline justify-center gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>400</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>lux</Text>
            </View>
            <View style={tw`bg-emerald-50 dark:bg-emerald-500/10 py-2.5 px-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30`}>
              <Text style={[tw`text-[10px] text-emerald-600 dark:text-emerald-400 leading-4`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Stable lighting levels. No action required.</Text>
            </View>
          </View>

          {/* CO2 */}
          <View style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-4`}>
            <View style={tw`flex-row items-center gap-1.5 mb-3`}>
              <MaterialCommunityIcons name="molecule-co2" size={16} color="#8b5cf6" />
              <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Predicted CO2:</Text>
            </View>
            <View style={tw`flex-row items-baseline justify-center gap-1 mb-4`}>
              <Text style={[tw`text-3xl text-slate-800 dark:text-white tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>980</Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>ppm</Text>
            </View>
            <View style={tw`bg-amber-50 dark:bg-amber-500/10 py-2.5 px-3 rounded-xl border border-amber-100 dark:border-amber-900/30`}>
              <Text style={[tw`text-[10px] text-amber-600 dark:text-amber-400 leading-4`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Elevated concentration. Venting recommended.</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={tw`absolute bottom-6 left-5 right-5 bg-white dark:bg-slate-800 p-2.5 rounded-[32px] flex-row gap-2.5 shadow-xl border border-slate-100 dark:border-slate-700/50`}>
        {isProcessing ? (
          <TouchableOpacity onPress={cancelOverride} style={tw`flex-1 bg-red-500 py-3.5 rounded-[24px] items-center flex-row justify-center gap-2 active:opacity-80`}>
            <MaterialCommunityIcons name="cancel" size={18} color="white" />
            <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Cancel Action</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={handleAutoFix} style={tw`flex-1 bg-[#3b82f6] py-3.5 rounded-[24px] items-center flex-row justify-center gap-2 active:opacity-80`}>
              <MaterialCommunityIcons name="auto-fix" size={18} color="white" />
              <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Auto Fix</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSuggestions} style={tw`flex-1 bg-[#10b981] py-3.5 rounded-[24px] items-center flex-row justify-center gap-2 active:opacity-80`}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="white" />
              <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Suggestions</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Custom AI Recommendations Modal (Bottom Sheet Style) */}
      <Modal visible={showSuggestionsModal} transparent={true} animationType="fade" onRequestClose={slideOutAndClose}>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  activeOpacity={1} style={tw`flex-1 justify-end bg-black/60`} onPress={slideOutAndClose}>
          <Animated.View 
            {...panResponder.panHandlers}
            onStartShouldSetResponder={() => true}
            style={[
              tw`bg-white dark:bg-slate-900 rounded-t-[40px] p-6 pt-8 pb-12 shadow-2xl border-t border-slate-100 dark:border-slate-800`,
              { transform: [{ translateY }] }
            ]}
          >
            
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

            <View style={tw`gap-4 mb-8`}>
              <TouchableOpacity disabled={!!isProcessing} onPress={() => setSelectedActions(p => ({...p, fans: !p.fans}))} style={[tw`flex-row items-center gap-4 p-4 rounded-[20px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30`, (!!isProcessing && isProcessing !== 'fans') && tw`opacity-50`]}>
                <View style={tw`w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full items-center justify-center`}>
                  <MaterialCommunityIcons name="snowflake" size={20} color="#3b82f6" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pre-cool Environment</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Activate fans before the 26.5°C peak hits in 2 hours to offset the heat spike.</Text>
                </View>
                <View style={tw`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedActions.fans ? 'bg-[#10b981] border-[#10b981]' : 'border-slate-300 dark:border-slate-600'}`}>
                   {selectedActions.fans && <MaterialCommunityIcons name="check" size={16} color="white" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity disabled={!!isProcessing} onPress={() => setSelectedActions(p => ({...p, misters: !p.misters}))} style={[tw`flex-row items-center gap-4 p-4 rounded-[20px] bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30`, (!!isProcessing && isProcessing !== 'misters') && tw`opacity-50`]}>
                <View style={tw`w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full items-center justify-center`}>
                  <MaterialCommunityIcons name="weather-rainy" size={20} color="#10b981" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Pulse Misters</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Run misters for 10s to prevent humidity from dropping to 60%.</Text>
                </View>
                <View style={tw`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedActions.misters ? 'bg-[#10b981] border-[#10b981]' : 'border-slate-300 dark:border-slate-600'}`}>
                   {selectedActions.misters && <MaterialCommunityIcons name="check" size={16} color="white" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity disabled={!!isProcessing} onPress={() => setSelectedActions(p => ({...p, co2: !p.co2}))} style={[tw`flex-row items-center gap-4 p-4 rounded-[20px] bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30`, (!!isProcessing && isProcessing !== 'co2') && tw`opacity-50`]}>
                <View style={tw`w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-full items-center justify-center`}>
                  <MaterialCommunityIcons name="fan" size={20} color="#8b5cf6" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-[15px] text-slate-800 dark:text-white mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Ventilation Flush</Text>
                  <Text style={[tw`text-[13px] text-slate-600 dark:text-slate-400 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Run a short 5-minute ventilation flush to clear impending CO2 spike.</Text>
                </View>
                <View style={tw`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedActions.co2 ? 'bg-[#10b981] border-[#10b981]' : 'border-slate-300 dark:border-slate-600'}`}>
                   {selectedActions.co2 && <MaterialCommunityIcons name="check" size={16} color="white" />}
                </View>
              </TouchableOpacity>
            </View>

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity onPress={slideOutAndClose} style={tw`flex-1 py-4 rounded-[20px] bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200 dark:active:bg-slate-700`}>
                <Text style={[tw`text-slate-700 dark:text-slate-300 text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!!isProcessing} onPress={() => {
                slideOutAndClose();
                handleAutoFix();
              }} style={[tw`flex-1 py-4 rounded-[20px] bg-[#10b981] items-center justify-center shadow-md active:opacity-80`, (!!isProcessing && isProcessing !== 'all') && tw`opacity-50`]}>
                <Text style={[tw`text-white text-[14px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                  {isProcessing === 'all' ? 'Processing...' : 'Apply Selected'}
                </Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}
