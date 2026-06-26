import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform, PermissionsAndroid } from "react-native";

export async function requestUserPermission() {
  try {
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

async function createNotificationChannel() {
  return await notifee.createChannel({
    id: "default",
    name: "Default Channel",
    importance: AndroidImportance.HIGH,
  });
}

async function showNotification(remoteMessage: any) {
  const channelId = await createNotificationChannel();

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || "New Notification",
    body: remoteMessage.notification?.body || "",
    android: {
      channelId,
      smallIcon: "ic_launcher",
      pressAction: {
        id: "default",
      },
    },
  });
}

export const notificationListener = () => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("📩 Foreground notification:", remoteMessage);
    await showNotification(remoteMessage);
  });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("Notification opened from background:", remoteMessage);
    handleNavigation(remoteMessage?.data);
  });

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

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📩 Background notification:", remoteMessage);
});

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