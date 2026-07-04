import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    Clipboard,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

interface ShareModalProps {
    visible: boolean;
    onClose: () => void;
    postToShare: any;
    handleShareToApp: () => void;
}

export default function ShareModal({
    visible,
    onClose,
    postToShare,
    handleShareToApp,
}: ShareModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={90} style={styles.shareModalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.shareModalOverlay} />
                </TouchableWithoutFeedback>

                <View style={styles.shareModalContent}>
                    <View style={styles.shareModalHeader}>
                        <Text style={styles.shareModalTitle}>Share Post</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {postToShare && (
                        <View style={styles.sharePreview}>
                            <Image
                                source={{ uri: API_URL + "/" + postToShare.image }}
                                style={styles.sharePreviewImage}
                            />
                            <View style={styles.sharePreviewInfo}>
                                <View style={styles.sharePreviewUser}>
                                    <Image
                                        source={{
                                            uri: postToShare.user?.profilePicture
                                                ? API_URL + "/" + postToShare.user.profilePicture
                                                : `https://ui-avatars.com/api/?name=${postToShare.user?.username}&background=8B5CF6&color=fff`
                                        }}
                                        style={styles.sharePreviewAvatar}
                                    />
                                    <Text style={styles.sharePreviewUsername}>{postToShare.user?.username}</Text>
                                </View>
                                <Text style={styles.sharePreviewCaption} numberOfLines={2}>
                                    {postToShare.caption || 'No caption'}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.shareOptions}>
                        <TouchableOpacity style={styles.shareOption} onPress={handleShareToApp}>
                            <LinearGradient
                                colors={['#8B5CF6', '#EC4899']}
                                style={styles.shareOptionIcon}
                            >
                                <Ionicons name="share-outline" size={24} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.shareOptionText}>Share to...</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.shareOption}
                            onPress={() => {
                                Clipboard.setString(`${BASE_URL}/post/${postToShare?._id}`);
                                Toast.show({
                                    type: 'success',
                                    text1: 'Link Copied!',
                                    text2: 'Post link copied to clipboard',
                                });
                                onClose();
                            }}
                        >
                            <View style={[styles.shareOptionIcon, { backgroundColor: '#F3F4F6' }]}>
                                <Ionicons name="link-outline" size={24} color="#8B5CF6" />
                            </View>
                            <Text style={styles.shareOptionText}>Copy Link</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.shareOption}
                            onPress={() => {
                                Toast.show({
                                    type: 'info',
                                    text1: 'Saving...',
                                    text2: 'Image download started',
                                });
                            }}
                        >
                            <View style={[styles.shareOptionIcon, { backgroundColor: '#F3F4F6' }]}>
                                <Ionicons name="download-outline" size={24} color="#8B5CF6" />
                            </View>
                            <Text style={styles.shareOptionText}>Save Image</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    shareModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    shareModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    shareModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    shareModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    sharePreview: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        gap: 12,
    },
    sharePreviewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    sharePreviewInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    sharePreviewUser: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    sharePreviewAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    sharePreviewUsername: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    sharePreviewCaption: {
        fontSize: 13,
        color: '#8E8E93',
        lineHeight: 18,
    },
    shareOptions: {
        gap: 12,
    },
    shareOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        gap: 12,
    },
    shareOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareOptionText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
});