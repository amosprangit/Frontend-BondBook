import React from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FormInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    required?: boolean;
    icon?: string;
    iconType?: 'Ionicons' | 'Feather' | 'MaterialIcons';
}

export default function FormInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    numberOfLines = 1,
    maxLength,
    required = false,
    icon,
    iconType = 'Ionicons',
}: FormInputProps) {
    const IconComponent = iconType === 'Ionicons' ? Ionicons : require('@expo/vector-icons').Feather;

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.requiredStar}> *</Text>}
                </Text>
                {maxLength && (
                    <Text style={styles.charCount}>
                        {value.length}/{maxLength}
                    </Text>
                )}
            </View>
            <View style={[styles.inputWrapper, multiline && styles.textAreaWrapper]}>
                {icon && (
                    <IconComponent name={icon} size={20} color="#8B5CF6" style={styles.icon} />
                )}
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.textArea,
                        icon && styles.inputWithIcon,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChangeText}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    maxLength={maxLength}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    requiredStar: {
        color: '#EF4444',
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        minHeight: 48,
    },
    textAreaWrapper: {
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        paddingVertical: 12,
        paddingHorizontal: 0,
    },
    inputWithIcon: {
        paddingLeft: 0,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingVertical: 0,
    },
});