import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useAllUsers } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';

export default function StaffApprovalsScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const allUsers = useAllUsers();

  const [filter, setFilter] = useState<'pending' | 'approved' | 'declined'>('pending');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const staffList = Object.entries(allUsers)
    .map(([uid, profile]) => ({ uid, ...profile }))
    .filter(u => u.role === 'staff')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingStaff = staffList.filter(u => !u.approved && !u.declined);
  const approvedStaff = staffList.filter(u => u.approved);
  const declinedStaff = staffList.filter(u => u.declined);

  const displayedStaff = 
    filter === 'pending' ? pendingStaff :
    filter === 'approved' ? approvedStaff :
    declinedStaff;

  const handleUpdateStatus = async (uid: string, approve: boolean) => {
    setIsSubmitting(uid);
    try {
      await update(ref(db, `kabutech/users/${uid}`), {
        approved: approve,
        declined: !approve
      });
      showToast({ type: 'success', text1: 'Status Updated', text2: `Staff has been ${approve ? 'approved' : 'declined'}.` });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to update staff status.' });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mr-3 p-1`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Staff Approvals</Text>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
        <TouchableOpacity 
          onPress={() => setFilter('pending')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'pending' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-xs font-bold`, filter === 'pending' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Pending ({pendingStaff.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFilter('approved')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'approved' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-xs font-bold`, filter === 'approved' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Approved ({approvedStaff.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFilter('declined')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'declined' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-xs font-bold`, filter === 'declined' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Declined ({declinedStaff.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-12`} showsVerticalScrollIndicator={false}>
        {displayedStaff.length === 0 ? (
          <View style={tw`py-10 items-center justify-center`}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              No staff members in this category.
            </Text>
          </View>
        ) : (
          displayedStaff.map(staff => {
            const date = new Date(staff.createdAt);
            
            return (
              <View key={staff.uid} style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center gap-3 flex-1`}>
                  <View style={tw`w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center`}>
                    <Text style={tw`text-slate-500 dark:text-slate-300 font-bold text-lg`}>{staff.name?.charAt(0).toUpperCase() || 'S'}</Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-[15px] text-gray-900 dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{staff.name}</Text>
                    <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 mb-1`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{staff.email}</Text>
                    <Text style={[tw`text-[9px] text-gray-400 uppercase tracking-widest font-bold`]}>
                      Registered: {date.toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {filter === 'pending' && (
                  <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity 
                      onPress={() => handleUpdateStatus(staff.uid, false)}
                      disabled={isSubmitting === staff.uid}
                      style={tw`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 items-center justify-center shadow-sm ${isSubmitting === staff.uid ? 'opacity-70' : ''}`}
                    >
                      <MaterialCommunityIcons name="close" size={16} color={tw.color('red-600')} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleUpdateStatus(staff.uid, true)}
                      disabled={isSubmitting === staff.uid}
                      style={tw`bg-[#166534] dark:bg-emerald-600 rounded-xl px-4 py-2.5 items-center justify-center shadow-sm ${isSubmitting === staff.uid ? 'opacity-70' : ''}`}
                    >
                      <Text style={[tw`text-[11px] text-white uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                        {isSubmitting === staff.uid ? 'WAIT' : 'APPROVE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {filter === 'declined' && (
                  <TouchableOpacity 
                    onPress={() => handleUpdateStatus(staff.uid, true)}
                    disabled={isSubmitting === staff.uid}
                    style={tw`bg-gray-100 dark:bg-slate-700 rounded-xl px-3 py-2 items-center justify-center flex-row shadow-sm ${isSubmitting === staff.uid ? 'opacity-70' : ''}`}
                  >
                    <MaterialCommunityIcons name="undo" size={14} color={tw.color('gray-500')} style={tw`mr-1`} />
                    <Text style={[tw`text-[10px] text-gray-600 dark:text-slate-300 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                )}

                {filter === 'approved' && (
                  <TouchableOpacity 
                    onPress={() => handleUpdateStatus(staff.uid, false)}
                    disabled={isSubmitting === staff.uid}
                    style={tw`bg-gray-100 dark:bg-slate-700 rounded-xl px-3 py-2 items-center justify-center flex-row shadow-sm ${isSubmitting === staff.uid ? 'opacity-70' : ''}`}
                  >
                    <Text style={[tw`text-[10px] text-gray-600 dark:text-slate-300 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                      Revoke Access
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
