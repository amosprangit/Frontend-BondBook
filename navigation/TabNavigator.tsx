import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Entypo, Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useGetNotificationCountQuery } from '../store/api/notificationApi';
// Import screens
import HomeScreen from '../screens/home';
import ChatListScreen from '../screens/chatList';
import CameraScreen from '../screens/camera';
import NotificationScreen from '../screens/notifications';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Custom tab icon component
const TabIcon = ({ name, color, size, isFocused, type = 'entypo', badgeCount = 0 }: any) => {
  const getIconComponent = () => {
    switch (type) {
      case 'entypo':
        return <Entypo name={name} size={size} color={color} />;
      case 'ionicons':
        return <Ionicons name={name} size={size} color={color} />;
      case 'material':
        return <MaterialIcons name={name} size={size} color={color} />;
      case 'FontAwesome':
        return <FontAwesome name={name} size={size} color={color} />;
      default:
        return <Entypo name={name} size={size} color={color} />;
    }
  };

  return (
    <View style={styles.iconContainer}>
      {/* Active tab background pill */}
      {isFocused && (
        <View style={styles.activeTabBackground} />
      )}

      {getIconComponent()}

      {badgeCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function TabNavigator() {
  // Fetch notification count every 30 seconds
  const { data: notificationCountData } = useGetNotificationCountQuery(undefined, {
    pollingInterval: 30000,
  });

  const unreadCount = notificationCountData?.unreadCount || 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: '#FFFFFF',
          borderRadius: 30,
          height: 60,
          borderTopWidth: 0,
          // Improved shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 12,
          // Ensure proper layout
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 5,
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#95A5A6',
      }}
    >
      {/* Home */}
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />

      {/* Chat */}
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="chat"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={22}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />

      {/* Camera - Now looks like other tabs */}
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="camera"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />

      {/* Notifications */}
      <Tab.Screen
        name="NotificationTab"
        component={NotificationScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="bell"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={23}
              isFocused={focused}
              type="entypo"
              badgeCount={unreadCount}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="user-circle-o"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={24}
              isFocused={focused}
              type="FontAwesome"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    position: 'relative',
  },

  // Active tab background pill
  activeTabBackground: {
    position: 'absolute',
    backgroundColor: '#F0E6FF',
    borderRadius: 18,
    width: 40,
    height: 32,
    opacity: 0.9,
    top: 4,
  },

  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: -4,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});