import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../../tailwind';
import { useSensors, useSettings, useAlerts } from '../../hooks/useFirebaseData';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import EnvironmentMetricsGrid from '../../components/EnvironmentMetricsGrid';
import ScoreArch from '../../components/ScoreArch';

export default function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  const alerts = useAlerts();

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  // Safe extraction of sensor values
  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 30.0;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 55.2;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 450;
  const light = typeof sensors.light === 'number' ? sensors.light : 490;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';

  // Calculate Environment Score (0 to 10)
  const tempScore = Math.max(0, 1 - Math.abs(temp - 24) / 10);
  const humScore = Math.max(0, 1 - Math.abs(hum - 80) / 30);
  const envScore = ((tempScore + humScore) / 2 * 10).toFixed(1);

  return (
    <View style={tw`flex-1 bg-[#dcfce7] dark:bg-[#0f172a]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      {!isReady ? (
        <View style={tw`flex-1 items-center justify-center bg-[#f0f9f4] dark:bg-[#020617]`}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
      <ScrollView style={tw`bg-[#f0f9f4] dark:bg-[#020617]`} contentContainerStyle={tw`pb-36`} showsVerticalScrollIndicator={false}>
        {/* Overscroll Filler to prevent white gap when bouncing */}
        <View style={[tw`absolute left-0 right-0 bg-[#dcfce7] dark:bg-[#0f172a]`, { top: -500, height: 500 }]} />


        {/* Arch Gradient Score Section - Read Only for Staff */}
        <ScoreArch
          envScore={envScore}
          isAuto={isAuto}
          isScheduled={isScheduled}
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
        <View style={tw`px-6 mt-6`}>
          <View style={tw`bg-slate-200/50 dark:bg-slate-800/80 rounded-[24px] p-5 pb-6 border border-white dark:border-slate-700`}>
            <View style={tw`flex-row justify-between items-center mb-4 mt-1`}>
              <Text style={[tw`text-sm text-slate-800 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                System Alerts
              </Text>
              <View style={unresolvedAlerts.length === 0 ? tw`bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full` : tw`bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full`}>
                <Text style={[tw`text-[9px] ${unresolvedAlerts.length === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'} uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {unresolvedAlerts.length === 0 ? 'All Clear' : `${unresolvedAlerts.length} Active`}
                </Text>
              </View>
            </View>

            {unresolvedAlerts.length === 0 ? (
              <View style={tw`bg-white/60 dark:bg-slate-900/50 rounded-2xl p-6 items-center justify-center border border-emerald-100/50 dark:border-slate-800 border-dashed`}>
                <MaterialCommunityIcons name="check-decagram" size={32} color="#10b981" style={tw`mb-2 opacity-80`} />
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 text-center leading-tight`, { fontFamily: 'PlusJakartaSans_400Regular' }]}>
                  No critical emergencies detected.
                </Text>
              </View>
            ) : (
              <View style={tw`gap-2`}>
                {unresolvedAlerts.slice(0, 3).map((alert, idx) => (
                  <View key={idx} style={tw`bg-white dark:bg-slate-900/80 rounded-xl p-3 border border-red-100 dark:border-red-900/30 flex-row items-center gap-3 shadow-sm`}>
                    <View style={tw`w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center`}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ef4444" />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-sm text-gray-800 dark:text-slate-200 font-bold`]}>{alert.title || 'System Alert'}</Text>
                      <Text style={tw`text-[10px] text-gray-500 dark:text-slate-400`} numberOfLines={1}>{alert.message || 'Action required.'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Camera Feed */}
        <View style={tw`px-5 mt-6 mb-8`}>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
            style={tw`w-full h-[220px] bg-[#0d3d1e] rounded-3xl overflow-hidden shadow-md relative border border-transparent dark:border-slate-800`}
            onPress={() => navigation.navigate('LiveFarm' as never)}
            activeOpacity={0.8}
          >
            {/* Background Image */}
            <Image
              source={require('../../../assets/mushroom_feed.png')}
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
      )}
    </View>
  );
}
