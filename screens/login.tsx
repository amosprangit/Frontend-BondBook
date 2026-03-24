import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoginMutation, authApi } from '../store/api/authApi';
import { postsApi } from '../store/api/postsApi';
import { storiesApi } from '../store/api/storiesApi';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();

  // const handleLogin = async () => {
  //   if (!email.trim() || !password.trim()) {
  //     Toast.show({
  //       type: 'error',
  //       text1: 'Error',
  //       text2: 'Please enter both email and password',
  //     });
  //     return;
  //   }

  //   try {
  //     const result = await login({ email, password }).unwrap();
  //   let token, user;

  //     if (result.success && result.data) {
  //       // Format 1: Wrapped response
  //       token = result.data.token;
  //       user = result.data.user;
  //     } else if (result.token || result.user) {
  //       // Format 2: Direct response
  //       token = result.token;
  //       user = result.user;
  //     } else if (result.data && (result.data.token || result.data.user)) {
  //       // Format 3: Data wrapper only
  //       token = result.data.token;
  //       user = result.data.user;
  //     }

  //     if (token && user) {
  //       // Normalize user object - convert _id to id if needed
  //       const normalizedUser = {
  //         ...user,
  //         id: user.id || user._id, // Use id if exists, otherwise use _id
  //       };

  //       // Save credentials to Redux store
  //       dispatch(setCredentials({
  //         user: normalizedUser,
  //         token: token,
  //       }));

  //       // Reset all API caches to ensure fresh data for new user
  //       dispatch(authApi.util.resetApiState());
  //       dispatch(postsApi.util.resetApiState());
  //       dispatch(storiesApi.util.resetApiState());

  //       // Save token and user to AsyncStorage for persistence
  //       try {
  //         await AsyncStorage.setItem('userToken', token);
  //         await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
  //       } catch (storageError) {
  //         console.error('Error saving to AsyncStorage:', storageError);
  //       }

  //       Toast.show({
  //         type: 'success',
  //         text1: 'Success',
  //         text2: 'Login successful!',
  //       });

  //       // Navigate to Home and reset navigation stack to prevent back navigation
  //       navigation.dispatch(
  //         CommonActions.reset({
  //           index: 0,
  //           routes: [{ name: 'Home' }],
  //         })
  //       );
  //     } else {
  //       console.log(result,"error");
  //       Toast.show({
  //         type: 'error',
  //         text1: 'Login Failed',
  //         text2: result.message || 'Invalid credentials',
  //       });
  //     }
  //   } catch (error: any) {

  //     console.error('Login error:', error);
  //     console.error('Error details:', JSON.stringify(error, null, 2));

  //     let errorMessage = 'An error occurred during login. Please try again.';

  //     if (error?.data?.message) {
  //       errorMessage = error.data.message;
  //     } else if (error?.message) {
  //       errorMessage = error.message;
  //     } else if (error?.status) {
  //       errorMessage = `Server error: ${error.status}`;
  //     }

  //     Toast.show({
  //       type: 'error',
  //       text1: 'Login Error',
  //       text2: errorMessage,
  //     });
  //   }
  // };
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both email and password',
      });
      return;
    }

    try {
      const result = await login({ email, password }).unwrap();
      let token, user;

      // ✅ FIXED EXTRACTION LOGIC: Grabs token/user wherever they hide!
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

        // Save credentials to Redux store
        dispatch(
          setCredentials({
            user: normalizedUser,
            token: token,
          })
        );

        // Reset all API caches
        dispatch(authApi.util.resetApiState());
        dispatch(postsApi.util.resetApiState());
        dispatch(storiesApi.util.resetApiState());

        // Save to AsyncStorage for app persistence
        try {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
        } catch (storageError) {
          console.error('Error saving to AsyncStorage:', storageError);
        }

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Login successful!',
        });

        // Navigate to Home and reset navigation stack
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
      } else {
        console.log('Parsing fallback triggered. Result data:', result);
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: result.message || 'Unable to parse user credentials.',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        {/* BondBook Logo with Gradient */}
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/logo.png')} resizeMode='contain' style={{ width: 150, height: 150 }} />
        </View>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8E8E93"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
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
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Logging...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Create New Account Link */}
        <TouchableOpacity
          style={styles.createAccountContainer}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.createAccountText}>Create new account</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.mbdText}>M_BD</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    fontStyle: 'italic',
    // Gradient effect simulation with multiple text shadows
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    color: '#7C3AED',
    // Additional shadow for gradient effect
    shadowColor: '#06B6D4',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
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
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingRight: 60,
    fontSize: 16,
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
  eyeIcon: {
    position: 'absolute',
    right: 20,
    top: 10,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#6B46C1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  createAccountText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subWelcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
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
});

export default LoginScreen;
