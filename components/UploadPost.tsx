import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    SafeAreaView,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { useCreatePostMutation } from '../store/api/postsApi';
import { useGetProfileQuery } from '../store/api/authApi';

export default function UploadPost({ route, navigation }: any) {
    const { imageUri } = route.params;
    const [caption, setCaption] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const [createPost, { isLoading }] = useCreatePostMutation();
    const { data: profileData } = useGetProfileQuery();
    const user = profileData?.user || profileData;

    // Helper: Get actual file size using blob
    const getFileSizeMB = async (uri: string): Promise<number> => {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size / (1024 * 1024);
    };

    // Aggressive compression - resize AND compress
    const compressImageAggressively = async (uri: string): Promise<string> => {
        let currentUri = uri;
        let currentSizeMB = await getFileSizeMB(currentUri);

        console.log(`Original size: ${currentSizeMB.toFixed(2)} MB`);

        // If already under 500KB, return as is
        if (currentSizeMB < 0.5) {
            return currentUri;
        }

        // Try with quality reduction first (up to 3 attempts)
        for (let quality = 0.5; quality >= 0.2; quality -= 0.15) {
            const compressed = await ImageManipulator.manipulateAsync(
                currentUri,
                [],
                { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
            );

            const newSizeMB = await getFileSizeMB(compressed.uri);
            console.log(`Quality ${quality}: ${newSizeMB.toFixed(2)} MB`);

            if (newSizeMB < 0.5) {
                return compressed.uri;
            }
            currentUri = compressed.uri;
        }

        // If still too big, resize dimensions
        let dimensions = await ImageManipulator.manipulateAsync(currentUri, [], { compress: 1 });
        let width = dimensions.width;
        let height = dimensions.height;

        // Progressive dimension reduction
        const reductionRatios = [0.7, 0.5, 0.3, 0.2];

        for (const ratio of reductionRatios) {
            const resized = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ resize: { width: width * ratio, height: height * ratio } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const newSizeMB = await getFileSizeMB(resized.uri);
            console.log(`Resized ${ratio * 100}%: ${newSizeMB.toFixed(2)} MB`);

            if (newSizeMB < 0.5) {
                return resized.uri;
            }
        }

        // Last resort: smallest possible
        const finalResized = await ImageManipulator.manipulateAsync(
            currentUri,
            [{ resize: { width: 480, height: 480 } }],
            { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
        );

        return finalResized.uri;
    };

    const handleShare = async () => {
        if (!imageUri) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No image selected' });
            return;
        }

        setIsCompressing(true);

        try {
            // Aggressively compress the image
            const compressedUri = await compressImageAggressively(imageUri);
            const finalSizeMB = await getFileSizeMB(compressedUri);

            console.log(`Final size: ${finalSizeMB.toFixed(2)} MB`);

            if (finalSizeMB > 0.8) {
                Toast.show({
                    type: 'warning',
                    text1: 'Image Still Too Large',
                    text2: 'Please choose a smaller image (max 800KB)',
                    visibilityTime: 3000,
                });
                setIsCompressing(false);
                return;
            }

            // Get file extension
            const fileExtension = compressedUri.split('.').pop() || 'jpg';

            const formData = new FormData();
            formData.append('image', {
                uri: compressedUri,
                type: 'image/jpeg',
                name: `post_${Date.now()}.${fileExtension}`,
            } as any);
            formData.append('caption', caption || '');

            const response = await createPost(formData).unwrap();

            Toast.show({
                type: 'success',
                text1: 'Success!',
                text2: 'Your post has been uploaded',
                visibilityTime: 2000,
            });

            setTimeout(() => {
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }, 1500);

        } catch (error: any) {
            console.log("Upload Error:", error);

            if (error?.originalStatus === 413) {
                Toast.show({
                    type: 'error',
                    text1: 'Server Limit Reached',
                    text2: 'The server is configured with a low file size limit. Please contact support.',
                    visibilityTime: 5000,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Upload Failed',
                    text2: error?.data?.message || 'Something went wrong',
                    visibilityTime: 3000,
                });
            }
        } finally {
            setIsCompressing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header - Stays fixed */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Post</Text>
                    <TouchableOpacity
                        style={[styles.shareButton, (isLoading || isCompressing) && styles.shareButtonDisabled]}
                        onPress={handleShare}
                        disabled={isLoading || isCompressing}
                    >
                        <LinearGradient
                            colors={(isLoading || isCompressing) ? ['#D1D5DB', '#D1D5DB'] : ['#8B5CF6', '#EC4899']}
                            style={styles.shareGradient}
                        >
                            {(isCompressing || isLoading) ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.shareText}>Share</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ✅ SingleChildScrollView equivalent - Scrollable content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                    bounces={true}
                    overScrollMode="always"
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.scrollInnerContent}>
                            {/* Image Container */}
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                                {(isCompressing || isLoading) && (
                                    <View style={styles.uploadOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                        <Text style={styles.uploadText}>
                                            {isCompressing ? 'Compressing image...' : 'Uploading...'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Caption Section */}
                            <View style={styles.captionSection}>
                                <View style={styles.avatarContainer}>
                                    {user?.profilePicture ? (
                                        <Image
                                            source={{ uri: `https://bondbook.cloud/${user.profilePicture}` }}
                                            style={styles.avatar}
                                        />
                                    ) : (
                                        <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.avatarGradient}>
                                            <Text style={styles.avatarText}>
                                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                                            </Text>
                                        </LinearGradient>
                                    )}
                                </View>
                                <View style={styles.captionWrapper}>
                                    <Text style={styles.username}>{user?.username || 'User'}</Text>
                                    <TextInput
                                        placeholder="Write a caption..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        value={caption}
                                        onChangeText={setCaption}
                                        maxLength={2200}
                                        style={styles.captionInput}
                                        editable={!isLoading && !isCompressing}
                                        textAlignVertical="top"
                                    />
                                    <Text style={styles.counter}>{caption.length}/2200</Text>
                                </View>
                            </View>

                            {/* Extra bottom padding for scrolling */}
                            <View style={styles.bottomSpacer} />
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#F0F0F0',
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#F5F5F5'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000'
    },
    shareButton: {
        overflow: 'hidden',
        borderRadius: 8
    },
    shareButtonDisabled: {
        opacity: 0.6
    },
    shareGradient: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8
    },
    shareText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600'
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    scrollInnerContent: {
        flex: 1,
    },
    imageContainer: {
        width: '100%',
        height: 350,
        backgroundColor: '#F3F4F6',
        position: 'relative'
    },
    image: {
        width: '100%',
        height: '100%'
    },
    uploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    uploadText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500'
    },
    captionSection: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        marginTop: 12,
        marginHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 12
    },
    avatarGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700'
    },
    captionWrapper: {
        flex: 1
    },
    username: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8
    },
    captionInput: {
        fontSize: 15,
        color: '#000000',
        minHeight: 80,
        padding: 0,
        lineHeight: 20,
        flex: 1,
    },
    counter: {
        textAlign: 'right',
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8
    },
    bottomSpacer: {
        height: 40,
    },
});