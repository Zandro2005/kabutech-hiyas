import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from '../tailwind';

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  return (
    <View style={tw`flex-1`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ImageBackground 
        source={require('../../assets/mushroom_bg.png')}
        style={tw`flex-1 w-full h-full`}
        resizeMode="cover"
      >
        {/* Dark Overlay for Text Readability */}
        <View style={tw`flex-1 bg-black/40 justify-between px-6 pb-12 pt-24`}>
          
          {/* Title Area */}
          <View style={tw`mt-12`}>
            <Text style={[tw`text-[42px] text-white leading-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              The best{'\n'}app for{'\n'}your mushrooms
            </Text>
          </View>

          {/* Buttons Area */}
          <View style={tw`w-full gap-4`}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={tw`w-full bg-white py-4 rounded-full items-center shadow-lg`}
              activeOpacity={0.8}
            >
              <Text style={[tw`text-[#2f6f4d] text-[15px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Sign up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={tw`w-full bg-[#3d8c63]/90 border border-white/20 py-4 rounded-full items-center shadow-lg`}
              activeOpacity={0.8}
            >
              <Text style={[tw`text-white text-[15px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Login
              </Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </ImageBackground>
    </View>
  );
}
