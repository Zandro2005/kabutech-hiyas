import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { useStaffTasks } from '../hooks/useFirebaseData';
import { useAuth } from '../context/AuthContext';
import { hapticLight } from '../utils/haptics';

interface TabConfig {
  label: string;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  inactiveIcon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  Home: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  Controls: {
    label: 'Controls',
    activeIcon: 'tune-vertical',
    inactiveIcon: 'tune-vertical',
  },
  AddAction: {
    label: 'Insights',
    activeIcon: 'chart-box',
    inactiveIcon: 'chart-box-outline',
  },
  ManageCrop: {
    label: 'Crop',
    activeIcon: 'leaf',
    inactiveIcon: 'leaf',
  },
  Crop: {
    label: 'Crop',
    activeIcon: 'leaf',
    inactiveIcon: 'leaf',
  },
  ActivityLog: {
    label: 'Activity',
    activeIcon: 'clipboard-text',
    inactiveIcon: 'clipboard-text-outline',
  },
  Tasks: {
    label: 'Tasks',
    activeIcon: 'clipboard-check',
    inactiveIcon: 'clipboard-check-outline',
  },
  Yield: {
    label: 'Yield',
    activeIcon: 'chart-bar',
    inactiveIcon: 'chart-bar',
  },
};

export default function FloatingCapsuleTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const envAlerts = useEnvironmentAlerts();
  const { user } = useAuth();
  const allTasks = useStaffTasks();

  const hasWarning = envAlerts.hasWarning;
  const hasCritical = envAlerts.hasCritical;
  const pendingTasks = allTasks.filter(
    (t) => t.assignedTo === user?.uid && t.status === 'assigned'
  ).length;

  return (
    <View
      pointerEvents="box-none"
      style={[
        tw`absolute left-0 right-0 items-center`,
        {
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 18, 36) : 38,
          zIndex: 50,
        },
      ]}
    >
      <View
        style={[
          tw`flex-row items-center justify-between rounded-[40px] border px-2.5`,
          {
            width: '92%',
            maxWidth: 420,
            height: 78,
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderColor: isDarkMode
              ? 'rgba(51, 65, 85, 0.45)'
              : 'rgba(226, 232, 240, 0.85)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDarkMode ? 0.4 : 0.09,
            shadowRadius: 18,
            elevation: 12,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Skip hidden tabs (e.g. Profile)
          if (
            options.tabBarItemStyle &&
            (options.tabBarItemStyle as any).display === 'none'
          ) {
            return null;
          }

          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name] || {
            label: route.name,
            activeIcon: 'circle',
            inactiveIcon: 'circle-outline',
          };

          const onPress = () => {
            hapticLight();

            if (route.name === 'AddAction') {
              navigation.navigate('Report' as never);
              return;
            }
            if (route.name === 'ActivityLog') {
              navigation.navigate('ActivityLog' as never);
              return;
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={onPress}
              style={tw`flex-1 items-center justify-center`}
            >
              <View style={tw`items-center justify-center py-1`}>
                {/* Icon Container: No highlight background, icon darkened when current page */}
                <View style={tw`items-center justify-center relative`}>
                  <MaterialCommunityIcons
                    name={
                      isFocused ? config.activeIcon : config.inactiveIcon
                    }
                    size={26}
                    color={
                      isFocused
                        ? isDarkMode
                          ? '#34d399'
                          : '#042f1a'
                        : isDarkMode
                        ? '#64748b'
                        : '#94a3b8'
                    }
                  />

                  {/* Warning Dot Badge on Home */}
                  {route.name === 'Home' && hasWarning && (
                    <View
                      style={[
                        tw`absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full ${
                          hasCritical ? 'bg-rose-500' : 'bg-amber-500'
                        }`,
                        {
                          borderWidth: 1.5,
                          borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                        },
                      ]}
                    />
                  )}

                  {/* Pending Tasks Count Badge */}
                  {route.name === 'Tasks' && pendingTasks > 0 && (
                    <View
                      style={[
                        tw`absolute -top-1.5 -right-3 bg-rose-500 rounded-full px-1.5 items-center justify-center`,
                        {
                          minWidth: 16,
                          height: 16,
                          borderWidth: 1.5,
                          borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                        },
                      ]}
                    >
                      <Text style={tw`text-[9px] text-white font-bold leading-none`}>
                        {pendingTasks}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tab Label: Larger font, darkened when current page */}
                <Text
                  numberOfLines={1}
                  style={[
                    tw`text-[12px] mt-1 tracking-tight`,
                    isFocused
                      ? [
                          tw`font-extrabold`,
                          {
                            fontFamily: 'PlusJakartaSans_800ExtraBold',
                            color: isDarkMode ? '#34d399' : '#042f1a',
                          },
                        ]
                      : [
                          tw`font-semibold text-slate-400 dark:text-slate-500`,
                          {
                            fontFamily: 'PlusJakartaSans_600SemiBold',
                          },
                        ],
                  ]}
                >
                  {config.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
