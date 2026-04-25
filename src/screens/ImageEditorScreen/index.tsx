import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { RootStackParamList } from '../../types';
import { resolveImageEditor, cancelImageEditor } from '../../lib/imageEditorBridge';
import { styles } from './styles';

type ImageEditorRouteProp = RouteProp<RootStackParamList, 'ImageEditor'>;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const CROP_PADDING = 20; // px padding around crop area

export default function ImageEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<ImageEditorRouteProp>();
  const { imageUri } = route.params;

  // Image natural dimensions
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  // Rotation (0, 90, 180, 270)
  const [rotation, setRotation] = useState(0);
  // Flips
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  // Processing state
  const [processing, setProcessing] = useState(false);

  // Gesture shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Load image dimensions
  React.useEffect(() => {
    Image.getSize(
      imageUri,
      (w, h) => setImageSize({ width: w, height: h }),
      () => console.error('Failed to get image size'),
    );
  }, [imageUri]);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewportSize({ width, height });
  }, []);

  // Compute displayed image size to fit within viewport
  // Account for rotation: when rotated 90/270, width and height swap
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveImageW = isRotated ? imageSize.height : imageSize.width;
  const effectiveImageH = isRotated ? imageSize.width : imageSize.height;

  const { displayW, displayH } = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height || !effectiveImageW || !effectiveImageH) {
      return { displayW: 0, displayH: 0 };
    }
    const vpW = viewportSize.width;
    const vpH = viewportSize.height;
    const imgAspect = effectiveImageW / effectiveImageH;
    const vpAspect = vpW / vpH;

    let dw: number, dh: number;
    if (imgAspect > vpAspect) {
      // Image is wider than viewport
      dw = vpW;
      dh = vpW / imgAspect;
    } else {
      // Image is taller than viewport
      dh = vpH;
      dw = vpH * imgAspect;
    }
    return { displayW: dw, displayH: dh };
  }, [viewportSize, effectiveImageW, effectiveImageH]);

  // Crop area: fits inside viewport with padding, matching image aspect ratio
  const cropArea = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height || !displayW || !displayH) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const maxW = viewportSize.width - CROP_PADDING * 2;
    const maxH = viewportSize.height - CROP_PADDING * 2;
    const imgAspect = effectiveImageW / effectiveImageH;

    let cropW: number, cropH: number;
    if (imgAspect > maxW / maxH) {
      cropW = maxW;
      cropH = maxW / imgAspect;
    } else {
      cropH = maxH;
      cropW = maxH * imgAspect;
    }

    return {
      x: (viewportSize.width - cropW) / 2,
      y: (viewportSize.height - cropH) / 2,
      width: cropW,
      height: cropH,
    };
  }, [viewportSize, effectiveImageW, effectiveImageH, displayW, displayH]);

  // The actual size to render the <Image> (before rotation transform).
  // We render at a size that, after rotation, fills the crop area.
  const imageRenderSize = useMemo(() => {
    if (!imageSize.width || !imageSize.height || !cropArea.width || !cropArea.height) {
      return { width: 0, height: 0 };
    }
    if (isRotated) {
      // After 90/270 rotation, width↔height swap visually.
      // We need the rendered image's height to match cropArea.width
      // and rendered image's width to match cropArea.height.
      const imgAspect = imageSize.width / imageSize.height;
      // Fit so that after rotation the visual footprint matches cropArea
      const targetVisualW = cropArea.width; // visual width after rotation
      const targetVisualH = cropArea.height; // visual height after rotation
      // After rotation: visualW = renderH, visualH = renderW
      // So: renderH = targetVisualW, renderW = targetVisualH
      // But must maintain aspect ratio:
      const fitByW = targetVisualH / imageSize.width; // scale so renderW = targetVisualH
      const fitByH = targetVisualW / imageSize.height; // scale so renderH = targetVisualW
      const fitScale = Math.min(fitByW, fitByH);
      return {
        width: imageSize.width * fitScale,
        height: imageSize.height * fitScale,
      };
    } else {
      // Fit image to crop area
      const scaleW = cropArea.width / imageSize.width;
      const scaleH = cropArea.height / imageSize.height;
      const fitScale = Math.min(scaleW, scaleH);
      return {
        width: imageSize.width * fitScale,
        height: imageSize.height * fitScale,
      };
    }
  }, [imageSize, cropArea, isRotated]);

  // --- Gestures ---

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE * 0.5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE, { duration: 200 });
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    });

  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    doubleTapGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Rotation + flip is applied as a static style (not animated for simplicity)
  const rotationFlipStyle = useMemo(() => {
    return {
      transform: [
        { rotate: `${rotation}deg` },
        { scaleX: flipH ? -1 : 1 },
        { scaleY: flipV ? -1 : 1 },
      ],
    };
  }, [rotation, flipH, flipV]);

  // --- Actions ---

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => (r - 90 + 360) % 360);
    // Reset pan/zoom since image geometry changes
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  const handleFlipH = useCallback(() => setFlipH((f) => !f), []);
  const handleFlipV = useCallback(() => setFlipV((f) => !f), []);

  const handleCancel = useCallback(() => {
    cancelImageEditor();
    navigation.goBack();
  }, [navigation]);

  const handleDone = useCallback(async () => {
    if (processing || !imageSize.width || !imageSize.height) return;
    setProcessing(true);

    try {
      // Read current gesture values
      const currentScale = scale.value;
      const currentTX = translateX.value;
      const currentTY = translateY.value;

      // Build manipulation actions
      const actions: ImageManipulator.Action[] = [];

      // 1. Rotate
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // 2. Flip
      if (flipH) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipV) {
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      // 3. Crop — map crop overlay back to image coordinates
      // After rotation + flip, the effective image dimensions:
      const postRotW = isRotated ? imageSize.height : imageSize.width;
      const postRotH = isRotated ? imageSize.width : imageSize.height;

      // Scale from image render size to actual image pixels
      const renderW = isRotated
        ? imageRenderSize.height // visual width after rotation
        : imageRenderSize.width;
      const renderH = isRotated
        ? imageRenderSize.width // visual height after rotation
        : imageRenderSize.height;

      const pixelsPerPxX = postRotW / renderW;
      const pixelsPerPxY = postRotH / renderH;

      // The crop area center in viewport coords:
      const cropCenterX = cropArea.x + cropArea.width / 2;
      const cropCenterY = cropArea.y + cropArea.height / 2;

      // Image center in viewport coords (viewport center + translate, scaled):
      const vpCenterX = viewportSize.width / 2;
      const vpCenterY = viewportSize.height / 2;

      // Crop area origin relative to image, in pixels
      // The image is centered in viewport, then translated and scaled.
      // Image's top-left in viewport = vpCenter - (renderW*scale/2) + translateX
      const imgLeftInVp = vpCenterX - (renderW * currentScale) / 2 + currentTX;
      const imgTopInVp = vpCenterY - (renderH * currentScale) / 2 + currentTY;

      // Crop area in viewport coords → relative to image render
      const cropLeftRel = (cropArea.x - imgLeftInVp) / currentScale;
      const cropTopRel = (cropArea.y - imgTopInVp) / currentScale;
      const cropWRel = cropArea.width / currentScale;
      const cropHRel = cropArea.height / currentScale;

      // Convert to image pixel coords
      let originX = Math.round(cropLeftRel * pixelsPerPxX);
      let originY = Math.round(cropTopRel * pixelsPerPxY);
      let cropW = Math.round(cropWRel * pixelsPerPxX);
      let cropH = Math.round(cropHRel * pixelsPerPxY);

      // Clamp to image bounds
      originX = Math.max(0, Math.min(originX, postRotW - 1));
      originY = Math.max(0, Math.min(originY, postRotH - 1));
      cropW = Math.min(cropW, postRotW - originX);
      cropH = Math.min(cropH, postRotH - originY);

      // Only crop if meaningful
      if (cropW > 10 && cropH > 10) {
        actions.push({
          crop: { originX, originY, width: cropW, height: cropH },
        });
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      resolveImageEditor(result.uri);
      navigation.goBack();
    } catch (err) {
      console.error('Image editor processing error:', err);
      // On error, still go back but with no result
      cancelImageEditor();
      navigation.goBack();
    } finally {
      setProcessing(false);
    }
  }, [
    processing, imageSize, imageUri, rotation, flipH, flipV,
    isRotated, imageRenderSize, cropArea, viewportSize, navigation,
    scale, translateX, translateY,
  ]);

  const ready = displayW > 0 && displayH > 0 && cropArea.width > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarButton} onPress={handleCancel}>
            <Text style={styles.topBarButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Photo</Text>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={handleDone}
            disabled={processing || !ready}
          >
            <Text style={[styles.doneButtonText, processing && { opacity: 0.5 }]}>
              {processing ? 'Saving...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Viewport */}
        <View style={styles.viewport} onLayout={onViewportLayout}>
          {ready && (
            <>
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      {
                        width: imageRenderSize.width,
                        height: imageRenderSize.height,
                      },
                      rotationFlipStyle,
                    ]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </GestureDetector>

              {/* Crop Overlay */}
              <View style={styles.overlayContainer}>
                {/* Top */}
                <View
                  style={[
                    styles.overlayTop,
                    { height: cropArea.y },
                  ]}
                />
                {/* Bottom */}
                <View
                  style={[
                    styles.overlayBottom,
                    { height: viewportSize.height - cropArea.y - cropArea.height },
                  ]}
                />
                {/* Left */}
                <View
                  style={[
                    styles.overlayLeft,
                    {
                      top: cropArea.y,
                      width: cropArea.x,
                      height: cropArea.height,
                    },
                  ]}
                />
                {/* Right */}
                <View
                  style={[
                    styles.overlayRight,
                    {
                      top: cropArea.y,
                      width: viewportSize.width - cropArea.x - cropArea.width,
                      height: cropArea.height,
                    },
                  ]}
                />
                {/* Crop border */}
                <View
                  style={[
                    styles.cropBorder,
                    {
                      top: cropArea.y,
                      left: cropArea.x,
                      width: cropArea.width,
                      height: cropArea.height,
                    },
                  ]}
                >
                  {/* Grid lines - rule of thirds */}
                  <View style={[styles.gridLineH, { top: '33.33%' }]} />
                  <View style={[styles.gridLineH, { top: '66.66%' }]} />
                  <View style={[styles.gridLineV, { left: '33.33%' }]} />
                  <View style={[styles.gridLineV, { left: '66.66%' }]} />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Reset hint */}
        <Text style={styles.resetHint}>Double-tap to reset position</Text>

        {/* Bottom Toolbar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.toolButton} onPress={handleRotateLeft}>
            <Ionicons name="return-up-back-outline" size={24} color="#fff" />
            <Text style={styles.toolButtonText}>Rotate L</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleRotateRight}>
            <Ionicons name="return-up-forward-outline" size={24} color="#fff" />
            <Text style={styles.toolButtonText}>Rotate R</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleFlipH}>
            <Ionicons name="swap-horizontal-outline" size={24} color="#fff" />
            <Text style={styles.toolButtonText}>Flip H</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleFlipV}>
            <Ionicons name="swap-vertical-outline" size={24} color="#fff" />
            <Text style={styles.toolButtonText}>Flip V</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
