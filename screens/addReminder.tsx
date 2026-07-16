import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import {
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useGetRemindersQuery,
} from '../store/api/remindersApi';

// Import reusable components
import FormInput from '../components/FormInput';
import DateTimePickerField from '../components/DateTimePickerField';
import ReminderItem from '../components/ReminderItem';

export default function AddReminderScreen({ navigation, route }: any) {
  const reminder = route?.params?.reminder;
  const isEditing = !!reminder;

  const today = new Date();
  const defaultDate = today.toISOString().split('T')[0];

  const [title, setTitle] = useState(reminder?.title || '');
  const [description, setDescription] = useState(reminder?.description || '');
  const [date, setDate] = useState(reminder?.reminderDate?.split('T')[0] || defaultDate);
  const [time, setTime] = useState(reminder?.reminderTime || '09:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [createReminder, { isLoading: isCreating }] = useCreateReminderMutation();
  const [updateReminder, { isLoading: isUpdating }] = useUpdateReminderMutation();
  const { data: remindersData, refetch: refetchReminders } = useGetRemindersQuery({ completed: false });

  const isLoading = isCreating || isUpdating;
  const reminders = remindersData?.reminders || [];

  const getDateObject = () => {
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const getTimeObject = () => {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const dateObj = new Date();
      dateObj.setHours(hours, minutes, 0, 0);
      return dateObj;
    }
    const dateObj = new Date();
    dateObj.setHours(9, 0, 0, 0);
    return dateObj;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a title',
      });
      return;
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid date (YYYY-MM-DD)',
      });
      return;
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid time (HH:MM)',
      });
      return;
    }

    try {
      const reminderData = {
        title: title.trim(),
        description: description.trim(),
        reminderDate: date,
        reminderTime: time,
      };

      if (isEditing) {
        await updateReminder({
          reminderId: reminder._id,
          data: reminderData,
        }).unwrap();

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Reminder updated successfully!',
        });
      } else {
        await createReminder(reminderData).unwrap();

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Reminder created successfully!',
        });
      }

      refetchReminders();
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to save reminder',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysLeft = (reminderDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminder = new Date(reminderDate);
    reminder.setHours(0, 0, 0, 0);
    const diffTime = reminder.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Reminder' : 'Add Reminder'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Title Input */}
        <FormInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter reminder title"
          required
          maxLength={100}
          icon="pencil-outline"
        />

        {/* Description Input */}
        <FormInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Add description (optional)"
          multiline
          numberOfLines={4}
          maxLength={500}
          icon="document-text-outline"
        />

        {/* Date Picker */}
        <DateTimePickerField
          label="Date"
          value={date}
          onPress={() => setShowDatePicker(true)}
          showPicker={showDatePicker}
          onDateChange={handleDateChange}
          dateObject={getDateObject()}
          mode="date"
          icon="calendar-outline"
          placeholder="Select date"
          helperText="Tap to select date"
          required
        />

        {/* Time Picker */}
        <DateTimePickerField
          label="Time"
          value={time}
          onPress={() => setShowTimePicker(true)}
          showPicker={showTimePicker}
          onDateChange={handleTimeChange}
          dateObject={getTimeObject()}
          mode="time"
          icon="time-outline"
          placeholder="Select time"
          helperText="Tap to select time"
          required
        />

        {/* Saved Reminders List */}
        {reminders.length > 0 && (
          <View style={styles.remindersSection}>
            <View style={styles.remindersSectionHeader}>
              <Text style={styles.remindersSectionTitle}>Saved Reminders</Text>
              <View style={styles.remindersCountBadge}>
                <Text style={styles.remindersCountText}>{reminders.length}</Text>
              </View>
            </View>

            {reminders.slice(0, 5).map((savedReminder: any) => (
              <ReminderItem
                key={savedReminder._id}
                reminder={savedReminder}
                onPress={() => {
                  navigation.replace('AddReminder', { reminder: savedReminder });
                }}
                formatDate={formatDate}
                getDaysLeft={getDaysLeft}
              />
            ))}

            {reminders.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Reminders')}
              >
                <Text style={styles.viewAllButtonText}>
                  View All Reminders ({reminders.length})
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  remindersSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  remindersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  remindersSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  remindersCountBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  remindersCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});