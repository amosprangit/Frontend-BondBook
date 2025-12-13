import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useGetRemindersQuery,
  useGetReminderStatsQuery,
  useDeleteReminderMutation,
  useMarkReminderCompletedMutation,
} from '../store/api/remindersApi';

export default function RemindersScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: statsData, refetch: refetchStats } = useGetReminderStatsQuery();
  const { data: remindersData, isLoading, refetch } = useGetRemindersQuery(
    filter === 'completed' ? { completed: true } : {}
  );
  const [deleteReminder] = useDeleteReminderMutation();
  const [markCompleted] = useMarkReminderCompletedMutation();

  const stats = statsData?.stats;
  const reminders = Array.isArray(remindersData?.reminders) ? remindersData.reminders : [];

  // Debug: Log API response
  React.useEffect(() => {
    if (remindersData) {
      console.log('📊 Reminders API Response:', remindersData);
      console.log('📋 Reminders array:', reminders);
      console.log('✅ Is Array?', Array.isArray(reminders));
    }
  }, [remindersData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  };

  const handleDelete = async (reminderId: string, title: string) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(reminderId).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Reminder deleted successfully',
              });
              refetch();
              refetchStats();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete reminder',
              });
            }
          },
        },
      ]
    );
  };

  const handleComplete = async (reminderId: string) => {
    try {
      await markCompleted(reminderId).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Reminder marked as completed!',
      });
      refetch();
      refetchStats();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete reminder',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const isOverdue = (reminder: any) => {
    if (reminder.isCompleted) return false;
    const now = new Date();
    const reminderDate = new Date(reminder.reminderDate);
    const [hours, minutes] = reminder.reminderTime.split(':');
    reminderDate.setHours(parseInt(hours), parseInt(minutes));
    return reminderDate < now;
  };

  const filteredReminders = Array.isArray(reminders) ? reminders.filter(reminder => {
    if (filter === 'completed') return reminder.isCompleted;
    if (filter === 'all') return !reminder.isCompleted;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(reminder.reminderDate);
    reminderDate.setHours(0, 0, 0, 0);
    
    if (filter === 'today') {
      return reminderDate.getTime() === today.getTime() && !reminder.isCompleted;
    }
    if (filter === 'upcoming') {
      return reminderDate.getTime() > today.getTime() && !reminder.isCompleted;
    }
    
    return true;
  }) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddReminder')}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="list" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-done" size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </ScrollView>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'today', 'upcoming', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive
            ]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[
              styles.filterText,
              filter === f && styles.filterTextActive
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reminders List */}
      <ScrollView
        style={styles.remindersList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : filteredReminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No reminders found</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first reminder
            </Text>
          </View>
        ) : (
          filteredReminders.map((reminder) => (
            <TouchableOpacity
              key={reminder._id}
              style={[
                styles.reminderCard,
                isOverdue(reminder) && styles.reminderCardOverdue
              ]}
              onPress={() => navigation.navigate('AddReminder', { reminder })}
            >
              <View style={styles.reminderContent}>
                <Text style={styles.reminderTitle} numberOfLines={1}>
                  {reminder.title}
                </Text>

                {reminder.description && (
                  <Text style={styles.reminderDescription} numberOfLines={2}>
                    {reminder.description}
                  </Text>
                )}

                <View style={styles.reminderMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                      {formatDate(reminder.reminderDate)}
                    </Text>
                  </View>
                  
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.metaText}>{reminder.reminderTime}</Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  {!reminder.isCompleted && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleComplete(reminder._id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                      <Text style={[styles.actionText, { color: '#10B981' }]}>
                        Complete
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(reminder._id, reminder.title)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {reminder.isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}

              {isOverdue(reminder) && !reminder.isCompleted && (
                <View style={styles.overdueBadge}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.overdueText}>Overdue</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingVertical: 15,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 100,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  remindersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderCardOverdue: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  reminderDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  overdueBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
});

