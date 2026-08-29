import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useSensors, useSettings, useFirebaseConnection } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import AiInsightModal from '../components/AiInsightModal';
import EnvironmentMetricsGrid from '../components/EnvironmentMetricsGrid';
import ScoreArch from '../components/ScoreArch';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  const settings = useSettings();
  const isConnected = useFirebaseConnection();
  const [isInsightModalVisible, setIsInsightModalVisible] = useState(false);

  // Safe extraction of sensor values
  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 30.0;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 55.2;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 450;
  const light = typeof sensors.light === 'number' ? sensors.light : 490;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const devices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false };
  
  const fansActive = devices.fans;
  const misterActive = devices.misters;
  const lightActive = devices.lights;

  const toggleDevice = (key: string, currentState: boolean) => {
    if (isAuto) return; // User cannot toggle while in auto mode
    const newState = !currentState;
    update(ref(db, `kabutech/settings/setpoints/devices`), {
      [key]: newState
    }).then(() => {
      showToast({ type: 'success', text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${newState ? 'ON' : 'OFF'}` });
    });
  };

  // Calculate Environment Score (0 to 10)
  // Optimal temp is ~24C, humidity ~80%
  const tempScore = Math.max(0, 1 - Math.abs(temp - 24) / 10);
  const humScore = Math.max(0, 1 - Math.abs(hum - 80) / 30);
  const envScore = ((tempScore + humScore) / 2 * 10).toFixed(1);

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      <ScrollView contentContainerStyle={tw`pb-32`} showsVerticalScrollIndicator={false}>

        {/* Arch Gradient Score Section */}
        <ScoreArch 
          envScore={envScore} 
          isAuto={isAuto} 
          isDarkMode={isDarkMode} 
          fansActive={fansActive} 
          misterActive={misterActive} 
          lightActive={lightActive} 
          toggleDevice={toggleDevice} 
          navigation={navigation} 
        />

        {/* Health Metrics (2x2 Grid) */}
        <EnvironmentMetricsGrid temp={temp} hum={hum} light={light} co2={co2} navigation={navigation} />

        {/* Critical System Alerts (Restricted from general insights) */}
        <View style={tw`px-6 mt-6`}>
          <View style={tw`bg-slate-200/50 dark:bg-slate-800/80 rounded-[24px] p-5 pb-6 border border-white dark:border-slate-700`}>
            <View style={tw`flex-row justify-between items-center mb-4 mt-1`}>
              <Text style={[tw`text-sm text-slate-800 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Critical System Alerts
              </Text>
              <View style={tw`bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full`}>
                <Text style={[tw`text-[9px] text-emerald-700 dark:text-emerald-400 uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>All Clear</Text>
              </View>
            </View>

            <View style={tw`bg-white/60 dark:bg-slate-900/50 rounded-2xl p-6 items-center justify-center border border-emerald-100/50 dark:border-slate-800 border-dashed`}>
              <MaterialCommunityIcons name="check-decagram" size={32} color="#10b981" style={tw`mb-2 opacity-80`} />
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 text-center leading-tight`, { fontFamily: 'PlusJakartaSans_400Regular' }]}>
                No critical emergencies detected.{"\n"}Open the Analytics Hub for routine AI predictions.
              </Text>
            </View>
          </View>
        </View>

        {/* Camera Feed */}
        <View style={tw`px-5 mt-6 mb-8`}>
          <TouchableOpacity
            style={tw`w-full h-[220px] bg-[#0d3d1e] rounded-3xl overflow-hidden shadow-md relative border border-transparent dark:border-slate-800`}
            onPress={() => navigation.navigate('LiveFarm' as never)}
            activeOpacity={0.8}
          >
            {/* Background Image */}
            <Image
              source={require('../../assets/mushroom_feed.png')}
              style={tw`w-full h-full`}
            />

            {/* Emerald Green Tint Overlay */}
            <View style={tw`absolute inset-0 bg-[#064e3b] opacity-50`} />
            <LinearGradient
              colors={['transparent', 'rgba(2,44,34,0.95)']}
              style={tw`absolute inset-0`}
            />

            {/* Top Right: REC & CAM 01 */}
            <View style={tw`absolute top-4 right-4 flex-row items-center gap-2`}>
              <View style={tw`bg-[#ef4444] px-2 py-0.5 rounded-sm flex-row items-center gap-1`}>
                <View style={tw`w-1 h-1 bg-white rounded-full`} />
                <Text style={[tw`text-white text-[9px] uppercase`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5 }]}>REC</Text>
              </View>
              <Text style={[tw`text-white text-[11px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5 }]}>CAM 01</Text>
            </View>

            {/* Bottom Left: Title and Subtitle */}
            <View style={tw`absolute bottom-0 left-0 w-full p-5`}>
              <View style={tw`flex-row items-center gap-2 mb-1.5`}>
                <MaterialCommunityIcons name="video-outline" size={20} color="white" />
                <Text style={[tw`text-white text-[18px] tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>Live Farm View</Text>
              </View>
              <Text style={[tw`text-white/90 text-[10px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Monitor your growing room in real time.
              </Text>
              <Text style={[tw`text-white/90 text-[10px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Tap to open full screen.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
      
      {/* AI Insight Modal */}
      <AiInsightModal 
        visible={isInsightModalVisible} 
        onClose={() => setIsInsightModalVisible(false)} 
      />
    </SafeAreaView>
  );
}
