import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';

interface Props {
  localTarget: number;
  activeTabData: {
    min: number;
    max: number;
    color: string;
    unit: string;
    optimal: string;
  };
  isDarkMode: boolean;
}

export default function CircularSlider({ localTarget, activeTabData, isDarkMode }: Props) {
  const size = 260;
  const radius = 110;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  // Progress ratio limited between 0 and 1
  const progress = Math.max(0, Math.min(1, (localTarget - activeTabData.min) / (activeTabData.max - activeTabData.min)));
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <View style={tw`items-center justify-center relative mb-12`}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <Circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke={isDarkMode ? '#334155' : '#e2e8f0'} 
          strokeWidth={strokeWidth} 
          fill="none" 
        />
        {/* Progress Track */}
        <Circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke={activeTabData.color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
          fill="none" 
          transform={`rotate(-90 ${size/2} ${size/2})`} 
        />
      </Svg>

      {/* Central Values */}
      <View style={[tw`absolute items-center justify-center`, {width: size, height: size}]}>
        <View style={tw`flex-row items-start`}>
          <Text style={[tw`text-5xl text-slate-800 dark:text-white tracking-tighter`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            {localTarget}
          </Text>
          <Text style={[tw`text-lg text-slate-500 dark:text-slate-400 mt-2 ml-1`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
            {activeTabData.unit}
          </Text>
        </View>
        <View style={tw`bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full mt-2 flex-row items-center gap-1.5`}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={12} color={activeTabData.color} />
          <Text style={[tw`text-xs text-slate-600 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
            Optimal: {activeTabData.optimal} {activeTabData.unit}
          </Text>
        </View>
      </View>
    </View>
  );
}
