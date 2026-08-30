import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { showToast } from '../CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SoundManager } from '../../utils/SoundManager';

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
  const [errorMsg, _setErrorMsg] = useState('');
  const setErrorMsg = (msg: string) => {
    if (msg) SoundManager.playError();
    _setErrorMsg(msg);
  };

  useEffect(() => {
    if (!visible) {
      setBagsToFlag('');
      setErrorMsg('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!selectedRack || !bagsToFlag) {
      setErrorMsg('Please fill out all fields.');
      return;
    }

    const flagCount = parseInt(bagsToFlag, 10);
    if (isNaN(flagCount) || flagCount <= 0) {
      setErrorMsg('Please enter a valid number of bags.');
      return;
    }

    const stats = getRackStats(selectedRack);
    const currentBags = stats.bags;
    const activeBagIndices = currentBags.map((b, index) => ({ bag: b, index })).filter(item => item.bag.status === 'Active');
    
    if (activeBagIndices.length < flagCount) {
      setErrorMsg(`Cannot flag ${flagCount} bags. Only ${activeBagIndices.length} active bags available.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
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
      setErrorMsg('An unexpected error occurred.');
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
            style={tw`bg-[#fff5f5] dark:bg-slate-700 border border-red-100 dark:border-slate-600 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-semibold`}
            placeholder="e.g. 2"
            placeholderTextColor={tw.color('dark:text-slate-400') || "#fca5a5"}
            keyboardType="numeric"
            value={bagsToFlag}
            onChangeText={setBagsToFlag}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        {errorMsg ? (
          <Text style={tw`text-red-500 text-center mt-2 text-xs font-bold z-10`}>{errorMsg}</Text>
        ) : null}

        {/* Actions */}
        <View style={tw`mt-4 z-10`} pointerEvents="box-none">
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={handleSave}
            disabled={loading}
            style={tw`w-full bg-[#dc2626] dark:bg-red-600 rounded-xl py-3.5 items-center`}
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
