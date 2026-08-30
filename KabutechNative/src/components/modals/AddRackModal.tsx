import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { showToast } from '../CustomToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, set, push } from 'firebase/database';
import { db } from '../../services/firebase';
import { SoundManager } from '../../utils/SoundManager';
import ActionModal from '../ActionModal';
import tw from '../../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AddRackModalProps {
  visible: boolean;
  onClose: () => void;
  racks: any[];
}

export default function AddRackModal({ visible, onClose, racks }: AddRackModalProps) {
  const [rackName, setRackName] = useState('');
  const [slotsCount, setSlotsCount] = useState('');
  const slotsRef = React.useRef<TextInput>(null);
  const [substrate, setSubstrate] = useState('Sawdust + Bran');
  const [setupDate, setSetupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSave = async () => {
    if (!rackName || !slotsCount || !substrate) {
      showToast({ type: 'error', text1: 'Missing Info', text2: 'Please fill out all fields.' });
      return;
    }

    const slots = parseInt(slotsCount, 10);
    if (isNaN(slots) || slots <= 0) {
      showToast({ type: 'error', text1: 'Error', text2: 'Please enter a valid number of slots.' });
      return;
    }

    setLoading(true);
    try {
      const bags = [];
      for (let i = 1; i <= slots; i++) {
        bags.push({
          id: i,
          status: 'Empty',
          harvestLog: []
        });
      }

      const localDateStr = `${setupDate.getFullYear()}-${String(setupDate.getMonth() + 1).padStart(2, '0')}-${String(setupDate.getDate()).padStart(2, '0')}`;
      
      const newRack = {
        id: Date.now(),
        rack: rackName,
        substrate: substrate,
        setupDate: localDateStr,
        bags: bags,
        historicalHarvests: []
      };

      const newRef = push(ref(db, 'kabutech/batches'));
      set(newRef, newRack).catch(error => {
        showToast({ type: 'error', text1: 'Error', text2: 'Failed to add rack.' });
        console.error(error);
      });

      setRackName('');
      setSlotsCount('');
      onClose();
      setTimeout(() => {
        SoundManager.playSuccess();
        showToast({ type: 'success', text1: 'Success', text2: `Rack "${rackName}" added with ${slots} empty slots.` });
      }, 600);
    } catch (error) {
      showToast({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Add Rack" iconName="bookshelf">
      <View style={tw`gap-4`}>
        {/* Rack Name */}
        <View style={tw`z-10`}>
          <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>RACK NAME / LABEL</Text>
          <TextInput
            style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
            placeholder="e.g. Rack A"
            placeholderTextColor="#9ca3af"
            value={rackName}
            onChangeText={setRackName}
            returnKeyType="next"
            onSubmitEditing={() => slotsRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>

        {/* Slots and Substrate */}
        <View style={tw`flex-row gap-3 mt-4 z-50`}>
          <View style={tw`flex-1 z-10`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>NO. OF SLOTS</Text>
            <TextInput
              ref={slotsRef}
              style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 text-gray-900 font-semibold`}
              placeholder="20"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={slotsCount}
              onChangeText={setSlotsCount}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          <View style={tw`flex-1 z-50`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>SUBSTRATE</Text>
            <TouchableOpacity 
              onPress={() => setShowDropdown(!showDropdown)}
              style={tw`bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5 flex-row justify-between items-center`}
            >
              <Text style={tw`text-gray-900 font-semibold text-xs`} numberOfLines={1}>{substrate}</Text>
              <MaterialCommunityIcons name={showDropdown ? "chevron-up" : "chevron-down"} size={16} color="#166534" />
            </TouchableOpacity>
            
            {showDropdown && (
              <View style={tw`absolute top-16 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50`}>
                {['Sawdust + Bran', 'Straw Mix', 'Coco Coir'].map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={tw`px-4 py-3 border-b border-gray-50`}
                    onPress={() => {
                      setSubstrate(sub);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={tw`text-gray-800 font-semibold text-xs`}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Date Set Up */}
        <View style={tw`z-10 mt-4`}>
          <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5`}>DATE SET UP</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={tw`flex-row items-center justify-between bg-[#f4fbf7] border border-green-100 rounded-xl px-4 py-3.5`}
          >
            <Text style={tw`text-gray-900 font-semibold`}>
              {setupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <MaterialCommunityIcons name="calendar" size={18} color="#166534" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={setupDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setSetupDate(selectedDate);
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
              {loading ? 'Saving...' : 'Add Rack'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
