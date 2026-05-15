import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  itemId: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Entrada suave al montar / al cambiar el ítem (FlatList).
 * Evita re-ejecutar la animación si `itemId` no cambia.
 */
export function AnimatedFeedItem({ itemId, children, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(7)).current;
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (prevId.current === itemId) return;
    prevId.current = itemId;
    opacity.setValue(0);
    translateY.setValue(7);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [itemId, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
