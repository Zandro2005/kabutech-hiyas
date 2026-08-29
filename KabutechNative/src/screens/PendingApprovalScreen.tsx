import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import tw from '../tailwind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PendingApprovalScreen() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-slate-900 justify-center items-center p-6`}>
      <StatusBar barStyle="dark-content" />
      
      <View style={tw`w-24 h-24 bg-amber-50 dark:bg-amber-900/30 rounded-full items-center justify-center mb-6 border border-amber-100 dark:border-amber-800`}>
        <MaterialCommunityIcons name="timer-sand" size={48} color="#f59e0b" />
      </View>
      
      <Text style={[tw`text-2xl text-slate-800 dark:text-white text-center mb-3`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
        Pending Approval
      </Text>
      
      <Text style={[tw`text-sm text-slate-500 dark:text-slate-400 text-center mb-10 leading-relaxed px-4`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
        Your account has been created successfully. Please wait for an administrator to approve your access before you can log in.
      </Text>
      
      <TouchableOpacity 
        onPress={handleLogout}
        style={tw`bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full flex-row items-center gap-2`}
      >
        <MaterialCommunityIcons name="logout" size={18} color={tw.color('slate-600')} />
        <Text style={[tw`text-sm text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
