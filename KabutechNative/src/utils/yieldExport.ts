import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { showToast } from '../components/CustomToast';

export const handleChartExport = async (data: any[], chartPeriod: string, isExporting: React.MutableRefObject<boolean>) => {
  if (isExporting.current) return;
  isExporting.current = true;
  try {
    const aoaData: any[][] = [['Period', 'Total Yield (kg)']];
    data.forEach(d => {
      aoaData.push([d.label, parseFloat(d.kg.toFixed(2))]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    const colWidths = [{ wch: 15 }, { wch: 20 }];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${chartPeriod} Yield`);
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileUri = FileSystem.documentDirectory + `Kabutech_Yield_${chartPeriod}.xlsx`;
    await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Export ${chartPeriod} Yield`
      });
    } else {
      showToast({ type: 'error', text1: 'Sharing Not Available', text2: 'Your device does not support sharing files.' });
    }
  } catch (e) {
    console.error(e);
    showToast({ type: 'error', text1: 'Export Failed' });
  } finally {
    isExporting.current = false;
  }
};

export const handleExport = async (sortedDates: string[], dailyMap: any, allRackNames: Set<string>, isExporting: React.MutableRefObject<boolean>) => {
  if (isExporting.current) return;
  isExporting.current = true;
  try {
    const rackNamesArray = Array.from(allRackNames).sort();
    
    const aoaData = [];
    // Build header
    const headerRow = ['Date', 'Total Yield (kg)', 'Harvest Count', 'Avg Yield/Harvest (kg)'];
    rackNamesArray.forEach(rack => {
      headerRow.push(`[${rack}] Yield (kg)`);
    });
    headerRow.push('Total Yield (g)');
    aoaData.push(headerRow);

    // Build rows (export all data, not just filtered)
    sortedDates.forEach(dateStr => {
      const data = dailyMap[dateStr];
      const totalKg = parseFloat((data.grams / 1000).toFixed(2));
      const count = data.count;
      const avgYieldKg = count > 0 ? parseFloat((data.grams / 1000 / count).toFixed(3)) : 0;
      
      const formattedExportDate = dateStr;
      
      const rowData: any[] = [formattedExportDate, totalKg, count, avgYieldKg];
      
      rackNamesArray.forEach(rack => {
        const rackYg = data.rackYields[rack] || 0;
        rowData.push(parseFloat((rackYg / 1000).toFixed(2)));
      });
      
      rowData.push(data.grams);
      aoaData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    
    // Auto-size columns based on header length
    const colWidths = headerRow.map(header => ({ wch: Math.max(header.length + 2, 12) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Harvests');
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileUri = FileSystem.documentDirectory + 'Kabutech_Daily_Report.xlsx';
    await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Daily Harvests',
        UTI: 'com.microsoft.excel.xlsx'
      });
    } else {
      showToast({ type: 'error', text1: 'Sharing Not Available', text2: 'Your device does not support sharing files.' });
    }
  } catch (error) {
    showToast({ type: 'error', text1: 'Export Failed', text2: 'An error occurred while exporting the data.' });
    console.error(error);
  } finally {
    isExporting.current = false;
  }
};
