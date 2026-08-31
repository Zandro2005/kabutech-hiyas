import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { ref, update } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import tw from '../tailwind';
import EditProfileModal from '../components/modals/EditProfileModal';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { useAllUsers, useActivityLogs, useBatches, useAlerts, useStaffTasks } from '../hooks/useFirebaseData';

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

  const pendingStaffCount = Object.values(allUsers).filter(u => u.role === 'staff' && !u.approved && !u.declined).length;
  const pendingLogsCount = activityLogs.filter(log => log.status === 'pending').length;
  
  const activeRacksCount = batches.filter(b => !b.archived).length;
  const tasksDoneToday = tasks.filter(t => t.status === 'completed' && isToday(t.completedAt)).length;
  const alertsFiredToday = alerts.filter(a => isToday(a.timestamp)).length;
  
  const handleLogout = async () => {
    try {
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

  return (
    <View style={tw`flex-1 bg-[#f8fafc] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      <ScrollView contentContainerStyle={tw`p-6 pt-5 pb-36`} showsVerticalScrollIndicator={false}>
        
        {/* Page Title & Subtitle */}
        <View style={tw`mb-2`}>
          <Text style={[tw`text-xl text-slate-800 dark:text-slate-100 tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            Profile & Settings
          </Text>
          <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
            Manage your account
          </Text>
        </View>
        
        {/* Profile Card */}
        <View style={tw`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm flex-row items-center gap-4 mb-4 mt-2`}>
          <View style={tw`w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center`}>
            <Text style={tw`text-emerald-600 dark:text-emerald-400 font-extrabold text-xl`}>
              {name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg font-bold text-gray-800 dark:text-slate-200`}>{name}</Text>
            <Text style={tw`text-xs text-gray-500 dark:text-slate-400 mb-1`}>{email}</Text>
            <View style={tw`bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50 self-start`}>
              <Text style={tw`text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest`}>{role}</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={handleLogout}
            style={tw`bg-red-50 dark:bg-red-900/30 p-2 rounded-full`}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>



        {/* Today's Summary */}
        <View style={tw`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm mb-4`}>
          <View style={tw`flex-row items-center gap-2 mb-4`}>
            <MaterialCommunityIcons name="calendar-today" size={18} color={tw.color('dark:text-slate-200') || "#1e293b"} />
            <Text style={tw`text-sm font-bold text-gray-800 dark:text-slate-200`}>Today's Summary</Text>
          </View>
          
          <View style={tw`flex-row justify-between`}>
            <View style={tw`flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 items-center mr-2 border border-transparent dark:border-slate-600/50`}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
              <Text style={tw`text-xl font-extrabold text-gray-800 dark:text-slate-200 my-1`}>{tasksDoneToday}</Text>
              <Text style={tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase font-bold`}>Tasks Done</Text>
            </View>
            <View style={tw`flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 items-center mx-1 border border-transparent dark:border-slate-600/50`}>
              <MaterialCommunityIcons name="alert" size={20} color="#ef4444" />
              <Text style={tw`text-xl font-extrabold text-gray-800 dark:text-slate-200 my-1`}>{alertsFiredToday}</Text>
              <Text style={tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase font-bold`}>Alerts Fired</Text>
            </View>
            <View style={tw`flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 items-center ml-2 border border-transparent dark:border-slate-600/50`}>
              <MaterialCommunityIcons name="leaf" size={20} color="#10b981" />
              <Text style={tw`text-xl font-extrabold text-gray-800 dark:text-slate-200 my-1`}>{activeRacksCount}</Text>
              <Text style={tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase font-bold`}>Active Racks</Text>
            </View>
          </View>
        </View>

        {/* Management & Operations */}
        <View style={tw`flex-row items-center gap-2 mb-4 mt-2`}>
          <MaterialCommunityIcons name="shield-star-outline" size={20} color={tw.color('dark:text-slate-200') || "#1e293b"} />
          <Text style={[tw`text-sm text-slate-800 dark:text-slate-200 tracking-wide`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
            Management & Operations
          </Text>
        </View>

        <View style={tw`flex-row flex-wrap justify-between`}>
          {/* Reports Widget */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('StaffReportsInbox' as never)}
            style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm items-start relative active:scale-95 mb-3 overflow-hidden`}
          >
            {/* Background decoration */}
            <View style={tw`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-50/50 dark:bg-blue-500/5`} />
            
            <View style={tw`w-12 h-12 rounded-[18px] bg-blue-50 dark:bg-blue-500/10 items-center justify-center mb-3 border border-blue-100/50 dark:border-blue-500/20`}>
              <MaterialCommunityIcons name="inbox-multiple-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={[tw`text-[15px] text-slate-800 dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Reports</Text>
            <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Inbox & logs</Text>
            
            {pendingLogsCount > 0 && (
              <View style={tw`absolute top-4 right-4 bg-red-500 min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5 shadow-sm border-2 border-white dark:border-slate-800`}>
                <Text style={[tw`text-[10px] text-white leading-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{pendingLogsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Approvals Widget */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('StaffApprovals' as never)}
            style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm items-start relative active:scale-95 mb-3 overflow-hidden`}
          >
            {/* Background decoration */}
            <View style={tw`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-50/50 dark:bg-emerald-500/5`} />

            <View style={tw`w-12 h-12 rounded-[18px] bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center mb-3 border border-emerald-100/50 dark:border-emerald-500/20`}>
              <MaterialCommunityIcons name="account-check-outline" size={24} color="#10b981" />
            </View>
            <Text style={[tw`text-[15px] text-slate-800 dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Approvals</Text>
            <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Manage staff</Text>
            
            {pendingStaffCount > 0 && (
              <View style={tw`absolute top-4 right-4 bg-red-500 min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5 shadow-sm border-2 border-white dark:border-slate-800`}>
                <Text style={[tw`text-[10px] text-white leading-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{pendingStaffCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Assign Task Widget */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('AssignTask' as never)}
            style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm items-start relative active:scale-95 mb-3 overflow-hidden`}
          >
            {/* Background decoration */}
            <View style={tw`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-50/50 dark:bg-amber-500/5`} />

            <View style={tw`w-12 h-12 rounded-[18px] bg-amber-50 dark:bg-amber-500/10 items-center justify-center mb-3 border border-amber-100/50 dark:border-amber-500/20`}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#f59e0b" />
            </View>
            <Text style={[tw`text-[15px] text-slate-800 dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Assign Task</Text>
            <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Delegate work</Text>
          </TouchableOpacity>

          {/* Task History Widget */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('StaffTaskHistory' as never)}
            style={tw`w-[48%] bg-white dark:bg-slate-800 rounded-[24px] p-4 border border-slate-100 dark:border-slate-700/50 shadow-sm items-start relative active:scale-95 mb-3 overflow-hidden`}
          >
            {/* Background decoration */}
            <View style={tw`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-violet-50/50 dark:bg-violet-500/5`} />

            <View style={tw`w-12 h-12 rounded-[18px] bg-violet-50 dark:bg-violet-500/10 items-center justify-center mb-3 border border-violet-100/50 dark:border-violet-500/20`}>
              <MaterialCommunityIcons name="history" size={24} color="#8b5cf6" />
            </View>
            <Text style={[tw`text-[15px] text-slate-800 dark:text-slate-200 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Task History</Text>
            <Text style={[tw`text-[11px] text-slate-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>Past activities</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
    </View>
  );
}
