import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useSensors } from '../hooks/useFirebaseData';
import { hapticLight, hapticSelection } from '../utils/haptics';
import { showToast } from '../components/CustomToast';

export default function LiveFarmScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  
  const [currentTime, setCurrentTime] = useState('');
  const [isNightVision, setIsNightVision] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  
  const isOnline = sensors?.esp32_status === 'online';

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const timeStr = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSnapshot = () => {
    hapticLight();
    showToast({ type: 'success', text1: 'Snapshot Saved', text2: 'Frame captured to local media' });
  };

  return (
    <View style={tw`flex-1 bg-[#05070e]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Header */}
      <View
        style={[
          tw`bg-[#090d16] px-4 pb-3.5 flex-row items-center justify-between z-10 border-b border-slate-800/80`,
          { paddingTop: insets.top > 0 ? insets.top + 6 : 20 }
        ]}
      >
        {/* Left: Back & Title */}
        <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
          <TouchableOpacity
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            onPress={() => navigation.goBack()}
            style={tw`w-9 h-9 rounded-2xl bg-white/10 items-center justify-center`}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[16px] text-white tracking-wide`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]} numberOfLines={1}>
              Growing Chamber Live
            </Text>
            <Text style={[tw`text-[10px] text-slate-400 mt-0.5`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]} numberOfLines={1}>
              CAM 01 • Main Fruiting Chamber
            </Text>
          </View>
        </View>

        {/* Right: Live Status Pill */}
        <View style={tw`flex-row items-center gap-2 shrink-0`}>
          {isOnline ? (
            <View style={tw`bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1 flex-row items-center gap-1.5`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400`} />
              <Text style={[tw`text-[10px] text-emerald-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>LIVE HD</Text>
            </View>
          ) : (
            <View style={tw`bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 flex-row items-center gap-1.5`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-slate-400`} />
              <Text style={[tw`text-[10px] text-slate-400`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>STANDBY</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Viewport */}
      <View style={tw`flex-1 relative justify-center items-center overflow-hidden`}>
        {/* The Camera Feed */}
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=2787&auto=format&fit=crop' }} 
          style={[
            tw`absolute inset-0 w-full h-full`,
            !isOnline && tw`opacity-20`,
            isNightVision && { tintColor: '#86efac' }
          ]}
          resizeMode="cover"
        />

        {/* Grid Overlay if enabled */}
        {showGrid && (
          <View style={tw`absolute inset-0 pointer-events-none opacity-20`}>
            <View style={tw`w-full h-full justify-between`}>
              <View style={tw`w-full h-1/3 border-b border-dashed border-white`} />
              <View style={tw`w-full h-1/3 border-b border-dashed border-white`} />
            </View>
            <View style={tw`absolute inset-0 flex-row justify-between`}>
              <View style={tw`h-full w-1/3 border-r border-dashed border-white`} />
              <View style={tw`h-full w-1/3 border-r border-dashed border-white`} />
            </View>
          </View>
        )}

        {!isOnline && (
          <View style={tw`items-center justify-center z-20 bg-black/60 p-6 rounded-3xl`}>
            <MaterialCommunityIcons name="video-off-outline" size={42} color="#94a3b8" />
            <Text style={[tw`text-slate-300 text-sm mt-2.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>CAMERA FEED OFFLINE</Text>
          </View>
        )}

        {/* HUD Viewfinder Corner Reticles - Edge to Edge above Bottom Bar */}
        <View style={tw`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400/80`} />
        <View style={tw`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400/80`} />
        <View style={tw`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400/80`} />
        <View style={tw`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400/80`} />

        {/* Top Floating HUD Info */}
        <View style={tw`absolute top-5 left-12 right-12 flex-row justify-between items-center`}>
          <Text style={[tw`text-white/80 text-[10px] tracking-wider`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            KABUTECH-CORE // 1080P
          </Text>
          <Text style={[tw`text-emerald-400 text-xs tracking-widest`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
            {currentTime}
          </Text>
        </View>

        {/* Center Target Crosshair */}
        <View style={tw`pointer-events-none items-center justify-center`}>
          <View style={tw`w-8 h-8 rounded-full border border-white/20 items-center justify-center`}>
            <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400/80`} />
          </View>
        </View>
      </View>

      {/* Floating Bottom Control Bar */}
      <View style={[tw`bg-[#090d16] px-6 py-4 border-t border-slate-800/80 flex-row justify-around items-center`, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticSelection();
            setShowGrid(g => !g);
          }}
          style={tw`items-center gap-1`}
        >
          <View style={tw`w-10 h-10 rounded-2xl ${showGrid ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5'} items-center justify-center`}>
            <MaterialCommunityIcons name="grid" size={20} color={showGrid ? '#34d399' : '#94a3b8'} />
          </View>
          <Text style={[tw`text-[10px] ${showGrid ? 'text-emerald-400' : 'text-slate-400'}`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Grid</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSnapshot}
          style={tw`items-center gap-1`}
        >
          <View style={tw`w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg active:scale-95`}>
            <MaterialCommunityIcons name="camera" size={24} color="#0f172a" />
          </View>
          <Text style={[tw`text-[10px] text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>Snap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticSelection();
            setIsNightVision(nv => !nv);
          }}
          style={tw`items-center gap-1`}
        >
          <View style={tw`w-10 h-10 rounded-2xl ${isNightVision ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-white/5'} items-center justify-center`}>
            <MaterialCommunityIcons name="weather-night" size={20} color={isNightVision ? '#34d399' : '#94a3b8'} />
          </View>
          <Text style={[tw`text-[10px] ${isNightVision ? 'text-emerald-400' : 'text-slate-400'}`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Night NV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
