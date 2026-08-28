import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import tw from '../tailwind';

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  iconName?: any;
  children: React.ReactNode;
}

export default function ActionModal({ visible, onClose, title, iconName, children }: ActionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={tw`absolute inset-0 bg-black/50`} />
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={tw`w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl`}
            >
              {/* Header */}
              <View style={tw`flex-row items-center justify-between p-5 border-b border-gray-100`}>
                <View style={tw`flex-row items-center gap-3`}>
                  {iconName && (
                    <View style={tw`w-10 h-10 rounded-full bg-green-50 items-center justify-center`}>
                      <MaterialCommunityIcons name={iconName} size={24} color={tw.color('success-green') || '#16a34a'} />
                    </View>
                  )}
                  <Text style={[tw`text-lg font-extrabold text-gray-900`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>{title}</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={tw`p-5`}>
                  {children}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
