import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width, height } = Dimensions.get('window');

interface StoryViewerProps {
    visible: boolean;
    onClose: () => void;
    currentStories: any[];
    currentStoryIndex: number;
    setCurrentStoryIndex: (index: number) => void;
    viewingMyStories: boolean;
    handleDeleteStory: () => void;
    storyLikeState: Record<string, boolean>;
    storyLikeCount: Record<string, number>;
    handleStoryLike: (storyId: string, isLiked: boolean) => void;
    stories: any[];
    currentViewingUserIndex: number;
    setCurrentViewingUserIndex: (index: number) => void;
}

export default function StoryViewer({
    visible,
    onClose,
    currentStories,
    currentStoryIndex,
    setCurrentStoryIndex,
    viewingMyStories,
    handleDeleteStory,
    storyLikeState,
    storyLikeCount,
    handleStoryLike,
    stories,
    currentViewingUserIndex,
    setCurrentViewingUserIndex,
}: StoryViewerProps) {
    // Animation refs for heart animation
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;

    // Track double tap
    const lastTap = useRef<number>(0);
    const tapTimeout = useRef<NodeJS.Timeout | null>(null);

    const showHeartAnimation = () => {
        heartScale.setValue(0);
        heartOpacity.setValue(1);

        Animated.sequence([
            Animated.spring(heartScale, {
                toValue: 1.5,
                useNativeDriver: true,
                friction: 3,
                tension: 40,
            }),
            Animated.spring(heartScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 4,
                tension: 30,
            }),
            Animated.timing(heartOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleDoubleTap = (storyId: string) => {
        const isLiked = storyLikeState[storyId] || false;

        // Only like if not already liked
        if (!isLiked) {
            handleStoryLike(storyId, isLiked);
            showHeartAnimation();
        }
    };

    const handleSingleTap = (e: any, storyId: string) => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTap.current;

        // Check if it's a double tap (within 300ms)
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected - like the story
            handleDoubleTap(storyId);
            lastTap.current = 0;
            if (tapTimeout.current) {
                clearTimeout(tapTimeout.current);
                tapTimeout.current = null;
            }
            return;
        }

        // Single tap - handle navigation
        lastTap.current = now;

        // Set a timeout to handle single tap after the double tap window
        if (tapTimeout.current) {
            clearTimeout(tapTimeout.current);
        }

        tapTimeout.current = setTimeout(() => {
            const { locationX } = e.nativeEvent;
            if (locationX < width / 2) {
                // Navigate to previous story
                if (currentStoryIndex > 0) {
                    setCurrentStoryIndex(currentStoryIndex - 1);
                } else if (currentViewingUserIndex > 0 && !viewingMyStories) {
                    setCurrentViewingUserIndex(currentViewingUserIndex - 1);
                    setCurrentStoryIndex(stories[currentViewingUserIndex - 1]?.stories.length - 1 || 0);
                }
            } else {
                // Navigate to next story
                if (currentStoryIndex < currentStories.length - 1) {
                    setCurrentStoryIndex(currentStoryIndex + 1);
                } else if (currentViewingUserIndex < stories.length - 1 && !viewingMyStories) {
                    setCurrentViewingUserIndex(currentViewingUserIndex + 1);
                    setCurrentStoryIndex(0);
                } else {
                    onClose();
                }
            }
            tapTimeout.current = null;
        }, 300);
    };

    // Get current story ID
    const currentStoryId = currentStories[currentStoryIndex]?._id;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.storyViewerContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />

                {currentStories.length > 0 && currentStories[currentStoryIndex] && (
                    <>
                        {/* Progress Bars */}
                        <View style={styles.storyProgressContainer}>
                            {currentStories.map((_, index) => (
                                <View key={index} style={styles.storyProgressBar}>
                                    <View
                                        style={[
                                            styles.storyProgressFill,
                                            index === currentStoryIndex && { width: '100%' },
                                            index < currentStoryIndex && { width: '100%' }
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>

                        {/* Header */}
                        <View style={styles.storyViewerHeader}>
                            <View style={styles.storyViewerUser}>
                                <Image
                                    source={{
                                        uri: currentStories[currentStoryIndex].user?.profilePicture
                                            ? API_URL + "/" + currentStories[currentStoryIndex].user.profilePicture
                                            : `https://ui-avatars.com/api/?name=${currentStories[currentStoryIndex].user?.username}&background=8B5CF6&color=fff`
                                    }}
                                    style={styles.storyViewerAvatar}
                                />
                                <View>
                                    <Text style={styles.storyViewerUsername}>
                                        {currentStories[currentStoryIndex].user?.username}
                                    </Text>
                                    <Text style={styles.storyViewerTime}>
                                        {new Date(currentStories[currentStoryIndex].createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.storyViewerActions}>
                                {viewingMyStories && (
                                    <TouchableOpacity onPress={handleDeleteStory} style={styles.storyViewerButton}>
                                        <Ionicons name="trash-outline" size={24} color="#fff" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={onClose} style={styles.storyViewerButton}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Story Image with Double Tap to Like */}
                        <TouchableWithoutFeedback
                            onPress={(e) => {
                                if (currentStoryId) {
                                    handleSingleTap(e, currentStoryId);
                                }
                            }}
                        >
                            <View style={styles.storyImageWrapper}>
                                <Image
                                    source={{ uri: API_URL + "/" + currentStories[currentStoryIndex].image }}
                                    style={styles.storyViewerImage}
                                    resizeMode="contain"
                                />

                                {/* Animated Heart Overlay */}
                                <Animated.View
                                    style={[
                                        styles.animatedHeartContainer,
                                        {
                                            opacity: heartOpacity,
                                            transform: [{ scale: heartScale }],
                                        },
                                    ]}
                                >
                                    <Ionicons name="heart" size={100} color="#EF4444" />
                                </Animated.View>
                            </View>
                        </TouchableWithoutFeedback>

                        {/* Story Viewer Footer with Like Functionality */}
                        <View style={styles.storyViewerFooter}>
                            <TouchableOpacity
                                style={styles.storyReplyButton}
                                onPress={() => {
                                    const currentStory = currentStories[currentStoryIndex];
                                    if (currentStory?._id) {
                                        const isLiked = storyLikeState[currentStory._id] || false;
                                        handleStoryLike(currentStory._id, isLiked);
                                    }
                                }}
                            >
                                <Ionicons
                                    name={storyLikeState[currentStories[currentStoryIndex]?._id] ? "heart" : "heart-outline"}
                                    size={24}
                                    color={storyLikeState[currentStories[currentStoryIndex]?._id] ? "#EF4444" : "#fff"}
                                />
                                <Text style={styles.storyReplyText}>
                                    {storyLikeCount[currentStories[currentStoryIndex]?._id] || 0} Likes
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.storyMoreButton}>
                                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    storyViewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    storyProgressContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 4,
        zIndex: 10,
    },
    storyProgressBar: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    storyProgressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    storyViewerHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 70 : 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    storyViewerUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    storyViewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    storyViewerUsername: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    storyViewerTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    storyViewerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    storyViewerButton: {
        padding: 8,
    },
    storyImageWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyViewerImage: {
        width: width,
        height: height,
    },
    animatedHeartContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    storyViewerFooter: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    storyReplyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    storyReplyText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    storyMoreButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});