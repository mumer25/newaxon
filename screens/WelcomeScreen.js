import React, { useEffect } from "react";
import { View, Text, Image, ImageBackground, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WelcomeScreen({ navigation }) {
  useEffect(() => {
    const checkNavigation = async () => {
      const timer = setTimeout(async () => {
        // Check first launch
        const launched = await AsyncStorage.getItem("alreadyLaunched");
        if (!launched) {
          await AsyncStorage.setItem("alreadyLaunched", "true");
          navigation.replace("Onboard1");
          return;
        }

        // Check QR Code Scan status
        const qrScanned = await AsyncStorage.getItem("qr_scanned");
        if (!qrScanned || qrScanned !== "true") {
          navigation.replace("QRScan");
        } else {
          navigation.replace("Home");
        }
      }, 2000);

      return () => clearTimeout(timer);
    };

    checkNavigation();
  }, []);

  return (
    <ImageBackground
      source={require("../assets/WelcomeBg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View style={styles.container}>
        <Text style={styles.title}>Welcome back</Text>

        <Image
          source={require("../assets/Axon ERP.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)", // Slight overlay
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 30,
    lineHeight: 48,
    letterSpacing: -2,
    fontWeight: "600",
    color: "#2F60AF",
    textAlign: "center",
    marginBottom: 16,
  },
  logo: {
    width: 213,
    height: 47,
    marginTop: 10,
  },
});




// import {
//   View,
//   Text,
//   Image,
//   ImageBackground,
//   StyleSheet,
// } from "react-native";
// import { useEffect } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export default function WelcomeScreen({ navigation, firstLaunch }) {
//   useEffect(() => {
//     const timer = setTimeout(async () => {
//       if (firstLaunch) {
//         navigation.replace("Onboard1");
//         return;
//       }

//       // --- Check QR Code Scan Status ---
//       const qrScanned = await AsyncStorage.getItem("qr_scanned");

//       if (!qrScanned) {
//         navigation.replace("QRScan"); // Not scanned → go to Scan screen
//       } else {
//         navigation.replace("Home"); // Already scanned → go Home
//       }
//     }, 2000);

//     return () => clearTimeout(timer);
//   }, [firstLaunch]);

//   return (
//     <ImageBackground
//       source={require("../assets/WelcomeBg.png")}
//       style={styles.bg}
//       resizeMode="cover"
//     >
//       <View style={styles.overlay} />

//       <View style={styles.container}>
//         <Text style={styles.title}>Welcome back</Text>

//         <Image
//           source={require("../assets/Axon ERP.png")}
//           style={styles.logo}
//           resizeMode="contain"
//         />
//       </View>
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   bg: {
//     flex: 1,
//     width: "100%",
//     height: "100%",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   title: {
//     fontSize: 30,
//     lineHeight: 48,
//     letterSpacing: -2,
//     fontWeight: "600",
//     color: "#2F60AF",
//     textAlign: "center",
//     marginBottom: 16,
//   },
//   logo: {
//     width: 213,
//     height: 47,
//     marginTop: 10,
//   },
// });




// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   ImageBackground,
// } from "react-native";
// import { useEffect } from "react";
// export default function WelcomeScreen({ navigation }) {
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       navigation.navigate("Onboard1");
//     }, 2000); // 2 seconds

//     return () => clearTimeout(timer);
//   }, []);
//   return (
//     <ImageBackground
//       source={require("../assets/WelcomeBg.png")}
//       style={styles.bg}
//       resizeMode="cover"
//     >
//       <View style={styles.overlay}></View>

//       <View style={styles.container}>
//         <Text style={styles.title}>Welcome back</Text>

//         <Image
//           source={require("../assets/Axon ERP.png")}
//           style={styles.logo}
//           resizeMode="contain"
//         />
//       </View>
//     </ImageBackground>
//   );
// }

// const styles = StyleSheet.create({
//   bg: {
//     flex: 1,
//     width: "100%",
//     height: "100%",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//     gap: 16,
//   },
//   title: {
//     fontSize: 30,
//     lineHeight: 48,
//     letterSpacing: -2,
//     fontWeight: "semibold",
//     color: "#2F60AF",
//     alignItems: "center",
//   },

//   logo: {
//     width: 213.22,
//     height: 46.98,
//     marginBottom: 30,
//   },
// });
