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

  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filter, setFilter] = useState<'pending' | 'reviewed'>('pending');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMoreDatesVisible, setIsMoreDatesVisible] = useState(false);

  // Only consider logs that are actual reports (pending or reviewed)
  const reportLogs = React.useMemo(() => {
    return allLogs.filter(log => log.status === 'pending' || log.status === 'reviewed');
  }, [allLogs]);

  // Group logs by staff
  const staffGroups = React.useMemo(() => {
    const groups: { [name: string]: any[] } = {};
    reportLogs.forEach(log => {
      const name = log.staffName || 'Unknown Staff';
      if (!groups[name]) groups[name] = [];
      groups[name].push(log);
    });
    return Object.entries(groups).map(([name, logs]) => ({
      name,
      logs,
      pendingCount: logs.filter(l => l.status === 'pending').length
    })).sort((a, b) => b.pendingCount - a.pendingCount);
  }, [reportLogs]);

  const selectedStaffLogs = reportLogs.filter(log => (log.staffName || 'Unknown Staff') === selectedStaffName);

  // Get unique dates for selected staff
  const availableDates = React.useMemo(() => {
    if (!selectedStaffName) return [];
    const dates = new Set<string>();
    selectedStaffLogs.forEach(log => {
      dates.add(new Date(log.timestamp).toLocaleDateString());
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [selectedStaffName, selectedStaffLogs]);

  const pendingLogs = selectedStaffLogs
    .filter(log => log.status === 'pending')
    .filter(log => !selectedDate || new Date(log.timestamp).toLocaleDateString() === selectedDate)
    .sort((a, b) => sortOrder === 'desc' ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const reviewedLogs = selectedStaffLogs
    .filter(log => log.status === 'reviewed')
    .filter(log => !selectedDate || new Date(log.timestamp).toLocaleDateString() === selectedDate)
    .sort((a, b) => sortOrder === 'desc' ? new Date(b.reviewedAt || 0).getTime() - new Date(a.reviewedAt || 0).getTime() : new Date(a.reviewedAt || 0).getTime() - new Date(b.reviewedAt || 0).getTime());

  const displayedLogs = filter === 'pending' ? pendingLogs : reviewedLogs;

  const recentDates = availableDates.slice(0, 2);
  const olderDates = availableDates.slice(2);

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
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center px-4 pb-4 pt-12 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity 
          activeOpacity={0.6}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}  
          onPress={() => {
            if (selectedStaffName) {
              setSelectedStaffName(null);
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
          {selectedStaffName ? `${selectedStaffName}'s Reports` : 'Staff Reports Inbox'}
        </Text>
      </View>

      {!selectedStaffName ? (
        // STAFF LIST VIEW
        <ScrollView contentContainerStyle={tw`p-4 pb-36`} showsVerticalScrollIndicator={false}>
          {staffGroups.length === 0 ? (
            <View style={tw`py-10 items-center justify-center`}>
              <MaterialCommunityIcons name="inbox-outline" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
              <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                No staff reports available.
              </Text>
            </View>
          ) : (
            staffGroups.map(staff => (
              <TouchableOpacity
                key={staff.name}
                onPress={() => {
                  setSelectedStaffName(staff.name);
                  setFilter(staff.pendingCount > 0 ? 'pending' : 'reviewed');
                  setSelectedDate(null);
                }}
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
                      {staff.logs.length} total reports
                    </Text>
                  </View>
                </View>
                {staff.pendingCount > 0 ? (
                  <View style={tw`bg-rose-500 px-2.5 py-1 rounded-full`}>
                    <Text style={[tw`text-white text-xs font-bold`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                      {staff.pendingCount} new
                    </Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={24} color={tw.color('gray-400')} />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        // SELECTED STAFF REPORTS VIEW
        <>
          {/* Tabs */}
          <View style={tw`flex-row bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800`}>
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={() => setFilter('pending')}
              style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'pending' ? tw`border-emerald-500` : tw`border-transparent`]}
            >
              <Text style={[tw`text-sm font-bold`, filter === 'pending' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
                Pending Review ({selectedStaffLogs.filter(l=>l.status==='pending').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={() => setFilter('reviewed')}
              style={[tw`flex-1 py-3 items-center border-b-2`, filter === 'reviewed' ? tw`border-emerald-500` : tw`border-transparent`]}
            >
              <Text style={[tw`text-sm font-bold`, filter === 'reviewed' ? tw`text-emerald-600 dark:text-emerald-400` : tw`text-gray-500`]}>
                Reviewed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Filter */}
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
            {displayedLogs.length === 0 ? (
              <View style={tw`py-10 items-center justify-center`}>
                <MaterialCommunityIcons name={filter === 'pending' ? 'check-all' : 'clipboard-text-off'} size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
                <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                  {filter === 'pending' ? 'No pending reports for this date!' : 'No reviewed reports for this date.'}
                </Text>
              </View>
            ) : (
              displayedLogs.map(log => {
                const actionDef = ACTION_TYPES.find(t => t.id === log.action) || ACTION_TYPES[6];
                const logDate = new Date(log.timestamp);
                
                return (
                  <View key={log.id} style={tw`bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 mb-2.5`}>
                    
                    {/* Header: Avatar, Name, Date, Status */}
                    <View style={tw`flex-row justify-between items-center mb-2.5`}>
                      <View style={tw`flex-row items-center gap-2.5`}>
                        <View style={tw`w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center`}>
                          <Text style={tw`text-[15px] text-slate-500 dark:text-slate-300 font-bold`}>{log.staffName?.charAt(0).toUpperCase() || 'S'}</Text>
                        </View>
                        <View>
                          <Text style={[tw`text-[14px] text-gray-900 dark:text-slate-100 leading-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{log.staffName}</Text>
                          <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
                            {logDate.toLocaleDateString()} • {logDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        </View>
                      </View>
                      <View style={tw`px-1.5 py-0.5 rounded border ${log.status === 'reviewed' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800'}`}>
                        <Text style={[tw`text-[9px] uppercase tracking-widest font-bold`, log.status === 'reviewed' ? tw`text-green-600 dark:text-green-400` : tw`text-amber-600 dark:text-amber-400`]}>
                          {log.status}
                        </Text>
                      </View>
                    </View>

                    {/* Tags Row */}
                    <View style={tw`flex-row flex-wrap items-center gap-2 mb-2`}>
                      <View style={tw`flex-row items-center gap-1`}>
                        <MaterialCommunityIcons name={actionDef.icon as any} size={14} color={actionDef.color} />
                        <Text style={[tw`text-[11px] uppercase tracking-widest`, {color: actionDef.color, fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{actionDef.label}</Text>
                      </View>
                      {log.rackName && (
                        <>
                          <View style={tw`w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600`} />
                          <View style={tw`flex-row items-center gap-1`}>
                            <MaterialCommunityIcons name="bookshelf" size={14} color={tw.color('gray-400')} />
                            <Text style={[tw`text-[11px] text-gray-600 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{log.rackName}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Description */}
                    <Text style={[tw`text-[13px] text-gray-700 dark:text-slate-300 mb-2.5 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                      {log.description}
                    </Text>

                    {/* Action / Note */}
                    {filter === 'pending' ? (
                      <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                        onPress={() => {
                          setSelectedLogId(log.id);
                          setReviewModalVisible(true);
                        }}
                        style={tw`bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg py-2 items-center flex-row justify-center gap-1.5`}
                      >
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color={tw.color('emerald-600')} />
                        <Text style={[tw`text-[12px] text-emerald-700 dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Review & Clear</Text>
                      </TouchableOpacity>
                    ) : (
                      log.adminNotes ? (
                        <View style={tw`bg-emerald-50/50 dark:bg-slate-900/80 p-2.5 rounded-lg border-l-2 border-emerald-500`}>
                          <Text style={[tw`text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 font-bold`]}>Your Note</Text>
                          <Text style={[tw`text-[12px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{log.adminNotes}</Text>
                        </View>
                      ) : null
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
          <View style={tw`bg-white dark:bg-slate-800 w-full rounded-[24px] p-6 shadow-xl`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-lg text-gray-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Review Report</Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => setReviewModalVisible(false)} disabled={isSubmitting}>
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
            
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
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

    </View>
  );
}
