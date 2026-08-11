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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Entypo, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email address',
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
      const result = await forgotPassword({
        email: email.trim().toLowerCase()
      }).unwrap();

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP sent to your email!',
        });

        navigation.navigate('VerifyResetOtp', { email: email.trim().toLowerCase() });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.message || 'Failed to send reset link',
        });
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred. Please try again.';

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

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

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
              onPress={() => navigation.goBack()}
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
                Forgot Password?
              </Animated.Text>
              <Animated.Text style={[styles.subtitleText, { opacity: fadeAnim }]}>
                Enter your email address and we'll send you a link to reset your password
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
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isFocused && styles.inputIconFocused]}>
                  <Feather name="mail" size={18} color={isFocused ? '#8B5CF6' : '#9CA3AF'} />
                </View>
                <TextInput
                  style={[styles.input, isFocused && styles.inputFocused]}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                {email.length > 0 && validateEmail(email) && (
                  <Animated.View style={styles.validationIcon}>
                    <Feather name="check-circle" size={18} color="#10B981" />
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            {/* Additional Info Text */}
            <Animated.View
              style={[
                styles.infoContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['#f3e8ff', '#fae8ff']}
                style={styles.infoGradient}
              >
                <Feather name="info" size={16} color="#8B5CF6" />
                <Text style={styles.infoText}>
                  We'll send a verification code to this email address
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Submit Button with Animation */}
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
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isLoading ? ['#C4B5FD', '#C4B5FD'] : ['#8B5CF6', '#A855F7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Reset Link</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Back to Login Link */}
            <Animated.View
              style={[
                styles.backToLoginContainer,
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
                <Text style={styles.backToLoginText}>
                  Remember your password?{' '}
                  <Text style={styles.backToLoginBold}>Login</Text>
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
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
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
    marginBottom: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
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
  validationIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  infoContainer: {
    marginBottom: 32,
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '500',
    lineHeight: 18,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  submitButton: {
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
  submitButtonDisabled: {
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backToLoginContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backToLoginText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  backToLoginBold: {
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

export default ForgotPasswordScreen;