import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetProfileQuery } from '../store/api/authApi';
import { useAppSelector } from '../store/hooks';
import { API_URL } from '@env';

const { width } = Dimensions.get('window');

interface TabHeaderProps {
  onProfilePress?: () => void;
}

export default function TabHeader({ onProfilePress }: TabHeaderProps) {
  const { user: reduxUser } = useAppSelector((state) => state.auth);
  const { data: profileData } = useGetProfileQuery();

  // Get user data from API or Redux
  let user;
  if (profileData?.user) {
    user = profileData.user;
  } else if (profileData?._id || profileData?.username) {
    user = profileData;
  } else {
    user = reduxUser;
  }

  const profilePicture = user?.profilePicture ? API_URL + "/" + user.profilePicture : null;

  return (
    <View style={styles.container}>
      {/* BondBook Logo with Gradient */}
      <View style={styles.logoContainer}>
       <Image source={require('../assets/images/logo.png')} resizeMode='contain' style={{width: 150, height: 50}} />
      </View>

      {/* User Profile Icon */}
      <TouchableOpacity 
        style={styles.profileContainer}
        onPress={onProfilePress}
        activeOpacity={0.7}
      >
        {profilePicture ? (
          <Image 
            source={{ uri: profilePicture }} 
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.profileIcon}>
            <FontAwesome name="user-circle-o" size={35} color="#8B5CF6" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    flex: 1,
  },
  gradientContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // borderWidth: 2,
    // borderColor: '#8B5CF6',
    // backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
});
