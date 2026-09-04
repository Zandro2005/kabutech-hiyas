import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Image, Keyboard } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SoundManager } from '../utils/SoundManager';
import Svg, { Path } from 'react-native-svg';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../services/firebase';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { useResponsive } from '../utils/responsive';

import { showToast } from '../components/CustomToast';

export default function RegisterScreen() {
  const { height, isShortScreen, isSmallDevice } = useResponsive();
  const headerHeight = Math.min(200, Math.max(140, isShortScreen ? height * 0.2 : height * 0.25));

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const showNotification = (title: string, message?: string, type: 'error' | 'success' | 'info' = 'error') => {
    showToast({
      type,
      text1: title,
      text2: message,
      duration: 3500,
      forceTheme: 'light',
    });
  };

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      showNotification('Missing Information', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      showNotification('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      showNotification('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      showNotification('Password Requirement', 'Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
      showNotification('Password Requirement', 'Password must be alphanumeric (letters and numbers).');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);

    // 10-second timeout: if request is still pending after 10s, report network error once
    let timedOut = false;
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      showNotification('Network Error', 'Please check your internet connection.');
    }, 10000);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      clearTimeout(timeoutTimer);
      Keyboard.dismiss();
      
      // Update Auth Profile
      await updateProfile(userCredential.user, {
        displayName: fullName.trim()
      });

      // Insert minimal user record into database
      await set(ref(db, `kabutech/users/${userCredential.user.uid}`), {
        email: email.trim(),
        name: fullName.trim(),
        role: 'staff',
        approved: false,
        createdAt: new Date().toISOString()
      });
      
      // Navigation handled via AuthContext
    } catch (error: any) {
      clearTimeout(timeoutTimer);
      if (timedOut) return;
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        showNotification('Email In Use', 'This email is already registered.');
      } else if (error.code === 'auth/invalid-email') {
        showNotification('Invalid Email', 'Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        showNotification('Password Error', 'Password does not meet the security requirements.');
      } else if (error.code === 'auth/network-request-failed') {
        showNotification('Network Error', 'Please check your internet connection.');
      } else {
        const friendlyMessage = error.message
          ? error.message.replace(/^Firebase:\s*/, '').replace(/\(auth\/.*?\)\.?/, '').trim()
          : 'Registration failed. Please try again.';
        showNotification('Registration Failed', friendlyMessage);
      }
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
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
          
          {/* Header Image with SVG Wave (Compact Design) */}
          <View style={[tw`w-full relative overflow-hidden bg-white`, { height: headerHeight }]}>
            <Image 
              source={require('../../assets/realistic_mushrooms_bg.png')} 
              style={tw`w-full h-full absolute`}
              resizeMode="cover"
            />
            
            {/* SVG White Wave overlayed at the bottom of the image */}
            <View style={[tw`absolute bottom-0 w-full`, { height: Math.min(80, headerHeight * 0.45) }]}>
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path 
                  fill="#ffffff" 
                  d="M0,160 C480,420 960,-100 1440,160 L1440,320 L0,320 Z" 
                />
              </Svg>
            </View>
          </View>

          {/* Form Area */}
          <View style={tw`flex-1 px-6 sm:px-8 pt-3 sm:pt-4 pb-6 relative`}>

            <View style={tw`mb-4 sm:mb-6`}>
              <Text style={[tw`text-[28px] sm:text-[34px] text-slate-800 text-center tracking-tight`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Register
              </Text>
              <Text style={[tw`text-xs sm:text-sm text-slate-400 text-center mt-1.5`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Create your new account
              </Text>
            </View>

            {/* Full Name Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
              <Ionicons name="person" size={18} color="#9ca3af" />
              <TextInput 
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                style={[tw`flex-1 py-4 pl-3 text-[13px] text-slate-800`, { fontFamily: 'PlusJakartaSans_700Bold' }]}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Email Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
              <Ionicons name="mail" size={18} color="#9ca3af" />
              <TextInput 
                ref={emailRef}
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
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={() => setShowPassword(!showPassword)} 
                style={tw`absolute right-0 h-full px-4 justify-center z-10`}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-5 px-4`}>
              <Ionicons name="shield-checkmark" size={18} color="#9ca3af" />
              <TextInput 
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                style={[tw`flex-1 py-4 pl-3 pr-10 text-[13px] text-slate-800`, { fontFamily: 'PlusJakartaSans_700Bold' }]}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                style={tw`absolute right-0 h-full px-4 justify-center z-10`}
              >
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={[tw`text-center text-[10px] text-slate-400 mb-6 px-4 leading-relaxed`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              By signing you agree to our <Text style={tw`text-slate-500`}>Term of use</Text> and <Text style={tw`text-slate-500`}>privacy notice</Text>
            </Text>

            {/* Submit Button */}
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={handleRegister} 
              disabled={loading}
              style={tw`w-full bg-[#3d8c63] py-4 rounded-full flex-row items-center justify-center shadow-lg mt-2 mb-5 ${loading ? 'opacity-70' : ''}`}
            >
              <Text style={[tw`text-white text-[15px] mr-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Text>
              {!loading && <Ionicons name="person-add" size={18} color="#ffffff" />}
            </TouchableOpacity>

            <View style={tw`flex-row justify-center items-center pb-4`}>
              <Text style={[tw`text-[12px] text-slate-400 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Already have an account?
              </Text>
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={() => navigation.navigate('Login')} 
                activeOpacity={0.6}
              >
                <Text style={[tw`text-[12px] text-[#3d8c63] underline`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
