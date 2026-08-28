import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update Auth Profile
      await updateProfile(userCredential.user, {
        displayName: fullName.trim()
      });

      // Insert minimal user record into database
      await set(ref(db, `users/${userCredential.user.uid}`), {
        email: email.trim(),
        name: fullName.trim(),
        role: 'operator',
        createdAt: new Date().toISOString()
      });
      
      // Navigation handled via AuthContext
    } catch (error: any) {
      setLoading(false);
      setErrorMsg(error.message);
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
          contentContainerStyle={tw`flex-grow px-8 pt-20 pb-6 relative`} 
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 bg-[#f3f4f6] rounded-full items-center justify-center mb-8`}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#64748b" />
          </TouchableOpacity>

          {/* Floating Mushroom Icon instead of Leaf */}
          <View style={tw`absolute right-8 top-28 opacity-80 z-10`}>
            <MaterialCommunityIcons name="mushroom-outline" size={48} color="#3d8c63" style={{ transform: [{ rotate: '-15deg' }] }} />
          </View>

          <View style={tw`mb-10 mt-4`}>
            <Text style={[tw`text-3xl text-slate-800 text-center`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
              Register
            </Text>
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
          
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
