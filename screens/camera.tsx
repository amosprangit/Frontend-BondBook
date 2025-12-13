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
import { Entypo, Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useCreatePostMutation } from '../store/api/postsApi';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

interface Filter {
  id: string;
  name: string;
  value: string;
}

export default function CameraScreen() {
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  
  // Publish modal state
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();

  const filters: Filter[] = [
    { id: 'normal', name: 'Normal', value: 'none' },
    { id: 'sepia', name: 'Sepia', value: 'sepia(1)' },
    { id: 'grayscale', name: 'Grayscale', value: 'grayscale(1)' },
    { id: 'blur', name: 'Blur', value: 'blur(2px)' },
    { id: 'brightness', name: 'Bright', value: 'brightness(1.5)' },
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
        // Works for both front and back camera
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false, // Ensure image processing for both cameras
        });
        
        if (photo?.uri) {
          // Store captured image (works for both front and back camera)
          setCapturedImages(prev => [photo.uri, ...prev.slice(0, 4)]); // Keep only last 5 images
          
          // Save to media library (works for both cameras)
          if (mediaLibraryPermission?.granted) {
            try {
              await MediaLibrary.saveToLibraryAsync(photo.uri);
            } catch (saveError) {
              console.warn('Failed to save to media library:', saveError);
              // Continue even if save fails
            }
          }
          
          // Show publish modal with the captured image (front or back camera)
          setSelectedImage(photo.uri);
          setPublishModalVisible(true);
        } else {
          Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Error taking picture:', error);
      }
    } else {
      if (!isCameraReady) {
        Alert.alert('Camera Not Ready', 'Please wait for the camera to be ready');
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
      // Create FormData - works for both front and back camera images
      const formData = new FormData();
      
      // Image URI from takePictureAsync is already properly formatted for both cameras
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: `post_${Date.now()}.jpg`, // Unique filename
      } as any);
      formData.append('caption', caption || '');

      // Create post (works identically for front and back camera photos)
      const response = await createPost(formData).unwrap();
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Post published successfully!',
        });
        // Close modal and reset
        setPublishModalVisible(false);
        setSelectedImage(null);
        setCaption('');
        // Optionally clear captured images or keep them for reference
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
    setIsCameraReady(false); // Reset camera ready state when switching
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.topLeft}>
          <TouchableOpacity 
            style={styles.rotateButton}
            onPress={toggleCameraFacing}
          >
            <View style={styles.rotateIconContainer}>
              <Entypo name="cycle" size={20} color="#E91E63" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.topRight}>
          <View style={styles.abIndicatorContainer}>
            <Text style={[styles.abIndicator, cameraFacing === 'front' && styles.abIndicatorActive]}>
              F
            </Text>
            <Text style={[styles.abIndicator, cameraFacing === 'back' && styles.abIndicatorActive]}>
              B
            </Text>
          </View>
        </View>
      </View>

      {/* Main Camera Area */}
      <View style={styles.cameraArea}>
        {permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraFacing}
              onCameraReady={handleCameraReady}
            >
              {/* Camera Overlay */}
              
              <View style={styles.cameraOverlay}>
                {/* Filter Overlay */}
                <View style={[styles.filterOverlay, { filter: filters.find(f => f.id === selectedFilter)?.value }]} />
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Camera permission required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Camera Controls */}
      <View style={styles.cameraControls}>
        {/* Captured Images Gallery */}
        <View style={styles.capturedImagesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.capturedImagesScroll}
          >
            {capturedImages.length > 0 ? (
              capturedImages.map((imageUri, index) => (
                <TouchableOpacity key={index} style={styles.capturedImageThumbnail}>
                  <Image source={{ uri: imageUri }} style={styles.capturedImage} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.placeholderThumbnail}>
                <Text style={styles.placeholderText}>No photos</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Shutter Button */}
        <TouchableOpacity 
          style={styles.shutterButton} 
          onPress={takePicture}
          disabled={!isCameraReady}
        >
          <View style={styles.shutterOuter}>
            <View style={styles.shutterInner} />
          </View>
        </TouchableOpacity>

        {/* Photo Thumbnails */}
        <View style={styles.photoThumbnails}>
          <TouchableOpacity style={styles.smallThumbnail}>
            <View style={styles.smallThumbnailImage}>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallThumbnail}>
            <View style={styles.smallThumbnailImage}>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Publish Modal */}
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
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.publishModalTitle}>Publish Post</Text>
              <TouchableOpacity 
                onPress={handlePublish}
                disabled={isCreatingPost || !selectedImage}
                style={[
                  styles.publishButton,
                  (isCreatingPost || !selectedImage) && styles.publishButtonDisabled
                ]}
              >
                {isCreatingPost ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.publishButtonText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>

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
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor="#9CA3AF"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.captionLength}>{caption.length}/500</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  topLeft: {
    flex: 1,
  },
  topRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rotateButton: {
    padding: 8,
  },
  rotateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  abIndicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  abIndicator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
  },
  abIndicatorActive: {
    color: '#E91E63',
  },
  cameraArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    position: 'relative',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
  },
  permissionText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterButtonsContainer: {
    paddingVertical: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFilterButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  capturedImagesContainer: {
    flex: 1,
    maxWidth: 120,
  },
  capturedImagesScroll: {
    paddingRight: 10,
  },
  capturedImageThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 10,
  },
  photoThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 20,
  },
  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  photoThumbnails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  smallThumbnailImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallThumbnailEmoji: {
    fontSize: 16,
  },
  // Publish Modal Styles
  publishModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  publishModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  publishModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  publishModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  publishButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishImageContainer: {
    width: '100%',
    height: 300,
    marginTop: 10,
  },
  publishImage: {
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  captionInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9FAFB',
  },
  captionLength: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 5,
  },
});
