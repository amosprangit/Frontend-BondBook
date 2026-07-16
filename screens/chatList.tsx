import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGetMutualConnectionsQuery } from "../store/api/mutualConnectionsApi";
import { useAppSelector } from "../store/hooks";
import Toast from 'react-native-toast-message';
import CustomMenu from "../components/custom_menu";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type IconFamily = 'Ionicons' | 'Feather' | 'MaterialIcons';

interface MenuOption {
  id: string;
  title: string;
  icon: string;
  iconType?: IconFamily;
  onPress: () => void;
  destructive?: boolean;
}

export default function ChatListScreen({ navigation }: { navigation: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { data, isLoading, refetch, isFetching } = useGetMutualConnectionsQuery(undefined, {
    pollingInterval: 5000
  });

  const mutualConnections = data?.mutualConnections || [];

  // ✅ Debug: Log the data to see what's coming from API
  console.log("📊 Mutual Connections Data:", JSON.stringify(mutualConnections[0], null, 2));

  const filteredConnections = mutualConnections.filter((connection: any) =>
    connection.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedConnections = [...filteredConnections].sort((a: any, b: any) => {
    const dateA = a.lastMessage?.createdAt || a.updatedAt;
    const dateB = b.lastMessage?.createdAt || b.updatedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const handleChatPress = (connection: any) => {
    navigation.navigate("Chats", {
      mutualConnectionId: connection._id,
      connectionId: connection.connectionId,
      displayName: connection.displayName,
      otherUser: connection.otherUser
    });
  };

  const formatTimestamp = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getProfilePicture = (item: any) => {
    if (item?.profilePicture) {
      return `${API_URL}/${item.profilePicture.replace(/^\//, "")}`;
    }
    if (item?.otherUser?.profilePicture) {
      return `${API_URL}/${item.otherUser.profilePicture.replace(/^\//, "")}`;
    }
    return null;
  };

  const getDisplayName = (item: any) => {
    if (item?.displayName) return item.displayName;
    if (item?.otherUser?.username) return item.otherUser.username;
    if (item?.otherUser?.displayName) return item.otherUser.displayName;
    return "User";
  };

  // ✅ FIXED: Get last message content with fallbacks
  const getLastMessageContent = (item: any) => {
    // Try multiple possible paths for the last message
    if (item?.lastMessage?.content) {
      return item.lastMessage.content;
    }
    if (item?.lastMessage?.text) {
      return item.lastMessage.text;
    }
    if (item?.lastMessage?.message) {
      return item.lastMessage.message;
    }
    if (item?.lastMessage) {
      // If lastMessage exists but has no content field, stringify it
      return typeof item.lastMessage === 'string'
        ? item.lastMessage
        : JSON.stringify(item.lastMessage);
    }
    // Check if there's a lastMessageText directly on the item
    if (item?.lastMessageText) {
      return item.lastMessageText;
    }
    return "No messages yet";
  };

  // ✅ FIXED: Get last message time with fallbacks
  const getLastMessageTime = (item: any) => {
    if (item?.lastMessage?.createdAt) {
      return item.lastMessage.createdAt;
    }
    if (item?.lastMessage?.timestamp) {
      return item.lastMessage.timestamp;
    }
    if (item?.lastMessage?.sentAt) {
      return item.lastMessage.sentAt;
    }
    return item.updatedAt;
  };

  // ✅ FIXED: Check if message is from current user
  const isMessageFromCurrentUser = (item: any) => {
    const senderId = item?.lastMessage?.senderId || item?.lastMessage?.sender?._id || item?.lastMessage?.sender;
    if (!senderId) return false;
    return senderId === currentUser?.id || senderId === currentUser?._id;
  };

  const menuOptions: MenuOption[] = [
    {
      id: 'new_group',
      title: 'New Group Chat',
      icon: 'people',
      iconType: 'Ionicons',
      onPress: () => {
        Toast.show({
          type: 'info',
          text1: 'Coming Soon',
          text2: 'Group chat feature is coming soon!',
        });
      }
    },
    {
      id: 'archived',
      title: 'Archived Chats',
      icon: 'archive',
      iconType: 'Ionicons',
      onPress: () => {
        Toast.show({
          type: 'info',
          text1: 'Coming Soon',
          text2: 'Archived chats feature is coming soon!',
        });
      }
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings',
      iconType: 'Feather',
      onPress: () => {
        navigation.navigate("Settings");
      }
    },
    {
      id: 'clear_all',
      title: 'Clear All Chats',
      icon: 'trash-2',
      iconType: 'Feather',
      destructive: true,
      onPress: () => {
        Alert.alert(
          'Clear All Chats',
          'Are you sure you want to clear all chat history? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear All',
              style: 'destructive',
              onPress: () => {
                Toast.show({
                  type: 'success',
                  text1: 'Cleared',
                  text2: 'All chats have been cleared',
                });
              }
            }
          ]
        );
      }
    },
  ];

  // In renderItem function, update the lastMessageContent logic
  const renderItem = ({ item }: any) => {
    const profilePic = getProfilePicture(item);
    const displayName = getDisplayName(item);

    // ✅ More robust last message extraction
    let lastMessageContent = "No messages yet";
    let lastMessageTime = item.updatedAt;
    let isFromCurrentUser = false;

    // Try to get last message from different possible locations
    if (item.lastMessage) {
      // Check if lastMessage has content field
      if (item.lastMessage.content) {
        lastMessageContent = item.lastMessage.content;
        lastMessageTime = item.lastMessage.createdAt || item.updatedAt;
      }
      // Check if lastMessage has text field
      else if (item.lastMessage.text) {
        lastMessageContent = item.lastMessage.text;
        lastMessageTime = item.lastMessage.createdAt || item.updatedAt;
      }
      // Check if lastMessage is a string
      else if (typeof item.lastMessage === 'string') {
        lastMessageContent = item.lastMessage;
      }
      // Check if lastMessage has sender info
      if (item.lastMessage.senderId) {
        isFromCurrentUser =
          item.lastMessage.senderId === currentUser?.id ||
          item.lastMessage.senderId === currentUser?._id;
      }
      if (item.lastMessage.sender) {
        isFromCurrentUser =
          item.lastMessage.sender === currentUser?.id ||
          item.lastMessage.sender === currentUser?._id;
      }
    }

    // If still no content, check other possible fields
    if (lastMessageContent === "No messages yet") {
      if (item.lastMessageText) {
        lastMessageContent = item.lastMessageText;
      } else if (item.recentMessage) {
        lastMessageContent = item.recentMessage;
      } else if (item.latestMessage) {
        lastMessageContent = item.latestMessage;
      }
    }

    const isUnread = (item.unreadCount || 0) > 0;

    // Debug log
    console.log("📝 Chat item:", {
      displayName,
      lastMessageContent,
      lastMessageTime,
      isUnread,
      isFromCurrentUser,
      unreadCount: item.unreadCount,
      hasLastMessage: !!item.lastMessage
    });

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.defaultAvatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(lastMessageTime)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {isFromCurrentUser
                ? `You: ${lastMessageContent}`
                : lastMessageContent}
            </Text>

            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientHeader}
        >
          <Text style={styles.headerTitle}>Messages</Text>
        </LinearGradient>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Feather name="more-vertical" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8B5CF6" />
        <TextInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedConnections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a new conversation with your connections
              </Text>
            </View>
          }
        />
      )}

      <CustomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={menuOptions}
        title="Chat Options"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  gradientHeader: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 8,
  },
  headerTitle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  chatItem: {
    flexDirection: "row",
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  defaultAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: "600",
    color: "#111827",
  },
  unreadBadge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  newMessageButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
});