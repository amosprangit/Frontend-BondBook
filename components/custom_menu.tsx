import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ✅ Define proper types for icon families
type IconFamily = 'Ionicons' | 'Feather' | 'MaterialIcons';

interface MenuOption {
    id: string;
    title: string;
    icon: string;
    iconType?: IconFamily; // ✅ Use specific type instead of string
    onPress: () => void;
    destructive?: boolean;
}

interface CustomMenuProps {
    visible: boolean;
    onClose: () => void;
    options: MenuOption[];
    title?: string;
}

export default function CustomMenu({
    visible,
    onClose,
    options,
    title = 'Options',
}: CustomMenuProps) {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 5,
                    tension: 40,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 5,
                    tension: 40,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // ✅ Fix: Properly typed icon component selector
    const getIconComponent = (iconType: IconFamily = 'Ionicons') => {
        switch (iconType) {
            case 'Feather':
                return Feather;
            case 'MaterialIcons':
                return MaterialIcons;
            case 'Ionicons':
            default:
                return Ionicons;
        }
    };

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [height * 0.4, 0],
    });

    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.menuContainer,
                                {
                                    transform: [{ translateY }],
                                },
                            ]}
                        >
                            {/* Drag Handle */}
                            <View style={styles.dragHandleContainer}>
                                <View style={styles.dragHandle} />
                            </View>

                            {/* Header */}
                            <View style={styles.menuHeader}>
                                <LinearGradient
                                    colors={['#8B5CF6', '#EC4899']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.headerGradient}
                                >
                                    <Text style={styles.menuTitle}>{title}</Text>
                                </LinearGradient>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Menu Options */}
                            <View style={styles.optionsContainer}>
                                {options.map((option, index) => {
                                    const IconComponent = getIconComponent(option.iconType);
                                    const isDestructive = option.destructive || false;

                                    return (
                                        <TouchableOpacity
                                            key={option.id}
                                            style={[
                                                styles.optionItem,
                                                index === options.length - 1 && styles.lastOptionItem,
                                            ]}
                                            onPress={() => {
                                                option.onPress();
                                                onClose();
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.optionLeft}>
                                                <View style={[
                                                    styles.optionIconContainer,
                                                    isDestructive && styles.destructiveIconContainer,
                                                ]}>
                                                    <IconComponent
                                                        name={option.icon}
                                                        size={22}
                                                        color={isDestructive ? '#EF4444' : '#8B5CF6'}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.optionText,
                                                    isDestructive && styles.destructiveText,
                                                ]}>
                                                    {option.title}
                                                </Text>
                                            </View>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color="#D1D5DB"
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Cancel Button */}
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <LinearGradient
                                    colors={['#F3F4F6', '#E5E7EB']}
                                    style={styles.cancelGradient}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: height * 0.75,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerGradient: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    lastOptionItem: {
        borderBottomWidth: 0,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    destructiveIconContainer: {
        backgroundColor: '#FEE2E2',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    destructiveText: {
        color: '#EF4444',
    },
    cancelButton: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    cancelGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
});