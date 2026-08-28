import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { showToast } from '../CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BatchData } from '../../types/firebase';
import { getRackStats } from '../../utils/dataHelpers';

interface FlagContaminationModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRack: BatchData | null;
}

export default function FlagContaminationModal({ visible, onClose, selectedRack }: FlagContaminationModalProps) {
  const [bagsToFlag, setBagsToFlag] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBagsToFlag('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!selectedRack || !bagsToFlag) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please fill out all fields.' });
      return;
    }

    const flagCount = parseInt(bagsToFlag, 10);
    if (isNaN(flagCount) || flagCount <= 0) {
      showToast({ type: 'error', text1: 'Error', text2: 'Please enter a valid number of bags.' });
      return;
    }

    const stats = getRackStats(selectedRack);
    const currentBags = stats.bags;
    const activeBagIndices = currentBags.map((b, index) => ({ bag: b, index })).filter(item => item.bag.status === 'Active');
    
    if (activeBagIndices.length < flagCount) {
      showToast({ type: 'error', text1: 'Error', text2: `Cannot flag ${flagCount} bags. Only ${activeBagIndices.length} active bags available.` });
      return;
    }

    setLoading(true);
    try {
      let updatedBags = [...currentBags];
      
      // Flag the first N active bags
      for (let i = 0; i < flagCount; i++) {
        const targetIndex = activeBagIndices[i].index;
        updatedBags[targetIndex] = { ...updatedBags[targetIndex], status: 'Contaminated' };
      }

      if (selectedRack.firebaseKey === undefined) throw new Error("Rack not found");

      await update(ref(db, `kabutech/batches/${selectedRack.firebaseKey}`), {
        bags: updatedBags
      });

      showToast({ type: 'success', text1: 'Success', text2: `Flagged ${flagCount} bags for contamination.` });
      
      setBagsToFlag('');
      onClose();
    } catch (error) {
      showToast({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Flag Contamination" iconName="microscope">
      <View style={tw`gap-4`}>
        {/* Bags To Flag */}
        <View style={tw`z-10 mt-4`}>
          <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>BAGS TO FLAG</Text>
          <TextInput
            style={tw`bg-[#fff5f5] border border-red-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
            placeholder="e.g. 2"
            placeholderTextColor="#fca5a5"
            keyboardType="numeric"
            value={bagsToFlag}
            onChangeText={setBagsToFlag}
          />
        </View>

        {/* Actions */}
        <View style={tw`mt-6 z-10`}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={tw`w-full bg-[#dc2626] rounded-xl py-3.5 items-center`}
          >
            <Text style={[tw`text-white text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              {loading ? 'Saving...' : 'Flag Bags'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
