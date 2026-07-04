import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useAppDispatch } from '../store/hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { CommonActions } from '@react-navigation/native';
import { authApi } from '../store/api/authApi';
import { postsApi } from '../store/api/postsApi';
import { storiesApi } from '../store/api/storiesApi';
import { useDeleteProfileMutation } from '../store/api/authApi';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const dispatch = useAppDispatch();
  const [deleteProfile, { isLoading: isDeleting }] = useDeleteProfileMutation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerScale = useRef(new Animated.Value(0.9)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      dispatch(logoutAction());
      
      dispatch(authApi.util.resetApiState());
      dispatch(postsApi.util.resetApiState());
      dispatch(storiesApi.util.resetApiState());
      
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been logged out successfully',
      });
      
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
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      const result = await deleteProfile().unwrap();
      
      if (result.success) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        
        dispatch(logoutAction());
        
        Toast.show({
          type: 'success',
          text1: 'Account Deleted',
          text2: result.message || 'Your account has been deleted successfully',
        });
        
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
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    onConfirm: () => void,
    title: string,
    message: string,
    confirmText: string,
    confirmColor: string
  ) => (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: headerScale }] }]}>
          <LinearGradient
            colors={['#ffffff', '#f8f4ff']}
            style={styles.modalGradient}
          >
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={confirmColor === '#EF4444' ? ['#FEE2E2', '#FECACA'] : ['#E0E7FF', '#C7D2FE']}
                style={styles.modalIconGradient}
              >
                <Ionicons 
                  name={confirmColor === '#EF4444' ? "alert-triangle" : "log-out"} 
                  size={40} 
                  color={confirmColor} 
                />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmButton, { backgroundColor: confirmColor }]} 
                onPress={onConfirm}
              >
                <Text style={styles.modalConfirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={['#ffffff', '#f8f4ff', '#f0eaff']}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} activeOpacity={0.7}>
            <LinearGradient
              colors={['#f3e8ff', '#e9d5ff']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerButton} />
        </Animated.View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Section */}
          {/* <Animated.View 
            style={[
              styles.profileSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7', '#C084FC']}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={40} color="#ffffff" />
              </View>
              <Text style={styles.profileName}>John Doe</Text>
              <Text style={styles.profileEmail}>john.doe@example.com</Text>
              <TouchableOpacity style={styles.editProfileButton}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View> */}

          {/* Reminders Section */}
          {/* <Animated.View 
            style={[
              styles.settingsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Reminders</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('AddReminder')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
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
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="notifications-outline" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>My Reminders</Text>
                    <Text style={styles.settingItemSubtitle}>View all your reminders</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View> */}

          {/* Preferences Section */}
          {/* <Animated.View 
            style={[
              styles.settingsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <View style={styles.settingItem}>
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="notifications" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>Push Notifications</Text>
                    <Text style={styles.settingItemSubtitle}>Receive notifications about reminders</Text>
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                  thumbColor={notificationsEnabled ? '#8B5CF6' : '#9CA3AF'}
                />
              </LinearGradient>
            </View>

            <View style={styles.settingItem}>
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="moon" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>Dark Mode</Text>
                    <Text style={styles.settingItemSubtitle}>Switch to dark theme</Text>
                  </View>
                </View>
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                  thumbColor={darkModeEnabled ? '#8B5CF6' : '#9CA3AF'}
                />
              </LinearGradient>
            </View>
          </Animated.View> */}

          {/* Account Section */}
          <Animated.View 
            style={[
              styles.settingsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
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
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
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
                    <Text style={[styles.settingItemTitle, { color: '#EF4444' }]}>Delete Account</Text>
                    <Text style={styles.settingItemSubtitle}>Permanently delete your account and all data</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* About Section */}
          <Animated.View 
            style={[
              styles.settingsSection,
              styles.lastSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>About</Text>
            
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="information-circle-outline" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>About BondBook</Text>
                    <Text style={styles.settingItemSubtitle}>Version 1.0.0</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <LinearGradient
                colors={['#ffffff', '#faf5ff']}
                style={styles.settingItemGradient}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <Ionicons name="heart-outline" size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>Rate Us</Text>
                    <Text style={styles.settingItemSubtitle}>Love BondBook? Rate us on the store</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C4B5FD" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Modals */}
        {renderModal(
          showLogoutModal,
          () => setShowLogoutModal(false),
          confirmLogout,
          'Logout',
          'Are you sure you want to logout?',
          'Logout',
          '#EF4444'
        )}

        {renderModal(
          showDeleteModal,
          () => setShowDeleteModal(false),
          confirmDeleteAccount,
          'Delete Account',
          'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
          'Delete',
          '#EF4444'
        )}

        {/* Shimmer Effect Overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginBottom: 24,
    marginTop: 10,
  },
  profileGradient: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  editProfileText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSection: {
    marginBottom: 16,
  },
  lastSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  settingItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
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
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  poweredByText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  shimmerGradient: {
    width: width * 0.5,
    height: '100%',
  },
});