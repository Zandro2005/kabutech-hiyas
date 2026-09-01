import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';
import { useAuth } from '../context/AuthContext';
import { hapticMedium } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

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

export default React.memo(function ScoreArch({
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
  const { width, isSmallDevice, isLargeDevice } = useResponsive();
  
  const archDiameter = width * 1.5;
  const archContainerHeight = isSmallDevice ? 315 : isLargeDevice ? 350 : 335;
  const scoreFontSize = isSmallDevice ? 54 : isLargeDevice ? 72 : 64;
  const scoreSubSize = isSmallDevice ? 30 : isLargeDevice ? 40 : 36;

  return (
    <View style={tw`w-full items-center relative z-0`}>
      {/* Background block to seamlessly blend with the dashboard nav bar */}
      <View style={tw`absolute top-0 left-0 right-0 h-1/2 bg-[#dcfce7] dark:bg-[#020617]`} />
      
      <View style={{ width: archDiameter, height: archContainerHeight, overflow: 'hidden', alignItems: 'center' }}>
        <LinearGradient
          colors={isDarkMode ? ['#020617', '#020617'] : ['#dcfce7', '#f0f9f4']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[tw`absolute bottom-0`, { width: archDiameter, height: archDiameter, borderRadius: archDiameter / 2 }]}
        />
        
        {/* Top Header - "Hi, Admin" */}
        <View style={[tw`flex-row justify-between items-center px-6 pt-5 sm:pt-6 pb-2 z-10`, { width: width }]}>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            style={tw`flex-row items-center gap-3 flex-1 mr-2`} 
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <View style={tw`w-11 h-11 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden items-center justify-center border-2 border-white shadow-sm shrink-0`}>
              <Text style={[tw`text-xl sm:text-2xl`, {color: getAvatarColor(profile?.name || 'User'), fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={tw`flex-1`}>
              <Text numberOfLines={1} style={[tw`text-base sm:text-lg text-slate-800 dark:text-white tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                Hi, {profile?.name ? profile.name.split(' ')[0] : 'User'}
              </Text>
              <Text numberOfLines={1} style={[tw`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                Welcome Back!!
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Live Pill */}
          <View style={tw`border border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-slate-800/40 rounded-full px-3 py-1.5 flex-row items-center gap-1.5 sm:gap-2 shadow-sm shrink-0`}>
            <View style={tw`w-2 h-2 rounded-full bg-emerald-500`} />
            <Text style={[tw`text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Live Sim</Text>
          </View>
        </View>

        {/* Score Content inside the arch */}
        <View style={tw`items-center px-4 mt-6 sm:mt-8 z-10`}>
          <Text style={[tw`text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 tracking-widest mb-0.5 uppercase`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Environment Score</Text>
          <View style={tw`flex-row items-baseline mb-1`}>
            <Text style={[tw`text-slate-900 dark:text-white`, { fontSize: scoreFontSize, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: scoreFontSize + 4, letterSpacing: -1.5 }]}>{envScore}</Text>
            <Text style={[tw`text-slate-900 dark:text-white`, { fontSize: scoreSubSize, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 }]}>/10</Text>
          </View>

          {/* Progress Bar */}
          <View style={[tw`h-3 bg-emerald-200/50 dark:bg-slate-700 rounded-full flex-row overflow-hidden mb-2`, isSmallDevice ? tw`w-48` : isLargeDevice ? tw`w-64` : tw`w-56`]}>
            <View style={[tw`h-full bg-emerald-500 rounded-full`, { width: `${parseFloat(envScore) * 10}%` }]} />
          </View>

          <Text style={[tw`text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-center`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Overall conditions are optimal</Text>
          <View style={tw`flex-row items-center gap-2 mt-1`}>
            <Text style={[tw`text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>▲ +6% VS last Week</Text>
            
            {/* Auto/Manual/Scheduled Mode Indicator */}
            <View style={tw`px-2 py-0.5 rounded-md ${isAuto ? 'bg-emerald-100 dark:bg-emerald-900/40' : isScheduled ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-amber-100 dark:bg-amber-900/40'} border ${isAuto ? 'border-emerald-200 dark:border-emerald-800' : isScheduled ? 'border-purple-200 dark:border-purple-800' : 'border-amber-200 dark:border-amber-800'}`}>
              <Text style={[tw`text-[9px] uppercase ${isAuto ? 'text-emerald-700 dark:text-emerald-400' : isScheduled ? 'text-purple-700 dark:text-purple-400' : 'text-amber-700 dark:text-amber-400'}`, { fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1 }]}>
                {isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3 Circular Control Icons Overlapping Closer to the Arch Bottom */}
      {!readOnly && (
        <View style={tw`flex-row justify-center gap-4 sm:gap-5 w-full z-20 relative -mt-11 sm:-mt-13 px-4`}>
          {[
            { icon: 'fan', active: fansActive, key: 'fans' },
            { icon: 'water', active: misterActive, key: 'misters' },
            { icon: 'lightbulb-on', active: lightActive, key: 'lights' }
          ].map((item, index) => {
            const showActive = item.active;
            return (
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              key={index} 
              disabled={isAuto || isScheduled}
              onPress={() => {
                hapticMedium();
                toggleDevice(item.key as 'fans' | 'misters' | 'lights' | 'co2', item.active);
              }}
              style={tw`w-13 h-13 sm:w-14 sm:h-14 rounded-full items-center justify-center shadow-sm border ${
                showActive 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' 
                  : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
              } ${(isAuto || isScheduled) ? 'opacity-50' : ''}`}
            >
              <MaterialCommunityIcons 
                name={item.icon as any} 
                size={22} 
                color={showActive ? '#10b981' : (isDarkMode ? '#94a3b8' : '#64748b')} 
              />
            </TouchableOpacity>
          )})}
        </View>
      )}
    </View>
  );
});
