import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function ControlsScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`pb-28 pt-2`} showsVerticalScrollIndicator={false}>
      {/* Horizontal Environmental Parameter Selector */}
      <View style={tw`mb-5`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-5 gap-2.5`}
        >
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={tw`px-3.5 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center gap-2.5 shadow-sm`}
            >
              <Skeleton width={32} height={32} borderRadius={12} />
              <View style={tw`gap-1`}>
                <Skeleton width={50} height={10} borderRadius={3} />
                <Skeleton width={42} height={14} borderRadius={4} />
              </View>
            </View>
          ))}
          <View
            style={tw`px-3.5 py-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex-row items-center gap-2`}
          >
            <Skeleton width={32} height={32} borderRadius={12} />
            <View style={tw`gap-1`}>
              <Skeleton width={40} height={10} borderRadius={3} />
              <Skeleton width={48} height={12} borderRadius={4} />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Central Dial Area Skeleton */}
      <View style={tw`items-center justify-center my-4 py-2`}>
        <View style={tw`w-[276px] h-[276px] items-center justify-center relative`}>
          {/* Outer dial ring placeholder */}
          <Skeleton width={276} height={276} borderRadius={138} />
          
          {/* Inner cut-out overlay */}
          <View style={tw`w-[220px] h-[220px] rounded-full bg-[#f0f9f4] dark:bg-[#020617] absolute items-center justify-center p-4 gap-2`}>
            <Skeleton width={70} height={11} borderRadius={4} />
            <Skeleton width={110} height={42} borderRadius={8} />
            <Skeleton width={90} height={14} borderRadius={4} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Precision Stepper & Mode Switcher Row */}
      <View style={tw`flex-row items-center justify-center px-5 mb-6 gap-3`}>
        {/* Decrement Button */}
        <Skeleton width={44} height={44} borderRadius={16} />

        {/* Mode Selector Pill */}
        <Skeleton width={220} height={44} borderRadius={16} />

        {/* Increment Button */}
        <Skeleton width={44} height={44} borderRadius={16} />
      </View>

      {/* Hardware Actuators Single Widget */}
      <View style={tw`px-5`}>
        {/* Header */}
        <View style={tw`flex-row justify-between items-center mb-2.5`}>
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`w-2 h-4 rounded-full bg-emerald-500/50`} />
            <Skeleton width={140} height={16} borderRadius={4} />
          </View>
          <Skeleton width={64} height={18} borderRadius={9} />
        </View>

        {/* Unified 4-in-1 Actuators Bar */}
        <View
          style={tw`bg-white dark:bg-slate-900 rounded-[24px] py-4 px-2 border border-slate-200/70 dark:border-slate-800 shadow-sm flex-row items-center justify-between`}
        >
          {[0, 1, 2, 3].map((idx) => (
            <View key={idx} style={tw`flex-1 items-center justify-center gap-2`}>
              <Skeleton width={28} height={28} borderRadius={8} />
              <Skeleton width={40} height={10} borderRadius={3} />
              <Skeleton width={32} height={12} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
