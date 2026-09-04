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

  // Container fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Step 1: "Kabu" appears centered first
  const kabuEntrance = useRef(new Animated.Value(0)).current;
  const kabuShift = useRef(new Animated.Value(0)).current; // 0 = centered (+48px), 1 = shifted to join (0px)

  // Step 2: "Tech" goes UP from below
  const techEntrance = useRef(new Animated.Value(0)).current; // 0 = down below (55px), 1 = up (0px)

  // Step 3: KabuTech formed lock, sprout pop & accent line
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sproutPopAnim = useRef(new Animated.Value(0)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  // Continuous living loops once formed
  const floatAnim = useRef(new Animated.Value(0)).current;
  const sproutSwayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Weightless vertical float loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: -1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Gentle sprout organic sway loop
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sproutSwayAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sproutSwayAnim, {
          toValue: -1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Deep breathing scale loop once KabuTech is formed
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.035,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Snappy choreography sequence:
    // 1. "Kabu" appears first in center
    // 2. "Tech" goes up briskly from below while "Kabu" shifts to form
    // 3. "KabuTech" formed! Formation pulse, sprout blooms, line sweeps
    Animated.sequence([
      // 1. First "Kabu" appears
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(kabuEntrance, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),

      // Quick distinct beat so user clearly registers "Kabu" first
      Animated.delay(220),

      // 2. "Tech" goes UP briskly from below & "Kabu" shifts to position
      Animated.parallel([
        Animated.timing(kabuShift, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(techEntrance, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.back(1.3)),
          useNativeDriver: true,
        }),
      ]),

      // 3. KabuTech is formed! Lock pulse, sprout pop on 'T', line sweep
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.055,
            duration: 140,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(sproutPopAnim, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.back(2.0)),
          useNativeDriver: true,
        }),
        Animated.timing(lineAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // 4. Continue with living idle float, sway, and breathing loops
      floatLoop.start();
      swayLoop.start();
      breathLoop.start();
    });

    // Transition directly to Login screen after 2.3 seconds
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2300);

    return () => {
      clearTimeout(timer);
      floatLoop.stop();
      swayLoop.stop();
      breathLoop.stop();
    };
  }, [navigation]);

  return (
    <View style={tw`flex-1 bg-[#0e3a22] justify-center items-center`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Rich Forest Green Background Gradient */}
      <LinearGradient
        colors={['#185735', '#114427', '#0a2e1b']}
        locations={[0, 0.55, 1]}
        style={tw`absolute inset-0`}
      />

      {/* Centered Brand Text with Float & Scale */}
      <Animated.View
        style={[
          tw`items-center justify-center px-6`,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: floatAnim.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-3.5, 3.5],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={tw`relative`}>
          {/* Logo Typography with Coordinated Formation */}
          <View style={tw`flex-row items-baseline`}>
            {/* 1. "Kabu" appears first, then shifts into lockup */}
            <Animated.View
              style={{
                opacity: kabuEntrance,
                transform: [
                  {
                    translateX: kabuShift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [48, 0],
                    }),
                  },
                  {
                    translateY: kabuEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                  },
                  {
                    scale: kabuEntrance.interpolate({
                      inputRange: [0, 0.75, 1],
                      outputRange: [0.92, 1.03, 1],
                    }),
                  },
                ],
              }}
            >
              <Text
                style={[
                  tw`text-[44px] sm:text-[48px] text-white tracking-tight leading-none`,
                  {
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    textShadowColor: 'rgba(0, 0, 0, 0.35)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                Kabu
              </Text>
            </Animated.View>

            {/* 2. "Tech" goes UP from below to form KabuTech */}
            <Animated.View
              style={[
                tw`relative`,
                {
                  opacity: techEntrance.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0, 0.7, 1],
                  }),
                  transform: [
                    {
                      translateY: techEntrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [55, 0],
                      }),
                    },
                    {
                      scale: techEntrance.interpolate({
                        inputRange: [0, 0.7, 1],
                        outputRange: [0.85, 1.05, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Sprout Accent positioned gracefully on top of the 'T' */}
              <Animated.View
                style={[
                  tw`absolute -top-4 left-0.5 z-10`,
                  {
                    opacity: sproutPopAnim,
                    transform: [
                      {
                        translateY: sproutPopAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [6, 0],
                        }),
                      },
                      {
                        scale: sproutPopAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                      {
                        rotate: sproutPopAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-25deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: sproutSwayAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: [0.95, 1.12],
                        }),
                      },
                      {
                        rotate: sproutSwayAnim.interpolate({
                          inputRange: [-1, 1],
                          outputRange: ['-6deg', '6deg'],
                        }),
                      },
                    ],
                    shadowColor: '#4ade80',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.95,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M2 20C4 11 12 5 21 4C19 13 13 19 4 20C3.3 20 2.6 20 2 20Z"
                      fill="#4ade80"
                    />
                    <Path
                      d="M2 20C7 15 12 10 21 4"
                      stroke="#114427"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </Svg>
                </Animated.View>
              </Animated.View>

              <Text
                style={[
                  tw`text-[44px] sm:text-[48px] text-[#4ade80] tracking-tight leading-none`,
                  {
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    textShadowColor: 'rgba(74, 222, 128, 0.55)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 18,
                  },
                ]}
              >
                Tech
              </Text>
            </Animated.View>
          </View>

          {/* Sleek Tapered Accent Line directly beneath "Tech" */}
          <Animated.View
            style={[
              tw`flex-row justify-end mt-1.5`,
              {
                opacity: lineAnim,
                transform: [
                  {
                    scaleX: lineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.01, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', '#4ade80', '#6ee7b7', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`h-[2.5px] w-28 rounded-full`}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
