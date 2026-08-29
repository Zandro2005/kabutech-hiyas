import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';
import { useSensors } from '../hooks/useFirebaseData';

export default function LiveFarmScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const sensors = useSensors();
  
  const [currentTime, setCurrentTime] = useState('');
  
  const isOnline = sensors?.esp32_status === 'online';

  useEffect(() => {
    // simple clock
    const updateTime = () => {
      const date = new Date();
      const timeStr = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Header */}
      <View style={[tw`bg-[#161616] px-3 pb-3 flex-row items-center justify-between z-10`, { paddingTop: insets.top > 0 ? insets.top + 2 : 20 }]}>
        
        {/* Left: Back & Title */}
        <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={tw`w-8 h-8 rounded-full bg-white/10 items-center justify-center`}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={tw`flex-1`}>
            <Text style={[tw`text-[17px] text-white`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5}]} numberOfLines={1}>
              Live Farm View
            </Text>
            <Text style={[tw`text-[10px] text-gray-400 mt-0.5`, {fontFamily: 'PlusJakartaSans_400Regular'}]} numberOfLines={1}>
              Growing Room — CAM 01
            </Text>
          </View>
        </View>

        {/* Right: Actions */}
        <View style={tw`flex-row items-center gap-1.5 shrink-0`}>
          <TouchableOpacity style={tw`border border-gray-600 rounded-full px-2 py-1 flex-row items-center gap-1`}>
            <MaterialCommunityIcons name="video-off-outline" size={12} color="#e2e8f0" />
            <Text style={[tw`text-[10px] text-slate-200`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Disable</Text>
          </TouchableOpacity>
          
          {isOnline ? (
            <View style={tw`bg-[#064e3b] border border-[#047857] rounded-full px-2 py-1 flex-row items-center gap-1.5`}>
              <View style={tw`w-1 h-1 rounded-full bg-emerald-400`} />
              <Text style={[tw`text-[10px] text-emerald-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>LIVE</Text>
            </View>
          ) : (
            <View style={tw`bg-slate-800 border border-slate-600 rounded-full px-2 py-1 flex-row items-center gap-1.5`}>
              <View style={tw`w-1 h-1 rounded-full bg-slate-400`} />
              <Text style={[tw`text-[10px] text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>OFFLINE</Text>
            </View>
          )}
        </View>

      </View>

      {/* Main Camera View */}
      <View style={tw`flex-1 relative justify-center items-center`}>
        {/* The Camera Feed Image */}
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=2787&auto=format&fit=crop' }} 
          style={[tw`absolute inset-0 w-full h-full`, !isOnline && tw`opacity-20`]}
          resizeMode="cover"
        />

        {!isOnline && (
          <View style={tw`items-center justify-center z-20`}>
            <MaterialCommunityIcons name="video-off" size={48} color="#94a3b8" />
            <Text style={[tw`text-slate-400 text-sm mt-2 tracking-wide`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>CAMERA OFFLINE</Text>
          </View>
        )}

        {/* Top Left Reticle & Text */}
        <View style={tw`absolute top-4 left-4 flex-row items-start`}>
          <View style={tw`w-6 h-6 border-t-2 border-l-2 border-emerald-400/80 mr-2`} />
          <Text style={[tw`text-white/90 text-[10px] mt-2`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>KabuTech — CAM 01</Text>
        </View>

        {/* Top Right Reticle */}
        <View style={tw`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400/80`} />

        {/* Bottom Left Timestamp */}
        <Text style={[tw`absolute bottom-[90px] left-4 text-emerald-400/80 text-sm tracking-wider`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
          {currentTime}
        </Text>

        {/* Bottom Right REC */}
        {isOnline && (
          <View style={tw`absolute bottom-[90px] right-4 flex-row items-center gap-1.5`}>
            <View style={tw`w-2 h-2 rounded-full bg-red-500`} />
            <Text style={[tw`text-red-500/90 text-[10px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1}]}>REC</Text>
          </View>
        )}

      </View>

    </View>
  );
}
