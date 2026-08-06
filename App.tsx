import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AppNavigator from './navigation/AppNavigator';
import { store } from './store';
import { requestUserPermission, getFCMToken, notificationListener, checkNotificationPermission } from './services/notificationService';
import { notificationApi } from './store/api/notificationApi';

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('Initializing...');
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const saveFCMTokenToBackend = async (fcmToken: string) => {
    try {
      const result = await store.dispatch(
        notificationApi.endpoints.saveFCMToken.initiate({ fcmToken })
      );
      if (result.data?.success) {
        console.log('✅ Token saved to backend!');
        return true;
      } else {
        console.log('❌ Failed to save token:', result.error);
        return false;
      }
    } catch (error) {
      console.log('❌ Error saving token:', error);
      return false;
    }
  };

  const setupTokenRefresh = () => {
    return messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM Token Refreshed:', newToken);
      await saveFCMTokenToBackend(newToken);
    });
  };

  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log("🚀 Starting Notification Setup...");
        setNotificationStatus('Checking permission...');
        const hasPermission = await checkNotificationPermission();
        console.log('📱 Initial permission check:', hasPermission);

        if (hasPermission) {
          setNotificationStatus('Permission already granted...');

          const fcmToken = await getFCMToken();
          if (fcmToken) {
            setNotificationStatus('✅ Notifications ready!');
            console.log("🔥 FCM TOKEN READY", fcmToken);
            await saveFCMTokenToBackend(fcmToken);
          }
          notificationListener(navigationRef);
          setIsReady(true);
          return;
        }

        setNotificationStatus('Requesting permission...');
        const granted = await requestUserPermission();

        if (granted) {
          setNotificationStatus('Permission granted, getting token...');
          console.log("✅ Permission confirmed!");

          const fcmToken = await getFCMToken();
          if (fcmToken) {
            setNotificationStatus('✅ Notifications ready!');
            console.log("🔥 FCM TOKEN READY", fcmToken);
            await saveFCMTokenToBackend(fcmToken);
          }
          notificationListener(navigationRef);
        } else {
          setNotificationStatus('❌ Permission denied');
          console.log("❌ Permission denied or failed");
        }

        setIsReady(true);
      } catch (error) {
        console.log("Critical Notification Error:", error);
        setNotificationStatus('❌ Error initializing');
        setIsReady(true);
      }
    };

    setTimeout(initNotifications, 1000);

    const unsubscribeRefresh = setupTokenRefresh();

    return () => {
      if (unsubscribeRefresh) {
        unsubscribeRefresh();
      }
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#4B5563' }}>{notificationStatus}</Text>
        {notificationStatus.includes('Permission') && (
          <Text style={{ marginTop: 10, fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 }}>
            Please allow notifications for the best experience
          </Text>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
      <Toast />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}