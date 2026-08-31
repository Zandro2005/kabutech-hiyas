import React from 'react';
import { View, ScrollView } from 'react-native';
import tw from '../../tailwind';
import { Skeleton } from '../Skeleton';

export default function TasksScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={tw`p-5 pb-36`} showsVerticalScrollIndicator={false}>
      {/* Top Filter Buttons */}
      <View style={tw`flex-row gap-3 mb-6`}>
        <Skeleton width="48%" height={44} borderRadius={16} />
        <Skeleton width="48%" height={44} borderRadius={16} />
      </View>

      {/* Task Item Cards */}
      {[0, 1, 2, 3].map((idx) => (
        <View
          key={idx}
          style={tw`bg-white dark:bg-slate-800 rounded-[20px] p-4 mb-3 border border-gray-100 dark:border-slate-700 shadow-sm gap-3`}
        >
          {/* Header row: title & priority badge */}
          <View style={tw`flex-row justify-between items-center`}>
            <Skeleton width="55%" height={16} borderRadius={4} />
            <Skeleton width={60} height={20} borderRadius={10} />
          </View>

          {/* Description line */}
          <Skeleton width="85%" height={12} borderRadius={4} />

          {/* Due date & Action buttons footer */}
          <View style={tw`flex-row justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700`}>
            <Skeleton width={90} height={14} borderRadius={4} />
            <Skeleton width={110} height={32} borderRadius={12} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
