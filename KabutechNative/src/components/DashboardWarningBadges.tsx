import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { EnvironmentAlertItem, useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { hapticSelection, hapticMedium } from '../utils/haptics';

interface Props {
  alerts: EnvironmentAlertItem[];
}

export default React.memo(function DashboardWarningBadges({ alerts }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { dismissAllAlerts } = useEnvironmentAlerts();

  if (!alerts || alerts.length === 0 || isDismissed) return null;

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
      {/* Calm, Non-Distracting Minimalist Status Pill */}
      <View style={tw`w-full max-w-sm`}>
        <View
          style={[
            tw`w-full flex-row items-center justify-between pl-3 pr-2 py-2 rounded-2xl border shadow-xs`,
            isDarkMode
              ? tw`bg-slate-900/95 border-slate-800`
              : tw`bg-white/95 border-slate-200/90`,
          ]}
        >
          {/* Main Tap Target */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePress}
            style={tw`flex-1 flex-row items-center`}
          >
            {/* Small Red Warning Icon Badge */}
            <View
              style={[
                tw`w-6.5 h-6.5 rounded-full items-center justify-center shrink-0`,
                isDarkMode ? tw`bg-rose-500/15` : tw`bg-rose-50`,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  alerts.length === 1
                    ? (primaryAlert.icon as any)
                    : 'alert-circle'
                }
                size={14}
                color={isDarkMode ? '#f87171' : '#ef4444'}
              />
            </View>

            {/* Content: Clean, Calm Typography */}
            <View style={tw`flex-1 mx-2.5 justify-center`}>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Text
                  numberOfLines={1}
                  style={[
                    tw`text-xs text-slate-800 dark:text-slate-200 flex-1`,
                    { fontFamily: 'PlusJakartaSans_700Bold' },
                  ]}
                >
                  {primaryAlert.shortLabel}
                </Text>
                {alerts.length > 1 && (
                  <View style={tw`px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800`}>
                    <Text
                      style={[
                        tw`text-[9px] text-slate-500 dark:text-slate-400`,
                        { fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      +{alerts.length - 1} more
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Subtle Chevron */}
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color={isDarkMode ? '#94a3b8' : '#64748b'}
              style={tw`opacity-80 shrink-0 mr-1`}
            />
          </TouchableOpacity>

          {/* Quick Dismiss Button (Hide from view if acknowledged) */}
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            onPress={() => {
              hapticSelection();
              setIsDismissed(true);
              dismissAllAlerts();
            }}
            style={tw`w-6 h-6 rounded-full items-center justify-center ml-1 bg-slate-100 dark:bg-slate-800/80`}
          >
            <Ionicons
              name="close"
              size={13}
              color={isDarkMode ? '#94a3b8' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pop-Up Warning Modal with Calm, Elegant Styling */}
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
            {/* Header: Sleek, Minimal, Calm */}
            <View style={tw`flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800`}>
              <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                <View
                  style={[
                    tw`w-8 h-8 rounded-xl items-center justify-center shrink-0`,
                    isDarkMode ? tw`bg-rose-500/15` : tw`bg-rose-50`,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={18}
                    color={isDarkMode ? '#f87171' : '#ef4444'}
                  />
                </View>
                <Text
                  style={[
                    tw`text-[15px] text-slate-900 dark:text-white`,
                    { fontFamily: 'PlusJakartaSans_800ExtraBold' },
                  ]}
                >
                  System Notices ({alerts.length})
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

            {/* List of Active Alerts: Sleek, Compact, Calm */}
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
                          ? tw`bg-slate-800/80 border-slate-700/60`
                          : tw`bg-slate-50/80 border-slate-200/90`,
                      ]}
                    >
                      {/* Top Row: Icon + Title + Severity Pill */}
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
                          <View
                            style={[
                              tw`w-6.5 h-6.5 rounded-lg items-center justify-center shrink-0`,
                              tw`bg-amber-500/15`,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={alert.icon as any}
                              size={15}
                              color={isDarkMode ? '#fbbf24' : '#d97706'}
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
                            isDarkMode
                              ? tw`bg-amber-950/60 border-amber-800/60`
                              : tw`bg-amber-50 border-amber-200`,
                          ]}
                        >
                          <Text
                            style={[
                              tw`text-[9px] uppercase tracking-wider font-extrabold`,
                              {
                                color: isDarkMode ? '#fbbf24' : '#b45309',
                              },
                            ]}
                          >
                            {isCrit ? 'Attention' : 'Notice'}
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
                onPress={() => {
                  hapticSelection();
                  setIsDismissed(true);
                  dismissAllAlerts();
                  setModalVisible(false);
                }}
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
