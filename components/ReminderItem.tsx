import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReminderItemProps {
    reminder: any;
    onPress: () => void;
    formatDate: (date: string) => string;
    getDaysLeft: (date: string) => number;
}

export default function ReminderItem({
    reminder,
    onPress,
    formatDate,
    getDaysLeft,
}: ReminderItemProps) {
    const daysLeft = getDaysLeft(reminder.reminderDate);
    const isOverdue = daysLeft < 0;
    const isToday = daysLeft === 0;

    return (
        <TouchableOpacity
            style={styles.reminderItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.reminderItemContent}>
                <View style={styles.reminderItemHeader}>
                    <Text style={styles.reminderItemTitle} numberOfLines={1}>
                        {reminder.title}
                    </Text>
                    {isOverdue ? (
                        <View style={[styles.badge, styles.badgeOverdue]}>
                            <Text style={[styles.badgeText, styles.badgeTextOverdue]}>
                                Overdue
                            </Text>
                        </View>
                    ) : isToday ? (
                        <View style={[styles.badge, styles.badgeToday]}>
                            <Text style={[styles.badgeText, styles.badgeTextToday]}>
                                Today
                            </Text>
                        </View>
                    ) : null}
                </View>

                {reminder.description && (
                    <Text style={styles.reminderItemDescription} numberOfLines={1}>
                        {reminder.description}
                    </Text>
                )}

                <View style={styles.reminderItemMeta}>
                    <View style={styles.reminderMetaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                        <Text style={styles.reminderMetaText}>
                            {formatDate(reminder.reminderDate)}
                        </Text>
                    </View>
                    <View style={styles.reminderMetaItem}>
                        <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                        <Text style={styles.reminderMetaText}>
                            {reminder.reminderTime}
                        </Text>
                    </View>
                    {!isOverdue && !isToday && (
                        <Text style={styles.reminderDaysLeft}>
                            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    reminderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    reminderItemContent: {
        flex: 1,
    },
    reminderItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    reminderItemTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    badgeOverdue: {
        backgroundColor: '#FEE2E2',
    },
    badgeToday: {
        backgroundColor: '#FEF3C7',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    badgeTextOverdue: {
        color: '#EF4444',
    },
    badgeTextToday: {
        color: '#F59E0B',
    },
    reminderItemDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
    },
    reminderItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    reminderMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reminderMetaText: {
        fontSize: 12,
        color: '#6B7280',
    },
    reminderDaysLeft: {
        fontSize: 12,
        color: '#8B5CF6',
        fontWeight: '500',
    },
});