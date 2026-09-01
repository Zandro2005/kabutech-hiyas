import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';

interface EnvironmentOverviewCardProps {
  temp: number;
  hum: number;
  co2: number;
  light: number;
}

export default function EnvironmentOverviewCard({ temp, hum, co2, light }: EnvironmentOverviewCardProps) {
  const { isDarkMode } = useTheme();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const MetricItem = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
    <View style={tw`items-center flex-1`}>
      <View style={[tw`w-10 h-10 rounded-full items-center justify-center mb-2`, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[tw`text-sm text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{value}</Text>
      <Text style={[tw`text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>{label}</Text>
    </View>
  );

  return (
    <View style={tw`w-full mb-6`}>
      <LinearGradient
        colors={isDarkMode ? ['#0f172a', '#1e293b'] : ['#ffffff', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`w-full rounded-[32px] p-6 shadow-xl border ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}
      >
        {/* Top Header */}
        <View style={tw`flex-row justify-between items-center mb-6`}>
          <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            Live Environment
          </Text>
          
          <View style={tw`bg-emerald-500/10 px-3 py-1.5 rounded-full flex-row items-center gap-2`}>
            <Animated.View style={[tw`w-1.5 h-1.5 bg-emerald-500 rounded-full`, { opacity: pulseAnim }]} />
            <Text style={[tw`text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Online
            </Text>
          </View>
        </View>

        {/* Primary Metric: Temperature */}
        <View style={tw`flex-row items-center justify-between mb-8 px-2`}>
          <View>
            <View style={tw`flex-row items-start`}>
              <Text style={[tw`text-slate-800 dark:text-white text-[64px] leading-none tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                {temp}
              </Text>
              <Text style={[tw`text-slate-400 dark:text-slate-500 text-2xl mt-2 ml-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                °C
              </Text>
            </View>
            <Text style={[tw`text-slate-400 dark:text-slate-500 text-xs mt-2 tracking-wide`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Average Temperature
            </Text>
          </View>

          {/* Glowing Temp Icon */}
          <View style={tw`w-20 h-20 rounded-full items-center justify-center relative`}>
            <LinearGradient
              colors={isDarkMode ? ['#7f1d1d', '#450a0a'] : ['#fee2e2', '#fecaca']}
              style={tw`absolute inset-0 rounded-full opacity-60`}
            />
            <MaterialCommunityIcons name="thermometer" size={42} color="#ef4444" />
          </View>
        </View>

        {/* Secondary Metrics Grid */}
        <View style={tw`flex-row justify-between bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border ${isDarkMode ? 'border-slate-700/50' : 'border-gray-100'}`}>
          <MetricItem icon="water-percent" label="Humidity" value={`${hum}%`} color="#10b981" />
          
          {/* Divider */}
          <View style={tw`w-[1px] h-full bg-gray-200 dark:bg-slate-700/50`} />
          
          <MetricItem icon="white-balance-sunny" label="Light" value={`${light} lx`} color="#0ea5e9" />
          
          {/* Divider */}
          <View style={tw`w-[1px] h-full bg-gray-200 dark:bg-slate-700/50`} />
          
          <MetricItem icon="molecule-co2" label="CO2" value={`${co2} ppm`} color="#a855f7" />
        </View>
      </LinearGradient>
    </View>
  );
}
