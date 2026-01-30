import React, { useEffect } from "react";
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
  Easing,
} from "react-native-reanimated";
import { GestureHandlerRootView, PanGestureHandler } from "react-native-gesture-handler";
import Svg, { Circle } from "react-native-svg";
import Dots from "../components/Dots";

export default function OnboardScreen2({ navigation, route }) {
  const startAnimation = route?.params?.animateCircle;
  const circleAnim = useSharedValue(startAnimation ? 1 : 0);
  const starsAnim = useSharedValue(0);

  useEffect(() => {
    if (startAnimation) {
      circleAnim.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    }
  }, []);

  // Circle animation
  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(circleAnim.value, [0, 1], [0, -140]) },
      { translateY: interpolate(circleAnim.value, [0, 1], [0, 260]) },
      { rotate: `${interpolate(circleAnim.value, [0, 1], [0, -180])}deg` },
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

  const handleContinue = () => {
    circleAnim.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    starsAnim.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });

    setTimeout(() => {
      navigation.replace("QRScan", { animateCircle: true });
    }, 650);
  };

  // Swipe gesture
  const onGestureEvent = (event) => {
    const { translationX } = event.nativeEvent;

    if (translationX < -100) {
      // Swipe left → next screen
     navigation.navigate("Onboard3", { animateCircle: true });
    } else if (translationX > 100) {
      // Swipe right → previous screen
      navigation.navigate("Onboard1", { animateCircle: true });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={{ flex: 1 }}>
          {/* Circle */}
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
          <Animated.Image source={require("../assets/Star.png")} style={[styles.starLeft, starStyle]} />
          <Animated.Image source={require("../assets/Star.png")} style={[styles.starRight, starStyle]} />
          <Animated.Image source={require("../assets/Star.png")} style={[styles.starBottom, starStyle]} />

          {/* Top Image */}
          <ImageBackground
            source={require("../assets/onboard2.png")}
            style={styles.bg}
            resizeMode="cover"
          />

          {/* Bottom Blue Section */}
          <ImageBackground source={require("../assets/bgBlue.png")} style={styles.bg2}>
            <View style={styles.content}>
              <Text style={styles.title}>Smarter way to{"\n"}track every sale live</Text>
              <Text style={styles.subtitle}>
                From new leads to closed deals - track{"\n"}every moment as it happens
              </Text>

              <Dots active={1} />

              <TouchableOpacity style={styles.button} onPress={handleContinue}>
                <Text style={styles.buttonText}>Continue with</Text>
                <Image source={require("../assets/Axon ERP.png")} style={styles.icon} />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  circleContainer: { position: "absolute", top: -100, right: 240, zIndex: 50 },
  starLeft: { position: "absolute", top: 410, left: 10, width: 20, height: 20, zIndex: 50 },
  starRight: { position: "absolute", top: 320, right: -8, width: 24, height: 24, zIndex: 50 },
  starBottom: { position: "absolute", bottom: 200, left: 280, width: 22, height: 22, zIndex: 50 },
  bg: { width: "100%", height: 429.76 },
  bg2: { flex: 1, width: "100%", height: 390.27, top: -40, justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", gap: 8, marginLeft: 24, width: 307.01, height: 80 },
  title: { fontFamily: "SF Pro", fontWeight: "bold", fontSize: 34, color: "#fff", lineHeight: 36, letterSpacing: -0.02 },
  subtitle: { fontSize: 16, color: "#E5E7EB", marginTop: 12, lineHeight: 22 },
  button: { backgroundColor: "#FFFFFF", width: "100%", paddingVertical: 18, borderRadius: 10, marginTop: 30, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "400" },
  icon: { width: 82.07, height: 20, resizeMode: "contain" },
});






// import { View, Text, StyleSheet, ImageBackground,TouchableOpacity,Image } from "react-native";
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   interpolate,
// } from "react-native-reanimated";
// import { useEffect } from "react";
// import { Easing } from "react-native-reanimated";
// import Svg, { Circle } from "react-native-svg";
// import Dots from "../components/Dots";

// export default function OnboardScreen2({ navigation, route }) {

//   // Animation values
//    const startAnimation = route?.params?.animateCircle;

//   const circleAnim = useSharedValue(startAnimation ? 1 : 0);

//   useEffect(() => {
//     if (startAnimation) {
//       circleAnim.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
//     }
//   }, []);
//   // const circleAnim = useSharedValue(0);
//   const starsAnim = useSharedValue(0);

//   // Circle Animation
//   const circleStyle = useAnimatedStyle(() => {
//   return {
//     transform: [
//       { translateX: interpolate(circleAnim.value, [0,1], [0, -140]) },
//       { translateY: interpolate(circleAnim.value, [0,1], [0, 260]) },
//       { rotate: `${interpolate(circleAnim.value, [0,1], [0, -180])}deg` }
//     ]
//   };
// });

//   // Stars Animation
//   const starStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateY: interpolate(starsAnim.value, [0,1], [0, -100]) },
//       { translateX: interpolate(starsAnim.value, [0,1], [0, 50]) }
//     ],
//     opacity: interpolate(starsAnim.value, [0,1], [1, 0.3])
//   }));

//   const handleContinue = () => {
//   circleAnim.value = withTiming(1, {
//     duration: 700,
//     easing: Easing.out(Easing.quad)
//   });

//   starsAnim.value = withTiming(1, {
//     duration: 700,
//     easing: Easing.out(Easing.quad)
//   });

//   setTimeout(() => {
//     navigation.navigate("Onboard3");
//   }, 650);
// };


//   return (
//     <View style={{ flex: 1 }}>

//       {/* Half Circle Top Right */}
//       <Animated.View style={[styles.circleContainer, circleStyle]}>
//         <Svg height="200" width="200">
//           <Circle cx="100" cy="100" r="80" fill="transparent" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="40"
//           />
//            <Circle
//       cx="100"
//       cy="100"
//       r="85"
//       fill="#2954E5"
//     />
//         </Svg>
//       </Animated.View>

//       {/* Stars */}
//       {/* <Animated.Image source={require("../assets/Star.png")} style={[styles.starTop, starStyle]} /> */}
//       <Animated.Image source={require("../assets/Star.png")} style={[styles.starLeft, starStyle]} />
//       <Animated.Image source={require("../assets/Star.png")} style={[styles.starRight, starStyle]} />
//       <Animated.Image source={require("../assets/Star.png")} style={[styles.starBottom, starStyle]} />

//       {/* Top Image */}
//       <ImageBackground
//         source={require("../assets/onboard2.png")}
//         style={styles.bg}
//         resizeMode="cover"
//       />

//       {/* Bottom Blue Section */}
//       <ImageBackground source={require("../assets/bgBlue.png")} style={styles.bg2} >

//         <View style={styles.content}>

//           <Text style={styles.title}>Smarter way to{"\n"}track every sale live</Text>
//           <Text style={styles.subtitle}>
//             From new leads to closed deals - track{"\n"}every moment as it happens
//           </Text>

//           <Dots active={0} />

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
//   circleContainer:{ position:"absolute", top:-100, right:240, zIndex:50, },

//   starTop:{ position:"absolute", top:90, right:-2, width:22, height:22, zIndex:50 },
//   starLeft:{ position:"absolute", top:410, left:10, width:20, height:20, zIndex:50 },
//   starRight:{ position:"absolute", top:320, right:-8, width:24, height:24, zIndex:50 },
//   starBottom:{ position:"absolute", bottom:200, left:280, width:22, height:22, zIndex:50 },

//   //styles
//   bg:{ width:"100%", height:429.76 },
//   bg2:{ flex:1, width:"100%", height:390.27, top:-40, justifyContent:"center", },
//   content:{ flex:1, justifyContent:"center", gap:8, marginLeft:24, width:307.01, height:80 },
//   title:{ fontFamily:"SF Pro", fontWeight:"bold", fontSize:34, color:"#fff", lineHeight:36, letterSpacing:-0.02 },
//   subtitle:{ fontSize:16, color:"#E5E7EB", marginTop:12, lineHeight:22 },

//   button:{
//     backgroundColor:"#FFFFFF",
//     width:"100%",
//     paddingVertical:18,
//     borderRadius:10,
//     marginTop:30,
//     flexDirection:"row",
//     justifyContent:"center",
//     alignItems:"center",
//     gap:8
    
//   },
//   buttonText:{ color:"#000", fontSize:16, fontWeight:"400" },
//   icon:{ width:82.07, height:20, resizeMode:"contain" },
// });
