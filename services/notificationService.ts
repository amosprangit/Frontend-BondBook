import messaging from "@react-native-firebase/messaging";
import { getApp } from "@react-native-firebase/app";
import { Alert, Platform, PermissionsAndroid } from "react-native";

/**
 * Request notification permissions
 */
export async function requestUserPermission() {
  try {
    getApp();

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  } catch (error) {
    console.log("Permission error:", error);
    return false;
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken() {
  try {
    if (
      Platform.OS === "ios" &&
      !messaging().isDeviceRegisteredForRemoteMessages
    ) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    console.log("🔥 FCM TOKEN:", token);

    return token;
  } catch (error) {
    console.log("Token error:", error);
    return null;
  }
}

/**
 * Notification listeners
 */
export const notificationListener = () => {
  // Foreground notification
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("📩 Foreground notification:", remoteMessage);

    Alert.alert(
      remoteMessage.notification?.title || "New Notification",
      remoteMessage.notification?.body || "",
    );
  });

  // App opened from background
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("Notification opened from background:", remoteMessage);

    const data = remoteMessage.data;

    if (data?.type === "post_like") {
      console.log("Open Post:", data.postId);
    }

    if (data?.type === "comment") {
      console.log("Open Comments:", data.postId);
    }

    if (data?.type === "follow") {
      console.log("Open Profile:", data.userId);
    }
  });

  // App opened from killed state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("App opened from quit state:", remoteMessage);
      }
    });

  return unsubscribe;
};

/**
 * Background notifications
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📦 Background notification:", remoteMessage);
});
