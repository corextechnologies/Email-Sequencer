import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PreloaderProvider, usePreloader } from './src/contexts/PreloaderContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import PreloaderScreen from './src/screens/PreloaderScreen';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: preloaderLoading, setLoading } = usePreloader();

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
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
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
