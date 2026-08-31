import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function YieldScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-36`} showsVerticalScrollIndicator={false}>
      {/* Page Title & Filter Row */}
      <View style={tw`flex-row justify-between items-start mb-6`}>
        <View style={tw`gap-1`}>
          <Skeleton width={140} height={20} borderRadius={6} />
          <Skeleton width={200} height={12} borderRadius={4} />
        </View>
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>

      {/* Hero Stats Card */}
      <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-5 gap-4`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`gap-1.5`}>
            <Skeleton width={80} height={12} borderRadius={4} />
            <Skeleton width={110} height={28} borderRadius={6} />
          </View>
          <Skeleton width={70} height={26} borderRadius={13} />
        </View>

        {/* Efficiency bar */}
        <Skeleton width="100%" height={8} borderRadius={4} />

        <View style={tw`flex-row justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700`}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={90} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Chart Period Selector Tabs */}
      <View style={tw`flex-row bg-white dark:bg-slate-800 rounded-2xl p-1 mb-5 border border-gray-100 dark:border-slate-700 justify-between`}>
        <Skeleton width="31%" height={36} borderRadius={12} />
        <Skeleton width="31%" height={36} borderRadius={12} />
        <Skeleton width="31%" height={36} borderRadius={12} />
      </View>

      {/* Chart Card */}
      <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-6 gap-3`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Skeleton width={120} height={16} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>
        {/* Mock Chart Area */}
        <Skeleton width="100%" height={180} borderRadius={16} />
      </View>

      {/* Daily Harvest List Section */}
      <View style={tw`gap-3`}>
        <Skeleton width={130} height={16} borderRadius={4} style={tw`mb-1`} />
        {[0, 1, 2].map((idx) => (
          <View
            key={idx}
            style={tw`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center gap-3`}>
              <Skeleton width={36} height={36} borderRadius={18} />
              <View style={tw`gap-1`}>
                <Skeleton width={90} height={14} borderRadius={4} />
                <Skeleton width={60} height={10} borderRadius={3} />
              </View>
            </View>
            <Skeleton width={70} height={18} borderRadius={6} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
