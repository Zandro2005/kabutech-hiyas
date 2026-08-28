import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import tw from 'twrnc';

export default function BootScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        })
      ])
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      // Navigate straight to Welcome after "loading"
      navigation.replace('Welcome');
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[tw`flex-1 items-center justify-center px-8`, { backgroundColor: '#004521' }]}>
      <View style={tw`relative flex flex-col items-center w-full max-w-xs`}>
        {/* Logo Container */}
        <Animated.View style={[
          tw`mb-10 rounded-3xl flex items-center justify-center w-24 h-24 bg-white/20`,
          { transform: [{ scale: pulseAnim }] }
        ]}>
          <MaterialCommunityIcons name="leaf" size={56} color="#adf2bc" />
        </Animated.View>
        
        {/* Brand Name */}
        <Text style={tw`text-3xl text-white mb-2 tracking-tight font-extrabold`}>
          KabuTech Hiyas
        </Text>
        
        {/* Status Text */}
        <Text style={tw`text-sm text-[#adf2bc] mb-10 opacity-80`}>
          Initializing Farm Intelligence...
        </Text>
        
        {/* Progress Bar Track */}
        <View style={tw`w-full h-1.5 bg-white/20 rounded-full overflow-hidden`}>
          <Animated.View style={[tw`h-full bg-[#adf2bc] rounded-full`, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}
