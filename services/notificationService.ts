import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { getApp } from "@react-native-firebase/app";
import { Platform, PermissionsAndroid } from "react-native";

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
 * Create Notification Channel (Android)
 */
async function createNotificationChannel() {
  return await notifee.createChannel({
    id: "default",
    name: "Default Channel",
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Show Notification (foreground)
 */
async function showNotification(remoteMessage: any) {
  const channelId = await createNotificationChannel();

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || "New Notification",
    body: remoteMessage.notification?.body || "",
    android: {
      channelId,
      smallIcon: "ic_launcher", // ensure icon exists
      pressAction: {
        id: "default",
      },
    },
  });
}

/**
 * Notification listeners
 */
export const notificationListener = () => {
  // Foreground notification (🔥 THIS IS THE FIX)
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("📩 Foreground notification:", remoteMessage);

    // ❌ REMOVE Alert
    // ✅ SHOW SYSTEM NOTIFICATION
    await showNotification(remoteMessage);
  });

  // App opened from background
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("Notification opened from background:", remoteMessage);

    handleNavigation(remoteMessage?.data);
  });

  // App opened from killed state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("App opened from quit state:", remoteMessage);
        handleNavigation(remoteMessage?.data);
      }
    });

  return unsubscribe;
};

/**
 * Background notifications (optional log)
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📦 Background notification:", remoteMessage);
});

/**
 * Handle navigation (clean separation)
 */
function handleNavigation(data: any) {
  if (!data) return;

  if (data.type === "post_like") {
    console.log("➡️ Open Post:", data.postId);
  }

  if (data.type === "comment") {
    console.log("➡️ Open Comments:", data.postId);
  }

  if (data.type === "follow") {
    console.log("➡️ Open Profile:", data.userId);
  }
}
