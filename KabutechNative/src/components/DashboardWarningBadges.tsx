import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { EnvironmentAlertItem } from '../hooks/useEnvironmentAlerts';
import { hapticSelection, hapticMedium } from '../utils/haptics';

interface Props {
  alerts: EnvironmentAlertItem[];
}

export default React.memo(function DashboardWarningBadges({ alerts }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();

  if (!alerts || alerts.length === 0) return null;

  const hasCritical = alerts.some(a => a.type === 'critical');
  const primaryAlert = alerts[0];

  const handlePress = () => {
    hapticSelection();
    setModalVisible(true);
  };

  const handleGoToControls = () => {
    hapticMedium();
    setModalVisible(false);
    const targetTab =
      primaryAlert?.metric === 'co2'
        ? 'co2'
        : primaryAlert?.metric === 'hum'
        ? 'hum'
        : primaryAlert?.metric === 'light'
        ? 'light'
        : 'temp';

    try {
      navigation.navigate('Main', {
        screen: 'Controls',
        params: { tab: targetTab },
      });
    } catch (_) {
      try {
        navigation.navigate('Controls', { tab: targetTab });
      } catch (err) {
        console.log('Navigation to controls failed:', err);
      }
    }
  };

  return (
    <>
      {/* Unified Single Warning Widget (Styled like the Refill Now pill) */}
      <View style={tw`w-full max-w-sm`}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePress}
          style={[
            tw`w-full flex-row items-center justify-between px-3.5 py-2.5 rounded-2xl border shadow-sm`,
            isDarkMode
              ? (hasCritical
                  ? tw`bg-rose-500/15 border-rose-500/30`
                  : tw`bg-amber-500/15 border-amber-500/30`)
              : (hasCritical
                  ? tw`bg-rose-50 border-rose-200`
                  : tw`bg-amber-50 border-amber-200`),
          ]}
        >
          {/* Left Icon Badge */}
          <View
            style={[
              tw`w-7 h-7 rounded-xl items-center justify-center shrink-0 shadow-sm`,
              hasCritical ? tw`bg-[#f43f5e]` : tw`bg-[#f59e0b]`,
            ]}
          >
            <MaterialCommunityIcons
              name={
                alerts.length === 1
                  ? (primaryAlert.icon as any)
                  : 'alert-circle'
              }
              size={16}
              color="#ffffff"
            />
          </View>

          {/* Center Summary Content: Styled to match Refill Now pill typography */}
          <View style={tw`flex-1 mx-2.5 justify-center`}>
            <Text
              numberOfLines={1}
              style={[
                tw`text-xs sm:text-[13px]`,
                hasCritical
                  ? (isDarkMode ? tw`text-rose-300` : tw`text-rose-700`)
                  : (isDarkMode ? tw`text-amber-300` : tw`text-amber-700`),
                { fontFamily: 'PlusJakartaSans_800ExtraBold' },
              ]}
            >
              {alerts.length === 1
                ? primaryAlert.shortLabel
                : `${alerts.length} Warnings: ${alerts
                    .map((a) =>
                      a.metric === 'temp'
                        ? 'Temp'
                        : a.metric === 'hum'
                        ? 'Humidity'
                        : a.metric === 'co2'
                        ? 'CO₂'
                        : a.metric === 'light'
                        ? 'Light'
                        : a.metric === 'water'
                        ? 'Water'
                        : 'System'
                    )
                    .join(', ')}`}
            </Text>
          </View>

          {/* Right Chevron */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={
              hasCritical
                ? (isDarkMode ? '#fb7185' : '#e11d48')
                : (isDarkMode ? '#fcd34d' : '#d97706')
            }
            style={tw`opacity-90 shrink-0`}
          />
        </TouchableOpacity>
      </View>

      {/* Pop-Up Warning Modal with Sleek, Compact Cards & Refined Typography */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center p-4`}>
          <View
            style={[
              tw`w-full max-w-sm rounded-2xl p-4 shadow-2xl`,
              isDarkMode ? tw`bg-slate-900 border border-slate-800` : tw`bg-white`,
            ]}
          >
            {/* Header: Sleek, Minimal, No Clutter */}
            <View style={tw`flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800`}>
              <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                <View
                  style={tw`w-8 h-8 rounded-xl ${
                    hasCritical ? 'bg-red-500/15' : 'bg-amber-500/15'
                  } items-center justify-center shrink-0`}
                >
                  <MaterialCommunityIcons
                    name={hasCritical ? 'alert-circle' : 'alert'}
                    size={18}
                    color={hasCritical ? '#dc2626' : '#d97706'}
                  />
                </View>
                <Text
                  style={[
                    tw`text-[15px] text-slate-900 dark:text-white`,
                    { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  ]}
                >
                  Active Warnings ({alerts.length})
                </Text>
              </View>

              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => setModalVisible(false)}
                style={tw`w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center`}
              >
                <Ionicons
                  name="close"
                  size={15}
                  color={isDarkMode ? '#94a3b8' : '#64748b'}
                />
              </TouchableOpacity>
            </View>

            {/* List of Active Alerts: Sleek, Compact, No Walls of Text */}
            <ScrollView
              style={tw`max-h-80 my-2.5`}
              showsVerticalScrollIndicator={false}
            >
              <View style={tw`gap-2`}>
                {alerts.map((alert) => {
                  const isCrit = alert.type === 'critical';
                  return (
                    <View
                      key={alert.id}
                      style={[
                        tw`p-3 rounded-xl border`,
                        isDarkMode
                          ? (isCrit
                              ? tw`bg-slate-800/80 border-red-500/30`
                              : tw`bg-slate-800/80 border-amber-500/30`)
                          : (isCrit
                              ? tw`bg-white border-red-200 shadow-sm`
                              : tw`bg-white border-amber-200 shadow-sm`),
                      ]}
                    >
                      {/* Top Row: Icon + Title + Severity Pill */}
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                          <View
                            style={[
                              tw`w-6.5 h-6.5 rounded-lg items-center justify-center shrink-0`,
                              isCrit ? tw`bg-red-500/15` : tw`bg-amber-500/15`,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={alert.icon as any}
                              size={15}
                              color={isCrit ? '#dc2626' : '#d97706'}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[
                              tw`text-[13px] text-slate-900 dark:text-white flex-1`,
                              { fontFamily: 'PlusJakartaSans_700Bold' },
                            ]}
                          >
                            {alert.title}
                          </Text>
                        </View>

                        <View
                          style={[
                            tw`px-2 py-0.5 rounded-full border shrink-0`,
                            isCrit
                              ? (isDarkMode
                                  ? tw`bg-red-950/70 border-red-800/70`
                                  : tw`bg-red-100 border-red-300`)
                              : (isDarkMode
                                  ? tw`bg-amber-950/70 border-amber-800/70`
                                  : tw`bg-amber-100 border-amber-300`),
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-[9px] uppercase tracking-wider font-extrabold`,
                              {
                                color: isCrit
                                  ? (isDarkMode ? '#f87171' : '#b91c1c')
                                  : (isDarkMode ? '#fbbf24' : '#b45309'),
                              },
                            ]}
                          >
                            {isCrit ? 'Critical' : 'Warning'}
                          </Text>
                        </View>
                      </View>

                      {/* Metric Readings & Target (if available) */}
                      {alert.currentValue ? (
                        <View style={tw`flex-row items-center gap-1.5 ml-8.5 mt-1`}>
                          <Text
                            style={[
                              tw`text-[11.5px] text-slate-500 dark:text-slate-400`,
                              { fontFamily: 'PlusJakartaSans_600SemiBold' },
                            ]}
                          >
                            Current: {alert.currentValue}
                          </Text>
                          {alert.targetValue ? (
                            <>
                              <Text style={tw`text-[10px] text-slate-400`}>•</Text>
                              <Text
                                style={[
                                  tw`text-[11.5px] text-slate-400 dark:text-slate-500`,
                                  { fontFamily: 'PlusJakartaSans_500Medium' },
                                ]}
                              >
                                Target: {alert.targetValue}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      ) : null}

                      {/* Concise Action Directive (Refined Font, Zero Fluff) */}
                      <Text
                        style={[
                          tw`text-[12px] text-slate-600 dark:text-slate-300 leading-snug ml-8.5 mt-1`,
                          { fontFamily: 'PlusJakartaSans_600SemiBold' },
                        ]}
                      >
                        {alert.action || alert.message}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Action Buttons: Sleek, Compact, & Refined */}
            <View style={tw`flex-row items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800`}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoToControls}
                style={tw`flex-1 py-2.5 rounded-xl bg-[#166534] dark:bg-[#059669] items-center justify-center shadow-sm`}
              >
                <Text
                  style={[
                    tw`text-[13px] text-white`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  Adjust in Controls
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
                style={tw`px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center`}
              >
                <Text
                  style={[
                    tw`text-[13px] text-slate-700 dark:text-slate-300`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});
