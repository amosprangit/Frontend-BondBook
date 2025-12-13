import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRegisterMutation, useVerifyOtpMutation, useResendOtpMutation } from '../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [register, { isLoading }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    // Validation
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (username.length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Username must be at least 3 characters',
      });
      return;
    }

    if (!validateEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    try {
      const result = await register({ 
        username: username.trim(), 
        email: email.trim().toLowerCase(), 
        password 
      }).unwrap();
      
      console.log('Registration result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP sent to your email!',
        });
        
        // Show OTP verification screen
        setShowOtpScreen(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: result.message || 'Failed to create account',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status) {
        errorMessage = `Server error: ${error.status}`;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: errorMessage,
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter the OTP',
      });
      return;
    }

    if (otp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'OTP must be 6 digits',
      });
      return;
    }

    try {
      const result = await verifyOtp({ 
        email: email.trim().toLowerCase(), 
        otp: otp.trim() 
      }).unwrap();
      
      console.log('OTP Verification result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'Account verified successfully!',
        });
        
        // Store token and user data if provided
        if (result.data?.token && result.data?.user) {
          dispatch(setCredentials({
            token: result.data.token,
            user: result.data.user,
          }));
        }
        
        // Navigate to login or home screen
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: result.message || 'Invalid OTP',
        });
      }
    } catch (error: any) {
      console.error('OTP Verification error:', error);
      
      let errorMessage = 'An error occurred during verification. Please try again.';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: errorMessage,
      });
    }
  };

  const handleResendOtp = async () => {
    try {
      const result = await resendOtp({ 
        email: email.trim().toLowerCase() 
      }).unwrap();
      
      console.log('Resend OTP result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP resent to your email!',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.message || 'Failed to resend OTP',
        });
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  };

  const handleBackToRegister = () => {
    setShowOtpScreen(false);
    setOtp('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={showOtpScreen ? handleBackToRegister : () => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>

          {/* BondBook Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/logo.png')} 
              resizeMode='contain' 
              style={styles.logo} 
            />
            <Text style={styles.titleText}>{showOtpScreen ? 'Verify OTP' : 'Create Account'}</Text>
            <Text style={styles.subtitleText}>
              {showOtpScreen ? `Enter the 6-digit code sent to ${email}` : 'Join BondBook today'}
            </Text>
          </View>

          {/* Input Fields */}
          {!showOtpScreen ? (
            <>
              <View style={styles.inputContainer}>
                {/* Username Input */}
                <View style={styles.inputWrapper}>
                  <Entypo name="user" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#8E8E93"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Entypo name="mail" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                
                {/* Password Input */}
                <View style={styles.passwordContainer}>
                  <Entypo name="lock" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#8E8E93"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Entypo name={showPassword ? "eye" : "eye-with-line"} size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.passwordContainer}>
                  <Entypo name="lock" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#8E8E93"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Entypo name={showConfirmPassword ? "eye" : "eye-with-line"} size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity 
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <View style={styles.otpContainer}>
                <View style={styles.inputWrapper}>
                  <Entypo name="key" size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#8E8E93"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity 
                style={[styles.registerButton, isVerifying && styles.registerButtonDisabled]} 
                onPress={handleVerifyOtp}
                disabled={isVerifying}
              >
                <Text style={styles.registerButtonText}>
                  {isVerifying ? 'Verifying...' : 'Verify OTP'}
                </Text>
              </TouchableOpacity>

              {/* Resend OTP */}
              <TouchableOpacity 
                style={styles.resendContainer}
                onPress={handleResendOtp}
                disabled={isResending}
              >
                <Text style={styles.resendText}>
                  Didn't receive the code? <Text style={styles.resendBold}>
                    {isResending ? 'Resending...' : 'Resend OTP'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Already Have Account Link */}
          <TouchableOpacity 
            style={styles.loginLinkContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.poweredByText}>Powered by</Text>
            <Text style={styles.mbdText}>M_BD</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginTop: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 5,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 25,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#8B5CF6',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0.1,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loginLinkBold: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  poweredByText: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  mbdText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otpContainer: {
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resendBold: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
