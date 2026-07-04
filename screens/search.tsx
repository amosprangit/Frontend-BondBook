import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useGetPostsQuery } from '../store/api/postsApi';
import { useGetStoriesFeedQuery } from '../store/api/storiesApi';
import { useNavigation } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SearchScreen() {
    const navigation = useNavigation();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { data: postsData } = useGetPostsQuery();
    const { data: storiesData } = useGetStoriesFeedQuery();

    useEffect(() => {
        if (searchQuery.length > 0) {
            setIsSearching(true);
            const allPosts = postsData?.posts || [];
            const stories = storiesData?.stories || [];

            const userCandidates = [
                ...allPosts.map(p => p.user).filter(Boolean),
                ...stories.map(s => s.user).filter(Boolean),
            ];

            const uniqueUsers = Array.from(
                new Map(userCandidates.filter(u => u?._id).map(u => [u._id, u])).values()
            );

            const filtered = uniqueUsers.filter(u =>
                (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            setSuggestedUsers(filtered);
            setIsSearching(false);
        } else {
            setSuggestedUsers([]);
        }
    }, [searchQuery, postsData, storiesData]);

    const renderUserItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => {
                navigation.navigate('UserInfo', { userId: item._id });
                setSearchQuery('');
            }}
        >
            <Image
                source={{
                    uri: item?.profilePicture
                        ? API_URL + "/" + item.profilePicture
                        : `https://ui-avatars.com/api/?name=${item.username}&background=8B5CF6&color=fff`
                }}
                style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.username}</Text>
                <Text style={styles.userHandle}>@{item.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <View style={styles.header}>
                {/* ✅ Gradient Text using MaskedView */}
                <MaskedView
                    style={styles.maskedView}
                    maskElement={
                        <Text style={styles.headerTitle}>Search</Text>
                    }
                >
                    <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientBackground}
                    />
                </MaskedView>
            </View>

            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor="#8E8E93"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            ) : searchQuery.length > 0 ? (
                <FlatList
                    data={suggestedUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.resultsList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No users found</Text>
                            <Text style={styles.emptySubtitle}>
                                Try searching with a different username
                            </Text>
                        </View>
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={60} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>Search for users</Text>
                    <Text style={styles.emptySubtitle}>
                        Find people to connect with
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    maskedView: {
        height: 40,
        width: 'auto',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        // This text acts as a mask - it won't be visible, only its shape
        backgroundColor: 'transparent',
    },
    gradientBackground: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        padding: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#8E8E93',
    },
    resultsList: {
        paddingTop: 8,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 14,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    userHandle: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 8,
        textAlign: 'center',
    },
});