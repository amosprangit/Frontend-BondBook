import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TapGestureHandler } from 'react-native-gesture-handler';
import { useCheckFollowRequestByPostQuery } from '../store/api/authApi';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

interface PostItemProps {
    post: any;
    user: any;
    navigation: any;
    handleFollowUser: (userId: string, isFollowing: boolean) => void;
    handleCommentPress: (post: any) => void;
    handleSharePost: (post: any) => void;
    handleLikePost: (postId: string, isLiked: boolean) => void;
    isTogglingFollow: boolean;
}

export default function PostItem({
    post,
    user,
    navigation,
    handleFollowUser,
    handleCommentPress,
    handleSharePost,
    handleLikePost,
    isTogglingFollow,
}: PostItemProps) {
    const [localLiked, setLocalLiked] = useState(post.isLiked);
    const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || post.likes || 0);

    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;

    const showHeartAnimation = () => {
        heartScale.setValue(0);
        heartOpacity.setValue(0.8);

        Animated.sequence([
            Animated.spring(heartScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 4,
                tension: 40,
            }),
            Animated.timing(heartOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleLocalLike = () => {
        const newLiked = !localLiked;
        setLocalLiked(newLiked);
        setLocalLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        handleLikePost(post._id, localLiked);
        if (newLiked) {
            showHeartAnimation();
        }
    };

    const { data: followStatus, isLoading: statusLoading, refetch: refetchFollowStatus } =
        useCheckFollowRequestByPostQuery(post._id, {
            skip: !post._id || post.user?._id === user?._id
        });

    const isOwnPost = post.user?._id === user?._id;

    return (
        <View style={styles.postCard}>
            <LinearGradient
                colors={['#ffffff', '#fafafa']}
                style={StyleSheet.absoluteFill}
            />

            {/* Post Header */}
            <View style={styles.postHeader}>
                <View style={styles.postProfileInfo}>
                    <TouchableOpacity
                        onPress={() => {
                            if (post.user?._id) {
                                navigation.navigate('UserInfo', { userId: post.user._id });
                            }
                        }}
                        style={styles.profileImageWrapper}
                    >
                        <Image
                            source={{
                                uri: post.user?.profilePicture
                                    ? API_URL + "/" + post.user.profilePicture
                                    : `https://ui-avatars.com/api/?name=${post.user?.username || 'User'}&background=8B5CF6&color=fff&size=40`
                            }}
                            style={styles.postProfileImage}
                        />
                        {!isOwnPost && followStatus?.isFollowing && (
                            <View style={styles.followingBadge}>
                                <Ionicons name="checkmark" size={10} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.postUserInfo}>
                        <TouchableOpacity
                            onPress={() => {
                                if (post.user?._id) {
                                    navigation.navigate('UserInfo', { userId: post.user._id });
                                }
                            }}
                        >
                            <Text style={styles.postUserName}>{post.user?.username || 'Unknown User'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.postTime}>
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>

                    {/* Follow Button */}
                    {!isOwnPost && post.user?._id && (
                        <View style={styles.followButtonWrapper}>
                            {statusLoading ? (
                                <ActivityIndicator size="small" color="#8B5CF6" />
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        followStatus?.isFollowing && styles.followingButton
                                    ]}
                                    onPress={async () => {
                                        if (post.user?._id) {
                                            await handleFollowUser(
                                                post.user._id,
                                                followStatus?.isFollowing || false
                                            );
                                            refetchFollowStatus?.();
                                        }
                                    }}
                                    disabled={isTogglingFollow}
                                >
                                    <Text style={[
                                        styles.followButtonText,
                                        followStatus?.isFollowing && styles.followingButtonText
                                    ]}>
                                        {followStatus?.isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Post Image with Double Tap Like */}
            <TapGestureHandler
                numberOfTaps={2}
                onActivated={() => {
                    if (!localLiked) {
                        handleLocalLike();
                    }
                }}
            >
                <View style={styles.postImageContainer}>
                    <Image
                        source={{ uri: API_URL + "/" + post.image }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.03)']}
                        style={styles.imageOverlay}
                    />

                    <Animated.View
                        style={[
                            styles.animatedHeart,
                            {
                                opacity: heartOpacity,
                                transform: [{ scale: heartScale }],
                            },
                        ]}
                    >
                        <Ionicons name="heart" size={120} color="rgba(255,255,255,0.8)" />
                    </Animated.View>
                </View>
            </TapGestureHandler>

            {/* Post Actions */}
            <View style={styles.postActions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLocalLike} style={styles.actionButton}>
                        <Ionicons
                            name={localLiked ? "heart" : "heart-outline"}
                            size={26}
                            color={localLiked ? "#EF4444" : "#262626"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleCommentPress(post)}
                        style={styles.actionButton}
                    >
                        <Ionicons name="chatbubble-outline" size={24} color="#262626" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleSharePost(post)}
                        style={styles.actionButton}
                    >
                        <Ionicons name="paper-plane-outline" size={24} color="#262626" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.saveButton}>
                    <Ionicons name="bookmark-outline" size={24} color="#262626" />
                </TouchableOpacity>
            </View>

            {/* Likes Count */}
            <View style={styles.postContent}>
                <Text style={styles.likeCount}>
                    {localLikeCount.toLocaleString()} {localLikeCount === 1 ? 'like' : 'likes'}
                </Text>

                {post.caption && (
                    <Text style={styles.postCaption}>
                        <Text style={styles.captionUsername}>{post.user?.username}</Text>
                        {' '}{post.caption}
                    </Text>
                )}

                {post.comments?.length > 0 && (
                    <TouchableOpacity
                        onPress={() => handleCommentPress(post)}
                        style={styles.commentsPreview}
                    >
                        <Text style={styles.viewComments}>
                            View all {post.comments.length} comments
                        </Text>
                        {post.comments[0] && (
                            <Text style={styles.commentPreview} numberOfLines={1}>
                                <Text style={styles.commentPreviewUsername}>
                                    {post.comments[0].username}
                                </Text>
                                {' '}{post.comments[0].comment}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                <Text style={styles.postTimeSmall}>
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postCard: {
        backgroundColor: '#fff',
        marginBottom: 12,
        overflow: 'hidden',
    },
    postHeader: {
        padding: 16,
    },
    postProfileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    postProfileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    followingBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    postUserInfo: {
        flex: 1,
    },
    postUserName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    postTime: {
        fontSize: 12,
        color: '#8E8E93',
    },
    followButtonWrapper: {
        marginLeft: 'auto',
    },
    followButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
    },
    followingButton: {
        backgroundColor: '#f0f0f0',
    },
    followButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    followingButtonText: {
        color: '#000',
    },
    postImageContainer: {
        width: '100%',
        aspectRatio: 1,
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    animatedHeart: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionButton: {
        padding: 4,
    },
    saveButton: {
        padding: 4,
    },
    postContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    likeCount: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 6,
    },
    postCaption: {
        fontSize: 15,
        lineHeight: 20,
        color: '#000',
        marginBottom: 6,
    },
    captionUsername: {
        fontWeight: '600',
    },
    commentsPreview: {
        marginTop: 4,
    },
    viewComments: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 4,
    },
    commentPreview: {
        fontSize: 14,
        color: '#000',
        lineHeight: 18,
    },
    commentPreviewUsername: {
        fontWeight: '600',
    },
    postTimeSmall: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 8,
        textTransform: 'uppercase',
    },
});