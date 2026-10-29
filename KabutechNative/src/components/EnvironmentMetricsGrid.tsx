import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const isTempFault = !isControllerOff && health.tempError;
  const isHumFault = !isControllerOff && health.humError;
  const isLightFault = !isControllerOff && health.lightError;
  const isCo2Fault = !isControllerOff && health.co2Error;

  const tempEval = evaluateParam('temp', temp, isControllerOff || isTempFault, ACTIVE_PROFILE);
  const humEval = evaluateParam('hum', hum, isControllerOff || isHumFault, ACTIVE_PROFILE);
  const lightEval = evaluateParam('light', light, isControllerOff || isLightFault, ACTIVE_PROFILE);
  const co2Eval = evaluateParam('co2', co2, isControllerOff || isCo2Fault, ACTIVE_PROFILE);

  // Status helper with clean minimal badges matching TFT display
  const getBadgeStyle = (paramEval: ParamEvaluation) => {
    if (isControllerOff) {
      return {
        label: 'Offline',
        dotColor: isDarkMode ? '#94a3b8' : '#64748b',
        badgeBg: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
        badgeText: isDarkMode ? '#94a3b8' : '#64748b',
      };
    }
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

  const activeCount = isControllerOff ? 0 : [!isTempFault, !isHumFault, !isLightFault, !isCo2Fault].filter(Boolean).length;

  const plainIconColor = isDarkMode ? '#94a3b8' : '#64748b';
  const plainIconBg = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc';
  const plainIconBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const metrics = [
    {
      id: 'temp' as const,
      title: 'Temperature',
      name: 'Temperature',
      icon: 'thermometer' as const,
      iconColor: plainIconColor,
      iconBg: plainIconBg,
      iconBorder: plainIconBorder,
      eval: tempEval,
      status: getBadgeStyle(tempEval),
      targetRange: `${ACTIVE_PROFILE.temp.min ?? 18} – ${ACTIVE_PROFILE.temp.max ?? 25} °C`,
    },
    {
      id: 'hum' as const,
      title: 'Humidity',
      name: 'Humidity',
      icon: 'water-percent' as const,
      iconColor: plainIconColor,
      iconBg: plainIconBg,
      iconBorder: plainIconBorder,
      eval: humEval,
      status: getBadgeStyle(humEval),
      targetRange: `${ACTIVE_PROFILE.hum.min ?? 80} – ${ACTIVE_PROFILE.hum.max ?? 95} %`,
    },
    {
      id: 'co2' as const,
      title: 'CO2',
      name: 'CO2 Level',
      icon: 'molecule-co2' as const,
      iconColor: plainIconColor,
      iconBg: plainIconBg,
      iconBorder: plainIconBorder,
      eval: co2Eval,
      status: getBadgeStyle(co2Eval),
      targetRange: `< ${(ACTIVE_PROFILE.co2.max ?? 1000).toLocaleString()} ppm`,
    },
    {
      id: 'light' as const,
      title: 'Light',
      name: 'Light Level',
      icon: 'white-balance-sunny' as const,
      iconColor: plainIconColor,
      iconBg: plainIconBg,
      iconBorder: plainIconBorder,
      eval: lightEval,
      status: getBadgeStyle(lightEval),
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
            !isControllerOff && activeCount === 4
              ? (isDarkMode ? tw`bg-emerald-950/50 border-emerald-800/50` : tw`bg-emerald-50 border-emerald-200/60`)
              : (isDarkMode ? tw`bg-slate-800/80 border-slate-700/60` : tw`bg-slate-100 border-slate-200/60`)
          ]}>
            <View 
              style={[
                tw`w-1.5 h-1.5 rounded-full mr-1.5`,
                { backgroundColor: !isControllerOff && activeCount === 4 ? '#10b981' : '#94a3b8' }
              ]} 
            />
            <Text 
              style={[
                tw`text-[10px]`,
                { 
                  fontFamily: 'PlusJakartaSans_700Bold',
                  color: !isControllerOff && activeCount === 4 ? (isDarkMode ? '#34d399' : '#059669') : (isDarkMode ? '#94a3b8' : '#64748b')
                }
              ]}
            >
              {isControllerOff ? 'Offline' : activeCount === 4 ? 'Live' : `${activeCount}/4 Active`}
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

      {/* 2x2 Clean Expanded Grid with Icons */}
      <View style={tw`flex-row flex-wrap justify-between gap-y-3.5`}>
        {metrics.map((item) => {
          const isItemFault = item.eval.state === 'fault';

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={isStaff ? 1 : 0.78}
              onPress={() => handleCardPress(item.id)}
              style={[
                tw`rounded-[26px] p-4.5 sm:p-5 border justify-between bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800`,
                isItemFault && tw`opacity-80`,
                { 
                  width: '48.5%', 
                  minHeight: isSmallDevice ? 152 : 164,
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDarkMode ? 0 : 0.04,
                  shadowRadius: 10,
                  elevation: 2
                }
              ]}
            >
              {/* Top Row: Signature Icon Container (Left) + Status Pill Badge (Right) */}
              <View style={tw`flex-row justify-between items-center`}>
                <View 
                  style={[
                    tw`w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] items-center justify-center border`,
                    { 
                      backgroundColor: item.iconBg,
                      borderColor: item.iconBorder
                    }
                  ]}
                >
                  <MaterialCommunityIcons 
                    name={item.icon} 
                    size={isSmallDevice ? 20 : 23} 
                    color={item.iconColor} 
                  />
                </View>

                <View 
                  style={[
                    tw`flex-row items-center px-2 py-1 rounded-full shrink-0 border border-transparent`,
                    { backgroundColor: item.status.badgeBg }
                  ]}
                >
                  <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: item.status.dotColor }]} />
                  <Text 
                    numberOfLines={1}
                    style={[
                      tw`text-[10px] sm:text-[10.5px]`,
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

              {/* Middle: Metric Title + Big Hero Value */}
              <View style={tw`my-auto py-1.5`}>
                <Text 
                  numberOfLines={1}
                  style={[
                    tw`text-[12.5px] sm:text-[13.5px] text-slate-500 dark:text-slate-400 mb-1`,
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  {item.title}
                </Text>

                <View style={tw`flex-row items-baseline`}>
                  <Text 
                    style={[
                      tw`${isItemFault ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`, 
                      { 
                        fontSize: isSmallDevice ? 30 : 34, 
                        fontFamily: 'PlusJakartaSans_800ExtraBold', 
                        letterSpacing: -0.8,
                        lineHeight: isSmallDevice ? 34 : 40
                      }
                    ]}
                  >
                    {item.eval.formattedValue}
                  </Text>
                  {isControllerOff ? (
                    <Text style={[tw`text-xs ml-1.5 text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Offline
                    </Text>
                  ) : isItemFault ? (
                    <Text style={[tw`text-xs ml-1.5 text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      Fault
                    </Text>
                  ) : (
                    <Text style={[tw`text-xs sm:text-sm text-slate-400 dark:text-slate-500 ml-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {item.eval.unit}
                    </Text>
                  )}
                </View>
              </View>

              {/* Bottom: Target Optimal Range Benchmark */}
              <View style={tw`flex-row items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/70`}>
                <Text 
                  style={[
                    tw`text-[9.5px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider`, 
                    { fontFamily: 'PlusJakartaSans_700Bold' }
                  ]}
                >
                  Optimal
                </Text>
                <Text 
                  numberOfLines={1}
                  style={[
                    tw`${isItemFault ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'} text-[11px] sm:text-[11.5px]`, 
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
