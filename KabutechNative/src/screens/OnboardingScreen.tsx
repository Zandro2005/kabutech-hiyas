import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlobalNavigationParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 0,
    title: 'Track Your Growth',
    description: 'Monitor your farm operations and harvests in real-time.',
    icon: 'sprout',
  },
  {
    id: 1,
    title: 'Manage with Ease',
    description: 'Organize your workflow and manage tasks easily in one simple, powerful app.',
    icon: 'clipboard-text-outline',
  },
  {
    id: 2,
    title: 'Grow Together',
    description: 'Connect with your team and scale your agricultural business.',
    icon: 'account-group',
    image: require('../../assets/onboarding.jpg'),
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GlobalNavigationParamList>>();
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== activeSlide) {
      setActiveSlide(slide);
    }
  };

  const skipToLogin = () => {
    navigation.replace('Login');
  };

  const nextSlide = () => {
    if (activeSlide < slides.length - 1) {
      // We would ideally use a ref to the ScrollView to scroll to the next slide
      // But for simplicity in this initial version we'll just update state (which won't scroll)
      // A better approach is using FlatList or a ScrollView ref.
      console.log("Next slide requested");
    } else {
      skipToLogin();
    }
  };

  return (
    <View style={tw`flex-1 bg-[#d8f0de]`}>
      <View style={tw`flex-row justify-between items-center px-6 pt-4 z-10`}>
        <View style={tw`flex-row items-center gap-2`}>
          <MaterialCommunityIcons name="flower" size={20} color="#004521" />
          <Text style={tw`font-bold text-[#004521]`}>KabuTech</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={skipToLogin}>
          <Text style={tw`font-semibold text-[#004521]/70`}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={tw`flex-1`}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={[{ width }, tw`flex-1 items-center justify-end pb-8`]}>
            
            {/* Visual Header */}
            <View style={tw`flex-1 w-full items-center justify-center`}>
              {slide.image ? (
                <View style={tw`w-11/12 aspect-video rounded-2xl overflow-hidden mb-8`}>
                  <Image source={slide.image} style={tw`w-full h-full`} resizeMode="cover" />
                </View>
              ) : (
                <View style={tw`w-32 h-32 bg-white rounded-full items-center justify-center shadow-lg`}>
                   {index === 0 ? (
                      <Image source={require('../../assets/logo.png')} style={tw`w-full h-full rounded-full`} />
                   ) : (
                      <MaterialCommunityIcons name={slide.icon as any} size={56} color="#004521" />
                   )}
                </View>
              )}
            </View>

            {/* Bottom Card */}
            <View style={tw`w-full px-6 items-center`}>
              <Text style={tw`text-2xl font-extrabold text-[#004521] mb-2`}>{slide.title}</Text>
              <Text style={tw`text-base text-gray-600 text-center px-4 mb-8`}>
                {slide.description}
              </Text>

              {/* Dots */}
              <View style={tw`flex-row gap-2 mb-8`}>
                {slides.map((_, dotIndex) => (
                  <View 
                    key={dotIndex} 
                    style={[
                      tw`h-2 rounded-full`, 
                      { width: dotIndex === activeSlide ? 24 : 8, backgroundColor: dotIndex === activeSlide ? '#004521' : '#a3b8aa' }
                    ]} 
                  />
                ))}
              </View>

              <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                onPress={activeSlide === slides.length - 1 ? skipToLogin : () => {
                  // TODO: Scroll to next index programmatically
                  console.log("Use swipe for now");
                }}
                style={tw`w-full h-14 bg-[#004521] rounded-xl items-center justify-center flex-row shadow-lg`}
              >
                <Text style={tw`text-white font-bold text-lg mr-2`}>
                  {activeSlide === slides.length - 1 ? "Get Started" : "Continue"}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
