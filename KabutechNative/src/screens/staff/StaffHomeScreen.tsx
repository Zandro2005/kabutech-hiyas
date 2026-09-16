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
import { useSensorHealth } from '../../hooks/useSensorHealth';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import CriticalSystemAlerts from '../../components/CriticalSystemAlerts';
import LiveFarmCard from '../../components/LiveFarmCard';
import EnvironmentMetricsGrid from '../../components/EnvironmentMetricsGrid';
import WaterLevelCard from '../../components/WaterLevelCard';
import ScoreArch from '../../components/ScoreArch';
import HomeScreenSkeleton from '../../components/skeletons/HomeScreenSkeleton';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../../utils/scheduleLogic';

export default function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  const alerts = useAlerts();
  const health = useSensorHealth();

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
  const waterLevel = typeof sensors.waterLevel === 'number' ? sensors.waterLevel : 75;

  // Real-time system mode configured by Admin
  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';

  const rawDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false };
  const [devices, setDevices] = useState(rawDevices);

  useEffect(() => {
    if (isScheduled) {
      const interval = setInterval(() => {
        setDevices(computeScheduledDevicesState(settings?.schedules));
      }, 3000);
      setDevices(computeScheduledDevicesState(settings?.schedules));
      return () => clearInterval(interval);
    } else if (isAuto) {
      const interval = setInterval(() => {
        setDevices(computeAutoDevicesState(sensors, settings?.setpoints));
      }, 3000);
      setDevices(computeAutoDevicesState(sensors, settings?.setpoints));
      return () => clearInterval(interval);
    } else {
      setDevices(rawDevices);
    }
  }, [isScheduled, isAuto, settings?.schedules, settings?.setpoints, sensors, rawDevices]);

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

        {/* Sensor / Controller Health Banner */}
        {health.hasAnyError && (
          <View style={tw`mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex-row items-center gap-3`}>
            <MaterialCommunityIcons 
              name={!health.isControllerOnline ? "wifi-alert" : "alert-rhombus-outline"} 
              size={22} 
              color="#f59e0b" 
            />
            <View style={tw`flex-1`}>
              <Text style={[tw`text-xs text-amber-800 dark:text-amber-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {!health.isControllerOnline 
                  ? "Grow House Controller Offline" 
                  : "Sensor Disconnected / Malfunction"}
              </Text>
              <Text style={[tw`text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                {!health.isControllerOnline
                  ? `No signal from ESP32 for ${health.offlineSeconds}s. Check controller power and Wi-Fi.`
                  : health.faultySensorsList.length > 0 
                    ? `Sensor disconnected: ${health.faultySensorsList.join(', ')}. Please check wiring.`
                    : "One or more sensors are returning invalid readings. Check sensor wiring."}
              </Text>
            </View>
          </View>
        )}

        {/* Health Metrics (2x2 Grid) */}
        <EnvironmentMetricsGrid temp={temp} hum={hum} light={light} co2={co2} navigation={navigation} />

        {/* Water Reservoir Level Indicator */}
        <WaterLevelCard waterLevel={waterLevel} navigation={navigation} />

        {/* Critical System Alerts */}
        <CriticalSystemAlerts alerts={alerts} onAlertPress={() => navigation.navigate('Analytics' as never)} />

        {/* Live Farm Video Stream */}
        <LiveFarmCard navigation={navigation} />

      </ScrollView>
      )}
    </View>
  );
}
