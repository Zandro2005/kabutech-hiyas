import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { showToast } from '../CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FlagContaminationModalProps {
  visible: boolean;
  onClose: () => void;
  racks: any[];
  preselectedRackId?: string | number | null;
}

export default function FlagContaminationModal({ visible, onClose, racks, preselectedRackId }: FlagContaminationModalProps) {
  const [selectedRackId, setSelectedRackId] = useState<string | number | null>(preselectedRackId || null);
  const [bagsToFlag, setBagsToFlag] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (visible && preselectedRackId !== undefined) {
      setSelectedRackId(preselectedRackId);
    }
  }, [visible, preselectedRackId]);

  const selectedRack = racks.find(r => r.id === selectedRackId);

  const handleSave = async () => {
    if (!selectedRackId || !bagsToFlag) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please fill out all fields.' });
      return;
    }
    
    if (!selectedRack || !selectedRack.bags) {
      showToast({ type: 'error', text1: 'Error', text2: 'Selected rack has no bags.' });
      return;
    }

    const flagCount = parseInt(bagsToFlag, 10);
    if (isNaN(flagCount) || flagCount <= 0) {
      showToast({ type: 'error', text1: 'Error', text2: 'Please enter a valid number of bags.' });
      return;
    }

    const currentBags = Array.isArray(selectedRack.bags) ? [...selectedRack.bags] : Object.values(selectedRack.bags);
    const activeBagIndices = currentBags.map((b: any, index: number) => ({ bag: b, index })).filter((item: any) => item.bag && item.bag.status === 'Active');
    
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

      if (!selectedRack || selectedRack.firebaseKey === undefined) throw new Error("Rack not found");

      update(ref(db, `kabutech/batches/${selectedRack.firebaseKey}`), {
        bags: updatedBags
      }).catch(error => {
        showToast({ type: 'error', text1: 'Error', text2: 'Failed to flag bags.' });
        console.error(error);
      });

      setBagsToFlag('');
      setSelectedRackId(null);
      onClose();
      setTimeout(() => {
        showToast({ type: 'success', text1: 'Success', text2: `Flagged ${flagCount} bags for contamination.` });
      }, 600);
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
        {/* Rack Dropdown */}
        {!preselectedRackId && (
          <View style={tw`z-50`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>SELECT RACK</Text>
            <TouchableOpacity 
              onPress={() => setShowDropdown(!showDropdown)}
              style={tw`bg-[#fff5f5] border border-red-100 rounded-xl px-4 py-3.5 flex-row justify-between items-center`}
            >
              <Text style={tw`text-gray-800 ${selectedRack ? 'font-bold' : ''}`}>
                {selectedRack ? selectedRack.rack : 'Select a Rack'}
              </Text>
              <MaterialCommunityIcons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#dc2626" />
            </TouchableOpacity>
            
            {showDropdown && (
              <View style={tw`absolute top-16 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-hidden z-50`}>
                <ScrollView nestedScrollEnabled>
                  {racks.filter(r => !r.archived).map((r, idx) => (
                    <TouchableOpacity
                      key={r.id || idx}
                      style={tw`px-4 py-3 border-b border-gray-50 flex-row justify-between`}
                      onPress={() => {
                        setSelectedRackId(r.id);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={tw`text-gray-800 font-semibold`}>{r.rack}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

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
