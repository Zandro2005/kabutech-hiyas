import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useStaffTasks, useAllUsers } from '../hooks/useFirebaseData';

export default function StaffTaskHistoryScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const allTasks = useStaffTasks();
  const allUsers = useAllUsers();

  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  const approvedStaff = Object.entries(allUsers)
    .map(([uid, profile]) => ({ uid, ...profile }))
    .filter(u => u.role === 'staff' && u.approved);

  const completedTasks = allTasks
    .filter((t: any) => t.status === 'completed' && (selectedStaffId === 'all' || t.assignedTo === selectedStaffId))
    .sort((a: any, b: any) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mr-3 p-1`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Completed Tasks</Text>
      </View>

      {/* Staff Filter Tabs */}
      <View style={tw`bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-2`}>
          <TouchableOpacity 
            onPress={() => setSelectedStaffId('all')}
            style={[tw`px-5 py-3 border-b-2`, selectedStaffId === 'all' ? tw`border-emerald-500` : tw`border-transparent`]}
          >
            <Text style={[tw`text-xs font-bold`, selectedStaffId === 'all' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
              All Staff
            </Text>
          </TouchableOpacity>
          {approvedStaff.map(staff => (
            <TouchableOpacity 
              key={staff.uid}
              onPress={() => setSelectedStaffId(staff.uid)}
              style={[tw`px-5 py-3 border-b-2`, selectedStaffId === staff.uid ? tw`border-emerald-500` : tw`border-transparent`]}
            >
              <Text style={[tw`text-xs font-bold`, selectedStaffId === staff.uid ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
                {staff.name?.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-12`} showsVerticalScrollIndicator={false}>
        {completedTasks.length === 0 ? (
          <View style={tw`py-10 items-center justify-center`}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              No completed tasks found.
            </Text>
          </View>
        ) : (
          completedTasks.map((task: any) => (
            <View key={task.id} style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3`}>
              <View style={tw`flex-row justify-between items-start mb-2`}>
                <Text style={[tw`text-[15px] flex-1 text-gray-800 dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{task.title}</Text>
                
                <View style={tw`px-2 py-0.5 rounded border ${task.isOnTime ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'}`}>
                  <Text style={[tw`text-[8px] uppercase tracking-widest font-bold`, task.isOnTime ? tw`text-green-600 dark:text-green-400` : tw`text-red-600 dark:text-red-400`]}>
                    {task.isOnTime ? 'On Time' : 'Late'}
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row items-center gap-4 mb-3`}>
                <View style={tw`flex-row items-center gap-1`}>
                  <MaterialCommunityIcons name="account-hard-hat" size={14} color={tw.color('gray-400')} />
                  <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    Staff: {task.assignedToName}
                  </Text>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <MaterialCommunityIcons name="calendar-check" size={14} color={tw.color('gray-400')} />
                  <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    Completed: {new Date(task.completedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {task.description ? (
                <Text style={[tw`text-[12px] text-gray-600 dark:text-slate-300 mb-3 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                  {task.description}
                </Text>
              ) : null}

              {task.completionNotes ? (
                <View style={tw`bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border-l-2 border-gray-300 dark:border-slate-600`}>
                  <Text style={[tw`text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-bold`]}>Staff Notes</Text>
                  <Text style={[tw`text-[11px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{task.completionNotes}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
