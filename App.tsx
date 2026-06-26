import * as React from 'react';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { store } from './store';

import {
  requestUserPermission,
  getFCMToken,
  notificationListener
} from './services/notificationService';

export default function App() {
  useEffect(() => {
    const initNotifications = async () => {
      setTimeout(async () => {
        try {
          console.log("🚀 Starting Notification Setup...");

          const hasPermission = await requestUserPermission();

          if (hasPermission) {
            console.log("✅ Permission confirmed!");
            const token = await getFCMToken();
            if (token) {
              console.log("🔥 FCM TOKEN READY", token);
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