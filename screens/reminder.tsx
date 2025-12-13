import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetRemindersQuery } from '../store/api/remindersApi';

export default function Reminder({ navigation }: { navigation: any }) {
  const { data: remindersData, isLoading, error, refetch } = useGetRemindersQuery();
  const reminders = remindersData?.reminders || [];
  
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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backButtonContainer}>
            <Ionicons name="chevron-back" size={20} color="#8B5CF6" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Reminders</Text>
        
        <TouchableOpacity style={styles.menuButton}>
          <Feather name="more-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
         <ScrollView 
           style={{ flex: 1 }} 
           showsVerticalScrollIndicator={false}
           refreshControl={
             <RefreshControl refreshing={isLoading} onRefresh={refetch} />
           }
         >
           <View style={styles.content}>
             <TouchableOpacity 
               style={styles.addReminderButton}
               onPress={handleAddReminder}
             >
               <View style={styles.addReminderIconContainer}>
                 <AntDesign name="plus-circle" size={35} color="#D0C3DA" />
               </View>
               <Text style={styles.addReminderText}>Add Reminder</Text>
             </TouchableOpacity>

             {/* Reminder Cards */}
             <View style={styles.reminderCardsContainer}>
               {isLoading ? (
                 <View style={styles.loadingContainer}>
                   <ActivityIndicator size="large" color="#8B5CF6" />
                   <Text style={styles.loadingText}>Loading reminders...</Text>
                 </View>
               ) : error ? (
                 <View style={styles.errorContainer}>
                   <Text style={styles.errorText}>Failed to load reminders</Text>
                   <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                     <Text style={styles.retryButtonText}>Retry</Text>
                   </TouchableOpacity>
                 </View>
               ) : reminders.length === 0 ? (
                 <View style={styles.emptyContainer}>
                   <MaterialIcons name="event-busy" size={50} color="#9CA3AF" />
                   <Text style={styles.emptyText}>No reminders yet</Text>
                   <Text style={styles.emptySubtext}>Tap "Add Reminder" to create one</Text>
                 </View>
               ) : (
                 reminders.map((reminder: any) => {
                   const daysLeft = getDaysLeft(reminder.reminderDate);
                   const formattedDate = formatDate(reminder.reminderDate);
                   const isOverdue = daysLeft < 0;
                   const isToday = daysLeft === 0;
                   
                   return (
                     <TouchableOpacity
                       key={reminder._id}
                       style={styles.reminderCard}
                       onPress={() => handleReminderPress(reminder)}
                       activeOpacity={0.7}
                     >
                       <View style={styles.cardLeftIcon}>
                         <MaterialIcons 
                           name="alarm" 
                           size={50} 
                           color={isOverdue ? "#FF0000" : isToday ? "#FFA500" : "#FF4444"} 
                         />
                       </View>
                       <View style={styles.cardContent}>
                         <View style={styles.cardTitleRow}>
                           <LinearGradient
                             colors={['#3B82F6', '#8B5CF6']}
                             style={styles.cardTitleIcon}
                           >
                             <View style={styles.cardTitleIconInner} />
                           </LinearGradient>
                           <Text style={styles.cardTitle} numberOfLines={1}>
                             {reminder.title}
                           </Text>
                         </View>
                         
                         {reminder.description && (
                           <View style={styles.cardDescriptionRow}>
                             <Text style={styles.cardDescription} numberOfLines={2}>
                               {reminder.description}
                             </Text>
                           </View>
                         )}
                         
                         <View style={styles.cardDateRow}>
                           <MaterialIcons name="access-time" size={16} color="#9CA3AF" />
                           <Text style={styles.cardDate}>{formattedDate}</Text>
                           {reminder.reminderTime && (
                             <Text style={styles.cardTime}> • {reminder.reminderTime}</Text>
                           )}
                           {isOverdue ? (
                             <Text style={styles.cardCountdownOverdue}>(Overdue)</Text>
                           ) : isToday ? (
                             <Text style={styles.cardCountdownToday}>(Today)</Text>
                           ) : (
                             <Text style={styles.cardCountdown}>
                               ({daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} left)
                             </Text>
                           )}
                         </View>
                       </View>
                     </TouchableOpacity>
                   );
                 })
               )}
             </View>
           </View>
         </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1EFF6',
    borderRadius: 100,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 0,
    width: '80%',
  },
  addReminderIconContainer: {
    borderRadius: 100,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  addReminderText: {
    fontSize: 20,
    color: '#A99DC0',
    fontWeight: 'bold',
  },
  reminderCardsContainer: {
    marginTop: 30,
    paddingHorizontal: 0,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: '#F1EFF6',
    borderRadius: 100,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    width: '80%',
    justifyContent: 'center',
  },
  cardLeftIcon: {
    marginRight: 15,
    marginTop: 5,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  cardTitleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleIconInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  cardLocation: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 4,
    flex: 1,
    fontWeight: 'bold',
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  cardCountdown: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardCountdownOverdue: {
    fontSize: 14,
    color: '#FF0000',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardCountdownToday: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardDescriptionRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 28,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
