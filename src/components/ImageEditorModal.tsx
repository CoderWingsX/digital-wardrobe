import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_MIN_SIZE = 80;
const CORNER_SIZE = 44;

type Props = {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
  aspectRatio?: number;
};

type ImageInfo = {
  originalWidth: number;
  originalHeight: number;
  displayWidth: number;
  displayHeight: number;
  imageX: number;
  imageY: number;
};

export default function ImageEditorModal({
  visible,
  imageUri,
  onCancel,
  onDone,
  aspectRatio,
}: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  
  // Crop box shared values for smooth animations
  const cropX = useSharedValue(50);
  const cropY = useSharedValue(100);
  const cropWidth = useSharedValue(200);
  const cropHeight = useSharedValue(200);
  
  // For tracking gesture start positions
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const startHeight = useSharedValue(0);

  // Load image and calculate dimensions
  useEffect(() => {
    if (visible && imageUri) {
      setLoading(true);
      Image.getSize(
        imageUri,
        (width, height) => {
          const containerWidth = SCREEN_WIDTH;
          const containerHeight = SCREEN_HEIGHT - 180;
          
          const imageAspect = width / height;
          const containerAspect = containerWidth / containerHeight;
          
          let displayWidth: number, displayHeight: number;
          if (imageAspect > containerAspect) {
            displayWidth = containerWidth;
            displayHeight = containerWidth / imageAspect;
          } else {
            displayHeight = containerHeight;
            displayWidth = containerHeight * imageAspect;
          }
          
          const imageX = (containerWidth - displayWidth) / 2;
          const imageY = (containerHeight - displayHeight) / 2;
          
          setImageInfo({
            originalWidth: width,
            originalHeight: height,
            displayWidth,
            displayHeight,
            imageX,
            imageY,
          });
          
          // Initialize crop box
          const initialSize = Math.min(displayWidth, displayHeight) * 0.75;
          const boxWidth = aspectRatio ? initialSize : initialSize;
          const boxHeight = aspectRatio ? initialSize / aspectRatio : initialSize;
          
          cropX.value = imageX + (displayWidth - boxWidth) / 2;
          cropY.value = imageY + (displayHeight - boxHeight) / 2;
          cropWidth.value = boxWidth;
          cropHeight.value = boxHeight;
          
          setLoading(false);
        },
        (error) => {
          console.error('Failed to get image size:', error);
          setLoading(false);
        }
      );
    }
  }, [visible, imageUri, aspectRatio]);

  // Constrain crop box to image bounds
  const constrain = useCallback((x: number, y: number, w: number, h: number) => {
    if (!imageInfo) return { x, y, w, h };
    
    const { imageX, imageY, displayWidth, displayHeight } = imageInfo;
    
    let newW = Math.max(CROP_MIN_SIZE, Math.min(w, displayWidth));
    let newH = Math.max(CROP_MIN_SIZE, Math.min(h, displayHeight));
    let newX = Math.max(imageX, Math.min(x, imageX + displayWidth - newW));
    let newY = Math.max(imageY, Math.min(y, imageY + displayHeight - newH));
    
    return { x: newX, y: newY, w: newW, h: newH };
  }, [imageInfo]);

  // Drag gesture for moving the entire crop box
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = cropX.value;
      startY.value = cropY.value;
    })
    .onUpdate((e) => {
      if (!imageInfo) return;
      const { imageX, imageY, displayWidth, displayHeight } = imageInfo;
      
      let newX = startX.value + e.translationX;
      let newY = startY.value + e.translationY;
      
      // Constrain to image bounds
      newX = Math.max(imageX, Math.min(newX, imageX + displayWidth - cropWidth.value));
      newY = Math.max(imageY, Math.min(newY, imageY + displayHeight - cropHeight.value));
      
      cropX.value = newX;
      cropY.value = newY;
    });

  // Corner resize gestures
  const createCornerGesture = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    return Gesture.Pan()
      .onStart(() => {
        startX.value = cropX.value;
        startY.value = cropY.value;
        startWidth.value = cropWidth.value;
        startHeight.value = cropHeight.value;
      })
      .onUpdate((e) => {
        if (!imageInfo) return;
        const { imageX, imageY, displayWidth, displayHeight } = imageInfo;
        
        let newX = startX.value;
        let newY = startY.value;
        let newW = startWidth.value;
        let newH = startHeight.value;
        
        if (corner === 'br') {
          newW = startWidth.value + e.translationX;
          newH = aspectRatio ? newW / aspectRatio : startHeight.value + e.translationY;
        } else if (corner === 'bl') {
          newW = startWidth.value - e.translationX;
          newX = startX.value + e.translationX;
          newH = aspectRatio ? newW / aspectRatio : startHeight.value + e.translationY;
        } else if (corner === 'tr') {
          newW = startWidth.value + e.translationX;
          newH = aspectRatio ? newW / aspectRatio : startHeight.value - e.translationY;
          if (!aspectRatio) newY = startY.value + e.translationY;
          else newY = startY.value + startHeight.value - newH;
        } else if (corner === 'tl') {
          newW = startWidth.value - e.translationX;
          newX = startX.value + e.translationX;
          newH = aspectRatio ? newW / aspectRatio : startHeight.value - e.translationY;
          if (!aspectRatio) newY = startY.value + e.translationY;
          else newY = startY.value + startHeight.value - newH;
        }
        
        // Enforce minimum size
        if (newW < CROP_MIN_SIZE) {
          if (corner === 'tl' || corner === 'bl') {
            newX = startX.value + startWidth.value - CROP_MIN_SIZE;
          }
          newW = CROP_MIN_SIZE;
          if (aspectRatio) newH = CROP_MIN_SIZE / aspectRatio;
        }
        if (newH < CROP_MIN_SIZE) {
          if (corner === 'tl' || corner === 'tr') {
            newY = startY.value + startHeight.value - CROP_MIN_SIZE;
          }
          newH = CROP_MIN_SIZE;
        }
        
        // Constrain to bounds
        newX = Math.max(imageX, Math.min(newX, imageX + displayWidth - CROP_MIN_SIZE));
        newY = Math.max(imageY, Math.min(newY, imageY + displayHeight - CROP_MIN_SIZE));
        if (newX + newW > imageX + displayWidth) newW = imageX + displayWidth - newX;
        if (newY + newH > imageY + displayHeight) newH = imageY + displayHeight - newY;
        
        cropX.value = newX;
        cropY.value = newY;
        cropWidth.value = newW;
        cropHeight.value = newH;
      });
  };

  const tlGesture = createCornerGesture('tl');
  const trGesture = createCornerGesture('tr');
  const blGesture = createCornerGesture('bl');
  const brGesture = createCornerGesture('br');

  // Animated styles
  const cropBoxStyle = useAnimatedStyle(() => ({
    left: cropX.value,
    top: cropY.value,
    width: cropWidth.value,
    height: cropHeight.value,
  }));

  const overlayTopStyle = useAnimatedStyle(() => ({
    height: cropY.value,
  }));

  const overlayBottomStyle = useAnimatedStyle(() => ({
    top: cropY.value + cropHeight.value,
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    width: cropX.value,
    height: cropHeight.value,
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    top: cropY.value,
    left: cropX.value + cropWidth.value,
    height: cropHeight.value,
  }));

  const handleDone = async () => {
    if (!imageInfo) return;
    
    setSaving(true);
    try {
      const scaleX = imageInfo.originalWidth / imageInfo.displayWidth;
      const scaleY = imageInfo.originalHeight / imageInfo.displayHeight;
      
      const originX = (cropX.value - imageInfo.imageX) * scaleX;
      const originY = (cropY.value - imageInfo.imageY) * scaleY;
      const width = cropWidth.value * scaleX;
      const height = cropHeight.value * scaleY;
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{
          crop: {
            originX: Math.max(0, Math.round(originX)),
            originY: Math.max(0, Math.round(originY)),
            width: Math.round(width),
            height: Math.round(height),
          },
        }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      onDone(result.uri);
    } catch (error) {
      console.error('Failed to crop:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Crop</Text>
            
            <TouchableOpacity onPress={handleDone} style={styles.headerButton} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="checkmark" size={28} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Image Area */}
          <View style={styles.imageArea}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : imageInfo && (
              <>
                {/* Image */}
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    position: 'absolute',
                    left: imageInfo.imageX,
                    top: imageInfo.imageY,
                    width: imageInfo.displayWidth,
                    height: imageInfo.displayHeight,
                  }}
                  resizeMode="contain"
                />

                {/* Dark overlays */}
                <Animated.View style={[styles.overlay, styles.overlayTop, overlayTopStyle]} />
                <Animated.View style={[styles.overlay, styles.overlayBottom, overlayBottomStyle]} />
                <Animated.View style={[styles.overlay, styles.overlayLeft, overlayLeftStyle]} />
                <Animated.View style={[styles.overlay, styles.overlayRight, overlayRightStyle]} />

                {/* Crop Box */}
                <GestureDetector gesture={dragGesture}>
                  <Animated.View style={[styles.cropBox, cropBoxStyle, { borderColor: '#fff' }]}>
                    {/* Grid */}
                    <View style={[styles.gridH, { top: '33.33%' }]} />
                    <View style={[styles.gridH, { top: '66.66%' }]} />
                    <View style={[styles.gridV, { left: '33.33%' }]} />
                    <View style={[styles.gridV, { left: '66.66%' }]} />
                  </Animated.View>
                </GestureDetector>

                {/* Corner handles - positioned absolutely */}
                <GestureDetector gesture={tlGesture}>
                  <Animated.View style={[styles.corner, styles.cornerTL, useAnimatedStyle(() => ({
                    left: cropX.value - CORNER_SIZE / 2,
                    top: cropY.value - CORNER_SIZE / 2,
                  }))]} />
                </GestureDetector>
                
                <GestureDetector gesture={trGesture}>
                  <Animated.View style={[styles.corner, styles.cornerTR, useAnimatedStyle(() => ({
                    left: cropX.value + cropWidth.value - CORNER_SIZE / 2,
                    top: cropY.value - CORNER_SIZE / 2,
                  }))]} />
                </GestureDetector>
                
                <GestureDetector gesture={blGesture}>
                  <Animated.View style={[styles.corner, styles.cornerBL, useAnimatedStyle(() => ({
                    left: cropX.value - CORNER_SIZE / 2,
                    top: cropY.value + cropHeight.value - CORNER_SIZE / 2,
                  }))]} />
                </GestureDetector>
                
                <GestureDetector gesture={brGesture}>
                  <Animated.View style={[styles.corner, styles.cornerBR, useAnimatedStyle(() => ({
                    left: cropX.value + cropWidth.value - CORNER_SIZE / 2,
                    top: cropY.value + cropHeight.value - CORNER_SIZE / 2,
                  }))]} />
                </GestureDetector>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.hint}>Drag to move • Drag corners to resize</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageArea: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTop: {
    top: 0,
    left: 0,
    right: 0,
  },
  overlayBottom: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayLeft: {
    left: 0,
  },
  overlayRight: {
    right: 0,
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    backgroundColor: 'transparent',
  },
  cornerTL: {
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerTR: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  cornerBL: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerBR: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    height: 56,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});
