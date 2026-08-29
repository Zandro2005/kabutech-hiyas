import React from 'react';
import { View, Text, Modal, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { useSensors, useSettings } from '../hooks/useFirebaseData';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { update, ref } from 'firebase/database';
import { db } from '../services/firebase';
import { showToast } from './CustomToast';

interface AiInsightModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AiInsightModal({ visible, onClose }: AiInsightModalProps) {
  const { isDarkMode } = useTheme();
  const sensors = useSensors();
  const settings = useSettings();
  const isAuto = String(settings?.setpoints?.mode).toLowerCase() === 'auto';

  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  
  const handleActivateMisters = async () => {
    try {
      await update(ref(db, `kabutech/settings/setpoints/devices`), {
        misters: true
      });
      showToast({ type: 'success', text1: 'AI Override: Misters activated!' });
      onClose();
      navigation.navigate('Controls' as never);
    } catch (err) {
      showToast({ type: 'error', text1: 'Error activating misters.' });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/60 justify-center items-center px-6`}>
        <View style={tw`w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl`}>
          
          {/* Header */}
          <View style={tw`bg-blue-500 px-6 py-5 flex-row items-center gap-3`}>
            <View style={tw`w-10 h-10 bg-white/20 rounded-full items-center justify-center`}>
              <MaterialCommunityIcons name="brain" size={24} color="white" />
            </View>
            <View>
              <Text style={[tw`text-white text-lg tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                AI Insight Analysis
              </Text>
              <Text style={[tw`text-blue-100 text-xs`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Predictive Environment Modeling
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={tw`p-6`}>
            <View style={tw`flex-row items-start gap-3 mb-6`}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#f59e0b" />
              <Text style={[tw`flex-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Based on historical temperature rises and current airflow, humidity levels are projecting a steep drop below the optimal 80% threshold within the next 2 hours.
              </Text>
            </View>

            {/* Data Points */}
            <View style={tw`bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-700`}>
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Current Drop Rate</Text>
                <Text style={[tw`text-sm text-red-500`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>-2.4% / hr</Text>
              </View>
              <View style={tw`w-full h-[1px] bg-slate-200 dark:bg-slate-700 mb-3`} />
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Expected in 2h</Text>
                <Text style={[tw`text-sm text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>73.2%</Text>
              </View>
              <View style={tw`w-full h-[1px] bg-slate-200 dark:bg-slate-700 mb-3`} />
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={[tw`text-xs text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Optimal Threshold</Text>
                <Text style={[tw`text-sm text-emerald-500`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>80.0%</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              onPress={handleActivateMisters}
              style={tw`w-full bg-blue-500 py-3.5 rounded-xl items-center justify-center flex-row gap-2 mb-3 shadow-sm`}
            >
              <MaterialCommunityIcons name="water" size={18} color="white" />
              <Text style={[tw`text-white text-sm tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Activate Misters Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onClose}
              style={tw`w-full bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center justify-center`}
            >
              <Text style={[tw`text-slate-600 dark:text-slate-400 text-sm`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
