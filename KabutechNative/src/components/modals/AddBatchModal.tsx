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
            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold`}
            placeholder="e.g. Oyster, Shiitake"
            placeholderTextColor="#9ca3af"
            value={strain}
            onChangeText={setStrain}
          />
        </View>

        <View style={tw`mt-4`}>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Expected Yield (kg)</Text>
          <TextInput
            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold`}
            placeholder="e.g. 50"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={expectedYield}
            onChangeText={setExpectedYield}
          />
        </View>

        <View style={tw`flex-row gap-3 mt-6`}>
          <TouchableOpacity 
            onPress={onClose}
            style={tw`flex-1 bg-gray-100 rounded-xl py-3.5 items-center`}
          >
            <Text style={tw`text-gray-600 font-bold`}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={tw`flex-1 bg-green-600 rounded-xl py-3.5 items-center`}
          >
            <Text style={tw`text-white font-bold`}>{loading ? 'Saving...' : 'Start Batch'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
