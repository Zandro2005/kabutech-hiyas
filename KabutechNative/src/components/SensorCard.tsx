import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';

interface SensorCardProps {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  min?: number;
  max?: number;
  gradientColors: [string, string];
}

export default function SensorCard({ 
  title, 
  value, 
  unit, 
  icon,
  color,
  min = 0, 
  max = 100,
}: SensorCardProps) {
  // Clamp value
  const clampedValue = Math.min(Math.max(value, min), max);
  // Calculate percentage (0 to 100)
  const percentage = Math.round(((clampedValue - min) / (max - min)) * 100);

  return (
    <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex-1 min-w-[45%] mx-1 mb-2`}>
      
      {/* Top Row: Icon and Status Badge */}
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: `${color}1A` }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        </View>
        
        <View style={tw`bg-gray-50 dark:bg-slate-700/50 px-2 py-1 rounded-full border border-gray-100 dark:border-slate-600 flex-row items-center gap-1.5`}>
          <View style={[tw`w-1.5 h-1.5 rounded-full`, { backgroundColor: color }]} />
          <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {percentage}%
          </Text>
        </View>
      </View>

      {/* Middle Row: Value & Title */}
      <View style={tw`mb-4`}>
        <View style={tw`flex-row items-baseline gap-0.5 mb-0.5`}>
          <Text style={[tw`text-3xl text-gray-800 dark:text-slate-100 tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {value}
          </Text>
          <Text style={[tw`text-xs text-gray-400 dark:text-slate-500 font-bold mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            {unit}
          </Text>
        </View>
        <Text style={[tw`text-xs text-gray-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
          {title}
        </Text>
      </View>

      {/* Bottom Row: Minimal Linear Progress Bar */}
      <View style={tw`w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <View style={[tw`h-full rounded-full`, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      
    </View>
  );
}
