import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Platform, Animated, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../../tailwind';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  onItemPress: (id: string) => void;
}

export default function HelpModal({ visible, onClose, onItemPress }: HelpModalProps) {
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

  const menuItems = [
    {
      id: 'guide',
      title: 'Cultivation Guide',
      subtitle: 'Mushroom farming manuals',
      icon: 'book-open-outline',
      color: '#3b82f6',
      bgColor: tw`bg-blue-50 dark:bg-blue-900/30`,
    },
    {
      id: 'faq',
      title: 'System FAQ',
      subtitle: 'Commonly asked questions',
      icon: 'frequently-asked-questions',
      color: '#f97316',
      bgColor: tw`bg-orange-50 dark:bg-orange-900/30`,
    },
    {
      id: 'support',
      title: 'Contact Support',
      subtitle: 'Get help from the developers',
      icon: 'headset',
      color: '#8b5cf6',
      bgColor: tw`bg-purple-50 dark:bg-purple-900/30`,
    },
    {
      id: 'about',
      title: 'About This System',
      subtitle: 'Version & legal information',
      icon: 'information-outline',
      color: '#10b981',
      bgColor: tw`bg-emerald-50 dark:bg-emerald-900/30`,
    },
  ];


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={slideOutAndClose}
    >
      <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  activeOpacity={1} style={tw`flex-1 justify-end bg-black/60`} onPress={slideOutAndClose}>
        <Animated.View 
          {...panResponder.panHandlers}
          onStartShouldSetResponder={() => true}
          style={[
            tw`w-full bg-white dark:bg-slate-900 rounded-t-[32px] overflow-hidden`, 
            { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY }] }
          ]}
        >
          
          {/* Header Section (Dark Green) */}
          <View style={tw`bg-[#064e3b] dark:bg-[#022c22] px-5 pt-3 pb-4`}>
                {/* Drag Handle */}
                <View style={tw`w-10 h-1 bg-white/30 rounded-full mx-auto mb-4`} />
                
                <View style={tw`flex-row justify-between items-start`}>
                  <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`w-10 h-10 rounded-full border border-white/20 items-center justify-center`}>
                      <MaterialCommunityIcons name="help-circle-outline" size={24} color="white" />
                    </View>
                    <View>
                      <Text style={[tw`text-white text-xl`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Help & Info</Text>
                      <Text style={[tw`text-emerald-100 text-[11px] mt-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>KabuTech System Resources</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Content Section */}
              <View style={tw`p-4 pt-4`}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                    key={index}
                    onPress={() => onItemPress(item.id)}
                    style={tw`flex-row items-center justify-between p-3 mb-2 border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 shadow-sm`}
                  >
                    <View style={tw`flex-row items-center gap-4`}>
                      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center`, item.bgColor]}>
                        <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View>
                        <Text style={[tw`text-[14px] text-gray-800 dark:text-slate-200`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{item.title}</Text>
                        <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 mt-0.5`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>{item.subtitle}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                  </TouchableOpacity>
                ))}

                {/* Footer */}
                <View style={tw`items-center mt-4 mb-2`}>
                  <Text style={[tw`text-[11px] text-gray-800 dark:text-slate-300 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                    KabuTech Hiyas
                  </Text>
                  <Text style={[tw`text-[10px] text-gray-400 dark:text-slate-500 mt-1`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    © 2026 KabuTech Hiyas. All rights reserved.
                  </Text>
                </View>
              </View>

        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
