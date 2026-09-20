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

  // Target Setpoints from Firebase Settings
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

  // Explicit disconnected checks: covers both health flags and direct -999 sentinel
  const isTempDisconnected = health.tempError || temp === -999 || temp <= 0;
  const isHumDisconnected = health.humError || hum === -999 || hum <= 0;
  const isLightDisconnected = health.lightError || light === -999 || light < 0;
  const isCo2Disconnected = health.co2Error || co2 === -999 || co2 < 0;

  // Temperature: 15°C to 35°C
  const tempMin = 15;
  const tempMax = 35;
  const tempDiff = isTempDisconnected ? 0 : Number((temp - targetTemp).toFixed(1));
  const tempStatus = React.useMemo(() => {
    if (isTempDisconnected) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Fault', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (tempDiff > 4.0) return { label: `+${tempDiff.toFixed(1)}° High`, color: '#ef4444', lightBg: '#fef2f2' };
    if (tempDiff > 0.5) return { label: `+${tempDiff.toFixed(1)}° High`, color: '#f97316', lightBg: '#fff7ed' };
    if (tempDiff < -4.0) return { label: `-${Math.abs(tempDiff).toFixed(1)}° Low`, color: '#3b82f6', lightBg: '#eff6ff' };
    if (tempDiff < -0.5) return { label: `-${Math.abs(tempDiff).toFixed(1)}° Low`, color: '#0ea5e9', lightBg: '#f0f9ff' };
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [tempDiff, isTempDisconnected, health.isControllerOnline]);
  const tempTargetPercent = Math.min(95, Math.max(5, ((targetTemp - tempMin) / (tempMax - tempMin)) * 100));
  const tempPercent = isTempDisconnected ? 0 : Math.min(100, Math.max(4, ((temp - tempMin) / (tempMax - tempMin)) * 100));

  // Humidity: 40% to 100%
  const humMin = 40;
  const humMax = 100;
  const humDiff = isHumDisconnected ? 0 : Math.round(hum - targetHum);
  const humStatus = React.useMemo(() => {
    if (isHumDisconnected) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Fault', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (humDiff > 10) return { label: `+${humDiff}% High`, color: '#ef4444', lightBg: '#fef2f2' };
    if (humDiff > 2) return { label: `+${humDiff}% High`, color: '#f97316', lightBg: '#fff7ed' };
    if (humDiff < -12) return { label: `-${Math.abs(humDiff)}% Low`, color: '#ef4444', lightBg: '#fef2f2' };
    if (humDiff < -2) return { label: `-${Math.abs(humDiff)}% Low`, color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [humDiff, isHumDisconnected, health.isControllerOnline]);
  const humTargetPercent = Math.min(95, Math.max(5, ((targetHum - humMin) / (humMax - humMin)) * 100));
  const humPercent = isHumDisconnected ? 0 : Math.min(100, Math.max(4, ((hum - humMin) / (humMax - humMin)) * 100));

  // Light: 100 to 1000 lx
  const lightMin = 100;
  const lightMax = 1000;
  const lightDiff = isLightDisconnected ? 0 : Math.round(light - targetLight);
  const lightStatus = React.useMemo(() => {
    if (isLightDisconnected) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Fault', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (lightDiff > 300) return { label: `+${lightDiff} High`, color: '#f97316', lightBg: '#fff7ed' };
    if (lightDiff < -200) return { label: `-${Math.abs(lightDiff)} Low`, color: '#f59e0b', lightBg: '#fffbeb' };
    return { label: 'Optimal', color: '#10b981', lightBg: '#ecfdf5' };
  }, [lightDiff, isLightDisconnected, health.isControllerOnline]);
  const lightTargetPercent = Math.min(95, Math.max(5, ((targetLight - lightMin) / (lightMax - lightMin)) * 100));
  const lightPercent = isLightDisconnected ? 0 : Math.min(100, Math.max(4, ((light - lightMin) / (lightMax - lightMin)) * 100));

  // CO2: 300 to 1200 ppm
  const co2Min = 300;
  const co2Max = 1200;
  const co2Diff = isCo2Disconnected ? 0 : Math.round(co2 - targetCO2);
  const co2Status = React.useMemo(() => {
    if (isCo2Disconnected) {
      return { 
        label: !health.isControllerOnline ? 'Offline' : 'Fault', 
        color: '#f43f5e', 
        lightBg: '#fff1f2' 
      };
    }
    if (co2Diff > 350) return { label: `+${co2Diff} High`, color: '#ef4444', lightBg: '#fef2f2' };
    if (co2Diff > 150) return { label: `+${co2Diff} High`, color: '#f97316', lightBg: '#fff7ed' };
    return { label: 'Good', color: '#10b981', lightBg: '#ecfdf5' };
  }, [co2Diff, isCo2Disconnected, health.isControllerOnline]);
  const co2TargetPercent = Math.min(95, Math.max(5, ((targetCO2 - co2Min) / (co2Max - co2Min)) * 100));
  const co2Percent = isCo2Disconnected ? 0 : Math.min(100, Math.max(4, ((co2 - co2Min) / (co2Max - co2Min)) * 100));

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

  const activeCount = [!isTempDisconnected, !isHumDisconnected, !isLightDisconnected, !isCo2Disconnected].filter(Boolean).length;

  const isHumAlert = humDiff > 5 || humDiff < -6;
  const humAlertColor = humDiff > 10 || humDiff < -12 ? '#ef4444' : (humDiff > 5 ? '#f97316' : '#f59e0b');

  const metrics = [
    {
      id: 'temp' as const,
      name: 'Temperature',
      value: isTempDisconnected ? '--' : temp,
      unit: '°C',
      icon: (isTempDisconnected ? 'alert-circle-outline' : 'thermometer') as any,
      iconColor: isTempDisconnected ? '#f43f5e' : (tempStatus.label === 'Optimal' ? '#10b981' : tempStatus.color),
      iconBg: isTempDisconnected ? 'bg-rose-50 dark:bg-rose-500/15' : (tempStatus.label === 'Optimal' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-orange-50 dark:bg-orange-500/15'),
      accentColor: isTempDisconnected ? '#f43f5e' : tempStatus.color,
      status: tempStatus,
      percent: tempPercent,
      targetPercent: tempTargetPercent,
      targetDisplay: `${targetTemp.toFixed(1)}°C`,
      hasError: isTempDisconnected,
    },
    {
      id: 'hum' as const,
      name: 'Humidity',
      value: isHumDisconnected ? '--' : hum,
      unit: '%',
      icon: (isHumDisconnected ? 'alert-circle-outline' : 'water-percent') as any,
      iconColor: isHumDisconnected ? '#f43f5e' : (humStatus.label === 'Optimal' ? '#10b981' : (isHumAlert ? humAlertColor : '#0ea5e9')),
      iconBg: isHumDisconnected ? 'bg-rose-50 dark:bg-rose-500/15' : (humStatus.label === 'Optimal' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-sky-50 dark:bg-sky-500/15'),
      accentColor: isHumDisconnected ? '#f43f5e' : humStatus.color,
      status: humStatus,
      percent: humPercent,
      targetPercent: humTargetPercent,
      targetDisplay: `${Math.round(targetHum)}%`,
      hasError: isHumDisconnected,
    },
    {
      id: 'light' as const,
      name: 'Light Level',
      value: isLightDisconnected ? '--' : light,
      unit: 'lx',
      icon: (isLightDisconnected ? 'alert-circle-outline' : 'white-balance-sunny') as any,
      iconColor: isLightDisconnected ? '#f43f5e' : (lightStatus.label === 'Optimal' ? '#10b981' : '#f59e0b'),
      iconBg: isLightDisconnected ? 'bg-rose-50 dark:bg-rose-500/15' : (lightStatus.label === 'Optimal' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-amber-50 dark:bg-amber-500/15'),
      accentColor: isLightDisconnected ? '#f43f5e' : lightStatus.color,
      status: lightStatus,
      percent: lightPercent,
      targetPercent: lightTargetPercent,
      targetDisplay: `${Math.round(targetLight)} lx`,
      hasError: isLightDisconnected,
    },
    {
      id: 'co2' as const,
      name: 'CO2 Level',
      value: isCo2Disconnected ? '--' : co2,
      unit: 'ppm',
      icon: (isCo2Disconnected ? 'alert-circle-outline' : 'molecule-co2') as any,
      iconColor: isCo2Disconnected ? '#f43f5e' : '#10b981',
      iconBg: isCo2Disconnected ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-emerald-50 dark:bg-emerald-500/15',
      accentColor: isCo2Disconnected ? '#f43f5e' : co2Status.color,
      status: co2Status,
      percent: co2Percent,
      targetPercent: co2TargetPercent,
      targetDisplay: `${Math.round(targetCO2)} ppm`,
      hasError: isCo2Disconnected,
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
              tw`rounded-[22px] p-3.5 sm:p-4 border shadow-sm justify-between ${
                item.hasError 
                  ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' 
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
              }`,
              { width: '48.5%', minHeight: isSmallDevice ? 138 : 146 }
            ]}
          >
            {/* Top Bar: Icon chip + Minimal Status badge */}
            <View style={tw`flex-row justify-between items-center mb-1.5`}>
              <View style={tw`w-7.5 h-7.5 rounded-xl ${item.iconBg} items-center justify-center`}>
                <MaterialCommunityIcons name={item.icon} size={17} color={item.iconColor} />
              </View>
              <View 
                style={[
                  tw`flex-row items-center px-2 py-0.5 rounded-full border border-slate-200/40 dark:border-slate-700/50`,
                  { backgroundColor: isDarkMode ? '#1e293b' : item.status.lightBg }
                ]}
              >
                <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: item.status.color }]} />
                <Text 
                  numberOfLines={1}
                  style={[
                    tw`text-[9px] sm:text-[9.5px]`,
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
              <Text numberOfLines={1} style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {item.name}
              </Text>
              <View style={tw`flex-row items-baseline mt-0.5`}>
                <Text style={[tw`${item.hasError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`, { fontSize: isSmallDevice ? 25 : 28, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.6 }]}>
                  {item.value}
                </Text>
                {item.hasError ? (
                  <Text style={[tw`text-xs text-rose-500 dark:text-rose-400 ml-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    Fault
                  </Text>
                ) : (
                  <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 ml-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {item.unit}
                  </Text>
                )}
              </View>
            </View>

            {/* Bottom: Sleek Minimal Track Bar with Target Notch & Simple Target Caption */}
            <View style={tw`mt-2`}>
              <View style={tw`relative w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full justify-center`}>
                {/* Current Value Fill Bar */}
                <View 
                  style={[
                    tw`h-full rounded-full`, 
                    { 
                      width: `${item.percent}%`, 
                      backgroundColor: item.accentColor 
                    }
                  ]} 
                />

                {/* Clean Refined Target Notch */}
                {!item.hasError && (
                  <View 
                    style={[
                      tw`absolute rounded-full`,
                      { 
                        left: `${item.targetPercent}%`,
                        marginLeft: -1,
                        width: 2,
                        height: 7.5,
                        top: -1,
                        backgroundColor: isDarkMode ? '#94a3b8' : '#64748b',
                      }
                    ]} 
                  />
                )}
              </View>

              {/* Clean Single Target Caption */}
              <Text 
                numberOfLines={1} 
                style={[
                  tw`text-[9.5px] text-slate-400 dark:text-slate-500 mt-1.5`, 
                  { fontFamily: 'PlusJakartaSans_600SemiBold' }
                ]}
              >
                Target: <Text style={tw`text-slate-600 dark:text-slate-400 font-bold`}>{item.targetDisplay}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});
