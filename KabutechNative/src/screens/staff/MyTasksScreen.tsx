import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Modal, TextInput, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import { useAuth } from '../../context/AuthContext';
import { useStaffTasks } from '../../hooks/useFirebaseData';
import { useTheme } from '../../context/ThemeContext';
import { ref, update, push, get, child } from 'firebase/database';
import { db } from '../../services/firebase';
import { showToast } from '../../components/CustomToast';
import { sendPushNotification } from '../../utils/PushNotifications';

export default function MyTasksScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user, profile } = useAuth();
  const allTasks = useStaffTasks();

  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const myTasks = allTasks.filter(t => t.assignedTo === user?.uid);
  
  const activeTasks = myTasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
  const completedTasks = myTasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const displayedTasks = filter === 'active' ? activeTasks : completedTasks;

  const handleMarkComplete = async () => {
    if (!selectedTaskId) return;
    setIsSubmitting(true);
    try {
      const task = myTasks.find(t => t.id === selectedTaskId);
      if (!task) throw new Error("Task not found");

      const now = new Date();
      
      // Determine if on time
      let isOnTime = true;
      if (task.dueDate) {
        const deadline = new Date(task.dueDate);
        if (task.dueTime) {
          const [hh, mm] = task.dueTime.split(':');
          deadline.setHours(parseInt(hh, 10), parseInt(mm, 10));
        } else {
          deadline.setHours(23, 59, 59);
        }
        isOnTime = now.getTime() <= deadline.getTime();
      }

      const updates: any = {};
      updates[`kabutech/tasks/${selectedTaskId}/status`] = 'completed';
      updates[`kabutech/tasks/${selectedTaskId}/completedAt`] = now.toISOString();
      updates[`kabutech/tasks/${selectedTaskId}/completionNotes`] = completionNotes.trim();
      updates[`kabutech/tasks/${selectedTaskId}/isOnTime`] = isOnTime;

      await update(ref(db), updates);

      // Trigger Push Notification to Admin
      if (task.assignedBy) {
        try {
          const adminProfileSnapshot = await get(child(ref(db), `kabutech/users/${task.assignedBy}`));
          const adminProfile = adminProfileSnapshot.val();
          if (adminProfile && adminProfile.pushToken) {
            sendPushNotification(
              adminProfile.pushToken,
              'Task Completed! ✅',
              `${profile?.name || 'Staff'} has completed: ${task.title}`
            );
          }
        } catch(e) {
          console.log('Failed to send push notification', e);
        }
      }

      showToast({ type: 'success', text1: 'Task Completed', text2: 'Great job!' });
      setCompleteModalVisible(false);
      setCompletionNotes('');
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to update task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTaskCard = (task: any) => {
    const isCompleted = task.status === 'completed';
    const deadline = new Date(task.dueDate);
    if (task.dueTime) {
      const [hh, mm] = task.dueTime.split(':');
      deadline.setHours(parseInt(hh, 10), parseInt(mm, 10));
    } else {
      deadline.setHours(23, 59, 59);
    }
    
    const now = new Date();
    const isOverdue = !isCompleted && now.getTime() > deadline.getTime();
    const isDueToday = !isCompleted && !isOverdue && now.toDateString() === deadline.toDateString();

    return (
      <View key={task.id} style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3`}>
        <View style={tw`flex-row justify-between items-start mb-2`}>
          <Text style={[tw`text-[15px] flex-1 text-gray-800 dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{task.title}</Text>
          
          {isCompleted ? (
            <View style={tw`px-2 py-0.5 rounded border ${task.isOnTime ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'}`}>
              <Text style={[tw`text-[8px] uppercase tracking-widest font-bold`, task.isOnTime ? tw`text-green-600 dark:text-green-400` : tw`text-red-600 dark:text-red-400`]}>
                {task.isOnTime ? 'On Time' : 'Late'}
              </Text>
            </View>
          ) : isOverdue ? (
            <View style={tw`px-2 py-0.5 rounded border bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800`}>
              <Text style={[tw`text-[8px] uppercase tracking-widest font-bold text-red-600 dark:text-red-400`]}>Overdue</Text>
            </View>
          ) : isDueToday ? (
            <View style={tw`px-2 py-0.5 rounded border bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800`}>
              <Text style={[tw`text-[8px] uppercase tracking-widest font-bold text-amber-600 dark:text-amber-400`]}>Due Today</Text>
            </View>
          ) : null}
        </View>

        {task.description ? (
          <Text style={[tw`text-[12px] text-gray-600 dark:text-slate-300 mb-3 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
            {task.description}
          </Text>
        ) : null}

        <View style={tw`flex-row items-center gap-4 mb-4`}>
          <View style={tw`flex-row items-center gap-1`}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color={isOverdue ? '#ef4444' : tw.color('gray-400')} />
            <Text style={[tw`text-[10px] ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
              Due: {deadline.toLocaleDateString()} {task.dueTime || ''}
            </Text>
          </View>
          <View style={tw`flex-row items-center gap-1`}>
            <MaterialCommunityIcons name="account-tie" size={14} color={tw.color('gray-400')} />
            <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
              By: {task.assignedByName}
            </Text>
          </View>
        </View>

        {!isCompleted ? (
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={() => {
              setSelectedTaskId(task.id);
              setCompleteModalVisible(true);
            }}
            style={tw`bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg py-2 items-center flex-row justify-center gap-1.5`}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={tw.color('emerald-600')} />
            <Text style={[tw`text-[11px] text-emerald-700 dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Mark Complete</Text>
          </TouchableOpacity>
        ) : (
          task.completionNotes ? (
            <View style={tw`bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border-l-2 border-gray-300 dark:border-slate-600`}>
              <Text style={[tw`text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-bold`]}>My Notes</Text>
              <Text style={[tw`text-[11px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{task.completionNotes}</Text>
            </View>
          ) : null
        )}
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => navigation.goBack()} style={tw`mr-3 p-1`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>My Tasks</Text>
      </View>

      {!isReady ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
      <>
      {/* Tabs */}
      <View style={tw`flex-row bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => setFilter('active')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'active' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-sm font-bold`, filter === 'active' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Active ({activeTasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          onPress={() => setFilter('completed')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'completed' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-sm font-bold`, filter === 'completed' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Completed ({completedTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`p-4 pb-36`}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={tw`py-10 items-center justify-center`}>
            <MaterialCommunityIcons name={filter === 'active' ? 'check-all' : 'clipboard-text-off'} size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              {filter === 'active' ? 'You have no active tasks!' : 'No completed tasks yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => renderTaskCard(item)}
      />
      </>
      )}

      {/* Complete Task Modal */}
      <Modal visible={completeModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
          <View style={tw`bg-white dark:bg-slate-800 w-full rounded-[24px] p-6 shadow-xl`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-lg text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Complete Task</Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => setCompleteModalVisible(false)} disabled={isSubmitting}>
                <MaterialCommunityIcons name="close" size={24} color={tw.color('gray-400')} />
              </TouchableOpacity>
            </View>
            
            <Text style={[tw`text-sm text-gray-500 dark:text-slate-400 mb-2`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              Add any completion notes (optional):
            </Text>
            
            <TextInput
              style={[tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-6`, {fontFamily: 'PlusJakartaSans_500Medium', minHeight: 80}]}
              multiline
              textAlignVertical="top"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              placeholder="e.g., Finished early, found an issue..."
              placeholderTextColor={tw.color('gray-400')}
              editable={!isSubmitting}
            />
            
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              style={tw`bg-emerald-600 dark:bg-emerald-500 rounded-xl py-3.5 items-center justify-center flex-row shadow-sm ${isSubmitting ? 'opacity-70' : ''}`}
              onPress={handleMarkComplete}
              disabled={isSubmitting}
            >
              <Text style={[tw`text-white text-sm`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                {isSubmitting ? 'Saving...' : 'Submit & Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
