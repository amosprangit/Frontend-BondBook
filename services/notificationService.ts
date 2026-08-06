// services/notificationService.ts
import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform, PermissionsAndroid } from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERMISSION_KEY = "@notification_permission_granted";

// ✅ Notification type mapping for navigation
export type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_accepted"
  | "merge_request"
  | "merge_request_accepted"
  | "merge_request_rejected"
  | "new_message"
  | "post_like"
  | "story_like"
  | "comment"
  | "comment_like"
  | "mention"
  | "new_post"
  | "new_story"
  | "profile_update"
  | "reminder_due"
  | "mutual_connection_created"
  | "mutual_connection_post";

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

export const getFCMToken = async () => {
  try {
    console.log("🚀 Registering device for remote messages...");

    await messaging().registerDeviceForRemoteMessages();

    console.log("📲 Requesting fresh FCM token...");

    const token = await messaging().getToken();

    if (!token) {
      console.log("❌ No FCM token returned");
      return null;
    }

    console.log("🔥 Fresh Firebase Token:", token);
    
    // Cache only for comparison, not as the source of truth
    await AsyncStorage.setItem("@fcm_token", token);

    return token;
  } catch (error) {
    console.error("❌ Error getting FCM token:", error);
    return null;
  }
};
async function createNotificationChannel() {
  const existingChannel = await notifee.getChannel("bondbook");
  if (existingChannel) {
    console.log("✅ Notification channel already exists");
    return "default";
  }

  console.log("📢 Creating notification channel...");
  try {
    const channelId = await notifee.createChannel({
      id: "default",
      name: "BondBook Notifications",
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: "default",
      lightColor: "#8B5CF6",
      lights: true,
      vibrationPattern: [300, 500],
    });
    console.log("✅ Channel created:", channelId);
    return channelId;
  } catch (error) {
    console.error("❌ Failed to create channel:", error);
    return "default"; // Fallback to default
  }
}

async function showNotification(remoteMessage: any) {
  console.log("📱 showNotification called");
  console.log("📱 remoteMessage:", JSON.stringify(remoteMessage, null, 2));

  // ✅ Check if notification payload exists
  if (!remoteMessage.notification) {
    console.log("⚠️ No notification payload in message");
    console.log("📊 Data payload:", remoteMessage.data);

    // Try to show notification from data if available
    if (remoteMessage.data) {
      const title =
        remoteMessage.data.title ||
        getNotificationTitle(remoteMessage.data.type);
      const body = remoteMessage.data.body || "You have a new notification";

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: "default",
          smallIcon: "ic_launcher",
          pressAction: {
            id: "default",
          },
        },
        data: remoteMessage.data,
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
      data: remoteMessage.data,
    });
    console.log("✅ Notification displayed successfully!");
  } catch (error) {
    console.error("❌ Failed to display notification:", error);
  }
}

// ✅ Helper function to get notification title based on type
function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    follow: "👋 New Follower!",
    follow_request: "📨 New Follow Request",
    follow_accepted: "✅ Follow Request Accepted",
    merge_request: "🔗 New Connection Request",
    merge_request_accepted: "✅ Connection Request Accepted",
    merge_request_rejected: "❌ Connection Request Declined",
    new_message: "💬 New Message",
    post_like: "❤️ Liked Your Post",
    story_like: "❤️ Liked Your Story",
    comment: "💬 New Comment",
    comment_like: "❤️ Liked Your Comment",
    mention: "📌 Mentioned You",
    new_post: "📝 New Post",
    new_story: "📖 New Story",
    profile_update: "✏️ Profile Updated",
    reminder_due: "⏰ Reminder Due",
  };
  return titles[type] || "📱 New Notification";
}

// ✅ Helper function to get navigation screen based on type
function getNavigationScreen(
  type: string,
  data: any,
): { screen: string; params: any } {
  console.log("🧭 Getting navigation screen for type:", type);

  switch (type) {
    case "post_like":
    case "comment":
    case "comment_like":
    case "mention":
      return {
        screen: "PostDetail",
        params: { postId: data?.postId || data?.relatedId },
      };

    case "story_like":
      return {
        screen: "StoryView",
        params: { storyId: data?.storyId || data?.relatedId },
      };

    case "follow":
    case "follow_accepted":
    case "follow_request":
      return {
        screen: "UserProfile",
        params: { userId: data?.userId || data?.senderId },
      };

    case "merge_request":
      return {
        screen: "MergeRequest",
        params: { mergeRequestId: data?.mergeRequestId },
      };

    case "merge_request_accepted":
      return {
        screen: "Chat",
        params: {
          mutualConnectionId: data?.connectionId,
          displayName: data?.username,
        },
      };

    case "merge_request_rejected":
      return {
        screen: "Notifications",
        params: {},
      };

    case "new_message":
      return {
        screen: "Chat",
        params: {
          mutualConnectionId: data?.mutualConnectionId,
          displayName: data?.username,
        },
      };

    case "new_post":
      return {
        screen: "PostDetail",
        params: { postId: data?.postId },
      };

    case "new_story":
      return {
        screen: "StoryView",
        params: { storyId: data?.storyId },
      };

    case "profile_update":
      return {
        screen: "UserProfile",
        params: { userId: data?.userId },
      };

    case "reminder_due":
      return {
        screen: "Reminders",
        params: {},
      };

    default:
      return {
        screen: "Notifications",
        params: {},
      };
  }
}

