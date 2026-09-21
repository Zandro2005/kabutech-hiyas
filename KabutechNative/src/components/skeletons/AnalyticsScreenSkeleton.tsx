import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function AnalyticsScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`pb-32 pt-2`} showsVerticalScrollIndicator={false}>
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

      {/* Main 24H Interactive Chart Card */}
      <View style={tw`mx-5 bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm mb-5 gap-4`}>
        {/* Card Header: Live Value + 24H Tag */}
        <View style={tw`flex-row justify-between items-start`}>
          <View style={tw`gap-1.5`}>
            <Skeleton width={90} height={12} borderRadius={4} />
            <Skeleton width={130} height={32} borderRadius={8} />
          </View>
          <Skeleton width={96} height={28} borderRadius={14} />
        </View>

        {/* Sparkline Canvas Placeholder */}
        <Skeleton width="100%" height={150} borderRadius={16} />

        {/* Scrubber stats footer */}
        <View style={tw`flex-row justify-between pt-3 border-t border-slate-100 dark:border-slate-800`}>
          <Skeleton width={120} height={20} borderRadius={6} />
          <Skeleton width={60} height={20} borderRadius={6} />
        </View>
      </View>

      {/* Time Range Selector Skeleton */}
      <View style={tw`mx-6 mb-3 flex-row items-center justify-between`}>
        <Skeleton width={110} height={14} borderRadius={4} />
        <View style={tw`flex-row bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl gap-1.5`}>
          <Skeleton width={38} height={24} borderRadius={10} />
          <Skeleton width={38} height={24} borderRadius={10} />
          <Skeleton width={38} height={24} borderRadius={10} />
        </View>
      </View>

      {/* Historical Trend Chart Skeleton */}
      <View style={tw`mx-5 bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm mb-5 gap-4`}>
        <View style={tw`flex-row justify-between items-start`}>
          <View style={tw`gap-1.5`}>
            <Skeleton width={100} height={12} borderRadius={4} />
            <Skeleton width={110} height={30} borderRadius={8} />
          </View>
          <View style={tw`items-end gap-1`}>
            <Skeleton width={60} height={10} borderRadius={3} />
            <Skeleton width={50} height={18} borderRadius={6} />
          </View>
        </View>
        <Skeleton width="100%" height={150} borderRadius={16} />
        <View style={tw`flex-row justify-between pt-3 border-t border-slate-100 dark:border-slate-800`}>
          <Skeleton width={110} height={14} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Minimal Important Info Card */}
      <View style={tw`mx-5 bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm mb-5 gap-3.5`}>
        <View style={tw`flex-row justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800`}>
          <Skeleton width={100} height={24} borderRadius={12} />
          <Skeleton width={90} height={16} borderRadius={4} />
        </View>
        <View style={tw`flex-row justify-between items-center pt-2`}>
          <Skeleton width={70} height={34} borderRadius={6} />
          <Skeleton width={70} height={34} borderRadius={6} />
          <Skeleton width={70} height={34} borderRadius={6} />
        </View>
        <View style={tw`pt-3 border-t border-slate-100 dark:border-slate-800 flex-row justify-between`}>
          <Skeleton width={130} height={14} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* AI Insights CTA Banner */}
      <View style={tw`mx-5 rounded-[20px] p-4 bg-emerald-500/30 flex-row items-center gap-2.5`}>
        <Skeleton width={32} height={32} borderRadius={10} />
        <View style={tw`gap-1 flex-1`}>
          <Skeleton width={120} height={14} borderRadius={4} />
          <Skeleton width="80%" height={10} borderRadius={3} />
        </View>
      </View>
    </ScrollView>
  );
}
