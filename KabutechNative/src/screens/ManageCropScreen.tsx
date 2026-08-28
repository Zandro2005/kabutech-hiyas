import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../tailwind';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { useFirebaseData } from '../hooks/useFirebaseData';
import LogHarvestModal from '../components/modals/LogHarvestModal';
import UpdateCapacityModal from '../components/modals/UpdateCapacityModal';
import FlagContaminationModal from '../components/modals/FlagContaminationModal';
import AddRackModal from '../components/modals/AddRackModal';
import ConfirmModal from '../components/ConfirmModal';
import CustomToast, { showToast } from '../components/CustomToast';
import { playSuccessSound } from '../utils/SoundManager';
import { ref, update, remove } from 'firebase/database';
import { db } from '../services/firebase';

export default function ManageCropScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { batches } = useFirebaseData();

  // Modals state
  const [showLogHarvest, setShowLogHarvest] = useState(false);
  const [showUpdateCapacity, setShowUpdateCapacity] = useState(false);
  const [showFlagContamination, setShowFlagContamination] = useState(false);
  const [showAddRack, setShowAddRack] = useState(false);
  const [activeModalRackId, setActiveModalRackId] = useState<number | null>(null);
  // Archive confirm modal state
  const [archiveTarget, setArchiveTarget] = useState<{ firebaseKey: string | number; rackName: string } | null>(null);

  // --- Compute Stats from Firebase Data ---
  let totalYieldGrams = 0;
  let totalHarvestsCount = 0;
  let totalSlots = 0;
  let totalActive = 0;
  let totalEmpty = 0;
  let totalFlagged = 0;
  
  let cycleDaysSum = 0;
  let activeBagsForCycle = 0;

  // Enhance batches with computed data
  const enrichedBatches = batches.map((rack) => {
    const bags = Array.isArray(rack.bags) ? rack.bags : Object.values(rack.bags || {});
    const activeBags = bags.filter((b: any) => b && b.status === 'Active');
    const emptyBags = bags.filter((b: any) => b && b.status === 'Empty');
    const flaggedBags = bags.filter((b: any) => b && b.status === 'Contaminated');
    
    // Calculate yield for this rack
    let rackYield = 0;
    bags.forEach((b: any) => {
      if (b && b.harvestLog) {
        const logs = Array.isArray(b.harvestLog) ? b.harvestLog : Object.values(b.harvestLog);
        logs.forEach((h: any) => {
          if (h && h.grams) {
            rackYield += h.grams;
          }
        });
      }
    });

    if (rack.historicalHarvests) {
      const hist = Array.isArray(rack.historicalHarvests) ? rack.historicalHarvests : Object.values(rack.historicalHarvests);
      hist.forEach((h: any) => {
        if (h && h.grams) {
          rackYield += h.grams;
        }
      });
    }

    // Add to global totals
    totalYieldGrams += rackYield;
    // (Assuming each historical harvest is 1 count, though usually it's array length)
    // We'll just simplify and say total yield is all that matters for the UI top card.

    // If NOT archived, add to capacity and cycles
    let rackDay = 0;
    if (rack.setupDate) {
      const msDiff = Date.now() - new Date(rack.setupDate).getTime();
      rackDay = Math.floor(msDiff / (1000 * 60 * 60 * 24));
      if (rackDay < 0) rackDay = 0;
    }

    let status = 'GROWING';
    if (rackDay < 14) status = 'COLONIZING';
    if (rackDay > 21) status = 'FRUITING';
    if (activeBags.length === 0) status = 'EMPTY';

    if (!rack.archived) {
      totalSlots += bags.length;
      totalActive += activeBags.length;
      totalEmpty += emptyBags.length;
      totalFlagged += flaggedBags.length;

      if (activeBags.length > 0) {
        cycleDaysSum += rackDay * activeBags.length;
        activeBagsForCycle += activeBags.length;
      }
    }

    return {
      firebaseKey: rack.firebaseKey,
      ...rack,
      _activeBags: activeBags.length,
      _emptyBags: emptyBags.length,
      _flaggedBags: flaggedBags.length,
      _totalBags: bags.length,
      _rackYield: rackYield,
      _day: rackDay,
      _status: status
    };
  });

  const activeRacks = enrichedBatches.filter(r => !r.archived);
  
  const avgYieldPerBag = totalActive > 0 ? (totalYieldGrams / totalActive).toFixed(1) : '0';
  const overallCapacityPercent = totalSlots > 0 ? Math.round((totalActive / totalSlots) * 100) : 0;
  const contamRate = totalSlots > 0 ? ((totalFlagged / totalSlots) * 100).toFixed(1) : '0.0';
  const healthScore = Math.max(0, 100 - (totalFlagged > 0 ? (totalFlagged / totalSlots) * 500 : 0));
  const avgCycleAge = activeBagsForCycle > 0 ? Math.round(cycleDaysSum / activeBagsForCycle) : 0;

  // --- Handlers ---
  const handleArchiveRack = (firebaseKey: string | number, rackName: string) => {
    setArchiveTarget({ firebaseKey, rackName });
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    remove(ref(db, `kabutech/batches/${archiveTarget.firebaseKey}`))
    const rackName = archiveTarget.rackName;
    setArchiveTarget(null);
    setTimeout(() => {
      playSuccessSound();
      showToast({ type: 'success', text1: 'Removed', text2: `"${rackName}" has been removed.` });
    }, 600);
  };

  const openActionModal = (type: 'harvest' | 'capacity' | 'flag', rackId: number) => {
    setActiveModalRackId(rackId);
    if (type === 'harvest') setShowLogHarvest(true);
    if (type === 'capacity') setShowUpdateCapacity(true);
    if (type === 'flag') setShowFlagContamination(true);
  };

  return (
    <View style={tw`flex-1 bg-[#f0f9f4] dark:bg-[#020617]`}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader />

      <ScrollView contentContainerStyle={tw`p-4 pb-32`} showsVerticalScrollIndicator={false}>
        
        {/* Page Title */}
        <View style={tw`mb-4 mt-2`}>
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
              <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Total Yield</Text>
              <Text style={[tw`text-lg text-[#032514] dark:text-emerald-400 tracking-tighter`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{(totalYieldGrams / 1000).toFixed(2)}kg</Text>
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
          <TouchableOpacity 
            onPress={() => setShowAddRack(true)}
            style={tw`bg-[#10b981] dark:bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm`}
          >
            <Feather name="plus" size={14} color="white" />
            <Text style={[tw`text-white text-[11px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Add Rack</Text>
          </TouchableOpacity>
        </View>

        {activeRacks.length === 0 ? (
          <View style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-8 items-center justify-center border border-dashed border-gray-300 dark:border-slate-600`}>
            <MaterialCommunityIcons name="bookshelf" size={48} color={isDarkMode ? '#334155' : '#d1d5db'} />
            <Text style={[tw`text-gray-500 dark:text-slate-400 text-sm mt-3 text-center`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>No active racks.</Text>
            <Text style={[tw`text-gray-400 dark:text-slate-500 text-xs mt-1 text-center`, {fontFamily: 'PlusJakartaSans_400Regular'}]}>Initialize a new batch to start growing.</Text>
          </View>
        ) : (
          activeRacks.map((rack) => (
            <View key={rack.id} style={tw`bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-slate-700 mb-4 overflow-hidden`}>
              
              {/* Rack Header */}
              <View style={tw`flex-row justify-between items-start mb-4`}>
                <View>
                  <Text style={[tw`text-[15px] text-[#032514] dark:text-slate-100 mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack.rack || 'Unnamed Rack'}</Text>
                  <Text style={[tw`text-[10px] text-gray-500 dark:text-slate-400`, {fontFamily: 'PlusJakartaSans_700Bold'}]}>{rack.substrate || 'Sawdust + Bran'} • Day {rack._day}</Text>
                </View>
                <View style={tw`bg-[#f0fdf4] dark:bg-emerald-900/40 px-2.5 py-1 rounded-md border border-[#dcfce7] dark:border-emerald-800/50`}>
                  <Text style={[tw`text-[9px] text-[#166534] dark:text-emerald-400 uppercase tracking-widest`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack._status}</Text>
                </View>
              </View>

              {/* Rack Stats */}
              <View style={tw`flex-row justify-between mb-5 bg-gray-50 dark:bg-slate-700/30 p-3 rounded-2xl border border-gray-100 dark:border-slate-700`}>
                <View style={tw`items-center flex-1 border-r border-gray-200 dark:border-slate-600`}>
                  <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Yield</Text>
                  <Text style={[tw`text-[13px] text-[#032514] dark:text-emerald-400`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{(rack._rackYield / 1000).toFixed(2)}kg</Text>
                </View>
                <View style={tw`items-center flex-1 border-r border-gray-200 dark:border-slate-600`}>
                  <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Active</Text>
                  <Text style={[tw`text-[13px] text-[#032514] dark:text-slate-200`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack._activeBags}/{rack._totalBags}</Text>
                </View>
                <View style={tw`items-center flex-1`}>
                  <Text style={[tw`text-[9px] text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Contam</Text>
                  <Text style={[tw`text-[13px] ${rack._flaggedBags > 0 ? 'text-red-500' : 'text-[#032514] dark:text-slate-200'}`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>{rack._flaggedBags}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={tw`flex-row justify-between gap-2`}>
                <TouchableOpacity 
                  onPress={() => openActionModal('harvest', rack.id)}
                  style={tw`flex-1 bg-[#166534] dark:bg-emerald-700 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5`}
                >
                  <MaterialCommunityIcons name="leaf" size={14} color="white" />
                  <Text style={[tw`text-white text-[10px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Harvest</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => openActionModal('capacity', rack.id)}
                  style={tw`flex-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5`}
                >
                  <MaterialCommunityIcons name="archive-edit" size={14} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                  <Text style={[tw`text-[#475569] dark:text-slate-300 text-[10px]`, {fontFamily: 'PlusJakartaSans_800ExtraBold'}]}>Capacity</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => openActionModal('flag', rack.id)}
                  style={tw`bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 w-10 py-2.5 rounded-xl items-center justify-center`}
                >
                  <MaterialCommunityIcons name="flag" size={14} color="#ef4444" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleArchiveRack(rack.firebaseKey, rack.rack || 'Unnamed Rack')}
                  style={tw`bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 w-10 py-2.5 rounded-xl items-center justify-center`}
                >
                  <MaterialCommunityIcons name="delete-outline" size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>

            </View>
          ))
        )}
      </ScrollView>

      {/* Render Modals */}
      <LogHarvestModal 
        visible={showLogHarvest} 
        onClose={() => {setShowLogHarvest(false); setActiveModalRackId(null);}} 
        racks={batches} 
        preselectedRackId={activeModalRackId}
      />
      <UpdateCapacityModal 
        visible={showUpdateCapacity} 
        onClose={() => {setShowUpdateCapacity(false); setActiveModalRackId(null);}} 
        racks={batches} 
        preselectedRackId={activeModalRackId}
      />
      <FlagContaminationModal 
        visible={showFlagContamination} 
        onClose={() => {setShowFlagContamination(false); setActiveModalRackId(null);}} 
        racks={batches} 
        preselectedRackId={activeModalRackId}
      />
      <AddRackModal 
        visible={showAddRack} 
        onClose={() => setShowAddRack(false)} 
        racks={batches} 
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
