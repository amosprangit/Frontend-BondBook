import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { setCredentials } from '../store/slices/authSlice';
import uploadPostScreen from '../components/UploadPost';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/login';
import RegisterScreen from '../screens/register';
import ForgotPasswordScreen from '../screens/forgotPassword';
import VerifyResetOtpScreen from '../screens/verifyResetOtp';
import ResetPasswordScreen from '../screens/resetPassword';
import UserInfoScreen from '../screens/userInfo';
import RemindersScreen from '../screens/reminders';
import AddReminderScreen from '../screens/addReminder';
import MutualConnectionProfileScreen from '../screens/mutualConnectionProfile';
import SettingsScreen from '../screens/settings';
import NotificationScreen from '../screens/notifications';
import ChatListScreen from '../screens/chatList';
import ChatScreen from '../screens/chat';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (token && userData) {
        const user = JSON.parse(userData);
        // Restore credentials to Redux store
        dispatch(setCredentials({ user, token }));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }} 
      initialRouteName={isAuthenticated ? "Home" : "Login"}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyResetOtp" component={VerifyResetOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Home" component={TabNavigator} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="UserInfo" component={UserInfoScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} />
      <Stack.Screen name="ChatScreen" component={ChatListScreen} />
      <Stack.Screen name="Chats" component={ChatScreen} />
      <Stack.Screen name="MutualConnectionProfile" component={MutualConnectionProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="UploadPost" component={uploadPostScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
