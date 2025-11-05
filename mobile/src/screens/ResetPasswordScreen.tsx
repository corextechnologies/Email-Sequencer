import React, { useState, useEffect } from 'react';
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
  route?: {
    params?: {
      token?: string;
    };
  };
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from route params if available (from email deep link)
  useEffect(() => {
    if (route?.params?.token) {
      setToken(route.params.token);
    }
  }, [route?.params?.token]);

  const handleResetPassword = async () => {
    if (!token) {
      Alert.alert('Error', 'Please enter the 6-digit reset code');
      return;
    }

    // Remove spaces and non-numeric characters from token
    const cleanToken = token.replace(/\D/g, '');

    // Validate it's a 6-digit code
    if (cleanToken.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least 1 uppercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least 1 digit');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ApiService.resetPassword(cleanToken, password);
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.message || 'Password has been reset successfully. You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to reset password';
      
      if (errorCode === 'INVALID_TOKEN' || errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        Alert.alert(
          'Invalid Token',
          'The reset token is invalid or has expired. Please request a new password reset.',
          [
            {
              text: 'Request New Reset',
              onPress: () => navigation.navigate('ForgotPassword'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
          <Text style={styles.welcomeText}>Reset Password</Text>
          <Text style={styles.subtitleText}>
            Enter the reset code from your email and your new password to complete the password reset.
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabelContainer}>
              <Ionicons name="key-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
              <Text style={styles.label}>Reset Code (6 digits)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.tokenInput]}
              value={token}
              onChangeText={(text) => {
                // Only allow numeric input, max 6 digits
                const numericOnly = text.replace(/\D/g, '').slice(0, 6);
                setToken(numericOnly);
              }}
              placeholder="6-digit code"
              placeholderTextColor={COLORS.text.light}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              textAlign="center"
            />
            <Text style={styles.helpText}>
              Enter the 6-digit code from your email
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabelContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
              <Text style={styles.label}>New Password</Text>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.text.light}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabelContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
              <Text style={styles.label}>Confirm New Password</Text>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.text.light}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Reset Password</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.text.white} style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={navigateToForgotPassword} disabled={isLoading}>
              <Text style={styles.link}>Need a new code?</Text>
            </TouchableOpacity>
            <Text style={styles.separator}> • </Text>
            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
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
  tokenInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 12,
    backgroundColor: COLORS.background.secondary,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  eyeIcon: {
    padding: 12,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
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
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
    color: COLORS.text.light,
  },
});

export default ResetPasswordScreen;

