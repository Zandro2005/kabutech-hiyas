import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, DeviceEventEmitter, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CircularSlider from '../components/CircularSlider';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/CustomToast';

const { width } = Dimensions.get('window');

type TabId = 'temp' | 'hum' | 'light' | 'co2';

export default function ControlsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  
  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 32.8;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 51;
  const light = typeof sensors.light === 'number' ? sensors.light : 71;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 583;

  const targetTemp = settings?.setpoints?.temperature || 28.0;
  const targetHum = settings?.setpoints?.humidity || 85;
  const targetLight = settings?.setpoints?.light || 580;
  const targetCO2 = settings?.setpoints?.co2 || 690;

  const devices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false, co2: false };
  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';

  const updateSetpoint = (key: string, value: number, label?: string, unit?: string) => {
    update(ref(db, 'kabutech/settings/setpoints'), {
      [key]: value
    }).then(() => {
      showToast({ type: 'success', text1: `${label || 'Target'} updated to ${value}${unit || ''}` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const toggleDevice = (key: string, state: boolean) => {
    if (isAuto) return;
    update(ref(db, `kabutech/settings/setpoints/devices`), {
      [key]: state
    }).then(() => {
      showToast({ type: 'success', text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${state ? 'ON' : 'OFF'}` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const setMode = (mode: 'auto' | 'manual') => {
    update(ref(db, 'kabutech/settings/setpoints'), {
      mode
    }).then(() => {
      showToast({ type: 'success', text1: `Switched to ${mode.toUpperCase()} Mode` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const tabs = [
    { id: 'temp' as TabId, label: 'Temperature', icon: 'thermometer', color: '#f97316', unit: '°C', min: 18, max: 35, step: 0.5, current: temp, target: targetTemp, optimal: '24-28', dbKey: 'temperature' },
    { id: 'hum' as TabId, label: 'Humidity', icon: 'water-opacity', color: '#3b82f6', unit: '%', min: 50, max: 95, step: 1, current: hum, target: targetHum, optimal: '80-90', dbKey: 'humidity' },
    { id: 'light' as TabId, label: 'Light Level', icon: 'white-balance-sunny', color: '#eab308', unit: 'Lx', min: 200, max: 800, step: 10, current: light, target: targetLight, optimal: '500-800', dbKey: 'light' },
    { id: 'co2' as TabId, label: 'CO2 Level', icon: 'molecule-co2', color: '#10b981', unit: 'ppm', min: 300, max: 1200, step: 10, current: co2, target: targetCO2, optimal: '< 800', dbKey: 'co2' },
  ];

  const [activeTab, setActiveTab] = useState<TabId>('temp');
  const activeTabData = tabs.find(t => t.id === activeTab)!;
  const activeTabDataRef = useRef(activeTabData);

  useEffect(() => {
    activeTabDataRef.current = activeTabData;
  }, [activeTabData]);

  const [localTarget, setLocalTarget] = useState<number>(activeTabData.target);

  useEffect(() => {
    setLocalTarget(activeTabData.target);
  }, [activeTabData.target, activeTab]);

  useEffect(() => {
    if (localTarget === activeTabData.target) return;
    const timeout = setTimeout(() => {
      updateSetpoint(activeTabData.dbKey, localTarget, activeTabData.label, activeTabData.unit);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localTarget]);

  const increment = () => {
    setLocalTarget(prev => {
      const data = activeTabDataRef.current;
      const next = prev + data.step;
      return next > data.max ? data.max : Number(next.toFixed(1));
    });
  };

  const decrement = () => {
    setLocalTarget(prev => {
      const data = activeTabDataRef.current;
      const next = prev - data.step;
      return next < data.min ? data.min : Number(next.toFixed(1));
    });
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startIncrement = () => {
    increment();
    timerRef.current = setInterval(increment, 150);
  };

  const startDecrement = () => {
    decrement();
    timerRef.current = setInterval(decrement, 150);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  // Device toggles list
  const deviceToggles = [
    { key: 'fans', label: 'FANS', icon: 'fan', active: devices.fans, color: '#3b82f6' },
    { key: 'misters', label: 'MISTERS', icon: 'water', active: devices.misters, color: '#0ea5e9' },
    { key: 'lights', label: 'LIGHTS', icon: 'lightbulb-on', active: devices.lights, color: '#eab308' },
    { key: 'co2', label: 'VALVE', icon: 'weather-windy', active: devices.co2, color: '#10b981' },
  ];

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      <ScrollView contentContainerStyle={tw`pb-32 pt-2`} showsVerticalScrollIndicator={false}>
        
        {/* Horizontal Tabs */}
        <View style={tw`mb-10 pl-4`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pr-4`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={tw`items-center justify-center mr-7 w-16`}
                >
                  <MaterialCommunityIcons 
                    name={tab.icon as any} 
                    size={28} 
                    color={isActive ? tab.color : (isDarkMode ? '#64748b' : '#94a3b8')} 
                  />
                  <Text style={[tw`text-[11px] mt-2 ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`, {fontFamily: 'PlusJakartaSans_700Bold'}]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                  {/* Subtle active indicator dot */}
                  {isActive && <View style={[tw`w-1 h-1 rounded-full mt-1.5`, {backgroundColor: tab.color}]} />}
                </TouchableOpacity>
              )
            })}
            
            <TouchableOpacity
              onPress={() => navigation.navigate('DeviceSchedules')}
              style={tw`items-center justify-center mr-7 w-16`}
            >
              <MaterialCommunityIcons 
                name="calendar-clock" 
                size={28} 
                color={isDarkMode ? '#64748b' : '#94a3b8'} 
              />
              <Text style={[tw`text-[11px] mt-2 text-slate-500 dark:text-slate-500`, {fontFamily: 'PlusJakartaSans_700Bold'}]} numberOfLines={1}>
                Schedule
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Central Dial Area */}
        <CircularSlider 
          localTarget={localTarget} 
          activeTabData={activeTabData} 
          isDarkMode={isDarkMode} 
        />

        {/* Controls Row (-, Mode, +) */}
        <View style={tw`flex-row items-center justify-center px-4 mb-12 gap-3`}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPressIn={startDecrement}
            onPressOut={stopTimer}
            style={tw`w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 items-center justify-center bg-white dark:bg-slate-800 shadow-sm`}
          >
            <MaterialCommunityIcons name="minus" size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>

          <View style={tw`flex-row bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1`}>
            <TouchableOpacity 
              onPress={() => setMode('auto')}
              style={[tw`px-6 py-2.5 rounded-full`, isAuto ? tw`bg-[#10b981] shadow-sm` : tw`bg-transparent`]}
            >
              <Text style={[tw`text-[11px]`, isAuto ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5}]}>AUTO</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                if (isAuto) DeviceEventEmitter.emit('showManualOverrideModal');
              }}
              style={[tw`px-6 py-2.5 rounded-full`, !isAuto ? tw`bg-[#f59e0b] shadow-sm` : tw`bg-transparent`]}
            >
              <Text style={[tw`text-[11px]`, !isAuto ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5}]}>MANUAL</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPressIn={startIncrement}
            onPressOut={stopTimer}
            style={tw`w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 items-center justify-center bg-white dark:bg-slate-800 shadow-sm`}
          >
            <MaterialCommunityIcons name="plus" size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Bottom Device Toggles */}
        <View style={tw`px-6`}>
          {isAuto && (
            <View style={tw`bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex-row items-center gap-2 mb-4 mx-2`}>
              <MaterialCommunityIcons name="lock" size={16} color={isDarkMode ? '#34d399' : '#059669'} />
              <Text style={[tw`text-[10px] text-emerald-800 dark:text-emerald-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                Manual controls are locked in Auto Mode.
              </Text>
            </View>
          )}

          <View style={tw`flex-row justify-between w-full`}>
            {deviceToggles.map((device) => {
              const showActive = device.active;
              return (
                <TouchableOpacity
                  key={device.key}
                  disabled={isAuto}
                  onPress={() => toggleDevice(device.key, !device.active)}
                  style={[
                    tw`w-[22%] aspect-square rounded-2xl items-center justify-center border bg-[#eaeff5] dark:bg-[#1e293b] border-transparent`,
                    isAuto ? tw`opacity-50` : null
                  ]}
                >
                  <View style={tw`mb-2 p-1.5 rounded-full bg-transparent`}>
                    <MaterialCommunityIcons 
                      name={device.icon as any} 
                      size={26} 
                      color={showActive ? device.color : (isDarkMode ? '#64748b' : '#94a3b8')} 
                    />
                  </View>
                  <Text style={[tw`text-[9px] uppercase`, showActive ? {color: device.color, fontFamily: 'PlusJakartaSans_800ExtraBold'} : tw`text-slate-500 dark:text-slate-400 font-bold`, { letterSpacing: 0.5 }]}>
                    {device.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
