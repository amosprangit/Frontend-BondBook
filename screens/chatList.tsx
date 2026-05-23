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
  Platform
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGetMutualConnectionsQuery } from "../store/api/mutualConnectionsApi";
import { useAppSelector } from "../store/hooks";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChatListScreen({ navigation }: { navigation: any }) {

  const [searchQuery, setSearchQuery] = useState("");

  const { user: currentUser } = useAppSelector((state) => state.auth);

  const { data, isLoading, refetch, isFetching } =
    useGetMutualConnectionsQuery(undefined, {
      pollingInterval: 5000
    });

  const mutualConnections = data?.mutualConnections || [];

  const filteredConnections = mutualConnections.filter((connection: any) =>
    connection.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedConnections = [...filteredConnections].sort((a: any, b: any) => {
    const dateA = a.lastMessage?.createdAt || a.updatedAt;
    const dateB = b.lastMessage?.createdAt || b.updatedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const handleChatPress = (connection: any) => {
    navigation.navigate("ChatScreen", {
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

  const renderItem = ({ item }: any) => {

    const profilePic = item.profilePicture
      ? `${API_URL}/${item.profilePicture?.replace(/^\//, "")}`
      : "https://picsum.photos/150/150";

    const lastMessageContent =
      item.lastMessage?.content || "No messages yet";

    const lastMessageTime =
      item.lastMessage?.createdAt || item.updatedAt;

    const isUnread = item.unreadCount > 0;

    const isFromCurrentUser =
      item.lastMessage?.senderId === currentUser?.id ||
      item.lastMessage?.senderId === currentUser?._id;

    return (

      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >

        <Image source={{ uri: profilePic }} style={styles.avatar} />

        <View style={styles.chatInfo}>

          <View style={styles.chatHeader}>

            <Text style={styles.username}>
              {item.displayName}
            </Text>

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

        <Text style={styles.headerTitle}>Messages</Text>

        <TouchableOpacity>
          <Ionicons name="person-add-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>

      </View>

      <View style={styles.searchContainer}>

        <Ionicons name="search" size={20} color="#8B5CF6" />

        <TextInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />

      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#8B5CF6" />
      ) : (

        <FlatList
          data={sortedConnections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />

      )}

      <TouchableOpacity style={styles.newMessageButton}>
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>

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
    padding: 20,
    backgroundColor: "#fff"
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700"
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12
  },

  searchInput: {
    marginLeft: 10,
    flex: 1
  },

  chatItem: {
    flexDirection: "row",
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26
  },

  chatInfo: {
    flex: 1,
    marginLeft: 12
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  username: {
    fontSize: 16,
    fontWeight: "600"
  },

  timestamp: {
    fontSize: 11,
    color: "#9CA3AF"
  },

  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },

  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280"
  },

  unreadMessage: {
    fontWeight: "600",
    color: "#111827"
  },

  unreadBadge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2
  },

  unreadCount: {
    color: "#fff",
    fontSize: 11
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
    alignItems: "center"
  }

});