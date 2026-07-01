// services/notificationService.ts
import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform, PermissionsAndroid } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERMISSION_KEY = "@notification_permission_granted";

export async function requestUserPermission() {
  try {
    const permissionAlreadyGranted = await AsyncStorage.getItem(PERMISSION_KEY);

    if (permissionAlreadyGranted === "true") {
      console.log("✅ Notification permission already granted previously");
      const authStatus = await messaging().hasPermission();
      if (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      ) {
        return true;
      } else {
        await AsyncStorage.removeItem(PERMISSION_KEY);
      }
    }

    console.log("🔔 Requesting notification permission...");

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const hasPostPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (!hasPostPermission) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log("❌ POST_NOTIFICATIONS denied");
          return false;
        }
      }
    }

    const currentStatus = await messaging().hasPermission();

    if (
      currentStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      currentStatus === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      console.log("✅ Notification permission already granted");
      await AsyncStorage.setItem(PERMISSION_KEY, "true");
      return true;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("✅ Notification permission granted");
      await AsyncStorage.setItem(PERMISSION_KEY, "true");
    } else {
      console.log("❌ Notification permission denied");
    }

    return enabled;
  } catch (error) {
    console.log("Permission error:", error);
    return false;
  }
}

export async function getFCMToken() {
  try {
    const storedToken = await AsyncStorage.getItem("@fcm_token");

    if (storedToken) {
      console.log("📱 Using stored FCM token");
      return storedToken;
    }

    if (
      Platform.OS === "ios" &&
      !messaging().isDeviceRegisteredForRemoteMessages
    ) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    console.log("🔥 FCM TOKEN:", token);

    if (token) {
      await AsyncStorage.setItem("@fcm_token", token);
    }

    return token;
  } catch (error) {
    console.log("Token error:", error);
    return null;
  }
}

async function createNotificationChannel() {
  const existingChannel = await notifee.getChannel("default");
  if (existingChannel) {
    return "default";
  }

  console.log("📢 Creating notification channel...");
  return await notifee.createChannel({
    id: "default",
    name: "Default Channel",
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: "default",
  });
}

// ✅ FIXED: showNotification with better logging
async function showNotification(remoteMessage: any) {
  console.log("📱 showNotification called");
  console.log("📱 remoteMessage:", JSON.stringify(remoteMessage, null, 2));

  // ✅ Check if notification payload exists
  if (!remoteMessage.notification) {
    console.log("⚠️ No notification payload in message");
    console.log("📊 Data payload:", remoteMessage.data);
    // Try to show notification from data if available
    if (remoteMessage.data) {
      await notifee.displayNotification({
        title: remoteMessage.data.title || "New Notification",
        body: remoteMessage.data.body || "You have a new notification",
        android: {
          channelId: "default",
          smallIcon: "ic_launcher",
          pressAction: {
            id: "default",
          },
        },
      });
      console.log("✅ Notification displayed from data payload");
    }
    return;
  }

  console.log("📝 Notification title:", remoteMessage.notification.title);
  console.log("📝 Notification body:", remoteMessage.notification.body);

  try {
    const channelId = await createNotificationChannel();
    await notifee.displayNotification({
      title: remoteMessage.notification.title || "New Notification",
      body: remoteMessage.notification.body || "",
      android: {
        channelId,
        smallIcon: "ic_launcher",
        pressAction: {
          id: "default",
        },
      },
    });
    console.log("✅ Notification displayed successfully!");
  } catch (error) {
    console.error("❌ Failed to display notification:", error);
  }
}

function handleNavigation(data: any, navigationRef: any) {
  if (!data || !navigationRef) return;

  console.log("🧭 Navigating to:", data.type);

  switch (data.type) {
    case "post_like":
    case "comment":
    case "comment_like":
    case "mention":
      navigationRef.navigate("PostDetail", { postId: data.postId });
      break;

    case "story_like":
      navigationRef.navigate("StoryView", { storyId: data.storyId });
      break;

    case "follow_request":
      navigationRef.navigate("FollowRequests");
      break;

    case "follow_accepted":
      navigationRef.navigate("UserProfile", { userId: data.userId });
      break;

    default:
      navigationRef.navigate("Notifications");
  }
}

export const notificationListener = (
  navigationRef: NavigationContainerRef<any>,
) => {
  console.log("👂 Setting up notification listeners...");

  // ✅ FIXED: Foreground notification handler with better logging
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("📩📩📩 FOREGROUND NOTIFICATION RECEIVED 📩📩📩");
    console.log("📩 Full message:", JSON.stringify(remoteMessage, null, 2));

    if (remoteMessage.notification) {
      console.log("✅ Has notification payload");
      console.log("  - Title:", remoteMessage.notification.title);
      console.log("  - Body:", remoteMessage.notification.body);
    } else {
      console.log("⚠️ No notification payload, only data:", remoteMessage.data);
    }

    await showNotification(remoteMessage);
  });

  // App opened from background
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("📱 App opened from background:", remoteMessage);
    handleNavigation(remoteMessage?.data, navigationRef);
  });

  // App opened from quit state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("📱 App opened from quit state:", remoteMessage);
        handleNavigation(remoteMessage?.data, navigationRef);
      }
    });

  console.log("✅ Notification listeners set up!");
  return unsubscribe;
};

// Background handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📦📦📦 BACKGROUND NOTIFICATION RECEIVED 📦📦📦");
  console.log("📦 Full message:", JSON.stringify(remoteMessage, null, 2));
});

export const checkNotificationPermission = async () => {
  try {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.log("Check permission error:", error);
    return false;
  }
};

export const resetNotificationPermission = async () => {
  try {
    await AsyncStorage.removeItem(PERMISSION_KEY);
    await AsyncStorage.removeItem("@fcm_token");
    console.log("🔄 Notification permission reset");
    return true;
  } catch (error) {
    console.log("Reset permission error:", error);
    return false;
  }
};

// ✅ TEST FUNCTION: Test local notification
export const testLocalNotification = async () => {
  console.log("🧪 Testing local notification...");
  const channelId = await createNotificationChannel();
  await notifee.displayNotification({
    title: "🔔 Test Notification",
    body: "If you see this, notifee is working!",
    android: {
      channelId,
      smallIcon: "ic_launcher",
    },
  });
  console.log("✅ Test notification sent!");
};
