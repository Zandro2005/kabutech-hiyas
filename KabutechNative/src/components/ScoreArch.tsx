import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const getAvatarColor = (name: string) => {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
    '#f43f5e'  // rose
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

interface Props {
  envScore: string;
  isAuto: boolean;
  isScheduled?: boolean;
  isDarkMode: boolean;
  fansActive: boolean;
  misterActive: boolean;
  lightActive: boolean;
  toggleDevice: (device: 'fans' | 'misters' | 'lights' | 'co2', currentState: boolean) => void;
  navigation: any;
  readOnly?: boolean;
}

export default function ScoreArch({
  envScore,
  isAuto,
  isScheduled = false,
  isDarkMode,
  fansActive,
  misterActive,
  lightActive,
  toggleDevice,
  navigation,
  readOnly = false
}: Props) {
  const { profile } = useAuth();
  
  return (
    <View style={tw`w-full items-center mt-2 relative z-0`}>
      <View style={{ width: width * 1.5, height: width * 0.95, overflow: 'hidden', alignItems: 'center' }}>
        <LinearGradient
          colors={isDarkMode ? ['#0f172a', '#020617'] : ['#dcfce7', '#f0f9f4']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[tw`absolute bottom-0`, { width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75 }]}
        />
        
        {/* Top Header - "Hi, Admin" */}
        <View style={[tw`flex-row justify-between items-center px-6 pt-4 pb-2 z-10`, { width: width }]}>
          <TouchableOpacity 
            style={tw`flex-row items-center gap-3`} 
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <View style={tw`w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden items-center justify-center border-2 border-white shadow-sm`}>
              <Text style={[tw`text-2xl`, {color: getAvatarColor(profile?.name || 'User'), fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View>
              <Text style={[tw`text-lg text-slate-800 dark:text-white tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                Hi, {profile?.name ? profile.name.split(' ')[0] : 'User'}
              </Text>
              <Text style={[tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                Welcome Back!!
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Live Pill */}
          <View style={tw`border border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-slate-800/40 rounded-full px-3 py-1.5 flex-row items-center gap-2 shadow-sm`}>
            <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
            <Text style={[tw`text-xs text-emerald-800 dark:text-emerald-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Live Sim</Text>
          </View>
        </View>

        {/* Score Content inside the arch */}
        <View style={tw`absolute bottom-16 items-center`}>
          <Text style={[tw`text-xs text-slate-700 dark:text-slate-300 tracking-widest mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Environment Score</Text>
          <View style={tw`flex-row items-baseline mb-2`}>
            <Text style={[tw`text-[52px] text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{envScore}</Text>
            <Text style={[tw`text-3xl text-slate-900 dark:text-white tracking-tighter`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>/10</Text>
          </View>

          {/* Progress Bar */}
          <View style={tw`w-48 h-3 bg-emerald-200/50 dark:bg-slate-700 rounded-full flex-row overflow-hidden mb-3`}>
            <View style={[tw`h-full bg-emerald-500 rounded-full`, { width: `${parseFloat(envScore) * 10}%` }]} />
          </View>

          <Text style={[tw`text-xs text-slate-700 dark:text-slate-300`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Overall conditions are optimal</Text>
          <View style={tw`flex-row items-center gap-2 mt-1.5`}>
            <Text style={[tw`text-[10px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>▲ +6% VS last Week</Text>
            
            {/* Auto/Manual/Scheduled Mode Indicator */}
            <View style={tw`px-2 py-0.5 rounded-md ${isAuto ? 'bg-emerald-100 dark:bg-emerald-900/40' : isScheduled ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-amber-100 dark:bg-amber-900/40'} border ${isAuto ? 'border-emerald-200 dark:border-emerald-800' : isScheduled ? 'border-purple-200 dark:border-purple-800' : 'border-amber-200 dark:border-amber-800'}`}>
              <Text style={[tw`text-[9px] uppercase ${isAuto ? 'text-emerald-700 dark:text-emerald-400' : isScheduled ? 'text-purple-700 dark:text-purple-400' : 'text-amber-700 dark:text-amber-400'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1 }]}>
                {isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3 Circular Control Icons Overlapping the Arch Bottom */}
      {!readOnly && (
        <View style={tw`flex-row justify-center gap-5 w-full z-20 relative -mt-6`}>
          {[
            { icon: 'fan', active: fansActive, key: 'fans' },
            { icon: 'water', active: misterActive, key: 'misters' },
            { icon: 'lightbulb-on', active: lightActive, key: 'lights' }
          ].map((item, index) => {
            const showActive = item.active;
            return (
            <TouchableOpacity 
              key={index} 
              disabled={isAuto || isScheduled}
              onPress={() => toggleDevice(item.key as 'fans' | 'misters' | 'lights' | 'co2', item.active)}
              style={tw`w-14 h-14 rounded-full items-center justify-center shadow-sm border ${
                showActive 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' 
                  : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
              } ${(isAuto || isScheduled) ? 'opacity-50' : ''}`}
            >
              <MaterialCommunityIcons 
                name={item.icon as any} 
                size={24} 
                color={showActive ? '#10b981' : (isDarkMode ? '#94a3b8' : '#64748b')} 
              />
            </TouchableOpacity>
          )})}
        </View>
      )}
    </View>
  );
}
