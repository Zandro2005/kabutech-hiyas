import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, DeviceEventEmitter, Alert, Modal, PanResponder } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CircularSlider from '../components/CircularSlider';
import ScreenHeader from '../components/ScreenHeader';
import ControlsScreenSkeleton from '../components/skeletons/ControlsScreenSkeleton';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/CustomToast';
import { hapticLight, hapticMedium, hapticSelection } from '../utils/haptics';
import { computeScheduledDevicesState } from '../utils/scheduleLogic';
import { useResponsive } from '../utils/responsive';

type TabId = 'temp' | 'hum' | 'light' | 'co2';

export default function ControlsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const route = useRoute<any>();
  const { isDarkMode } = useTheme();
  const { width, isSmallDevice } = useResponsive();
  const sensors = useSensors();
  const settings = useSettings();
  
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

  const targetTemp = settings?.setpoints?.temperature || 28.0;
  const targetHum = settings?.setpoints?.humidity || 85;
  const targetLight = settings?.setpoints?.light || 580;
  const targetCO2 = settings?.setpoints?.co2 || 690;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';
  
  const rawDevices = settings?.setpoints?.devices || { fans: false, misters: false, lights: false, co2: false };
  const [devices, setDevices] = useState(rawDevices);

  useEffect(() => {
    if (isScheduled) {
      const interval = setInterval(() => {
        setDevices({ ...rawDevices, ...computeScheduledDevicesState(settings?.schedules) });
      }, 5000);
      setDevices({ ...rawDevices, ...computeScheduledDevicesState(settings?.schedules) });
      return () => clearInterval(interval);
    } else {
      setDevices(rawDevices);
    }
  }, [isScheduled, settings?.schedules, rawDevices]);

  const isAiOverride = settings?.setpoints?.aiOverride === true;
  const isLocked = isAuto || isScheduled || isAiOverride;

  const updateSetpoint = (key: string, value: number, label?: string, unit?: string) => {
    update(ref(db, 'kabutech/settings/setpoints'), {
      [key]: value
    }).then(() => {
      showToast({ type: 'success', text1: `${label || 'Target'} updated to ${value}${unit || ''}` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const toggleDevice = (key: string, state: boolean) => {
    if (isLocked) return;
    hapticMedium();
    update(ref(db, `kabutech/settings/setpoints/devices`), {
      [key]: state
    }).then(() => {
      showToast({ type: 'success', text1: `${key.charAt(0).toUpperCase() + key.slice(1)} turned ${state ? 'ON' : 'OFF'}` });
    }).catch(err => Alert.alert("Error Saving", err.message));
  };

  const executeSetMode = (mode: 'auto' | 'manual' | 'scheduled') => {
    update(ref(db, 'kabutech/settings/setpoints'), {
      mode,
      aiOverride: false
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
    { id: 'temp' as TabId, label: 'Temperature', icon: 'thermometer', color: '#f97316', unit: '°C', min: 18, max: 35, step: 0.5, current: temp, target: targetTemp, optimal: '24-28', dbKey: 'temperature' },
    { id: 'hum' as TabId, label: 'Humidity', icon: 'water-opacity', color: '#3b82f6', unit: '%', min: 50, max: 95, step: 1, current: hum, target: targetHum, optimal: '80-90', dbKey: 'humidity' },
    { id: 'light' as TabId, label: 'Light Level', icon: 'white-balance-sunny', color: '#eab308', unit: 'Lx', min: 200, max: 800, step: 10, current: light, target: targetLight, optimal: '500-800', dbKey: 'light' },
    { id: 'co2' as TabId, label: 'CO2 Level', icon: 'molecule-co2', color: '#10b981', unit: 'ppm', min: 300, max: 1200, step: 10, current: co2, target: targetCO2, optimal: '< 800', dbKey: 'co2' },
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
  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
      setTimeout(() => scrollToTab(route.params.tab), 250);
    }
  }, [route.params?.tab]);
  const tabIds: TabId[] = ['temp', 'hum', 'light', 'co2'];
  const switchTabRelative = (direction: 'next' | 'prev') => {
    const currentIndex = tabIds.indexOf(activeTab);
    if (direction === 'next' && currentIndex < tabIds.length - 1) {
      const nextTab = tabIds[currentIndex + 1];
      setActiveTab(nextTab);
      scrollToTab(nextTab);
      hapticSelection();
    } else if (direction === 'prev' && currentIndex > 0) {
      const prevTab = tabIds[currentIndex - 1];
      setActiveTab(prevTab);
      scrollToTab(prevTab);
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

  useEffect(() => {
    setLocalTarget(activeTabData.target);
  }, [activeTabData.target, activeTab]);

  useEffect(() => {
    if (localTarget === activeTabData.target) return;
    const timeout = setTimeout(() => {
      updateSetpoint(activeTabData.dbKey, localTarget, activeTabData.label, activeTabData.unit);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localTarget]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startIncrement = () => {
    hapticSelection();
    setLocalTarget(prev => {
      const next = Number((prev + activeTabDataRef.current.step).toFixed(1));
      return next <= activeTabDataRef.current.max ? next : prev;
    });

    timerRef.current = setInterval(() => {
      hapticLight();
      setLocalTarget(prev => {
        const next = Number((prev + activeTabDataRef.current.step).toFixed(1));
        return next <= activeTabDataRef.current.max ? next : prev;
      });
    }, 120);
  };

  const startDecrement = () => {
    hapticSelection();
    setLocalTarget(prev => {
      const next = Number((prev - activeTabDataRef.current.step).toFixed(1));
      return next >= activeTabDataRef.current.min ? next : prev;
    });

    timerRef.current = setInterval(() => {
      hapticLight();
      setLocalTarget(prev => {
        const next = Number((prev - activeTabDataRef.current.step).toFixed(1));
        return next >= activeTabDataRef.current.min ? next : prev;
      });
    }, 120);
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  const deviceToggles = [
    { key: 'fans', label: 'FANS', icon: 'fan', active: devices.fans, color: '#3b82f6' },
    { key: 'misters', label: 'MISTERS', icon: 'water', active: devices.misters, color: '#0ea5e9' },
    { key: 'lights', label: 'LIGHTS', icon: 'lightbulb-on', active: devices.lights, color: '#eab308' },
    { key: 'co2', label: 'VALVE', icon: 'weather-windy', active: devices.co2, color: '#10b981' },
  ];

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      {!isReady ? (
        <ControlsScreenSkeleton />
      ) : (
      <ScrollView contentContainerStyle={tw`pb-28 pt-2`} showsVerticalScrollIndicator={false}>
        
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
                    setActiveTab(tab.id);
                    scrollToTab(tab.id);
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
                      {tab.target}{tab.unit}
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

        {/* Central Dial Area */}
        <CircularSlider 
          localTarget={localTarget} 
          activeTabData={activeTabData} 
          isDarkMode={isDarkMode} 
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

        {/* Hardware Actuators Single Widget */}
        <View style={tw`px-5 pt-1`}>
          <View style={tw`flex-row justify-between items-center mb-2.5`}>
            <View style={tw`flex-row items-center gap-2`}>
              <View style={tw`w-2 h-4 rounded-full bg-[#10b981]`} />
              <Text style={[tw`text-[14px] text-slate-900 dark:text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Hardware Actuators
              </Text>
            </View>
            <View style={tw`bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700 flex-row items-center gap-1`}>
              {isLocked ? (
                <MaterialCommunityIcons name="lock-outline" size={10} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              ) : (
                <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
              )}
              <Text style={[tw`text-[9.5px] text-slate-600 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {isAiOverride ? 'AI Active' : isLocked ? `${isAuto ? 'AUTO' : 'TIMED'}` : `${Object.values(devices).filter(Boolean).length} Active`}
              </Text>
            </View>
          </View>

          {/* Unified Single Widget Bar */}
          <View style={[
            tw`bg-white dark:bg-slate-900 rounded-[24px] py-3.5 px-2 border border-slate-200/70 dark:border-slate-800 shadow-sm flex-row items-center justify-between`,
            isLocked ? tw`opacity-60` : null
          ]}>
            {deviceToggles.map((device, index) => {
              const showActive = device.active;
              return (
                <TouchableOpacity 
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  key={device.key}
                  disabled={isLocked}
                  activeOpacity={0.7}
                  onPress={() => toggleDevice(device.key, !device.active)}
                  style={tw`flex-1 items-center justify-center`}
                >
                  <MaterialCommunityIcons 
                    name={device.icon as any} 
                    size={22} 
                    color={showActive ? device.color : (isDarkMode ? '#64748b' : '#94a3b8')} 
                  />

                  <Text 
                    style={[
                      tw`text-[10px] mt-1.5 text-center uppercase tracking-wide`, 
                      showActive 
                        ? [tw`text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }] 
                        : tw`text-slate-500 dark:text-slate-400 font-bold`
                    ]} 
                    numberOfLines={1}
                  >
                    {device.label}
                  </Text>

                  {/* Status Indicator Dot + Text */}
                  <View style={tw`flex-row items-center gap-1 mt-1`}>
                    <View style={[
                      tw`w-1.5 h-1.5 rounded-full`,
                      showActive ? { backgroundColor: device.color } : tw`bg-slate-300 dark:bg-slate-600`
                    ]} />
                    <Text style={[
                      tw`text-[9px]`,
                      showActive ? { color: device.color, fontFamily: 'PlusJakartaSans_800ExtraBold' } : tw`text-slate-400 dark:text-slate-500 font-bold`
                    ]}>
                      {showActive ? 'ON' : 'OFF'}
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
