import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';
import { useTheme } from '../context/ThemeContext';
import { hapticSelection } from '../utils/haptics';

interface Props {
  navigation: any;
}

const LiveFarmCard = React.memo(function LiveFarmCard({ navigation }: Props) {
  const { isDarkMode } = useTheme();

  const handlePress = () => {
    hapticSelection();
    navigation.navigate('LiveFarm');
  };

  return (
    <View style={tw`px-6 mt-6 mb-8`}>
      {/* Section Header */}
      <View style={tw`flex-row justify-between items-center mb-3.5`}>
        <View style={tw`flex-row items-center gap-2`}>
          <View style={tw`w-2 h-4.5 rounded-full bg-[#10b981]`} />
          <Text style={[tw`text-lg tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            Live Farm Feed
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={handlePress}
          style={tw`flex-row items-center`}
        >
          <Text style={[tw`text-xs text-[#10b981] mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Expand</Text>
          <Ionicons name="expand" size={12} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Video Stream Card */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={tw`w-full h-[210px] bg-slate-900 rounded-[26px] overflow-hidden shadow-md relative border border-slate-200/60 dark:border-slate-800`}
      >
        {/* Camera Image Feed */}
        <Image
          source={require('../../assets/mushroom_feed.png')}
          style={tw`w-full h-full`}
          resizeMode="cover"
        />

        {/* Cinematic Vignette Gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={tw`absolute inset-0`}
        />

        {/* Top HUD Row: Live Pill & Expand Button */}
        <View style={tw`absolute top-3.5 left-3.5 right-3.5 flex-row justify-between items-center`}>
          {/* Live Badge */}
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`bg-emerald-500/90 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 shadow-sm`}>
              <View style={tw`w-1.5 h-1.5 bg-white rounded-full`} />
              <Text style={[tw`text-white text-[10px] uppercase tracking-wider`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                LIVE
              </Text>
            </View>
            <View style={tw`bg-black/50 px-2.5 py-1 rounded-full border border-white/10`}>
              <Text style={[tw`text-white/90 text-[10px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                CAM 01
              </Text>
            </View>
          </View>

          {/* Fullscreen Button Icon */}
          <View style={tw`w-7 h-7 rounded-full bg-black/40 items-center justify-center border border-white/15`}>
            <MaterialCommunityIcons name="fullscreen" size={16} color="white" />
          </View>
        </View>

        {/* Bottom HUD Bar */}
        <View style={tw`absolute bottom-0 left-0 right-0 p-4 pt-2 flex-row justify-between items-end`}>
          <View>
            <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
              <MaterialCommunityIcons name="video" size={14} color="#34d399" />
              <Text style={[tw`text-white text-[15px] tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Growing Room A
              </Text>
            </View>
            <Text style={[tw`text-white/70 text-[11px]`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
              Real-time chamber monitoring
            </Text>
          </View>

          <View style={tw`bg-white/15 px-2.5 py-1 rounded-lg border border-white/10 flex-row items-center gap-1`}>
            <Text style={[tw`text-white text-[10px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              1080p • 30fps
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default LiveFarmCard;
