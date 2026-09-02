import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useSensors, useSettings, useFirebaseConnection, useAlerts, calculateEnvironmentScore } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import AiInsightModal from '../components/AiInsightModal';
import CriticalSystemAlerts from '../components/CriticalSystemAlerts';
import LiveFarmCard from '../components/LiveFarmCard';
import EnvironmentMetricsGrid from '../components/EnvironmentMetricsGrid';
import ScoreArch from '../components/ScoreArch';
import HomeScreenSkeleton from '../components/skeletons/HomeScreenSkeleton';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { computeScheduledDevicesState } from '../utils/scheduleLogic';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();
  const isConnected = useFirebaseConnection();
  const alerts = useAlerts();
  const [isInsightModalVisible, setIsInsightModalVisible] = useState(false);
  
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => setIsReady(true));
      return () => cancelIdleCallback(handle);
    }
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  // Safe extraction of sensor values
  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 30.0;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 55.2;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 450;
  const light = typeof sensors.light === 'number' ? sensors.light : 490;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';
  const isLocked = isAuto || isScheduled;
  
  const rawDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false };
  const [devices, setDevices] = useState(rawDevices);

  useEffect(() => {
    if (isScheduled) {
      const interval = setInterval(() => {
        setDevices({ ...rawDevices, ...computeScheduledDevicesState(settings?.schedules) });
      }, 5000);
      setDevices({ ...rawDevices, ...computeScheduledDevicesState(settings?.schedules) });
      return () => clearInterval(interval);
    } else {
      setDevices(rawDevices);
    }
  }, [isScheduled, settings?.schedules, rawDevices]);
  
  const fansActive = devices.fans;
  const misterActive = devices.misters;
  const lightActive = devices.lights;

  const toggleDevice = async (key: string, currentState: boolean) => {
    if (isLocked) return; // User cannot toggle while in auto or scheduled mode
    const newState = !currentState;
    try {
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        [key]: newState
      });
      showToast({ type: 'success', text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${newState ? 'ON' : 'OFF'}` });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: `Failed to turn ${newState ? 'ON' : 'OFF'} ${key}.` });
    }
  };

  // Calculate Environment Score (0 to 10) based on all 4 environmental metrics
  const envScore = calculateEnvironmentScore(temp, hum, light, co2);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScreenHeader />

      {!isReady ? (
        <HomeScreenSkeleton />
      ) : (
      <ScrollView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`} contentContainerStyle={tw`pb-36`} showsVerticalScrollIndicator={false}>
        {/* Overscroll Filler to prevent white gap when bouncing */}
        <View style={[tw`absolute left-0 right-0 bg-[#f0f9f4] dark:bg-[#020617]`, { top: -500, height: 500 }]} />


        {/* Arch Gradient Score Section */}
        <ScoreArch 
          envScore={envScore} 
          isAuto={isAuto} 
          isScheduled={isScheduled}
          isDarkMode={isDarkMode} 
          fansActive={fansActive} 
          misterActive={misterActive} 
          lightActive={lightActive} 
          toggleDevice={toggleDevice} 
          navigation={navigation} 
        />

        {/* Health Metrics (2x2 Grid) */}
        <EnvironmentMetricsGrid temp={temp} hum={hum} light={light} co2={co2} navigation={navigation} />

        {/* Critical System Alerts */}
        <CriticalSystemAlerts alerts={alerts} onAlertPress={() => navigation.navigate('Analytics' as never)} />

        {/* Live Farm Video Stream */}
        <LiveFarmCard navigation={navigation} />

      </ScrollView>
      )}
      
      {/* AI Insight Modal */}
      <AiInsightModal 
        visible={isInsightModalVisible} 
        onClose={() => setIsInsightModalVisible(false)} 
      />
    </View>
  );
}
