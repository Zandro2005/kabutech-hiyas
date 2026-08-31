import React from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function HomeScreenSkeleton() {
  const { isDarkMode } = useTheme();

  return (
    <ScrollView
      style={tw`bg-[#f0f9f4] dark:bg-[#020617]`}
      contentContainerStyle={tw`pb-36`}
      showsVerticalScrollIndicator={false}
    >
      {/* Arch Header Section Skeleton */}
      <View style={tw`w-full items-center relative overflow-hidden pb-6`}>
        {/* Curved Header Background Container */}
        <View
          style={[
            tw`w-full bg-[#dcfce7] dark:bg-[#0f172a] rounded-b-[40px] px-6 pt-4 pb-8 items-center`,
            { minHeight: 280 },
          ]}
        >
          {/* Top Row: User Avatar + Name & Live Pill */}
          <View style={tw`w-full flex-row justify-between items-center mb-6`}>
            <View style={tw`flex-row items-center gap-3`}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <View style={tw`gap-1.5`}>
                <Skeleton width={110} height={16} borderRadius={6} />
                <Skeleton width={80} height={12} borderRadius={4} />
              </View>
            </View>
            <Skeleton width={76} height={28} borderRadius={14} />
          </View>

          {/* Center: Environment Score Gauge */}
          <View style={tw`items-center gap-2.5`}>
            <Skeleton width={120} height={12} borderRadius={4} />
            <Skeleton width={130} height={44} borderRadius={10} />
            <Skeleton width={192} height={12} borderRadius={6} />
            <Skeleton width={160} height={12} borderRadius={4} />
            <Skeleton width={100} height={20} borderRadius={6} />
          </View>
        </View>

        {/* 3 Circular Action Buttons Overlapping Header */}
        <View style={tw`flex-row justify-center gap-5 w-full -mt-6 z-10`}>
          <Skeleton width={56} height={56} borderRadius={28} />
          <Skeleton width={56} height={56} borderRadius={28} />
          <Skeleton width={56} height={56} borderRadius={28} />
        </View>
      </View>

      {/* Environment Metrics Grid (2x2) */}
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
                tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm justify-between`,
                { width: '48%', minHeight: 140 },
              ]}
            >
              {/* Top: Icon chip + Status badge */}
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Skeleton width={32} height={32} borderRadius={12} />
                <Skeleton width={52} height={20} borderRadius={10} />
              </View>

              {/* Middle: Label & Hero Stat */}
              <View style={tw`gap-1.5`}>
                <Skeleton width={68} height={10} borderRadius={4} />
                <Skeleton width={80} height={24} borderRadius={6} />
              </View>

              {/* Bottom: Progress Bar */}
              <Skeleton width="100%" height={4} borderRadius={2} style={tw`mt-3`} />
            </View>
          ))}
        </View>
      </View>

      {/* Critical System Alerts Card Skeleton */}
      <View style={tw`px-6 pt-5`}>
        <View
          style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm`}
        >
          <View style={tw`flex-row items-center gap-3`}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={tw`flex-1 gap-1.5`}>
              <Skeleton width="60%" height={14} borderRadius={4} />
              <Skeleton width="85%" height={11} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>

      {/* Live Farm Card Skeleton */}
      <View style={tw`px-6 pt-5`}>
        <View
          style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm gap-3`}
        >
          <View style={tw`flex-row justify-between items-center`}>
            <Skeleton width={120} height={16} borderRadius={4} />
            <Skeleton width={60} height={22} borderRadius={11} />
          </View>
          <Skeleton width="100%" height={150} borderRadius={16} />
        </View>
      </View>
    </ScrollView>
  );
}
