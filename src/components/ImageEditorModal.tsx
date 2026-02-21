import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_MIN_SIZE = 50;

type Props = {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
  aspectRatio?: number; // width/height, undefined = free
};

type ImageDimensions = {
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
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
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  
  // Crop box state (in display coordinates)
  const [cropBox, setCropBox] = useState({ x: 50, y: 100, width: 200, height: 200 });
  const cropBoxRef = useRef(cropBox);
  cropBoxRef.current = cropBox;

  // Load image dimensions
  useEffect(() => {
    if (visible && imageUri) {
      setLoading(true);
      Image.getSize(
        imageUri,
        (width, height) => {
          // Calculate display size to fit in container
          const containerWidth = SCREEN_WIDTH - 40;
          const containerHeight = SCREEN_HEIGHT - 200;
          
          const imageAspect = width / height;
          const containerAspect = containerWidth / containerHeight;
          
          let displayWidth, displayHeight;
          if (imageAspect > containerAspect) {
            displayWidth = containerWidth;
            displayHeight = containerWidth / imageAspect;
          } else {
            displayHeight = containerHeight;
            displayWidth = containerHeight * imageAspect;
          }
          
          const offsetX = (containerWidth - displayWidth) / 2 + 20;
          const offsetY = (containerHeight - displayHeight) / 2 + 80;
          
          setImageDimensions({
            width,
            height,
            displayWidth,
            displayHeight,
            offsetX,
            offsetY,
          });
          
          // Initialize crop box to center of image
          const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
          const cropWidth = aspectRatio ? initialSize : initialSize;
          const cropHeight = aspectRatio ? initialSize / aspectRatio : initialSize;
          
          setCropBox({
            x: offsetX + (displayWidth - cropWidth) / 2,
            y: offsetY + (displayHeight - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
          });
          
          setLoading(false);
        },
        (error) => {
          console.error('Failed to load image:', error);
          setLoading(false);
        }
      );
    }
  }, [visible, imageUri, aspectRatio]);

  // Pan responder for dragging the crop box
  const boxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (!imageDimensions) return;
        
        const { dx, dy } = gesture;
        const current = cropBoxRef.current;
        
        let newX = current.x + dx;
        let newY = current.y + dy;
        
        // Constrain to image bounds
        newX = Math.max(imageDimensions.offsetX, Math.min(newX, imageDimensions.offsetX + imageDimensions.displayWidth - current.width));
        newY = Math.max(imageDimensions.offsetY, Math.min(newY, imageDimensions.offsetY + imageDimensions.displayHeight - current.height));
        
        setCropBox(prev => ({ ...prev, x: newX, y: newY }));
      },
      onPanResponderRelease: () => {
        cropBoxRef.current = cropBox;
      },
    })
  ).current;

  // Create corner pan responders
  const createCornerPanResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (!imageDimensions) return;
        
        const { dx, dy } = gesture;
        const current = cropBoxRef.current;
        
        let newBox = { ...current };
        
        if (corner === 'tl') {
          newBox.x = current.x + dx;
          newBox.y = current.y + dy;
          newBox.width = current.width - dx;
          newBox.height = aspectRatio ? newBox.width / aspectRatio : current.height - dy;
          if (aspectRatio) {
            newBox.y = current.y + current.height - newBox.height;
          }
        } else if (corner === 'tr') {
          newBox.y = current.y + dy;
          newBox.width = current.width + dx;
          newBox.height = aspectRatio ? newBox.width / aspectRatio : current.height - dy;
          if (aspectRatio) {
            newBox.y = current.y + current.height - newBox.height;
          }
        } else if (corner === 'bl') {
          newBox.x = current.x + dx;
          newBox.width = current.width - dx;
          newBox.height = aspectRatio ? newBox.width / aspectRatio : current.height + dy;
        } else if (corner === 'br') {
          newBox.width = current.width + dx;
          newBox.height = aspectRatio ? newBox.width / aspectRatio : current.height + dy;
        }
        
        // Enforce minimum size
        if (newBox.width < CROP_MIN_SIZE) {
          newBox.width = CROP_MIN_SIZE;
          if (corner === 'tl' || corner === 'bl') {
            newBox.x = current.x + current.width - CROP_MIN_SIZE;
          }
        }
        if (newBox.height < CROP_MIN_SIZE) {
          newBox.height = CROP_MIN_SIZE;
          if (corner === 'tl' || corner === 'tr') {
            newBox.y = current.y + current.height - CROP_MIN_SIZE;
          }
        }
        
        // Constrain to image bounds
        newBox.x = Math.max(imageDimensions.offsetX, newBox.x);
        newBox.y = Math.max(imageDimensions.offsetY, newBox.y);
        if (newBox.x + newBox.width > imageDimensions.offsetX + imageDimensions.displayWidth) {
          newBox.width = imageDimensions.offsetX + imageDimensions.displayWidth - newBox.x;
        }
        if (newBox.y + newBox.height > imageDimensions.offsetY + imageDimensions.displayHeight) {
          newBox.height = imageDimensions.offsetY + imageDimensions.displayHeight - newBox.y;
        }
        
        setCropBox(newBox);
        cropBoxRef.current = newBox;
      },
    });
  };

  const cornerPanResponders = useRef({
    tl: createCornerPanResponder('tl'),
    tr: createCornerPanResponder('tr'),
    bl: createCornerPanResponder('bl'),
    br: createCornerPanResponder('br'),
  }).current;

  const handleDone = async () => {
    if (!imageDimensions) return;
    
    setSaving(true);
    try {
      // Convert display coordinates to original image coordinates
      const scaleX = imageDimensions.width / imageDimensions.displayWidth;
      const scaleY = imageDimensions.height / imageDimensions.displayHeight;
      
      const originX = (cropBox.x - imageDimensions.offsetX) * scaleX;
      const originY = (cropBox.y - imageDimensions.offsetY) * scaleY;
      const cropWidth = cropBox.width * scaleX;
      const cropHeight = cropBox.height * scaleY;
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.max(0, Math.round(originX)),
              originY: Math.max(0, Math.round(originY)),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      onDone(result.uri);
    } catch (error) {
      console.error('Failed to crop image:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderCorner = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    const positions: Record<string, any> = {
      tl: { top: -10, left: -10 },
      tr: { top: -10, right: -10 },
      bl: { bottom: -10, left: -10 },
      br: { bottom: -10, right: -10 },
    };
    
    return (
      <View
        {...cornerPanResponders[corner].panHandlers}
        style={[styles.corner, positions[corner], { borderColor: colors.primary }]}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#fff" />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Crop Image</Text>
          
          <TouchableOpacity 
            onPress={handleDone} 
            style={styles.headerButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={28} color={colors.primary} />
                <Text style={[styles.headerButtonText, { color: colors.primary }]}>Done</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              {/* Image */}
              {imageDimensions && (
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    position: 'absolute',
                    left: imageDimensions.offsetX,
                    top: imageDimensions.offsetY,
                    width: imageDimensions.displayWidth,
                    height: imageDimensions.displayHeight,
                  }}
                  resizeMode="contain"
                />
              )}
              
              {/* Dark overlay outside crop area */}
              {imageDimensions && (
                <>
                  {/* Top */}
                  <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
                  {/* Bottom */}
                  <View style={[styles.overlay, { top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 }]} />
                  {/* Left */}
                  <View style={[styles.overlay, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height }]} />
                  {/* Right */}
                  <View style={[styles.overlay, { top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height }]} />
                </>
              )}
              
              {/* Crop Box */}
              <View
                {...boxPanResponder.panHandlers}
                style={[
                  styles.cropBox,
                  {
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                    borderColor: colors.primary,
                  },
                ]}
              >
                {/* Grid lines */}
                <View style={[styles.gridLine, styles.gridHorizontal, { top: '33%' }]} />
                <View style={[styles.gridLine, styles.gridHorizontal, { top: '66%' }]} />
                <View style={[styles.gridLine, styles.gridVertical, { left: '33%' }]} />
                <View style={[styles.gridLine, styles.gridVertical, { left: '66%' }]} />
                
                {/* Corner handles */}
                {renderCorner('tl')}
                {renderCorner('tr')}
                {renderCorner('bl')}
                {renderCorner('br')}
              </View>
            </>
          )}
        </View>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Text style={styles.hint}>Drag to move • Drag corners to resize</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});
