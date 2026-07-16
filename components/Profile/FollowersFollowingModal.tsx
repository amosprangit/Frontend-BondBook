import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
    _id: string;
    username: string;
    profilePicture?: string;
    bio?: string;
}

interface FollowersFollowingModalProps {
    visible: boolean;
    onClose: () => void;
    modalType: 'followers' | 'following';
    onTypeChange: (type: 'followers' | 'following') => void;
    followers: User[];
    following: User[];
    followersCount: number;
    followingCount: number;
    loading: boolean;
    error: any;
    onUserPress: (userId: string) => void;
    onRetry: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function FollowersFollowingModal({
    visible,
    onClose,
    modalType,
    onTypeChange,
    followers,
    following,
    followersCount,
    followingCount,
    loading,
    error,
    onUserPress,
    onRetry,
}: FollowersFollowingModalProps) {
    const data = modalType === 'followers' ? followers : following;
    const count = modalType === 'followers' ? followersCount : followingCount;
    const isLoading = loading;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {modalType === 'followers' ? 'Followers' : 'Following'}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                modalType === 'followers' && styles.tabActive,
                            ]}
                            onPress={() => onTypeChange('followers')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    modalType === 'followers' && styles.tabTextActive,
                                ]}
                            >
                                Followers ({followersCount})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                modalType === 'following' && styles.tabActive,
                            ]}
                            onPress={() => onTypeChange('following')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    modalType === 'following' && styles.tabTextActive,
                                ]}
                            >
                                Following ({followingCount})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.listContainer}>
                        <ScrollView
                            style={styles.list}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {isLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#8B5CF6" />
                                    <Text style={styles.loadingText}>
                                        Loading {modalType}...
                                    </Text>
                                </View>
                            ) : error ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                                    <Text style={styles.emptyText}>Error loading {modalType}</Text>
                                    <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                                        <Text style={styles.retryButtonText}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : data.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>
                                        No {modalType === 'followers' ? 'followers' : 'following'} yet
                                    </Text>
                                </View>
                            ) : (
                                data.map((user) => (
                                    <TouchableOpacity
                                        key={user._id}
                                        style={styles.userItem}
                                        onPress={() => onUserPress(user._id)}
                                        activeOpacity={0.7}
                                    >
                                        <Image
                                            source={{
                                                uri: user.profilePicture
                                                    ? `${API_URL}/${user.profilePicture.replace(/^\//, '')}`
                                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=8B5CF6&color=fff&size=80`,
                                            }}
                                            style={styles.userAvatar}
                                        />
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userUsername}>
                                                {user.username || 'Unknown'}
                                            </Text>
                                            {user.bio && (
                                                <Text style={styles.userBio} numberOfLines={1}>
                                                    {user.bio}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalCloseButton: {
        padding: 4,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#8B5CF6',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    tabTextActive: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    listContainer: {
        height: 400,
    },
    list: {
        flex: 1,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    userBio: {
        fontSize: 13,
        color: '#6B7280',
    },
    retryButton: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#8B5CF6',
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});