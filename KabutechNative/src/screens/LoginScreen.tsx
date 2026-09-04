import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar, Keyboard } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// @ts-ignore
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, inMemoryPersistence, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import Svg, { Path } from 'react-native-svg';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import { showWelcomeHud } from '../components/InteractiveWelcomeHud';
import { SoundManager } from '../utils/SoundManager';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import { useResponsive } from '../utils/responsive';

export default function LoginScreen() {
  const { height, isShortScreen, isSmallDevice } = useResponsive();
  const headerHeight = Math.min(420, Math.max(260, isShortScreen ? height * 0.38 : height * 0.45));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Logging in...');
  const showNotification = (title: string, message?: string, type: 'error' | 'success' | 'info' = 'error') => {
    showToast({
      type,
      text1: title,
      text2: message,
      duration: 3500,
      forceTheme: 'light',
    });
  };

  const passwordRef = useRef<TextInput>(null);
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showNotification('Missing Information', 'Please enter your email and password.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setLoadingText('Logging in...');

    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        if (attempt > 0) {
          setLoadingText(`Retrying... (${attempt}/${maxRetries})`);
          // Wait 2 seconds before retrying to let the network stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (rememberMe) {
          try {
            await setPersistence(auth, getReactNativePersistence(AsyncStorage));
          } catch {}
        }

        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        success = true;
        Keyboard.dismiss();

        // Non-blocking greeting fetch with 1.5s timeout race so database delay never blocks transition
        (async () => {
          try {
            const userRef = ref(db, `kabutech/users/${userCredential.user.uid}`);
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
            const snapshotPromise = get(userRef);
            const snapshot: any = await Promise.race([snapshotPromise, timeoutPromise]);

            let firstName = userCredential.user.displayName?.split(' ')[0] || 'User';
            let role = 'Admin';
            if (snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) {
              const data = snapshot.val();
              const fullName = data.name || userCredential.user.displayName || 'User';
              firstName = fullName.split(' ')[0] || 'User';
              role = data.role || 'Admin';
            }

            setTimeout(() => {
              showWelcomeHud({ name: firstName, role, duration: 4000 });
            }, 450);
          } catch {
            setTimeout(() => {
              showWelcomeHud({ name: 'User', role: 'Admin', duration: 4000 });
            }, 450);
          }
        })();
      } catch (error: any) {
        attempt++;
        
        if (error.code === 'auth/network-request-failed') {
          if (attempt >= maxRetries) {
            setLoading(false);
            showNotification('Network Error', 'Unable to connect. Please check your connection and try again.');
            return;
          }
          // Continue to next loop iteration to retry
        } else {
          setLoading(false);
          if (
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/invalid-credential' ||
            error.code === 'auth/invalid-email'
          ) {
            showNotification('Login Failed', 'Invalid email or password.');
          } else if (error.code === 'auth/too-many-requests') {
            showNotification('Too Many Attempts', 'Too many failed attempts. Please try again later.');
          } else {
            const msg = error.message ? error.message.replace(/^Firebase:\s*/, '') : 'Login failed. Please try again.';
            showNotification('Login Failed', msg);
          }
          return;
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    if (!email) {
      showNotification('Missing Email', 'Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast({ 
        type: 'success', 
        text1: 'Email Sent', 
        text2: 'If an account exists, a password reset link has been sent to your inbox.',
        duration: 5000,
        forceTheme: 'light',
      });
    } catch (error: any) {
      showNotification('Reset Failed', 'Failed to send reset email. Ensure your email is correct.');
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior="padding"
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow`}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Header Image with SVG Wave */}
          <View style={[tw`w-full relative overflow-hidden bg-white`, { height: headerHeight }]}>
            <Image
              source={require('../../assets/mushroom_bg.png')}
              style={tw`w-full h-full absolute`}
              resizeMode="cover"
            />

            {/* SVG White Wave overlayed at the bottom of the image */}
            <View style={[tw`absolute bottom-0 w-full`, { height: Math.min(100, headerHeight * 0.3) }]}>
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path
                  fill="#ffffff"
                  d="M0,160 C480,420 960,-100 1440,160 L1440,320 L0,320 Z"
                />
              </Svg>
            </View>
          </View>

          {/* Form Area */}
          <View style={tw`flex-1 px-6 sm:px-8 -mt-2 sm:-mt-3 pt-1 sm:pt-2 pb-6 relative`}>

            <View style={tw`mb-5 sm:mb-7`}>
              <Text style={[tw`text-[28px] sm:text-[34px] text-slate-800 text-center tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Welcome back
              </Text>
              <Text style={[tw`text-xs sm:text-sm text-slate-400 text-center mt-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Login to your account
              </Text>
            </View>

            {/* Email Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
              <Ionicons name="mail" size={18} color="#9ca3af" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                style={[tw`flex-1 py-4 pl-3 text-[13px] text-slate-800`, { fontFamily: 'PlusJakartaSans_700Bold' }]}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Password Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
              <Ionicons name="lock-closed" size={18} color="#9ca3af" />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                style={[tw`flex-1 py-4 pl-3 pr-10 text-[13px] text-slate-800`, { fontFamily: 'PlusJakartaSans_700Bold' }]}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                onPress={() => setShowPassword(!showPassword)}
                style={tw`absolute right-0 h-full px-4 justify-center z-10`}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={tw`flex-row items-center justify-between mb-7 px-1`}>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                style={tw`flex-row items-center`}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  tw`w-5 h-5 rounded-md items-center justify-center mr-2 border-[1.5px]`,
                  rememberMe ? tw`bg-[#3d8c63] border-[#3d8c63] shadow-sm` : tw`bg-white border-slate-300`
                ]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <Text style={[tw`text-[12px] text-slate-600`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Remember me
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                onPress={handleForgotPassword}
              >
                <Text style={[tw`text-[11px] text-[#3d8c63]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
              onPress={handleLogin}
              disabled={loading}
              style={tw`w-full bg-[#3d8c63] py-4 rounded-full flex-row items-center justify-center shadow-lg mb-6 ${loading ? 'opacity-70' : ''}`}
            >
              <Text style={[tw`text-white text-[15px] mr-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {loading ? loadingText : 'Login'}
              </Text>
              {!loading && <Ionicons name="arrow-forward-circle" size={20} color="#ffffff" />}
            </TouchableOpacity>

            <View style={tw`flex-row justify-center items-center`}>
              <Text style={[tw`text-[12px] text-slate-400 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.6}
              >
                <Text style={[tw`text-[12px] text-[#3d8c63] underline`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
