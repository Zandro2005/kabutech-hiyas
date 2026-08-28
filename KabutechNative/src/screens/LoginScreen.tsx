import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import Svg, { Path } from 'react-native-svg';
import tw from '../tailwind';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      setLoading(false);
      setErrorMsg('Invalid email or password.');
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
          
          {/* Header Image with SVG Wave */}
          <View style={tw`w-full h-[320px] relative overflow-hidden bg-white`}>
            <Image 
              source={require('../../assets/mushroom_bg.png')} 
              style={tw`w-full h-full absolute`}
              resizeMode="cover"
            />
            
            {/* SVG White Wave overlayed at the bottom of the image */}
            <View style={tw`absolute bottom-0 w-full h-[120px]`}>
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path 
                  fill="#ffffff" 
                  d="M0,160 C320,350 800,350 1440,0 L1440,320 L0,320 Z" 
                />
              </Svg>
            </View>
            
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={tw`absolute top-12 left-6 w-10 h-10 bg-white/30 rounded-full items-center justify-center`}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Form Area */}
          <View style={tw`flex-1 px-8 pt-8 pb-6 relative`}>
            
            {/* Floating Mushroom Icon instead of Leaf */}
            <View style={tw`absolute right-8 top-4 opacity-80`}>
              <MaterialCommunityIcons name="mushroom-outline" size={42} color="#3d8c63" style={{ transform: [{ rotate: '15deg' }] }} />
            </View>

            <View style={tw`mb-8`}>
              <Text style={[tw`text-3xl text-slate-800 text-center`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                Welcome back
              </Text>
              <Text style={[tw`text-sm text-slate-400 text-center mt-2`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Login to your account
              </Text>
            </View>

            {/* Email Field */}
            <View style={tw`relative flex-row items-center w-full bg-[#f3f4f6] rounded-2xl mb-4 px-4`}>
              <MaterialCommunityIcons name="email-outline" size={18} color="#9ca3af" />
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
              <MaterialCommunityIcons name="lock-outline" size={18} color="#9ca3af" />
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
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={tw`absolute right-0 h-full px-4 justify-center z-10`}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={tw`flex-row items-center justify-between mb-8 px-1`}>
              <TouchableOpacity 
                onPress={() => setRememberMe(!rememberMe)} 
                style={tw`flex-row items-center`}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <View style={tw`w-4 h-4 rounded-full border ${rememberMe ? 'bg-[#3d8c63] border-[#3d8c63]' : 'border-gray-300'} items-center justify-center mr-2`}>
                  {rememberMe && <MaterialCommunityIcons name="check" size={10} color="white" />}
                </View>
                <Text style={[tw`text-[11px] text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Text style={[tw`text-[11px] text-slate-500`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <Text style={tw`text-red-500 text-center mb-4 text-xs font-bold`}>{errorMsg}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity 
              onPress={handleLogin} 
              disabled={loading}
              style={tw`w-full bg-[#3d8c63] py-4 rounded-full items-center shadow-lg mb-6 ${loading ? 'opacity-70' : ''}`}
            >
              <Text style={[tw`text-white text-[15px]`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            <View style={tw`flex-row justify-center items-center`}>
              <Text style={[tw`text-[12px] text-slate-400 mr-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Register')} 
                activeOpacity={0.6}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
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
