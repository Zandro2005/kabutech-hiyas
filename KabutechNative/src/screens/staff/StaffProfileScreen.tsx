import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../../types/navigation';
import tw from '../../tailwind';
import ScreenHeader from '../../components/ScreenHeader';
import { useTheme } from '../../context/ThemeContext';
import { useStaffTasks } from '../../hooks/useFirebaseData';

export default function StaffProfileScreen() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const { user, profile } = useAuth();
  const tasks = useStaffTasks();
  
  const pendingTasksCount = tasks.filter(t => t.assignedTo === user?.uid && t.status === 'assigned').length;

  const handleLogout = async () => {
    try {
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
            My Account
          </Text>
          <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
            View your profile and tasks
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

        {/* Staff-Specific Links */}

        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => navigation.navigate('MyActivityHistory' as never)}
          style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex-row items-center justify-between mb-3 active:scale-95`}
        >
          <View style={tw`flex-row items-center gap-3`}>
            <View style={tw`w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-700/50 items-center justify-center border border-gray-100 dark:border-slate-600/50`}>
              <MaterialCommunityIcons name="history" size={20} color="#10b981" />
            </View>
            <Text style={tw`text-sm font-bold text-gray-800 dark:text-slate-200`}>My Activity History</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={tw.color('dark:text-slate-500') || "#94a3b8"} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
