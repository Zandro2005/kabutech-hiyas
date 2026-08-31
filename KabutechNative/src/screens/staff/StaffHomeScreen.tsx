import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
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

export default function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const alerts = useAlerts();

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Safe extraction of sensor values
  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 30.0;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 55.2;
  const light = typeof sensors.light === 'number' ? sensors.light : 490;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 650;

  const envScore = calculateEnvironmentScore(temp, hum, light, co2);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader />

      {!isReady ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
      <ScrollView contentContainerStyle={tw`pb-36`} showsVerticalScrollIndicator={false}>
        
        {/* Top Arch and Score (Staff view - Read Only) */}
        <ScoreArch 
          envScore={envScore}
          isAuto={false}
          isScheduled={false}
          isDarkMode={isDarkMode}
          fansActive={false}
          misterActive={false}
          lightActive={false}
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
