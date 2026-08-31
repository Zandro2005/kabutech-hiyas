import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import EditProfileModal from '../components/modals/EditProfileModal';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { useAllUsers, useActivityLogs, useBatches, useAlerts, useStaffTasks } from '../hooks/useFirebaseData';
import { hapticLight, hapticMedium } from '../utils/haptics';
import ProfileScreenSkeleton from '../components/skeletons/ProfileScreenSkeleton';

const isToday = (dateString?: string) => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export default function ProfileScreen() {
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const allUsers = useAllUsers();
  const activityLogs = useActivityLogs();
  const batches = useBatches();
  const alerts = useAlerts();
  const tasks = useStaffTasks();

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => setIsReady(true));
      return () => cancelIdleCallback(handle);
    }
    const handle = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const pendingStaffCount = Object.values(allUsers).filter(u => u.role === 'staff' && !u.approved && !u.declined).length;
  const pendingLogsCount = activityLogs.filter(log => log.status === 'pending').length;
  
  const activeRacksCount = batches.filter(b => !b.archived).length;
  const tasksDoneToday = tasks.filter(t => t.status === 'completed' && isToday(t.completedAt)).length;
  const alertsFiredToday = alerts.filter(a => isToday(a.timestamp)).length;
  
  const handleLogout = async () => {
    try {
      hapticMedium();
      DeviceEventEmitter.emit('cancelAiOverride');
      await update(ref(db, 'kabutech/settings/setpoints/devices'), { fans: false, misters: false, lights: false, co2: false });
      await update(ref(db, 'kabutech/settings/setpoints'), { mode: 'auto', aiOverride: false });

      if (user?.uid) {
        await update(ref(db, `kabutech/users/${user.uid}`), { pushToken: null });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const name = profile?.name || user?.displayName || 'Unknown User';
  const role = profile?.role ? profile.role.toUpperCase() : 'STAFF';
  const email = profile?.email || user?.email || 'No email';
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const menuItems = [
    {
      id: 'reports',
      title: 'Reports Inbox',
      subtitle: 'Review staff submissions & logs',
      icon: 'inbox-multiple-outline',
      color: '#3b82f6',
      badge: pendingLogsCount,
      onPress: () => navigation.navigate('StaffReportsInbox' as never),
    },
    {
      id: 'approvals',
      title: 'Staff Approvals',
      subtitle: 'Manage pending registration requests',
      icon: 'account-check-outline',
      color: '#10b981',
      badge: pendingStaffCount,
      onPress: () => navigation.navigate('StaffApprovals' as never),
    },
    {
      id: 'assign',
      title: 'Assign Task',
      subtitle: 'Delegate tasks to farm personnel',
      icon: 'clipboard-text-outline',
      color: '#f59e0b',
      badge: 0,
      onPress: () => navigation.navigate('AssignTask' as never),
    },
    {
      id: 'history',
      title: 'Task History',
      subtitle: 'View completed staff activity logs',
      icon: 'history',
      color: '#8b5cf6',
      badge: 0,
      onPress: () => navigation.navigate('StaffTaskHistory' as never),
    },
  ];

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      {!isReady ? (
        <ProfileScreenSkeleton />
      ) : (
      <ScrollView contentContainerStyle={tw`p-5 pt-4 pb-36`} showsVerticalScrollIndicator={false}>
        
        {/* Title Header */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-[20px] text-slate-900 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            Account & Operations
          </Text>
          <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
            Manage profile, personnel, and daily tasks
          </Text>
        </View>

        {/* Sleek User Profile Card */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] p-4.5 border border-slate-200/70 dark:border-slate-800 shadow-sm mb-4`}>
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center gap-3.5 flex-1 mr-2`}>
              <View style={tw`w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center`}>
                <Text style={[tw`text-emerald-600 dark:text-emerald-400 text-lg`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {initials}
                </Text>
              </View>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center gap-2 mb-0.5`}>
                  <Text style={[tw`text-[16px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
                <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mb-1.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]} numberOfLines={1}>
                  {email}
                </Text>
                <View style={tw`bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 self-start`}>
                  <Text style={[tw`text-[9.5px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                    {role}
                  </Text>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity 
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  
              onPress={handleLogout}
              style={tw`w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 items-center justify-center`}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Clean 3-Pillar Summary Strip */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm flex-row items-center justify-between mb-5`}>
          {/* Stat 1 */}
          <View style={tw`flex-1 items-center border-r border-slate-100 dark:border-slate-800 px-1`}>
            <Text style={[tw`text-[18px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {tasksDoneToday}
            </Text>
            <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Tasks Done
            </Text>
          </View>

          {/* Stat 2 */}
          <View style={tw`flex-1 items-center border-r border-slate-100 dark:border-slate-800 px-1`}>
            <Text style={[tw`text-[18px] text-amber-500`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {alertsFiredToday}
            </Text>
            <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Alerts Today
            </Text>
          </View>

          {/* Stat 3 */}
          <View style={tw`flex-1 items-center px-1`}>
            <Text style={[tw`text-[18px] text-blue-500`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              {activeRacksCount}
            </Text>
            <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Active Racks
            </Text>
          </View>
        </View>

        {/* Section Label */}
        <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
          Farm Management
        </Text>

        {/* Minimalist Action List */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden mb-6`}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => {
                  hapticLight();
                  item.onPress();
                }}
                style={[
                  tw`flex-row items-center justify-between p-4 bg-white dark:bg-slate-900`,
                  !isLast ? tw`border-b border-slate-100 dark:border-slate-800` : null
                ]}
              >
                <View style={tw`flex-row items-center gap-3.5 flex-1 mr-2`}>
                  <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, { backgroundColor: `${item.color}15` }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-[14.5px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                      {item.title}
                    </Text>
                    <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                  {item.badge > 0 && (
                    <View style={tw`bg-red-500 min-w-[20px] h-[20px] rounded-full items-center justify-center px-1.5`}>
                      <Text style={[tw`text-[10px] text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#475569' : '#cbd5e1'} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
      )}
      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
    </View>
  );
}
