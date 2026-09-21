import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticMedium, hapticSelection } from '../utils/haptics';
import { showToast } from './CustomToast';
import HelpModal from './modals/HelpModal';
import InfoModal from './modals/InfoModal';
import { useAuth } from '../context/AuthContext';
import { useActivityLogs, useAllUsers, useSensors } from '../hooks/useFirebaseData';
import { useSensorHealth } from '../hooks/useSensorHealth';
import { useEnvironmentAlerts } from '../hooks/useEnvironmentAlerts';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { getAvatarColor } from '../utils/avatarColor';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

export default React.memo(function ScreenHeader({ title, subtitle, rightComponent }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const [helpVisible, setHelpVisible] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const { profile, user } = useAuth();
  
  const handleToggleTheme = () => {
    if (isToggling) return;
    hapticMedium();
    setIsToggling(true);
    
    // Defer the theme switch to allow the spinner to render
    setTimeout(() => {
      toggleTheme();
      setIsToggling(false);
    }, 50);
  };
  
  const handleItemPress = (id: string) => {
    setHelpVisible(false); // Hide the slider immediately
    setTimeout(() => {
      setInfoId(id);       // Open the InfoModal slightly after to avoid overlap
    }, 150);
  };

  const activityLogs = useActivityLogs();
  const allUsers = useAllUsers();
  const envAlerts = useEnvironmentAlerts();
  const hasWarning = envAlerts.hasWarning;
  const hasCritical = envAlerts.hasCritical;

  let currentRouteName = '';
  try {
    const route = useRoute();
    currentRouteName = route?.name || '';
  } catch (_) {}

  const isHomeScreen = currentRouteName === 'HomeScreen' || currentRouteName === 'Home' || currentRouteName === 'StaffHomeScreen' || currentRouteName === 'StaffHome';

  const isAdmin = profile?.role === 'admin' || profile?.role === 'operator';
  const isStaff = profile?.role === 'staff';

  let notificationCount = 0;
  if (isAdmin) {
    const pendingStaff = Object.values(allUsers).filter(u => u.role === 'staff' && !u.approved && !u.declined).length;
    const pendingLogs = activityLogs.filter(log => log.status === 'pending').length;
    notificationCount = pendingStaff + pendingLogs;
  }

  return (
    <View style={[tw`bg-transparent pb-3 px-5 z-10 relative`, { paddingTop: insets.top + 20 }]}>
      
      <View style={tw`flex-row justify-between items-center`}>
        
        {/* Brand Logo & Name with Warning Icon */}
        <View style={tw`flex-row items-center gap-1.5 flex-1`}>
          <MaterialCommunityIcons name="leaf" size={28} color={isDarkMode ? "#6ee7b7" : "#166534"} />
          <Text style={[tw`text-[24px] text-[#166534] dark:text-[#6ee7b7] tracking-tight leading-none`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            KabuTech
          </Text>

          {/* Warning indicator on the KabuTech side for other pages */}
          {hasWarning && !isHomeScreen && (
            <TouchableOpacity
              activeOpacity={0.75}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                hapticSelection();
                const primary = envAlerts.primaryAlert;
                if (envAlerts.count > 1) {
                  const metricNames = Array.from(new Set(envAlerts.activeAlerts.map(a => a.shortLabel.split(' • ')[0]))).slice(0, 3).join(', ');
                  showToast({
                    type: hasCritical ? 'error' : 'info',
                    text1: `${envAlerts.count} Chamber Warnings`,
                    text2: `${metricNames} out of range. Check dashboard.`,
                    duration: 4000,
                  });
                } else if (primary) {
                  showToast({
                    type: hasCritical ? 'error' : 'info',
                    text1: primary.title,
                    text2: `${primary.currentValue ? `${primary.currentValue} • ` : ''}${primary.action}`,
                    duration: 4000,
                  });
                } else {
                  showToast({
                    type: 'info',
                    text1: 'Environment Nominal',
                    text2: 'All chamber parameters are within target setpoints.',
                    duration: 3000,
                  });
                }
              }}
              style={tw`ml-1.5 p-1 items-center justify-center`}
            >
              <MaterialCommunityIcons
                name="alert"
                size={18}
                color="#ef4444"
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={tw`flex-row items-center gap-2 ml-2`}>
          {rightComponent}
          
          {/* Help Icon */}
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={() => setHelpVisible(true)}
            
            style={tw`w-8 h-8 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm`}
          >
            <MaterialCommunityIcons name="help-circle-outline" size={16} color={isDarkMode ? "#cbd5e1" : "#334155"} />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
            onPress={handleToggleTheme}
            disabled={isToggling}
            
            style={tw`w-8 h-8 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm`}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color={isDarkMode ? "#fbbf24" : "#334155"} />
            ) : (
              <MaterialCommunityIcons 
                name={isDarkMode ? "weather-sunny" : "weather-night"} 
                size={14} 
                color={isDarkMode ? "#fbbf24" : "#334155"} 
              />
            )}
          </TouchableOpacity>

          {/* User Profile & Settings Avatar Button */}
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={() => {
              hapticSelection();
              if (profile?.role === 'staff') {
                navigation.navigate('StaffMain' as any, { screen: 'Profile' } as any);
              } else {
                navigation.navigate('Main' as any, { screen: 'Profile' } as any);
              }
            }}
            style={[
              tw`w-8 h-8 rounded-full items-center justify-center border shadow-sm`,
              {
                backgroundColor: getAvatarColor(profile?.name || user?.email || 'User'),
                borderColor: 'rgba(255,255,255,0.3)',
              }
            ]}
          >
            <Text style={[tw`text-white text-xs`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
            {notificationCount > 0 && (
              <View style={tw`absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 items-center justify-center`}>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </View>
      <HelpModal 
        visible={helpVisible} 
        onClose={() => setHelpVisible(false)} 
        onItemPress={handleItemPress} 
      />
      <InfoModal 
        id={infoId} 
        visible={!!infoId} 
        onClose={() => setInfoId(null)} 
      />
    </View>
  );
});
