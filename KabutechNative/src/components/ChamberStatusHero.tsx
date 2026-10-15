import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import tw from '../tailwind';
import { useAuth } from '../context/AuthContext';
import { hapticSelection } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { ChamberEvaluation, ParamEvaluation } from '../utils/environmentRanges';
import { showToast } from './CustomToast'; // Toast notifications

interface Props {
  evaluation: ChamberEvaluation;
  isAuto: boolean;
  isScheduled?: boolean;
  isDarkMode: boolean;
  isOffline?: boolean;
  secondsSinceUpdate?: number | null;
  navigation: any;
  hasWarning?: boolean;
  readOnly?: boolean;
}

export default React.memo(function ChamberStatusHero({
  evaluation,
  isAuto,
  isScheduled = false,
  isDarkMode,
  isOffline = false,
  secondsSinceUpdate,
  navigation,
  hasWarning = false,
  readOnly = false,
}: Props) {
  const { profile } = useAuth();
  const { isSmallDevice } = useResponsive();
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isRefsExpanded, setIsRefsExpanded] = useState(false);

  const { inRangeCount, total, params, summary, statusLabel, badgeColor, profile: cropProfile } = evaluation;

  // Ultra-sleek hero dial dimensions
  const ringSize = isSmallDevice ? 218 : 242;
  const strokeWidth = isSmallDevice ? 12 : 13;
  const radius = (ringSize - strokeWidth - 6) / 2; // Slight inset for breathing room
  const circumference = 2 * Math.PI * radius;
  const gapPx = 10;
  const arcLength = Math.max(1, circumference / 4 - gapPx);
  const gapAngleDeg = (gapPx / circumference) * 360;

  // Quadrants: 0: Temp (Top-Right), 1: Humidity (Bottom-Right), 2: CO2 (Bottom-Left), 3: Light (Top-Left)
  const segments = [
    { key: 'temp' as const, label: 'Temp', eval: params.temp, baseDeg: -90 },
    { key: 'hum' as const, label: 'Humidity', eval: params.hum, baseDeg: 0 },
    { key: 'co2' as const, label: 'CO₂', eval: params.co2, baseDeg: 90 },
    { key: 'light' as const, label: 'Light', eval: params.light, baseDeg: 180 },
  ];

  const getSegmentStroke = (paramEval: ParamEvaluation) => {
    if (isOffline || paramEval.state === 'fault') {
      return isDarkMode ? '#334155' : '#cbd5e1';
    }
    if (paramEval.state === 'in_range') {
      return 'url(#gradEmerald)';
    }
    if (paramEval.severity === 'critical') {
      return 'url(#gradRose)';
    }
    return 'url(#gradAmber)';
  };

  const formatFreshness = () => {
    if (isOffline) return 'Offline';
    if (secondsSinceUpdate == null) return 'Live';
    if (secondsSinceUpdate <= 5) return 'Just now';
    if (secondsSinceUpdate < 60) return `${secondsSinceUpdate}s ago`;
    const mins = Math.floor(secondsSinceUpdate / 60);
    return `${mins}m ago`;
  };

  return (
    <View style={tw`px-5 sm:px-6 pt-2 pb-1`}>
      {/* 1. Header Row: Operator Greetings & Interactive Mode Badge */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <View style={tw`flex-1 mr-2`}>
          <Text
            numberOfLines={1}
            style={[
              tw`text-xl sm:text-[22px] text-slate-800 dark:text-white tracking-tight leading-tight`,
              { fontFamily: 'PlusJakartaSans_800ExtraBold' }
            ]}
          >
            Hi, {profile?.name ? profile.name.split(' ')[0] : 'Operator'}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              tw`text-xs text-slate-500 dark:text-slate-400 mt-0.5`,
              { fontFamily: 'PlusJakartaSans_500Medium' }
            ]}
          >
            {isOffline 
              ? 'Chamber A • Controller Offline' 
              : (hasWarning ? 'Chamber A • Attention Required' : 'Chamber A • All Systems Active')}
          </Text>
        </View>

        {/* Modern Mode Pill Badge */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticSelection();
            if (profile?.role !== 'staff' && !readOnly) {
              navigation.navigate('Main', { screen: 'Controls' });
            } else {
              showToast({
                type: 'info',
                text1: `System Mode: ${isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}`,
                text2: 'System mode is managed by Farm Administrators.',
                duration: 2500,
              });
            }
          }}
          style={[
            tw`flex-row items-center px-3 py-1.5 rounded-full border shadow-sm`,
            isAuto
              ? (isDarkMode ? tw`bg-emerald-950/40 border-emerald-700/50` : tw`bg-emerald-50 border-emerald-200/80`)
              : isScheduled
              ? (isDarkMode ? tw`bg-purple-950/40 border-purple-700/50` : tw`bg-purple-50 border-purple-200/80`)
              : (isDarkMode ? tw`bg-amber-950/40 border-amber-700/50` : tw`bg-amber-50 border-amber-200/80`)
          ]}
        >
          <View
            style={[
              tw`w-2 h-2 rounded-full mr-2`,
              { backgroundColor: isAuto ? '#10b981' : isScheduled ? '#a855f7' : '#f59e0b' }
            ]}
          />
          <Text
            style={[
              tw`text-[10px] tracking-wider uppercase`,
              {
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                color: isAuto
                  ? (isDarkMode ? '#34d399' : '#059669')
                  : isScheduled
                  ? (isDarkMode ? '#c084fc' : '#7e22ce')
                  : (isDarkMode ? '#fbbf24' : '#d97706')
              }
            ]}
          >
            {isAuto ? 'AUTO' : isScheduled ? 'SCHEDULED' : 'MANUAL'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Modern 4-Quadrant Status Dial */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          hapticSelection();
          setIsSpecModalOpen(true);
        }}
        style={tw`items-center justify-center my-1.5`}
      >
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              {/* Vibrant High-End Gradients */}
              <SvgGradient id="gradEmerald" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#059669" />
                <Stop offset="100%" stopColor="#34d399" />
              </SvgGradient>

              <SvgGradient id="gradAmber" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#d97706" />
                <Stop offset="100%" stopColor="#fbbf24" />
              </SvgGradient>

              <SvgGradient id="gradRose" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#dc2626" />
                <Stop offset="100%" stopColor="#f87171" />
              </SvgGradient>
            </Defs>

            {/* Faint Outer Guide Track */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius + strokeWidth / 2 + 2}
              stroke={isDarkMode ? 'rgba(51, 65, 85, 0.15)' : 'rgba(203, 213, 225, 0.25)'}
              strokeWidth={1}
              fill="none"
            />

            {/* Inset Ambient Guide Track */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius - strokeWidth / 2 - 2}
              stroke={isDarkMode ? 'rgba(51, 65, 85, 0.15)' : 'rgba(203, 213, 225, 0.25)'}
              strokeWidth={1}
              fill="none"
            />

            {/* High-End Vector Track Circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={isDarkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 1)'}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* 4 Floating Quadrant Arcs */}
            {segments.map((seg) => {
              const strokeVal = getSegmentStroke(seg.eval);
              const rotation = seg.baseDeg + gapAngleDeg / 2;
              return (
                <Circle
                  key={seg.key}
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={strokeVal}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                  strokeLinecap="round"
                  fill="none"
                  origin={`${ringSize / 2}, ${ringSize / 2}`}
                  rotation={rotation}
                />
              );
            })}
          </Svg>

          {/* Inner Glass Bezel Plate for Modern Tactile Depth */}
          <View
            pointerEvents="none"
            style={[
              tw`absolute rounded-full items-center justify-center border`,
              {
                width: ringSize - (strokeWidth * 2 + 18),
                height: ringSize - (strokeWidth * 2 + 18),
              },
              isDarkMode
                ? tw`bg-slate-900/60 border-slate-800/70`
                : tw`bg-white/85 border-slate-200/50 shadow-sm`,
            ]}
          />

          {/* Center Typography: Clean, Modern, Minimal */}
          <View style={tw`absolute items-center justify-center px-4`}>
            <Text
              style={[
                tw`text-[9.5px] uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-1`,
                { fontFamily: 'PlusJakartaSans_700Bold' }
              ]}
            >
              Parameters In Range
            </Text>

            <View style={tw`flex-row items-baseline justify-center mb-1`}>
              <Text
                style={[
                  isOffline ? tw`text-slate-400 dark:text-slate-500` : tw`text-slate-900 dark:text-white`,
                  {
                    fontSize: isSmallDevice ? 46 : 52,
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                    letterSpacing: -1.8,
                    lineHeight: isSmallDevice ? 50 : 56
                  }
                ]}
              >
                {isOffline ? '--' : inRangeCount}
              </Text>
              <Text
                style={[
                  tw`text-lg sm:text-xl text-slate-400 dark:text-slate-500 ml-1`,
                  { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}
              >
                /{total}
              </Text>
            </View>

            {/* Modern Micro Pill */}
            <View
              style={[
                tw`flex-row items-center px-2.5 py-1 rounded-full border shadow-sm`,
                isOffline
                  ? (isDarkMode ? tw`bg-slate-800/80 border-slate-700` : tw`bg-slate-100 border-slate-200`)
                  : (isDarkMode ? tw`bg-slate-900/90 border-slate-700/80` : tw`bg-white border-slate-200/90`)
              ]}
            >
              <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: badgeColor }]} />
              <Text
                style={[
                  tw`text-[10px]`,
                  {
                    fontFamily: 'PlusJakartaSans_700Bold',
                    color: isOffline 
                      ? (isDarkMode ? '#94a3b8' : '#64748b')
                      : (isDarkMode ? '#e2e8f0' : '#1e293b')
                  }
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Sleek Subtitle Row */}
        <View style={tw`items-center mt-2 px-3`}>
          <Text
            numberOfLines={1}
            style={[
              tw`text-xs text-center`,
              isOffline
                ? tw`text-slate-400 dark:text-slate-500`
                : (inRangeCount === 4 ? tw`text-emerald-700 dark:text-emerald-400` : tw`text-slate-700 dark:text-slate-300`),
              { fontFamily: 'PlusJakartaSans_700Bold' }
            ]}
          >
            {summary}
          </Text>

          <View style={tw`flex-row items-center gap-1.5 mt-1`}>
            <Text
              style={[
                tw`text-[10.5px] text-slate-400 dark:text-slate-400`,
                { fontFamily: 'PlusJakartaSans_500Medium' }
              ]}
            >
              {formatFreshness()}
            </Text>
            <Text style={tw`text-slate-300 dark:text-slate-600`}>•</Text>
            <Text
              style={[
                tw`text-[10.5px] text-emerald-600 dark:text-emerald-400`,
                { fontFamily: 'PlusJakartaSans_700Bold' }
              ]}
            >
              Crop Specs ℹ️
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 3. Crop Profile Specifications Modal (Thesis-Ready Literature Inspector) */}
      <Modal
        visible={isSpecModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsSpecModalOpen(false);
          setIsRefsExpanded(false);
        }}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center px-4 py-8`}>
          <View
            style={[
              tw`w-full max-w-md rounded-3xl p-5 border shadow-xl`,
              isDarkMode ? tw`bg-slate-900 border-slate-800` : tw`bg-white border-slate-200`
            ]}
          >
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800`}>
              <View>
                <Text style={[tw`text-lg font-bold text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                  {cropProfile.name}
                </Text>
                <Text style={[tw`text-xs italic text-slate-500 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                  {cropProfile.scientificName} • {cropProfile.stage.toUpperCase()} Stage
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsSpecModalOpen(false);
                  setIsRefsExpanded(false);
                }}
                style={tw`w-8 h-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800`}
              >
                <Ionicons name="close" size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Modal Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              contentContainerStyle={tw`pb-2`}
            >
              {/* Parameter Range Rows */}
              <View style={tw`my-3 gap-y-2.5`}>
                {segments.map((item) => {
                  const isItemInRange = item.eval.state === 'in_range';
                  const isItemFault = item.eval.state === 'fault';
                  return (
                    <View
                      key={item.key}
                      style={[
                        tw`p-3.5 rounded-2xl border`,
                        isDarkMode ? tw`bg-slate-800/60 border-slate-700/60` : tw`bg-slate-50 border-slate-200/80`
                      ]}
                    >
                      <View style={tw`flex-row justify-between items-center mb-1.5`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full`,
                              {
                                backgroundColor: isItemFault
                                  ? '#94a3b8'
                                  : isItemInRange
                                  ? '#10b981'
                                  : item.eval.severity === 'critical'
                                  ? '#ef4444'
                                  : '#f59e0b',
                              }
                            ]}
                          />
                          <Text style={[tw`text-xs font-bold text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                            {item.eval.label}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-baseline gap-1`}>
                          <Text style={[tw`text-xs font-extrabold text-slate-900 dark:text-white`, { fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                            {item.eval.formattedValue} {item.eval.unit}
                          </Text>
                          <Text
                            style={[
                              tw`text-[10px] uppercase font-bold`,
                              isItemFault
                                ? tw`text-slate-400`
                                : isItemInRange
                                ? tw`text-emerald-600 dark:text-emerald-400`
                                : tw`text-amber-600 dark:text-amber-400`,
                              { fontFamily: 'PlusJakartaSans_700Bold' }
                            ]}
                          >
                            ({item.eval.state.replace('_', ' ')})
                          </Text>
                        </View>
                      </View>

                      <Text style={[tw`text-[11px] text-slate-700 dark:text-slate-200 mb-1`, { fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                        Target Range: <Text style={tw`font-bold text-slate-900 dark:text-white`}>{item.eval.rangeText}</Text>
                      </Text>

                      {item.eval.description && (
                        <Text style={[tw`text-[10.5px] text-slate-600 dark:text-slate-300 leading-snug mb-1.5`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                          {item.eval.description}
                        </Text>
                      )}

                      <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-400 italic leading-tight`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                        Ref: {item.eval.source}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Expandable Scientific Literature References Section */}
              {cropProfile.allReferences && cropProfile.allReferences.length > 0 && (
                <View style={tw`mt-2 pt-2 border-t border-slate-200 dark:border-slate-800`}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      hapticSelection();
                      setIsRefsExpanded(!isRefsExpanded);
                    }}
                    style={[
                      tw`p-3 rounded-2xl border flex-row justify-between items-center`,
                      isDarkMode
                        ? tw`bg-slate-800/60 border-slate-700/60`
                        : tw`bg-slate-50 border-slate-200/80`
                    ]}
                  >
                    <View style={tw`flex-row items-center gap-2.5 flex-1 mr-2`}>
                      <View
                        style={[
                          tw`w-7 h-7 rounded-xl items-center justify-center`,
                          isDarkMode ? tw`bg-emerald-950/60` : tw`bg-emerald-100/70`
                        ]}
                      >
                        <Ionicons name="book-outline" size={14} color={isDarkMode ? '#34d399' : '#059669'} />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-xs font-bold text-slate-800 dark:text-white`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                          Literature References ({cropProfile.allReferences.length} Papers)
                        </Text>
                        <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-400`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                          {isRefsExpanded ? 'Tap to collapse bibliography' : 'Tap to expand peer-reviewed citations'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isRefsExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={isDarkMode ? '#94a3b8' : '#64748b'}
                    />
                  </TouchableOpacity>

                  {/* Expanded Bibliography Cards & Rationale */}
                  {isRefsExpanded && (
                    <View style={tw`mt-2.5 gap-y-2`}>
                      {cropProfile.allReferences.map((ref, idx) => (
                        <View
                          key={idx}
                          style={[
                            tw`p-2.5 rounded-xl border`,
                            isDarkMode ? tw`bg-slate-800/40 border-slate-700/40` : tw`bg-slate-50/70 border-slate-200/60`
                          ]}
                        >
                          <View style={tw`flex-row justify-between items-center mb-0.5`}>
                            <Text style={[tw`text-[11px] font-bold text-emerald-600 dark:text-emerald-400`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                              {ref.citation}
                            </Text>
                            <Text style={[tw`text-[10px] text-slate-400 dark:text-slate-500`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                              {ref.year}
                            </Text>
                          </View>
                          <Text style={[tw`text-[10px] text-slate-600 dark:text-slate-300 leading-snug`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                            {ref.finding}
                          </Text>
                        </View>
                      ))}

                      {/* Biological Control Rationale */}
                      <View
                        style={[
                          tw`mt-1 p-3 rounded-2xl border`,
                          isDarkMode ? tw`bg-emerald-950/20 border-emerald-800/40` : tw`bg-emerald-50/70 border-emerald-200/60`
                        ]}
                      >
                        <Text style={[tw`text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                          KabuTech Closed-Loop Regulation Principle
                        </Text>
                        <Text style={[tw`text-[10px] text-emerald-700/90 dark:text-emerald-400/90 leading-snug`, { fontFamily: 'PlusJakartaSans_500Medium' }]}>
                          KabuTech bridges this biological gap by creating an active, predictive regulation system that triggers corrective actuation—including ultrasonic humidification, exhaust ventilation to purge CO₂, misting, and automated artificial lighting arrays—before the indoor climate becomes hazardous to the crop.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => {
                setIsSpecModalOpen(false);
                setIsRefsExpanded(false);
              }}
              style={tw`w-full py-2.5 rounded-2xl bg-emerald-600 items-center justify-center mt-2.5`}
            >
              <Text style={[tw`text-white text-xs font-bold`, { fontFamily: 'PlusJakartaSans_700Bold' }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});
