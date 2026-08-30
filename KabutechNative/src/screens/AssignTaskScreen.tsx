import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import tw from '../tailwind';
import { useAllUsers } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import { ref, push, set } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import { StaffTask } from '../types/firebase';
import { sendPushNotification } from '../utils/PushNotifications';

export default function AssignTaskScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user, profile } = useAuth();
  const allUsers = useAllUsers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const descriptionRef = React.useRef<TextInput>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [dueTime, setDueTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);

  // Get only approved staff
  const staffList = Object.entries(allUsers)
    .map(([uid, profile]) => ({ uid, ...profile }))
    .filter(u => u.role === 'staff' && u.approved);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedStaffId) {
      showToast({ type: 'error', text1: 'Validation Error', text2: 'Title and Staff selection are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const staffUser = staffList.find(s => s.uid === selectedStaffId);
      if (!staffUser) throw new Error("Staff not found");

      const dateStr = dueDate.toISOString().split('T')[0];
      const timeStr = `${dueTime.getHours().toString().padStart(2, '0')}:${dueTime.getMinutes().toString().padStart(2, '0')}`;

      const newTaskRef = push(ref(db, 'kabutech/tasks'));
      const task: Omit<StaffTask, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: selectedStaffId,
        assignedToName: staffUser.name,
        assignedBy: user!.uid,
        assignedByName: profile?.name || user?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
        dueDate: dateStr,
        dueTime: timeStr,
        status: 'assigned',
      };

      await set(newTaskRef, task);
      
      // Trigger Push Notification to assigned staff
      if (staffUser.pushToken) {
        try {
          sendPushNotification(
            staffUser.pushToken,
            'New Task Assigned 📋',
            `${profile?.name || user?.displayName || 'Admin'} assigned you a new task: ${title.trim()}`
          );
        } catch (e) {
          console.log('Push error', e);
        }
      }

      showToast({ type: 'success', text1: 'Task Assigned', text2: 'Task has been assigned successfully.' });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to assign task.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStaffName = staffList.find(s => s.uid === selectedStaffId)?.name || 'Select Staff Member';

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(Platform.OS === 'ios');
    setDueDate(currentDate);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueTime;
    setShowTimePicker(Platform.OS === 'ios');
    setDueTime(currentDate);
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => navigation.goBack()} style={tw`mr-3 p-1`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Assign Task</Text>
      </View>
      
      <ScrollView contentContainerStyle={tw`p-5 pb-36`} showsVerticalScrollIndicator={false}>
        
        <View style={tw`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700`}>
          
          <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Task Title *</Text>
          <TextInput
            style={[tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white mb-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}
            placeholder="e.g., Clean Rack A"
            placeholderTextColor={tw.color('gray-400')}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Description (Optional)</Text>
          <TextInput
            ref={descriptionRef}
            style={[tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-5`, {fontFamily: 'PlusJakartaSans_500Medium', minHeight: 80}]}
            placeholder="Additional instructions..."
            placeholderTextColor={tw.color('gray-400')}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Assign To Staff *</Text>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={() => setShowStaffPicker(!showStaffPicker)}
            style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex-row justify-between items-center mb-5`}
          >
            <Text style={[tw`text-sm`, selectedStaffId ? tw`text-gray-900 dark:text-white` : tw`text-gray-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              {selectedStaffName}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={tw.color('gray-400')} />
          </TouchableOpacity>

          {showStaffPicker && (
            <View style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl mb-5 overflow-hidden mt-[-16px]`}>
              {staffList.length === 0 ? (
                <View style={tw`p-4 items-center`}>
                  <Text style={tw`text-sm text-gray-500`}>No approved staff members available.</Text>
                </View>
              ) : (
                staffList.map(staff => (
                  <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                    key={staff.uid}
                    style={tw`p-3 border-b border-gray-200 dark:border-slate-700`}
                    onPress={() => { setSelectedStaffId(staff.uid); setShowStaffPicker(false); }}
                  >
                    <Text style={[tw`text-sm text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{staff.name}</Text>
                    <Text style={[tw`text-[10px] text-gray-500`]}>{staff.email}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <View style={tw`flex-row gap-4 mb-8`}>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Due Date</Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={() => setShowDatePicker(true)}
                style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex-row justify-between items-center`}
              >
                <Text style={[tw`text-sm text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                  {dueDate.toLocaleDateString()}
                </Text>
                <MaterialCommunityIcons name="calendar" size={18} color={tw.color('gray-400')} />
              </TouchableOpacity>
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Due Time</Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={() => setShowTimePicker(true)}
                style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex-row justify-between items-center`}
              >
                <Text style={[tw`text-sm text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                  {dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <MaterialCommunityIcons name="clock-outline" size={18} color={tw.color('gray-400')} />
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={dueDate}
              mode="date"
              is24Hour={true}
              display="default"
              onValueChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={dueTime}
              mode="time"
              is24Hour={false}
              display="default"
              onValueChange={onTimeChange}
            />
          )}

          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            style={tw`bg-[#166534] dark:bg-emerald-600 rounded-xl py-4 items-center justify-center flex-row shadow-sm ${isSubmitting ? 'opacity-70' : ''}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" style={tw`mr-2`} />
            ) : (
              <MaterialCommunityIcons name="send-outline" size={18} color="white" style={tw`mr-2`} />
            )}
            <Text style={[tw`text-white text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              {isSubmitting ? 'Assigning Task...' : 'Assign Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
