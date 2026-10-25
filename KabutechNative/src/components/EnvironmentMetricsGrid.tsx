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

  // Unified professional icon theme across all metric cards
  const ICON_COLOR = isDarkMode ? '#10b981' : '#059669';
  const ICON_BG = isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5';
  const FAULT_ICON_COLOR = isDarkMode ? '#64748b' : '#94a3b8';
  const FAULT_ICON_BG = isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9';

  const tempEval = evaluateParam('temp', temp, isControllerOff || isTempFault, ACTIVE_PROFILE);
  const humEval = evaluateParam('hum', hum, isControllerOff || isHumFault, ACTIVE_PROFILE);
  const lightEval = evaluateParam('light', light, isControllerOff || isLightFault, ACTIVE_PROFILE);
  const co2Eval = evaluateParam('co2', co2, isControllerOff || isCo2Fault, ACTIVE_PROFILE);

  // Status helper with clean minimal badges matching TFT display
  const getBadgeStyle = (paramEval: ParamEvaluation) => {
    if (paramEval.state === 'fault') {
      return {
        label: paramEval.statusLabel || 'Fault',
        dotColor: isDarkMode ? '#94a3b8' : '#64748b',
        badgeBg: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
        badgeText: isDarkMode ? '#94a3b8' : '#64748b',
      };
    }
    if (paramEval.state === 'in_range') {
      return {
        label: paramEval.statusLabel || 'Optimal',
        dotColor: '#10b981',
        badgeBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
        badgeText: isDarkMode ? '#34d399' : '#059669',
      };
    }
    const isCrit = paramEval.severity === 'critical';
    return {
      label: paramEval.statusLabel || (paramEval.state === 'low' ? 'Low' : 'High'),
      dotColor: isCrit ? '#ef4444' : '#f59e0b',
      badgeBg: isCrit
        ? (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
        : (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb'),
      badgeText: isCrit
        ? (isDarkMode ? '#f87171' : '#dc2626')
        : (isDarkMode ? '#fbbf24' : '#b45309'),
    };
  };

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
      status: getBadgeStyle(tempEval),
      icon: (isTempFault ? 'alert-circle-outline' : 'thermometer') as any,
      iconColor: isTempFault ? FAULT_ICON_COLOR : ICON_COLOR,
      iconBgColor: isTempFault ? FAULT_ICON_BG : ICON_BG,
      targetRange: `${ACTIVE_PROFILE.temp.min ?? 18} – ${ACTIVE_PROFILE.temp.max ?? 25} °C`,
    },
    {
      id: 'hum' as const,
      name: 'Humidity',
      eval: humEval,
      status: getBadgeStyle(humEval),
      icon: (isHumFault ? 'alert-circle-outline' : 'water-percent') as any,
      iconColor: isHumFault ? FAULT_ICON_COLOR : ICON_COLOR,
      iconBgColor: isHumFault ? FAULT_ICON_BG : ICON_BG,
      targetRange: `${ACTIVE_PROFILE.hum.min ?? 80} – ${ACTIVE_PROFILE.hum.max ?? 95} %`,
    },
    {
      id: 'co2' as const,
      name: 'CO2 Level',
      eval: co2Eval,
      status: getBadgeStyle(co2Eval),
      icon: (isCo2Fault ? 'alert-circle-outline' : 'molecule-co2') as any,
      iconColor: isCo2Fault ? FAULT_ICON_COLOR : ICON_COLOR,
      iconBgColor: isCo2Fault ? FAULT_ICON_BG : ICON_BG,
      targetRange: `< ${(ACTIVE_PROFILE.co2.max ?? 1000).toLocaleString()} ppm`,
    },
    {
      id: 'light' as const,
      name: 'Light Level',
      eval: lightEval,
      status: getBadgeStyle(lightEval),
      icon: (isLightFault ? 'alert-circle-outline' : 'white-balance-sunny') as any,
      iconColor: isLightFault ? FAULT_ICON_COLOR : ICON_COLOR,
      iconBgColor: isLightFault ? FAULT_ICON_BG : ICON_BG,
      targetRange: `${ACTIVE_PROFILE.light.min ?? 150} – ${(ACTIVE_PROFILE.light.max ?? 1000).toLocaleString()} lx`,
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

              {/* Bottom: Target Optimal Range Benchmark (Replaces progress bar with professional setpoint) */}
              <View style={tw`mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 flex-row items-center justify-between`}>
                <Text 
                  style={[
                    tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, 
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  Optimal
                </Text>
                <Text 
                  style={[
                    tw`${isItemFault ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'} text-[11px]`, 
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  {isItemFault ? '--' : item.targetRange}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});
