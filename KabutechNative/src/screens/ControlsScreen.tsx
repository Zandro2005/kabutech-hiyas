import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, DeviceEventEmitter, Alert, Modal, PanResponder, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RangeGauge from '../components/RangeGauge';
import { ACTIVE_PROFILE } from '../config/cropProfiles';
import { formatRangeText } from '../utils/environmentRanges';
import ScreenHeader from '../components/ScreenHeader';
import ControlsScreenSkeleton from '../components/skeletons/ControlsScreenSkeleton';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/CustomToast';
import { hapticLight, hapticMedium, hapticSelection } from '../utils/haptics';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../utils/scheduleLogic';
import { useResponsive } from '../utils/responsive';
import { useTabBarScroll } from '../context/TabBarContext';

type TabId = 'temp' | 'hum' | 'light' | 'co2';

const DEFAULT_DEVICES: {
  fanIn: boolean;
  fanOut: boolean;
  fans: boolean;
  misters: boolean;
  lights: boolean;
  valve: boolean;
  co2: boolean;
} = {
  fanIn: false,
  fanOut: false,
  fans: false,
  misters: false,
  lights: false,
  valve: false,
  co2: false,
};

export default function ControlsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { onScroll: handleTabBarScroll } = useTabBarScroll();
  const route = useRoute<any>();
  const { isDarkMode } = useTheme();
  const { width, isSmallDevice } = useResponsive();
  const sensors = useSensors();
  const settings = useSettings();
  const health = useSensorHealth();
  
  const [isReady, setIsReady] = useState(false);
  const [showStopAiModal, setShowStopAiModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'auto' | 'manual' | 'scheduled' | null>(null);

  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setIsReady(true);
    }, 40);
    const frame = requestAnimationFrame(() => {
      if (mounted) setIsReady(true);
    });
    return () => {
      mounted = false;
      clearTimeout(safety);
      cancelAnimationFrame(frame);
    };
  }, []);

  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 32.8;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 51;
  const light = typeof sensors.light === 'number' ? sensors.light : 71;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 583;

  const isTempDisconnected = health.tempError || temp === -999 || temp <= 0;
  const isHumDisconnected = health.humError || hum === -999 || hum <= 0;
  const isLightDisconnected = health.lightError || light === -999 || light < 0;
  const isCo2Disconnected = health.co2Error || co2 === -999 || co2 < 0;

  const isOffline = !health.isControllerOnline;

  const currentMode = isOffline ? 'auto' : String(settings?.setpoints?.mode || 'auto').toLowerCase();
  const isAuto = currentMode === 'auto';
  const isScheduled = currentMode === 'scheduled' || currentMode === 'timed';
  
  const rawDevices = settings?.setpoints?.devices || DEFAULT_DEVICES;
  const [devices, setDevices] = useState(rawDevices);

  useEffect(() => {
    if (isScheduled) {
      setDevices(computeScheduledDevicesState(settings?.schedules));
      const interval = setInterval(() => {
        setDevices(computeScheduledDevicesState(settings?.schedules));
      }, 3000);
      return () => clearInterval(interval);
    } else if (isAuto) {
      setDevices(computeAutoDevicesState(sensors, rawDevices));
      const interval = setInterval(() => {
        setDevices(computeAutoDevicesState(sensors, rawDevices));
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setDevices(rawDevices);
    }
  }, [
    isScheduled,
    isAuto,
    settings?.schedules,
    settings?.setpoints?.mode,
    rawDevices.fanIn,
    rawDevices.fanOut,
    rawDevices.fans,
    rawDevices.misters,
    rawDevices.lights,
    rawDevices.valve,
    rawDevices.co2,
    sensors?.temperature,
    sensors?.humidity,
    sensors?.co2,
    sensors?.light,
  ]);

  const isAiOverride = settings?.setpoints?.aiOverride === true;
  const isLocked = isAuto || isScheduled || isAiOverride;

  const toggleDevice = async (key: string, state: boolean) => {
    if (isOffline) {
      showToast({ type: 'info', text1: 'Controller Offline', text2: 'Hardware actuators cannot be controlled while offline.' });
      return;
    }
    if (isLocked) return;
    hapticMedium();

    const previousState = Boolean(devices[key as keyof typeof devices]);

    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // ⚡ 0ms Optimistic UI update with legacy key mirroring
    const updatePayload: Record<string, boolean> = { [key]: state };
    if (key === 'fanOut') updatePayload.fans = state;

    setDevices(prev => ({ ...prev, ...updatePayload }));

    const startTime = Date.now();
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    // Notify user if command takes longer than 2.5 seconds to reach controller
    delayTimer = setTimeout(() => {
      showToast({
        type: 'info',
        text1: 'Slow Controller Response',
        text2: `The ${key} command is taking longer than usual to reach the ESP32. High network latency or weak Wi-Fi signal.`,
        duration: 4500,
      });
    }, 2500);

    const deviceLabel =
      key === 'fanIn' ? 'Intake' :
      key === 'fanOut' ? 'Exhaust' :
      key === 'misters' ? 'Mister' :
      key === 'lights' ? 'Grow Lights' :
      'Device';

    try {
      await update(ref(db, `kabutech/settings/setpoints/devices`), updatePayload);
      if (delayTimer) clearTimeout(delayTimer);

      const elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        showToast({
          type: 'success',
          text1: `${deviceLabel} turned ${state ? 'ON' : 'OFF'} (${(elapsed / 1000).toFixed(1)}s)`,
          text2: 'Delivered after network delay.',
        });
      } else {
        showToast({ type: 'success', text1: `${deviceLabel} turned ${state ? 'ON' : 'OFF'}` });
      }
    } catch (err: any) {
      if (delayTimer) clearTimeout(delayTimer);
      // Revert if network error
      const revertPayload: Record<string, boolean> = { [key]: previousState };
      if (key === 'fanOut') revertPayload.fans = previousState;
      setDevices(prev => ({ ...prev, ...revertPayload }));
      showToast({
        type: 'error',
        text1: 'Command Timed Out / Failed',
        text2: `Failed to turn ${state ? 'ON' : 'OFF'} ${deviceLabel}. Check ESP32 power and Wi-Fi connection.`,
        duration: 5000,
      });
    }
  };

  const turnOffAllDevices = async () => {
    if (isLocked) return;
    hapticMedium();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const desired = {
      fanIn: false,
      fanOut: false,
      fans: false,
      misters: false,
      lights: false,
      valve: false,
      co2: false,
    };
    setDevices(desired);
    try {
      await update(ref(db, 'kabutech/settings/setpoints/devices'), desired);
      showToast({ type: 'info', text1: 'All Actuators Switched Off', text2: 'Hardware returned to standby.' });
    } catch (e: any) {
      showToast({ type: 'error', text1: 'Action Failed', text2: e?.message || 'Unable to update devices' });
    }
  };

  const executeSetMode = (mode: 'auto' | 'manual' | 'scheduled') => {
    let nextDevices = settings?.setpoints?.devices || DEFAULT_DEVICES;
    if (mode === 'scheduled') {
      nextDevices = computeScheduledDevicesState(settings?.schedules);
    } else if (mode === 'auto') {
      nextDevices = computeAutoDevicesState(sensors, settings?.setpoints);
    }

    setDevices(nextDevices);

    update(ref(db, 'kabutech/settings/setpoints'), {
      mode,
      aiOverride: false,
      devices: nextDevices
    }).then(() => {
      showToast({ type: 'success', text1: `Switched to ${mode.toUpperCase()} Mode` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const setMode = (mode: 'auto' | 'manual' | 'scheduled') => {
    hapticSelection();
    if (isOffline) {
      showToast({ type: 'info', text1: 'Controller Offline', text2: 'Control modes cannot be changed while offline.' });
      return;
    }
    if (isAiOverride) {
      setPendingMode(mode);
      setShowStopAiModal(true);
    } else {
      executeSetMode(mode);
    }
  };

  const tabs = [
    {
      id: 'temp' as TabId,
      label: 'Temperature',
      icon: 'thermometer',
      color: '#f97316',
      unit: '°C',
      scaleMin: 10,
      scaleMax: 35,
      band: ACTIVE_PROFILE.temp,
      current: isTempDisconnected ? '--' : temp,
      isDisconnected: isTempDisconnected,
      rangeText: formatRangeText(ACTIVE_PROFILE.temp),
    },
    {
      id: 'hum' as TabId,
      label: 'Humidity',
      icon: 'water-opacity',
      color: '#3b82f6',
      unit: '%',
      scaleMin: 40,
      scaleMax: 100,
      band: ACTIVE_PROFILE.hum,
      current: isHumDisconnected ? '--' : hum,
      isDisconnected: isHumDisconnected,
      rangeText: formatRangeText(ACTIVE_PROFILE.hum),
    },
    {
      id: 'light' as TabId,
      label: 'Light Level',
      icon: 'white-balance-sunny',
      color: '#eab308',
      unit: 'Lx',
      scaleMin: 0,
      scaleMax: 1200,
      band: ACTIVE_PROFILE.light,
      current: isLightDisconnected ? '--' : light,
      isDisconnected: isLightDisconnected,
      rangeText: formatRangeText(ACTIVE_PROFILE.light),
    },
    {
      id: 'co2' as TabId,
      label: 'CO2 Level',
      icon: 'molecule-co2',
      color: '#10b981',
      unit: 'ppm',
      scaleMin: 300,
      scaleMax: 1600,
      band: ACTIVE_PROFILE.co2,
      current: isCo2Disconnected ? '--' : co2,
      isDisconnected: isCo2Disconnected,
      rangeText: formatRangeText(ACTIVE_PROFILE.co2),
    },
  ];
  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

  const scrollToTab = (tabId: string) => {
    const layout = tabLayouts.current[tabId];
    if (layout && tabScrollRef.current) {
      const targetScrollX = Math.max(0, layout.x - width / 2 + layout.width / 2);
      tabScrollRef.current.scrollTo({ x: targetScrollX, animated: true });
    }
  };

  const [activeTab, setActiveTab] = useState<TabId>(route.params?.tab || 'temp');
  const activeTabRef = useRef<TabId>(activeTab);
  activeTabRef.current = activeTab;

  const tabIds: TabId[] = ['temp', 'hum', 'light', 'co2'];

  const selectTab = (tabId: TabId) => {
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    scrollToTab(tabId);
  };

  useEffect(() => {
    if (route.params?.tab) {
      selectTab(route.params.tab);
    }
  }, [route.params?.tab]);

  const switchTabRelative = (direction: 'next' | 'prev') => {
    const currentIndex = tabIds.indexOf(activeTabRef.current);
    if (direction === 'next' && currentIndex < tabIds.length - 1) {
      const nextTab = tabIds[currentIndex + 1];
      selectTab(nextTab);
      hapticSelection();
    } else if (direction === 'prev' && currentIndex > 0) {
      const prevTab = tabIds[currentIndex - 1];
      selectTab(prevTab);
      hapticSelection();
    }
  };

  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          switchTabRelative('next');
        } else if (gestureState.dx > 40) {
          switchTabRelative('prev');
        }
      },
    })
  ).current;

  const activeTabData = tabs.find(t => t.id === activeTab)!;
  const activeTabDataRef = useRef(activeTabData);
  activeTabDataRef.current = activeTabData;

  const activeDeviceCount = [
    Boolean(devices.fanIn),
    Boolean(devices.fanOut ?? devices.fans),
    Boolean(devices.misters),
    Boolean(devices.lights),
  ].filter(Boolean).length;

  const actuatorDevices = [
    {
      key: 'fanIn',
      name: 'Intake',
      roleHint: 'Air Intake',
      icon: 'fan-chevron-down' as const,
      active: Boolean(devices.fanIn),
    },
    {
      key: 'fanOut',
      name: 'Exhaust',
      roleHint: 'Air Exhaust',
      icon: 'fan-chevron-up' as const,
      active: Boolean(devices.fanOut ?? devices.fans),
    },
    {
      key: 'misters',
      name: 'Mister',
      roleHint: 'Humidity',
      icon: 'water-percent' as const,
      active: Boolean(devices.misters),
    },
    {
      key: 'lights',
      name: 'Lights',
      roleHint: 'Lighting',
      icon: 'lightbulb-on' as const,
      active: Boolean(devices.lights),
    },
  ];

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      {!isReady ? (
        <ControlsScreenSkeleton />
      ) : (
      <ScrollView
        contentContainerStyle={tw`pb-40 pt-2`}
        showsVerticalScrollIndicator={false}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        

        {/* Horizontal Environmental Parameter Selector */}
        <View style={tw`mb-5`}>
          <ScrollView 
            ref={tabScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            decelerationRate="normal"
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            overScrollMode="never"
            contentContainerStyle={tw`px-5 gap-2.5`}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isTabFault = tab.isDisconnected;
              const tabColor = isTabFault ? (isDarkMode ? '#64748b' : '#94a3b8') : tab.color;

              return (
                <TouchableOpacity 
                  activeOpacity={0.75}
                  delayPressIn={50}
                  key={tab.id}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayouts.current[tab.id] = { x, width };
                  }}
                  onPress={() => {
                    hapticSelection();
                    selectTab(tab.id);
                  }}
                  style={[
                    tw`px-3.5 py-2.5 rounded-2xl border flex-row items-center gap-2.5 shadow-sm`,
                    isActive 
                      ? [tw`bg-white dark:bg-slate-800`, { borderColor: tabColor, borderWidth: 1.5 }] 
                      : tw`bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800`,
                    isTabFault && !isActive ? tw`opacity-70` : null,
                  ]}
                >
                  <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: isTabFault ? (isDarkMode ? '#334155' : '#f1f5f9') : `${tab.color}18` }]}>
                    <MaterialCommunityIcons 
                      name={tab.icon as any} 
                      size={18} 
                      color={tabColor} 
                    />
                  </View>
                  <View>
                    <View style={tw`flex-row items-center gap-1`}>
                      <Text style={[tw`text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                        {tab.label}
                      </Text>
                      {isTabFault && (
                        <View style={tw`w-1.5 h-1.5 rounded-full bg-rose-500`} />
                      )}
                    </View>
                    <Text style={[tw`text-[13px]`, isTabFault ? tw`text-slate-400 dark:text-slate-500` : (isActive ? tw`text-slate-900 dark:text-white` : tw`text-slate-700 dark:text-slate-300`), { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      {tab.rangeText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {/* Quick Link to Schedule Config */}
            <TouchableOpacity 
              activeOpacity={0.75}
              delayPressIn={50}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                tabLayouts.current['schedule'] = { x, width };
              }}
              onPress={() => {
                hapticSelection();
                navigation.navigate('DeviceSchedules');
              }}
              style={tw`px-3.5 py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex-row items-center gap-2`}
            >
              <View style={tw`w-8 h-8 rounded-xl items-center justify-center bg-purple-500/10`}>
                <MaterialCommunityIcons 
                  name="calendar-clock" 
                  size={18} 
                  color="#a855f7" 
                />
              </View>
              <View>
                <Text style={[tw`text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Timer
                </Text>
                <Text style={[tw`text-[12px] text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Schedule
                </Text>
              </View>
            </TouchableOpacity>

            {/* Quick Link to Analytics Trends */}
            <TouchableOpacity 
              activeOpacity={0.75}
              delayPressIn={50}
              onPress={() => {
                hapticSelection();
                navigation.navigate('Analytics', { metric: activeTab });
              }}
              style={tw`px-3.5 py-2.5 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 flex-row items-center gap-2`}
            >
              <View style={tw`w-8 h-8 rounded-xl items-center justify-center bg-emerald-500/10`}>
                <MaterialCommunityIcons 
                  name="chart-line" 
                  size={18} 
                  color="#10b981" 
                />
              </View>
              <View>
                <Text style={[tw`text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  History
                </Text>
                <Text style={[tw`text-[12px] text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Trends
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Central Read-Only Range Gauge (Research Band + Grace Bearing + Live Marker) */}
        <View {...swipePanResponder.panHandlers}>
          <RangeGauge 
            scaleMin={activeTabData.scaleMin}
            scaleMax={activeTabData.scaleMax}
            band={activeTabData.band}
            current={activeTabData.current}
            color={activeTabData.color}
            unit={activeTabData.unit}
            label={activeTabData.label}
            isDarkMode={isDarkMode}
            isOffline={isOffline}
            isDisconnected={activeTabData.isDisconnected}
          />
        </View>

        {/* Mode Selector Pill */}
        <View style={tw`flex-row justify-center px-5 mb-4`}>
          <View style={tw`flex-row bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1 shadow-sm`}>
            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setMode('auto')}
              style={[tw`px-4 py-2 rounded-xl flex-row items-center gap-1.5`, isAuto ? tw`bg-emerald-500 shadow-sm` : tw`bg-transparent`]}
            >
              {isAuto && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, isAuto ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                AUTO
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setMode('scheduled')}
              style={[tw`px-4 py-2 rounded-xl flex-row items-center gap-1.5`, isScheduled ? tw`bg-purple-600 shadow-sm` : tw`bg-transparent`]}
            >
              {isScheduled && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, isScheduled ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                TIMED
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                if (isOffline) {
                  showToast({ type: 'info', text1: 'Controller Offline', text2: 'Hardware is running autonomous AI Auto locally while offline.' });
                  return;
                }
                if (isLocked) DeviceEventEmitter.emit('showManualOverrideModal');
              }}
              style={[tw`px-4 py-2 rounded-xl flex-row items-center gap-1.5`, (!isAuto && !isScheduled) ? tw`bg-amber-500 shadow-sm` : tw`bg-transparent`]}
            >
              {(!isAuto && !isScheduled) && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, (!isAuto && !isScheduled) ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                MANUAL
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Local AI Auto Failsafe Banner */}
        {isOffline ? (
          <View style={tw`mx-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex-row items-center gap-3 mb-4`}>
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color="#f59e0b" />
            <Text style={[tw`text-[11px] text-amber-900 dark:text-amber-200 flex-1`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
              Controller is currently offline. Hardware runs autonomous AI Auto locally until reconnected.
            </Text>
          </View>
        ) : null}

        {/* AI / Lock Status Notification */}
        {isAiOverride ? (
          <View style={tw`mx-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl px-4 py-2.5 flex-row items-center gap-3 mb-5`}>
            <MaterialCommunityIcons name="brain" size={18} color="#3b82f6" />
            <Text style={[tw`text-[11px] text-blue-900 dark:text-blue-200 flex-1`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
              AI Pre-emptive Override is active. Controls are locked.
            </Text>
            <TouchableOpacity 
              onPress={() => {
                DeviceEventEmitter.emit('cancelAiOverride');
                update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });
                update(ref(db, 'kabutech/settings/setpoints/devices'), { fans: false, misters: false, lights: false, co2: false });
                showToast({ type: 'info', text1: 'Action Cancelled', text2: 'Override aborted. Returned to AUTO.' });
              }}
              style={tw`bg-blue-500 px-3 py-1.5 rounded-xl`}
            >
              <Text style={[tw`text-white text-[10px]`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>Abort</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Hardware Actuators Single-Line Modular Console (Ultra-Compact & Sleek) */}
        <View style={tw`px-5 pt-0.5 mb-2`}>
          {/* Section Header */}
          <View style={tw`flex-row justify-between items-center mb-2.5`}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 items-center justify-center`}>
                <MaterialCommunityIcons name="toggle-switch-outline" size={16} color="#10b981" />
              </View>
              <Text style={[tw`text-[14px] text-slate-900 dark:text-white tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Hardware Actuators
              </Text>
            </View>

            <View style={tw`flex-row items-center gap-1.5`}>
              {/* All Off Safety Cutoff Button (visible in manual mode when at least 1 device is running) */}
              {!isLocked && activeDeviceCount > 0 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={turnOffAllDevices}
                  style={tw`px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex-row items-center gap-1`}
                >
                  <MaterialCommunityIcons name="power" size={11} color="#ef4444" />
                  <Text style={[tw`text-[9.5px] text-rose-600 dark:text-rose-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                    All Off
                  </Text>
                </TouchableOpacity>
              )}

              {/* Mode Status Pill */}
              <TouchableOpacity
                activeOpacity={isLocked ? 0.75 : 1}
                onPress={() => {
                  if (isOffline) {
                    hapticSelection();
                    showToast({ type: 'info', text1: 'Autonomous Local Mode', text2: 'TinyML AI Auto is actively regulating actuators locally while offline.' });
                    return;
                  }
                  if (isLocked) {
                    hapticSelection();
                    DeviceEventEmitter.emit('showManualOverrideModal');
                  }
                }}
                style={[
                  tw`px-2.5 py-1 rounded-full border flex-row items-center gap-1.2`,
                  isOffline
                    ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800`
                    : isAiOverride
                    ? tw`bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800`
                    : isAuto
                    ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800`
                    : isScheduled
                    ? tw`bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800`
                    : tw`bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700`
                ]}
              >
                <View
                  style={[
                    tw`w-1.5 h-1.5 rounded-full`,
                    isOffline
                      ? tw`bg-emerald-500`
                      : isAiOverride
                      ? tw`bg-blue-500`
                      : isAuto
                      ? tw`bg-emerald-500`
                      : isScheduled
                      ? tw`bg-purple-500`
                      : tw`bg-emerald-500`
                  ]}
                />
                <Text
                  style={[
                    tw`text-[9.5px]`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                    isOffline
                      ? tw`text-emerald-600 dark:text-emerald-400`
                      : isAiOverride
                      ? tw`text-blue-600 dark:text-blue-400`
                      : isAuto
                      ? tw`text-emerald-600 dark:text-emerald-400`
                      : isScheduled
                      ? tw`text-purple-600 dark:text-purple-400`
                      : tw`text-slate-600 dark:text-slate-400`
                  ]}
                >
                  {isOffline ? 'LOCAL AI AUTO' : isAiOverride ? 'AI Locked' : isAuto ? 'AUTO' : isScheduled ? 'TIMED' : `${activeDeviceCount} Active`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hardware Actuators Console (Minimal Single-Row Dock) */}
          <View
            style={[
              tw`bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex-row items-center justify-between mb-2`,
              { overflow: 'hidden' },
              isOffline ? tw`opacity-50` : null,
            ]}
          >
            {actuatorDevices.map((device) => {
              const showActive = device.active;
              const isHighlightActive = showActive && !isLocked;
              const isAutoActive = showActive && isLocked;

              return (
                <TouchableOpacity
                  key={device.key}
                  activeOpacity={isOffline ? 1 : 0.7}
                  disabled={isOffline}
                  onPress={() => {
                    if (isOffline) {
                      hapticLight();
                      showToast({
                        type: 'info',
                        text1: 'Controller Offline',
                        text2: 'Equipment cannot be controlled while the controller is offline.',
                      });
                      return;
                    }
                    if (isLocked) {
                      hapticLight();
                      showToast({
                        type: 'info',
                        text1: `${isAiOverride ? 'AI Override' : isAuto ? 'Automatic Mode' : 'Scheduled Mode'} Active`,
                        text2: 'Switch to MANUAL mode above to control equipment.',
                      });
                      return;
                    }
                    toggleDevice(device.key, !showActive);
                  }}
                  style={[
                    tw`flex-1 items-center justify-center py-2 px-0.5 rounded-xl`,
                    isHighlightActive
                      ? (isDarkMode ? tw`bg-emerald-500/15` : tw`bg-emerald-50`)
                      : isAutoActive
                      ? (isDarkMode ? tw`bg-slate-800/80` : tw`bg-slate-100/80`)
                      : null,
                  ]}
                >
                  {/* Icon with Glowing Tactile LED Status Dot */}
                  <View style={tw`relative items-center justify-center`}>
                    <MaterialCommunityIcons
                      name={device.icon}
                      size={19}
                      color={
                        isOffline
                          ? (isDarkMode ? '#64748b' : '#94a3b8')
                          : isHighlightActive
                          ? '#059669'
                          : isAutoActive
                          ? (isDarkMode ? '#34d399' : '#059669')
                          : (isDarkMode ? '#64748b' : '#94a3b8')
                      }
                    />
                    {/* Minimal LED Indicator Dot */}
                    <View
                      style={[
                        tw`absolute -top-1 -right-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900`,
                        {
                          backgroundColor: isOffline
                            ? (isDarkMode ? '#475569' : '#cbd5e1')
                            : showActive
                            ? (isDarkMode ? '#34d399' : '#10b981')
                            : (isDarkMode ? '#475569' : '#cbd5e1'),
                        },
                      ]}
                    />
                  </View>

                  {/* Actuator Name */}
                  <Text
                    numberOfLines={1}
                    style={[
                      tw`text-[10px] mt-1 text-center`,
                      { fontFamily: 'PlusJakartaSans_700Bold' },
                      isOffline
                        ? (isDarkMode ? tw`text-slate-500` : tw`text-slate-400`)
                        : isHighlightActive
                        ? (isDarkMode ? tw`text-white` : tw`text-slate-900`)
                        : isAutoActive
                        ? (isDarkMode ? tw`text-slate-300` : tw`text-slate-700`)
                        : (isDarkMode ? tw`text-slate-400` : tw`text-slate-600`),
                    ]}
                  >
                    {device.name}
                  </Text>

                  {/* Micro-State: ON / OFF with Dot Status */}
                  <Text
                    style={[
                      tw`text-[8.5px] uppercase tracking-wider mt-0.5`,
                      { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                      isOffline
                        ? tw`text-slate-400 dark:text-slate-600`
                        : isHighlightActive
                        ? (isDarkMode ? tw`text-emerald-400` : tw`text-emerald-600`)
                        : isAutoActive
                        ? (isDarkMode ? tw`text-slate-400` : tw`text-slate-500`)
                        : tw`text-slate-400 dark:text-slate-500`,
                    ]}
                  >
                    {showActive ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>
      )}

      {/* Modern Stop AI Modal */}
      <Modal visible={showStopAiModal} transparent={true} animationType="fade" onRequestClose={() => setShowStopAiModal(false)}>
        <View style={tw`flex-1 bg-black/60 justify-center items-center px-6`}>
          <View style={tw`w-full bg-white dark:bg-slate-800 rounded-3xl p-6 items-center shadow-2xl`}>
            <View style={tw`w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-full items-center justify-center mb-4`}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#ef4444" />
            </View>
            <Text style={[tw`text-xl text-slate-800 dark:text-white mb-2 text-center`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Stop AI Override?</Text>
            <Text style={[tw`text-[13px] text-slate-500 dark:text-slate-400 text-center mb-6 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              Switching modes will abort the current AI pre-emptive cycle and turn off all overridden equipment. Do you wish to continue?
            </Text>
            
            <View style={tw`flex-row gap-3 w-full`}>
              <TouchableOpacity 
                style={tw`flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-700 items-center justify-center`}
                onPress={() => setShowStopAiModal(false)}
              >
                <Text style={[tw`text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={tw`flex-1 py-3.5 rounded-xl bg-red-500 items-center justify-center`}
                onPress={() => {
                  setShowStopAiModal(false);
                  DeviceEventEmitter.emit('cancelAiOverride');
                  update(ref(db, 'kabutech/settings/setpoints/devices'), { fans: false, misters: false, lights: false, co2: false });
                  if (pendingMode) executeSetMode(pendingMode);
                }}
              >
                <Text style={[tw`text-white`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Yes, Stop AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
