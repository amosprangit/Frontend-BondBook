import * as React from 'react';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import the modular app and initialization functions
import ReactNativeFirebaseApp from '@react-native-firebase/app';

import AppNavigator from './navigation/AppNavigator';
import { store } from './store';

import {
  requestUserPermission,
  getFCMToken,
  notificationListener
} from './services/notificationService';

// Initialize Firebase immediately outside the component
if (!ReactNativeFirebaseApp.apps.length) {
  try {
    ReactNativeFirebaseApp.initializeApp();
    console.log("✅ Firebase initialized successfully");
  } catch (e) {
    console.log("❌ Firebase init error:", e);
  }
}

export default function App() {

  useEffect(() => {
    const initNotifications = async () => {
      // Small delay ensures the native bridge is 100% awake before requesting
      setTimeout(async () => {
        try {
          console.log("🚀 Starting Notification Setup...");

          const hasPermission = await requestUserPermission();

          if (hasPermission) {
            console.log("✅ Permission confirmed!");
            const token = await getFCMToken();
            if (token) {
              console.log("🔥 FCM TOKEN READY", token);
              // If you need to save the token to your backend, do it here
            }
            notificationListener();
          } else {
            console.log("❌ Permission denied or failed");
          }
        } catch (error) {
          console.log("Critical Notification Error:", error);
        }
      }, 2000);
    };

    initNotifications();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </GestureHandlerRootView>
      <Toast />
    </Provider>
  );
}