import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticSelection } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { evaluateParam, ParamEvaluation } from '../utils/environmentRanges';
import { ACTIVE_PROFILE } from '../config/cropProfiles';

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

  const isControllerOff = !health.isControllerOnline;
  const isTempFault = health.tempError || temp === -999 || temp <= 0;
  const isHumFault = health.humError || hum === -999 || hum <= 0;
  const isLightFault = health.lightError || light === -999 || light < 0;
  const isCo2Fault = health.co2Error || co2 === -999 || co2 < 0;

  // Dedicated constant theme colors for each environmental metric
  const TEMP_COLOR = '#f97316'; // Warm Orange
  const HUM_COLOR = '#0ea5e9';  // Sky Blue
  const LIGHT_COLOR = '#f59e0b'; // Amber Gold
  const CO2_COLOR = '#10b981';  // Emerald Green

  const tempEval = evaluateParam('temp', temp, isControllerOff || isTempFault, ACTIVE_PROFILE);
  const humEval = evaluateParam('hum', hum, isControllerOff || isHumFault, ACTIVE_PROFILE);
  const lightEval = evaluateParam('light', light, isControllerOff || isLightFault, ACTIVE_PROFILE);
  const co2Eval = evaluateParam('co2', co2, isControllerOff || isCo2Fault, ACTIVE_PROFILE);

  // Status helper with clean minimal badges
  const getBadgeStyle = (paramEval: ParamEvaluation, fallbackColor: string) => {
    if (paramEval.state === 'fault') {
      return {
        label: 'Fault',
        dotColor: isDarkMode ? '#94a3b8' : '#64748b',
        badgeBg: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
        badgeText: isDarkMode ? '#94a3b8' : '#64748b',
      };
    }
    if (paramEval.state === 'in_range') {
      return {
        label: 'Optimal',
        dotColor: '#10b981',
        badgeBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
        badgeText: isDarkMode ? '#34d399' : '#059669',
      };
    }
    if (paramEval.state === 'low') {
      return {
        label: 'Low',
        dotColor: '#f59e0b',
        badgeBg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
        badgeText: isDarkMode ? '#fbbf24' : '#b45309',
      };
    }
    return {
      label: 'High',
      dotColor: fallbackColor,
      badgeBg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      badgeText: isDarkMode ? '#f87171' : '#dc2626',
    };
  };

  // Track scaling
  const tempPercent = isTempFault ? 0 : Math.min(100, Math.max(0, ((temp - 15) / 20) * 100));
  const humPercent = isHumFault ? 0 : Math.min(100, Math.max(0, ((hum - 40) / 60) * 100));
  const lightPercent = isLightFault ? 0 : Math.min(100, Math.max(0, (light / 1200) * 100));
  const co2Percent = isCo2Fault ? 0 : Math.min(100, Math.max(0, ((co2 - 300) / 1200) * 100));

  const handleCardPress = (tabKey: 'temp' | 'hum' | 'light' | 'co2') => {
    if (isStaff) return;
    hapticSelection();
    navigation.navigate('Main', {
      screen: 'Controls',
      params: { tab: tabKey }
    });
  };

  const activeCount = [!isTempFault, !isHumFault, !isLightFault, !isCo2Fault].filter(Boolean).length;

  const metrics = [
    {
      id: 'temp' as const,
      name: 'Temperature',
      eval: tempEval,
      status: getBadgeStyle(tempEval, TEMP_COLOR),
      icon: (isTempFault ? 'alert-circle-outline' : 'thermometer') as any,
      iconColor: isTempFault ? (isDarkMode ? '#64748b' : '#94a3b8') : TEMP_COLOR,
      iconBgColor: isTempFault
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9')
        : (isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed'),
      accentColor: TEMP_COLOR,
      percent: tempPercent,
    },
    {
      id: 'hum' as const,
      name: 'Humidity',
      eval: humEval,
      status: getBadgeStyle(humEval, HUM_COLOR),
      icon: (isHumFault ? 'alert-circle-outline' : 'water-percent') as any,
      iconColor: isHumFault ? (isDarkMode ? '#64748b' : '#94a3b8') : HUM_COLOR,
      iconBgColor: isHumFault
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9')
        : (isDarkMode ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff'),
      accentColor: HUM_COLOR,
      percent: humPercent,
    },
    {
      id: 'light' as const,
      name: 'Light Level',
      eval: lightEval,
      status: getBadgeStyle(lightEval, LIGHT_COLOR),
      icon: (isLightFault ? 'alert-circle-outline' : 'white-balance-sunny') as any,
      iconColor: isLightFault ? (isDarkMode ? '#64748b' : '#94a3b8') : LIGHT_COLOR,
      iconBgColor: isLightFault
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9')
        : (isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb'),
      accentColor: LIGHT_COLOR,
      percent: lightPercent,
    },
    {
      id: 'co2' as const,
      name: 'CO2 Level',
      eval: co2Eval,
      status: getBadgeStyle(co2Eval, CO2_COLOR),
      icon: (isCo2Fault ? 'alert-circle-outline' : 'molecule-co2') as any,
      iconColor: isCo2Fault ? (isDarkMode ? '#64748b' : '#94a3b8') : CO2_COLOR,
      iconBgColor: isCo2Fault
        ? (isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9')
        : (isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5'),
      accentColor: CO2_COLOR,
      percent: co2Percent,
    },
  ];

  return (
    <View style={tw`px-5 sm:px-6 pt-5`}>
      {/* Sleek Minimal Header */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Text style={[tw`text-base sm:text-lg tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
            Environment Metrics
          </Text>
          <View style={[
            tw`px-2 py-0.5 rounded-full border flex-row items-center`,
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
              {activeCount === 4 ? 'Live' : `${activeCount}/4 Active`}
            </Text>
          </View>
        </View>

        {!isStaff && (
          <TouchableOpacity 
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={() => {
              hapticSelection();
              navigation.navigate('Analytics' as never);
            }}
            style={tw`flex-row items-center py-1 px-2.5 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60`}
          >
            <Text style={[tw`text-xs text-[#064e3b] dark:text-[#34d399] mr-1`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Analytics
            </Text>
            <Ionicons name="chevron-forward" size={12} color={isDarkMode ? '#34d399' : '#064e3b'} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2x2 Minimal Clean Grid */}
      <View style={tw`flex-row flex-wrap justify-between gap-y-3`}>
        {metrics.map((item) => {
          const isItemFault = item.eval.state === 'fault';

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={isStaff ? 1 : 0.78}
              onPress={() => handleCardPress(item.id)}
              style={[
                tw`rounded-[24px] p-4 border justify-between bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800`,
                isItemFault && tw`opacity-80`,
                { 
                  width: '48.5%', 
                  minHeight: isSmallDevice ? 128 : 138,
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0 : 0.03,
                  shadowRadius: 6,
                  elevation: 1.5
                }
              ]}
            >
              {/* Top Row: Squircle Icon + Minimal Status Badge */}
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <View 
                  style={[
                    tw`w-8 h-8 rounded-[12px] items-center justify-center`,
                    { backgroundColor: item.iconBgColor }
                  ]}
                >
                  <MaterialCommunityIcons name={item.icon} size={18} color={item.iconColor} />
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

              {/* Middle: Title & Big Hero Value + Subtle Trend */}
              <View style={tw`my-auto py-0.5`}>
                <Text 
                  numberOfLines={1} 
                  style={[
                    tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5`, 
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  {item.name}
                </Text>

                <View style={tw`flex-row items-baseline`}>
                  <Text 
                    style={[
                      tw`${isItemFault ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`, 
                      { 
                        fontSize: isSmallDevice ? 26 : 29, 
                        fontFamily: 'PlusJakartaSans_800ExtraBold', 
                        letterSpacing: -0.6,
                        lineHeight: isSmallDevice ? 30 : 34
                      }
                    ]}
                  >
                    {item.eval.formattedValue}
                  </Text>
                  {isItemFault ? (
                    <Text style={[tw`text-[11px] ml-1.5 text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Fault
                    </Text>
                  ) : (
                    <Text style={[tw`text-xs text-slate-400 dark:text-slate-500 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {item.eval.unit}
                    </Text>
                  )}
                </View>
              </View>

              {/* Bottom: Minimal Smooth Rounded Gauge Bar (Zero Black Lines, Zero Footer Text) */}
              <View style={tw`mt-2`}>
                <View style={tw`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden`}>
                  <View 
                    style={[
                      tw`h-full rounded-full`, 
                      { 
                        width: isItemFault ? '0%' : `${item.percent}%`, 
                        backgroundColor: isItemFault ? (isDarkMode ? '#334155' : '#cbd5e1') : item.accentColor 
                      }
                    ]} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});
