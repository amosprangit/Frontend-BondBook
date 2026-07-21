import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Share,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetPostByIdQuery, useLikePostMutation } from '../store/api/postsApi';
import { useGetProfileQuery } from '../store/api/authApi';
import Toast from 'react-native-toast-message';
// import moment from 'moment';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

export default function PostDetail({ route, navigation }: any) {
    const { postId } = route.params || {};
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    const { data: postData, isLoading, refetch } = useGetPostByIdQuery(postId, {
        skip: !postId,
    });

    const { data: profileData } = useGetProfileQuery();
    const [likePost] = useLikePostMutation();

    const post = postData?.post;

    useEffect(() => {
        if (post) {
            setIsLiked(post.isLiked || false);
            setLikeCount(post.likes || post.likeCount || 0);
        }
    }, [post]);

    const handleLike = async () => {
        try {
            const action = isLiked ? 0 : 1;
            await likePost({ postId, action }).unwrap();

            setIsLiked(!isLiked);
            setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to like post',
            });
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this post by ${post?.user?.username || 'User'}!\n\n${post?.caption || ''}`,
                url: `${API_URL}/${post?.image}`,
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to share post',
            });
        }
    };

    const handleUserPress = () => {
        if (post?.user?._id) {
            navigation.navigate('UserInfo', { userId: post.user._id });
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading post...</Text>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Post</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.errorText}>Post not found</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Post Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: `${API_URL}/${post.image}` }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                </View>

                {/* Post Content */}
                <View style={styles.content}>
                    {/* User Info */}
                    <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
                        <Image
                            source={{
                                uri: post.user?.profilePicture
                                    ? `${API_URL}/${post.user.profilePicture}`
                                    : `https://ui-avatars.com/api/?name=${post.user?.username || 'U'}&background=8B5CF6&color=fff&size=40`,
                            }}
                            style={styles.userAvatar}
                        />
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{post.user?.username || 'Unknown'}</Text>
                            <Text style={styles.postDate}>
                                {/* {moment(post.createdAt).fromNow()} */}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Caption */}
                    {post.caption && (
                        <View style={styles.captionContainer}>
                            <Text style={styles.caption}>
                                <Text style={styles.captionUsername}>{post.user?.username} </Text>
                                {post.caption}
                            </Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                            <Ionicons
                                name={isLiked ? 'heart' : 'heart-outline'}
                                size={28}
                                color={isLiked ? '#EF4444' : '#6B7280'}
                            />
                            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="chatbubble-outline" size={28} color="#6B7280" />
                            <Text style={styles.actionText}>
                                {post.comments?.length || 0} comments
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                            <Ionicons name="share-outline" size={28} color="#6B7280" />
                            <Text style={styles.actionText}>Share</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Comments Section */}
                    {post.comments && post.comments.length > 0 && (
                        <View style={styles.commentsSection}>
                            <Text style={styles.commentsTitle}>
                                Comments ({post.comments.length})
                            </Text>
                            {post.comments.map((comment: any) => (
                                <View key={comment._id} style={styles.commentItem}>
                                    <Image
                                        source={{
                                            uri: comment.user?.profilePicture
                                                ? `${API_URL}/${comment.user.profilePicture}`
                                                : `https://ui-avatars.com/api/?name=${comment.user?.username || 'U'}&background=8B5CF6&color=fff&size=30`,
                                        }}
                                        style={styles.commentAvatar}
                                    />
                                    <View style={styles.commentContent}>
                                        <Text style={styles.commentUsername}>
                                            {comment.user?.username || 'Unknown'}
                                        </Text>
                                        <Text style={styles.commentText}>
                                            {comment.text || comment.comment}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    shareBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 12,
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: '#8B5CF6',
        borderRadius: 20,
    },
    retryText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    imageContainer: {
        width: '100%',
        height: width,
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    postDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    captionContainer: {
        marginBottom: 16,
    },
    caption: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
    },
    captionUsername: {
        fontWeight: '700',
        color: '#111827',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 16,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    actionTextActive: {
        color: '#EF4444',
    },
    commentsSection: {
        marginTop: 8,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    commentContent: {
        flex: 1,
    },
    commentUsername: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
});