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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Entypo } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useForgotPasswordMutation } from '../store/api/authApi';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

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

    try {
      const result = await forgotPassword({ 
        email: email.trim().toLowerCase() 
      }).unwrap();
      
      console.log('Forgot Password result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP sent to your email!',
        });
        
        // Navigate to verify reset OTP screen
        navigation.navigate('VerifyResetOtp', { email: email.trim().toLowerCase() });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.message || 'Failed to send reset link',
        });
      }
    } catch (error: any) {
      console.error('Forgot Password error:', error);
      
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>

          {/* Logo and Header */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/logo.png')} 
              resizeMode='contain' 
              style={styles.logo} 
            />
            <Text style={styles.titleText}>Forgot Password?</Text>
            <Text style={styles.subtitleText}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
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
                autoFocus
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity 
            style={styles.backToLoginContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>
              Remember your password? <Text style={styles.backToLoginBold}>Login</Text>
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
    marginBottom: 40,
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
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backToLoginContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backToLoginText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backToLoginBold: {
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
});

export default ForgotPasswordScreen;
