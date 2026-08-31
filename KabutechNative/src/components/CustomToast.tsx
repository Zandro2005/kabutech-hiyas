import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SoundManager } from '../utils/SoundManager';
import { hapticSuccess, hapticError } from '../utils/haptics';

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text1: string;
  text2?: string;
  duration?: number;
}

let globalShowToast: ((msg: ToastMessage) => void) | null = null;

export const showToast = (msg: ToastMessage) => {
  if (globalShowToast) {
    globalShowToast(msg);
  }
};

export default function CustomToast() {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<ToastMessage | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMessage(null));
  }, [translateY, opacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50 || Math.abs(gestureState.vx) > 0.5) {
          const direction = gestureState.dx > 0 ? 1 : -1;
          Animated.parallel([
            Animated.timing(translateX, { toValue: direction * 400, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start(() => setMessage(null));
        } else {
          Animated.spring(translateX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const show = useCallback((msg: ToastMessage) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);

    // Trigger sounds and haptics
    if (msg.type === 'success') {
      SoundManager.playSuccess();
      hapticSuccess();
    } else if (msg.type === 'error') {
      SoundManager.playError();
      hapticError();
    } else if (msg.type === 'info') {
      SoundManager.playRing();
    }

    translateY.setValue(-120);
    translateX.setValue(0);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(hide, msg.duration || 2500);
  }, [translateY, opacity, hide]);

  useEffect(() => {
    globalShowToast = show;
    return () => { globalShowToast = null; };
  }, [show]);

  if (!message) return null;

  const isSuccess = message.type === 'success';
  const isInfo = message.type === 'info';
  
  const iconName = isSuccess ? 'check-circle' : isInfo ? 'information' : 'alert-circle';
  const borderColor = isSuccess ? '#10b981' : isInfo ? '#3b82f6' : '#ef4444';
  const iconColor = isSuccess ? (isDarkMode ? '#34d399' : '#10b981') : isInfo ? (isDarkMode ? '#60a5fa' : '#3b82f6') : (isDarkMode ? '#f87171' : '#ef4444');

  // Dark Mode vs Light Mode Color Palettes
  const bgColor = isDarkMode 
    ? (isSuccess ? '#062d20' : isInfo ? '#0c1e3d' : '#2d0a0a')
    : (isSuccess ? '#f0fdf4' : isInfo ? '#eff6ff' : '#fef2f2');

  const titleColor = isDarkMode
    ? '#ffffff'
    : (isSuccess ? '#064e3b' : isInfo ? '#1e3a8a' : '#7f1d1d');

  const bodyColor = isDarkMode
    ? (isSuccess ? '#a7f3d0' : isInfo ? '#bfdbfe' : '#fecaca')
    : (isSuccess ? '#166534' : isInfo ? '#1e40af' : '#991b1b');

  const topOffset = Math.max(insets.top + 10, 48);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          top: topOffset,
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
          transform: [{ translateY }, { translateX }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: titleColor }]}>{message.text1}</Text>
        {message.text2 ? (
          <Text style={[styles.body, { color: bodyColor }]} numberOfLines={2}>{message.text2}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderLeftWidth: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 99999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  iconWrap: {
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  body: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 2,
  },
});
