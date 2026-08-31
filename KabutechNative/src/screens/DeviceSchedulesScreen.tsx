import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StatusBar, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useSettings } from '../hooks/useFirebaseData';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { ScheduleSettings, TimeWindow } from '../types/firebase';
import { showToast } from '../components/CustomToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '../utils/haptics';

// Format "HH:mm" to "h:mm A"
const formatTime = (timeString: string) => {
  if (!timeString) return '--:--';
  const [h, m] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Parse "HH:mm" into a Date object
const parseTime = (timeString: string) => {
  const date = new Date();
  if (!timeString) {
    date.setHours(12, 0, 0, 0);
    return date;
  }
  const [h, m] = timeString.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date;
};

// Calculate duration string between two times
const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e <= s) e += 24 * 60;
  const diff = e - s;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function DeviceSchedulesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const settings = useSettings();
  const schedules = settings?.schedules;
  const currentMode = settings?.setpoints?.mode || 'manual';
  const isScheduledMode = currentMode === 'scheduled';

  const [mistersOn, setMistersOn] = useState(false);
  const [misterDuration, setMisterDuration] = useState(30);
  const [misterInterval, setMisterInterval] = useState(2);
  
  const [fanOn, setFanOn] = useState(false);
  const [fanWindows, setFanWindows] = useState<TimeWindow[]>([]);
  
  const [lightsOn, setLightsOn] = useState(false);
  const [lightWindows, setLightWindows] = useState<TimeWindow[]>([]);

  // Picker State
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    device: 'fans' | 'lights';
    windowId: string;
    type: 'startTime' | 'endTime';
    date: Date;
  } | null>(null);

  useEffect(() => {
    if (schedules) {
      setMistersOn(schedules.misters?.enabled || false);
      setMisterDuration(schedules.misters?.durationMins || 30);
      setMisterInterval(schedules.misters?.intervalHours || 2);
      
      setFanOn(schedules.fans?.enabled || false);
      setFanWindows(schedules.fans?.windows || [{ id: '1', startTime: '06:00', endTime: '08:00' }]);
      
      setLightsOn(schedules.lights?.enabled || false);
      setLightWindows(schedules.lights?.windows || [{ id: '1', startTime: '06:30', endTime: '19:00' }]);
    }
  }, [schedules]);

  const updateFirebaseSchedule = async (updates: Partial<ScheduleSettings>) => {
    try {
      await update(ref(db, 'kabutech/settings/schedules'), updates);
      showToast({ type: 'success', text1: 'Schedule Saved' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error Saving Schedule' });
    }
  };

  const handleSwitchToScheduledMode = () => {
    hapticSuccess();
    update(ref(db, 'kabutech/settings/setpoints'), {
      mode: 'scheduled',
      aiOverride: false
    }).then(() => {
      showToast({ type: 'success', text1: 'Scheduled Mode Activated' });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  // Misters controls
  const handleMistersToggle = (val: boolean) => {
    hapticMedium();
    setMistersOn(val);
    updateFirebaseSchedule({ misters: { enabled: val, durationMins: misterDuration, intervalHours: misterInterval } });
  };

  const handleMisterDuration = (delta: number) => {
    hapticLight();
    const newVal = Math.max(2, Math.min(120, misterDuration + delta));
    setMisterDuration(newVal);
    updateFirebaseSchedule({ misters: { enabled: mistersOn, durationMins: newVal, intervalHours: misterInterval } });
  };

  const handleMisterInterval = (delta: number) => {
    hapticLight();
    const newVal = Math.max(1, Math.min(12, misterInterval + delta));
    setMisterInterval(newVal);
    updateFirebaseSchedule({ misters: { enabled: mistersOn, durationMins: misterDuration, intervalHours: newVal } });
  };

  // Window List Logic
  const handleToggleDevice = (device: 'fans' | 'lights', val: boolean) => {
    hapticMedium();
    if (device === 'fans') {
      setFanOn(val);
      updateFirebaseSchedule({ fans: { enabled: val, windows: fanWindows } });
    } else {
      setLightsOn(val);
      updateFirebaseSchedule({ lights: { enabled: val, windows: lightWindows } });
    }
  };

  const addWindow = (device: 'fans' | 'lights') => {
    hapticSelection();
    const newWindow: TimeWindow = { id: generateId(), startTime: '12:00', endTime: '14:00' };
    if (device === 'fans') {
      const updated = [...fanWindows, newWindow];
      setFanWindows(updated);
      updateFirebaseSchedule({ fans: { enabled: fanOn, windows: updated } });
    } else {
      const updated = [...lightWindows, newWindow];
      setLightWindows(updated);
      updateFirebaseSchedule({ lights: { enabled: lightsOn, windows: updated } });
    }
  };

  const removeWindow = (device: 'fans' | 'lights', id: string) => {
    hapticMedium();
    if (device === 'fans') {
      const updated = fanWindows.filter(w => w.id !== id);
      setFanWindows(updated);
      updateFirebaseSchedule({ fans: { enabled: fanOn, windows: updated } });
    } else {
      const updated = lightWindows.filter(w => w.id !== id);
      setLightWindows(updated);
      updateFirebaseSchedule({ lights: { enabled: lightsOn, windows: updated } });
    }
  };

  const openPicker = (device: 'fans' | 'lights', windowId: string, type: 'startTime' | 'endTime', currentTime: string) => {
    hapticLight();
    setPickerState({
      visible: true,
      device,
      windowId,
      type,
      date: parseTime(currentTime)
    });
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerState(null);
    }
    
    if (selectedDate && pickerState) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${h}:${m}`;
      
      const { device, windowId, type } = pickerState;
      
      if (device === 'fans') {
        const updated = fanWindows.map(w => w.id === windowId ? { ...w, [type]: timeStr } : w);
        setFanWindows(updated);
        updateFirebaseSchedule({ fans: { enabled: fanOn, windows: updated } });
      } else {
        const updated = lightWindows.map(w => w.id === windowId ? { ...w, [type]: timeStr } : w);
        setLightWindows(updated);
        updateFirebaseSchedule({ lights: { enabled: lightsOn, windows: updated } });
      }

      if (Platform.OS === 'ios') {
        setPickerState({ ...pickerState, date: selectedDate });
      }
    }
  };

  // Modern Window Row Component
  const renderWindowCard = (w: TimeWindow, index: number, device: 'fans' | 'lights') => {
    const duration = calculateDuration(w.startTime, w.endTime);
    const isFan = device === 'fans';
    const tagBg = isFan ? 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' : 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400';

    return (
      <View 
        key={w.id} 
        style={tw`flex-row items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl mb-2.5 border border-slate-100 dark:border-slate-800`}
      >
        {/* Start / End Time Clickable Badges */}
        <View style={tw`flex-row items-center gap-2.5 flex-1`}>
          {/* Start Time */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
            onPress={() => openPicker(device, w.id, 'startTime', w.startTime)}
            activeOpacity={0.7}
            style={tw`bg-white dark:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-600 shadow-sm items-center`}
          >
            <Text style={[tw`text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              START
            </Text>
            <Text style={[tw`text-[13.5px] text-slate-900 dark:text-white mt-0.5`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {formatTime(w.startTime)}
            </Text>
          </TouchableOpacity>

          {/* Arrow & Duration */}
          <View style={tw`items-center justify-center px-0.5`}>
            <MaterialCommunityIcons name="arrow-right" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            {duration ? (
              <Text style={[tw`text-[9.5px] font-bold mt-0.5`, tw`${tagBg}`]}>
                {duration}
              </Text>
            ) : null}
          </View>

          {/* End Time */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
            onPress={() => openPicker(device, w.id, 'endTime', w.endTime)}
            activeOpacity={0.7}
            style={tw`bg-white dark:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-600 shadow-sm items-center`}
          >
            <Text style={[tw`text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              END
            </Text>
            <Text style={[tw`text-[13.5px] text-slate-900 dark:text-white mt-0.5`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {formatTime(w.endTime)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Button */}
        <TouchableOpacity 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  
          onPress={() => removeWindow(device, w.id)}
          style={tw`w-8 h-8 rounded-xl items-center justify-center bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 ml-2`}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Modern Header */}
      <View style={[tw`px-5 pb-3 z-10 bg-white/90 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800`, { paddingTop: insets.top > 0 ? insets.top + 8 : 28 }]}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-3.5`}>
            <TouchableOpacity 
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={() => {
                hapticLight();
                navigation.goBack();
              }}
              style={tw`w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200/70 dark:border-slate-700 shadow-sm`}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
            </TouchableOpacity>
            <View>
              <Text style={[tw`text-[20px] text-slate-900 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Device Schedules
              </Text>
              <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                Automated operating timers
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={tw`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${isScheduledMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <View style={tw`w-2 h-2 rounded-full ${isScheduledMode ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <Text style={[tw`text-[11px] ${isScheduledMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {isScheduledMode ? 'Running' : 'Standby'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-32`} showsVerticalScrollIndicator={false}>
        
        {/* Subtle Mode Alert Banner if not in Scheduled Mode */}
        {!isScheduledMode && (
          <View style={tw`bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#f59e0b" />
              <Text style={[tw`text-[11.5px] text-amber-900 dark:text-amber-300 flex-1`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                System is in {currentMode.toUpperCase()} mode. Enable Scheduled mode to run timers.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSwitchToScheduledMode}
              style={tw`bg-amber-500 active:bg-amber-600 px-3.5 py-1.5 rounded-xl shadow-sm`}
            >
              <Text style={[tw`text-white text-[11px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Activate
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= MISTERS CARD ================= */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200/70 dark:border-slate-800 shadow-sm p-4.5 mb-4`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center`}>
                <MaterialCommunityIcons name="water-opacity" size={22} color="#3b82f6" />
              </View>
              <View>
                <View style={tw`flex-row items-center gap-2`}>
                  <Text style={[tw`text-[16px] text-slate-900 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Misters
                  </Text>
                  <View style={tw`px-2 py-0.5 rounded-full ${mistersOn ? 'bg-blue-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text style={[tw`text-[9.5px] font-bold ${mistersOn ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`]}>
                      {mistersOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>
                <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  Periodic humidity spray cycle
                </Text>
              </View>
            </View>
            <Switch 
              value={mistersOn} 
              onValueChange={handleMistersToggle} 
              trackColor={{ false: isDarkMode ? '#334155' : '#e2e8f0', true: '#3b82f6' }} 
              thumbColor="#ffffff" 
            />
          </View>

          {/* Steppers */}
          <View style={tw`flex-row gap-3 mb-3`}>
            {/* Duration */}
            <View style={tw`flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800`}>
              <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Run Duration
              </Text>
              <View style={tw`flex-row items-center justify-between`}>
                <TouchableOpacity 
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
                  onPress={() => handleMisterDuration(-2)}
                  style={tw`w-8 h-8 rounded-xl bg-white dark:bg-slate-700 items-center justify-center border border-slate-200/80 dark:border-slate-600 shadow-sm`}
                >
                  <MaterialCommunityIcons name="minus" size={15} color={isDarkMode ? '#f8fafc' : '#1e293b'} />
                </TouchableOpacity>

                <View style={tw`flex-row items-baseline gap-0.5`}>
                  <Text style={[tw`text-[18px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    {misterDuration}
                  </Text>
                  <Text style={[tw`text-[11px] text-slate-400 font-bold`]}>
                    min
                  </Text>
                </View>

                <TouchableOpacity 
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
                  onPress={() => handleMisterDuration(2)}
                  style={tw`w-8 h-8 rounded-xl bg-white dark:bg-slate-700 items-center justify-center border border-slate-200/80 dark:border-slate-600 shadow-sm`}
                >
                  <MaterialCommunityIcons name="plus" size={15} color={isDarkMode ? '#f8fafc' : '#1e293b'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Interval */}
            <View style={tw`flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800`}>
              <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Repeat Every
              </Text>
              <View style={tw`flex-row items-center justify-between`}>
                <TouchableOpacity 
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
                  onPress={() => handleMisterInterval(-1)}
                  style={tw`w-8 h-8 rounded-xl bg-white dark:bg-slate-700 items-center justify-center border border-slate-200/80 dark:border-slate-600 shadow-sm`}
                >
                  <MaterialCommunityIcons name="minus" size={15} color={isDarkMode ? '#f8fafc' : '#1e293b'} />
                </TouchableOpacity>

                <View style={tw`flex-row items-baseline gap-0.5`}>
                  <Text style={[tw`text-[18px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    {misterInterval}
                  </Text>
                  <Text style={[tw`text-[11px] text-slate-400 font-bold`]}>
                    hr
                  </Text>
                </View>

                <TouchableOpacity 
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
                  onPress={() => handleMisterInterval(1)}
                  style={tw`w-8 h-8 rounded-xl bg-white dark:bg-slate-700 items-center justify-center border border-slate-200/80 dark:border-slate-600 shadow-sm`}
                >
                  <MaterialCommunityIcons name="plus" size={15} color={isDarkMode ? '#f8fafc' : '#1e293b'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Info pill */}
          <View style={tw`bg-blue-500/10 rounded-xl py-2 px-3 flex-row items-center justify-center gap-1.5`}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#3b82f6" />
            <Text style={[tw`text-[11.5px] text-blue-700 dark:text-blue-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Runs for {misterDuration} min every {misterInterval} hr
            </Text>
          </View>
        </View>

        {/* ================= FANS CARD ================= */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200/70 dark:border-slate-800 shadow-sm p-4.5 mb-4`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center`}>
                <MaterialCommunityIcons name="fan" size={22} color="#06b6d4" />
              </View>
              <View>
                <View style={tw`flex-row items-center gap-2`}>
                  <Text style={[tw`text-[16px] text-slate-900 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Circulation Fans
                  </Text>
                  <View style={tw`px-2 py-0.5 rounded-full ${fanOn ? 'bg-cyan-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text style={[tw`text-[9.5px] font-bold ${fanOn ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`]}>
                      {fanOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>
                <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  Fresh air operating windows
                </Text>
              </View>
            </View>
            <Switch 
              value={fanOn} 
              onValueChange={(val) => handleToggleDevice('fans', val)} 
              trackColor={{ false: isDarkMode ? '#334155' : '#e2e8f0', true: '#06b6d4' }} 
              thumbColor="#ffffff" 
            />
          </View>

          {/* Windows */}
          {fanWindows.map((w, index) => renderWindowCard(w, index, 'fans'))}

          {/* Add Window Button */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
            onPress={() => addWindow('fans')}
            activeOpacity={0.75}
            style={tw`flex-row items-center justify-center gap-2 py-3 mt-1 bg-cyan-500/10 active:bg-cyan-500/20 rounded-2xl border border-cyan-500/25`}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#06b6d4" />
            <Text style={[tw`text-[12.5px] text-cyan-700 dark:text-cyan-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Add Operating Window
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= GROW LIGHTS CARD ================= */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200/70 dark:border-slate-800 shadow-sm p-4.5 mb-4`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center`}>
                <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#f59e0b" />
              </View>
              <View>
                <View style={tw`flex-row items-center gap-2`}>
                  <Text style={[tw`text-[16px] text-slate-900 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Grow Lights
                  </Text>
                  <View style={tw`px-2 py-0.5 rounded-full ${lightsOn ? 'bg-amber-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text style={[tw`text-[9.5px] font-bold ${lightsOn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`]}>
                      {lightsOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>
                <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  Photoperiod illumination windows
                </Text>
              </View>
            </View>
            <Switch 
              value={lightsOn} 
              onValueChange={(val) => handleToggleDevice('lights', val)} 
              trackColor={{ false: isDarkMode ? '#334155' : '#e2e8f0', true: '#f59e0b' }} 
              thumbColor="#ffffff" 
            />
          </View>

          {/* Windows */}
          {lightWindows.map((w, index) => renderWindowCard(w, index, 'lights'))}

          {/* Add Window Button */}
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  
            onPress={() => addWindow('lights')}
            activeOpacity={0.75}
            style={tw`flex-row items-center justify-center gap-2 py-3 mt-1 bg-amber-500/10 active:bg-amber-500/20 rounded-2xl border border-amber-500/25`}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#f59e0b" />
            <Text style={[tw`text-[12.5px] text-amber-700 dark:text-amber-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Add Operating Window
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* DateTime Picker Modal */}
      {pickerState && pickerState.visible && (
        <>
          {Platform.OS === 'ios' && (
            <TouchableOpacity 
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              activeOpacity={1} 
              onPress={() => setPickerState(null)} 
              style={tw`absolute inset-0 bg-black/40 z-40 justify-end`}
            >
              <TouchableOpacity activeOpacity={1} style={tw`bg-white dark:bg-slate-900 p-5 rounded-t-[32px] border-t border-slate-100 dark:border-slate-800`}>
                <View style={tw`flex-row justify-between items-center mb-3 px-1`}>
                  <Text style={[tw`text-[15px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    Select {pickerState.type === 'startTime' ? 'Start' : 'End'} Time
                  </Text>
                  <TouchableOpacity 
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                    onPress={() => setPickerState(null)} 
                    style={tw`bg-emerald-500 active:bg-emerald-600 px-4 py-1.5 rounded-full`}
                  >
                    <Text style={[tw`text-white text-xs`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerState.date}
                  mode="time"
                  display="spinner"
                  onValueChange={onPickerChange}
                  textColor={isDarkMode ? '#ffffff' : '#000000'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={pickerState.date}
              mode="time"
              display="default"
              onValueChange={onPickerChange}
            />
          )}
        </>
      )}
    </View>
  );
}
