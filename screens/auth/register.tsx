import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRegisterMutation, useVerifyOtpMutation, useResendOtpMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';

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

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const otpSlideAnim = useRef(new Animated.Value(0)).current;

  const [register, { isLoading }] = useRegisterMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // OTP screen transition animation
  useEffect(() => {
    if (showOtpScreen) {
      Animated.spring(otpSlideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      otpSlideAnim.setValue(0);
    }
  }, [showOtpScreen]);

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

    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const result = await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password
      }).unwrap();

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP sent to your email!',
        });

        setShowOtpScreen(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: result.message || 'Failed to create account',
        });
      }
    } catch (error: any) {
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

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'Account verified successfully!',
        });

        if (result.data?.token && result.data?.user) {
          dispatch(setCredentials({
            token: result.data.token,
            user: result.data.user,
          }));
        }

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
    Animated.timing(otpSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowOtpScreen(false);
      setOtp('');
    });
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const otpTransform = {
    transform: [
      {
        translateX: otpSlideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [width, 0],
        }),
      },
    ],
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#f8f4ff', '#f0eaff']}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

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
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#f3e8ff', '#e9d5ff']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Animated Logo Section */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={['#8B5CF6', '#C084FC', '#A855F7']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={require('../../assets/images/logo.png')}
                    resizeMode='contain'
                    style={styles.logo}
                  />
                </LinearGradient>
              </View>
              <Animated.Text style={[styles.titleText, { opacity: fadeAnim }]}>
                {showOtpScreen ? 'Verify OTP' : 'Create Account'}
              </Animated.Text>
              <Animated.Text style={[styles.subtitleText, { opacity: fadeAnim }]}>
                {showOtpScreen ? `Enter the 6-digit code sent to ${email}` : 'Join BondBook today'}
              </Animated.Text>
            </Animated.View>

            {/* Input Fields with Animation */}
            <Animated.View
              style={[
                styles.inputSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {!showOtpScreen ? (
                <>
                  {/* Username Input */}
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputIcon, focusedField === 'username' && styles.inputIconFocused]}>
                      <Feather name="user" size={18} color={focusedField === 'username' ? '#8B5CF6' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={[styles.input, focusedField === 'username' && styles.inputFocused]}
                      placeholder="Username"
                      placeholderTextColor="#9CA3AF"
                      value={username}
                      onChangeText={setUsername}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputIcon, focusedField === 'email' && styles.inputIconFocused]}>
                      <Feather name="mail" size={18} color={focusedField === 'email' ? '#8B5CF6' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                      placeholder="Email address"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputIcon, focusedField === 'password' && styles.inputIconFocused]}>
                      <Feather name="lock" size={18} color={focusedField === 'password' ? '#8B5CF6' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={[styles.input, focusedField === 'password' && styles.inputFocused, { paddingRight: 50 }]}
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
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
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputIcon, focusedField === 'confirmPassword' && styles.inputIconFocused]}>
                      <Feather name="check-circle" size={18} color={focusedField === 'confirmPassword' ? '#8B5CF6' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={[styles.input, focusedField === 'confirmPassword' && styles.inputFocused, { paddingRight: 50 }]}
                      placeholder="Confirm Password"
                      placeholderTextColor="#9CA3AF"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Entypo name={showConfirmPassword ? "eye" : "eye-with-line"} size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Animated.View style={otpTransform}>
                  {/* OTP Input */}
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputIcon, focusedField === 'otp' && styles.inputIconFocused]}>
                      <Feather name="key" size={18} color={focusedField === 'otp' ? '#8B5CF6' : '#9CA3AF'} />
                    </View>
                    <TextInput
                      style={[styles.input, focusedField === 'otp' && styles.inputFocused]}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#9CA3AF"
                      value={otp}
                      onChangeText={setOtp}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </Animated.View>
              )}
            </Animated.View>

            {/* Action Button with Animation */}
            <Animated.View
              style={[
                styles.buttonContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: buttonScale }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={!showOtpScreen ? handleRegister : handleVerifyOtp}
                disabled={isLoading || isVerifying}
              >
                <LinearGradient
                  colors={isLoading || isVerifying ? ['#C4B5FD', '#C4B5FD'] : ['#8B5CF6', '#A855F7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.registerButton, (isLoading || isVerifying) && styles.registerButtonDisabled]}
                >
                  {isLoading || isVerifying ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.registerButtonText}>
                      {!showOtpScreen ? 'Create Account' : 'Verify OTP'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Resend OTP (only for OTP screen) */}
            {showOtpScreen && (
              <Animated.View
                style={[
                  styles.resendContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isResending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>
                    Didn't receive the code?{' '}
                    <Text style={styles.resendBold}>
                      {isResending ? 'Resending...' : 'Resend OTP'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Login Link */}
            <Animated.View
              style={[
                styles.loginLinkContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLinkText}>
                  Already have an account?{' '}
                  <Text style={styles.loginLinkBold}>Login</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.poweredByText}>Powered by</Text>
              <LinearGradient
                colors={['#8B5CF6', '#C084FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mbdGradient}
              >
                <Text style={styles.mbdText}>M_BD</Text>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Shimmer Effect Overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  backButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7C3AED',
    marginTop: 10,
    letterSpacing: 1,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  inputSection: {
    marginTop: 10,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 17,
    zIndex: 1,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  input: {
    height: 54,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 48,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputFocused: {
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 17,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  registerButton: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  registerButtonDisabled: {
    shadowOpacity: 0.1,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  loginLinkBold: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  poweredByText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  mbdGradient: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mbdText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '800',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  resendBold: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  shimmerGradient: {
    width: width * 0.5,
    height: '100%',
  },
});

export default RegisterScreen;