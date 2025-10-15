import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AuthDebugger() {
  const { logout, user, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string>('');

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      
      let info = '🔍 Auth Debug Info:\n\n';
      info += `Token: ${token ? `✅ Found (${token.substring(0, 20)}...)` : '❌ Not found'}\n`;
      info += `User Data: ${userData ? '✅ Found' : '❌ Not found'}\n`;
      info += `Auth Context: ${isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}\n`;
      info += `User Email: ${user?.email || 'N/A'}\n`;
      
      // Test API call
      try {
        await api.get('/auth/me');
        info += 'API Test: ✅ Success';
      } catch (error: any) {
        info += `API Test: ❌ Failed (${error.response?.status || 'Network Error'})`;
      }
      
      setDebugInfo(info);
    } catch (error) {
      setDebugInfo('❌ Debug failed: ' + error);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      await logout();
      Alert.alert('Success', 'Auth data cleared. Please log in again.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear auth data');
    }
  };

  const testLogin = async () => {
    // You can modify these credentials for testing
    try {
      const response = await api.post('/auth/login', {
        email: 'test@example.com', // Replace with valid credentials
        password: 'password'
      });
      Alert.alert('Success', 'Login test successful');
    } catch (error: any) {
      Alert.alert('Login Test Failed', error.response?.data?.error?.message || 'Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Debugger</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkAuthStatus}>
        <Text style={styles.buttonText}>Check Auth Status</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearAuthData}>
        <Text style={styles.buttonText}>Clear Auth Data</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testLogin}>
        <Text style={styles.buttonText}>Test Login</Text>
      </TouchableOpacity>
      
      {debugInfo ? (
        <Text style={styles.debugText}>{debugInfo}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  debugText: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 10,
  },
});
