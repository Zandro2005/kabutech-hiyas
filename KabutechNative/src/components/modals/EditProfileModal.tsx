import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showToast } from '../CustomToast';
import tw from '../../tailwind';
import ActionModal from '../ActionModal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { ref, update } from 'firebase/database';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile?.name || user?.displayName || '');
    }
  }, [visible, profile, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await update(ref(db, `kabutech/users/${user.uid}`), {
        name: name.trim()
      });
      showToast({ type: 'success', text1: 'Profile Updated', text2: 'Your profile details have been saved.' });
      onClose();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Update Failed', text2: 'Could not save profile details.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ActionModal visible={visible} onClose={onClose} title="Edit Profile" iconName="account-edit">
      <View style={tw`gap-4`}>
        <View>
          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2`}>Full Name</Text>
          <TextInput
            style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-semibold`}
            value={name}
            onChangeText={setName}
          />
        </View>

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
          style={tw`flex-1 bg-green-600 dark:bg-emerald-600 rounded-xl py-3.5 items-center flex-row justify-center ${isSaving ? 'opacity-70' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="white" size="small" style={tw`mr-2`} /> : null}
          <Text style={tw`text-white font-bold`}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </ActionModal >
  );
}
