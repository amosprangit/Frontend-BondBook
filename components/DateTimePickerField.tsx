import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateTimePickerFieldProps {
    label: string;
    value: string;
    onPress: () => void;
    showPicker: boolean;
    onDateChange: (event: any, selectedDate?: Date) => void;
    dateObject: Date;
    mode: 'date' | 'time';
    icon: string;
    placeholder: string;
    helperText: string;
    required?: boolean;
}

export default function DateTimePickerField({
    label,
    value,
    onPress,
    showPicker,
    onDateChange,
    dateObject,
    mode,
    icon,
    placeholder,
    helperText,
    required = false,
}: DateTimePickerFieldProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.pickerButton}
            >
                <View style={styles.inputWrapper}>
                    <Ionicons name={icon} size={20} color="#8B5CF6" style={styles.icon} />
                    <Text style={[styles.valueText, !value && styles.placeholder]}>
                        {value || placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </View>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={dateObject}
                    mode={mode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    minimumDate={mode === 'date' ? new Date() : undefined}
                    is24Hour={false}
                />
            )}
            <Text style={styles.helperText}>{helperText}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    requiredStar: {
        color: '#EF4444',
    },
    pickerButton: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    icon: {
        marginRight: 10,
    },
    valueText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    placeholder: {
        color: '#9CA3AF',
    },
    helperText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
        fontStyle: 'italic',
    },
});