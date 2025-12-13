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
import { useVerifyResetOtpMutation, useResendOtpMutation } from '../store/api/authApi';

const { width, height } = Dimensions.get('window');

const VerifyResetOtpScreen = ({ navigation, route }: any) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [verifyResetOtp, { isLoading: isVerifying }] = useVerifyResetOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

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
      const result = await verifyResetOtp({ 
        email: email, 
        otp: otp.trim() 
      }).unwrap();
      
      console.log('Verify Reset OTP result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'OTP verified successfully!',
        });
        
        // Navigate to reset password screen
        navigation.navigate('ResetPassword', { email: email, otp: otp.trim() });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: result.message || 'Invalid OTP',
        });
      }
    } catch (error: any) {
      console.error('Verify Reset OTP error:', error);
      
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
      const result = await resendOtp({ email }).unwrap();
      
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
            <Text style={styles.titleText}>Verify OTP</Text>
            <Text style={styles.subtitleText}>
              Enter the 6-digit code sent to {email}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.inputContainer}>
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
            style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]} 
            onPress={handleVerifyOtp}
            disabled={isVerifying}
          >
            <Text style={styles.verifyButtonText}>
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
    fontWeight: 'bold',
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
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0.1,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
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

export default VerifyResetOtpScreen;
