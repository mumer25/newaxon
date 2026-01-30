import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { PanGestureHandler } from "react-native-gesture-handler";
import Dots from "../components/Dots";

export default function OnboardScreen1({ navigation }) {
  const circleAnim = useSharedValue(0);
  const starsAnim = useSharedValue(0);

  // Circle animation
  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(circleAnim.value, [0, 1], [0, 140]) },
      { translateY: interpolate(circleAnim.value, [0, 1], [0, -260]) },
      { rotate: `${interpolate(circleAnim.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  // Stars animation
  const starStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(starsAnim.value, [0, 1], [0, -100]) },
      { translateX: interpolate(starsAnim.value, [0, 1], [0, 50]) },
    ],
    opacity: interpolate(starsAnim.value, [0, 1], [1, 0.3]),
  }));

  // ✅ Animation and navigation for swipe
  const animateAndNavigateToNext = () => {
    circleAnim.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
    starsAnim.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });

    setTimeout(() => {
      navigation.navigate("Onboard2");
    }, 650);
  };

  // ✅ Directly navigate to QR screen on button press
  const handleContinue = () => {
    navigation.replace("QRScan");
  };

  // ✅ Handle Swipe Gesture (only left swipe)
  const onGestureEvent = ({ nativeEvent }) => {
    if (nativeEvent.translationX < -60) {
      animateAndNavigateToNext();
    }
  };

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent}>
      <Animated.View style={{ flex: 1 }}>
        {/* Decorative Circle */}
        <Animated.View style={[styles.circleContainer, circleStyle]}>
          <Svg height="200" width="200">
            <Circle
              cx="100"
              cy="100"
              r="80"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="40"
            />
            <Circle cx="100" cy="100" r="85" fill="#2954E5" />
          </Svg>
        </Animated.View>

        {/* Stars */}
        <Animated.Image
          source={require("../assets/Star.png")}
          style={[styles.starTop, starStyle]}
        />
        <Animated.Image
          source={require("../assets/Star.png")}
          style={[styles.starRight, starStyle]}
        />
        <Animated.Image
          source={require("../assets/Star.png")}
          style={[styles.starBottom, starStyle]}
        />

        {/* Top Image */}
        <ImageBackground
          source={require("../assets/onboard1.png")}
          style={styles.bg}
          resizeMode="cover"
        />

        {/* Bottom Section */}
        <ImageBackground
          source={require("../assets/bgBlue.png")}
          style={styles.bg2}
        >
          <View style={styles.content}>
            <Text style={styles.title}>
              Recover payments.{"\n"}Rebuild clarity
            </Text>
            <Text style={styles.subtitle}>
              See pending invoices, send reminders,{"\n"}and get paid — all from
              one screen
            </Text>

            <Dots active={2} />

            {/* Button navigates to QR screen */}
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue with</Text>
              <Image
                source={require("../assets/Axon ERP.png")}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  circleContainer: { position: "absolute", top: -50, right: 280, zIndex: 50 },
  starTop: {
    position: "absolute",
    top: 90,
    right: -2,
    width: 22,
    height: 22,
    zIndex: 50,
  },
  starRight: {
    position: "absolute",
    top: 320,
    right: -8,
    width: 24,
    height: 24,
    zIndex: 50,
  },
  starBottom: {
    position: "absolute",
    bottom: 84,
    left: 0,
    width: 22,
    height: 22,
    zIndex: 50,
  },
  bg: { width: "100%", height: 429.76 },
  bg2: {
    flex: 1,
    width: "100%",
    height: 390.27,
    top: -61,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
    marginLeft: 24,
    width: 307.01,
    height: 80,
  },
  title: {
    fontFamily: "SF Pro",
    fontWeight: "bold",
    fontSize: 34,
    color: "#fff",
    lineHeight: 36,
    letterSpacing: -0.02,
  },
  subtitle: { fontSize: 15, color: "#E5E7EB", marginTop: 12, lineHeight: 22 },
  button: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 10,
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "400" },
  icon: { width: 82.07, height: 20, resizeMode: "contain" },
});





// import {
//   View,
//   Text,
//   StyleSheet,
//   ImageBackground,
//   TouchableOpacity,
//   Image,
// } from "react-native";
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   interpolate,
// } from "react-native-reanimated";
// import { Easing } from "react-native-reanimated";
// import Svg, { Circle } from "react-native-svg";
// import Dots from "../components/Dots";

// export default function OnboardScreen1({ navigation }) {
//   // Animation values
//   const circleAnim = useSharedValue(0);
//   const starsAnim = useSharedValue(0);

//   // Circle Animation
//   const circleStyle = useAnimatedStyle(() => {
//     return {
//       transform: [
//         { translateX: interpolate(circleAnim.value, [0, 1], [0, 140]) }, // move right
//         { translateY: interpolate(circleAnim.value, [0, 1], [0, -260]) }, // move up to next screen place
//         { rotate: `${interpolate(circleAnim.value, [0, 1], [0, 180])}deg` },
//       ],
//     };
//   });

//   // Stars Animation
//   const starStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateY: interpolate(starsAnim.value, [0, 1], [0, -100]) },
//       { translateX: interpolate(starsAnim.value, [0, 1], [0, 50]) },
//     ],
//     opacity: interpolate(starsAnim.value, [0, 1], [1, 0.3]),
//   }));

//   const handleContinue = () => {
//     circleAnim.value = withTiming(1, {
//       duration: 700,
//       easing: Easing.out(Easing.quad),
//     });
//     starsAnim.value = withTiming(1, {
//       duration: 700,
//       easing: Easing.out(Easing.quad),
//     });

//     setTimeout(() => {
//       navigation.navigate("Onboard2", { animateCircle: true });
//     }, 650);
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       {/* Half Circle Top Right */}
//       <Animated.View style={[styles.circleContainer, circleStyle]}>
//         <Svg height="200" width="200">
//           <Circle
//             cx="100"
//             cy="100"
//             r="80"
//             fill="transparent"
//             stroke="rgba(255, 255, 255, 0.3)"
//             strokeWidth="40"
//           />
//           <Circle cx="100" cy="100" r="85" fill="#2954E5" />
//         </Svg>
//       </Animated.View>

//       {/* Stars */}
//       <Animated.Image
//         source={require("../assets/Star.png")}
//         style={[styles.starTop, starStyle]}
//       />
//       {/* <Animated.Image source={require("../assets/Star.png")} style={[styles.starLeft, starStyle]} /> */}
//       <Animated.Image
//         source={require("../assets/Star.png")}
//         style={[styles.starRight, starStyle]}
//       />
//       <Animated.Image
//         source={require("../assets/Star.png")}
//         style={[styles.starBottom, starStyle]}
//       />

//       {/* Top Image */}
//       <ImageBackground
//         source={require("../assets/onboard1.png")}
//         style={styles.bg}
//         resizeMode="cover"
//       />

//       {/* Bottom Blue Section */}
//       <ImageBackground
//         source={require("../assets/bgBlue.png")}
//         style={styles.bg2}
//       >
//         <View style={styles.content}>
//           <Text style={styles.title}>
//             Recover payments.{"\n"}Rebuild clarity
//           </Text>
//           <Text style={styles.subtitle}>
//             See pending invoices, send reminders,{"\n"}and get paid - all from
//             one screen
//           </Text>

//           <Dots active={2} />

//           <TouchableOpacity style={styles.button} onPress={handleContinue}>
//             <Text style={styles.buttonText}>Continue with</Text>
//             <Image
//               source={require("../assets/Axon ERP.png")}
//               style={styles.icon}
//             />
//           </TouchableOpacity>
//         </View>
//       </ImageBackground>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   // Decorative shapes positions
//   circleContainer: { position: "absolute", top: -50, right: 280, zIndex: 50 },

//   starTop: {
//     position: "absolute",
//     top: 90,
//     right: -2,
//     width: 22,
//     height: 22,
//     zIndex: 50,
//   },
//   starLeft: {
//     position: "absolute",
//     top: 160,
//     left: 20,
//     width: 20,
//     height: 20,
//     zIndex: 50,
//   },
//   starRight: {
//     position: "absolute",
//     top: 320,
//     right: -8,
//     width: 24,
//     height: 24,
//     zIndex: 50,
//   },
//   starBottom: {
//     position: "absolute",
//     bottom: 84,
//     left: 0,
//     width: 22,
//     height: 22,
//     zIndex: 50,
//   },

//   //styles
//   bg: { width: "100%", height: 429.76 },
//   bg2: {
//     flex: 1,
//     width: "100%",
//     height: 390.27,
//     top: -61,
//     justifyContent: "center",
//   },
//   content: {
//     flex: 1,
//     justifyContent: "center",
//     gap: 8,
//     marginLeft: 24,
//     width: 307.01,
//     height: 80,
//   },
//   title: {
//     fontFamily: "SF Pro",
//     fontWeight: "bold",
//     fontSize: 34,
//     color: "#fff",
//     lineHeight: 36,
//     letterSpacing: -0.02,
//   },
//   subtitle: { fontSize: 15, color: "#E5E7EB", marginTop: 12, lineHeight: 22 },

//   button: {
//     backgroundColor: "#FFFFFF",
//     width: "100%",
//     paddingVertical: 18,
//     borderRadius: 10,
//     marginTop: 30,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     gap: 8,
//   },
//   buttonText: { color: "#000", fontSize: 16, fontWeight: "400" },
//   icon: { width: 82.07, height: 20, resizeMode: "contain" },
// });
