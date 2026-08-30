import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../tailwind';

interface ControlCardProps {
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onTargetChange?: (value: number) => void;
  manualOn?: boolean;
  onManualToggle?: (value: boolean) => void;
  disabled?: boolean;
}

export default function ControlCard({
  title, icon, color, bgColor, currentValue, targetValue: initialTarget, unit, min, max, step,
  onTargetChange, manualOn = false, onManualToggle, disabled = false
}: ControlCardProps) {
  const [targetValue, setTargetValue] = useState(initialTarget);
  const [isManualOn, setIsManualOn] = useState(manualOn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Sync with prop changes if external
  useEffect(() => {
    setTargetValue(initialTarget);
  }, [initialTarget]);

  useEffect(() => {
    setIsManualOn(manualOn);
  }, [manualOn]);

  // Debounce the save to Firebase so we don't spam it while tapping rapidly
  useEffect(() => {
    if (targetValue === initialTarget) return;
    const handler = setTimeout(() => {
      if (onTargetChange) {
        onTargetChange(targetValue);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [targetValue]);

  const handleToggle = (val: boolean) => {
    if (disabled) return;
    setIsManualOn(val);
    if (onManualToggle) {
      onManualToggle(val);
    }
  };

  const increment = useCallback(() => {
    setTargetValue(prev => {
      const next = prev + step;
      return next > max ? max : Number(next.toFixed(1));
    });
  }, [step, max]);

  const decrement = useCallback(() => {
    setTargetValue(prev => {
      const next = prev - step;
      return next < min ? min : Number(next.toFixed(1));
    });
  }, [step, min]);

  const startIncrement = () => {
    increment();
    timerRef.current = setInterval(increment, 150);
  };

  const startDecrement = () => {
    decrement();
    timerRef.current = setInterval(decrement, 150);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <View style={tw`bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50 rounded-[20px] p-3.5 shadow-sm mb-3.5 w-[48%]`}>
      
      {/* TOP ROW: Icon + Switch */}
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View style={[tw`w-9 h-9 rounded-[10px] items-center justify-center shadow-sm`, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={icon} size={18} color={color} />
        </View>
        <View style={tw`items-end`}>
          <Switch 
            value={isManualOn}
            onValueChange={handleToggle}
            disabled={disabled}
            trackColor={{ false: tw.color('dark:bg-slate-700') || '#f1f5f9', true: disabled ? '#86efac' : '#166534' }}
            thumbColor={'#ffffff'}
            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }], marginRight: -10, marginTop: -6 }}
          />
          <Text style={[tw`text-[7px] ${isManualOn ? 'text-emerald-600' : 'text-gray-400'} uppercase -mr-2`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 0.5}]}>
            {isManualOn ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* MIDDLE ROW: Title & Info */}
      <View style={tw`mb-4`}>
         <Text style={[tw`text-[14px] text-gray-800 dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.2}]} numberOfLines={1}>{title}</Text>
         
         <Text style={[tw`text-[9px] text-gray-400 dark:text-slate-500 mt-0.5`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
           Range: {min} - {max}{unit.trim()}
         </Text>
      </View>

      {/* BOTTOM ROW: Stepper */}
      <View style={tw`flex-row items-center justify-between bg-gray-50 dark:bg-slate-900/40 rounded-xl p-1`}>
        
        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          activeOpacity={0.7}
          onPressIn={startDecrement}
          onPressOut={stopTimer}
          style={tw`w-8 h-8 bg-white dark:bg-slate-700 rounded-lg items-center justify-center shadow-sm border border-gray-100 dark:border-slate-600`}
        >
          <MaterialCommunityIcons name="minus" size={16} color={targetValue <= min ? '#d1d5db' : '#166534'} />
        </TouchableOpacity>

        <View style={tw`items-center flex-1`}>
           <Text style={[tw`text-[16px] text-gray-800 dark:text-slate-100 leading-none mt-0.5`, {fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.5}]}>
              {targetValue.toFixed(title === 'Temperature' ? 1 : 0)}
           </Text>
           <Text style={[tw`text-[8px] text-gray-400 dark:text-slate-500 font-bold mt-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{unit.trim()}</Text>
        </View>

        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
          activeOpacity={0.7}
          onPressIn={startIncrement}
          onPressOut={stopTimer}
          style={tw`w-8 h-8 bg-white dark:bg-slate-700 rounded-lg items-center justify-center shadow-sm border border-gray-100 dark:border-slate-600`}
        >
          <MaterialCommunityIcons name="plus" size={16} color={targetValue >= max ? '#d1d5db' : '#166534'} />
        </TouchableOpacity>
        
      </View>
    </View>
  );
}
