import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import { useAuth } from '../../context/AuthContext';
import { useActivityLogs } from '../../hooks/useFirebaseData';
import { useTheme } from '../../context/ThemeContext';

const ACTION_TYPES = [
  { id: 'all', label: 'All', icon: 'filter' },
  { id: 'harvest', label: 'Harvest', icon: 'leaf' },
  { id: 'watering', label: 'Watering', icon: 'water' },
  { id: 'inspection', label: 'Inspection', icon: 'eye' },
  { id: 'cleaning', label: 'Cleaning', icon: 'broom' },
  { id: 'maintenance', label: 'Maintenance', icon: 'wrench' },
  { id: 'contamination_report', label: 'Issue', icon: 'alert' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal' },
];

const ACTION_COLORS: Record<string, string> = {
  harvest: '#10b981',
  watering: '#3b82f6',
  inspection: '#8b5cf6',
  cleaning: '#0ea5e9',
  maintenance: '#f59e0b',
  contamination_report: '#ef4444',
  other: '#64748b'
};

export default function MyActivityHistoryScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const allLogs = useActivityLogs();

  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const myLogs = allLogs
    .filter(log => log.staffId === user?.uid)
    .filter(log => filterAction === 'all' || log.action === filterAction)
    .filter(log => filterStatus === 'all' || log.status === filterStatus)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mr-3 p-1`}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[tw`text-lg text-slate-900 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Activity History</Text>
      </View>

      {/* Filters */}
      <View style={tw`bg-white dark:bg-slate-900 py-3 border-b border-gray-200 dark:border-slate-800`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 gap-2`}>
          {ACTION_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setFilterAction(type.id)}
              style={[
                tw`px-3 py-1.5 rounded-full flex-row items-center gap-1`,
                filterAction === type.id ? tw`bg-emerald-100 dark:bg-emerald-900/50` : tw`bg-gray-100 dark:bg-slate-800`
              ]}
            >
              <MaterialCommunityIcons 
                name={type.icon as any} 
                size={14} 
                color={filterAction === type.id ? '#059669' : (isDarkMode ? '#94a3b8' : '#64748b')} 
              />
              <Text style={[tw`text-[11px] font-bold`, filterAction === type.id ? tw`text-emerald-700 dark:text-emerald-400` : tw`text-gray-600 dark:text-slate-400`]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={tw`flex-row px-4 mt-3 gap-2`}>
          {['all', 'pending', 'reviewed'].map(status => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                tw`px-3 py-1 rounded-md`,
                filterStatus === status ? tw`bg-slate-800 dark:bg-slate-200` : tw`bg-gray-100 dark:bg-slate-800`
              ]}
            >
              <Text style={[tw`text-[10px] uppercase font-bold`, filterStatus === status ? tw`text-white dark:text-slate-900` : tw`text-gray-500 dark:text-slate-400`]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-4 pb-36`} showsVerticalScrollIndicator={false}>
        {myLogs.length === 0 ? (
          <View style={tw`py-10 items-center justify-center`}>
            <MaterialCommunityIcons name="clipboard-text-off" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-sm text-gray-500 mt-3`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>No logs found matching filters.</Text>
          </View>
        ) : (
          myLogs.map(log => {
            const actionDef = ACTION_TYPES.find(t => t.id === log.action) || ACTION_TYPES[7];
            const color = ACTION_COLORS[log.action] || ACTION_COLORS.other;
            const logDate = new Date(log.timestamp);
            
            return (
              <View key={log.id} style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 mb-3`}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <View style={[tw`w-8 h-8 rounded-full items-center justify-center`, { backgroundColor: `${color}20` }]}>
                      <MaterialCommunityIcons name={actionDef.icon as any} size={16} color={color} />
                    </View>
                    <View>
                      <Text style={[tw`text-[13px] text-gray-800 dark:text-slate-200`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{actionDef.label}</Text>
                      <Text style={[tw`text-[9px] text-gray-400`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
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

                <Text style={[tw`text-[12px] text-gray-600 dark:text-slate-300 mb-2 leading-relaxed`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                  {log.description}
                </Text>

                {log.rackName && (
                  <View style={tw`flex-row items-center gap-1 mb-2`}>
                    <MaterialCommunityIcons name="bookshelf" size={12} color={tw.color('gray-400')} />
                    <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{log.rackName}</Text>
                  </View>
                )}

                {log.status === 'reviewed' && log.adminNotes && (
                  <View style={tw`mt-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border-l-2 border-emerald-500`}>
                    <Text style={[tw`text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-bold`]}>Admin Note</Text>
                    <Text style={[tw`text-[11px] text-gray-700 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>{log.adminNotes}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
