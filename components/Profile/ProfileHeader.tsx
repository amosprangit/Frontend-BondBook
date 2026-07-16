import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ProfileHeaderProps {
  username: string;
  bio: string;
  profilePicture: string;
  isUpdating: boolean;
  onUpdateProfilePicture: () => void;
  onEditProfile: () => void;
}

export default function ProfileHeader({
  username,
  bio,
  profilePicture,
  isUpdating,
  onUpdateProfilePicture,
  onEditProfile,
}: ProfileHeaderProps) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.profilePictureSection}>
        <TouchableOpacity
          onPress={onUpdateProfilePicture}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          <View style={styles.profilePictureWrapper}>
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
            {isUpdating && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={16} color="#ffffff" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfoSection}>
        <View style={styles.usernameContainer}>
          <Text style={styles.username}>{username}</Text>
          <TouchableOpacity onPress={onEditProfile} style={styles.editIconButton}>
            <Ionicons name="create-outline" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {bio && bio !== 'No bio yet' && (
          <Text style={styles.bioText}>{bio}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
  },
  profilePictureSection: {
    marginRight: 16,
  },
  profilePictureWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  editIconButton: {
    padding: 4,
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});