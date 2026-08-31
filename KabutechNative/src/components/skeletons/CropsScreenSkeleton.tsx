import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function CropsScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-36`} showsVerticalScrollIndicator={false}>
      {/* Page Title */}
      <View style={tw`mb-6`}>
        <Skeleton width={160} height={20} borderRadius={6} />
        <Skeleton width={230} height={12} borderRadius={4} style={tw`mt-2`} />
      </View>

      {/* Global Analytics Overview (Small Pills) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-5`} contentContainerStyle={tw`gap-3`}>
        {[0, 1, 2].map((idx) => (
          <View
            key={idx}
            style={tw`bg-white dark:bg-slate-800 rounded-[20px] px-4 py-3 flex-row items-center gap-3 border border-gray-100 dark:border-slate-700 shadow-sm`}
          >
            <Skeleton width={32} height={32} borderRadius={16} />
            <View style={tw`gap-1.5`}>
              <Skeleton width={60} height={10} borderRadius={3} />
              <Skeleton width={48} height={16} borderRadius={4} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ACTIVE RACKS SECTION HEADER */}
      <View style={tw`flex-row justify-between items-center mb-4 mt-2`}>
        <Skeleton width={110} height={16} borderRadius={4} />
        <Skeleton width={86} height={28} borderRadius={14} />
      </View>

      {/* RACK CARDS */}
      {[0, 1, 2].map((idx) => (
        <View
          key={idx}
          style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-4 overflow-hidden gap-3`}
        >
          {/* Rack Header */}
          <View style={tw`flex-row justify-between items-center`}>
            <Skeleton width={120} height={18} borderRadius={4} />
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>

          {/* Status Indicator */}
          <Skeleton width={80} height={18} borderRadius={6} />

          {/* Progress Bar */}
          <Skeleton width="100%" height={8} borderRadius={4} style={tw`my-1`} />

          {/* Stats Row */}
          <View style={tw`flex-row justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700`}>
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton width={70} height={14} borderRadius={4} />
            <Skeleton width={75} height={14} borderRadius={4} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
