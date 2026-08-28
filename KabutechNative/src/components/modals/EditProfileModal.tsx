import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { showToast } from '../CustomToast';
import tw from '../../tailwind';
import ActionModal from '../ActionModal';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const [name, setName] = useState('Admin Renz');
  const [role, setRole] = useState('Farm Manager');

  const handleSave = () => {
    // Implement save logic here
    showToast({ type: 'success', text1: 'Profile Updated', text2: 'Your profile details have been saved.' });
    setTimeout(() => onClose(), 1500);
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Edit Profile" iconName="account-edit">
      <View style={tw`gap-4`}>
        <View>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Full Name</Text>
          <TextInput
            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold`}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={tw`mt-4`}>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Role</Text>
          <TextInput
            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold`}
            value={role}
            onChangeText={setRole}
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
            style={tw`flex-1 bg-green-600 rounded-xl py-3.5 items-center`}
          >
            <Text style={tw`text-white font-bold`}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionModal>
  );
}
