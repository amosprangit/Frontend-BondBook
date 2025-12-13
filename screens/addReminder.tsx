import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useGetRemindersQuery,
} from '../store/api/remindersApi';

export default function AddReminderScreen({ navigation, route }: any) {
  const reminder = route?.params?.reminder;
  const isEditing = !!reminder;

  // Get today's date in YYYY-MM-DD format
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

  // Convert date string to Date object
  const getDateObject = () => {
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  // Convert time string to Date object
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

  // Handle date change
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

  // Handle time change
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

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid date (YYYY-MM-DD)',
      });
      return;
    }

    // Validate time format
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

      // Refresh reminders list
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Reminder' : 'Add Reminder'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#8B5CF6" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter reminder title"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add description (optional)"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeInputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <Text style={styles.dateTimeInput}>
                {date || 'Select date'}
              </Text>
            </View>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={getDateObject()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          <Text style={styles.helperText}>Tap to select date</Text>
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Time * (HH:MM)</Text>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeInputWrapper}>
              <Ionicons name="time-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <Text style={styles.dateTimeInput}>
                {time || 'Select time'}
              </Text>
            </View>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={getTimeObject()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              is24Hour={false}
            />
          )}
          <Text style={styles.helperText}>Tap to select time</Text>
        </View>

        {/* Saved Reminders List */}
        {reminders.length > 0 && (
          <View style={styles.remindersSection}>
            <Text style={styles.remindersSectionTitle}>Saved Reminders</Text>
            <View style={styles.remindersList}>
              {reminders.slice(0, 5).map((savedReminder: any) => {
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

                const daysLeft = getDaysLeft(savedReminder.reminderDate);
                const isOverdue = daysLeft < 0;
                const isToday = daysLeft === 0;

                return (
                  <TouchableOpacity
                    key={savedReminder._id}
                    style={styles.reminderItem}
                    onPress={() => {
                      navigation.replace('AddReminder', { reminder: savedReminder });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reminderItemContent}>
                      <View style={styles.reminderItemHeader}>
                        <Text style={styles.reminderItemTitle} numberOfLines={1}>
                          {savedReminder.title}
                        </Text>
                        {isOverdue ? (
                          <View style={styles.reminderBadgeOverdue}>
                            <Text style={[styles.reminderBadgeText, { color: '#EF4444' }]}>Overdue</Text>
                          </View>
                        ) : isToday ? (
                          <View style={styles.reminderBadgeToday}>
                            <Text style={[styles.reminderBadgeText, { color: '#F59E0B' }]}>Today</Text>
                          </View>
                        ) : null}
                      </View>
                      
                      {savedReminder.description && (
                        <Text style={styles.reminderItemDescription} numberOfLines={1}>
                          {savedReminder.description}
                        </Text>
                      )}
                      
                      <View style={styles.reminderItemMeta}>
                        <View style={styles.reminderMetaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                          <Text style={styles.reminderMetaText}>
                            {formatDate(savedReminder.reminderDate)}
                          </Text>
                        </View>
                        <View style={styles.reminderMetaItem}>
                          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                          <Text style={styles.reminderMetaText}>
                            {savedReminder.reminderTime}
                          </Text>
                        </View>
                        {!isOverdue && !isToday && (
                          <Text style={styles.reminderDaysLeft}>
                            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
            {reminders.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Reminders')}
              >
                <Text style={styles.viewAllButtonText}>
                  View All Reminders ({reminders.length})
                </Text>
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
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  dateTimeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  remindersSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  remindersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
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
    color: '#1F2937',
    flex: 1,
  },
  reminderBadgeOverdue: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  reminderBadgeToday: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  reminderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
  viewAllButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
