import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StatusBar, Platform } from 'react-native';
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

// Helper to format "HH:mm" to "h:mm A"
const formatTime = (timeString: string) => {
  if (!timeString) return '--:--';
  const [h, m] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Helper to parse "HH:mm" into a Date object
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

// Generate UUID for new windows
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function DeviceSchedulesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const schedules = settings?.schedules;

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
      showToast({ type: 'success', text1: 'Schedule updated successfully' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error saving schedule' });
    }
  };

  // Misters logic
  const handleMistersToggle = (val: boolean) => {
    setMistersOn(val);
    updateFirebaseSchedule({ misters: { enabled: val, durationMins: misterDuration, intervalHours: misterInterval } });
  };
  const handleMisterDuration = (delta: number) => {
    const newVal = Math.max(1, misterDuration + delta);
    setMisterDuration(newVal);
    updateFirebaseSchedule({ misters: { enabled: mistersOn, durationMins: newVal, intervalHours: misterInterval } });
  };
  const handleMisterInterval = (delta: number) => {
    const newVal = Math.max(1, misterInterval + delta);
    setMisterInterval(newVal);
    updateFirebaseSchedule({ misters: { enabled: mistersOn, durationMins: misterDuration, intervalHours: newVal } });
  };

  // Window List Logic
  const handleToggleDevice = (device: 'fans' | 'lights', val: boolean) => {
    if (device === 'fans') {
      setFanOn(val);
      updateFirebaseSchedule({ fans: { enabled: val, windows: fanWindows } });
    } else {
      setLightsOn(val);
      updateFirebaseSchedule({ lights: { enabled: val, windows: lightWindows } });
    }
  };

  const addWindow = (device: 'fans' | 'lights') => {
    const newWindow: TimeWindow = { id: generateId(), startTime: '12:00', endTime: '13:00' };
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
      setPickerState(null); // Android picker closes automatically
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

  // Modern UI for a Device Window Card
  const renderWindow = (w: TimeWindow, index: number, device: 'fans' | 'lights') => {
    return (
      <View key={w.id} style={tw`flex-row items-center gap-3 mb-3`}>
        <View style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-[16px] p-1 flex-row`}>
          <TouchableOpacity 
            onPress={() => openPicker(device, w.id, 'startTime', w.startTime)}
            style={tw`flex-1 py-2 items-center border-r border-gray-100 active:bg-gray-100 rounded-l-[16px]`}
          >
            <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>On At</Text>
            <Text style={[tw`text-[14px] text-slate-800 mt-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{formatTime(w.startTime)}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openPicker(device, w.id, 'endTime', w.endTime)}
            style={tw`flex-1 py-2 items-center active:bg-gray-100 rounded-r-[16px]`}
          >
            <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Off At</Text>
            <Text style={[tw`text-[14px] text-slate-800 mt-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{formatTime(w.endTime)}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={() => removeWindow(device, w.id)}
          style={tw`w-12 h-12 bg-red-50 rounded-[16px] items-center justify-center border border-red-100`}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Header - Modernized */}
      <View style={[tw`bg-[#166534] pb-6 px-5 z-10 shadow-sm relative overflow-hidden`, { paddingTop: insets.top > 0 ? insets.top + 10 : 30 }]}>
        <View style={tw`absolute -top-20 -right-20 w-56 h-56 bg-white/5 rounded-full`} />
        <View style={tw`absolute top-10 -left-10 w-32 h-32 bg-white/5 rounded-full`} />

        <View style={tw`flex-row items-center gap-3`}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-2xl text-white tracking-tight leading-none`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Device Schedules</Text>
            <Text style={[tw`text-[11px] text-[#bbf7d0] mt-1 opacity-90`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Configure automatic operating windows</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-12`} showsVerticalScrollIndicator={false}>
        
        {/* ================= MISTERS ================= */}
        <Text style={[tw`mx-2 mt-2 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Humidity Control</Text>
        <View style={tw`bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 mb-5`}>
          <View style={tw`flex-row justify-between items-center mb-5`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-xl bg-[#eff6ff] items-center justify-center`}>
                <MaterialCommunityIcons name="water-opacity" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={[tw`text-[16px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Misters</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Run duration & interval</Text>
              </View>
            </View>
            <Switch value={mistersOn} onValueChange={handleMistersToggle} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} thumbColor="#fff" />
          </View>

          <View style={tw`flex-row gap-4 mb-4`}>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[12px] text-slate-800 mb-2 pl-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Run Duration</Text>
              <View style={tw`flex-row items-center justify-between bg-gray-50 rounded-[16px] p-2 border border-gray-100`}>
                <TouchableOpacity onPress={() => handleMisterDuration(-5)} style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="minus" size={16} color="#64748b"/></TouchableOpacity>
                <View style={tw`flex-row items-baseline gap-1`}>
                  <Text style={[tw`text-lg text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{misterDuration}</Text>
                  <Text style={[tw`text-[10px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>min</Text>
                </View>
                <TouchableOpacity onPress={() => handleMisterDuration(5)} style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="plus" size={16} color="#64748b"/></TouchableOpacity>
              </View>
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[12px] text-slate-800 mb-2 pl-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Repeat Every</Text>
              <View style={tw`flex-row items-center justify-between bg-gray-50 rounded-[16px] p-2 border border-gray-100`}>
                <TouchableOpacity onPress={() => handleMisterInterval(-1)} style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="minus" size={16} color="#64748b"/></TouchableOpacity>
                <View style={tw`flex-row items-baseline gap-1`}>
                  <Text style={[tw`text-lg text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{misterInterval}</Text>
                  <Text style={[tw`text-[10px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>hr</Text>
                </View>
                <TouchableOpacity onPress={() => handleMisterInterval(1)} style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="plus" size={16} color="#64748b"/></TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={tw`bg-[#eff6ff] rounded-[12px] p-3 flex-row items-center justify-center gap-2`}>
            <MaterialCommunityIcons name="water-opacity" size={16} color="#3b82f6" />
            <Text style={[tw`text-xs text-blue-600`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Runs for <Text style={{fontFamily: 'PlusJakartaSans_800ExtraBold'}}>{misterDuration} min every {misterInterval} hr</Text></Text>
          </View>
        </View>

        {/* ================= FANS ================= */}
        <Text style={[tw`mx-2 mt-1 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Air Circulation</Text>
        <View style={tw`bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 mb-5`}>
          <View style={tw`flex-row justify-between items-center mb-5`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-xl bg-[#ecfeff] items-center justify-center`}>
                <MaterialCommunityIcons name="fan" size={20} color="#06b6d4" />
              </View>
              <View>
                <Text style={[tw`text-[16px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Fans</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Daily on/off windows</Text>
              </View>
            </View>
            <Switch value={fanOn} onValueChange={(val) => handleToggleDevice('fans', val)} trackColor={{ false: '#e2e8f0', true: '#06b6d4' }} thumbColor="#fff" />
          </View>

          {fanWindows.map((w, index) => renderWindow(w, index, 'fans'))}

          <TouchableOpacity 
            onPress={() => addWindow('fans')}
            style={tw`flex-row items-center justify-center gap-2 py-3 mt-1 bg-gray-50 border border-dashed border-gray-300 rounded-[16px] active:bg-gray-100`}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#64748b" />
            <Text style={[tw`text-[12px] text-slate-600`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Add Time Window</Text>
          </TouchableOpacity>
        </View>

        {/* ================= GROW LIGHTS ================= */}
        <Text style={[tw`mx-2 mt-1 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Illumination</Text>
        <View style={tw`bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 mb-4`}>
          <View style={tw`flex-row justify-between items-center mb-5`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-xl bg-[#fefce8] items-center justify-center`}>
                <MaterialCommunityIcons name="white-balance-sunny" size={20} color="#eab308" />
              </View>
              <View>
                <Text style={[tw`text-[16px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Grow Lights</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Daily on/off windows</Text>
              </View>
            </View>
            <Switch value={lightsOn} onValueChange={(val) => handleToggleDevice('lights', val)} trackColor={{ false: '#e2e8f0', true: '#eab308' }} thumbColor="#fff" />
          </View>

          {lightWindows.map((w, index) => renderWindow(w, index, 'lights'))}

          <TouchableOpacity 
            onPress={() => addWindow('lights')}
            style={tw`flex-row items-center justify-center gap-2 py-3 mt-1 bg-gray-50 border border-dashed border-gray-300 rounded-[16px] active:bg-gray-100`}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#64748b" />
            <Text style={[tw`text-[12px] text-slate-600`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Add Time Window</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* DateTime Picker Modal */}
      {pickerState && pickerState.visible && (
        <>
          {Platform.OS === 'ios' && (
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setPickerState(null)} 
              style={tw`absolute inset-0 bg-black/40 z-40 justify-end`}
            >
              <TouchableOpacity activeOpacity={1} style={tw`bg-white p-4 rounded-t-3xl`}>
                <View style={tw`flex-row justify-between items-center mb-4 px-2`}>
                  <Text style={[tw`text-[15px] text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Select Time</Text>
                  <TouchableOpacity onPress={() => setPickerState(null)} style={tw`bg-emerald-100 px-4 py-1.5 rounded-full`}>
                    <Text style={[tw`text-emerald-700 text-xs`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerState.date}
                  mode="time"
                  display="spinner"
                  onValueChange={onPickerChange}
                  textColor="black"
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
