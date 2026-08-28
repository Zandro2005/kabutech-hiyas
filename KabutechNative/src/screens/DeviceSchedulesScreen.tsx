import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';

export default function DeviceSchedulesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const insets = useSafeAreaInsets();
  const [globalEnabled, setGlobalEnabled] = useState(false);
  
  // Local state for the UI demo based on the pixel-perfect image
  const [mistersOn, setMistersOn] = useState(false);
  const [fanOn, setFanOn] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);

  return (
    <View style={tw`flex-1 bg-[#f0f9f4]`}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Header - Dark Green */}
      <View style={[tw`bg-[#166534] pb-3 px-4 z-10 shadow-sm relative overflow-hidden`, { paddingTop: insets.top > 0 ? insets.top + 2 : 20 }]}>
        <View style={tw`absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full`} />

        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center gap-2 flex-1 mr-2`}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={tw`w-8 h-8 rounded-full bg-white/20 items-center justify-center`}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <View>
              <Text style={[tw`text-[17px] text-white tracking-tight leading-none`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Device Schedules</Text>
              <Text style={[tw`text-[10px] text-[#bbf7d0] mt-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Automate your traditional routine</Text>
            </View>
          </View>
          
          <View style={tw`items-end`}>
            <Switch 
              value={globalEnabled}
              onValueChange={setGlobalEnabled}
              trackColor={{ false: '#0f3c20', true: '#22c55e' }}
              thumbColor={'#ffffff'}
            />
            <Text style={[tw`text-[8px] text-white/70 mt-1 mr-1`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
              {globalEnabled ? 'ACTIVE' : 'OFF'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-3 pb-12`} showsVerticalScrollIndicator={false}>
        
        {/* ================= MISTERS ================= */}
        <Text style={[tw`mx-2 mt-2 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Misters</Text>

        <View style={tw`bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 mb-4`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-2.5`}>
              <View style={tw`w-8 h-8 rounded-full bg-[#eff6ff] items-center justify-center`}>
                <MaterialCommunityIcons name="water-opacity" size={16} color="#3b82f6" />
              </View>
              <View>
                <Text style={[tw`text-[15px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Misters</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Run duration & interval</Text>
              </View>
            </View>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Text style={[tw`text-[10px] text-gray-500`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{mistersOn ? 'ON' : 'OFF'}</Text>
              <Switch value={mistersOn} onValueChange={setMistersOn} trackColor={{ false: '#e2e8f0', true: '#3b82f6' }} thumbColor="#fff" />
            </View>
          </View>

          <View style={tw`flex-row gap-3 mb-4`}>
            {/* Run Duration */}
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[13px] text-slate-800 mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Run Duration</Text>
              <View style={tw`flex-row items-center justify-between bg-gray-50 rounded-xl p-2 border border-gray-100`}>
                <TouchableOpacity style={tw`w-6 h-6 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="minus" size={14} color="#64748b"/></TouchableOpacity>
                <View style={tw`flex-row items-baseline gap-1`}>
                  <Text style={[tw`text-lg text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>30</Text>
                  <Text style={[tw`text-[11px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>min</Text>
                </View>
                <TouchableOpacity style={tw`w-6 h-6 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="plus" size={14} color="#64748b"/></TouchableOpacity>
              </View>
            </View>
            {/* Repeat Every */}
            <View style={tw`flex-1`}>
              <Text style={[tw`text-[13px] text-slate-800 mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Repeat Every</Text>
              <View style={tw`flex-row items-center justify-between bg-gray-50 rounded-xl p-2 border border-gray-100`}>
                <TouchableOpacity style={tw`w-6 h-6 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="minus" size={14} color="#64748b"/></TouchableOpacity>
                <View style={tw`flex-row items-baseline gap-1`}>
                  <Text style={[tw`text-lg text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>2</Text>
                  <Text style={[tw`text-[11px] text-gray-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>hr</Text>
                </View>
                <TouchableOpacity style={tw`w-6 h-6 rounded-full border border-gray-200 items-center justify-center bg-white shadow-sm`}><MaterialCommunityIcons name="plus" size={14} color="#64748b"/></TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={tw`bg-[#eff6ff] rounded-[10px] p-2.5 flex-row items-center justify-center gap-2`}>
            <MaterialCommunityIcons name="water-opacity" size={16} color="#3b82f6" />
            <Text style={[tw`text-xs text-blue-600`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Runs for <Text style={{fontFamily: 'PlusJakartaSans_800ExtraBold'}}>30 min every 2 hr</Text></Text>
          </View>
        </View>

        {/* ================= FAN ================= */}
        <Text style={[tw`mx-2 mt-1 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Fan</Text>

        <View style={tw`bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 mb-4`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-2.5`}>
              <View style={tw`w-8 h-8 rounded-full bg-[#ecfeff] items-center justify-center`}>
                <MaterialCommunityIcons name="fan" size={16} color="#06b6d4" />
              </View>
              <View>
                <Text style={[tw`text-[15px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Fan</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Two daily on/off windows</Text>
              </View>
            </View>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Text style={[tw`text-[10px] text-gray-500`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{fanOn ? 'ON' : 'OFF'}</Text>
              <Switch value={fanOn} onValueChange={setFanOn} trackColor={{ false: '#e2e8f0', true: '#06b6d4' }} thumbColor="#fff" />
            </View>
          </View>

          <View style={tw`flex-row gap-3 mb-3`}>
            <View style={tw`flex-1`}>
               <Text style={[tw`text-[11px] text-slate-500 tracking-widest uppercase mb-1.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Window 1 — Morning</Text>
               <View style={tw`flex-row bg-gray-50 border border-gray-100 rounded-xl`}>
                 <View style={tw`flex-1 py-2 items-center border-r border-gray-100`}>
                   <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>On</Text>
                   <Text style={[tw`text-[13px] text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>6:00 AM</Text>
                 </View>
                 <View style={tw`flex-1 py-2 items-center`}>
                   <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Off</Text>
                   <Text style={[tw`text-[13px] text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>8:00 AM</Text>
                 </View>
               </View>
            </View>
          </View>
          
          <View style={tw`flex-row gap-3 mb-4`}>
            <View style={tw`flex-1`}>
               <Text style={[tw`text-[11px] text-slate-500 tracking-widest uppercase mb-1.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Window 2 — Afternoon</Text>
               <View style={tw`flex-row bg-gray-50 border border-gray-100 rounded-xl`}>
                 <View style={tw`flex-1 py-2 items-center border-r border-gray-100`}>
                   <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>On</Text>
                   <Text style={[tw`text-[13px] text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>2:00 PM</Text>
                 </View>
                 <View style={tw`flex-1 py-2 items-center`}>
                   <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Off</Text>
                   <Text style={[tw`text-[13px] text-slate-800`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>4:00 PM</Text>
                 </View>
               </View>
            </View>
          </View>

          <View style={tw`bg-[#ecfeff] rounded-[10px] p-2.5 flex-row items-center justify-center gap-2`}>
            <MaterialCommunityIcons name="fan" size={16} color="#0891b2" />
            <Text style={[tw`text-xs text-[#0891b2]`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>6:00–8:00 AM <Text style={{fontFamily: 'PlusJakartaSans_800ExtraBold'}}>&</Text> 2:00–4:00 PM</Text>
          </View>
        </View>

        {/* ================= GROW LIGHTS ================= */}
        <Text style={[tw`mx-2 mt-1 mb-2 text-[10px] text-gray-500 tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Grow Lights</Text>

        <View style={tw`bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 mb-4`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center gap-2.5`}>
              <View style={tw`w-8 h-8 rounded-full bg-[#fefce8] items-center justify-center`}>
                <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#eab308" />
              </View>
              <View>
                <Text style={[tw`text-[15px] text-slate-800 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Grow Lights</Text>
                <Text style={[tw`text-[11px] text-slate-500`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Daily on/off schedule</Text>
              </View>
            </View>
            <View style={tw`flex-row items-center gap-1.5`}>
              <Text style={[tw`text-[10px] text-gray-500`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{lightsOn ? 'ON' : 'OFF'}</Text>
              <Switch value={lightsOn} onValueChange={setLightsOn} trackColor={{ false: '#e2e8f0', true: '#eab308' }} thumbColor="#fff" />
            </View>
          </View>

          <View style={tw`flex-row bg-gray-50 border border-gray-100 rounded-xl mb-4`}>
             <View style={tw`flex-1 py-3 items-center border-r border-gray-100`}>
               <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>On At</Text>
               <Text style={[tw`text-lg text-slate-800 mt-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>6:30 AM</Text>
             </View>
             <View style={tw`flex-1 py-3 items-center`}>
               <Text style={[tw`text-[10px] text-gray-400 uppercase`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Off At</Text>
               <Text style={[tw`text-lg text-slate-800 mt-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>7:00 PM</Text>
             </View>
          </View>

          <View style={tw`bg-[#fefce8] rounded-[10px] p-2.5 flex-row items-center justify-between px-3`}>
            <View style={tw`flex-row items-center gap-2`}>
              <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#ca8a04" />
              <Text style={[tw`text-xs text-[#ca8a04]`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Photoperiod</Text>
            </View>
            <Text style={[tw`text-xs text-[#a16207]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>12h 30min daily</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
