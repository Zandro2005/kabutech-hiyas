import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { showToast } from '../CustomToast';
import tw from '../../tailwind';
import ActionModal from '../ActionModal';
import { ref, push, set } from 'firebase/database';
import { db } from '../../services/firebase';

interface AddBatchModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddBatchModal({ visible, onClose }: AddBatchModalProps) {
  const [strain, setStrain] = useState('');
  const [expectedYield, setExpectedYield] = useState('');
  const yieldRef = React.useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!strain || !expectedYield) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please fill out all fields.' });
      return;
    }
    
    setLoading(true);
    try {
      const batchesRef = ref(db, 'kabutech/batches');
      const newBatchRef = push(batchesRef);
      await set(newBatchRef, {
        id: newBatchRef.key,
        strain,
        expected_yield: Number(expectedYield),
        status: 'growing',
        start_date: new Date().toISOString(),
      });
      setStrain('');
      setExpectedYield('');
      showToast({ type: 'success', text1: 'Success', text2: 'New batch added successfully!' });
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to add batch.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Add New Batch" iconName="sprout">
      <View style={tw`gap-4`}>
        <View>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Mushroom Strain</Text>
          <TextInput
            style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-semibold`}
            placeholder="e.g. Oyster, Shiitake"
            placeholderTextColor={tw.color('dark:text-slate-400') || "#9ca3af"}
            value={strain}
            onChangeText={setStrain}
            returnKeyType="next"
            onSubmitEditing={() => yieldRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>

        <View style={tw`mt-4`}>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Expected Yield (kg)</Text>
          <TextInput
            ref={yieldRef}
            style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-semibold`}
            placeholder="e.g. 50"
            placeholderTextColor={tw.color('dark:text-slate-400') || "#9ca3af"}
            keyboardType="numeric"
            value={expectedYield}
            onChangeText={setExpectedYield}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        <View style={tw`flex-row gap-3 mt-6`}>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={onClose}
            style={tw`flex-1 bg-gray-100 dark:bg-slate-700 rounded-xl py-3.5 items-center`}
          >
            <Text style={tw`text-gray-600 dark:text-slate-300 font-bold`}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={handleSave}
            disabled={loading}
            style={tw`flex-1 bg-green-600 dark:bg-emerald-600 rounded-xl py-3.5 items-center`}
          >
            <Text style={tw`text-white font-bold`}>{loading ? 'Saving...' : 'Start Batch'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
