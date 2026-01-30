import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

export default function FloatingDecor({ trigger }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rotate, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(move, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start(() => {
      rotate.setValue(0);
      move.setValue(0);
    });
  }, [trigger]);

  const rot = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "25deg"],
  });

  const translate = move.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/circle.png")}
        style={[
          styles.circle,
          {
            transform: [{ rotate: rot }, { translateY: translate }],
          },
        ]}
      />

      <Animated.Image
        source={require("../assets/Star.png")}
        style={[
          styles.star1,
          {
            transform: [{ rotate: rot }, { translateY: translate }],
          },
        ]}
      />

      <Animated.Image
        source={require("../assets/Star.png")}
        style={[
          styles.star2,
          {
            transform: [{ rotate: rot }, { translateX: translate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", zIndex: 30 },
  circle: {
    width: 140,
    height: 140,
    position: "absolute",
    top: -50,
    right: -10,
    opacity: 0.9,
  },
  star1: {
    width: 22,
    height: 22,
    position: "absolute",
    top: 60,
    right: 140,
  },
  star2: {
    width: 18,
    height: 18,
    position: "absolute",
    top: 10,
    right: 80,
  },
});