function handleNavigation(data: any, navigationRef: any) {
  if (!data || !navigationRef) {
    console.log("⚠️ No navigation data or ref available");
    return;
  }

  console.log("🧭 Navigating from notification:", data);

  // ✅ Get the type from data
  const type = data.type || data.notificationType;
  if (!type) {
    console.log("⚠️ No type in notification data");
    navigationRef.navigate("Notifications");
    return;
  }

  const { screen, params } = getNavigationScreen(type, data);
  console.log(`🧭 Navigating to ${screen} with params:`, params);

  try {
    navigationRef.navigate(screen, params);
  } catch (error) {
    console.error("❌ Navigation error:", error);
    // Fallback to notifications screen
    navigationRef.navigate("Notifications");
  }
}

export const notificationListener = (
  navigationRef: NavigationContainerRef<any>,
) => {
  console.log("👂 Setting up notification listeners...");

  // ✅ Foreground notification handler
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

  // ✅ App opened from background (notification tap)
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("📱 App opened from background notification:", remoteMessage);
    const data = remoteMessage?.data || remoteMessage?.notification?.data;
    handleNavigation(data, navigationRef);
  });

  // ✅ App opened from quit state (notification tap)
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log(
          "📱 App opened from quit state notification:",
          remoteMessage,
        );
        const data = remoteMessage?.data || remoteMessage?.notification?.data;
        handleNavigation(data, navigationRef);
      }
    });

  // ✅ Handle notification press when app is in foreground with notifee
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === 1) {
      // PRESS event
      console.log("📱 Notifee foreground press:", detail);
      const data = detail.notification?.data;
      if (data) {
        handleNavigation(data, navigationRef);
      }
    }
  });

  console.log("✅ Notification listeners set up!");
  return unsubscribe;
};

// ✅ Background message handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("📦📦📦 BACKGROUND NOTIFICATION RECEIVED 📦📦📦");
  console.log("📦 Full message:", JSON.stringify(remoteMessage, null, 2));

  // Show notification in background
  await showNotification(remoteMessage);
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

// ✅ New helper to handle different notification types
export const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    follow: "👋",
    follow_request: "📨",
    follow_accepted: "✅",
    merge_request: "🔗",
    merge_request_accepted: "✅",
    merge_request_rejected: "❌",
    new_message: "💬",
    post_like: "❤️",
    story_like: "❤️",
    comment: "💬",
    comment_like: "❤️",
    mention: "📌",
    new_post: "📝",
    new_story: "📖",
    profile_update: "✏️",
    reminder_due: "⏰",
  };
  return icons[type] || "📱";
};

// ✅ New helper to format notification message
export const formatNotificationMessage = (
  type: string,
  senderName?: string,
  extra?: string,
): string => {
  const messages: Record<string, string> = {
    follow: `${senderName || "Someone"} started following you`,
    follow_request: `${senderName || "Someone"} sent you a follow request`,
    follow_accepted: `${senderName || "Someone"} accepted your follow request`,
    merge_request: `${senderName || "Someone"} wants to connect with you`,
    merge_request_accepted: `${senderName || "Someone"} accepted your connection request`,
    merge_request_rejected: `${senderName || "Someone"} declined your connection request`,
    new_message: `${senderName || "Someone"}: ${extra || "Sent you a message"}`,
    post_like: `${senderName || "Someone"} liked your post`,
    story_like: `${senderName || "Someone"} liked your story`,
    comment: `${senderName || "Someone"} commented: ${extra || ""}`,
    comment_like: `${senderName || "Someone"} liked your comment`,
    mention: `${senderName || "Someone"} mentioned you in a post`,
    new_post: `${senderName || "Someone"} created a new post`,
    new_story: `${senderName || "Someone"} created a new story`,
    profile_update: `${senderName || "Someone"} updated their profile`,
    reminder_due: `Reminder: ${extra || "Your reminder is due"}`,
  };
  return messages[type] || `${senderName || "Someone"} interacted with you`;
};
