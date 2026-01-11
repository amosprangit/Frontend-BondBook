import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  ScrollView, 
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TabHeader from '../components/tabHeader';
import { useGetMutualConnectionsQuery } from '../store/api/mutualConnectionsApi';
import { API_URL } from '@env';
import { useAppSelector } from '../store/hooks';

export default function ChatListScreen({ navigation }: { navigation: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { data: mutualConnectionsData, isLoading, refetch } = useGetMutualConnectionsQuery();
  
  const mutualConnections = mutualConnectionsData?.mutualConnections || [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleChatPress = (connection: any) => {
    navigation.navigate('ChatScreen', { 
      mutualConnectionId: connection._id,
      connectionId: connection.connectionId,
      displayName: connection.displayName,
      otherUser: connection.otherUser,
    });
  };

  const filteredConnections = mutualConnections.filter(connection =>
    connection.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat List */}
      <ScrollView 
        style={styles.chatList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : filteredConnections.length > 0 ? (
          filteredConnections.map((connection) => {
            const profilePic = connection.profilePicture 
              ? `${API_URL}/${connection.profilePicture.replace(/^\//, '')}?t=${connection.updatedAt || Date.now()}`
              : 'https://picsum.photos/150/150?random=1';
            
            return (
              <TouchableOpacity
                key={connection._id}
                style={styles.chatItem}
                onPress={() => handleChatPress(connection)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  <View style={styles.profilePictureBorder}>
                    <Image 
                      source={{ uri: profilePic }} 
                      style={styles.fullProfileImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.username}>{connection.displayName}</Text>
                    <Text style={styles.timestamp}>
                      {connection.lastMessage 
                        ? formatTimestamp(connection.lastMessage.createdAt) 
                        : formatTimestamp(connection.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.messageRow}>
                    <Text 
                      style={[
                        styles.lastMessage,
                        (connection.unreadCount && connection.unreadCount > 0) ? styles.unreadMessage : null
                      ]} 
                      numberOfLines={1}
                    >
                      {connection.lastMessage?.content || 'Start a conversation...'}
                    </Text>
                    {connection.unreadCount && connection.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{connection.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No conversations found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Accept a follow request to start chatting'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* New Message Button */}
      <TouchableOpacity style={styles.newMessageButton}>
        <Ionicons name="create-outline" size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profilePictureBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: 'bold',
    marginTop: 12,
  },
  fullProfileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  newMessageButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
