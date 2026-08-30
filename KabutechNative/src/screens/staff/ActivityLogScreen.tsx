import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useBatches, useActivityLogs } from '../../hooks/useFirebaseData';
import { ref, push, set } from 'firebase/database';
import { db } from '../../services/firebase';
import { showToast } from '../../components/CustomToast';
import { ActivityLogEntry } from '../../types/firebase';
import { useTheme } from '../../context/ThemeContext';

const ACTION_TYPES = [
  { id: 'harvest', label: 'Harvest', icon: 'leaf', color: '#10b981' },
  { id: 'watering', label: 'Watering', icon: 'water', color: '#3b82f6' },
  { id: 'inspection', label: 'Inspection', icon: 'eye', color: '#8b5cf6' },
  { id: 'cleaning', label: 'Cleaning', icon: 'broom', color: '#0ea5e9' },
  { id: 'maintenance', label: 'Maintenance', icon: 'wrench', color: '#f59e0b' },
  { id: 'contamination_report', label: 'Issue', icon: 'alert', color: '#ef4444' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal', color: '#64748b' },
];

export default function ActivityLogScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user, profile } = useAuth();
  const batches = useBatches();
  const allLogs = useActivityLogs();

  const [selectedAction, setSelectedAction] = useState<string>('harvest');
  const [description, setDescription] = useState('');
  const [selectedRackId, setSelectedRackId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRackPicker, setShowRackPicker] = useState(false);

  const activeRacks = batches.filter(r => !r.archived);
  
  // Get staff's own logs, sorted by newest
  const myLogs = allLogs
    .filter(log => log.staffId === user?.uid)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10); // Show last 10

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast({ type: 'error', text1: 'Validation Error', text2: 'Please provide a description.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedRack = activeRacks.find(r => r.firebaseKey === selectedRackId);
      
      const newLogRef = push(ref(db, 'kabutech/logs'));
      const logEntry: Omit<ActivityLogEntry, 'id'> = {
        staffId: user!.uid,
        staffName: profile?.name || user?.displayName || 'Unknown Staff',
        action: selectedAction as any,
        description: description.trim(),
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      if (selectedRack) {
        logEntry.rackId = String(selectedRack.firebaseKey);
        logEntry.rackName = selectedRack.rack || 'Unnamed Rack';
      }

      await set(newLogRef, logEntry);
      
      showToast({ type: 'success', text1: 'Log Submitted', text2: 'Activity recorded successfully.' });
      setDescription('');
      setSelectedRackId('');
      setSelectedAction('harvest');
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to submit log.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRackName = activeRacks.find(r => r.firebaseKey === selectedRackId)?.rack || 'Select Rack (Optional)';

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />
      
      <FlatList
        data={myLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`p-5 pb-36`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Title */}
            <View style={tw`mb-4`}>
              <Text style={[tw`text-[17px] text-[#032514] dark:text-slate-100 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Activity Log</Text>
              <Text style={[tw`text-xs text-gray-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Record your daily farm tasks and actions.</Text>
            </View>

            {/* Submit Form */}
            <View style={tw`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-6`}>
              
              <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-3`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Action Type</Text>
              
              <View style={tw`flex-row flex-wrap gap-2 mb-5`}>
                {ACTION_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setSelectedAction(type.id)}
                    style={[
                      tw`px-3 py-1.5 rounded-full border flex-row items-center gap-1.5`,
                      selectedAction === type.id 
                        ? { backgroundColor: type.color, borderColor: type.color } 
                        : tw`bg-transparent border-gray-200 dark:border-slate-600`
                    ]}
                  >
                    <MaterialCommunityIcons name={type.icon as any} size={14} color={selectedAction === type.id ? 'white' : (isDarkMode ? '#94a3b8' : '#64748b')} />
                    <Text style={[tw`text-[11px]`, selectedAction === type.id ? tw`text-white font-bold` : tw`text-gray-500 dark:text-slate-400`]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Description</Text>
              <TextInput
                style={[tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-4`, {fontFamily: 'PlusJakartaSans_500Medium', minHeight: 80}]}
                placeholder="What did you do?"
                placeholderTextColor={tw.color('gray-400')}
                multiline
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Related Rack</Text>
              <TouchableOpacity 
                onPress={() => setShowRackPicker(!showRackPicker)}
                style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 flex-row justify-between items-center mb-6`}
              >
                <Text style={[tw`text-sm`, selectedRackId ? tw`text-gray-900 dark:text-white` : tw`text-gray-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                  {selectedRackName}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={tw.color('gray-400')} />
              </TouchableOpacity>

              {showRackPicker && (
                <View style={tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl mb-6 overflow-hidden mt-[-16px]`}>
                  <TouchableOpacity
                    style={tw`p-3 border-b border-gray-200 dark:border-slate-700`}
                    onPress={() => { setSelectedRackId(''); setShowRackPicker(false); }}
                  >
                    <Text style={tw`text-sm text-gray-500 dark:text-slate-400`}>None</Text>
                  </TouchableOpacity>
                  {activeRacks.map(rack => (
                    <TouchableOpacity
                      key={String(rack.firebaseKey)}
                      style={tw`p-3 border-b border-gray-200 dark:border-slate-700`}
                      onPress={() => { setSelectedRackId(String(rack.firebaseKey)); setShowRackPicker(false); }}
                    >
                      <Text style={tw`text-sm text-gray-900 dark:text-white`}>{rack.rack || 'Unnamed Rack'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={tw`bg-[#166534] dark:bg-emerald-600 rounded-xl py-3.5 items-center justify-center flex-row shadow-sm ${isSubmitting ? 'opacity-70' : ''}`}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" style={tw`mr-2`} />
                ) : (
                  <MaterialCommunityIcons name="send-outline" size={18} color="white" style={tw`mr-2`} />
                )}
                <Text style={[tw`text-white text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                  {isSubmitting ? 'Submitting...' : 'Submit Log'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-[15px] text-[#032514] dark:text-slate-200 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Recent Logs</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyActivityHistory' as never)}>
                <Text style={[tw`text-[11px] text-emerald-600 dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>View All</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={tw`bg-white dark:bg-slate-800 rounded-2xl p-6 items-center justify-center border border-gray-100 dark:border-slate-700 border-dashed`}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={32} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-400 mt-2`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>No recent activity logs.</Text>
          </View>
        }
        renderItem={({ item: log }) => {
          const actionType = ACTION_TYPES.find(t => t.id === log.action) || ACTION_TYPES[6];
          const logDate = new Date(log.timestamp);
          const timeString = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = logDate.toLocaleDateString();

          return (
            <View style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3`}>
              <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <View style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: `${actionType.color}20` }]}>
                    <MaterialCommunityIcons name={actionType.icon as any} size={16} color={actionType.color} />
                  </View>
                  <View>
                    <Text style={[tw`text-[13px] text-gray-800 dark:text-slate-200`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{actionType.label}</Text>
                    <Text style={[tw`text-[9px] text-gray-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{dateString} • {timeString}</Text>
                  </View>
                </View>
                <View style={tw`px-2 py-0.5 rounded border ${log.status === 'reviewed' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800'}`}>
                  <Text style={[tw`text-[8px] uppercase tracking-widest font-bold`, log.status === 'reviewed' ? tw`text-green-600 dark:text-green-400` : tw`text-amber-600 dark:text-amber-400`]}>
                    {log.status}
                  </Text>
                </View>
              </View>

              <Text style={[tw`text-[12px] text-gray-600 dark:text-slate-300 mb-2 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                {log.description}
              </Text>

              {!!log.rackName && (
                <View style={tw`flex-row items-center mt-1`}>
                  <MaterialCommunityIcons name="server" size={10} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <Text style={[tw`text-[10px] text-slate-500 ml-1`, {fontFamily: 'PlusJakartaSans_600SemiBold'}]}>Rack: {log.rackName}</Text>
                </View>
              )}

              {log.status === 'reviewed' && !!log.adminNotes && (
                <View style={tw`mt-3 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800`}>
                  <Text style={[tw`text-[10px] text-emerald-800 dark:text-emerald-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Admin Note:</Text>
                  <Text style={[tw`text-[11px] text-emerald-700 dark:text-emerald-300 leading-tight`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>{log.adminNotes}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
