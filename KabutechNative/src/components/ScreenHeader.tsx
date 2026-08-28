import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { showToast } from './CustomToast';
import HelpModal from './modals/HelpModal';
import InfoModal from './modals/InfoModal';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, rightComponent }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const [helpVisible, setHelpVisible] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);
  
  const handleItemPress = (id: string) => {
    setHelpVisible(false); // Hide the slider immediately
    setTimeout(() => {
      setInfoId(id);       // Open the InfoModal slightly after to avoid overlap
    }, 150);
  };

  return (
    <View style={[tw`bg-transparent pb-3 px-5 z-10 relative`, { paddingTop: insets.top > 0 ? insets.top + 2 : 20 }]}>
      
      <View style={tw`flex-row justify-between items-center`}>
        
        {/* Brand Logo & Name */}
        <View style={tw`flex-row items-center gap-1.5 flex-1`}>
          <MaterialCommunityIcons name="leaf" size={28} color={isDarkMode ? "#6ee7b7" : "#166534"} />
          <Text style={[tw`text-[24px] text-[#166534] dark:text-[#6ee7b7] tracking-tight leading-none`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
            KabuTech
          </Text>
        </View>
        
        <View style={tw`flex-row items-center gap-2 ml-4`}>
          {rightComponent}
          
          {/* Help Icon */}
          <TouchableOpacity 
            onPress={() => setHelpVisible(true)}
            style={tw`w-7 h-7 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm`}
          >
            <MaterialCommunityIcons name="help-circle-outline" size={16} color={isDarkMode ? "#cbd5e1" : "#334155"} />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity 
            onPress={toggleTheme}
            style={tw`w-7 h-7 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm`}
          >
            <MaterialCommunityIcons 
              name={isDarkMode ? "weather-sunny" : "weather-night"} 
              size={14} 
              color={isDarkMode ? "#fbbf24" : "#334155"} 
            />
          </TouchableOpacity>

          {/* More Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={tw`w-7 h-7 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm`}
          >
            <MaterialCommunityIcons name="dots-vertical" size={16} color={isDarkMode ? "#cbd5e1" : "#334155"} />
          </TouchableOpacity>
        </View>

      </View>
      <HelpModal 
        visible={helpVisible} 
        onClose={() => setHelpVisible(false)} 
        onItemPress={handleItemPress} 
      />
      <InfoModal 
        id={infoId} 
        visible={!!infoId} 
        onClose={() => setInfoId(null)} 
      />
    </View>
  );
}
