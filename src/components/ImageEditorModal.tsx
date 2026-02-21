import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_MIN_SIZE = 80;
const HANDLE_SIZE = 44;

type Props = {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
  aspectRatio?: number;
};

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
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
  const [cropBox, setCropBox] = useState<CropBox>({ x: 50, y: 100, width: 200, height: 200 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  
  // Refs for gesture tracking
  const startCropBox = useRef<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  // Load image dimensions
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
          
          const info: ImageInfo = {
            originalWidth: width,
            originalHeight: height,
            displayWidth,
            displayHeight,
            imageX,
            imageY,
          };
          setImageInfo(info);
          
          // Initialize crop box centered
          const initialSize = Math.min(displayWidth, displayHeight) * 0.75;
          const boxWidth = initialSize;
          const boxHeight = aspectRatio ? initialSize / aspectRatio : initialSize;
          
          setCropBox({
            x: imageX + (displayWidth - boxWidth) / 2,
            y: imageY + (displayHeight - boxHeight) / 2,
            width: boxWidth,
            height: boxHeight,
          });
          
          setLoading(false);
        },
        (error) => {
          console.error('Failed to get image size:', error);
          setLoading(false);
        }
      );
    }
  }, [visible, imageUri, aspectRatio]);

  const constrainCropBox = (box: CropBox): CropBox => {
    if (!imageInfo) return box;
    const { imageX, imageY, displayWidth, displayHeight } = imageInfo;
    
    let { x, y, width, height } = box;
    
    // Enforce minimum size
    width = Math.max(CROP_MIN_SIZE, width);
    height = Math.max(CROP_MIN_SIZE, height);
    
    // Constrain to image bounds
    width = Math.min(width, displayWidth);
    height = Math.min(height, displayHeight);
    x = Math.max(imageX, Math.min(x, imageX + displayWidth - width));
    y = Math.max(imageY, Math.min(y, imageY + displayHeight - height));
    
    return { x, y, width, height };
  };

  // Pan responder for dragging crop box
  const boxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startCropBox.current = { ...cropBox };
      },
      onPanResponderMove: (_, gesture) => {
        const newBox = constrainCropBox({
          x: startCropBox.current.x + gesture.dx,
          y: startCropBox.current.y + gesture.dy,
          width: startCropBox.current.width,
          height: startCropBox.current.height,
        });
        setCropBox(newBox);
      },
    })
  ).current;

  // Create corner pan responder
  const createCornerResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startCropBox.current = { ...cropBox };
        setActiveHandle(corner);
      },
      onPanResponderMove: (_, gesture) => {
        if (!imageInfo) return;
        
        const start = startCropBox.current;
        let newBox = { ...start };
        
        switch (corner) {
          case 'br':
            newBox.width = start.width + gesture.dx;
            newBox.height = aspectRatio ? newBox.width / aspectRatio : start.height + gesture.dy;
            break;
          case 'bl':
            newBox.width = start.width - gesture.dx;
            newBox.x = start.x + gesture.dx;
            newBox.height = aspectRatio ? newBox.width / aspectRatio : start.height + gesture.dy;
            break;
          case 'tr':
            newBox.width = start.width + gesture.dx;
            newBox.height = aspectRatio ? newBox.width / aspectRatio : start.height - gesture.dy;
            newBox.y = aspectRatio ? start.y + start.height - newBox.height : start.y + gesture.dy;
            break;
          case 'tl':
            newBox.width = start.width - gesture.dx;
            newBox.x = start.x + gesture.dx;
            newBox.height = aspectRatio ? newBox.width / aspectRatio : start.height - gesture.dy;
            newBox.y = aspectRatio ? start.y + start.height - newBox.height : start.y + gesture.dy;
            break;
        }
        
        setCropBox(constrainCropBox(newBox));
      },
      onPanResponderRelease: () => {
        setActiveHandle(null);
      },
    });
  };

  const tlResponder = useRef(createCornerResponder('tl')).current;
  const trResponder = useRef(createCornerResponder('tr')).current;
  const blResponder = useRef(createCornerResponder('bl')).current;
  const brResponder = useRef(createCornerResponder('br')).current;

  const handleDone = async () => {
    if (!imageInfo) return;
    
    setSaving(true);
    try {
      const scaleX = imageInfo.originalWidth / imageInfo.displayWidth;
      const scaleY = imageInfo.originalHeight / imageInfo.displayHeight;
      
      const originX = (cropBox.x - imageInfo.imageX) * scaleX;
      const originY = (cropBox.y - imageInfo.imageY) * scaleY;
      const width = cropBox.width * scaleX;
      const height = cropBox.height * scaleY;
      
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
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
              <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropBox.y }]} pointerEvents="none" />
              <View style={[styles.overlay, { top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
              <View style={[styles.overlay, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height }]} pointerEvents="none" />
              <View style={[styles.overlay, { top: cropBox.y, left: cropBox.x + cropBox.width, right: 0, height: cropBox.height }]} pointerEvents="none" />

              {/* Crop Box (draggable) */}
              <View
                {...boxPanResponder.panHandlers}
                style={[
                  styles.cropBox,
                  {
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                  },
                ]}
              >
                {/* Grid */}
                <View style={[styles.gridH, { top: '33.33%' }]} />
                <View style={[styles.gridH, { top: '66.66%' }]} />
                <View style={[styles.gridV, { left: '33.33%' }]} />
                <View style={[styles.gridV, { left: '66.66%' }]} />
              </View>

              {/* Corner handles */}
              <View
                {...tlResponder.panHandlers}
                style={[styles.handle, { left: cropBox.x - HANDLE_SIZE / 2, top: cropBox.y - HANDLE_SIZE / 2 }]}
              >
                <View style={[styles.handleCorner, styles.handleTL]} />
              </View>
              
              <View
                {...trResponder.panHandlers}
                style={[styles.handle, { left: cropBox.x + cropBox.width - HANDLE_SIZE / 2, top: cropBox.y - HANDLE_SIZE / 2 }]}
              >
                <View style={[styles.handleCorner, styles.handleTR]} />
              </View>
              
              <View
                {...blResponder.panHandlers}
                style={[styles.handle, { left: cropBox.x - HANDLE_SIZE / 2, top: cropBox.y + cropBox.height - HANDLE_SIZE / 2 }]}
              >
                <View style={[styles.handleCorner, styles.handleBL]} />
              </View>
              
              <View
                {...brResponder.panHandlers}
                style={[styles.handle, { left: cropBox.x + cropBox.width - HANDLE_SIZE / 2, top: cropBox.y + cropBox.height - HANDLE_SIZE / 2 }]}
              >
                <View style={[styles.handleCorner, styles.handleBR]} />
              </View>
            </>
          )}
        </View>

        {/* Footer */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
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
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleCorner: {
    width: 20,
    height: 20,
    borderColor: '#fff',
  },
  handleTL: {
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  handleTR: {
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  handleBL: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  handleBR: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
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
