import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Reminder {
    _id: string;
    title: string;
    description?: string;
    reminderDate: string;
    reminderTime?: string;
}

interface DueRemindersCardProps {
    reminders: Reminder[];
    formatReminderDateTime: (reminder: Reminder) => string;
}

export default function DueRemindersCard({
    reminders,
    formatReminderDateTime,
}: DueRemindersCardProps) {
    if (reminders.length === 0) return null;

    return (
        <View style={styles.dueRemindersCard}>
            <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dueRemindersHeader}
            >
                <Ionicons name="alarm" size={20} color="#ffffff" />
                <Text style={styles.dueRemindersTitle}>
                    {reminders.length === 1 ? 'Reminder Due' : `${reminders.length} Reminders Due`}
                </Text>
            </LinearGradient>
            {reminders.map((reminder, index) => (
                <View
                    key={reminder._id}
                    style={[
                        styles.dueReminderItem,
                        index === reminders.length - 1 && styles.lastReminderItem,
                    ]}
                >
                    <View style={styles.dueReminderContent}>
                        <Text style={styles.dueReminderItemTitle}>{reminder.title}</Text>
                        {reminder.description && (
                            <Text style={styles.dueReminderItemDescription} numberOfLines={1}>
                                {reminder.description}
                            </Text>
                        )}
                    </View>
                    <View style={styles.dueReminderTimeContainer}>
                        <Ionicons name="time-outline" size={14} color="#8B5CF6" />
                        <Text style={styles.dueReminderItemTime}>
                            {formatReminderDateTime(reminder)}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    dueRemindersCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    dueRemindersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 10,
    },
    dueRemindersTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
    dueReminderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    lastReminderItem: {
        borderBottomWidth: 0,
    },
    dueReminderContent: {
        flex: 1,
        marginRight: 12,
    },
    dueReminderItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    dueReminderItemDescription: {
        fontSize: 12,
        color: '#6B7280',
    },
    dueReminderTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dueReminderItemTime: {
        fontSize: 11,
        color: '#8B5CF6',
        fontWeight: '500',
    },
});