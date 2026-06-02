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
  Platform,
} from 'react-native';
import { Entypo, Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const IS_IPHONE_NOTCH = Platform.OS === 'ios' && height >= 812;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? (IS_IPHONE_NOTCH ? 44 : 20) : StatusBar.currentHeight || 0;

interface Filter {
  id: string;
  name: string;
  value: string;
  icon: string;
}

export default function CameraScreen({ navigation }: any) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

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
          navigation.navigate('UploadPost', {
            imageUri: photo.uri,
          });
        } else {
          Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Error taking picture:', error);
      }
    }
  };

  const goBack = () => {
    navigation.goBack();
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

  const goToGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      navigation.navigate('GalleryPicker');
    } else {
      Alert.alert('Permission Required', 'Please allow access to your media library');
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <MaterialIcons name="camera-alt" size={60} color="#8B5CF6" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            Muse needs camera access to let you capture and share moments with your friends
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              style={styles.permissionGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionLaterButton} onPress={goBack}>
            <Text style={styles.permissionLaterText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cameraFacing}
        flash={flashMode}
        onCameraReady={handleCameraReady}
        responsiveOrientationWhenOrientationLocked
      />

      {/* Gradient Overlay for better visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Top Bar */}
      <SafeAreaView style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <View style={styles.buttonBackground}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={toggleFlash}
              activeOpacity={0.7}
            >
              <View style={styles.buttonBackground}>
                <MaterialIcons name={getFlashIcon()} size={22} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topBarButton}
              onPress={toggleCameraFacing}
              activeOpacity={0.7}
            >
              <View style={styles.buttonBackground}>
                <MaterialIcons name="flip-camera-ios" size={24} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Bar */}
      <SafeAreaView style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={goToGallery}
            activeOpacity={0.7}
          >
            <View style={styles.galleryInner}>
              {capturedImages.length > 0 ? (
                <Image
                  source={{ uri: capturedImages[capturedImages.length - 1] }}
                  style={styles.galleryThumbnail}
                />
              ) : (
                <Feather name="image" size={24} color="#ffffff" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterButton}
            onPress={takePicture}
            disabled={!isCameraReady}
            activeOpacity={0.8}
          >
            <View style={styles.shutterOuter}>
              <View style={styles.shutterInner} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.effectsButton}
            activeOpacity={0.7}
          >
            <View style={styles.buttonBackground}>
              <MaterialIcons name="filter" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.02,
  },
  topBarButton: {
    marginHorizontal: 4,
    marginVertical:18,
  },
  buttonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    // backdropFilter: 'blur(10px)',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: width * 0.04,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.02,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: width * 0.18,
    height: width * 0.18,
    maxWidth: 80,
    maxHeight: 80,
    minWidth: 60,
    minHeight: 60,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterInner: {
    width: '80%',
    height: '80%',
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  effectsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.08,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  permissionGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionLaterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionLaterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
});