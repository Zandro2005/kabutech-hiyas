import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, DeviceEventEmitter, Alert, Modal, PanResponder } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CircularSlider from '../components/CircularSlider';
import ScreenHeader from '../components/ScreenHeader';
import ControlsScreenSkeleton from '../components/skeletons/ControlsScreenSkeleton';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/CustomToast';
import { hapticLight, hapticMedium, hapticSelection } from '../utils/haptics';
import { computeScheduledDevicesState, computeAutoDevicesState } from '../utils/scheduleLogic';
import { useResponsive } from '../utils/responsive';
import { useTabBarScroll } from '../context/TabBarContext';

type TabId = 'temp' | 'hum' | 'light' | 'co2';

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
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => setIsReady(true));
      return () => cancelIdleCallback(handle);
    }
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const temp = typeof sensors.temperature === 'number' ? sensors.temperature : 32.8;
  const hum = typeof sensors.humidity === 'number' ? sensors.humidity : 51;
  const light = typeof sensors.light === 'number' ? sensors.light : 71;
  const co2 = typeof sensors.co2 === 'number' ? sensors.co2 : 583;
  const waterLevel = typeof sensors.waterLevel === 'number' ? sensors.waterLevel : 75;

  const isTempDisconnected = health.tempError || temp === -999 || temp <= 0;
  const isHumDisconnected = health.humError || hum === -999 || hum <= 0;
  const isLightDisconnected = health.lightError || light === -999 || light < 0;
  const isCo2Disconnected = health.co2Error || co2 === -999 || co2 < 0;

  const rawTargetTemp = typeof settings?.setpoints?.temperature === 'number'
    ? settings.setpoints.temperature
    : parseFloat(settings?.setpoints?.temperature as any) || 28.0;
  const targetTemp = Math.max(18, Math.min(35, rawTargetTemp));

  const rawTargetHum = typeof settings?.setpoints?.humidity === 'number'
    ? settings.setpoints.humidity
    : parseFloat(settings?.setpoints?.humidity as any) || 85;
  const targetHum = Math.max(50, Math.min(95, rawTargetHum));

  const rawTargetLight = typeof settings?.setpoints?.light === 'number'
    ? settings.setpoints.light
    : parseFloat(settings?.setpoints?.light as any) || 580;
  const targetLight = Math.max(200, Math.min(800, rawTargetLight));

  const rawTargetCO2 = typeof settings?.setpoints?.co2 === 'number'
    ? settings.setpoints.co2
    : parseFloat(settings?.setpoints?.co2 as any) || 690;
  const targetCO2 = Math.max(300, Math.min(1200, rawTargetCO2));

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';
  
  const rawDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false, co2: false };
  const [devices, setDevices] = useState(rawDevices);

  useEffect(() => {
    if (isScheduled) {
      const interval = setInterval(() => {
        setDevices(computeScheduledDevicesState(settings?.schedules));
      }, 3000);
      setDevices(computeScheduledDevicesState(settings?.schedules));
      return () => clearInterval(interval);
    } else if (isAuto) {
      const interval = setInterval(() => {
        setDevices(computeAutoDevicesState(sensors, settings?.setpoints));
      }, 3000);
      setDevices(computeAutoDevicesState(sensors, settings?.setpoints));
      return () => clearInterval(interval);
    } else {
      setDevices(rawDevices);
    }
  }, [isScheduled, isAuto, settings?.schedules, settings?.setpoints, sensors, rawDevices]);

  const isAiOverride = settings?.setpoints?.aiOverride === true;
  const isLocked = isAuto || isScheduled || isAiOverride;

  const updateSetpoint = (key: string, value: number, label?: string, unit?: string) => {
    showToast({ type: 'success', text1: `${label || 'Target'} updated to ${value}${unit || ''}` });
    update(ref(db, 'kabutech/settings/setpoints'), {
      [key]: value
    }).catch(err => {
      Alert.alert("Error Saving", err.message);
      if (pendingTargetRef.current !== null) {
        pendingTargetRef.current = null;
        setLocalTarget(activeTabDataRef.current.target);
      }
    });
  };

  const toggleDevice = async (key: string, state: boolean) => {
    if (isLocked) return;
    hapticMedium();

    const previousState = devices[key as keyof typeof devices];

    // ⚡ 0ms Optimistic UI update for instant touch response
    setDevices(prev => ({ ...prev, [key]: state }));

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

    try {
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        [key]: state
      });
      if (delayTimer) clearTimeout(delayTimer);

      const elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        showToast({
          type: 'success',
          text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${state ? 'ON' : 'OFF'} (${(elapsed / 1000).toFixed(1)}s)`,
          text2: 'Delivered after network delay.',
        });
      } else {
        showToast({ type: 'success', text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${state ? 'ON' : 'OFF'}` });
      }
    } catch (err: any) {
      if (delayTimer) clearTimeout(delayTimer);
      // Revert if network error
      setDevices(prev => ({ ...prev, [key]: previousState }));
      showToast({
        type: 'error',
        text1: 'Command Timed Out / Failed',
        text2: `Failed to turn ${state ? 'ON' : 'OFF'} ${key}. Check ESP32 power and Wi-Fi connection.`,
        duration: 5000,
      });
    }
  };

  const turnOffAllDevices = async () => {
    if (isLocked) return;
    hapticMedium();
    const desired = { fans: false, misters: false, lights: false, co2: false };
    setDevices(desired);
    try {
      await update(ref(db, 'kabutech/settings/setpoints/devices'), desired);
      showToast({ type: 'info', text1: 'All Actuators Switched Off', text2: 'Hardware returned to standby.' });
    } catch (e: any) {
      showToast({ type: 'error', text1: 'Action Failed', text2: e?.message || 'Unable to update devices' });
    }
  };

  const executeSetMode = (mode: 'auto' | 'manual' | 'scheduled') => {
    let nextDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false, co2: false };
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
    if (isAiOverride) {
      setPendingMode(mode);
      setShowStopAiModal(true);
    } else {
      executeSetMode(mode);
    }
  };

  const tabs = [
    { id: 'temp' as TabId, label: 'Temperature', icon: 'thermometer', color: '#f97316', unit: '°C', min: 18, max: 35, step: 0.5, current: isTempDisconnected ? '--' : temp, isDisconnected: isTempDisconnected, target: targetTemp, optimal: '24-28', dbKey: 'temperature' },
    { id: 'hum' as TabId, label: 'Humidity', icon: 'water-opacity', color: '#3b82f6', unit: '%', min: 50, max: 95, step: 1, current: isHumDisconnected ? '--' : hum, isDisconnected: isHumDisconnected, target: targetHum, optimal: '80-90', dbKey: 'humidity' },
    { id: 'light' as TabId, label: 'Light Level', icon: 'white-balance-sunny', color: '#eab308', unit: 'Lx', min: 200, max: 800, step: 10, current: isLightDisconnected ? '--' : light, isDisconnected: isLightDisconnected, target: targetLight, optimal: '500-800', dbKey: 'light' },
    { id: 'co2' as TabId, label: 'CO2 Level', icon: 'molecule-co2', color: '#10b981', unit: 'ppm', min: 300, max: 1200, step: 10, current: isCo2Disconnected ? '--' : co2, isDisconnected: isCo2Disconnected, target: targetCO2, optimal: '< 800', dbKey: 'co2' },
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

  const [isSliding, setIsSliding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(route.params?.tab || 'temp');
  const activeTabRef = useRef<TabId>(activeTab);
  activeTabRef.current = activeTab;

  const tabIds: TabId[] = ['temp', 'hum', 'light', 'co2'];

  const selectTab = (tabId: TabId) => {
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    scrollToTab(tabId);
    const targetTab = tabs.find(t => t.id === tabId);
    if (targetTab) {
      pendingTargetRef.current = null;
      isInteractingRef.current = false;
      setLocalTarget(targetTab.target);
      localTargetRef.current = targetTab.target;
    }
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

  useEffect(() => {
    activeTabDataRef.current = activeTabData;
  }, [activeTabData]);

  const [localTarget, setLocalTarget] = useState<number>(activeTabData.target);
  const localTargetRef = useRef<number>(activeTabData.target);
  localTargetRef.current = localTarget;
  const pendingTargetRef = useRef<number | null>(null);
  const isInteractingRef = useRef<boolean>(false);
  const lastActiveTabRef = useRef<TabId>(activeTab);

  // Sync from Firebase only when active tab changes, or when not currently interacting/pending
  useEffect(() => {
    // Tab switched: always reset and display new tab's target
    if (lastActiveTabRef.current !== activeTab) {
      lastActiveTabRef.current = activeTab;
      pendingTargetRef.current = null;
      isInteractingRef.current = false;
      setLocalTarget(activeTabData.target);
      localTargetRef.current = activeTabData.target;
      return;
    }

    // If incoming Firebase target matches our pending target, it has been confirmed by the server
    if (pendingTargetRef.current !== null) {
      if (Math.abs(activeTabData.target - pendingTargetRef.current) < 0.01) {
        pendingTargetRef.current = null;
      }
      return; // Ignore stale intermediate snapshots while pending
    }

    // Do not let background snapshots override while user is actively pressing buttons or dragging
    if (isInteractingRef.current) {
      return;
    }

    // Otherwise keep localTarget in sync with remote target
    setLocalTarget(activeTabData.target);
    localTargetRef.current = activeTabData.target;
  }, [activeTabData.target, activeTab]);

  // Commit target to Firebase only when user finishes interacting (touch released)
  const commitTarget = (val: number) => {
    isInteractingRef.current = false;
    pendingTargetRef.current = val;
    const dbKey = activeTabDataRef.current.dbKey;
    const label = activeTabDataRef.current.label;
    const unit = activeTabDataRef.current.unit;
    updateSetpoint(dbKey, val, label, unit);

    setTimeout(() => {
      if (pendingTargetRef.current === val) {
        pendingTargetRef.current = null;
      }
    }, 2500);
  };

  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    const wasInteracting = isInteractingRef.current;
    isInteractingRef.current = false;
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wasInteracting) {
      commitTarget(localTargetRef.current);
    }
  };

  const startIncrement = () => {
    stopTimer();
    isInteractingRef.current = true;
    hapticSelection();
    const current = Number(localTargetRef.current) || activeTabDataRef.current.min;
    const step = activeTabDataRef.current.step ?? 1;
    const decimals = step < 1 ? 1 : 0;
    const next = Math.min(activeTabDataRef.current.max, Number((current + step).toFixed(decimals)));
    localTargetRef.current = next;
    setLocalTarget(next);

    repeatTimeoutRef.current = setTimeout(() => {
      timerRef.current = setInterval(() => {
        hapticLight();
        const cur = Number(localTargetRef.current) || activeTabDataRef.current.min;
        const nxt = Math.min(activeTabDataRef.current.max, Number((cur + step).toFixed(decimals)));
        localTargetRef.current = nxt;
        setLocalTarget(nxt);
      }, 100);
    }, 380);
  };

  const startDecrement = () => {
    stopTimer();
    isInteractingRef.current = true;
    hapticSelection();
    const current = Number(localTargetRef.current) || activeTabDataRef.current.min;
    const step = activeTabDataRef.current.step ?? 1;
    const decimals = step < 1 ? 1 : 0;
    const next = Math.max(activeTabDataRef.current.min, Number((current - step).toFixed(decimals)));
    localTargetRef.current = next;
    setLocalTarget(next);

    repeatTimeoutRef.current = setTimeout(() => {
      timerRef.current = setInterval(() => {
        hapticLight();
        const cur = Number(localTargetRef.current) || activeTabDataRef.current.min;
        const nxt = Math.max(activeTabDataRef.current.min, Number((cur - step).toFixed(decimals)));
        localTargetRef.current = nxt;
        setLocalTarget(nxt);
      }, 100);
    }, 380);
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  const activeDeviceCount = Object.values(devices).filter(Boolean).length;

  const deviceToggles = [
    {
      key: 'fans',
      name: 'Ventilation',
      tag: 'FANS',
      roleHint: 'Airflow',
      subtitle: 'Exhaust & Circulation',
      icon: 'fan' as const,
      active: Boolean(devices.fans),
      color: '#10b981',
      activeStatus: 'Active Flow',
      inactiveStatus: 'Standby',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50 dark:border-emerald-500/40',
      activeGlow: 'bg-emerald-500',
    },
    {
      key: 'misters',
      name: 'Humidifier',
      tag: 'MIST',
      roleHint: 'Fogger',
      subtitle: 'Ultrasonic Fogger',
      icon: 'water-percent' as const,
      active: Boolean(devices.misters),
      color: '#10b981',
      activeStatus: 'Misting Active',
      inactiveStatus: 'Standby',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50 dark:border-emerald-500/40',
      activeGlow: 'bg-emerald-500',
      isLowWater: waterLevel <= 20,
    },
    {
      key: 'lights',
      name: 'Grow Lights',
      tag: 'LIGHTS',
      roleHint: 'LED Array',
      subtitle: 'Full Spectrum Array',
      icon: 'lightbulb-on' as const,
      active: Boolean(devices.lights),
      color: '#10b981',
      activeStatus: 'Illuminating',
      inactiveStatus: 'Dark Cycle',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50 dark:border-emerald-500/40',
      activeGlow: 'bg-emerald-500',
    },
    {
      key: 'co2',
      name: 'CO2 Gas Valve',
      tag: 'VALVE',
      roleHint: 'Gas Flow',
      subtitle: 'Aeration Solenoid',
      icon: 'molecule-co2' as const,
      active: Boolean(devices.co2),
      color: '#10b981',
      activeStatus: 'Valve Open',
      inactiveStatus: 'Sealed',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50 dark:border-emerald-500/40',
      activeGlow: 'bg-emerald-500',
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
        scrollEnabled={!isSliding}
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
                      ? [tw`bg-white dark:bg-slate-800`, { borderColor: tab.color, borderWidth: 1.5 }] 
                      : tw`bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800`
                  ]}
                >
                  <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: `${tab.color}18` }]}>
                    <MaterialCommunityIcons 
                      name={tab.icon as any} 
                      size={18} 
                      color={tab.color} 
                    />
                  </View>
                  <View>
                    <Text style={[tw`text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {tab.label}
                    </Text>
                    <Text style={[tw`text-[13px] ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                      {isActive ? localTarget : tab.target}{tab.unit}
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

        {/* Central Interactive Dial Area */}
        <CircularSlider 
          localTarget={localTarget} 
          activeTabData={activeTabData} 
          isDarkMode={isDarkMode} 
          onValueChange={(val) => {
            isInteractingRef.current = true;
            localTargetRef.current = val;
            setLocalTarget(val);
          }}
          onSlidingStart={() => {
            isInteractingRef.current = true;
            setIsSliding(true);
          }}
          onSlidingComplete={(val) => {
            setIsSliding(false);
            commitTarget(val);
          }}
        />

        {/* Precision Stepper & Mode Switcher Row (Swipe left/right to change parameter) */}
        <View 
          {...swipePanResponder.panHandlers}
          style={tw`flex-row items-center justify-center px-5 mb-3 sm:mb-4 gap-3`}
        >
          {/* Decrement Button */}
          <TouchableOpacity 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            onPressIn={startDecrement}
            onPressOut={stopTimer}
            style={tw`w-11 h-11 rounded-2xl border border-slate-200/80 dark:border-slate-700 items-center justify-center bg-white dark:bg-slate-800 shadow-sm`}
          >
            <MaterialCommunityIcons name="minus" size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>

          {/* Mode Selector Pill */}
          <View style={tw`flex-row bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1 shadow-sm`}>
            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setMode('auto')}
              style={[tw`px-3.5 py-2 rounded-xl flex-row items-center gap-1.5`, isAuto ? tw`bg-emerald-500 shadow-sm` : tw`bg-transparent`]}
            >
              {isAuto && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, isAuto ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                AUTO
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => setMode('scheduled')}
              style={[tw`px-3.5 py-2 rounded-xl flex-row items-center gap-1.5`, isScheduled ? tw`bg-purple-600 shadow-sm` : tw`bg-transparent`]}
            >
              {isScheduled && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, isScheduled ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                TIMED
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                if (isLocked) DeviceEventEmitter.emit('showManualOverrideModal');
              }}
              style={[tw`px-3.5 py-2 rounded-xl flex-row items-center gap-1.5`, (!isAuto && !isScheduled) ? tw`bg-amber-500 shadow-sm` : tw`bg-transparent`]}
            >
              {(!isAuto && !isScheduled) && <View style={tw`w-1.5 h-1.5 rounded-full bg-white`} />}
              <Text style={[tw`text-[11px]`, (!isAuto && !isScheduled) ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.3 }]}>
                MANUAL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Increment Button */}
          <TouchableOpacity 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            onPressIn={startIncrement}
            onPressOut={stopTimer}
            style={tw`w-11 h-11 rounded-2xl border border-slate-200/80 dark:border-slate-700 items-center justify-center bg-white dark:bg-slate-800 shadow-sm`}
          >
            <MaterialCommunityIcons name="plus" size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
        </View>

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

        {/* Hardware Actuators Modern 2x2 Console */}
        <View style={tw`px-5 pt-1 mb-2`}>
          {/* Section Header */}
          <View style={tw`flex-row justify-between items-center mb-2`}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-1.5 h-3.5 rounded-full bg-[#10b981]`} />
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
                  if (isLocked) {
                    hapticSelection();
                    DeviceEventEmitter.emit('showManualOverrideModal');
                  }
                }}
                style={[
                  tw`px-2.5 py-1 rounded-full border flex-row items-center gap-1.2`,
                  isAiOverride
                    ? tw`bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800`
                    : isAuto
                    ? tw`bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800`
                    : isScheduled
                    ? tw`bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800`
                    : tw`bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700`
                ]}
              >
                {isLocked ? (
                  <MaterialCommunityIcons
                    name="lock"
                    size={10}
                    color={isAiOverride ? '#3b82f6' : isAuto ? '#10b981' : '#a855f7'}
                  />
                ) : (
                  <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                )}
                <Text
                  style={[
                    tw`text-[9.5px]`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                    isAiOverride
                      ? tw`text-blue-600 dark:text-blue-400`
                      : isAuto
                      ? tw`text-emerald-600 dark:text-emerald-400`
                      : isScheduled
                      ? tw`text-purple-600 dark:text-purple-400`
                      : tw`text-slate-600 dark:text-slate-400`
                  ]}
                >
                  {isAiOverride ? 'AI Locked' : isAuto ? 'AUTO' : isScheduled ? 'TIMED' : `${activeDeviceCount} Active`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hardware Actuators Single-Line Modular Console */}
          <View style={tw`flex-row justify-between gap-2 mb-2`}>
            {deviceToggles.map((device) => {
              const showActive = device.active;

              return (
                <TouchableOpacity
                  key={device.key}
                  activeOpacity={isLocked ? 0.85 : 0.75}
                  onPress={() => {
                    if (isLocked) {
                      hapticLight();
                      showToast({
                        type: 'info',
                        text1: `${isAiOverride ? 'AI Override' : isAuto ? 'Automatic Mode' : 'Scheduled Mode'} Active`,
                        text2: 'Tap MANUAL above to control equipment directly.',
                      });
                      return;
                    }
                    toggleDevice(device.key, !device.active);
                  }}
                  style={[
                    tw`flex-1 rounded-2xl py-1 px-1 items-center justify-between border`,
                    { height: 60 },
                    showActive
                      ? [
                          isDarkMode ? tw`bg-slate-800/95` : tw`bg-emerald-50/50`,
                          tw`border-emerald-500/50 dark:border-emerald-500/40`,
                          tw`shadow-sm`,
                        ]
                      : [
                          isDarkMode ? tw`bg-slate-900/90 border-slate-800/80` : tw`bg-white/95 border-slate-200/80`,
                        ]
                  ]}
                >
                  {/* Top: Compact Squircle Icon Badge with Lock Indicator */}
                  <View style={tw`relative items-center justify-center`}>
                    <View
                      style={[
                        tw`w-6.5 h-6.5 rounded-lg items-center justify-center`,
                        showActive
                          ? [tw`bg-emerald-500/15 dark:bg-emerald-500/25`, { borderWidth: 1, borderColor: '#10b98140' }]
                          : (isDarkMode ? tw`bg-slate-800/80 border border-slate-700/50` : tw`bg-slate-100/90 border border-slate-200/60`)
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={device.icon}
                        size={15}
                        color={showActive ? '#10b981' : (isDarkMode ? '#64748b' : '#94a3b8')}
                      />
                    </View>

                    {/* Lock overlay glyph if automated */}
                    {isLocked && (
                      <View style={tw`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center border border-white dark:border-slate-800`}>
                        <MaterialCommunityIcons name="lock" size={5.5} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                      </View>
                    )}
                  </View>

                  {/* Middle: Equipment Tag */}
                  <Text
                    style={[
                      tw`text-[9px] uppercase tracking-wide text-center`,
                      { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                      showActive
                        ? (isDarkMode ? tw`text-emerald-400` : tw`text-emerald-700`)
                        : (isDarkMode ? tw`text-slate-300` : tw`text-slate-700`)
                    ]}
                    numberOfLines={1}
                  >
                    {device.tag}
                  </Text>

                  {/* Bottom: Compact Tactile State Pill */}
                  <View
                    style={[
                      tw`px-1.5 py-0.2 rounded-full flex-row items-center gap-1`,
                      showActive
                        ? [{ backgroundColor: '#10b981' }]
                        : (isDarkMode ? tw`bg-slate-800 border border-slate-700/60` : tw`bg-slate-100 border border-slate-200/60`)
                    ]}
                  >
                    <View
                      style={[
                        tw`w-1 h-1 rounded-full`,
                        showActive ? tw`bg-white` : tw`bg-slate-400 dark:bg-slate-500`
                      ]}
                    />
                    <Text
                      style={[
                        tw`text-[7.5px] tracking-wider`,
                        { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                        showActive ? tw`text-white` : tw`text-slate-500 dark:text-slate-400`
                      ]}
                    >
                      {device.key === 'misters' && device.isLowWater ? 'LOW' : (showActive ? 'ON' : 'OFF')}
                    </Text>
                  </View>
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
