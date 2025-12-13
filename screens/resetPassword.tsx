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
import { useResetPasswordMutation } from '../store/api/authApi';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const ResetPasswordScreen = ({ navigation, route }: any) => {
  const { email } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    try {
      const result = await resetPassword({ 
        email: email,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      }).unwrap();
      
      console.log('Reset Password result:', result);
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message || 'Password reset successfully!',
        });
        
        // Navigate to Login and reset navigation stack
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: result.message || 'Failed to reset password',
        });
      }
    } catch (error: any) {
      console.error('Reset Password error:', error);
      
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
            <Text style={styles.titleText}>Reset Password</Text>
            <Text style={styles.subtitleText}>
              Create a new password for your account
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {/* New Password Input */}
            <View style={styles.passwordContainer}>
              <Entypo name="lock" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                placeholderTextColor="#8E8E93"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Entypo name={showNewPassword ? "eye" : "eye-with-line"} size={20} color="#8B5CF6" />
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

          {/* Reset Button */}
          <TouchableOpacity 
            style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            <Text style={styles.resetButtonText}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
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
  inputIcon: {
    marginRight: 10,
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
  resetButton: {
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
  resetButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0.1,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
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

export default ResetPasswordScreen;
