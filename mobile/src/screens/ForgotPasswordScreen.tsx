import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import { COLORS } from '../constants/colors';

interface Props {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ApiService.forgotPassword(email);
      
      if (result.success) {
        // Navigate directly to Reset Password screen
        Alert.alert(
          'Email Sent',
          result.message || 'If an account with that email exists, a password reset code has been sent to your email address. Please check your email and enter the code below.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Reset Password screen
                navigation.navigate('ResetPassword');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to send password reset email';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Brand Section */}
        <View style={styles.headerSection}>
          <Image 
            source={require('../../assets/boboslogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>Forgot Password?</Text>
          <Text style={styles.subtitleText}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelContainer}>
              <Ionicons name="mail-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
              <Text style={styles.label}>Email Address</Text>
            </View>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.text.light}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Send Reset Code</Text>
                <Ionicons name="mail-outline" size={20} color={COLORS.text.white} style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={navigateToLogin}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={18} color={COLORS.text.secondary} style={styles.backButtonIcon} />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 50,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: COLORS.background.secondary,
    color: COLORS.text.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: COLORS.button.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  backButtonIcon: {
    marginRight: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default ForgotPasswordScreen;

