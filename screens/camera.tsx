import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Entypo, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useCreatePostMutation } from '../store/api/postsApi';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface Filter {
  id: string;
  name: string;
  value: string;
  icon: string;
}

export default function CameraScreen({ navigation }: any) {
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  // Publish modal state
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();

  // Hide bottom tab bar when camera screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }
      return () => {
        if (parent) {
          parent.setOptions({
            tabBarStyle: { display: 'flex' }
          });
        }
      };
    }, [navigation])
  );

  const filters: Filter[] = [
    { id: 'normal', name: 'Normal', value: 'none', icon: 'camera-alt' },
    { id: 'sepia', name: 'Sepia', value: 'sepia(1)', icon: 'wb-sunny' },
    { id: 'grayscale', name: 'Grayscale', value: 'grayscale(1)', icon: 'tonality' },
    { id: 'blur', name: 'Blur', value: 'blur(2px)', icon: 'blur-on' },
    { id: 'brightness', name: 'Bright', value: 'brightness(1.5)', icon: 'brightness-5' },
  ];

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (!mediaLibraryPermission?.granted) {
      requestMediaLibraryPermission();
    }
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });

        if (photo?.uri) {
          setCapturedImages(prev => [photo.uri, ...prev.slice(0, 4)]);

          if (mediaLibraryPermission?.granted) {
            try {
              await MediaLibrary.saveToLibraryAsync(photo.uri);
            } catch (saveError) {
              console.warn('Failed to save to media library:', saveError);
            }
          }

          setSelectedImage(photo.uri);
          setPublishModalVisible(true);
        } else {
          Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Error taking picture:', error);
      }
    }
  };

  const handlePublish = async () => {
    if (!selectedImage) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No image selected',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: `post_${Date.now()}.jpg`,
      } as any);
      formData.append('caption', caption || '');

      const response = await createPost(formData).unwrap();

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Post published successfully!',
        });
        setPublishModalVisible(false);
        setSelectedImage(null);
        setCaption('');
        // Navigate back to home feed
        navigation.navigate('Home' as never);
      }
    } catch (error: any) {
      console.error('Publish post error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || error?.message || 'Failed to publish post',
      });
    }
  };

  const handleClosePublishModal = () => {
    setPublishModalVisible(false);
    setSelectedImage(null);
    setCaption('');
  };

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
    setIsCameraReady(false);
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash-on';
      case 'auto': return 'flash-auto';
      default: return 'flash-off';
    }
  };

  const goToGallery = () => {
    // Navigate to gallery screen or open image picker
    Alert.alert('Coming Soon', 'Gallery feature will be available soon');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Camera View */}
      <View style={styles.cameraWrapper}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            flash={flashMode}
            onCameraReady={handleCameraReady}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.topBarRight}>
                <TouchableOpacity
                  style={styles.topBarButton}
                  onPress={toggleFlash}
                >
                  <MaterialIcons name={getFlashIcon()} size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.topBarButton}
                  onPress={toggleCameraFacing}
                >
                  <MaterialIcons name="flip-camera-ios" size={26} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters Bar */}
            <View style={styles.filtersBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
              >
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.id && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    <MaterialIcons
                      name={filter.icon as any}
                      size={20}
                      color={selectedFilter === filter.id ? "#ffffff" : "#999999"}
                    />
                    <Text style={[
                      styles.filterButtonText,
                      selectedFilter === filter.id && styles.filterButtonTextActive
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={goToGallery}
              >
                {capturedImages.length > 0 ? (
                  <Image
                    source={{ uri: capturedImages[0] }}
                    style={styles.galleryThumbnail}
                  />
                ) : (
                  <View style={styles.galleryPlaceholder}>
                    <MaterialIcons name="photo-library" size={24} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shutterButton}
                onPress={takePicture}
                disabled={!isCameraReady}
              >
                <View style={styles.shutterOuter}>
                  <View style={styles.shutterInner} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.effectsButton}>
                <MaterialIcons name="filter" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View style={styles.permissionContainer}>
            <MaterialIcons name="camera-alt" size={60} color="#999999" />
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Publish Modal - Instagram Style */}
      <Modal
        visible={publishModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClosePublishModal}
      >
        <View style={styles.publishModalContainer}>
          <View style={styles.publishModalContent}>
            {/* Header */}
            <View style={styles.publishModalHeader}>
              <TouchableOpacity onPress={handleClosePublishModal}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.publishModalTitle}>New Post</Text>
              <TouchableOpacity
                onPress={handlePublish}
                disabled={isCreatingPost || !selectedImage}
              >
                {isCreatingPost ? (
                  <ActivityIndicator size="small" color="#0095F6" />
                ) : (
                  <Text style={styles.shareText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.publishContent}>
              {/* Image Preview */}
              {selectedImage && (
                <View style={styles.publishImageContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.publishImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Caption Input */}
              <View style={styles.captionContainer}>
                <View style={styles.userInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.username}>your_username</Text>
                </View>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor="#8E8E93"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={2200}
                  textAlignVertical="top"
                />
                <Text style={styles.captionLength}>{caption.length}/2200</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 16,
  },
  filtersBar: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0095F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 30,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryThumbnail: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  effectsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    gap: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 10,
  },
  permissionButton: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Publish Modal Styles - Instagram Style
  publishModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  publishModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '90%',
  },
  publishModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  cancelText: {
    fontSize: 16,
    color: '#000000',
  },
  publishModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095F6',
  },
  publishContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  publishImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  publishImage: {
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  captionInput: {
    fontSize: 14,
    color: '#000000',
    minHeight: 80,
    padding: 0,
    textAlignVertical: 'top',
  },
  captionLength: {
    fontSize: 11,
    color: '#C7C7CC',
    textAlign: 'right',
    marginTop: 4,
  },
});