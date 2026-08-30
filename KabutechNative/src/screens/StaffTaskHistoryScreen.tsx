import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal } from 'react-native';
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

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMoreDatesVisible, setIsMoreDatesVisible] = useState(false);

  const allCompletedTasks = allTasks.filter((t: any) => t.status === 'completed');

  const staffGroups = React.useMemo(() => {
    const groups: { [id: string]: { name: string, tasks: any[] } } = {};
    
    // Initialize groups for all approved staff
    Object.entries(allUsers).forEach(([uid, profile]: [string, any]) => {
      if (profile.role === 'staff' && profile.approved) {
        groups[uid] = { name: profile.name || 'Unknown', tasks: [] };
      }
    });

    // Add tasks to groups
    allCompletedTasks.forEach((task: any) => {
      const uid = task.assignedTo;
      if (!groups[uid]) {
        groups[uid] = { name: task.assignedToName || 'Unknown Staff', tasks: [] };
      }
      groups[uid].tasks.push(task);
    });

    return Object.entries(groups).map(([uid, data]) => ({
      uid,
      name: data.name,
      tasks: data.tasks,
      taskCount: data.tasks.length
    })).sort((a, b) => b.taskCount - a.taskCount);
  }, [allCompletedTasks, allUsers]);

  const selectedStaffGroup = staffGroups.find(g => g.uid === selectedStaffId);
  const selectedStaffTasks = selectedStaffGroup ? selectedStaffGroup.tasks : [];

  const availableDates = React.useMemo(() => {
    if (!selectedStaffId) return [];
    const dates = new Set<string>();
    selectedStaffTasks.forEach(task => {
      dates.add(new Date(task.completedAt).toLocaleDateString());
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [selectedStaffId, selectedStaffTasks]);

  const displayedTasks = selectedStaffTasks
    .filter(task => !selectedDate || new Date(task.completedAt).toLocaleDateString() === selectedDate)
    .sort((a: any, b: any) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const recentDates = availableDates.slice(0, 2);
  const olderDates = availableDates.slice(2);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center px-4 pb-4 pt-12 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity 
          activeOpacity={0.6}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} 
          onPress={() => {
            if (selectedStaffId) {
              setSelectedStaffId(null);
              setSelectedDate(null);
            } else {
              navigation.goBack();
            }
          }} 
          style={tw`mr-3 p-2 -ml-2 rounded-full`}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
          {selectedStaffGroup ? `${selectedStaffGroup.name}'s Tasks` : 'Staff Task History'}
        </Text>
      </View>

      {!selectedStaffId ? (
        <ScrollView contentContainerStyle={tw`p-4 pb-36`} showsVerticalScrollIndicator={false}>
          {staffGroups.length === 0 ? (
            <View style={tw`py-10 items-center justify-center`}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
              <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                No staff found.
              </Text>
            </View>
          ) : (
            staffGroups.map(staff => (
              <TouchableOpacity
                key={staff.uid}
                onPress={() => setSelectedStaffId(staff.uid)}
                style={tw`flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 dark:border-slate-700`}
              >
                <View style={tw`flex-row items-center gap-3`}>
                  <View style={tw`w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center`}>
                    <Text style={tw`text-emerald-700 dark:text-emerald-400 font-bold text-lg`}>
                      {staff.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[tw`text-base text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                      {staff.name}
                    </Text>
                    <Text style={[tw`text-xs text-gray-500 dark:text-slate-400 mt-0.5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                      {staff.taskCount} completed tasks
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={tw.color('gray-400')} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <View style={tw`bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`p-3 gap-2`}>
              <TouchableOpacity
                onPress={() => setSelectedDate(null)}
                style={[tw`px-4 py-1.5 rounded-full border`, !selectedDate ? tw`bg-slate-800 border-slate-800 dark:bg-slate-100 dark:border-slate-100` : tw`bg-transparent border-gray-300 dark:border-slate-700`]}
              >
                <Text style={[tw`text-xs`, !selectedDate ? tw`text-white dark:text-slate-900 font-bold` : tw`text-gray-600 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                  All Dates
                </Text>
              </TouchableOpacity>
              {recentDates.map(date => (
                <TouchableOpacity
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={[tw`px-4 py-1.5 rounded-full border`, selectedDate === date ? tw`bg-slate-800 border-slate-800 dark:bg-slate-100 dark:border-slate-100` : tw`bg-transparent border-gray-300 dark:border-slate-700`]}
                >
                  <Text style={[tw`text-xs`, selectedDate === date ? tw`text-white dark:text-slate-900 font-bold` : tw`text-gray-600 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    {date}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {(olderDates.length > 0 || (selectedDate && olderDates.includes(selectedDate))) && (
                <TouchableOpacity
                  onPress={() => setIsMoreDatesVisible(true)}
                  style={[
                    tw`px-4 py-1.5 rounded-full border flex-row items-center gap-1`,
                    selectedDate && olderDates.includes(selectedDate)
                      ? tw`bg-slate-800 border-slate-800 dark:bg-slate-100 dark:border-slate-100`
                      : tw`bg-transparent border-emerald-300 dark:border-emerald-700`
                  ]}
                >
                  <Text style={[
                    tw`text-xs`,
                    selectedDate && olderDates.includes(selectedDate)
                      ? tw`text-white dark:text-slate-900 font-bold`
                      : tw`text-emerald-700 dark:text-emerald-400 font-bold`,
                    {fontFamily: 'PlusJakartaSans_700Bold'}
                  ]}>
                    {selectedDate && olderDates.includes(selectedDate) ? selectedDate : `More (${olderDates.length})`}
                  </Text>
                  <MaterialCommunityIcons 
                    name="menu-down" 
                    size={14} 
                    color={selectedDate && olderDates.includes(selectedDate) ? (isDarkMode ? '#0f172a' : '#ffffff') : tw.color('emerald-600')} 
                  />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={tw`p-4 pb-36`} showsVerticalScrollIndicator={false}>
            {displayedTasks.length === 0 ? (
              <View style={tw`py-10 items-center justify-center`}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
                <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                  No tasks found for this date.
                </Text>
              </View>
            ) : (
              displayedTasks.map((task: any) => {
                const taskDate = new Date(task.completedAt);
                return (
                  <View key={task.id} style={tw`bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 mb-2.5`}>
                    
                    {/* Header */}
                    <View style={tw`flex-row justify-between items-center mb-2.5`}>
                      <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                        <View style={tw`w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center`}>
                          <MaterialCommunityIcons name="check-circle" size={18} color={tw.color('emerald-500')} />
                        </View>
                        <View style={tw`flex-1`}>
                          <Text style={[tw`text-[14px] text-gray-900 dark:text-slate-100 leading-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]} numberOfLines={1}>{task.title}</Text>
                          <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                            {taskDate.toLocaleDateString()} • {taskDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        </View>
                      </View>
                      <View style={tw`px-1.5 py-0.5 rounded border ${task.isOnTime ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'}`}>
                        <Text style={[tw`text-[9px] uppercase tracking-widest font-bold`, task.isOnTime ? tw`text-green-600 dark:text-green-400` : tw`text-red-600 dark:text-red-400`]}>
                          {task.isOnTime ? 'On Time' : 'Late'}
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    {task.description ? (
                      <Text style={[tw`text-[13px] text-gray-700 dark:text-slate-300 mb-2.5 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                        {task.description}
                      </Text>
                    ) : null}

                    {/* Notes */}
                    {task.completionNotes ? (
                      <View style={tw`bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border-l-2 border-gray-300 dark:border-slate-600`}>
                        <Text style={[tw`text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 font-bold`]}>Staff Notes</Text>
                        <Text style={[tw`text-[12px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{task.completionNotes}</Text>
                      </View>
                    ) : null}

                  </View>
                );
              })
            )}
          </ScrollView>

          {/* More Dates Modal */}
          <Modal
            visible={isMoreDatesVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsMoreDatesVisible(false)}
          >
            <View style={tw`flex-1 justify-end bg-black/50`}>
              <TouchableOpacity style={tw`flex-1`} onPress={() => setIsMoreDatesVisible(false)} />
              <View style={tw`bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[70%]`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                  <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Select Date</Text>
                  <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => setIsMoreDatesVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={tw.color('gray-400')} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {olderDates.map(date => (
                    <TouchableOpacity
                      key={date}
                      onPress={() => {
                        setSelectedDate(date);
                        setIsMoreDatesVisible(false);
                      }}
                      style={tw`flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800`}
                    >
                      <Text style={[tw`text-base`, selectedDate === date ? tw`text-emerald-600 font-bold` : tw`text-gray-700 dark:text-slate-300`]}>
                        {date}
                      </Text>
                      {selectedDate === date && (
                        <MaterialCommunityIcons name="check-circle" size={20} color={tw.color('emerald-500')} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <View style={tw`h-8`} />
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}
