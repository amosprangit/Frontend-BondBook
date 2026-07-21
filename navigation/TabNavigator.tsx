import React, { useRef, useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons, Entypo, Feather } from '@expo/vector-icons';
import { useGetNotificationCountQuery } from '../store/api/notificationApi';
// Import screens
import HomeScreen from '../screens/home';
import ChatListScreen from '../screens/chatList';
import CameraScreen from '../screens/camera';
import NotificationScreen from '../screens/notifications';
import ProfileScreen from '../screens/profile';
import SearchScreen from '../screens/search'; // We'll create this
import Reminder from '../screens/reminder';

const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Animated Tab Icon Component with scale and bounce
const AnimatedTabIcon = ({
  name,
  color,
  size,
  isFocused,
  badgeCount = 0,
  label,
  iconFamily = 'Ionicons'
}: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: -6,
          friction: 4,
          tension: 30,
          useNativeDriver: true,
        }),
      ]).start();

      if (badgeCount > 0) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.4,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 4,
          tension: 30,
          useNativeDriver: true,
        }),
      ]).start();
      pulseAnim.setValue(1);
    }
  }, [isFocused]);

  const getIcon = () => {
    switch (iconFamily) {
      case 'Ionicons':
        return <Ionicons name={name} size={size} color={color} />;
      case 'Entypo':
        return <Entypo name={name} size={size} color={color} />;
      case 'Feather':
        return <Feather name={name} size={size} color={color} />;
      default:
        return <Ionicons name={name} size={size} color={color} />;
    }
  };

  return (
    <View style={styles.iconContainer}>
      {isFocused && (
        <Animated.View
          style={[
            styles.activeTabBackground,
            {
              transform: [{ scale: scaleAnim }],
              opacity: scaleAnim.interpolate({
                inputRange: [0.8, 1.15],
                outputRange: [0.5, 1],
              }),
            }
          ]}
        />
      )}

      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
        }}
      >
        {getIcon()}
      </Animated.View>

      {badgeCount > 0 && (
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              transform: [{ scale: isFocused ? pulseAnim : 1 }],
            }
          ]}
        >
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </Animated.View>
      )}

      <Animated.Text
        style={[
          styles.tabLabel,
          isFocused && styles.tabLabelActive,
          {
            opacity: isFocused ? 1 : 0.7,
            transform: [{
              scale: isFocused ? 1 : 0.9,
            }],
          }
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

// Custom Action Button for Camera
const ActionButton = ({ isFocused }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
      pulseAnim.setValue(1);
    }
  }, [isFocused]);

  return (
    <View style={styles.actionContainer}>
      <Animated.View
        style={[
          styles.actionButtonWrapper,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <Animated.View
          style={[
            styles.actionButton,
            {
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          <Entypo name="camera" size={28} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default function TabNavigator() {
  // Common tab bar style
  const commonTabBarStyle = {
    position: 'absolute' as const,
    bottom: 18,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 72,
    borderTopWidth: 0,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 15,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingHorizontal: 5,
    paddingBottom: Platform.OS === 'ios' ? 5 : 0,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: commonTabBarStyle,
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#95A5A6',
        animation: 'shift' as const,
        animationDuration: 300,
      })}
    >
      {/* Home */}
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="home"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={24}
              isFocused={focused}
              iconFamily="Ionicons"
            />
          ),
        }}
      />

      {/* Reminder */}
      <Tab.Screen
        name="ReminderTab"
        component={Reminder}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="alarm-outline"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={23}
              isFocused={focused}
              iconFamily="Ionicons"
            />
          ),
        }}
      />

      {/* Camera - Custom Action Button */}
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <ActionButton isFocused={focused} />
          ),
          tabBarStyle: {
            ...commonTabBarStyle,
            display: 'none',
          },
        }}
      />

      {/* Search - Replaced Notifications */}
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="search"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={24}
              isFocused={focused}
              iconFamily="Ionicons"
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
            <AnimatedTabIcon
              name="person-circle"
              color={focused ? '#6C5CE7' : '#95A5A6'}
              size={26}
              isFocused={focused}
              iconFamily="Ionicons"
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
    width: 55,
    height: 68,
    position: 'relative',
  },

  activeTabBackground: {
    position: 'absolute',
    backgroundColor: '#F0E6FF',
    borderRadius: 20,
    width: 50,
    height: 36,
    opacity: 0.9,
    top: 1,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  tabLabel: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  tabLabelActive: {
    color: '#6C5CE7',
    fontWeight: '600',
  },

  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4757',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 55,
    height: 68,
    position: 'relative',
  },

  actionButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },

  actionButton: {
    width: 56,
    height: 50,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});