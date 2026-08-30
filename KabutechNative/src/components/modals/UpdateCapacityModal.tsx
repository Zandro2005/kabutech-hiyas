import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { showToast } from '../CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import { SoundManager } from '../../utils/SoundManager';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BatchData } from '../../types/firebase';
import { getRackStats } from '../../utils/dataHelpers';

interface UpdateCapacityModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRack: BatchData | null;
}

export default function UpdateCapacityModal({ visible, onClose, selectedRack }: UpdateCapacityModalProps) {
  const [activeBags, setActiveBags] = useState('0');
  const [emptyBags, setEmptyBags] = useState('0');
  const emptyBagsRef = React.useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, _setErrorMsg] = useState('');
  const setErrorMsg = (msg: string) => {
    if (msg) SoundManager.playError();
    _setErrorMsg(msg);
  };

  useEffect(() => {
    if (visible && selectedRack) {
      const stats = getRackStats(selectedRack);
      setActiveBags(stats.activeBags.length.toString());
      setEmptyBags(stats.emptyBags.length.toString());
    } else {
      setActiveBags('0');
      setEmptyBags('0');
      setErrorMsg('');
    }
  }, [visible, selectedRack]);

  const totalCapacity = parseInt(activeBags || '0', 10) + parseInt(emptyBags || '0', 10);

  const handleSave = async () => {
    if (!selectedRack) {
      setErrorMsg('Please select a rack.');
      return;
    }

    const emptyTarget = parseInt(emptyBags || '0', 10);
    const activeTarget = parseInt(activeBags || '0', 10);
    
    if (isNaN(emptyTarget) || emptyTarget < 0 || isNaN(activeTarget) || activeTarget < 0) {
      setErrorMsg('Please enter valid positive numbers for capacity.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      const stats = getRackStats(selectedRack);
      let updatedBags = [...stats.bags];
      let highestId = updatedBags.reduce((max, b: any) => (b && b.id > max ? b.id : max), 0);
      let updatedHistorical = selectedRack.historicalHarvests ? (Array.isArray(selectedRack.historicalHarvests) ? [...selectedRack.historicalHarvests] : Object.values(selectedRack.historicalHarvests)) : [];

      // Handle Empty Bags
      if (emptyTarget > stats.emptyBags.length) {
        const diff = emptyTarget - stats.emptyBags.length;
        for (let i = 0; i < diff; i++) {
          highestId++;
          updatedBags.push({ id: highestId, status: 'Empty', harvestLog: [] });
        }
      } else if (emptyTarget < stats.emptyBags.length) {
        let diff = stats.emptyBags.length - emptyTarget;
        for (let i = updatedBags.length - 1; i >= 0 && diff > 0; i--) {
          if (updatedBags[i] && updatedBags[i].status === 'Empty') {
            updatedBags.splice(i, 1);
            diff--;
          }
        }
      }

      // Handle Active Bags
      if (activeTarget > stats.activeBags.length) {
        const diff = activeTarget - stats.activeBags.length;
        for (let i = 0; i < diff; i++) {
          highestId++;
          updatedBags.push({ id: highestId, status: 'Active', harvestLog: [] });
        }
      } else if (activeTarget < stats.activeBags.length) {
        let diff = stats.activeBags.length - activeTarget;
        for (let i = updatedBags.length - 1; i >= 0 && diff > 0; i--) {
          if (updatedBags[i] && updatedBags[i].status !== 'Empty') {
            const removed = updatedBags.splice(i, 1)[0];
            diff--;
            if (removed && removed.harvestLog) {
              const logs = Array.isArray(removed.harvestLog) ? removed.harvestLog : Object.values(removed.harvestLog);
              logs.forEach((l: any) => {
                if (l) updatedHistorical.push(l);
              });
            }
          }
        }
      }

      if (selectedRack.firebaseKey === undefined) throw new Error("Rack not found");

      await update(ref(db, `kabutech/batches/${selectedRack.firebaseKey}`), {
        bags: updatedBags,
        historicalHarvests: updatedHistorical
      });
      SoundManager.playSuccess();
      showToast({ type: 'success', text1: 'Success', text2: `Capacity updated. Total: ${updatedBags.length}` });
      onClose();
    } catch (error) {
      setErrorMsg('An unexpected error occurred.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Update Capacity" iconName="plus-minus-variant">
      <View style={tw`gap-4`}>
        {/* Capacity Inputs */}
        <View style={tw`flex-row gap-3 mt-4 z-10`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>ACTIVE BAGS</Text>
            <TextInput
              style={tw`bg-[#f4fbf7] dark:bg-slate-700 border border-green-100 dark:border-slate-600 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-semibold`}
              keyboardType="numeric"
              value={activeBags}
              onChangeText={setActiveBags}
              returnKeyType="next"
              onSubmitEditing={() => emptyBagsRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>EMPTY BAGS</Text>
            <TextInput
              ref={emptyBagsRef}
              style={tw`bg-[#f4fbf7] dark:bg-slate-700 border border-green-100 dark:border-slate-600 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-semibold`}
              keyboardType="numeric"
              value={emptyBags}
              onChangeText={setEmptyBags}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </View>

        <View style={tw`flex-row justify-between items-center mt-2 z-10`}>
          <Text style={tw`text-[11px] font-bold text-gray-600 uppercase tracking-wider`}>TOTAL SLOT CAPACITY:</Text>
          <Text style={[tw`text-[15px] text-[#032514] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{totalCapacity}</Text>
        </View>

        {errorMsg ? (
          <Text style={tw`text-red-500 text-center mt-2 text-xs font-bold z-10`}>{errorMsg}</Text>
        ) : null}

        {/* Actions */}
        <View style={tw`mt-4 z-10`} pointerEvents="box-none">
          <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
            onPress={handleSave}
            disabled={loading}
            style={tw`w-full bg-[#032514] dark:bg-emerald-600 rounded-xl py-3.5 items-center`}
          >
            <Text style={[tw`text-white text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              {loading ? 'Saving...' : 'Save Capacity'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
