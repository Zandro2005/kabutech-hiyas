import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SoundManager } from '../utils/SoundManager';
import { hapticSuccess, hapticSelection } from '../utils/haptics';

export interface WelcomeHudData {
  name: string;
  role?: string;
  duration?: number;
}

let globalShowWelcomeHud: ((data: WelcomeHudData) => void) | null = null;

export const showWelcomeHud = (data: WelcomeHudData) => {
  if (globalShowWelcomeHud) {
    globalShowWelcomeHud(data);
  }
};

export default function InteractiveWelcomeHud() {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<WelcomeHudData | null>(null);

  const translateY = useRef(new Animated.Value(-160)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Creative pulsing aura around the green sprout badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setData(null);
    });
  }, [translateY, opacity, scale]);

  // Pan gesture: swipe up smoothly to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy < -5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -25 || gestureState.vy < -0.35) {
          hapticSelection();
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const show = useCallback(
    (hudData: WelcomeHudData) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setData(hudData);

      // Auditory & haptic feedback
      SoundManager.playWelcome();
      hapticSuccess();

      // Reset positions
      translateY.setValue(-160);
      scale.setValue(0.92);
      opacity.setValue(0);
      waveAnim.setValue(0);
      pressScale.setValue(1);

      // Slower, smoother spring entrance (Fluid Dynamic Island style)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Slower, friendly wobble/wave on entrance
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: -1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0.5,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const displayDuration = hudData.duration || 4000;

      // Auto-dismiss timer
      timerRef.current = setTimeout(hide, displayDuration);
    },
    [translateY, scale, opacity, waveAnim, pressScale, hide]
  );

  useEffect(() => {
    globalShowWelcomeHud = show;
    return () => {
      globalShowWelcomeHud = null;
    };
  }, [show]);

  if (!data) return null;

  const hour = new Date().getHours();
  let timeGreeting = 'Good evening';
  if (hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour < 18) {
    timeGreeting = 'Good afternoon';
  }

  const topOffset = Math.max(insets.top + 8, 44);

  const waveRotate = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-16deg', '0deg', '16deg'],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          top: topOffset,
          opacity,
          transform: [{ translateY }, { scale: Animated.multiply(scale, pressScale) }],
        },
      ]}
    >
      <Pressable
        onPressIn={() => {
          Animated.spring(pressScale, {
            toValue: 0.96,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
        onPress={() => {
          hapticSelection();
          hide();
        }}
        style={[
          styles.hudCard,
          isDarkMode ? styles.hudCardDark : styles.hudCardLight,
        ]}
      >
        {/* Card Main Body */}
        <View style={styles.cardContent}>
          {/* Animated Sprout Icon with Living Pulse Beacon */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.radarRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.35],
                    outputRange: [0.5, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.iconInner,
                isDarkMode ? styles.iconInnerDark : styles.iconInnerLight,
                { transform: [{ rotate: waveRotate }] },
              ]}
            >
              <MaterialCommunityIcons
                name="sprout"
                size={20}
                color="#10b981"
              />
            </Animated.View>
          </View>

          {/* Minimalist Personalized Greeting */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.titleText,
                isDarkMode ? styles.textWhite : styles.textDark,
              ]}
              numberOfLines={1}
            >
              {timeGreeting}, {data.name}
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text
                style={[
                  styles.statusText,
                  isDarkMode ? styles.statusTextDark : styles.statusTextLight,
                ]}
                numberOfLines={1}
              >
                {data.role ? data.role.toUpperCase() : 'USER'} • ONLINE
              </Text>
            </View>
          </View>


        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
  },
  hudCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  hudCardDark: {
    backgroundColor: '#092115',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderWidth: 1.2,
  },
  hudCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 185, 129, 0.28)',
    borderWidth: 1.2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  iconContainer: {
    position: 'relative',
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  radarRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.8,
    borderColor: '#10b981',
  },
  iconInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconInnerLight: {
    backgroundColor: '#ecfdf5',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  textWhite: {
    color: '#f8fafc',
  },
  textDark: {
    color: '#0f172a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.4,
  },
  statusTextDark: {
    color: '#6ee7b7',
  },
  statusTextLight: {
    color: '#059669',
  },
  dismissButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dismissButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dismissButtonLight: {
    backgroundColor: '#f1f5f9',
  },
});
