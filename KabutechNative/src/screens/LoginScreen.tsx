import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// @ts-ignore
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, inMemoryPersistence, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { showToast } from '../components/CustomToast';
import { SoundManager } from '../utils/SoundManager';
import * as Speech from 'expo-speech';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import { VolumeManager } from 'react-native-volume-manager';
import RealisticMushroomIcon from '../components/RealisticMushroomIcon';

export default function LoginScreen() {
  // Warm up TTS engine on mount to eliminate initial delay
  React.useEffect(() => {
    Speech.speak('', { rate: 0, volume: 0 });
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, _setErrorMsg] = useState('');
  const setErrorMsg = (msg: string) => {
    if (msg) SoundManager.playError();
    _setErrorMsg(msg);
  };

  const passwordRef = useRef<TextInput>(null);
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (rememberMe) {
        await setPersistence(auth, getReactNativePersistence(AsyncStorage));
      } else {
        await setPersistence(auth, inMemoryPersistence);
      }
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Fetch user data for personalized greeting
      const userRef = ref(db, `kabutech/users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const fullName = data.name || 'User';
        const firstName = fullName.split(' ')[0];

        setTimeout(async () => {
          await VolumeManager.setVolume(1, { showUI: false });
          
          const hour = new Date().getHours();
          let greeting = 'Good evening';
          if (hour < 12) greeting = 'Good morning';
          else if (hour < 18) greeting = 'Good afternoon';
          
          // Jarvis-like advanced British AI voice (Lady tone)
          Speech.speak(`${greeting} ${firstName}. All Kabutech systems are online and fully operational. Welcome back.`, {
            language: 'en-GB', 
            rate: 0.9,
            pitch: 1.1,
          });
        }, 600); // 600ms wait ensures the dashboard has transitioned and rendered before speaking
      }
    } catch (error: any) {
      setLoading(false);
      setErrorMsg('Invalid email or password.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast({ 
        type: 'success', 
        text1: 'Email Sent', 
        text2: 'If an account exists, a password reset link has been sent to your inbox.',
        duration: 5000
      });
      setErrorMsg('');
    } catch (error: any) {
      setErrorMsg('Failed to send reset email. Ensure your email is correct.');
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
          <View style={tw`w-full h-[320px] relative overflow-hidden bg-white`}>
            <Image
              source={require('../../assets/mushroom_bg.png')}
              style={tw`w-full h-full absolute`}
              resizeMode="cover"
            />

            {/* SVG White Wave overlayed at the bottom of the image with colored wave border */}
            <View style={tw`absolute bottom-0 w-full h-[120px]`}>
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="loginWaveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#2d6a4f" />
                    <Stop offset="50%" stopColor="#52b788" />
                    <Stop offset="100%" stopColor="#3d8c63" />
                  </LinearGradient>
                </Defs>
                <Path
                  fill="#ffffff"
                  d="M0,160 C480,420 960,-100 1440,160 L1440,320 L0,320 Z"
                />
                <Path
                  d="M0,160 C480,420 960,-100 1440,160"
                  stroke="url(#loginWaveStroke)"
                  strokeWidth="16"
                  fill="none"
                />
              </Svg>
            </View>
          </View>

          {/* Form Area */}
          <View style={tw`flex-1 px-8 pt-6 pb-6 relative`}>

            <View style={tw`mb-7`}>
              <View style={tw`flex-row items-center justify-center`}>
                <Text style={[tw`text-3xl text-slate-800 text-center`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  Welcome back
                </Text>
                <View style={tw`ml-2.5 shadow-sm`}>
                  <RealisticMushroomIcon size={34} rotate="12deg" />
                </View>
              </View>
              <Text style={[tw`text-sm text-slate-400 text-center mt-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
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

            {errorMsg ? (
              <Text style={tw`text-red-500 text-center mb-4 text-xs font-bold`}>{errorMsg}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
              onPress={handleLogin}
              disabled={loading}
              style={tw`w-full bg-[#3d8c63] py-4 rounded-full flex-row items-center justify-center shadow-lg mb-6 ${loading ? 'opacity-70' : ''}`}
            >
              <Text style={[tw`text-white text-[15px] mr-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {loading ? 'Logging in...' : 'Login'}
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
