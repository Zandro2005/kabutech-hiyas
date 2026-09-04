import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StatusBar } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../tailwind';

export default function BootScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Smooth entrance fade & scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing pulse for the green accent
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Transition to Welcome screen after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={tw`flex-1 bg-[#04190e] justify-center items-center`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Dark Forest Green Background Gradient */}
      <LinearGradient
        colors={['#082a1a', '#051f13', '#03140b']}
        locations={[0, 0.5, 1]}
        style={tw`absolute inset-0`}
      />

      {/* Centered Brand Text with Integrated Typographic Design */}
      <Animated.View
        style={[
          tw`items-center justify-center px-6`,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={tw`relative`}>
          {/* Logo Typography with Design */}
          <View style={tw`flex-row items-baseline`}>
            {/* "Kabu" in crisp white */}
            <Text
              style={[
                tw`text-[44px] sm:text-[48px] text-white tracking-tight leading-none`,
                { fontFamily: 'PlusJakartaSans_800ExtraBold' },
              ]}
            >
              Kabu
            </Text>

            {/* "Tech" in radiant emerald with integrated sprout accent on the 'T' */}
            <View style={tw`relative`}>
              {/* Sprout Accent positioned gracefully on top of the 'T' */}
              <Animated.View
                style={[
                  tw`absolute -top-4 left-0.5 z-10`,
                  {
                    transform: [{ scale: pulseAnim }],
                    shadowColor: '#4ade80',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.95,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M2 20C4 11 12 5 21 4C19 13 13 19 4 20C3.3 20 2.6 20 2 20Z"
                    fill="#4ade80"
                  />
                  <Path
                    d="M2 20C7 15 12 10 21 4"
                    stroke="#051f13"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>

              <Text
                style={[
                  tw`text-[44px] sm:text-[48px] text-[#4ade80] tracking-tight leading-none`,
                  {
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    textShadowColor: 'rgba(74, 222, 128, 0.45)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 18,
                  },
                ]}
              >
                Tech
              </Text>
            </View>
          </View>

          {/* Sleek Tapered Accent Line directly beneath "Tech" */}
          <View style={tw`flex-row justify-end mt-1.5`}>
            <LinearGradient
              colors={['transparent', '#4ade80', '#6ee7b7', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`h-[2.5px] w-28 rounded-full`}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
