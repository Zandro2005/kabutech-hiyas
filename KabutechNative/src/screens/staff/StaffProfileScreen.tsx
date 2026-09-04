import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../../types/navigation';
import tw from '../../tailwind';
import ScreenHeader from '../../components/ScreenHeader';
import { useTheme } from '../../context/ThemeContext';
import { useStaffTasks } from '../../hooks/useFirebaseData';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import ProfileScreenSkeleton from '../../components/skeletons/ProfileScreenSkeleton';
import { getAvatarTheme } from '../../utils/avatarColor';

export default function StaffProfileScreen() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { user, profile } = useAuth();
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

  const pendingTasksCount = tasks.filter(t => t.assignedTo === user?.uid && t.status === 'assigned').length;

  const handleLogout = async () => {
    try {
      hapticMedium();
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
  const avatarTheme = getAvatarTheme(profile?.name || user?.email || 'User');
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

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
            My Account
          </Text>
          <Text style={[tw`text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
            Personal account & activity history
          </Text>
        </View>
        
        {/* Sleek User Card */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] p-4.5 border border-slate-200/70 dark:border-slate-800 shadow-sm mb-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-3.5 flex-1 mr-2`}>
              <View style={[
                tw`w-13 h-13 rounded-2xl border items-center justify-center`,
                {
                  backgroundColor: isDarkMode ? avatarTheme.bgDark : avatarTheme.bgLight,
                  borderColor: avatarTheme.border,
                }
              ]}>
                <Text style={[
                  tw`text-lg`,
                  {
                    color: isDarkMode ? avatarTheme.textDark : avatarTheme.textLight,
                    fontFamily: 'PlusJakartaSans_800ExtraBold'
                  }
                ]}>
                  {initials}
                </Text>
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-[16px] text-slate-900 dark:text-slate-100 mb-0.5`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
                  {name}
                </Text>
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

            <TouchableOpacity 
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  
              onPress={handleLogout}
              style={tw`w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 items-center justify-center`}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Label */}
        <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
          Activity & History
        </Text>

        {/* Action Link List */}
        <View style={tw`bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden mb-6`}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticLight();
              navigation.navigate('MyActivityHistory' as never);
            }}
            style={tw`flex-row items-center justify-between p-4 bg-white dark:bg-slate-900`}
          >
            <View style={tw`flex-row items-center gap-3.5 flex-1 mr-2`}>
              <View style={tw`w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center`}>
                <MaterialCommunityIcons name="history" size={20} color="#10b981" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-[14.5px] text-slate-900 dark:text-slate-100`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  My Activity History
                </Text>
                <Text style={[tw`text-[11px] text-slate-400 dark:text-slate-500 mt-0.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  Log of past completed tasks
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#475569' : '#cbd5e1'} />
          </TouchableOpacity>
        </View>

      </ScrollView>
      )}
    </View>
  );
}
