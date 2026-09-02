import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
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
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Looping radar pulse animation for the online status beacon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
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
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setData(null);
    });
  }, [translateY, opacity, scale]);

  // PanResponder to allow quick swipe-up to dismiss
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
        if (gestureState.dy < -30 || gestureState.vy < -0.4) {
          hapticSelection();
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 70,
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

      // Sensory feedback: pleasant chime + soft haptic tap (NO robotic voice, NO volume hijacking)
      SoundManager.playWelcome();
      hapticSuccess();

      // Reset positions
      translateY.setValue(-160);
      scale.setValue(0.92);
      opacity.setValue(0);
      progressAnim.setValue(1);

      // Spring into view like iOS Dynamic Island
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const displayDuration = hudData.duration || 4500;

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: displayDuration,
        useNativeDriver: false,
      }).start();

      // Auto-dismiss timer
      timerRef.current = setTimeout(hide, displayDuration);
    },
    [translateY, scale, opacity, progressAnim, hide]
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
  let greetingIcon = 'weather-night';
  if (hour < 12) {
    timeGreeting = 'Good morning';
    greetingIcon = 'weather-sunny';
  } else if (hour < 18) {
    timeGreeting = 'Good afternoon';
    greetingIcon = 'weather-partly-cloudy';
  }

  const topOffset = Math.max(insets.top + 8, 44);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          top: topOffset,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View
        style={[
          styles.hudCard,
          isDarkMode ? styles.hudCardDark : styles.hudCardLight,
        ]}
      >
        {/* Inner Content */}
        <View style={styles.cardContent}>
          {/* Left: Glowing Mushroom / Radar Beacon */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.radarRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.4],
                    outputRange: [0.5, 0],
                  }),
                },
              ]}
            />
            <View
              style={[
                styles.iconInner,
                isDarkMode ? styles.iconInnerDark : styles.iconInnerLight,
              ]}
            >
              <MaterialCommunityIcons
                name="sprout"
                size={22}
                color="#10b981"
              />
            </View>
          </View>

          {/* Center: Greeting & System Status */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.titleText,
                  isDarkMode ? styles.textWhite : styles.textDark,
                ]}
                numberOfLines={1}
              >
                {timeGreeting}, {data.name}!
              </Text>
              <MaterialCommunityIcons
                name={greetingIcon as any}
                size={15}
                color={hour < 18 ? '#f59e0b' : '#818cf8'}
                style={styles.greetingIconStyle}
              />
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text
                style={[
                  styles.statusText,
                  isDarkMode ? styles.statusTextDark : styles.statusTextLight,
                ]}
                numberOfLines={1}
              >
                Systems Online • Chamber Ready
              </Text>
            </View>
          </View>

          {/* Right: Interactive Action / Dismiss Chip */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticSelection();
              hide();
            }}
            style={[
              styles.actionButton,
              isDarkMode ? styles.actionButtonDark : styles.actionButtonLight,
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                isDarkMode ? styles.actionTextDark : styles.actionTextLight,
              ]}
            >
              Ready
            </Text>
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={isDarkMode ? '#34d399' : '#059669'}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* Animated Progress Timer Line */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
  },
  hudCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  hudCardDark: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1.2,
  },
  hudCardLight: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1.2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconContainer: {
    position: 'relative',
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radarRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  iconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconInnerLight: {
    backgroundColor: '#ecfdf5',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  textWhite: {
    color: '#f8fafc',
  },
  textDark: {
    color: '#0f172a',
  },
  greetingIconStyle: {
    marginLeft: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  statusTextDark: {
    color: '#94a3b8',
  },
  statusTextLight: {
    color: '#64748b',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginLeft: 8,
  },
  actionButtonDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonLight: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  actionButtonText: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  actionTextDark: {
    color: '#34d399',
  },
  actionTextLight: {
    color: '#059669',
  },
  progressTrack: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
});
