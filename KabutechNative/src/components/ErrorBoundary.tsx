import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../tailwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={tw`flex-1 bg-white dark:bg-slate-900`}>
          <ScrollView contentContainerStyle={tw`flex-1 p-6 justify-center items-center`}>
            <View style={tw`w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full items-center justify-center mb-6`}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#ef4444" />
            </View>
            
            <Text style={tw`text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center`}>
              Something went wrong
            </Text>
            
            <Text style={tw`text-slate-500 dark:text-slate-400 text-center mb-8 px-4`}>
              An unexpected error occurred. Our team has been notified.
            </Text>

            <View style={tw`bg-gray-50 dark:bg-slate-800 p-4 rounded-xl w-full mb-8 border border-gray-100 dark:border-slate-700`}>
              <Text style={tw`text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest`}>Error Details</Text>
              <Text style={tw`text-red-500 dark:text-red-400 text-sm`} numberOfLines={4}>
                {this.state.error?.message || "Unknown error"}
              </Text>
            </View>

            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}  
              onPress={() => this.setState({ hasError: false })}
              style={tw`w-full bg-green-600 dark:bg-green-700 py-4 rounded-xl items-center shadow-sm`}
            >
              <Text style={tw`text-white font-bold text-base`}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
