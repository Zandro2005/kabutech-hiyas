import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticSelection } from '../utils/haptics';

import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

import { useSensorHealth } from '../hooks/useSensorHealth';
import { useSettings } from '../hooks/useFirebaseData';

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
  const health = useSensorHealth();
  const settings = useSettings();

  const targetTemp = typeof settings?.setpoints?.temperature === 'number'
    ? settings.setpoints.temperature
    : parseFloat(settings?.setpoints?.temperature as any) || 28.0;

  const targetHum = typeof settings?.setpoints?.humidity === 'number'
    ? settings.setpoints.humidity
    : parseFloat(settings?.setpoints?.humidity as any) || 85;

  const targetLight = typeof settings?.setpoints?.light === 'number'
    ? settings.setpoints.light
    : parseFloat(settings?.setpoints?.light as any) || 580;

  const targetCO2 = typeof settings?.setpoints?.co2 === 'number'
    ? settings.setpoints.co2
    : parseFloat(settings?.setpoints?.co2 as any) || 690;

  // Metric status & percentage calculations
  const tempStatus = React.useMemo(() => {
    if (health.tempError) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Not Connected', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (temp > targetTemp + 4.0) return { label: 'Critical', color: '#ef4444', lightBg: '#fef2f2' };
    if (temp > targetTemp + 2.5) return { label: 'Warm', color: '#f97316', lightBg: '#fff7ed' };
    if (temp < targetTemp - 4.0) return { label: 'Cold', color: '#3b82f6', lightBg: '#eff6ff' };
    if (temp < targetTemp - 2.5) return { label: 'Cool', color: '#0ea5e9', lightBg: '#f0f9ff' };
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [temp, targetTemp, health.tempError, health.isControllerOnline]);
  const tempPercent = health.tempError ? 0 : Math.min(100, Math.max(8, ((temp - 15) / (35 - 15)) * 100));

  const humStatus = React.useMemo(() => {
    if (health.humError) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Not Connected', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    // Deviations strictly relative to user's configured target setpoint
    if (hum > targetHum + 10) {
      return { label: 'Excessive', color: '#ef4444', lightBg: '#fef2f2' };
    }
    if (hum > targetHum + 5) {
      return { label: 'High', color: '#f97316', lightBg: '#fff7ed' };
    }
    if (hum < targetHum - 12) {
      return { label: 'Very Low', color: '#ef4444', lightBg: '#fef2f2' };
    }
    if (hum < targetHum - 6) {
      return { label: 'Low', color: '#f59e0b', lightBg: '#fffbeb' };
    }
    // 1-2% drift (up to ±5%) is completely Optimal
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [hum, targetHum, health.humError, health.isControllerOnline]);
  const humPercent = health.humError ? 0 : Math.min(100, Math.max(8, ((hum - 30) / (100 - 30)) * 100));

  const lightStatus = React.useMemo(() => {
    if (health.lightError) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Not Connected', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (light > targetLight + 300) return { label: 'Bright', color: '#f97316', lightBg: '#fff7ed' };
    if (light < targetLight - 200) return { label: 'Dim', color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [light, targetLight, health.lightError, health.isControllerOnline]);
  const lightPercent = health.lightError ? 0 : Math.min(100, Math.max(8, (light / 1000) * 100));

  const co2Status = React.useMemo(() => {
    if (health.co2Error) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Not Connected', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (co2 > targetCO2 + 350) return { label: 'High', color: '#ef4444', lightBg: '#fef2f2' };
    if (co2 > targetCO2 + 150) return { label: 'Elevated', color: '#f97316', lightBg: '#fff7ed' };
    return { label: 'Good', color: '#10b981', lightBg: '#ecfdf5' };
  }, [co2, targetCO2, health.co2Error, health.isControllerOnline]);
  const co2Percent = health.co2Error ? 0 : Math.min(100, Math.max(8, ((co2 - 300) / (1200 - 300)) * 100));

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

  const activeCount = [!health.tempError, !health.humError, !health.lightError, !health.co2Error].filter(Boolean).length;

  // Alert highlight only when deviating beyond target setpoint tolerance (1-2% drift is not an alert)
  const isHumAlert = hum > targetHum + 5 || hum < targetHum - 6;
  const humAlertColor = hum > targetHum + 10 || hum < targetHum - 12 ? '#ef4444' : (hum > targetHum + 5 ? '#f97316' : '#f59e0b');

  const metrics = [
    {
      id: 'temp' as const,
      name: 'Temperature',
      value: health.tempError ? '--' : temp,
      unit: '°C',
      icon: (health.tempError ? 'alert-circle-outline' : 'thermometer') as any,
      iconColor: health.tempError ? '#f43f5e' : '#f97316',
      iconBg: health.tempError ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-orange-50 dark:bg-orange-500/15',
      accentColor: health.tempError ? '#f43f5e' : '#f97316',
      status: tempStatus,
      percent: tempPercent,
      hasError: health.tempError,
    },
    {
      id: 'hum' as const,
      name: 'Humidity',
      value: health.humError ? '--' : hum,
      unit: '%',
      icon: (health.humError ? 'alert-circle-outline' : 'water-percent') as any,
      iconColor: health.humError ? '#f43f5e' : (isHumAlert ? humAlertColor : '#0ea5e9'),
      iconBg: health.humError ? 'bg-rose-50 dark:bg-rose-500/15' : (isHumAlert ? 'bg-orange-50 dark:bg-orange-500/15' : 'bg-sky-50 dark:bg-sky-500/15'),
      accentColor: health.humError ? '#f43f5e' : (isHumAlert ? humAlertColor : '#0ea5e9'),
      status: humStatus,
      percent: humPercent,
      hasError: health.humError,
    },
    {
      id: 'light' as const,
      name: 'Light Level',
      value: health.lightError ? '--' : light,
      unit: 'lx',
      icon: (health.lightError ? 'alert-circle-outline' : 'white-balance-sunny') as any,
      iconColor: health.lightError ? '#f43f5e' : '#f59e0b',
      iconBg: health.lightError ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-amber-50 dark:bg-amber-500/15',
      accentColor: health.lightError ? '#f43f5e' : '#f59e0b',
      status: lightStatus,
      percent: lightPercent,
      hasError: health.lightError,
    },
    {
      id: 'co2' as const,
      name: 'CO2 Level',
      value: health.co2Error ? '--' : co2,
      unit: 'ppm',
      icon: (health.co2Error ? 'alert-circle-outline' : 'molecule-co2') as any,
      iconColor: health.co2Error ? '#f43f5e' : '#10b981',
      iconBg: health.co2Error ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-emerald-50 dark:bg-emerald-500/15',
      accentColor: health.co2Error ? '#f43f5e' : '#10b981',
      status: co2Status,
      percent: co2Percent,
      hasError: health.co2Error,
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
          <View style={tw`${activeCount === 4 ? 'bg-emerald-100/70 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60' : 'bg-rose-100/70 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/60'} px-2 py-0.5 rounded-full border`}>
            <Text style={[tw`text-[10px] ${activeCount === 4 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              {activeCount === 4 ? '4 Active' : (activeCount === 0 ? 'Disconnected' : `${activeCount}/4 Active`)}
            </Text>
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
              tw`rounded-[24px] p-4 border shadow-sm justify-between ${
                item.hasError 
                  ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' 
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
              }`,
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
                <Text style={[tw`${item.hasError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`, { fontSize: isSmallDevice ? 27 : 31, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.6 }]}>
                  {item.value}
                </Text>
                {item.hasError ? (
                  <Text style={[tw`text-xs text-rose-500 dark:text-rose-400 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    Fault
                  </Text>
                ) : (
                  <Text style={[tw`text-sm text-slate-400 dark:text-slate-500 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {item.unit}
                  </Text>
                )}
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
