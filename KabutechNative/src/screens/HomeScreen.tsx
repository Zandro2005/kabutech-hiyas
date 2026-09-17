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
import WaterLevelCard from '../components/WaterLevelCard';
import ScoreArch from '../components/ScoreArch';
import HomeScreenSkeleton from '../components/skeletons/HomeScreenSkeleton';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../utils/scheduleLogic';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import DashboardWarningBadges from '../components/DashboardWarningBadges';
import { hapticMedium, hapticSelection } from '../utils/haptics';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();
  const isConnected = useFirebaseConnection();
  const alerts = useAlerts();
  const [isInsightModalVisible, setIsInsightModalVisible] = useState(false);
  const health = useSensorHealth();
  const envAlerts = useEnvironmentAlerts();
  
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
  const waterLevel = typeof sensors.waterLevel === 'number' ? sensors.waterLevel : 75;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';
  const isLocked = isAuto || isScheduled;
  
  const rawDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false, co2: false };
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
  const valveActive = devices.co2;

  const toggleDevice = async (key: string, currentState: boolean) => {
    if (isLocked) return; // User cannot toggle while in auto or scheduled mode
    const newState = !currentState;
    hapticMedium();

    const deviceName = key === 'co2' ? 'Valve' : key.charAt(0).toUpperCase() + key.slice(1);

    // ⚡ 0ms Optimistic UI update
    setDevices(prev => ({ ...prev, [key]: newState }));

    const startTime = Date.now();
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    // Notify user if command takes longer than 2.5 seconds to reach controller
    delayTimer = setTimeout(() => {
      showToast({
        type: 'info',
        text1: 'Slow Response',
        text2: `Sending command to ${deviceName}...`,
        duration: 3500,
      });
    }, 2500);

    try {
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        [key]: newState
      });
      if (delayTimer) clearTimeout(delayTimer);

      const elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        showToast({
          type: 'success',
          text1: `${deviceName} Switched ${newState ? 'ON' : 'OFF'}`,
          text2: `Delivered in ${(elapsed / 1000).toFixed(1)}s`,
        });
      } else {
        showToast({ type: 'success', text1: `${deviceName} Switched ${newState ? 'ON' : 'OFF'}` });
      }
    } catch (error) {
      if (delayTimer) clearTimeout(delayTimer);
      setDevices(prev => ({ ...prev, [key]: currentState }));
      console.error(error);
      showToast({ 
        type: 'error', 
        text1: 'Command Failed', 
        text2: `Unable to switch ${deviceName}. Check connection.`,
        duration: 4000,
      });
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
          valveActive={valveActive}
          toggleDevice={toggleDevice} 
          navigation={navigation} 
          hasWarning={envAlerts.hasWarning}
          warningBanner={envAlerts.hasWarning ? <DashboardWarningBadges alerts={envAlerts.activeAlerts} /> : null}
        />

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
      
      {/* AI Insight Modal */}
      <AiInsightModal 
        visible={isInsightModalVisible} 
        onClose={() => setIsInsightModalVisible(false)} 
      />
    </View>
  );
}
