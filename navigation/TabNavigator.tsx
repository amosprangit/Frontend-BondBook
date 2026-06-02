import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Entypo, Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useGetNotificationCountQuery } from '../store/api/notificationApi';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
// Import screens
import HomeScreen from '../screens/home';
import ChatListScreen from '../screens/chatList';
import CameraScreen from '../screens/camera';
import NotificationScreen from '../screens/notifications';
import ProfileScreen from '../screens/profile';

const Tab = createBottomTabNavigator();


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

      {getIconComponent()}

      {badgeCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}

      {isFocused && <View style={styles.activeIndicator} />}

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
          backgroundColor: '#ffffff',
          height: 90,
          borderTopWidth: 0,

          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },

        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
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
              color={color}
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
              color={color}
              size={24}
              isFocused={focused}
              type="entypo"
            />
          ),
        }}
      />

      {/* Camera Floating Button */}
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.cameraButton,
                { backgroundColor: focused ? '#8B5CF6' : '#A78BFA' },
              ]}
            >
              <Entypo name="camera" size={26} color="#fff" />
            </View>
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
              color={color}
              size={24}
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
    width: 50,
    height: 40,
  },


  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
  },


  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },


  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },


  cameraButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },

});