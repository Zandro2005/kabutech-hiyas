import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreenSkeleton() {
  const { isDarkMode } = useTheme();

  return (
    <ScrollView
      style={tw`bg-[#f0f9f4] dark:bg-[#020617]`}
      contentContainerStyle={tw`pb-36`}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Chamber Status Hero Skeleton */}
      <View style={tw`px-5 sm:px-6 pt-2 pb-1`}>
        {/* Top Row: Greetings & Mode Pill */}
        <View style={tw`w-full flex-row justify-between items-center mb-4`}>
          <View style={tw`gap-1.5 flex-1 mr-2`}>
            <Skeleton width={140} height={22} borderRadius={6} />
            <Skeleton width={150} height={14} borderRadius={4} />
          </View>
          <Skeleton width={88} height={28} borderRadius={14} />
        </View>

        {/* Center: 4-Segment Halo Ring Skeleton */}
        <View style={tw`items-center justify-center my-2`}>
          <Skeleton width={220} height={220} borderRadius={110} />
          <View style={tw`mt-3 items-center gap-1.5`}>
            <Skeleton width={180} height={14} borderRadius={6} />
            <Skeleton width={130} height={11} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* 2. Critical Alert Banner Skeleton (Moved up below hero) */}
      <View style={tw`px-6 pt-2`}>
        <View
          style={tw`bg-white dark:bg-slate-900 rounded-[20px] p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex-row items-center gap-3`}
        >
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={tw`flex-1 gap-1.5`}>
            <Skeleton width="50%" height={14} borderRadius={4} />
            <Skeleton width="75%" height={11} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* 3. Environment Metrics Grid (2x2) */}
      <View style={tw`px-6 pt-4`}>
        {/* Section Header */}
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`w-2 h-4.5 rounded-full bg-emerald-500/50`} />
            <Skeleton width={150} height={20} borderRadius={6} />
          </View>
          <Skeleton width={56} height={14} borderRadius={4} />
        </View>

        {/* 2x2 Grid */}
        <View style={tw`flex-row flex-wrap justify-between gap-y-3.5`}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                tw`bg-white dark:bg-slate-900 rounded-[26px] p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm justify-between`,
                { width: '48.5%', minHeight: 154 },
              ]}
            >
              {/* Top: Icon chip + Status badge */}
              <View style={tw`flex-row justify-between items-center mb-2.5`}>
                <Skeleton width={36} height={36} borderRadius={14} />
                <Skeleton width={56} height={20} borderRadius={10} />
              </View>

              {/* Middle: Label & Hero Stat */}
              <View style={tw`gap-1.5`}>
                <Skeleton width={68} height={10} borderRadius={4} />
                <Skeleton width={80} height={28} borderRadius={6} />
              </View>

              {/* Bottom: Progress Bar */}
              <Skeleton width="100%" height={6} borderRadius={3} style={tw`mt-2.5`} />
            </View>
          ))}
        </View>
      </View>

      {/* 4. Water Level Card Skeleton */}
      <View style={tw`px-6 pt-5`}>
        <View
          style={[
            tw`bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex-row items-center gap-4`,
          ]}
        >
          <Skeleton width={80} height={130} borderRadius={18} />
          <View style={tw`flex-1 gap-2.5`}>
            <Skeleton width={110} height={14} borderRadius={4} />
            <Skeleton width={80} height={36} borderRadius={8} />
            <Skeleton width="100%" height={24} borderRadius={8} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
