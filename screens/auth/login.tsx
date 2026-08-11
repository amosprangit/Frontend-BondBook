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
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from "expo-auth-session";
import { useLoginMutation, authApi } from '../../store/api/authApi';
import { postsApi } from '../../store/api/postsApi';
import { storiesApi } from '../../store/api/storiesApi';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getFCMToken } from '../../services/notificationService';
import * as AuthSession from "expo-auth-session";

const { width, height } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const googleButtonScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  // Google Auth Request
  const redirectUri = makeRedirectUri({
    native: "com.eduspark101.bondbookapp://",
  });

  console.log("Google Redirect URI:", redirectUri);

  const [request, response, promptAsync] = useAuthRequest({
    webClientId:
    "853348218920-6je8a6e92jdm5prbubaej0g3pmpg5l1b.apps.googleusercontent.com",
    androidClientId:
      "853348218920-ohpop0mvmpo381tgooclvhani1i2n8vi.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
    redirectUri,
  });

  console.log("Google OAuth request:", {
    ready: !!request,
    clientId: request?.clientId,
    redirectUri: request?.redirectUri,
  });

  // Handle Google login response
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        const { authentication } = response;
        if (authentication?.accessToken) {
          await handleGoogleLogin(authentication.accessToken);
        }
      } else if (response?.type === 'error') {
        console.log('Google login error:', response.error);
        Toast.show({
          type: 'error',
          text1: 'Google Login Failed',
          text2: response.error?.message || 'Something went wrong',
        });
      }
    };

    handleGoogleResponse();
  }, [response]);

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

  const handleGoogleLogin = async (accessToken: string) => {
    setIsGoogleLoading(true);

    // Button press animation
    Animated.sequence([
      Animated.spring(googleButtonScale, {
        toValue: 0.95,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(googleButtonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const response = await fetch('https://bondbook.cloud/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        const { token, user } = data;

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
          text1: 'Welcome!',
          text2: `Hello ${normalizedUser.name || normalizedUser.username || 'there'} 👋`,
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
          text2: data.message || 'Unable to authenticate with Google',
        });
      }
    } catch (error: any) {
      console.log('Google login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: error?.message || 'An error occurred during Google login',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both email and password',
      });
      return;
    }

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


  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.log('Google sign-in error:', error);
      Toast.show({
        type: 'error',
        text1: 'Google Sign-In Failed',
        text2: 'Please try again',
      });
    }
  };

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

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              <View style={styles.content}>
                {/* Animated Logo Section - Enhanced Visibility */}
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
                      colors={['#FF6B9D', '#C084FC', '#8B5CF6']}
                      style={styles.logoGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.logoInnerGlow}>
                        <Image
                          source={require('../../assets/images/logo.png')}
                          resizeMode="contain"
                          style={styles.logoImage}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                  <Animated.Text style={[styles.logoText, { opacity: fadeAnim }]}>
                    BondBook
                  </Animated.Text>
                  <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
                    Connect with your bonds
                  </Animated.Text>
                </Animated.View>

                {/* Input Fields with Enhanced Visibility */}
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
                      <Feather
                        name="mail"
                        size={18}
                        color={isFocusedEmail ? '#8B5CF6' : '#6B7280'}
                      />
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
                      <Feather
                        name="lock"
                        size={18}
                        color={isFocusedPassword ? '#8B5CF6' : '#6B7280'}
                      />
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
                      <Entypo
                        name={showPassword ? "eye" : "eye-with-line"}
                        size={20}
                        color={showPassword ? "#8B5CF6" : "#6B7280"}
                      />
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

                {/* Login Button */}
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
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                {/* <Animated.View
                  style={[
                    styles.dividerContainer,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                  ]}
                >
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Or continue with</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </Animated.View> */}

                {/* Google Login Button */}
                <Animated.View
                  style={[
                    styles.googleButtonContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }, { scale: googleButtonScale }],
                    },
                  ]}
                >
                  {/* <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      console.log("🔵 Google button pressed");
                      console.log("🔵 OAuth request ready:", !!request);
                      console.log("🔵 OAuth redirect URI:", redirectUri);
                      console.log("🔵 OAuth client ID:", request?.clientId);

                      promptAsync();
                    }}
                    disabled={isGoogleLoading || !request}
                  >
                    <LinearGradient
                      colors={isGoogleLoading ? ['#F3F4F6', '#F3F4F6'] : ['#FFFFFF', '#F9FAFB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
                    >
                      {isGoogleLoading ? (
                        <View style={styles.googleLoadingContainer}>
                          <ActivityIndicator color="#8B5CF6" size="small" />
                          <Text style={styles.googleLoadingText}>Signing in...</Text>
                        </View>
                      ) : (
                        <View style={styles.googleButtonContent}>
                          <View style={styles.googleIconContainer}>
                            <Ionicons name="logo-google" size={22} color="#DB4437" />
                          </View>
                          <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity> */}
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
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mbdGradient}
                  >
                    <Text style={styles.mbdText}>BondBook</Text>
                  </LinearGradient>
                </Animated.View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 20,
    marginBottom: 24,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInnerGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  logoTextGradient: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  inputSection: {
    marginTop: 16,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
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
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 48,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#1F2937',
  },
  inputFocused: {
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  loginButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonDisabled: {
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  googleButtonContainer: {
    marginBottom: 24,
  },
  googleButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  googleLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleLoadingText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noAccountText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  poweredByText: {
    color: '#9CA3AF',
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: '800',
  },
});

export default LoginScreen;