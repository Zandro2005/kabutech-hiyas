import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function AnalyticsScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`pb-36 pt-2`} showsVerticalScrollIndicator={false}>
      {/* Parameter Selector Horizontal Tabs */}
      <View style={tw`mb-4`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-5 gap-2.5`}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={tw`px-3.5 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center gap-2.5 shadow-sm`}
            >
              <Skeleton width={32} height={32} borderRadius={12} />
              <View style={tw`gap-1`}>
                <Skeleton width={50} height={10} borderRadius={3} />
                <Skeleton width={44} height={14} borderRadius={4} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Main Interactive Chart Card */}
      <View style={tw`mx-5 bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm mb-5 gap-4`}>
        {/* Card Header: Live Value + Timeframe Selector */}
        <View style={tw`flex-row justify-between items-start`}>
          <View style={tw`gap-1.5`}>
            <Skeleton width={90} height={12} borderRadius={4} />
            <Skeleton width={130} height={32} borderRadius={8} />
          </View>

          {/* Time range pills (24H, 7D, 30D) */}
          <View style={tw`flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1`}>
            <Skeleton width={36} height={28} borderRadius={8} />
            <Skeleton width={36} height={28} borderRadius={8} />
            <Skeleton width={36} height={28} borderRadius={8} />
          </View>
        </View>

        {/* Chart Canvas Placeholder */}
        <Skeleton width="100%" height={175} borderRadius={16} />

        {/* Min / Max / Avg stats footer */}
        <View style={tw`flex-row justify-between pt-3 border-t border-slate-100 dark:border-slate-800`}>
          <Skeleton width={70} height={24} borderRadius={6} />
          <Skeleton width={70} height={24} borderRadius={6} />
          <Skeleton width={70} height={24} borderRadius={6} />
        </View>
      </View>

      {/* Environmental Insights Card */}
      <View style={tw`mx-5 bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm gap-3`}>
        <Skeleton width={140} height={16} borderRadius={4} />
        <Skeleton width="100%" height={12} borderRadius={4} />
        <Skeleton width="85%" height={12} borderRadius={4} />
      </View>
    </ScrollView>
  );
}
