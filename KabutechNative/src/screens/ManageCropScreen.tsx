import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, FlatList } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import tw from '../tailwind';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { useBatches } from '../hooks/useFirebaseData';
import { getRackStats } from '../utils/dataHelpers';
import { BatchData } from '../types/firebase';
import { remove, ref } from 'firebase/database';
import { db } from '../services/firebase';
import LogHarvestModal from '../components/modals/LogHarvestModal';
import UpdateCapacityModal from '../components/modals/UpdateCapacityModal';
import FlagContaminationModal from '../components/modals/FlagContaminationModal';
import AddRackModal from '../components/modals/AddRackModal';
import ConfirmModal from '../components/ConfirmModal';
import CustomToast, { showToast } from '../components/CustomToast';
import { SoundManager } from '../utils/SoundManager';
import CropsScreenSkeleton from '../components/skeletons/CropsScreenSkeleton';

export default function ManageCropScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const batches = useBatches();

  // Modals state
  const [showLogHarvest, setShowLogHarvest] = useState(false);
  const [showFlagContamination, setShowFlagContamination] = useState(false);
  const [showUpdateCapacity, setShowUpdateCapacity] = useState(false);
  const [showAddRack, setShowAddRack] = useState(false);
  const [activeModalRack, setActiveModalRack] = useState<BatchData | null>(null);

  // Archive confirm modal state
  const [archiveTarget, setArchiveTarget] = useState<{ firebaseKey: string | number; rackName: string } | null>(null);

  // Deferred rendering state for smooth tab transitions
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // --- Compute Stats from Firebase Data ---
  const {
    enrichedBatches,
    activeRacks,
    totalYieldGrams,
    totalSlots,
    totalActive,
    totalFlagged,
    overallCapacityPercent,
    healthScore
  } = useMemo(() => {
    if (!isReady) {
      return {
        enrichedBatches: [], activeRacks: [], totalYieldGrams: 0,
        totalSlots: 0, totalActive: 0, totalFlagged: 0, overallCapacityPercent: 0, healthScore: 100
      };
    }

    let tYield = 0;
    let tSlots = 0;
    let tActive = 0;
    let tFlagged = 0;
    let cycleDaysSum = 0;
    let activeBagsForCycle = 0;

    // Enhance batches with computed data
    const enhanced = batches.map((rack) => {
      const stats = getRackStats(rack);
      
      // Add to global totals
      tYield += stats.totalYieldGrams;

      if (!rack.archived) {
        tSlots += stats.bags.length;
        tActive += stats.activeBags.length;
        tFlagged += stats.flaggedBags.length;

        if (stats.activeBags.length > 0) {
          cycleDaysSum += stats.rackDay * stats.activeBags.length;
          activeBagsForCycle += stats.activeBags.length;
        }
      }

      return {
        ...rack,
        stats
      };
    });

    const activeR = enhanced.filter(r => !r.archived);
    const capacityPercent = tSlots > 0 ? Math.round((tActive / tSlots) * 100) : 0;
    const score = Math.max(0, 100 - (tSlots > 0 && tFlagged > 0 ? (tFlagged / tSlots) * 500 : 0));

    return {
      enrichedBatches: enhanced,
      activeRacks: activeR,
      totalYieldGrams: tYield,
      totalSlots: tSlots,
      totalActive: tActive,
      totalFlagged: tFlagged,
      overallCapacityPercent: capacityPercent,
      healthScore: score
    };
  }, [batches, isReady]);

  // --- Handlers ---
  const handleArchiveRack = (firebaseKey: string | number, rackName: string) => {
    setArchiveTarget({ firebaseKey, rackName });
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await remove(ref(db, `kabutech/batches/${archiveTarget.firebaseKey}`));
      const rackName = archiveTarget.rackName;
      setArchiveTarget(null);
      showToast({ type: 'success', text1: 'Removed', text2: `"${rackName}" has been removed.` });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to archive rack.' });
    }
  };

  const openActionModal = (type: 'harvest' | 'capacity' | 'flag', rack: BatchData) => {
    setActiveModalRack(rack);
    if (type === 'harvest') setShowLogHarvest(true);
    if (type === 'capacity') setShowUpdateCapacity(true);
    if (type === 'flag') setShowFlagContamination(true);
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />

      {!isReady ? (
        <CropsScreenSkeleton />
      ) : (
        <FlatList
          data={activeRacks}
          keyExtractor={(item) => String(item.id || item.firebaseKey)}
          contentContainerStyle={tw`px-5 pt-2 pb-36`}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Page Title */}
              <View style={tw`mb-6`}>
                <Text style={[tw`text-[17px] text-[#032514] dark:text-slate-100 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Crops Dashboard</Text>
                <Text style={[tw`text-xs text-gray-500 dark:text-slate-400 mt-1`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Manage racks, monitor health, and log harvests.</Text>
              </View>

              {/* Global Analytics Overview (Small Pills) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-5`} contentContainerStyle={tw`gap-3`}>
                {/* Total Yield */}
                <View style={tw`bg-white dark:bg-slate-800 rounded-[20px] px-4 py-3 flex-row items-center gap-3 border border-gray-100 dark:border-slate-700 shadow-sm`}>
                  <View style={tw`w-8 h-8 rounded-full bg-[#f0fdf4] dark:bg-emerald-900/40 items-center justify-center`}>
                    <MaterialCommunityIcons name="leaf" size={16} color="#166534" />
                  </View>
                  <View>
                    <Text style={[tw`text-[11px] text-gray-500 dark:text-slate-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Total Output</Text>
                    <Text style={[tw`text-lg text-[#032514] dark:text-emerald-400 tracking-tighter`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{Math.round(totalYieldGrams / 1000)}kg</Text>
                  </View>
                </View>
                
                {/* Health Score */}
                <View style={tw`bg-white dark:bg-slate-800 rounded-[20px] px-4 py-3 flex-row items-center gap-3 border border-gray-100 dark:border-slate-700 shadow-sm`}>
                  <View style={tw`w-8 h-8 rounded-full ${healthScore < 80 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-[#f0fdf4] dark:bg-emerald-900/40'} items-center justify-center`}>
                    <MaterialCommunityIcons name="heart-pulse" size={16} color={healthScore < 80 ? "#d97706" : "#10b981"} />
                  </View>
                  <View>
                    <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Health Score</Text>
                    <Text style={[tw`text-lg ${healthScore < 80 ? 'text-amber-600' : 'text-[#059669]'} dark:text-emerald-400 tracking-tighter`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{Math.round(healthScore)}/100</Text>
                  </View>
                </View>

                {/* Capacity */}
                <View style={tw`bg-white dark:bg-slate-800 rounded-[20px] px-4 py-3 flex-row items-center gap-3 border border-gray-100 dark:border-slate-700 shadow-sm`}>
                  <View style={tw`w-8 h-8 rounded-full bg-[#f0fdf4] dark:bg-emerald-900/40 items-center justify-center`}>
                    <MaterialCommunityIcons name="archive-outline" size={16} color="#166534" />
                  </View>
                  <View>
                    <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Capacity</Text>
                    <Text style={[tw`text-lg text-[#032514] dark:text-emerald-400 tracking-tighter`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{overallCapacityPercent}%</Text>
                  </View>
                </View>
              </ScrollView>

              {/* ACTIVE RACKS SECTION */}
              <View style={tw`flex-row justify-between items-center mb-4 mt-2`}>
                <Text style={[tw`text-[15px] text-[#032514] dark:text-slate-200 tracking-tight`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Active Racks</Text>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                  onPress={() => setShowAddRack(true)}
                  style={tw`bg-[#10b981] dark:bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm`}
                >
                  <Feather name="plus" size={14} color="white" />
                  <Text style={[tw`text-white text-[11px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Add Rack</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-8 items-center justify-center border border-dashed border-gray-300 dark:border-slate-600`}>
              <MaterialCommunityIcons name="bookshelf" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
              <Text style={[tw`text-gray-500 dark:text-slate-400 text-sm mt-3 text-center`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>No active racks.</Text>
              <Text style={[tw`text-gray-400 dark:text-slate-500 text-xs mt-1 text-center`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Initialize a new batch to start growing.</Text>
            </View>
          }
          renderItem={({ item: rack }) => (
            <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-4 overflow-hidden`}>
              
              {/* Rack Header */}
              <View style={tw`flex-row justify-between items-start mb-2`}>
                <Text style={[tw`text-[15px] text-[#032514] dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack.rack || 'Unnamed Rack'}</Text>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  onPress={() => handleArchiveRack(rack.firebaseKey, rack.rack || 'Unnamed Rack')}>
                  <MaterialCommunityIcons name="delete-outline" size={16} color={isDarkMode ? '#475569' : '#94a3b8'} />
                </TouchableOpacity>
              </View>

              {/* Status Indicator */}
              <View style={tw`bg-[#f8fafc] dark:bg-slate-700/50 px-2 py-1 rounded-md mb-2 self-start border border-gray-100 dark:border-slate-600`}>
                <Text style={[tw`text-[9px] text-[#032514] dark:text-slate-200 tracking-widest`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{rack.stats.status}</Text>
              </View>

              {/* Subtitle / Day */}
              <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 mb-4`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>
                Day {rack.stats.rackDay} • {rack.substrate || 'Sawdust'}
              </Text>

              {/* Bag Stats Grid */}
              <View style={tw`flex-row justify-between mb-4 bg-white dark:bg-slate-800 rounded-xl p-2 border border-gray-50 dark:border-slate-700`}>
                <View style={tw`items-center`}>
                  <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Active</Text>
                  <Text style={[tw`text-sm text-[#032514] dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack.stats.activeBags.length}</Text>
                </View>
                <View style={tw`w-[1px] bg-gray-100 dark:bg-slate-700`} />
                <View style={tw`items-center`}>
                  <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Empty</Text>
                  <Text style={[tw`text-sm text-[#032514] dark:text-slate-100`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack.stats.emptyBags.length}</Text>
                </View>
                <View style={tw`w-[1px] bg-gray-100 dark:bg-slate-700`} />
                <View style={tw`items-center`}>
                  <Text style={[tw`text-[10px] text-red-400 mb-0.5`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Flagged</Text>
                  <Text style={[tw`text-sm text-red-500`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack.stats.flaggedBags.length}</Text>
                </View>
              </View>

              {/* Capacity Bar */}
              <View style={tw`mb-2`}>
                <View style={tw`flex-row justify-between mb-1.5`}>
                  <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>Capacity</Text>
                  <Text style={[tw`text-[9px] text-[#032514] dark:text-slate-300 font-bold`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>
                    {rack.stats.activeBags.length}/{rack.stats.bags.length}
                  </Text>
                </View>
                <View style={tw`h-1.5 bg-[#f1f5f9] dark:bg-slate-700 rounded-full overflow-hidden flex-row`}>
                  <View style={[tw`h-full bg-emerald-500`, { width: rack.stats.bags.length ? `${(rack.stats.activeBags.length/rack.stats.bags.length)*100}%` : '0%' }]} />
                  <View style={[tw`h-full bg-red-400`, { width: rack.stats.bags.length ? `${(rack.stats.flaggedBags.length/rack.stats.bags.length)*100}%` : '0%' }]} />
                </View>
              </View>

              {/* Total Yield for Rack */}
              <View style={tw`flex-row items-center gap-1.5 mt-3 mb-2`}>
                  <MaterialCommunityIcons name="scale" size={12} color={tw.color('dark:text-slate-400') || "#64748b"} />
                  <Text style={[tw`text-[10px] text-gray-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>
                    Total Yield: {Math.round(rack.stats.totalYieldGrams / 1000)} kg
                  </Text>
              </View>

              {/* Action Buttons */}
              <View style={tw`flex-row items-center border-t border-gray-50 dark:border-slate-700 pt-3 gap-2`}>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                  onPress={() => openActionModal('harvest', rack)}
                  style={tw`flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg py-2 flex-row items-center justify-center gap-1.5`}
                >
                  <MaterialCommunityIcons name="leaf" size={12} color={tw.color('dark:text-emerald-400') || "#166534"} />
                  <Text style={[tw`text-[10px] text-[#166534] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Harvest</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                  onPress={() => openActionModal('capacity', rack)}
                  style={tw`flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg py-2 flex-row items-center justify-center gap-1.5`}
                >
                  <MaterialCommunityIcons name="plus-minus-variant" size={12} color={tw.color('dark:text-slate-300') || "#475569"} />
                  <Text style={[tw`text-[10px] text-gray-600 dark:text-slate-300`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Capacity</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
                  onPress={() => openActionModal('flag', rack)}
                  style={tw`bg-red-50 dark:bg-red-900/30 w-8 h-8 rounded-lg items-center justify-center`}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={tw.color('dark:text-red-400') || "#dc2626"} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modals */}
      <AddRackModal visible={showAddRack} onClose={() => setShowAddRack(false)} racks={batches} />
      <UpdateCapacityModal 
        visible={showUpdateCapacity} 
        onClose={() => { setShowUpdateCapacity(false); setActiveModalRack(null); }}
        selectedRack={activeModalRack}
      />
      <LogHarvestModal 
        visible={showLogHarvest} 
        onClose={() => { setShowLogHarvest(false); setActiveModalRack(null); }}
        selectedRack={activeModalRack}
      />
      <FlagContaminationModal 
        visible={showFlagContamination} 
        onClose={() => { setShowFlagContamination(false); setActiveModalRack(null); }}
        selectedRack={activeModalRack}
      />

      {/* Archive Confirm Modal */}
      <ConfirmModal
        visible={!!archiveTarget}
        title="Remove Rack"
        message={`Are you sure you want to remove "${archiveTarget?.rackName}"? WARNING: This will remove its data completely.`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="#ef4444"
        iconName="archive-outline"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      </View>
  );
}
