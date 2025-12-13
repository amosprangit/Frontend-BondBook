import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Entypo, Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useGetNotificationCountQuery } from '../store/api/notificationApi';

// Import screens
import HomeScreen from '../screens/home';
import ChatListScreen from '../screens/chatList';
import ChatScreen from '../screens/chat';
import CameraScreen from '../screens/camera';
import NotificationScreen from '../screens/notifications';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();

// Custom tab bar icon component with badge support
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
      {getIconComponent()}
      {badgeCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
      {isFocused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
};

export default function TabNavigator() {
  // Fetch notification count with polling every 30 seconds
  const { data: notificationCountData } = useGetNotificationCountQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = notificationCountData?.unreadCount || 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 100,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="home"
              color={color}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="chat"
              color={color}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarLabel: 'Camera',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="camera"
              color={color}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationTab"
        component={NotificationScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="bell"
              color={color}
              size={24}
              isFocused={focused}
              type="entypo"
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name="user-circle-o"
              color={color}
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
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -20,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
