import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticSelection } from '../utils/haptics';

import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

interface Props {
  temp: number;
  hum: number;
  light: number;
  co2: number;
  navigation: any;
}

export default React.memo(function EnvironmentMetricsGrid({ temp, hum, light, co2, navigation }: Props) {
  const { isDarkMode } = useTheme();
  const { isSmallDevice } = useResponsive();
  const { profile } = useAuth();
  const isStaff = profile?.role === 'staff';

  // Metric status & percentage calculations
  const tempStatus = React.useMemo(() => {
    if (temp >= 22 && temp <= 28.5) return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
    if (temp > 28.5) return { label: 'Warm', color: '#f97316', lightBg: '#fff7ed' };
    return { label: 'Cool', color: '#3b82f6', lightBg: '#eff6ff' };
  }, [temp]);
  const tempPercent = Math.min(100, Math.max(8, ((temp - 15) / (35 - 15)) * 100));

  const humStatus = React.useMemo(() => {
    if (hum >= 75 && hum <= 92) return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
    if (hum < 75) return { label: 'Low', color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'High', color: '#0ea5e9', lightBg: '#f0f9ff' };
  }, [hum]);
  const humPercent = Math.min(100, Math.max(8, ((hum - 30) / (100 - 30)) * 100));

  const lightStatus = React.useMemo(() => {
    if (light >= 400 && light <= 850) return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
    if (light < 400) return { label: 'Dim', color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'Bright', color: '#eab308', lightBg: '#fefce8' };
  }, [light]);
  const lightPercent = Math.min(100, Math.max(8, (light / 1000) * 100));

  const co2Status = React.useMemo(() => {
    if (co2 <= 750) return { label: 'Good', color: '#10b981', lightBg: '#ecfdf5' };
    if (co2 <= 950) return { label: 'Moderate', color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'Elevated', color: '#ef4444', lightBg: '#fef2f2' };
  }, [co2]);
  const co2Percent = Math.min(100, Math.max(8, ((co2 - 300) / (1200 - 300)) * 100));

  const handleCardPress = (tabKey: 'temp' | 'hum' | 'light' | 'co2') => {
    hapticSelection();
    if (isStaff) {
      navigation.navigate('Analytics', { metric: tabKey, tab: tabKey });
    } else {
      navigation.navigate('Main', {
        screen: 'Controls',
        params: { tab: tabKey }
      });
    }
  };

  const metrics = [
    {
      id: 'temp' as const,
      name: 'Temperature',
      value: temp,
      unit: '°C',
      icon: 'thermometer' as const,
      iconColor: '#f97316',
      iconBg: 'bg-orange-50 dark:bg-orange-500/15',
      accentColor: '#f97316',
      status: tempStatus,
      percent: tempPercent,
    },
    {
      id: 'hum' as const,
      name: 'Humidity',
      value: hum,
      unit: '%',
      icon: 'water-percent' as const,
      iconColor: '#0ea5e9',
      iconBg: 'bg-sky-50 dark:bg-sky-500/15',
      accentColor: '#0ea5e9',
      status: humStatus,
      percent: humPercent,
    },
    {
      id: 'light' as const,
      name: 'Light Level',
      value: light,
      unit: 'lx',
      icon: 'white-balance-sunny' as const,
      iconColor: '#f59e0b',
      iconBg: 'bg-amber-50 dark:bg-amber-500/15',
      accentColor: '#f59e0b',
      status: lightStatus,
      percent: lightPercent,
    },
    {
      id: 'co2' as const,
      name: 'CO2 Level',
      value: co2,
      unit: 'ppm',
      icon: 'molecule-co2' as const,
      iconColor: '#10b981',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      accentColor: '#10b981',
      status: co2Status,
      percent: co2Percent,
    },
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-6`}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center mb-3.5`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Text style={[tw`text-base sm:text-lg tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
            Environment Metrics
          </Text>
          <View style={tw`bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60`}>
            <Text style={[tw`text-[10px] text-emerald-700 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>4 Active</Text>
          </View>
        </View>

        <TouchableOpacity 
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => {
            hapticSelection();
            navigation.navigate('Analytics' as never);
          }}
          style={tw`flex-row items-center py-1 px-2 rounded-lg`}
        >
          <Text style={[tw`text-xs text-[#10b981] mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Analytics</Text>
          <Ionicons name="chevron-forward" size={13} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* 2x2 Modern Widget Grid */}
      <View style={tw`flex-row flex-wrap justify-between gap-y-3`}>
        {metrics.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => handleCardPress(item.id)}
            style={[
              tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm justify-between`,
              { width: '48.5%', minHeight: isSmallDevice ? 132 : 142 }
            ]}
          >
            {/* Top Bar: Icon chip + Status badge */}
            <View style={tw`flex-row justify-between items-center mb-2.5`}>
              <View style={tw`w-8 h-8 rounded-xl ${item.iconBg} items-center justify-center`}>
                <MaterialCommunityIcons name={item.icon} size={18} color={item.iconColor} />
              </View>
              <View 
                style={[
                  tw`flex-row items-center px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/60`,
                  { backgroundColor: isDarkMode ? '#1e293b' : item.status.lightBg }
                ]}
              >
                <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: item.status.color }]} />
                <Text 
                  style={[
                    tw`text-[9.5px]`,
                    { 
                      fontFamily: 'PlusJakartaSans_700Bold',
                      color: isDarkMode ? '#e2e8f0' : (item.status.color === '#eab308' ? '#b45309' : item.status.color)
                    }
                  ]}
                >
                  {item.status.label}
                </Text>
              </View>
            </View>

            {/* Middle: Label & Big Hero Value */}
            <View>
              <Text numberOfLines={1} style={[tw`text-[10.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {item.name}
              </Text>
              <View style={tw`flex-row items-baseline mt-1`}>
                <Text style={[tw`text-slate-900 dark:text-white`, { fontSize: isSmallDevice ? 27 : 31, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.6 }]}>
                  {item.value}
                </Text>
                <Text style={[tw`text-sm text-slate-400 dark:text-slate-500 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  {item.unit}
                </Text>
              </View>
            </View>

            {/* Bottom: Modern Slim Track Bar */}
            <View style={tw`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3`}>
              <View style={[tw`h-full rounded-full`, { width: `${item.percent}%`, backgroundColor: item.accentColor }]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});
