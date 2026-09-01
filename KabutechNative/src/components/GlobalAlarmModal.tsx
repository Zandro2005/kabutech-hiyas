import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Vibration, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SoundManager } from '../utils/SoundManager';
import tw from '../tailwind';

export default function GlobalAlarmModal() {
  const [alarmData, setAlarmData] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('showAlarmModal', (data) => {
      setAlarmData(data);
    });
    return () => sub.remove();
  }, []);

  const stopAlarm = () => {
    Vibration.cancel();
    SoundManager.stopAlarm();
    setAlarmData(null);
  };

  return (
    <Modal visible={!!alarmData} transparent={true} animationType="fade">
      <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
        <View style={tw`bg-white dark:bg-slate-900 rounded-[28px] p-6 w-full max-w-[320px] items-center shadow-2xl border border-slate-100 dark:border-slate-800`}>
          <View style={tw`w-14 h-14 bg-blue-100 dark:bg-blue-500/20 rounded-full items-center justify-center mb-4`}>
            <MaterialCommunityIcons name="bell-ring-outline" size={28} color="#3b82f6" />
          </View>
          <Text style={[tw`text-[19px] text-slate-800 dark:text-white text-center mb-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            {alarmData?.title}
          </Text>
          <Text style={[tw`text-[13px] text-slate-500 dark:text-slate-400 text-center mb-6 leading-5`, {fontFamily: 'PlusJakartaSans_500Medium'}]}>
            {alarmData?.message}
          </Text>
          <TouchableOpacity onPress={stopAlarm} style={tw`w-full py-3.5 rounded-[16px] bg-blue-500 items-center justify-center shadow-lg active:opacity-80`}>
            <Text style={[tw`text-white text-[14px] tracking-wide`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Stop Alarm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
