import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { showToast } from '../CustomToast';
import { ref, update } from 'firebase/database';
import { db } from '../../services/firebase';
import { playSuccessSound } from '../../utils/SoundManager';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface UpdateCapacityModalProps {
  visible: boolean;
  onClose: () => void;
  racks: any[];
  preselectedRackId?: number | null;
}

export default function UpdateCapacityModal({ visible, onClose, racks, preselectedRackId }: UpdateCapacityModalProps) {
  const [selectedRackId, setSelectedRackId] = useState<number | null>(preselectedRackId || null);
  const [activeBags, setActiveBags] = useState('0');
  const [emptyBags, setEmptyBags] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (visible && preselectedRackId !== undefined) {
      setSelectedRackId(preselectedRackId);
    }
  }, [visible, preselectedRackId]);

  const selectedRack = racks.find(r => r.id === selectedRackId);

  useEffect(() => {
    if (selectedRack && selectedRack.bags) {
      const bags = Array.isArray(selectedRack.bags) ? selectedRack.bags : Object.values(selectedRack.bags);
      const activeCount = bags.filter((b: any) => b && b.status !== 'Empty').length;
      const emptyCount = bags.filter((b: any) => b && b.status === 'Empty').length;
      setActiveBags(activeCount.toString());
      setEmptyBags(emptyCount.toString());
    } else {
      setActiveBags('0');
      setEmptyBags('0');
    }
  }, [selectedRackId, selectedRack]);

  const totalCapacity = parseInt(activeBags || '0', 10) + parseInt(emptyBags || '0', 10);

  const handleSave = async () => {
    if (!selectedRackId) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please select a rack.' });
      return;
    }

    if (!selectedRack) return;

    const emptyTarget = parseInt(emptyBags || '0', 10);
    const activeTarget = parseInt(activeBags || '0', 10);
    
    if (isNaN(emptyTarget) || emptyTarget < 0 || isNaN(activeTarget) || activeTarget < 0) {
      showToast({ type: 'error', text1: 'Error', text2: 'Please enter valid numbers for capacity.' });
      return;
    }
    
    setLoading(true);
    try {
      const currentBags = selectedRack.bags ? (Array.isArray(selectedRack.bags) ? [...selectedRack.bags] : Object.values(selectedRack.bags)) : [];
      let updatedBags = [...currentBags];
      const emptyTarget = parseInt(emptyBags || '0', 10);
      const activeTarget = parseInt(activeBags || '0', 10);
      const currentEmptyCount = updatedBags.filter((b: any) => b && b.status === 'Empty').length;
      const currentActiveCount = updatedBags.filter((b: any) => b && b.status !== 'Empty').length;
      
      let highestId = updatedBags.reduce((max, b: any) => (b && b.id > max ? b.id : max), 0);
      let updatedHistorical = selectedRack.historicalHarvests ? (Array.isArray(selectedRack.historicalHarvests) ? [...selectedRack.historicalHarvests] : Object.values(selectedRack.historicalHarvests)) : [];

      // Handle Empty Bags
      if (emptyTarget > currentEmptyCount) {
        const diff = emptyTarget - currentEmptyCount;
        for (let i = 0; i < diff; i++) {
          highestId++;
          updatedBags.push({ id: highestId, status: 'Empty', harvestLog: [] });
        }
      } else if (emptyTarget < currentEmptyCount) {
        let diff = currentEmptyCount - emptyTarget;
        for (let i = updatedBags.length - 1; i >= 0 && diff > 0; i--) {
          if (updatedBags[i] && updatedBags[i].status === 'Empty') {
            updatedBags.splice(i, 1);
            diff--;
          }
        }
      }

      // Handle Active Bags
      if (activeTarget > currentActiveCount) {
        const diff = activeTarget - currentActiveCount;
        for (let i = 0; i < diff; i++) {
          highestId++;
          updatedBags.push({ id: highestId, status: 'Active', harvestLog: [] });
        }
      } else if (activeTarget < currentActiveCount) {
        let diff = currentActiveCount - activeTarget;
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

      if (!selectedRack || selectedRack.firebaseKey === undefined) throw new Error("Rack not found");

      update(ref(db, `kabutech/batches/${selectedRack.firebaseKey}`), {
        bags: updatedBags,
        historicalHarvests: updatedHistorical
      }).catch(error => {
        showToast({ type: 'error', text1: 'Error', text2: 'Failed to update capacity.' });
        console.error(error);
      });

      onClose();
      setTimeout(() => {
        playSuccessSound();
        showToast({ type: 'success', text1: 'Success', text2: `Capacity updated. Total slots: ${updatedBags.length}` });
      }, 600);
    } catch (error) {
      showToast({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Update Capacity" iconName="archive">
      <View style={tw`gap-4`}>
        {/* Rack Dropdown */}
        {!preselectedRackId && (
          <View style={tw`z-50`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>SELECT RACK</Text>
            <TouchableOpacity 
              onPress={() => setShowDropdown(!showDropdown)}
              style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 flex-row justify-between items-center`}
            >
              <Text style={tw`text-gray-800 ${selectedRack ? 'font-bold' : ''}`}>
                {selectedRack ? selectedRack.rack : 'Select a Rack'}
              </Text>
              <MaterialCommunityIcons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#166534" />
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

        {/* Capacity Inputs */}
        <View style={tw`flex-row gap-3 mt-4 z-10`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>ACTIVE BAGS</Text>
            <TextInput
              style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
              keyboardType="numeric"
              value={activeBags}
              onChangeText={setActiveBags}
            />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>EMPTY BAGS</Text>
            <TextInput
              style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
              keyboardType="numeric"
              value={emptyBags}
              onChangeText={setEmptyBags}
            />
          </View>
        </View>

        <View style={tw`flex-row justify-between items-center mt-2 z-10`}>
          <Text style={tw`text-[11px] font-bold text-gray-600 uppercase tracking-wider`}>TOTAL SLOT CAPACITY:</Text>
          <Text style={[tw`text-[15px] text-[#032514]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{totalCapacity}</Text>
        </View>

        {/* Actions */}
        <View style={tw`mt-6 z-10`}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={tw`w-full bg-[#032514] rounded-xl py-3.5 items-center`}
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
