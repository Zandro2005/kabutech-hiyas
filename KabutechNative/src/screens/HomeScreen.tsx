import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import AiInsightModal from '../components/AiInsightModal';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { sensors, isConnected, settings } = useFirebaseData();
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

        {/* Arch Gradient Score Section (Header & Score combined) */}
        <View style={tw`w-full items-center mt-2 relative z-0`}>
          <View style={{ width: width * 1.5, height: width * 0.95, overflow: 'hidden', alignItems: 'center' }}>
            <LinearGradient
              colors={isDarkMode ? ['#0f172a', '#020617'] : ['#dcfce7', '#f0f9f4']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[tw`absolute bottom-0`, { width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75 }]}
            />
            
            {/* Top Header - "Hi, Admin" */}
            <View style={[tw`flex-row justify-between items-center px-6 pt-4 pb-2 z-10`, { width: width }]}>
              <TouchableOpacity 
                style={tw`flex-row items-center gap-3`} 
                onPress={() => navigation.navigate('Profile' as never)}
              >
                <View style={tw`w-12 h-12 bg-slate-200 rounded-full overflow-hidden items-center justify-center border-2 border-white shadow-sm`}>
                  <MaterialCommunityIcons name="account" size={32} color="#64748b" />
                </View>
                <View>
                  <Text style={[tw`text-lg text-slate-800 dark:text-white tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                    Hi, Admin
                  </Text>
                  <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                    Welcome Back!!
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Live Pill */}
              <View style={tw`border border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-slate-800/40 rounded-full px-3 py-1.5 flex-row items-center gap-2 shadow-sm`}>
                <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
                <Text style={[tw`text-xs text-emerald-800 dark:text-emerald-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Live Sim</Text>
              </View>
            </View>

            {/* Score Content inside the arch */}
            <View style={tw`absolute bottom-16 items-center`}>
              <Text style={[tw`text-xs text-slate-700 dark:text-slate-300 tracking-widest mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Environment Score</Text>
              <View style={tw`flex-row items-baseline mb-2`}>
                <Text style={[tw`text-[52px] text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{envScore}</Text>
                <Text style={[tw`text-3xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>/10</Text>
              </View>

              {/* Progress Bar */}
              <View style={tw`w-48 h-3 bg-emerald-200/50 dark:bg-slate-700 rounded-full flex-row overflow-hidden mb-3`}>
                <View style={[tw`h-full bg-emerald-500 rounded-full`, { width: `${parseFloat(envScore) * 10}%` }]} />
              </View>

              <Text style={[tw`text-xs text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Overall conditions are optimal</Text>
              <View style={tw`flex-row items-center gap-2 mt-1.5`}>
                <Text style={[tw`text-[10px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>▲ +6% VS last Week</Text>
                
                {/* Auto/Manual Mode Indicator */}
                <View style={tw`px-2 py-0.5 rounded-md ${isAuto ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'} border ${isAuto ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}`}>
                  <Text style={[tw`text-[9px] uppercase ${isAuto ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1 }]}>
                    {isAuto ? 'AUTO' : 'MANUAL'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3 Circular Control Icons Overlapping the Arch Bottom */}
          <View style={tw`flex-row justify-center gap-5 w-full z-20 relative -mt-6`}>
            {[
              { icon: 'fan', active: fansActive, key: 'fans' },
              { icon: 'water', active: misterActive, key: 'misters' },
              { icon: 'lightbulb-on', active: lightActive, key: 'lights' }
            ].map((item, index) => {
              const showActive = item.active;
              return (
              <TouchableOpacity 
                key={index} 
                disabled={isAuto}
                onPress={() => toggleDevice(item.key, item.active)}
                style={tw`w-14 h-14 rounded-full items-center justify-center shadow-sm border ${
                  showActive 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' 
                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
                } ${isAuto ? 'opacity-50' : ''}`}
              >
                <MaterialCommunityIcons 
                  name={item.icon as any} 
                  size={24} 
                  color={showActive ? '#10b981' : (isDarkMode ? '#94a3b8' : '#64748b')} 
                />
              </TouchableOpacity>
            )})}
          </View>
        </View>

        {/* Health Metrics (2x2 Grid) */}
        <View style={tw`px-6 pt-8`}>
          <View style={tw`flex-row justify-between items-end mb-4`}>
            <Text style={[tw`text-lg text-slate-800 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Environment Metrics
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Controls' as never)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row flex-wrap justify-between gap-y-4`}>
            {/* Temp Card */}
            <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
              <View style={tw`flex-row justify-between items-start mb-6`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Temperature</Text>
                <MaterialCommunityIcons name="thermometer" size={18} color="#ef4444" />
              </View>
              <View style={tw`flex-row items-baseline gap-1`}>
                <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{temp}</Text>
                <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>°C</Text>
              </View>
            </View>

            {/* Hum Card */}
            <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
              <View style={tw`flex-row justify-between items-start mb-6`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Humidity</Text>
                <MaterialCommunityIcons name="water-percent" size={20} color="#0ea5e9" />
              </View>
              <View style={tw`flex-row items-baseline gap-1`}>
                <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{hum}</Text>
                <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>%</Text>
              </View>
            </View>

            {/* Light Card */}
            <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
              <View style={tw`flex-row justify-between items-start mb-6`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Light Level</Text>
                <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#eab308" />
              </View>
              <View style={tw`flex-row items-baseline gap-1`}>
                <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{light}</Text>
                <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>lx</Text>
              </View>
            </View>

            {/* CO2 Card */}
            <View style={[tw`bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-700`, { width: '47%' }]}>
              <View style={tw`flex-row justify-between items-start mb-6`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>CO2 Level</Text>
                <MaterialCommunityIcons name="molecule-co2" size={22} color="#a855f7" />
              </View>
              <View style={tw`flex-row items-baseline gap-1`}>
                <Text style={[tw`text-2xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{co2}</Text>
                <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>ppm</Text>
              </View>
            </View>
          </View>
        </View>

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
