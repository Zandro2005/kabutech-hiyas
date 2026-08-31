import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function ProfileScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`pb-36 pt-4 px-6`} showsVerticalScrollIndicator={false}>
      {/* Profile Card Header */}
      <View style={tw`bg-white dark:bg-slate-900 rounded-[28px] p-6 items-center shadow-sm border border-slate-100 dark:border-slate-800/80 mb-6 gap-3`}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={140} height={20} borderRadius={6} />
        <Skeleton width={180} height={12} borderRadius={4} />
        <Skeleton width={72} height={24} borderRadius={12} style={tw`mt-1`} />
      </View>

      {/* Farm Stats Summary Box */}
      <View style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-800/80 mb-6`}>
        <Skeleton width={120} height={16} borderRadius={4} style={tw`mb-4`} />
        <View style={tw`flex-row justify-between`}>
          <View style={tw`items-center gap-1.5`}>
            <Skeleton width={32} height={24} borderRadius={6} />
            <Skeleton width={60} height={10} borderRadius={3} />
          </View>
          <View style={tw`items-center gap-1.5`}>
            <Skeleton width={32} height={24} borderRadius={6} />
            <Skeleton width={60} height={10} borderRadius={3} />
          </View>
          <View style={tw`items-center gap-1.5`}>
            <Skeleton width={32} height={24} borderRadius={6} />
            <Skeleton width={60} height={10} borderRadius={3} />
          </View>
        </View>
      </View>

      {/* Action Items List */}
      <View style={tw`bg-white dark:bg-slate-900 rounded-[24px] p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 gap-3`}>
        {[0, 1, 2, 3].map((idx) => (
          <View key={idx} style={tw`flex-row justify-between items-center py-2`}>
            <View style={tw`flex-row items-center gap-3`}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <Skeleton width={120} height={14} borderRadius={4} />
            </View>
            <Skeleton width={16} height={16} borderRadius={8} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
