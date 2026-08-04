import { useRef } from "react";
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLanguage } from "../lib/LanguageContext";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_DELAY_MS = 280;
const TAP_MOVE_THRESHOLD = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pinchDistance(touches: GestureResponderEvent["nativeEvent"]["touches"]): number {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// Full-screen tap-to-zoom photo viewer: pinch (two-finger), drag-when-
// zoomed, and double-tap-to-toggle all run through one PanResponder,
// built on core React Native Animated/PanResponder rather than a pinch
// library -- neither react-native-gesture-handler nor
// react-native-reanimated is installed, and adding either would need a
// fresh EAS build before it worked on a real device. Parent screens
// mount this conditionally ({url ? <PhotoViewerModal .../> : null}),
// the same pattern DatePickerField.tsx already established for Modal
// content that RN Web won't reliably hide via visible={false} alone --
// so every open gets a fresh instance and zoom/pan state never leaks
// between photos.
export function PhotoViewerModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { t } = useLanguage();

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleValue = useRef(1);
  const translateValue = useRef({ x: 0, y: 0 });
  const gestureStart = useRef({ scale: 1, translateX: 0, translateY: 0, distance: 0 });
  const lastTapAt = useRef(0);

  function setScale(next: number) {
    scaleValue.current = next;
    scale.setValue(next);
  }

  function setTranslate(x: number, y: number) {
    translateValue.current = { x, y };
    translateX.setValue(x);
    translateY.setValue(y);
  }

  function resetZoom() {
    setScale(1);
    setTranslate(0, 0);
  }

  function toggleZoom() {
    if (scaleValue.current > 1) {
      resetZoom();
    } else {
      setScale(DOUBLE_TAP_SCALE);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2 || scaleValue.current > 1,
      onPanResponderGrant: (evt) => {
        gestureStart.current = {
          scale: scaleValue.current,
          translateX: translateValue.current.x,
          translateY: translateValue.current.y,
          distance: evt.nativeEvent.touches.length === 2 ? pinchDistance(evt.nativeEvent.touches) : 0,
        };
      },
      onPanResponderMove: (evt, gesture) => {
        const { touches } = evt.nativeEvent;
        if (touches.length === 2) {
          if (gestureStart.current.distance > 0) {
            const distance = pinchDistance(touches);
            setScale(clamp(gestureStart.current.scale * (distance / gestureStart.current.distance), MIN_SCALE, MAX_SCALE));
          }
          return;
        }
        if (scaleValue.current > 1) {
          setTranslate(gestureStart.current.translateX + gesture.dx, gestureStart.current.translateY + gesture.dy);
        }
      },
      onPanResponderRelease: (evt, gesture) => {
        if (scaleValue.current < MIN_SCALE + 0.05) {
          resetZoom();
        }
        const wasTap = Math.abs(gesture.dx) < TAP_MOVE_THRESHOLD && Math.abs(gesture.dy) < TAP_MOVE_THRESHOLD;
        if (wasTap && evt.nativeEvent.changedTouches.length === 1) {
          const now = Date.now();
          if (now - lastTapAt.current < DOUBLE_TAP_DELAY_MS) {
            toggleZoom();
            lastTapAt.current = 0;
          } else {
            lastTapAt.current = now;
          }
        }
      },
    })
  ).current;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.imageWrap} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri }}
            resizeMode="contain"
            style={[styles.image, { transform: [{ translateX }, { translateY }, { scale }] }]}
          />
        </View>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10} accessibilityLabel={t("common.close")}>
          <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
