import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { useGetRemindersQuery, useDeleteReminderMutation } from '../store/api/remindersApi';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function Reminder({ navigation }: { navigation: any }) {
  const { data: remindersData, isLoading, error, refetch } = useGetRemindersQuery();
  const [deleteReminder] = useDeleteReminderMutation();
  const reminders = remindersData?.reminders || [];
  const swipeableRefs = useRef(new Map());

  // Calculate days left for a reminder
  const getDaysLeft = (reminderDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminder = new Date(reminderDate);
    reminder.setHours(0, 0, 0, 0);
    const diffTime = reminder.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleAddReminder = () => {
    navigation.navigate('AddReminder');
  };

  const handleReminderPress = (reminder: any) => {
    navigation.navigate('AddReminder', { reminder });
  };

  const handleDeleteReminder = async (reminderId: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
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
                text1: 'Deleted',
                text2: 'Reminder has been deleted',
              });
              refetch();
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

  const renderRightActions = (progress: any, dragX: any, reminderId: string) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReminder(reminderId)}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.deleteGradient}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const ReminderCard = ({ reminder, index }: { reminder: any; index: number }) => {
    const daysLeft = getDaysLeft(reminder.reminderDate);
    const formattedDate = formatDate(reminder.reminderDate);
    const isOverdue = daysLeft < 0;
    const isToday = daysLeft === 0;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(50)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
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

    const getStatusColor = () => {
      if (isOverdue) return '#EF4444';
      if (isToday) return '#F59E0B';
      if (daysLeft <= 3) return '#8B5CF6';
      return '#10B981';
    };

    const getStatusText = () => {
      if (isOverdue) return 'Overdue';
      if (isToday) return 'Today';
      if (daysLeft === 1) return 'Tomorrow';
      return `${daysLeft} days left`;
    };

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
          marginBottom: 16,
        }}
      >
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current.set(reminder._id, ref);
          }}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, reminder._id)
          }
          overshootRight={false}
          rightThreshold={40}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleReminderPress(reminder)}
            style={styles.reminderCard}
          >
            <LinearGradient
              colors={['#FFFFFF', '#FAFAFA']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Status Indicator */}
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />

              <View style={styles.cardContent}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    style={styles.iconContainer}
                  >
                    <MaterialIcons name="event" size={22} color="#fff" />
                  </LinearGradient>

                  <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {reminder.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                      <Text style={[styles.statusText, { color: getStatusColor() }]}>
                        {getStatusText()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => handleDeleteReminder(reminder._id)}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                {reminder.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {reminder.description}
                  </Text>
                )}

                {/* Date and Time */}
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeItem}>
                    <MaterialIcons name="calendar-today" size={16} color="#8B5CF6" />
                    <Text style={styles.dateTimeText}>{formattedDate}</Text>
                  </View>

                  {reminder.reminderTime && (
                    <View style={styles.dateTimeItem}>
                      <Ionicons name="time-outline" size={16} color="#8B5CF6" />
                      <Text style={styles.dateTimeText}>{reminder.reminderTime}</Text>
                    </View>
                  )}
                </View>

                {/* Progress Bar for upcoming reminders */}
                {!isOverdue && daysLeft > 0 && daysLeft <= 7 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <Animated.View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(0, 100 - (daysLeft / 7) * 100)}%`,
                            backgroundColor: getStatusColor(),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {daysLeft} days remaining
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  };

  const AnimatedHeader = () => {
    const headerScale = useRef(new Animated.Value(1)).current;

    const onScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: headerScale } } }],
      { useNativeDriver: false }
    );

    return (
      <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color="#6B7280" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reminders</Text>

        <TouchableOpacity style={styles.menuButton}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.menuButtonGradient}
          >
            <Feather name="more-horizontal" size={20} color="#6B7280" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <AnimatedHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#8B5CF6"
            colors={['#8B5CF6', '#EC4899']}
          />
        }
      >
        {/* Add Reminder Button */}
        <TouchableOpacity
          style={styles.addReminderButton}
          onPress={handleAddReminder}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <AntDesign name="plus" size={24} color="#fff" />
            <Text style={styles.addReminderText}>Create New Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Reminder Stats */}
        {!isLoading && reminders.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reminders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                {reminders.filter(r => getDaysLeft(r.reminderDate) === 0).length}
              </Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                {reminders.filter(r => getDaysLeft(r.reminderDate) < 0).length}
              </Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>
        )}

        {/* Reminder Cards */}
        <View style={styles.reminderCardsContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading reminders...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <LinearGradient
                colors={['#FEF2F2', '#FEE2E2']}
                style={styles.errorGradient}
              >
                <MaterialIcons name="error-outline" size={60} color="#EF4444" />
                <Text style={styles.errorText}>Failed to load reminders</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    style={styles.retryGradient}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : reminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.emptyGradient}
              >
                <MaterialIcons name="notifications-none" size={80} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Reminders Yet</Text>
                <Text style={styles.emptyText}>
                  Stay organized! Create your first reminder to never miss important events.
                </Text>
                <TouchableOpacity style={styles.createFirstButton} onPress={handleAddReminder}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    style={styles.createFirstGradient}
                  >
                    <Text style={styles.createFirstText}>Create Reminder</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            reminders.map((reminder: any, index: number) => (
              <ReminderCard key={reminder._id} reminder={reminder} index={index} />
            ))
          )}
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  menuButton: {
    width: 40,
    height: 40,
  },
  menuButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  addReminderButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    // shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  addReminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  reminderCardsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
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
  cardGradient: {
    borderRadius: 16,
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    padding: 16,
    paddingLeft: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  deleteButton: {
    width: 80,
    marginVertical: 0,
  },
  deleteGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginLeft: 8,
    gap: 4,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    marginTop: 40,
  },
  errorGradient: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 20,
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
  createFirstButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createFirstGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  createFirstText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});