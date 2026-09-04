import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../../tailwind';
import { useSensors, useSettings, useAlerts, calculateEnvironmentScore } from '../../hooks/useFirebaseData';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import CriticalSystemAlerts from '../../components/CriticalSystemAlerts';
import LiveFarmCard from '../../components/LiveFarmCard';
import EnvironmentMetricsGrid from '../../components/EnvironmentMetricsGrid';
import ScoreArch from '../../components/ScoreArch';
import HomeScreenSkeleton from '../../components/skeletons/HomeScreenSkeleton';
import { computeScheduledDevicesState } from '../../utils/scheduleLogic';

export default function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  const alerts = useAlerts();

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
  const light = typeof sensors.light === 'number' ? sensors.light : 490;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 650;

  // Real-time system mode configured by Admin
  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';

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

  const envScore = calculateEnvironmentScore(temp, hum, light, co2);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScreenHeader />

      {!isReady ? (
        <HomeScreenSkeleton />
      ) : (
      <ScrollView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`} contentContainerStyle={tw`pb-36`} showsVerticalScrollIndicator={false}>
        {/* Overscroll Filler */}
        <View style={[tw`absolute left-0 right-0 bg-[#f0f9f4] dark:bg-[#020617]`, { top: -500, height: 500 }]} />
        
        {/* Top Arch and Score (Staff view - Read Only) */}
        <ScoreArch 
          envScore={envScore}
          isAuto={isAuto}
          isScheduled={isScheduled}
          isDarkMode={isDarkMode}
          fansActive={fansActive}
          misterActive={misterActive}
          lightActive={lightActive}
          toggleDevice={() => { }} // No-op for staff
          navigation={navigation}
          readOnly={true}
        />

        {/* Health Metrics (2x2 Grid) */}
        <EnvironmentMetricsGrid temp={temp} hum={hum} light={light} co2={co2} navigation={navigation} />

        {/* Critical System Alerts */}
        <CriticalSystemAlerts alerts={alerts} onAlertPress={() => navigation.navigate('Analytics' as never)} />

        {/* Live Farm Video Stream */}
        <LiveFarmCard navigation={navigation} />

      </ScrollView>
      )}
    </View>
  );
}
