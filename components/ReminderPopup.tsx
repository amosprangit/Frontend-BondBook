import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Reminder } from '../store/api/remindersApi';

interface ReminderPopupProps {
  visible: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onDismiss: (reminderId: string) => void;
}

const { width } = Dimensions.get('window');

const ReminderPopup: React.FC<ReminderPopupProps> = ({
  visible,
  reminder,
  onClose,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const vibrationInterval = useRef<NodeJS.Timeout | null>(null);

  // Start vibration pattern when popup is visible
  useEffect(() => {
    if (visible && reminder) {
      // Start scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Start pulse animation for the bell icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Vibration pattern: vibrate for 500ms, pause for 500ms, repeat
      const vibrationPattern = Platform.OS === 'android'
        ? [0, 500, 500, 500, 500, 500]
        : [500, 500, 500];

      Vibration.vibrate(vibrationPattern, true);

      return () => {
        pulseAnimation.stop();
        Vibration.cancel();
      };
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, reminder]);

  const handleClose = () => {
    Vibration.cancel();
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleDismiss = () => {
    if (reminder) {
      Vibration.cancel();
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDismiss(reminder._id);
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#EAB308';
      case 'low':
        return '#22C55E';
      default:
        return '#8B5CF6';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal':
        return 'person';
      case 'work':
        return 'briefcase';
      case 'health':
        return 'fitness';
      case 'social':
        return 'people';
      case 'finance':
        return 'wallet';
      default:
        return 'notifications';
    }
  };

  if (!visible || !reminder) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Bell Icon with Pulse Animation */}
          <Animated.View
            style={[
              styles.bellContainer,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: getPriorityColor(reminder.priority),
              },
            ]}
          >
            <Ionicons name="notifications" size={40} color="#ffffff" />
          </Animated.View>

          {/* Reminder Title */}
          <Text style={styles.reminderLabel}>Reminder!</Text>
          <Text style={styles.title}>{reminder.title}</Text>

          {/* Time */}
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <Text style={styles.timeText}>{reminder.reminderTime}</Text>
          </View>

          {/* Description */}
          {reminder.description && (
            <Text style={styles.description} numberOfLines={3}>
              {reminder.description}
            </Text>
          )}

          {/* Category & Priority */}
          <View style={styles.metaContainer}>
            <View style={styles.categoryBadge}>
              <Ionicons
                name={getCategoryIcon(reminder.category) as any}
                size={14}
                color="#6B7280"
              />
              <Text style={styles.categoryText}>
                {reminder.category.charAt(0).toUpperCase() + reminder.category.slice(1)}
              </Text>
            </View>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(reminder.priority) + '20' },
              ]}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(reminder.priority) },
                ]}
              />
              <Text
                style={[
                  styles.priorityText,
                  { color: getPriorityColor(reminder.priority) },
                ]}
              >
                {reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-off" size={20} color="#ffffff" />
              <Text style={styles.dismissButtonText}>Reminder Off</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  bellContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  dismissButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ReminderPopup;
