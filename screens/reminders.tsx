import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import {
  useGetRemindersQuery,
  useGetReminderStatsQuery,
  useDeleteReminderMutation,
  useMarkReminderCompletedMutation,
} from '../store/api/remindersApi';

const { width, height } = Dimensions.get('window');

export default function RemindersScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const swipeableRefs = useRef(new Map());

  const { data: statsData, refetch: refetchStats } = useGetReminderStatsQuery();
  const { data: remindersData, isLoading, refetch } = useGetRemindersQuery(
    filter === 'completed' ? { completed: true } : {}
  );
  const [deleteReminder] = useDeleteReminderMutation();
  const [markCompleted] = useMarkReminderCompletedMutation();

  const stats = statsData?.stats;
  const reminders = Array.isArray(remindersData?.reminders) ? remindersData.reminders : [];

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

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
        text1: 'Well done! 🎉',
        text2: 'Reminder marked as completed',
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const isOverdue = (reminder: any) => {
    if (reminder.isCompleted) return false;
    const now = new Date();
    const reminderDate = new Date(reminder.reminderDate);
    if (reminder.reminderTime) {
      const [hours, minutes] = reminder.reminderTime.split(':');
      reminderDate.setHours(parseInt(hours), parseInt(minutes));
    } else {
      reminderDate.setHours(0, 0, 0, 0);
    }
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

  const renderRightActions = (progress: any, dragX: any, reminderId: string, isCompleted: boolean) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {!isCompleted && (
          <TouchableOpacity
            style={styles.completeAction}
            onPress={() => handleComplete(reminderId)}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.actionText}>Done</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDelete(reminderId, '')}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.actionGradient}
            >
              <Ionicons name="trash-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Delete</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const ReminderItem = ({ reminder, index }: { reminder: any; index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(50)).current;
    const overdue = isOverdue(reminder);
    const isCompleted = reminder.isCompleted;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
          marginBottom: 12,
        }}
      >
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current.set(reminder._id, ref);
          }}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, reminder._id, isCompleted)
          }
          overshootRight={false}
          rightThreshold={40}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AddReminder', { reminder })}
            style={[
              styles.reminderCard,
              overdue && !isCompleted && styles.reminderCardOverdue,
              isCompleted && styles.reminderCardCompleted,
            ]}
          >
            <LinearGradient
              colors={isCompleted ? ['#F9FAFB', '#F3F4F6'] : ['#FFFFFF', '#FAFAFA']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Status Indicator Line */}
              {!isCompleted && (
                <View style={[styles.statusLine, { backgroundColor: overdue ? '#EF4444' : '#8B5CF6' }]} />
              )}

              <View style={styles.reminderContent}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={isCompleted ? ['#9CA3AF', '#D1D5DB'] : overdue ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#EC4899']}
                    style={styles.iconContainer}
                  >
                    <MaterialIcons
                      name={isCompleted ? "check-circle" : overdue ? "error" : "event"}
                      size={22}
                      color="#fff"
                    />
                  </LinearGradient>

                  <View style={styles.titleContainer}>
                    <Text style={[
                      styles.reminderTitle,
                      isCompleted && styles.reminderTitleCompleted,
                      overdue && !isCompleted && styles.reminderTitleOverdue,
                    ]} numberOfLines={1}>
                      {reminder.title}
                    </Text>

                    {(overdue && !isCompleted) && (
                      <View style={styles.overdueChip}>
                        <Ionicons name="time-outline" size={12} color="#EF4444" />
                        <Text style={styles.overdueChipText}>Overdue</Text>
                      </View>
                    )}

                    {isCompleted && (
                      <View style={styles.completedChip}>
                        <Ionicons name="checkmark" size={12} color="#10B981" />
                        <Text style={styles.completedChipText}>Completed</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Description */}
                {reminder.description && (
                  <Text style={[
                    styles.reminderDescription,
                    isCompleted && styles.reminderDescriptionCompleted,
                  ]} numberOfLines={2}>
                    {reminder.description}
                  </Text>
                )}

                {/* Date and Time Meta */}
                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={isCompleted ? "#9CA3AF" : "#8B5CF6"} />
                    <Text style={[styles.metaText, isCompleted && styles.metaTextCompleted]}>
                      {formatDate(reminder.reminderDate)}
                    </Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={isCompleted ? "#9CA3AF" : "#8B5CF6"} />
                    <Text style={[styles.metaText, isCompleted && styles.metaTextCompleted]}>
                      {reminder.reminderTime || 'All day'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  };

  const StatCard = ({ icon, label, value, colors, gradientColors }: any) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={gradientColors}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.statIconContainer, { backgroundColor: colors.bg }]}>
              <Ionicons name={icon} size={24} color={colors.icon} />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ scale: headerScale }] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color="#6B7280" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reminders</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddReminder')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Statistics Cards */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard
            icon="list-outline"
            label="Total"
            value={stats.total}
            colors={{ bg: '#EFF6FF', icon: '#3B82F6', text: '#3B82F6' }}
            gradientColors={['#FFFFFF', '#F9FAFB']}
          />

          <StatCard
            icon="today-outline"
            label="Today"
            value={stats.today}
            colors={{ bg: '#FEF3C7', icon: '#F59E0B', text: '#F59E0B' }}
            gradientColors={['#FFFFFF', '#FFFBEB']}
          />

          <StatCard
            icon="alert-circle-outline"
            label="Overdue"
            value={stats.overdue}
            colors={{ bg: '#FEE2E2', icon: '#EF4444', text: '#EF4444' }}
            gradientColors={['#FFFFFF', '#FEF2F2']}
          />

          <StatCard
            icon="checkmark-done-circle-outline"
            label="Completed"
            value={stats.completed}
            colors={{ bg: '#D1FAE5', icon: '#10B981', text: '#10B981' }}
            gradientColors={['#FFFFFF', '#ECFDF5']}
          />
        </ScrollView>
      )}

      {/* Filter Tabs with Animation */}
      <View style={styles.filterContainer}>
        {['all', 'today', 'upcoming', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive
            ]}
            onPress={() => setFilter(f as any)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={filter === f ? ['#8B5CF6', '#EC4899'] : ['#FFFFFF', '#FFFFFF']}
              style={styles.filterGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[
                styles.filterText,
                filter === f && styles.filterTextActive
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reminders List */}
      <Animated.ScrollView
        style={styles.remindersList}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6', '#EC4899']}
            tintColor="#8B5CF6"
            title="Pull to refresh"
            titleColor="#8B5CF6"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : filteredReminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.emptyGradient}
            >
              <MaterialIcons name="notifications-off" size={80} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No reminders found</Text>
              <Text style={styles.emptyText}>
                {filter === 'completed'
                  ? "You haven't completed any reminders yet"
                  : "Tap the + button to create your first reminder"}
              </Text>
              {filter !== 'completed' && (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('AddReminder')}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    style={styles.createButtonGradient}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Create Reminder</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filteredReminders.length} reminder{filteredReminders.length !== 1 ? 's' : ''}
            </Text>
            {filteredReminders.map((reminder, index) => (
              <ReminderItem key={reminder._id} reminder={reminder} index={index} />
            ))}
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingVertical: 16,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 100,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statGradient: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabActive: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  remindersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 4,
  },
  reminderCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderCardOverdue: {
    shadowColor: '#EF4444',
    shadowOpacity: 0.1,
  },
  reminderCardCompleted: {
    opacity: 0.85,
  },
  cardGradient: {
    borderRadius: 16,
    position: 'relative',
  },
  statusLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  reminderContent: {
    padding: 16,
    paddingLeft: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    gap: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  reminderTitleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  reminderTitleOverdue: {
    color: '#EF4444',
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  overdueChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  completedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  completedChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  reminderDescriptionCompleted: {
    color: '#9CA3AF',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaTextCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    marginVertical: 0,
    gap: 8,
  },
  completeAction: {
    width: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 8,
  },
  deleteAction: {
    width: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyContainer: {
    marginTop: 60,
  },
  emptyGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});