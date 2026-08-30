import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ImageBackground, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';

export default function BootScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        })
      ])
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2000,
      useNativeDriver: false, // width interpolation doesn't support native driver
    }).start(({ finished }) => {
      if (finished && navigation.isFocused()) {
        // Navigate straight to Welcome after "loading"
        navigation.replace('Welcome');
      }
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Realistic Background Image */}
      <ImageBackground 
        source={require('../../assets/mushroom_bg.png')} 
        style={tw`flex-1 justify-center items-center`}
        resizeMode="cover"
      >
        {/* Dark Emerald Gradient Overlay for Premium Feel */}
        <LinearGradient
          colors={['rgba(2, 6, 23, 0.6)', 'rgba(3, 37, 20, 0.85)', 'rgba(2, 6, 23, 0.95)']}
          style={tw`absolute inset-0`}
        />

        <Animated.View style={[tw`w-full px-8 items-center justify-center flex-1`, { opacity: fadeAnim }]}>
          
          <View style={tw`flex-1 items-center justify-center w-full max-w-xs`}>
            {/* Glassmorphism Logo Container */}
            <Animated.View style={[
              tw`mb-8 rounded-[32px] flex items-center justify-center w-28 h-28 bg-white/10 border border-white/20 shadow-lg overflow-hidden`,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.0)']}
                style={tw`absolute inset-0`}
              />
              <MaterialCommunityIcons name="leaf" size={56} color="#6ee7b7" />
            </Animated.View>
            
            {/* Brand Name */}
            <Text style={[tw`text-[32px] text-white mb-2 tracking-tighter text-center`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
              KabuTech<Text style={tw`text-[#6ee7b7]`}> Hiyas</Text>
            </Text>
            
            {/* Status Text */}
            <Text style={[tw`text-[11px] text-[#94a3b8] mb-12 text-center tracking-widest uppercase`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
              Initializing Farm AI
            </Text>
            
            {/* Progress Bar Track */}
            <View style={tw`w-full h-1 bg-white/10 rounded-full overflow-hidden`}>
              <Animated.View style={[tw`h-full bg-[#6ee7b7] rounded-full`, { width: progressWidth }]} />
            </View>
          </View>

        </Animated.View>
      </ImageBackground>
    </View>
  );
}
