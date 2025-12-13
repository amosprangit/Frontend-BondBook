import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useAppDispatch } from '../store/hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { CommonActions } from '@react-navigation/native';
import { authApi } from '../store/api/authApi';
import { postsApi } from '../store/api/postsApi';
import { storiesApi } from '../store/api/storiesApi';
import { useDeleteProfileMutation } from '../store/api/authApi';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const [deleteProfile, { isLoading: isDeleting }] = useDeleteProfileMutation();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              
              // Clear Redux state
              dispatch(logoutAction());
              
              // Reset all API caches
              dispatch(authApi.util.resetApiState());
              dispatch(postsApi.util.resetApiState());
              dispatch(storiesApi.util.resetApiState());
              
              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been logged out successfully',
              });
              
              // Navigate to Login and reset navigation stack
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to logout. Please try again.',
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteProfile().unwrap();
              
              if (result.success) {
                // Clear AsyncStorage
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                
                // Clear Redux state
                dispatch(logoutAction());
                
                Toast.show({
                  type: 'success',
                  text1: 'Account Deleted',
                  text2: result.message || 'Your account has been deleted successfully',
                });
                
                // Navigate to Login and reset navigation stack
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  })
                );
              }
            } catch (error: any) {
              console.error('Delete account error:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error?.data?.message || 'Failed to delete account. Please try again.',
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Reminders Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          
          {/* Add Reminder Button */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('AddReminder')}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemTitle}>Add Reminder</Text>
                <Text style={styles.settingItemSubtitle}>Create a new reminder</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              </View>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemTitle}>Logout</Text>
                <Text style={styles.settingItemSubtitle}>Sign out of your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                )}
              </View>
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemTitle}>Delete Account</Text>
                <Text style={styles.settingItemSubtitle}>Permanently delete your account and all data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});

