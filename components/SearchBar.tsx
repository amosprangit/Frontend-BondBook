import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    suggestedUsers: any[];
    navigation: any;
}

export default function SearchBar({
    searchQuery,
    setSearchQuery,
    suggestedUsers,
    navigation,
}: SearchBarProps) {
    return (
        <>
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor="#8E8E93"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Suggestions */}
            {searchQuery.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <FlatList
                        data={suggestedUsers}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
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
                                    style={styles.suggestionAvatar}
                                />
                                <View style={styles.suggestionInfo}>
                                    <Text style={styles.suggestionName}>{item.username}</Text>
                                    <Text style={styles.suggestionHandle}>@{item.username}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptySearch}>
                                <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                                <Text style={styles.emptySearchText}>No users found</Text>
                            </View>
                        }
                    />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        padding: 0,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 110,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: 300,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    suggestionInfo: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    suggestionHandle: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    emptySearch: {
        padding: 40,
        alignItems: 'center',
    },
    emptySearchText: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 12,
        fontWeight: '500',
    },
});