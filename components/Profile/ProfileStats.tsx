import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProfileStatsProps {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    onFollowersPress: () => void;
    onFollowingPress: () => void;
}

export default function ProfileStats({
    postsCount,
    followersCount,
    followingCount,
    onFollowersPress,
    onFollowingPress,
}: ProfileStatsProps) {
    return (
        <View style={styles.statsContainer}>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
                style={styles.statItem}
                onPress={onFollowersPress}
                activeOpacity={0.7}
            >
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.statItem}
                onPress={onFollowingPress}
                activeOpacity={0.7}
            >
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginTop: 12,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});