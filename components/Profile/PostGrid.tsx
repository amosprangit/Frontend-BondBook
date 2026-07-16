import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 48) / 3;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH * 1.2;

interface PostGridProps {
    posts: any[];
    loading: boolean;
    onPostPress: (post: any) => void;
    onCreatePost: () => void;
    isCreatingPost: boolean;
}

export default function PostGrid({
    posts,
    loading,
    onPostPress,
    onCreatePost,
    isCreatingPost,
}: PostGridProps) {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading posts...</Text>
            </View>
        );
    }

    if (posts.length === 0) {
        return (
            <View style={styles.noPostsContainer}>
                <View style={styles.noPostsIconContainer}>
                    <Ionicons name="images-outline" size={64} color="#E5E7EB" />
                </View>
                <Text style={styles.noPostsTitle}>No posts yet</Text>
                <Text style={styles.noPostsSubtext}>Share your first photo with the community</Text>
                <TouchableOpacity style={styles.createFirstPostButton} onPress={onCreatePost}>
                    <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        style={styles.createFirstPostGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.createFirstPostButtonText}>Create First Post</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.gridWrapper}>
            {posts.map((post) => (
                <TouchableOpacity
                    key={post._id}
                    style={styles.gridImageCard}
                    onPress={() => onPostPress(post)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: `${API_URL}/${post.image || post.imageUrl}` }}
                        style={styles.gridImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.gridImageOverlay}
                    >
                        <View style={styles.likesOverlay}>
                            <Ionicons name="heart" size={14} color="#ffffff" />
                            <Text style={styles.likesOverlayText}>
                                {post.likeCount || post.likes || 0}
                            </Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const styles = StyleSheet.create({
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    gridWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridImageCard: {
        width: GRID_ITEM_WIDTH,
        height: GRID_ITEM_HEIGHT,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#F3F4F6',
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    gridImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
    },
    likesOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    likesOverlayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    noPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        width: '100%',
    },
    noPostsIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    noPostsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    noPostsSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 20,
        textAlign: 'center',
    },
    createFirstPostButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    createFirstPostGradient: {
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    createFirstPostButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});