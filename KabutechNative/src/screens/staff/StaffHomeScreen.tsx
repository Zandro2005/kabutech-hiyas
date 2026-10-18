import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../../types/navigation';
import tw from '../../tailwind';
import { useSensors, useSettings, useAlerts } from '../../hooks/useFirebaseData';
import { useSensorHealth } from '../../hooks/useSensorHealth';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import CriticalSystemAlerts from '../../components/CriticalSystemAlerts';
import EnvironmentMetricsGrid from '../../components/EnvironmentMetricsGrid';
import ChamberStatusHero from '../../components/ChamberStatusHero';
import HomeScreenSkeleton from '../../components/skeletons/HomeScreenSkeleton';
import { useEnvironmentAlerts } from '../../hooks/useEnvironmentAlerts';
import DashboardWarningBadges from '../../components/DashboardWarningBadges';
import { useTabBarScroll } from '../../context/TabBarContext';
import { evaluateChamber } from '../../utils/environmentRanges';
import { ACTIVE_PROFILE } from '../../config/cropProfiles';

export default function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { onScroll: handleTabBarScroll } = useTabBarScroll();
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  const alerts = useAlerts();
  const health = useSensorHealth();
  const envAlerts = useEnvironmentAlerts();

  const [isReady, setIsReady] = useState(false);
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

  const isControllerOff = !health.isControllerOnline;

  // Safe extraction of sensor values: strictly real Firebase data, never mock fallbacks
  const temp = !isControllerOff && typeof sensors.temperature === 'number' && sensors.temperature !== -999 && sensors.temperature > 0 ? sensors.temperature : -999;
  const hum = !isControllerOff && typeof sensors.humidity === 'number' && sensors.humidity !== -999 && sensors.humidity > 0 ? sensors.humidity : -999;
  const light = !isControllerOff && typeof sensors.light === 'number' && sensors.light !== -999 && sensors.light >= 0 ? sensors.light : -999;
  const co2 = !isControllerOff && typeof sensors.co2 === 'number' && sensors.co2 !== -999 && sensors.co2 > 0 ? sensors.co2 : -999;

  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';
  const isScheduled = String(settings?.setpoints?.mode).toLowerCase() === 'scheduled';

  // Chamber evaluation against cited crop profile
  const chamberEval = useMemo(() => {
    return evaluateChamber(
      {
        temp: temp !== -999 ? temp : null,
        hum: hum !== -999 ? hum : null,
        co2: co2 !== -999 ? co2 : null,
        light: light !== -999 ? light : null,
      },
      {
        temp: health.tempError,
        hum: health.humError,
        co2: health.co2Error,
        light: health.lightError,
        isControllerOffline: isControllerOff,
      },
      ACTIVE_PROFILE
    );
  }, [temp, hum, co2, light, health, isControllerOff]);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScreenHeader />

      {!isReady ? (
        <HomeScreenSkeleton />
      ) : (
        <ScrollView
          style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}
          contentContainerStyle={tw`pb-36`}
          showsVerticalScrollIndicator={false}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        >
          {/* Overscroll Filler */}
          <View style={[tw`absolute left-0 right-0 bg-[#f0f9f4] dark:bg-[#020617]`, { top: -500, height: 500 }]} />
          
          {/* 1. Chamber Status Hero Ring (Staff view - Read Only) */}
          <ChamberStatusHero 
            evaluation={chamberEval}
            isAuto={isAuto}
            isScheduled={isScheduled}
            isDarkMode={isDarkMode}
            isOffline={isControllerOff}
            secondsSinceUpdate={health.secondsSinceUpdate}
            navigation={navigation}
            hasWarning={envAlerts.hasWarning}
            readOnly={true}
          />

          {/* 2. Immediate Situational Awareness: Warning Badges */}
          {envAlerts.hasWarning && (
            <View style={tw`px-5 sm:px-6 pt-1`}>
              <DashboardWarningBadges alerts={envAlerts.unreadAlerts} readOnly={true} />
            </View>
          )}

          {/* 3. Health Metrics (2x2 Minimal Clean Grid) */}
          <EnvironmentMetricsGrid temp={temp} hum={hum} light={light} co2={co2} navigation={navigation} />

          {/* 4. Critical System Alerts */}
          <CriticalSystemAlerts alerts={alerts} onAlertPress={() => navigation.navigate('Alerts' as any)} />

        </ScrollView>
      )}
    </View>
  );
}
