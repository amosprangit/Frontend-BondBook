import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface StoriesSectionProps {
    stories: any[];
    myStories: any[];
    user: any;
    isLoading: boolean;
    isUploading: boolean;
    handleStoryPress: (index: number, isMyStory?: boolean) => void;
    handleAddStory: () => void;
}

export default function StoriesSection({
    stories,
    myStories,
    user,
    isLoading,
    isUploading,
    handleStoryPress,
    handleAddStory,
}: StoriesSectionProps) {
    return (
        <View style={styles.storiesWrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.storiesScroll}
            >
                {/* Your Story */}
                <TouchableOpacity
                    style={styles.storyItem}
                    onPress={() => myStories.length > 0 ? handleStoryPress(0, true) : handleAddStory()}
                    disabled={isUploading}
                >
                    <View style={styles.storyRing}>
                        <LinearGradient
                            colors={myStories.length > 0 ? ['#8B5CF6', '#EC4899'] : ['#E5E7EB', '#E5E7EB']}
                            style={styles.storyGradient}
                        >
                            <View style={styles.storyInnerRing}>
                                <Image
                                    source={{
                                        uri: user?.profilePicture
                                            ? API_URL + "/" + user.profilePicture
                                            : `https://ui-avatars.com/api/?name=${user?.username || 'You'}&background=8B5CF6&color=fff`
                                    }}
                                    style={styles.storyImage}
                                />
                            </View>
                        </LinearGradient>

                        {myStories.length === 0 && (
                            <View style={styles.addStoryButton}>
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Entypo name="plus" size={14} color="#fff" />
                                )}
                            </View>
                        )}
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>
                        {myStories.length > 0 ? 'Your Story' : isUploading ? 'Uploading...' : 'Add Story'}
                    </Text>
                </TouchableOpacity>

                {/* Following Stories */}
                {stories.map((userStory, index) => (
                    <TouchableOpacity
                        key={userStory._id}
                        style={styles.storyItem}
                        onPress={() => handleStoryPress(index)}
                    >
                        <LinearGradient
                            colors={['#8B5CF6', '#EC4899']}
                            style={styles.storyRing}
                        >
                            <View style={styles.storyInnerRing}>
                                <Image
                                    source={{
                                        uri: userStory.user?.profilePicture
                                            ? API_URL + "/" + userStory.user.profilePicture
                                            : `https://ui-avatars.com/api/?name=${userStory.user?.username}&background=8B5CF6&color=fff`
                                    }}
                                    style={styles.storyImage}
                                />
                            </View>
                        </LinearGradient>
                        <Text style={styles.storyName} numberOfLines={1}>
                            {userStory.user?.username}
                        </Text>
                    </TouchableOpacity>
                ))}

                {isLoading && (
                    <View style={styles.storyLoading}>
                        <ActivityIndicator size="small" color="#8B5CF6" />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    storiesWrapper: {
        backgroundColor: '#fff',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    storiesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    storiesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    storiesSeeAll: {
        fontSize: 14,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    storiesScroll: {
        paddingLeft: 16,
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 16,
        width: 72,
    },
    storyRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        padding: 2,
        marginBottom: 6,
    },
    storyGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
        padding: 2,
    },
    storyInnerRing: {
        flex: 1,
        borderRadius: 34,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    storyImage: {
        width: '100%',
        height: '100%',
    },
    addStoryButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    storyName: {
        fontSize: 12,
        color: '#000',
        textAlign: 'center',
        maxWidth: 72,
    },
    storyLoading: {
        width: 72,
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
});