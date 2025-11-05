import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { RegisterRequest } from '../types';
import { COLORS } from '../constants/colors';
import ApiService from '../services/api';

interface Props {
  navigation: any;
}

type RegistrationStep = 'credentials' | 'otp';

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<RegistrationStep>('credentials');
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { verifyRegistrationOTP: verifyOTP } = useAuth();

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCountdown]);

  // Animation when switching steps
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: step === 'otp' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least 1 uppercase letter');
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least 1 digit');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ApiService.sendRegistrationOTP(formData.email, formData.password);
      Alert.alert('Success', result.message);
      setStep('otp');
      setCanResend(false);
      setResendCountdown(60); // 60 seconds countdown
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;
      
      if (statusCode === 409 || errorCode === 'EMAIL_ALREADY_EXISTS' || 
          errorMessage?.includes('email') && errorMessage?.includes('already exists')) {
        Alert.alert('Email Already Exists', 'An account with this email address already exists. Please use a different email or try logging in.');
      } else {
        const message = errorMessage || error.message || 'Failed to send verification code. Please try again.';
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (codeToVerify?: string) => {
    // Use provided code or clean the state code (remove any spaces or non-numeric characters)
    const code = codeToVerify || otpCode;
    const cleanCode = code.replace(/\D/g, '');

    if (cleanCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(formData.email, cleanCode);
      Alert.alert('Success', 'Email verified! Your account has been created.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Invalid or expired verification code';
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      const result = await ApiService.resendRegistrationOTP(formData.email);
      Alert.alert('Success', result.message);
      setCanResend(false);
      setResendCountdown(60); // Reset countdown
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to resend verification code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change (auto-format and validate)
  const handleOtpChange = (text: string) => {
    // Remove non-numeric characters
    const numericText = text.replace(/\D/g, '');
    // Limit to 6 digits
    const limitedText = numericText.slice(0, 6);
    setOtpCode(limitedText);
    
    // Auto-submit when 6 digits are entered
    // Pass the cleaned code directly to avoid state update delay
    if (limitedText.length === 6) {
      handleVerifyOTP(limitedText);
    }
  };

  // Go back to credentials step
  const handleBack = () => {
    setStep('credentials');
    setOtpCode('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Brand Section */}
        <View style={styles.headerSection}>
          <Image 
            source={require('../../assets/boboslogo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>
            {step === 'credentials' ? 'Create Account' : 'Verify Email'}
          </Text>
          <Text style={styles.subtitleText}>
            {step === 'credentials' 
              ? 'Join Email Marketing Platform' 
              : `Verification code sent to ${formData.email}`}
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {step === 'credentials' ? (
            <>
              {/* Step 1: Credentials Form */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
                  <Text style={styles.label}>Email Address</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.text.light}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
                  <Text style={styles.label}>Password</Text>
                </View>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    placeholder="Enter your password"
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
                  <Text style={styles.label}>Confirm Password</Text>
                </View>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
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
                onPress={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.text.white} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Step 2: OTP Verification */}
              <View style={styles.otpInfoContainer}>
                <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
                <Text style={styles.otpInfoText}>
                  We sent a verification code to
                </Text>
                <Text style={styles.otpEmailText}>{formData.email}</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="key-outline" size={18} color={COLORS.text.secondary} style={styles.inputIcon} />
                  <Text style={styles.label}>Verification Code</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={otpCode}
                  onChangeText={handleOtpChange}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={COLORS.text.light}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  textAlign="center"
                />
                <Text style={styles.otpHelpText}>
                  Enter the 6-digit code from your email
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={() => handleVerifyOTP()}
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Verify Code</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.text.white} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={!canResend || isLoading}
              >
                <Text style={[styles.resendButtonText, (!canResend || isLoading) && styles.resendButtonTextDisabled]}>
                  {resendCountdown > 0 
                    ? `Resend Code (${resendCountdown}s)`
                    : 'Resend Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.text.secondary} style={styles.backButtonIcon} />
                <Text style={styles.backButtonText}>Back to Email & Password</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'credentials' && (
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
  scrollContent: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  loginLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  otpInfoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  otpInfoText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  otpEmailText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  otpHelpText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: COLORS.text.light,
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

export default RegisterScreen;
