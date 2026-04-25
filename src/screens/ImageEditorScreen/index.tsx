import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  clamp,
  runOnJS,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import { RootStackParamList } from "../../types";
import {
  resolveImageEditor,
  cancelImageEditor,
} from "../../lib/imageEditorBridge";
import { styles } from "./styles";

type ImageEditorRouteProp = RouteProp<RootStackParamList, "ImageEditor">;
type EditorMode = "move" | "crop" | "rotate";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const MIN_CROP_SIZE = 50;
const HANDLE_SIZE = 44;

type CropAspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
const ASPECT_RATIOS: {
  label: string;
  value: CropAspectRatio;
  ratio: number | null;
}[] = [
  { label: "Free", value: "free", ratio: null },
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "4:3", value: "4:3", ratio: 4 / 3 },
  { label: "3:4", value: "3:4", ratio: 3 / 4 },
  { label: "16:9", value: "16:9", ratio: 16 / 9 },
  { label: "9:16", value: "9:16", ratio: 9 / 16 },
];

export default function ImageEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<ImageEditorRouteProp>();
  const { imageUri } = route.params;

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [rotation90, setRotation90] = useState(0); // 90-degree increments
  const [freeRotation, setFreeRotation] = useState(0); // degrees, -45 to 45
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<EditorMode>("move");
  const [bgColor, setBgColor] = useState<"black" | "white">("black");
  const [hasCropped, setHasCropped] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] =
    useState<CropAspectRatio>("free");
  const cropInitialized = useRef(false);
  // Normalized crop coords (0–1 fractions of image at scale=1)
  const cropNormRef = useRef({ l: 0, t: 0, r: 1, b: 1 });
  // Ref for breaking declaration-order dependency
  const zoomToCropFn = useRef<() => void>(() => {});

  // Shared value for crop aspect ratio (0 = free, otherwise w/h ratio)
  const cropRatioSV = useSharedValue(0);

  // Image transform shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);

  // Crop rect shared values (viewport coords)
  const cropL = useSharedValue(0);
  const cropT = useSharedValue(0);
  const cropR = useSharedValue(0);
  const cropB = useSharedValue(0);
  const savedCL = useSharedValue(0);
  const savedCT = useSharedValue(0);
  const savedCR = useSharedValue(0);
  const savedCB = useSharedValue(0);

  // Freeform rotation shared value (for slider)
  const rotSlider = useSharedValue(0);
  const savedRotSlider = useSharedValue(0);
  const [rotSliderWidth, setRotSliderWidth] = useState(0);

  useEffect(() => {
    Image.getSize(
      imageUri,
      (w, h) => setImageSize({ width: w, height: h }),
      () => console.error("Failed to get image size"),
    );
  }, [imageUri]);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportSize({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  const isRotated90 = rotation90 === 90 || rotation90 === 270;
  const totalRotation = rotation90 + freeRotation;

  // Fitted image size at scale=1, accounting for rotation bounding box
  const imageRenderSize = useMemo(() => {
    if (
      !imageSize.width ||
      !imageSize.height ||
      !viewportSize.width ||
      !viewportSize.height
    ) {
      return { width: 0, height: 0 };
    }
    const vpW = viewportSize.width;
    const vpH = viewportSize.height;

    // First fit image to viewport without rotation
    let fitW: number, fitH: number;
    if (isRotated90) {
      const fit = Math.min(vpH / imageSize.width, vpW / imageSize.height);
      fitW = imageSize.width * fit;
      fitH = imageSize.height * fit;
    } else {
      const fit = Math.min(vpW / imageSize.width, vpH / imageSize.height);
      fitW = imageSize.width * fit;
      fitH = imageSize.height * fit;
    }

    // For freeform rotation, calculate the bounding box of the rotated rectangle
    // and scale down so it fits in the viewport
    if (freeRotation !== 0) {
      const rad = Math.abs((freeRotation * Math.PI) / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // Bounding box of rotated fitW x fitH (or swapped if 90/270)
      const w = isRotated90 ? fitH : fitW;
      const h = isRotated90 ? fitW : fitH;
      const bbW = w * cos + h * sin;
      const bbH = w * sin + h * cos;
      // Scale down if bounding box exceeds viewport
      const scaleDown = Math.min(1, vpW / bbW, vpH / bbH);
      fitW *= scaleDown;
      fitH *= scaleDown;
    }

    return { width: fitW, height: fitH };
  }, [imageSize, viewportSize, isRotated90, freeRotation]);

  // Visual footprint after CSS rotation (at scale=1) — the bounding box
  const totalRad = Math.abs((totalRotation * Math.PI) / 180);
  const cosR = Math.abs(Math.cos(totalRad));
  const sinR = Math.abs(Math.sin(totalRad));
  const visualW = imageRenderSize.width * cosR + imageRenderSize.height * sinR;
  const visualH = imageRenderSize.width * sinR + imageRenderSize.height * cosR;

  // One-time crop init when viewport + image are first ready
  useEffect(() => {
    if (
      cropInitialized.current ||
      !viewportSize.width ||
      !viewportSize.height ||
      !visualW ||
      !visualH
    )
      return;
    cropInitialized.current = true;
    const vpCX = viewportSize.width / 2;
    const vpCY = viewportSize.height / 2;
    cropL.value = vpCX - visualW / 2;
    cropT.value = vpCY - visualH / 2;
    cropR.value = vpCX + visualW / 2;
    cropB.value = vpCY + visualH / 2;
  }, [viewportSize, visualW, visualH]);

  // --- CLAMPING (rubber-band) ---
  const clampTranslation = () => {
    "worklet";
    const s = scale.value;
    const imgW = visualW * s;
    const imgH = visualH * s;
    const vpCX = viewportSize.width / 2;
    const vpCY = viewportSize.height / 2;

    // In move mode, clamp so image covers full viewport center area
    // (using the visual image bounds, not the crop rect)
    const halfImgW = imgW / 2;
    const halfImgH = imgH / 2;
    const halfVW = visualW / 2; // original visual half at scale=1
    const halfVH = visualH / 2;

    // Image left edge <= visual left edge at scale=1 (so image covers its own initial area)
    const maxTX = halfImgW - halfVW; // how far right we can go
    const minTX = -(halfImgW - halfVW); // how far left
    const maxTY = halfImgH - halfVH;
    const minTY = -(halfImgH - halfVH);

    if (maxTX < 0) {
      translateX.value = withTiming(0, { duration: 200 });
    } else {
      translateX.value = withTiming(clamp(translateX.value, minTX, maxTX), {
        duration: 200,
      });
    }
    if (maxTY < 0) {
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      translateY.value = withTiming(clamp(translateY.value, minTY, maxTY), {
        duration: 200,
      });
    }
  };

  // --- IMAGE GESTURES (only in move mode) ---
  const pinchGesture = Gesture.Pinch()
    .enabled(mode === "move")
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(
        MAX_SCALE,
        Math.max(0.5, savedScale.value * e.scale),
      );
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
      } else {
        clampTranslation();
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(mode === "move")
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => {
      clampTranslation();
    });

  const handleDoubleTap = useCallback(() => {
    if (hasCropped) {
      // Re-zoom to crop area
      zoomToCropFn.current();
    } else {
      scale.value = withTiming(1, { duration: 250 });
      translateX.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(0, { duration: 250 });
      savedScale.value = 1;
      savedTX.value = 0;
      savedTY.value = 0;
    }
  }, [hasCropped]);

  const doubleTapGesture = Gesture.Tap()
    .enabled(mode === "move")
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const imageGesture = Gesture.Simultaneous(
    doubleTapGesture,
    panGesture,
    pinchGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const rotationFlipStyle = useMemo(
    () => ({
      transform: [
        { rotate: `${totalRotation}deg` },
        { scaleX: flipH ? -1 : 1 },
        { scaleY: flipV ? -1 : 1 },
      ],
    }),
    [totalRotation, flipH, flipV],
  );

  // --- CROP HANDLE GESTURES (only in crop mode) ---
  // Receives pre-computed normalized crop coords from worklet
  const updateCropNorm = useCallback(
    (nl: number, nt: number, nr: number, nb: number) => {
      setHasCropped(true);
      cropNormRef.current = { l: nl, t: nt, r: nr, b: nb };
      console.log("[ImageEditor] cropNorm updated:", {
        l: nl.toFixed(3),
        t: nt.toFixed(3),
        r: nr.toFixed(3),
        b: nb.toFixed(3),
      });
    },
    [],
  );

  const makeCropGesture = (corner: "tl" | "tr" | "bl" | "br") => {
    return Gesture.Pan()
      .onStart(() => {
        savedCL.value = cropL.value;
        savedCT.value = cropT.value;
        savedCR.value = cropR.value;
        savedCB.value = cropB.value;
      })
      .onUpdate((e) => {
        // Get current image bounds to constrain handles
        const s = scale.value;
        const vpCX = viewportSize.width / 2;
        const vpCY = viewportSize.height / 2;
        const tx = translateX.value;
        const ty = translateY.value;
        const imgL = Math.max(0, vpCX - (visualW * s) / 2 + tx);
        const imgR = Math.min(
          viewportSize.width,
          vpCX + (visualW * s) / 2 + tx,
        );
        const imgT = Math.max(0, vpCY - (visualH * s) / 2 + ty);
        const imgB = Math.min(
          viewportSize.height,
          vpCY + (visualH * s) / 2 + ty,
        );
        const ratio = cropRatioSV.value; // 0 = free

        if (ratio === 0) {
          // Free mode — independent edges
          if (corner === "tl" || corner === "bl") {
            cropL.value = clamp(
              savedCL.value + e.translationX,
              imgL,
              cropR.value - MIN_CROP_SIZE,
            );
          }
          if (corner === "tr" || corner === "br") {
            cropR.value = clamp(
              savedCR.value + e.translationX,
              cropL.value + MIN_CROP_SIZE,
              imgR,
            );
          }
          if (corner === "tl" || corner === "tr") {
            cropT.value = clamp(
              savedCT.value + e.translationY,
              imgT,
              cropB.value - MIN_CROP_SIZE,
            );
          }
          if (corner === "bl" || corner === "br") {
            cropB.value = clamp(
              savedCB.value + e.translationY,
              cropT.value + MIN_CROP_SIZE,
              imgB,
            );
          }
        } else {
          // Locked ratio — opposite corner is anchor, dragged corner moves both axes
          // Use the larger drag delta to determine new width, derive height from ratio
          const dx = e.translationX;
          const dy = e.translationY;
          const anchorX =
            corner === "tl" || corner === "bl" ? savedCR.value : savedCL.value;
          const anchorY =
            corner === "tl" || corner === "tr" ? savedCB.value : savedCT.value;
          const signX = corner === "tr" || corner === "br" ? 1 : -1;
          const signY = corner === "bl" || corner === "br" ? 1 : -1;

          // Proposed new edge positions
          const proposedEdgeX =
            corner === "tl" || corner === "bl"
              ? savedCL.value + dx
              : savedCR.value + dx;
          const proposedEdgeY =
            corner === "tl" || corner === "tr"
              ? savedCT.value + dy
              : savedCB.value + dy;

          // Proposed widths from each axis
          const wFromX = Math.abs(proposedEdgeX - anchorX);
          const wFromY = Math.abs(proposedEdgeY - anchorY) * ratio;

          // Use the dominant drag axis
          let newW = Math.abs(dx) >= Math.abs(dy) ? wFromX : wFromY;
          let newH = newW / ratio;

          // Clamp to minimum
          newW = Math.max(newW, MIN_CROP_SIZE);
          newH = Math.max(newH, MIN_CROP_SIZE / ratio);

          // Clamp to image bounds
          const maxW = signX > 0 ? imgR - anchorX : anchorX - imgL;
          const maxH = signY > 0 ? imgB - anchorY : anchorY - imgT;
          if (newW > maxW) {
            newW = maxW;
            newH = newW / ratio;
          }
          if (newH > maxH) {
            newH = maxH;
            newW = newH * ratio;
          }

          // Compute final rect
          const newL = signX > 0 ? anchorX : anchorX - newW;
          const newT = signY > 0 ? anchorY : anchorY - newH;
          cropL.value = newL;
          cropT.value = newT;
          cropR.value = newL + newW;
          cropB.value = newT + newH;
        }
      })
      .onEnd(() => {
        // Compute normalized crop coords on UI thread (guaranteed correct values)
        const s = scale.value;
        const vpCX = viewportSize.width / 2;
        const vpCY = viewportSize.height / 2;
        const tx = translateX.value;
        const ty = translateY.value;
        const imgL = vpCX - (visualW * s) / 2 + tx;
        const imgT = vpCY - (visualH * s) / 2 + ty;
        const imgW = visualW * s;
        const imgH = visualH * s;
        const nl = (cropL.value - imgL) / imgW;
        const nt = (cropT.value - imgT) / imgH;
        const nr = (cropR.value - imgL) / imgW;
        const nb = (cropB.value - imgT) / imgH;
        runOnJS(updateCropNorm)(nl, nt, nr, nb);
      });
  };

  const tlGesture = useMemo(
    () => makeCropGesture("tl"),
    [viewportSize, visualW, visualH],
  );
  const trGesture = useMemo(
    () => makeCropGesture("tr"),
    [viewportSize, visualW, visualH],
  );
  const blGesture = useMemo(
    () => makeCropGesture("bl"),
    [viewportSize, visualW, visualH],
  );
  const brGesture = useMemo(
    () => makeCropGesture("br"),
    [viewportSize, visualW, visualH],
  );

  // --- CROP BOX MOVE GESTURE (drag entire crop box) ---
  // Track previous frame position to use delta-based movement (avoids edge overshoot)
  const prevMoveX = useSharedValue(0);
  const prevMoveY = useSharedValue(0);

  const cropMoveGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart((e) => {
          prevMoveX.value = e.absoluteX;
          prevMoveY.value = e.absoluteY;
        })
        .onUpdate((e) => {
          const cropW = cropR.value - cropL.value;
          const cropH = cropB.value - cropT.value;

          // Delta since last frame (not from start)
          const dx = e.absoluteX - prevMoveX.value;
          const dy = e.absoluteY - prevMoveY.value;
          prevMoveX.value = e.absoluteX;
          prevMoveY.value = e.absoluteY;

          // Image bounds
          const s = scale.value;
          const vpCX = viewportSize.width / 2;
          const vpCY = viewportSize.height / 2;
          const tx = translateX.value;
          const ty = translateY.value;
          const imgL = Math.max(0, vpCX - (visualW * s) / 2 + tx);
          const imgR = Math.min(
            viewportSize.width,
            vpCX + (visualW * s) / 2 + tx,
          );
          const imgT = Math.max(0, vpCY - (visualH * s) / 2 + ty);
          const imgB = Math.min(
            viewportSize.height,
            vpCY + (visualH * s) / 2 + ty,
          );

          const newL = clamp(cropL.value + dx, imgL, imgR - cropW);
          const newT = clamp(cropT.value + dy, imgT, imgB - cropH);

          cropL.value = newL;
          cropT.value = newT;
          cropR.value = newL + cropW;
          cropB.value = newT + cropH;
        })
        .onEnd(() => {
          // Compute normalized crop coords on UI thread
          const s = scale.value;
          const vpCX = viewportSize.width / 2;
          const vpCY = viewportSize.height / 2;
          const tx = translateX.value;
          const ty = translateY.value;
          const imgL = vpCX - (visualW * s) / 2 + tx;
          const imgT = vpCY - (visualH * s) / 2 + ty;
          const imgW = visualW * s;
          const imgH = visualH * s;
          const nl = (cropL.value - imgL) / imgW;
          const nt = (cropT.value - imgT) / imgH;
          const nr = (cropR.value - imgL) / imgW;
          const nb = (cropB.value - imgT) / imgH;
          runOnJS(updateCropNorm)(nl, nt, nr, nb);
        }),
    [viewportSize, visualW, visualH],
  );

  // Crop box move area style
  const cropMoveAreaStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: cropL.value,
    top: cropT.value,
    width: cropR.value - cropL.value,
    height: cropB.value - cropT.value,
    zIndex: 10,
  }));

  // --- ROTATION SLIDER GESTURE (only in rotate mode) ---
  const updateFreeRotation = useCallback((val: number) => {
    setFreeRotation(Math.round(val * 10) / 10);
  }, []);

  const rotSliderGesture = Gesture.Pan()
    .onStart(() => {
      savedRotSlider.value = rotSlider.value;
    })
    .onUpdate((e) => {
      if (rotSliderWidth <= 0) return;
      // Map slider width to -45..+45 degrees
      const degreesPerPx = 90 / rotSliderWidth;
      const newVal = clamp(
        savedRotSlider.value + e.translationX * degreesPerPx,
        -45,
        45,
      );
      rotSlider.value = newVal;
      runOnJS(updateFreeRotation)(newVal);
    });

  // --- ANIMATED OVERLAY STYLES ---
  const overlayTopStyle = useAnimatedStyle(() => ({
    height: Math.max(0, cropT.value),
  }));
  const overlayBottomStyle = useAnimatedStyle(() => ({
    height: Math.max(0, viewportSize.height - cropB.value),
  }));
  const overlayLeftStyle = useAnimatedStyle(() => ({
    top: cropT.value,
    width: Math.max(0, cropL.value),
    height: cropB.value - cropT.value,
  }));
  const overlayRightStyle = useAnimatedStyle(() => ({
    top: cropT.value,
    width: Math.max(0, viewportSize.width - cropR.value),
    height: cropB.value - cropT.value,
  }));
  const cropBorderStyle = useAnimatedStyle(() => ({
    top: cropT.value,
    left: cropL.value,
    width: cropR.value - cropL.value,
    height: cropB.value - cropT.value,
  }));

  // Corner handle positions — placed inward so they're fully visible
  const handlePos = (corner: "tl" | "tr" | "bl" | "br") =>
    useAnimatedStyle(() => {
      const isLeft = corner[1] === "l";
      const isTop = corner[0] === "t";
      const x = isLeft ? cropL.value : cropR.value - HANDLE_SIZE;
      const y = isTop ? cropT.value : cropB.value - HANDLE_SIZE;
      return {
        position: "absolute" as const,
        left: x,
        top: y,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        zIndex: 20,
      };
    });

  const tlPos = handlePos("tl");
  const trPos = handlePos("tr");
  const blPos = handlePos("bl");
  const brPos = handlePos("br");

  // Rotation slider animated thumb
  const rotThumbStyle = useAnimatedStyle(() => {
    if (rotSliderWidth <= 0) return { left: 0 };
    const fraction = (rotSlider.value + 45) / 90; // 0..1
    return {
      left: fraction * rotSliderWidth - 12,
    };
  });

  const rotFillStyle = useAnimatedStyle(() => {
    if (rotSliderWidth <= 0) return { width: 0, left: "50%" };
    const center = rotSliderWidth / 2;
    const pos = ((rotSlider.value + 45) / 90) * rotSliderWidth;
    return {
      left: Math.min(center, pos),
      width: Math.abs(pos - center),
    };
  });

  // Dynamic image outline — tracks pan/zoom transforms
  const outlineColor =
    bgColor === "white" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
  const dashedOutlineColor =
    bgColor === "white" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

  const imageOutlineStyle = useAnimatedStyle(() => {
    const s = scale.value;
    const vpCX = viewportSize.width / 2;
    const vpCY = viewportSize.height / 2;
    return {
      position: "absolute" as const,
      width: visualW * s,
      height: visualH * s,
      left: vpCX - (visualW * s) / 2 + translateX.value,
      top: vpCY - (visualH * s) / 2 + translateY.value,
      borderWidth: 1,
      borderColor: outlineColor,
      zIndex: 5,
    };
  });

  // --- ACTIONS ---
  const resetTransforms = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTX.value = 0;
    savedTY.value = 0;
  }, []);

  // Init crop rect to current image bounds in viewport
  const initCropToBounds = useCallback(() => {
    const vpCX = viewportSize.width / 2;
    const vpCY = viewportSize.height / 2;
    const s = scale.value;
    const tx = translateX.value;
    const ty = translateY.value;
    const imgL = vpCX - (visualW * s) / 2 + tx;
    const imgR = vpCX + (visualW * s) / 2 + tx;
    const imgT = vpCY - (visualH * s) / 2 + ty;
    const imgB = vpCY + (visualH * s) / 2 + ty;
    cropL.value = Math.max(0, imgL);
    cropT.value = Math.max(0, imgT);
    cropR.value = Math.min(viewportSize.width, imgR);
    cropB.value = Math.min(viewportSize.height, imgB);
    // Reset normalized to full image
    cropNormRef.current = { l: 0, t: 0, r: 1, b: 1 };
  }, [viewportSize, visualW, visualH]);

  // Zoom so cropped area fills the viewport (non-destructive)
  // Derives entirely from cropNormRef — works from any state
  const zoomToCropArea = useCallback(() => {
    const n = cropNormRef.current;
    const normW = n.r - n.l;
    const normH = n.b - n.t;
    if (normW <= 0 || normH <= 0) return;

    const vpW = viewportSize.width;
    const vpH = viewportSize.height;
    const vpCX = vpW / 2;
    const vpCY = vpH / 2;

    // Scale needed to fill viewport with crop area (8% padding)
    const newScale =
      Math.min(vpW / (normW * visualW), vpH / (normH * visualH)) * 0.92;
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

    // Translate to center crop in viewport
    const normCX = (n.l + n.r) / 2;
    const normCY = (n.t + n.b) / 2;
    const newTX = visualW * clampedScale * (0.5 - normCX);
    const newTY = visualH * clampedScale * (0.5 - normCY);

    const dur = { duration: 300 };
    scale.value = withTiming(clampedScale, dur);
    savedScale.value = clampedScale;
    translateX.value = withTiming(newTX, dur);
    translateY.value = withTiming(newTY, dur);
    savedTX.value = newTX;
    savedTY.value = newTY;

    // Update crop rect to match new transform
    const imgL = vpCX - (visualW * clampedScale) / 2 + newTX;
    const imgT = vpCY - (visualH * clampedScale) / 2 + newTY;
    const imgW = visualW * clampedScale;
    const imgH = visualH * clampedScale;
    cropL.value = withTiming(imgL + n.l * imgW, dur);
    cropT.value = withTiming(imgT + n.t * imgH, dur);
    cropR.value = withTiming(imgL + n.r * imgW, dur);
    cropB.value = withTiming(imgT + n.b * imgH, dur);
  }, [viewportSize, visualW, visualH]);
  // Keep ref in sync for forward references
  zoomToCropFn.current = zoomToCropArea;

  // Reset to full image view, restoring crop rect from normalized coords
  const resetToFullImage = useCallback(() => {
    const dur = { duration: 300 };
    scale.value = withTiming(1, dur);
    savedScale.value = 1;
    translateX.value = withTiming(0, dur);
    translateY.value = withTiming(0, dur);
    savedTX.value = 0;
    savedTY.value = 0;

    // Restore crop rect from normalized coords at scale=1, translate=0
    const vpCX = viewportSize.width / 2;
    const vpCY = viewportSize.height / 2;
    const imgL = vpCX - visualW / 2;
    const imgT = vpCY - visualH / 2;
    const n = cropNormRef.current;
    cropL.value = withTiming(imgL + n.l * visualW, dur);
    cropT.value = withTiming(imgT + n.t * visualH, dur);
    cropR.value = withTiming(imgL + n.r * visualW, dur);
    cropB.value = withTiming(imgT + n.b * visualH, dur);
  }, [viewportSize, visualW, visualH]);

  const handleRotateLeft = useCallback(() => {
    setRotation90((r) => (r - 90 + 360) % 360);
    resetTransforms();
    setHasCropped(false);
    // Reset crop to new image bounds after state settles
    setTimeout(() => initCropToBounds(), 50);
  }, [resetTransforms]);

  const handleRotateRight = useCallback(() => {
    setRotation90((r) => (r + 90) % 360);
    resetTransforms();
    setHasCropped(false);
    setTimeout(() => initCropToBounds(), 50);
  }, [resetTransforms]);

  const handleFlipH = useCallback(() => setFlipH((f) => !f), []);
  const handleFlipV = useCallback(() => setFlipV((f) => !f), []);

  const handleResetRotation = useCallback(() => {
    setFreeRotation(0);
    rotSlider.value = 0;
  }, []);

  // Apply aspect ratio to crop rect — fits max area within image bounds
  const applyCropAspectRatio = useCallback(
    (ratio: number | null) => {
      if (!ratio) return; // free mode, no constraint

      // Get image bounds
      const s = scale.value;
      const vpCX = viewportSize.width / 2;
      const vpCY = viewportSize.height / 2;
      const tx = translateX.value;
      const ty = translateY.value;
      const imgL = Math.max(0, vpCX - (visualW * s) / 2 + tx);
      const imgR = Math.min(viewportSize.width, vpCX + (visualW * s) / 2 + tx);
      const imgT = Math.max(0, vpCY - (visualH * s) / 2 + ty);
      const imgB = Math.min(viewportSize.height, vpCY + (visualH * s) / 2 + ty);
      const imgW = imgR - imgL;
      const imgH = imgB - imgT;

      // Fit ratio as max area within image bounds
      let newW: number, newH: number;
      if (imgW / imgH > ratio) {
        newH = imgH;
        newW = newH * ratio;
      } else {
        newW = imgW;
        newH = newW / ratio;
      }

      newW = Math.max(newW, MIN_CROP_SIZE);
      newH = Math.max(newH, MIN_CROP_SIZE);

      // Center within image bounds
      const centerX = (imgL + imgR) / 2;
      const centerY = (imgT + imgB) / 2;
      let newL = centerX - newW / 2;
      let newT = centerY - newH / 2;
      if (newL < imgL) newL = imgL;
      if (newT < imgT) newT = imgT;
      if (newL + newW > imgR) newL = imgR - newW;
      if (newT + newH > imgB) newT = imgB - newH;

      cropL.value = newL;
      cropT.value = newT;
      cropR.value = newL + newW;
      cropB.value = newT + newH;
      setHasCropped(true);
      // Save normalized coords
      const rawImgL = vpCX - (visualW * s) / 2 + tx;
      const rawImgT = vpCY - (visualH * s) / 2 + ty;
      const rawImgW = visualW * s;
      const rawImgH = visualH * s;
      cropNormRef.current = {
        l: (newL - rawImgL) / rawImgW,
        t: (newT - rawImgT) / rawImgH,
        r: (newL + newW - rawImgL) / rawImgW,
        b: (newT + newH - rawImgT) / rawImgH,
      };
    },
    [viewportSize, visualW, visualH],
  );

  const toggleMode = useCallback(
    (m: EditorMode) => {
      if (mode === m) {
        // Switching back to move mode
        setMode("move");
        if (hasCropped) {
          zoomToCropArea();
        }
      } else {
        // Entering crop or rotate mode — reset to full image view
        if (hasCropped) {
          resetToFullImage();
        }
        setMode(m);
        if (m === "crop" && !hasCropped) {
          initCropToBounds();
          // Apply current aspect ratio to the fresh crop rect
          const entry = ASPECT_RATIOS.find((a) => a.value === cropAspectRatio);
          if (entry?.ratio) {
            setTimeout(() => applyCropAspectRatio(entry.ratio), 0);
          }
        }
      }
    },
    [
      mode,
      hasCropped,
      initCropToBounds,
      cropAspectRatio,
      applyCropAspectRatio,
      zoomToCropArea,
      resetToFullImage,
    ],
  );

  const handleAspectRatioChange = useCallback(
    (ar: CropAspectRatio) => {
      setCropAspectRatio(ar);
      const entry = ASPECT_RATIOS.find((a) => a.value === ar);
      cropRatioSV.value = entry?.ratio ?? 0;
      if (entry?.ratio) {
        // Ensure crop rect is valid before applying ratio
        const cw = cropR.value - cropL.value;
        if (cw < MIN_CROP_SIZE) {
          initCropToBounds();
          setTimeout(() => applyCropAspectRatio(entry.ratio!), 0);
        } else {
          applyCropAspectRatio(entry.ratio);
        }
      }
    },
    [applyCropAspectRatio, initCropToBounds],
  );

  // Save the edited image — two-step: rotate/flip first to get real dims, then crop
  const handleDone = useCallback(async () => {
    if (processing || !imageSize.width || !imageSize.height) return;
    setProcessing(true);

    try {
      let currentUri = imageUri;

      // Step 1: Apply rotation and flips
      const rotFlipActions: ImageManipulator.Action[] = [];
      const totalRot = rotation90 + freeRotation;
      if (totalRot !== 0) {
        rotFlipActions.push({ rotate: totalRot });
      }
      if (flipH) {
        rotFlipActions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipV) {
        rotFlipActions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      let realW = imageSize.width;
      let realH = imageSize.height;

      if (rotFlipActions.length > 0) {
        const step1 = await ImageManipulator.manipulateAsync(
          imageUri,
          rotFlipActions,
          { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
        );
        currentUri = step1.uri;
        realW = step1.width;
        realH = step1.height;
      }

      // Step 2: Crop using normalized coords on REAL post-rotation dimensions
      if (hasCropped) {
        const n = cropNormRef.current;
        const isFullImage =
          n.l < 0.01 && n.t < 0.01 && n.r > 0.99 && n.b > 0.99;

        if (!isFullImage) {
          let originX = Math.round(n.l * realW);
          let originY = Math.round(n.t * realH);
          let cropW = Math.round((n.r - n.l) * realW);
          let cropH = Math.round((n.b - n.t) * realH);

          originX = Math.max(0, Math.min(originX, realW - 1));
          originY = Math.max(0, Math.min(originY, realH - 1));
          cropW = Math.min(cropW, realW - originX);
          cropH = Math.min(cropH, realH - originY);

          console.log("[ImageEditor] Save debug:", {
            realW,
            realH,
            norm: n,
            crop: { originX, originY, cropW, cropH },
          });

          if (cropW > 10 && cropH > 10) {
            const step2 = await ImageManipulator.manipulateAsync(
              currentUri,
              [{ crop: { originX, originY, width: cropW, height: cropH } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
            );
            currentUri = step2.uri;
          }
        }
      }

      // If only rot/flip (no crop), re-compress to final quality
      if (currentUri !== imageUri && !hasCropped) {
        const final = await ImageManipulator.manipulateAsync(currentUri, [], {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        currentUri = final.uri;
      }

      resolveImageEditor(currentUri === imageUri ? imageUri : currentUri);
      navigation.goBack();
    } catch (err) {
      console.error("Image editor error:", err);
      cancelImageEditor();
      navigation.goBack();
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    imageSize,
    imageUri,
    navigation,
    rotation90,
    freeRotation,
    flipH,
    flipV,
    hasCropped,
  ]);

  const handleCancel = useCallback(() => {
    cancelImageEditor();
    navigation.goBack();
  }, [navigation]);

  const ready =
    imageRenderSize.width > 0 &&
    imageRenderSize.height > 0 &&
    viewportSize.width > 0;

  // Corner visual mark — positioned at the outer edge (crop corner)
  const cornerMark = (corner: "tl" | "tr" | "bl" | "br") => {
    const sz = 18;
    const bw = 3;
    const isTop = corner[0] === "t";
    const isLeft = corner[1] === "l";
    return (
      <View
        style={{
          position: "absolute",
          width: sz,
          height: sz,
          borderColor: "#fff",
          ...(isTop ? { top: 0 } : { bottom: 0 }),
          ...(isLeft ? { left: 0 } : { right: 0 }),
          ...(isTop && isLeft && { borderTopWidth: bw, borderLeftWidth: bw }),
          ...(isTop && !isLeft && { borderTopWidth: bw, borderRightWidth: bw }),
          ...(!isTop &&
            isLeft && { borderBottomWidth: bw, borderLeftWidth: bw }),
          ...(!isTop &&
            !isLeft && { borderBottomWidth: bw, borderRightWidth: bw }),
        }}
      />
    );
  };

  const modeHint =
    mode === "crop"
      ? "Drag corners to resize · Drag inside to move crop"
      : mode === "rotate"
        ? "Slide to rotate · Tap 0° to reset"
        : "Pinch to zoom · Pan to move · Double-tap to reset";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
            <Text
              style={[styles.doneButtonText, processing && { opacity: 0.5 }]}
            >
              {processing ? "Saving..." : "Done"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Viewport */}
        <View
          style={[
            styles.viewport,
            { backgroundColor: bgColor === "white" ? "#fff" : "#000" },
          ]}
          onLayout={onViewportLayout}
        >
          {ready && (
            <>
              {/* Image */}
              <GestureDetector gesture={imageGesture}>
                <Animated.View
                  style={[styles.imageContainer, animatedImageStyle]}
                >
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

              {/* Outline — shows what will be saved */}
              {mode !== "crop" && (
                <Animated.View
                  pointerEvents="none"
                  style={
                    hasCropped
                      ? [
                          {
                            position: "absolute" as const,
                            zIndex: 5,
                            borderWidth: 1.5,
                            borderColor: dashedOutlineColor,
                            borderStyle: "dashed",
                          },
                          cropBorderStyle,
                        ]
                      : imageOutlineStyle
                  }
                />
              )}

              {/* Background color toggle - floating button */}
              <TouchableOpacity
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 30,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                }}
                onPress={() =>
                  setBgColor((c) => (c === "black" ? "white" : "black"))
                }
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: bgColor === "black" ? "#fff" : "#000",
                    borderWidth: 1.5,
                    borderColor: bgColor === "black" ? "#fff" : "#555",
                  }}
                />
              </TouchableOpacity>

              {/* Crop overlay — only visible in crop mode */}
              {mode === "crop" && (
                <>
                  <View style={styles.overlayContainer} pointerEvents="none">
                    <Animated.View
                      style={[styles.overlayTop, overlayTopStyle]}
                    />
                    <Animated.View
                      style={[styles.overlayBottom, overlayBottomStyle]}
                    />
                    <Animated.View
                      style={[styles.overlayLeft, overlayLeftStyle]}
                    />
                    <Animated.View
                      style={[styles.overlayRight, overlayRightStyle]}
                    />
                    <Animated.View style={[styles.cropBorder, cropBorderStyle]}>
                      <View style={[styles.gridLineH, { top: "33.33%" }]} />
                      <View style={[styles.gridLineH, { top: "66.66%" }]} />
                      <View style={[styles.gridLineV, { left: "33.33%" }]} />
                      <View style={[styles.gridLineV, { left: "66.66%" }]} />
                    </Animated.View>
                  </View>

                  {/* Interactive elements — only in crop mode */}
                  {mode === "crop" && (
                    <>
                      {/* Draggable crop area (move whole box) */}
                      <GestureDetector gesture={cropMoveGesture}>
                        <Animated.View style={cropMoveAreaStyle} />
                      </GestureDetector>

                      {/* Corner handles */}
                      <GestureDetector gesture={tlGesture}>
                        <Animated.View style={tlPos}>
                          {cornerMark("tl")}
                        </Animated.View>
                      </GestureDetector>
                      <GestureDetector gesture={trGesture}>
                        <Animated.View style={trPos}>
                          {cornerMark("tr")}
                        </Animated.View>
                      </GestureDetector>
                      <GestureDetector gesture={blGesture}>
                        <Animated.View style={blPos}>
                          {cornerMark("bl")}
                        </Animated.View>
                      </GestureDetector>
                      <GestureDetector gesture={brGesture}>
                        <Animated.View style={brPos}>
                          {cornerMark("br")}
                        </Animated.View>
                      </GestureDetector>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* Hint */}
        <Text style={styles.modeHint}>{modeHint}</Text>

        {/* Aspect ratio picker (only in crop mode) */}
        {mode === "crop" && (
          <View style={styles.aspectRatioRow}>
            {ASPECT_RATIOS.map((ar) => (
              <TouchableOpacity
                key={ar.value}
                style={[
                  styles.aspectRatioChip,
                  cropAspectRatio === ar.value && styles.aspectRatioChipActive,
                ]}
                onPress={() => handleAspectRatioChange(ar.value)}
              >
                <Text
                  style={[
                    styles.aspectRatioChipText,
                    cropAspectRatio === ar.value &&
                      styles.aspectRatioChipTextActive,
                  ]}
                >
                  {ar.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Rotation slider (only in rotate mode) */}
        {mode === "rotate" && (
          <>
            <TouchableOpacity onPress={handleResetRotation}>
              <Text style={styles.rotateSliderLabel}>
                {freeRotation.toFixed(1)}°
              </Text>
            </TouchableOpacity>
            <GestureDetector gesture={rotSliderGesture}>
              <View
                style={styles.rotateSliderContainer}
                onLayout={(e) => setRotSliderWidth(e.nativeEvent.layout.width)}
              >
                <View style={styles.rotateSliderTrack} />
                <Animated.View
                  style={[styles.rotateSliderFill, rotFillStyle]}
                />
                <Animated.View
                  style={[styles.rotateSliderThumb, rotThumbStyle]}
                />
              </View>
            </GestureDetector>
            <View style={styles.rotateSliderTicks}>
              <Text style={styles.rotateSliderTick}>-45°</Text>
              <Text style={styles.rotateSliderTick}>0°</Text>
              <Text style={styles.rotateSliderTick}>+45°</Text>
            </View>
          </>
        )}

        {/* Bottom Toolbar */}
        <View style={styles.bottomBar}>
          <View style={styles.toolRow}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                mode === "crop" && styles.toolButtonActive,
              ]}
              onPress={() => toggleMode("crop")}
            >
              <Ionicons
                name="crop-outline"
                size={24}
                color={mode === "crop" ? "#4A90D9" : "#fff"}
              />
              <Text
                style={[
                  styles.toolButtonText,
                  mode === "crop" && styles.toolButtonTextActive,
                ]}
              >
                Crop
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolButton,
                mode === "rotate" && styles.toolButtonActive,
              ]}
              onPress={() => toggleMode("rotate")}
            >
              <Ionicons
                name="sync-outline"
                size={24}
                color={mode === "rotate" ? "#4A90D9" : "#fff"}
              />
              <Text
                style={[
                  styles.toolButtonText,
                  mode === "rotate" && styles.toolButtonTextActive,
                ]}
              >
                Rotate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleRotateLeft}
            >
              <Ionicons name="return-up-back-outline" size={24} color="#fff" />
              <Text style={styles.toolButtonText}>90° L</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleRotateRight}
            >
              <Ionicons
                name="return-up-forward-outline"
                size={24}
                color="#fff"
              />
              <Text style={styles.toolButtonText}>90° R</Text>
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
        </View>
      </SafeAreaView>
    </View>
  );
}
