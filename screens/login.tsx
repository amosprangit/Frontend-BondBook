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
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoginMutation, authApi } from '../store/api/authApi';
import { postsApi } from '../store/api/postsApi';
import { storiesApi } from '../store/api/storiesApi';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getFCMToken } from '../services/notificationService';
const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();

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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both email and password',
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
      const result = await login({ email, password }).unwrap();
      let token, user;
      if (result.token && result.user) {
        token = result.token;
        user = result.user;
      } else if (result.data?.token && result.data?.user) {
        token = result.data.token;
        user = result.data.user;
      }

      if (token && user) {
        const normalizedUser = {
          ...user,
          id: user.id || user._id,
        };

        dispatch(
          setCredentials({
            user: normalizedUser,
            token: token,
          })
        );

        dispatch(authApi.util.resetApiState());
        dispatch(postsApi.util.resetApiState());
        dispatch(storiesApi.util.resetApiState());
        
        const fcmToken = await getFCMToken();

        console.log("Saving FCM Token:", fcmToken);

        if (fcmToken) {
          try {
            await fetch("https://bondbook.cloud/api/users/save-fcm-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                fcmToken: fcmToken,
              }),
            });

            console.log("FCM token saved to backend");

          } catch (err) {
            console.log("Error saving FCM token:", err);
          }
        }

        try {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
        } catch (storageError) {
          console.error('Error saving to AsyncStorage:', storageError);
        }

        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: `Hello ${normalizedUser.name || 'there'} 👋`,
        });

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: result.message || 'Unable to parse user credentials.',
        });
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during login. Please try again.';

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: errorMessage,
      });
    }
  };

  const handleSocialLogin = (provider: string) => {
    Toast.show({
      type: 'info',
      text1: `${provider}`,
      text2: `${provider} login coming soon!`,
    });
  };

  // Shimmer transform
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#ffffff', '#f8f4ff', '#f0eaff']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

          <View style={styles.content}>
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
                    source={require('../assets/images/logo.png')}
                    resizeMode="contain"
                    style={styles.logoImage}
                  />
                </LinearGradient>
              </View>
              <Animated.Text style={[styles.logoText, { opacity: fadeAnim }]}>
                BondBook
              </Animated.Text>
              <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
                Connect with your bonds
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
                <View style={[styles.inputIcon, isFocusedEmail && styles.inputIconFocused]}>
                  <Feather name="mail" size={18} color={isFocusedEmail ? '#8B5CF6' : '#9CA3AF'} />
                </View>
                <TextInput
                  style={[styles.input, isFocusedEmail && styles.inputFocused]}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocusedEmail(true)}
                  onBlur={() => setIsFocusedEmail(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isFocusedPassword && styles.inputIconFocused]}>
                  <Feather name="lock" size={18} color={isFocusedPassword ? '#8B5CF6' : '#9CA3AF'} />
                </View>
                <TextInput
                  style={[styles.input, isFocusedPassword && styles.inputFocused, { paddingRight: 50 }]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsFocusedPassword(true)}
                  onBlur={() => setIsFocusedPassword(false)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Entypo name={showPassword ? "eye" : "eye-with-line"} size={20} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Forgot Password */}
            <Animated.View
              style={[
                styles.forgotContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Button with Animation */}
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
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isLoading ? ['#C4B5FD', '#C4B5FD'] : ['#8B5CF6', '#A855F7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>LogIn</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Social Login Section */}
            <Animated.View
              style={[
                styles.socialSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Google')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#f8f9fa', '#f1f3f5']}
                    style={styles.socialButtonGradient}
                  >
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Apple')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#f8f9fa', '#f1f3f5']}
                    style={styles.socialButtonGradient}
                  >
                    <Ionicons name="logo-apple" size={24} color="#000000" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Facebook')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#f8f9fa', '#f1f3f5']}
                    style={styles.socialButtonGradient}
                  >
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Create Account Link */}
            <Animated.View
              style={[
                styles.createAccountContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={styles.noAccountText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.createAccountText}>Sign Up</Text>
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
          </View>

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
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 30,
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
  logoImage: {
    width: 70,
    height: 70,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#7C3AED',
    letterSpacing: 1,
    marginBottom: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  inputSection: {
    marginTop: 20,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
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
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  loginButton: {
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
  loginButtonDisabled: {
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  socialSection: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noAccountText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  createAccountText: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
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

export default LoginScreen;