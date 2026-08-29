import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../tailwind';
import { useActivityLogs } from '../hooks/useFirebaseData';
import { useTheme } from '../context/ThemeContext';
import { ref, update } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';

const ACTION_TYPES = [
  { id: 'harvest', label: 'Harvest', icon: 'leaf', color: '#10b981' },
  { id: 'watering', label: 'Watering', icon: 'water', color: '#3b82f6' },
  { id: 'inspection', label: 'Inspection', icon: 'eye', color: '#8b5cf6' },
  { id: 'cleaning', label: 'Cleaning', icon: 'broom', color: '#0ea5e9' },
  { id: 'maintenance', label: 'Maintenance', icon: 'wrench', color: '#f59e0b' },
  { id: 'contamination_report', label: 'Issue', icon: 'alert', color: '#ef4444' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal', color: '#64748b' },
];

export default function StaffReportsInboxScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user, profile } = useAuth();
  const allLogs = useActivityLogs();

  const [filter, setFilter] = useState<'pending' | 'reviewed'>('pending');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingLogs = allLogs
    .filter(log => log.status === 'pending')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const reviewedLogs = allLogs
    .filter(log => log.status === 'reviewed')
    .sort((a, b) => new Date(b.reviewedAt || 0).getTime() - new Date(a.reviewedAt || 0).getTime());

  const displayedLogs = filter === 'pending' ? pendingLogs : reviewedLogs;

  const handleReview = async () => {
    if (!selectedLogId) return;
    setIsSubmitting(true);
    try {
      await update(ref(db, `kabutech/logs/${selectedLogId}`), {
        status: 'reviewed',
        reviewedBy: user!.uid,
        reviewedAt: new Date().toISOString(),
        adminNotes: adminNotes.trim(),
      });
      showToast({ type: 'success', text1: 'Reviewed', text2: 'Log marked as reviewed.' });
      setReviewModalVisible(false);
      setAdminNotes('');
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to update log.' });
    } finally {
      setIsSubmitting(false);
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
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Staff Reports Inbox</Text>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
        <TouchableOpacity 
          onPress={() => setFilter('pending')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'pending' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-sm font-bold`, filter === 'pending' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Pending Review ({pendingLogs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFilter('reviewed')}
          style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'reviewed' ? tw`border-emerald-500` : tw`border-transparent`]}
        >
          <Text style={[tw`text-sm font-bold`, filter === 'reviewed' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
            Reviewed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-12`} showsVerticalScrollIndicator={false}>
        {displayedLogs.length === 0 ? (
          <View style={tw`py-10 items-center justify-center`}>
            <MaterialCommunityIcons name={filter === 'pending' ? 'check-all' : 'clipboard-text-off'} size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              {filter === 'pending' ? 'No pending reports to review!' : 'No reviewed reports found.'}
            </Text>
          </View>
        ) : (
          displayedLogs.map(log => {
            const actionDef = ACTION_TYPES.find(t => t.id === log.action) || ACTION_TYPES[6];
            const logDate = new Date(log.timestamp);
            
            return (
              <View key={log.id} style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3`}>
                <View style={tw`flex-row justify-between items-start mb-3`}>
                  <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center`}>
                      <Text style={tw`text-slate-500 dark:text-slate-300 font-bold`}>{log.staffName?.charAt(0).toUpperCase() || 'S'}</Text>
                    </View>
                    <View>
                      <Text style={[tw`text-[14px] text-gray-900 dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{log.staffName}</Text>
                      <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                        {logDate.toLocaleDateString()} • {logDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </View>
                  </View>
                  <View style={tw`px-2 py-0.5 rounded border ${log.status === 'reviewed' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800'}`}>
                    <Text style={[tw`text-[8px] uppercase tracking-widest font-bold`, log.status === 'reviewed' ? tw`text-green-600 dark:text-green-400` : tw`text-amber-600 dark:text-amber-400`]}>
                      {log.status}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-1.5 mb-2`}>
                  <MaterialCommunityIcons name={actionDef.icon as any} size={14} color={actionDef.color} />
                  <Text style={[tw`text-[11px] uppercase tracking-widest`, {color: actionDef.color, fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{actionDef.label}</Text>
                </View>

                <Text style={[tw`text-[13px] text-gray-700 dark:text-slate-300 mb-3 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                  {log.description}
                </Text>

                {log.rackName && (
                  <View style={tw`flex-row items-center gap-1 mb-3 bg-gray-50 dark:bg-slate-900 self-start px-2 py-1 rounded border border-gray-100 dark:border-slate-700`}>
                    <MaterialCommunityIcons name="bookshelf" size={14} color={tw.color('gray-400')} />
                    <Text style={[tw`text-[11px] text-gray-600 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{log.rackName}</Text>
                  </View>
                )}

                {filter === 'pending' ? (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedLogId(log.id);
                      setReviewModalVisible(true);
                    }}
                    style={tw`bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg py-2.5 items-center flex-row justify-center gap-1.5 mt-2`}
                  >
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={tw.color('emerald-600')} />
                    <Text style={[tw`text-[12px] text-emerald-700 dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Review & Clear</Text>
                  </TouchableOpacity>
                ) : (
                  log.adminNotes ? (
                    <View style={tw`mt-2 bg-emerald-50/50 dark:bg-slate-900/80 p-3 rounded-xl border-l-2 border-emerald-500`}>
                      <Text style={[tw`text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-bold`]}>Your Note</Text>
                      <Text style={[tw`text-[11px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{log.adminNotes}</Text>
                    </View>
                  ) : null
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
          <View style={tw`bg-white dark:bg-slate-800 w-full rounded-[24px] p-6 shadow-xl`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-lg text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Review Report</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)} disabled={isSubmitting}>
                <MaterialCommunityIcons name="close" size={24} color={tw.color('gray-400')} />
              </TouchableOpacity>
            </View>
            
            <Text style={[tw`text-sm text-gray-500 dark:text-slate-400 mb-2`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
              Add an optional note for the staff member:
            </Text>
            
            <TextInput
              style={[tw`bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white mb-6`, {fontFamily: 'PlusJakartaSans_500Medium', minHeight: 80}]}
              multiline
              textAlignVertical="top"
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="e.g., Good job, noted."
              placeholderTextColor={tw.color('gray-400')}
              editable={!isSubmitting}
            />
            
            <TouchableOpacity 
              style={tw`bg-emerald-600 dark:bg-emerald-500 rounded-xl py-3.5 items-center justify-center flex-row shadow-sm ${isSubmitting ? 'opacity-70' : ''}`}
              onPress={handleReview}
              disabled={isSubmitting}
            >
              <Text style={[tw`text-white text-sm`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                {isSubmitting ? 'Saving...' : 'Mark as Reviewed'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
