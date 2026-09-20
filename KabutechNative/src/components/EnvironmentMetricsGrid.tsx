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

  const isControllerOff = !health.isControllerOnline;

  // Dedicated constant theme colors for each environmental metric
  const TEMP_COLOR = '#f97316'; // Constant Warm Orange
  const HUM_COLOR = '#0ea5e9';  // Constant Water Blue
  const LIGHT_COLOR = '#f59e0b'; // Constant Solar Amber
  const CO2_COLOR = '#10b981';  // Constant Botanical Emerald

  // Status badge styling helper for offline/fault states
  const offlineStatus = {
    label: 'Offline',
    dotColor: '#94a3b8',
    badgeBg: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
    badgeText: isDarkMode ? '#94a3b8' : '#64748b',
  };

  const faultStatus = {
    label: 'Fault',
    dotColor: '#f59e0b',
    badgeBg: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
    badgeText: isDarkMode ? '#fbbf24' : '#b45309',
  };

  // Temperature: 15°C to 35°C (Permanent Orange Theme)
  const tempMin = 15;
  const tempMax = 35;
  const tempDiff = isTempDisconnected ? 0 : Number((temp - targetTemp).toFixed(1));
  const tempStatus = React.useMemo(() => {
    if (isTempDisconnected) return isControllerOff ? offlineStatus : faultStatus;
    const isOptimal = Math.abs(tempDiff) <= 0.5;
    const isHigh = tempDiff > 0.5;
    return {
      label: isOptimal ? 'Optimal' : (isHigh ? `+${tempDiff.toFixed(1)}°` : `-${Math.abs(tempDiff).toFixed(1)}°`),
      dotColor: isOptimal ? '#10b981' : TEMP_COLOR,
      badgeBg: isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed',
      badgeText: isDarkMode ? '#fb923c' : '#ea580c',
    };
  }, [tempDiff, isTempDisconnected, isControllerOff, isDarkMode]);
  const tempTargetPercent = Math.min(95, Math.max(5, ((targetTemp - tempMin) / (tempMax - tempMin)) * 100));
  const tempPercent = isTempDisconnected ? 0 : Math.min(100, Math.max(4, ((temp - tempMin) / (tempMax - tempMin)) * 100));

  // Humidity: 40% to 100% (Permanent Blue Theme)
  const humMin = 40;
  const humMax = 100;
  const humDiff = isHumDisconnected ? 0 : Math.round(hum - targetHum);
  const humStatus = React.useMemo(() => {
    if (isHumDisconnected) return isControllerOff ? offlineStatus : faultStatus;
    const isOptimal = Math.abs(humDiff) <= 2;
    const isHigh = humDiff > 2;
    return {
      label: isOptimal ? 'Optimal' : (isHigh ? `+${humDiff}%` : `-${Math.abs(humDiff)}%`),
      dotColor: isOptimal ? '#10b981' : HUM_COLOR,
      badgeBg: isDarkMode ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff',
      badgeText: isDarkMode ? '#38bdf8' : '#0284c7',
    };
  }, [humDiff, isHumDisconnected, isControllerOff, isDarkMode]);
  const humTargetPercent = Math.min(95, Math.max(5, ((targetHum - humMin) / (humMax - humMin)) * 100));
  const humPercent = isHumDisconnected ? 0 : Math.min(100, Math.max(4, ((hum - humMin) / (humMax - humMin)) * 100));

  // Light: 100 to 1000 lx (Permanent Amber Theme)
  const lightMin = 100;
  const lightMax = 1000;
  const lightDiff = isLightDisconnected ? 0 : Math.round(light - targetLight);
  const lightStatus = React.useMemo(() => {
    if (isLightDisconnected) return isControllerOff ? offlineStatus : faultStatus;
    const isOptimal = lightDiff <= 300 && lightDiff >= -200;
    return {
      label: isOptimal ? 'Optimal' : (lightDiff > 300 ? 'High' : 'Low'),
      dotColor: isOptimal ? '#10b981' : LIGHT_COLOR,
      badgeBg: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
      badgeText: isDarkMode ? '#fbbf24' : '#b45309',
    };
  }, [lightDiff, isLightDisconnected, isControllerOff, isDarkMode]);
  const lightTargetPercent = Math.min(95, Math.max(5, ((targetLight - lightMin) / (lightMax - lightMin)) * 100));
  const lightPercent = isLightDisconnected ? 0 : Math.min(100, Math.max(4, ((light - lightMin) / (lightMax - lightMin)) * 100));

  // CO2: 300 to 1200 ppm (Permanent Emerald Theme)
  const co2Min = 300;
  const co2Max = 1200;
  const co2Diff = isCo2Disconnected ? 0 : Math.round(co2 - targetCO2);
  const co2Status = React.useMemo(() => {
    if (isCo2Disconnected) return isControllerOff ? offlineStatus : faultStatus;
    const isOptimal = co2Diff <= 150;
    return {
      label: isOptimal ? 'Optimal' : (co2Diff > 350 ? 'High' : 'Elevated'),
      dotColor: isOptimal ? '#10b981' : CO2_COLOR,
      badgeBg: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
      badgeText: isDarkMode ? '#34d399' : '#059669',
    };
  }, [co2Diff, isCo2Disconnected, isControllerOff, isDarkMode]);
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

  const metrics = [
    {
      id: 'temp' as const,
      name: 'Temperature',
      value: isTempDisconnected ? '--' : temp,
      unit: '°C',
      icon: (isTempDisconnected ? (isControllerOff ? 'cloud-off-outline' : 'alert-circle-outline') : 'thermometer') as any,
      iconColor: isTempDisconnected ? '#94a3b8' : TEMP_COLOR,
      iconBgColor: isTempDisconnected 
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9') 
        : (isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed'),
      accentColor: TEMP_COLOR,
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
      icon: (isHumDisconnected ? (isControllerOff ? 'cloud-off-outline' : 'alert-circle-outline') : 'water-percent') as any,
      iconColor: isHumDisconnected ? '#94a3b8' : HUM_COLOR,
      iconBgColor: isHumDisconnected 
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9') 
        : (isDarkMode ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff'),
      accentColor: HUM_COLOR,
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
      icon: (isLightDisconnected ? (isControllerOff ? 'cloud-off-outline' : 'alert-circle-outline') : 'white-balance-sunny') as any,
      iconColor: isLightDisconnected ? '#94a3b8' : LIGHT_COLOR,
      iconBgColor: isLightDisconnected 
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9') 
        : (isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb'),
      accentColor: LIGHT_COLOR,
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
      icon: (isCo2Disconnected ? (isControllerOff ? 'cloud-off-outline' : 'alert-circle-outline') : 'molecule-co2') as any,
      iconColor: isCo2Disconnected ? '#94a3b8' : CO2_COLOR,
      iconBgColor: isCo2Disconnected 
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9') 
        : (isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5'),
      accentColor: CO2_COLOR,
      status: co2Status,
      percent: co2Percent,
      targetPercent: co2TargetPercent,
      targetDisplay: `${Math.round(targetCO2)} ppm`,
      hasError: isCo2Disconnected,
    },
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-6`}>
      {/* Sleek Header */}
      <View style={tw`flex-row justify-between items-center mb-3.5`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Text style={[tw`text-base sm:text-lg tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
            Environment Metrics
          </Text>
          <View style={[
            tw`px-2.5 py-0.5 rounded-full border flex-row items-center`,
            activeCount === 4
              ? (isDarkMode ? tw`bg-emerald-950/50 border-emerald-800/50` : tw`bg-emerald-50 border-emerald-200/60`)
              : (isDarkMode ? tw`bg-slate-800/80 border-slate-700/60` : tw`bg-slate-100 border-slate-200/60`)
          ]}>
            <View 
              style={[
                tw`w-1.5 h-1.5 rounded-full mr-1.5`,
                { backgroundColor: activeCount === 4 ? '#10b981' : '#94a3b8' }
              ]} 
            />
            <Text 
              style={[
                tw`text-[10px]`,
                { 
                  fontFamily: 'PlusJakartaSans_700Bold',
                  color: activeCount === 4 ? (isDarkMode ? '#34d399' : '#059669') : (isDarkMode ? '#94a3b8' : '#64748b')
                }
              ]}
            >
              {activeCount === 4 ? 'Live' : (activeCount === 0 ? 'Offline' : `${activeCount}/4 Live`)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => {
            hapticSelection();
            navigation.navigate('Analytics' as never);
          }}
          style={tw`flex-row items-center py-1 px-2.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15`}
        >
          <Text style={[tw`text-xs text-[#10b981] mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Analytics</Text>
          <Ionicons name="chevron-forward" size={12} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* 2x2 Modern Widget Grid */}
      <View style={tw`flex-row flex-wrap justify-between gap-y-3.5`}>
        {metrics.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.78}
            onPress={() => handleCardPress(item.id)}
            style={[
              tw`rounded-[26px] p-4 sm:p-4.5 border justify-between ${
                item.hasError 
                  ? (isControllerOff
                      ? 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-amber-300/60 dark:border-amber-800/60')
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
              }`,
              { 
                width: '48.5%', 
                minHeight: isSmallDevice ? 140 : 152,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDarkMode ? 0 : 0.04,
                shadowRadius: 8,
                elevation: 2
              }
            ]}
          >
            {/* Top Bar: Squircle Icon chip + Clean Micro Status badge */}
            <View style={tw`flex-row justify-between items-center mb-2.5`}>
              <View 
                style={[
                  tw`w-9 h-9 rounded-[14px] items-center justify-center`,
                  { backgroundColor: item.iconBgColor }
                ]}
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
              </View>

              <View 
                style={[
                  tw`flex-row items-center px-2 py-0.5 rounded-full`,
                  { backgroundColor: item.status.badgeBg }
                ]}
              >
                <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: item.status.dotColor }]} />
                <Text 
                  numberOfLines={1}
                  style={[
                    tw`text-[10px]`,
                    { 
                      fontFamily: 'PlusJakartaSans_700Bold',
                      color: item.status.badgeText
                    }
                  ]}
                >
                  {item.status.label}
                </Text>
              </View>
            </View>

            {/* Middle: Uppercase Label & Big Hero Value */}
            <View style={tw`my-auto py-1`}>
              <Text 
                numberOfLines={1} 
                style={[
                  tw`text-[10px] sm:text-[10.5px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5`, 
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}
              >
                {item.name}
              </Text>
              <View style={tw`flex-row items-baseline mt-0.5`}>
                <Text 
                  style={[
                    tw`${item.hasError ? (isControllerOff ? 'text-slate-400 dark:text-slate-500' : 'text-amber-600 dark:text-amber-400') : 'text-slate-900 dark:text-white'}`, 
                    { 
                      fontSize: isSmallDevice ? 28 : 32, 
                      fontFamily: 'PlusJakartaSans_800ExtraBold', 
                      letterSpacing: -0.8,
                      lineHeight: isSmallDevice ? 32 : 36
                    }
                  ]}
                >
                  {item.value}
                </Text>
                {item.hasError ? (
                  <Text style={[tw`text-[11px] ml-1.5`, { color: isControllerOff ? '#94a3b8' : '#ea580c', fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {isControllerOff ? 'Off' : 'Fault'}
                  </Text>
                ) : (
                  <Text style={[tw`text-xs sm:text-sm text-slate-400 dark:text-slate-500 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    {item.unit}
                  </Text>
                )}
              </View>
            </View>

            {/* Bottom: Sleek Precision Gauge Track */}
            <View style={tw`mt-2 mb-0.5`}>
              <View style={tw`relative w-full h-[5px] bg-slate-100 dark:bg-slate-800 rounded-full overflow-visible justify-center`}>
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

                {/* Precision Target Notch */}
                {!item.hasError && (
                  <View 
                    style={[
                      tw`absolute rounded-full`,
                      { 
                        left: `${item.targetPercent}%`,
                        marginLeft: -1.25,
                        width: 2.5,
                        height: 7.5,
                        top: -1.25,
                        backgroundColor: item.percent >= item.targetPercent 
                          ? '#ffffff' 
                          : (isDarkMode ? '#cbd5e1' : '#475569'),
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: item.percent >= item.targetPercent ? 0.35 : 0.15,
                        shadowRadius: 1,
                        elevation: 2,
                      }
                    ]} 
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});
