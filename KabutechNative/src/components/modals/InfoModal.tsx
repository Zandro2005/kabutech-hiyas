import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Animated, PanResponder, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import tw from '../../tailwind';
import { useTheme } from '../../context/ThemeContext';

export interface InfoModalSection {
  bold: string;
  text: string;
}

export interface InfoModalContent {
  icon: string;
  title: string;
  color: string;
  sections: InfoModalSection[];
}

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  id: string | null;
}

export const INFO_CONTENT: Record<string, InfoModalContent> = {
  'guide': {
    icon: 'book-open-outline',
    title: 'Cultivation Guide',
    color: '#3b82f6',
    sections: [
      { bold: 'Live Farm Monitoring.', text: ' Check real-time Temperature, Humidity, and CO2 levels directly from the dashboard to ensure optimal growing conditions.' },
      { bold: 'Device Controls.', text: ' Adjust environmental targets using the dial and manually toggle Fans, Misters, and Vents from the Controls page.' },
      { bold: 'Automated Schedules.', text: ' Set up daily operating times in the Schedules screen to let the system automatically manage your equipment.' },
      { bold: 'Crop & Yield Tracking.', text: ' Log new batches in Manage Crop and record your harvest weights in the Yield tab to track farm productivity.' }
    ]
  },
  'faq': {
    icon: 'frequently-asked-questions',
    title: 'Frequently Asked Questions',
    color: '#f97316',
    sections: [
      { bold: 'How do I adjust target levels?', text: ' Navigate to the Controls page. You can adjust the dial to set your target setpoints for Temperature, Humidity, and CO2.' },
      { bold: 'What does the Valve Box do?', text: ' It controls the main water line. Ensure it is active when you want your misters to run automatically on schedule.' },
      { bold: 'How do device schedules work?', text: ' You can set specific ON and OFF times for each device in the Schedules tab to fully automate your grow room.' },
      { bold: 'Where can I see past harvests?', text: ' Check the Yield tab. It displays a record of all your logged weights and completed batches over time.' }
    ]
  },
  'support': {
    icon: 'headset',
    title: 'Contact Support',
    color: '#8b5cf6',
    sections: [
      { bold: '', text: 'Something not behaving as expected? Reach the KabuTech team and we\'ll help sort it out.' },
      { bold: 'Email:', text: ' zguinialpe@gmail.com' },
      { bold: 'Contact Number:', text: ' 09426738818' },
      { bold: 'Hours:', text: ' Monday–Saturday, 7:00 AM–7:00 PM' },
      { bold: '', text: 'For urgent hardware faults (sensors offline, misting failure), use Report Farm Issue from the Diagnostics area so it\'s logged with your farm\'s device history.' }
    ]
  },
  'about': {
    icon: 'information-outline',
    title: 'About This System',
    color: '#10b981',
    sections: [
      { bold: '', text: 'KabuTech Hiyas is a farm operations dashboard built for small and mid-size mushroom cultivation operations. It centralizes rack-level environmental monitoring, task management, yield tracking, and staff coordination in one place.' },
      { bold: '', text: 'The goal is simple: fewer surprises in the grow room. Automated alerts catch drifting conditions early, and the shared grow log keeps a running record of what was planted, harvested, and adjusted along the way.' }
    ]
  }
};

export default function InfoModal({ visible, onClose, id }: InfoModalProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  
  const translateY = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.0) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const slideOutAndClose = () => {
    Animated.timing(translateY, {
      toValue: 800,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(800);
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const content = id ? INFO_CONTENT[id] : null;

  if (!content) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={slideOutAndClose}
    >
      <BlurView intensity={60} tint="dark" style={[StyleSheet.absoluteFill, tw`bg-black/60`]}>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  activeOpacity={1} style={tw`flex-1 justify-center items-center p-4`} onPress={slideOutAndClose}>
            <Animated.View 
              onStartShouldSetResponder={() => true}
              style={[
                tw`w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-xl`, 
                { transform: [{ translateY }] }
              ]}
            >
              {/* Header Section */}
              <View {...panResponder.panHandlers} style={[tw`px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800`]}>
                {/* Drag Handle */}
                <View style={tw`w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-5`} />
                
                <View style={tw`flex-row items-center gap-4`}>
                  <View style={[tw`w-12 h-12 rounded-2xl items-center justify-center`, { backgroundColor: `${content.color}20` }]}>
                    <MaterialCommunityIcons name={content.icon as any} size={28} color={content.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-xl text-slate-800 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{content.title}</Text>
                  </View>
                  <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={slideOutAndClose} style={tw`w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 items-center justify-center`}>
                    <MaterialCommunityIcons name="close" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content Section */}
              <ScrollView 
                style={tw`max-h-[60vh]`}
                contentContainerStyle={tw`p-6 pb-8`}
                showsVerticalScrollIndicator={false}
              >
                {content.sections.map((section, index) => (
                  <View key={index} style={tw`mb-4`}>
                    <Text style={[tw`text-[14px] leading-6 text-slate-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                      {section.bold ? (
                        <Text style={[tw`text-slate-800 dark:text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                          {section.bold}
                        </Text>
                      ) : null}
                      {section.text}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

