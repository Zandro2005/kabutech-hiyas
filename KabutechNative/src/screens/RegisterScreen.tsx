import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../services/firebase';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMsg('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
      setErrorMsg('Password must be alphanumeric (contain both letters and numbers).');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update Auth Profile
      await updateProfile(userCredential.user, {
        displayName: fullName.trim()
      });

      // Insert minimal user record into database
      await set(ref(db, `kabutech/users/${userCredential.user.uid}`), {
        email: email.trim(),
        name: fullName.trim(),
        role: 'operator',
        approved: true,
        createdAt: new Date().toISOString()
      });
      
      // Navigation handled via AuthContext
    } catch (error: any) {
      setLoading(false);
      let friendlyMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        // Firebase Identity Platform returns detailed policy errors in error.message
        friendlyMessage = error.message ? error.message.replace(/^Firebase:\s*/, '').replace(/\(auth\/weak-password\)\.?/, '').trim() : 'Password does not meet the security requirements.';
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        // Fallback to error message but remove the "Firebase: " prefix if present
        friendlyMessage = error.message.replace(/^Firebase:\s*/, '').replace(/\(auth\/.*?\)\.?/, '').trim();
      }
      setErrorMsg(friendlyMessage);
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={tw`flex-grow`} 
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Header Image with SVG Wave (Compact Design) */}
          <View style={tw`w-full h-[200px] relative overflow-hidden bg-white`}>
            <Image 
              source={require('../../assets/realistic_mushrooms_bg.png')} 
              style={tw`w-full h-full absolute`}
              resizeMode="cover"
            />
            
            {/* SVG White Wave overlayed at the bottom of the image */}
            <View style={tw`absolute bottom-0 w-full h-[80px]`}>
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path 
                  fill="#ffffff" 
                  d="M0,160 C480,420 960,-100 1440,160 L1440,320 L0,320 Z" 
                />
              </Svg>
            </View>
          </View>

          {/* Form Area */}
          <View style={tw`flex-1 px-8 pt-4 pb-6 relative`}>

            <View style={tw`mb-6`}>
            <View style={tw`flex-row items-center justify-center`}>
              <Text style={[tw`text-3xl text-slate-800 text-center`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Register
              </Text>
              <MaterialCommunityIcons 
                name="mushroom" 
                size={32} 
                color="#3d8c63" 
                style={[tw`ml-2 mt-1`, { transform: [{ rotate: '15deg' }] }]} 
              />
            </View>
            <Text style={[tw`text-sm text-slate-400 text-center mt-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Create your new account
            </Text>
          </View>

          {/* Full Name Field */}
          <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
            <MaterialCommunityIcons name="account-outline" size={18} color="#9ca3af" />
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
            <MaterialCommunityIcons name="email-outline" size={18} color="#9ca3af" />
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
            <MaterialCommunityIcons name="lock-outline" size={18} color="#9ca3af" />
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
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)} 
              style={tw`absolute right-0 h-full px-4 justify-center z-10`}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Field */}
          <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-8 px-4`}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#9ca3af" />
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
            <TouchableOpacity 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
              style={tw`absolute right-0 h-full px-4 justify-center z-10`}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <MaterialCommunityIcons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={[tw`text-center text-[10px] text-slate-400 mb-8 px-4 leading-relaxed`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
            By signing you agree to our <Text style={tw`text-slate-500`}>Term of use</Text> and <Text style={tw`text-slate-500`}>privacy notice</Text>
          </Text>

          {errorMsg ? (
            <Text style={tw`text-red-500 text-center mb-4 text-xs font-bold`}>{errorMsg}</Text>
          ) : null}

          {/* Spacer to push buttons down */}
          <View style={tw`flex-1`} />

          {/* Submit Button */}
          <TouchableOpacity 
            onPress={handleRegister} 
            disabled={loading}
            style={tw`w-full bg-[#3d8c63] py-4 rounded-full items-center shadow-lg mb-6 ${loading ? 'opacity-70' : ''}`}
          >
            <Text style={[tw`text-white text-[15px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={tw`flex-row justify-center items-center`}>
            <Text style={[tw`text-[12px] text-slate-400 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
              Already have an account?
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')} 
              activeOpacity={0.6}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
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
