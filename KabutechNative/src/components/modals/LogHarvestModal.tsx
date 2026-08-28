import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { showToast } from '../CustomToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import { playSuccessSound } from '../../utils/SoundManager';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BatchData } from '../../types/firebase';
import { getRackStats } from '../../utils/dataHelpers';

interface LogHarvestModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRack: BatchData | null;
}

export default function LogHarvestModal({ visible, onClose, selectedRack }: LogHarvestModalProps) {
  const [yieldGrams, setYieldGrams] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setYieldGrams('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!selectedRack || !yieldGrams || !harvestDate) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please fill out all fields.' });
      return;
    }

    setLoading(true);
    try {
      const stats = getRackStats(selectedRack);
      const activeBags = stats.activeBags;
      
      if (activeBags.length === 0) {
        showToast({ type: 'error', text1: 'Error', text2: 'No active bags in this rack to harvest.' });
        setLoading(false);
        return;
      }

      const totalYield = parseFloat(yieldGrams);
      if (isNaN(totalYield) || totalYield <= 0) {
        showToast({ type: 'error', text1: 'Error', text2: 'Please enter a valid yield amount.' });
        setLoading(false);
        return;
      }

      // Distribute yield equally
      const yieldPerBag = Math.round((totalYield / activeBags.length) * 100) / 100;
      
      const updatedBags = stats.bags.map(b => {
        if (b.status === 'Active') {
          const hLogs = Array.isArray(b.harvestLog) ? [...b.harvestLog] : (b.harvestLog ? Object.values(b.harvestLog) : []);
          const localDateStr = `${harvestDate.getFullYear()}-${String(harvestDate.getMonth() + 1).padStart(2, '0')}-${String(harvestDate.getDate()).padStart(2, '0')}`;
          hLogs.push({ date: localDateStr, grams: yieldPerBag });
          return { ...b, harvestLog: hLogs };
        }
        return b;
      });

      if (selectedRack.firebaseKey === undefined) throw new Error("Rack not found");

      update(ref(db, `kabutech/batches/${selectedRack.firebaseKey}`), {
        bags: updatedBags
      }).catch(error => {
        showToast({ type: 'error', text1: 'Error', text2: 'Failed to log harvest.' });
        console.error(error);
      });

      setYieldGrams('');
      onClose();
      setTimeout(() => {
        playSuccessSound();
        showToast({ type: 'success', text1: 'Success', text2: `Logged ${totalYield}g harvest across ${activeBags.length} bags.` });
      }, 600);
    } catch (error) {
      showToast({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Log Harvest" iconName="leaf">
      <View style={tw`gap-4`}>
        {/* Yield */}
        <View style={tw`z-10 mt-4`}>
          <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>YIELD (GRAMS)</Text>
          <TextInput
            style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
            placeholder="e.g. 500"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={yieldGrams}
            onChangeText={setYieldGrams}
          />
        </View>

        {/* Date */}
        <View style={tw`z-10 mt-4`}>
          <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>HARVEST DATE</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={tw`flex-row items-center justify-between bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5`}
          >
            <Text style={tw`text-gray-900 font-semibold`}>
              {harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <MaterialCommunityIcons name="calendar" size={18} color="#166534" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={harvestDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setHarvestDate(selectedDate);
                }
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}
        </View>

        {/* Actions */}
        <View style={tw`mt-6 z-10`}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={tw`w-full bg-[#032514] rounded-xl py-3.5 items-center`}
          >
            <Text style={[tw`text-white text-[13px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              {loading ? 'Saving...' : 'Save Harvest'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
