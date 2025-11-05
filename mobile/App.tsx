import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PreloaderProvider, usePreloader } from './src/contexts/PreloaderContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import PreloaderScreen from './src/screens/PreloaderScreen';
import { StatusBar } from 'expo-status-bar';
import { UpdateRequiredModal } from './src/components/UpdateRequiredModal';

const Stack = createStackNavigator();

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: preloaderLoading, setLoading } = usePreloader();
  const [updateRequired, setUpdateRequired] = useState<any>(null);

  useEffect(() => {
    checkUpdateRequired();
    // Listen for update requirement changes (check every 5 seconds)
    const interval = setInterval(checkUpdateRequired, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkUpdateRequired = async () => {
    try {
      const updateData = await AsyncStorage.getItem('updateRequired');
      if (updateData) {
        setUpdateRequired(JSON.parse(updateData));
      } else {
        setUpdateRequired(null);
      }
    } catch (error) {
      console.error('Error checking update:', error);
    }
  };

  const handlePreloaderFinish = () => {
    setLoading(false);
  };

  // Show preloader first
  if (preloaderLoading) {
    return <PreloaderScreen onFinish={handlePreloaderFinish} />;
  }

  // Then show auth loading if needed
  if (authLoading) {
    return null; // Or a loading screen
  }

  return (
    <>
      <NavigationContainer>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      
      {/* Show update modal if version is outdated */}
      {updateRequired && (
        <UpdateRequiredModal
          visible={true}
          requiredVersion={updateRequired.requiredVersion}
          currentVersion={updateRequired.currentVersion}
          message={updateRequired.message}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <PreloaderProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppContent />
      </AuthProvider>
    </PreloaderProvider>
  );
}
