import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  saveQRConfig,
  setLoginStatus,
  autoResetDailyVisitStatus,
} from "../db/database";
import { openUserDB } from "../db/dbManager";
import { UserContext } from "../context/UserContext";

import { fetchItemsFromAPIAndDB } from "../utils/fetchItemsFromAPIAndDB";
import { fetchCustomersFromAPIAndDB } from "../utils/fetchCustomersFromAPIAndDB";
import { fetchAccountsFromAPIAndDB } from "../utils/fetchAccountsFromAPIAndDB";

export default function ScanQRScreen({ navigation }) {
  const { updateUserName } = useContext(UserContext);

  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState("off");
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔐 Auto redirect if already logged in
  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = await AsyncStorage.getItem("logged_in");
      if (loggedIn === "true") navigation.replace("Home");
    };
    checkLogin();
  }, []);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Camera permission is required
        </Text>
        <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
          <Text style={styles.okText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------- Helpers ----------------

  const toggleFlash = () =>
    setFlashMode(flashMode === "off" ? "on" : "off");

  const startScanning = () => {
    setScannedData(null);
    setIsScanning(true);
  };

  // ---------------- QR Handler ----------------

  const handleBarcodeScanned = async ({ data }) => {
    if (!isScanning || scannedData) return;

    setIsScanning(false);
    setScannedData(data);
    setIsLoading(true);

    try {
      const qrPayload = JSON.parse(data.trim());
      const { baseUrl, qrString } = qrPayload;

      if (!baseUrl || !qrString) {
        throw new Error("Invalid QR data");
      }

      // 1️⃣ Initial login check
      const loginResponse = await fetch(
        `${baseUrl}/api/order-booking/check-connection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_code_data: qrString,
            last_seen: new Date().toISOString(),
          }),
        }
      );

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok || !loginResult.valid) {
        throw new Error(loginResult?.message || "Login failed");
      }

      const entity = loginResult.entity || {};
      const entityId = entity.entity_id;
      const entityName = entity.name || "User";

      if (!entityId) {
        throw new Error("Entity ID missing in QR");
      }

      // 2️⃣ Generate session_id
      const session_id = Math.floor(100000 + Math.random() * 900000);

      // 3️⃣ Save local data
      await AsyncStorage.multiSet([
        ["session_id", String(session_id)],
        ["dynamic_connection_url", baseUrl],
        ["current_user_id", String(entityId)],
        ["user_name", entityName],
        ["logged_in", "true"],
        ["qr_scanned", "true"],
      ]);

      // 4️⃣ Open DB
      await openUserDB(entityId, baseUrl);

      await autoResetDailyVisitStatus();

      await saveQRConfig({
        ...loginResult,
        session_id,
      });

      updateUserName(entityName);
      await setLoginStatus(true);

      // 5️⃣ Fetch master data
      await Promise.all([
        fetchItemsFromAPIAndDB(),
        fetchAccountsFromAPIAndDB(),
        fetchCustomersFromAPIAndDB(),
      ]);

      // 6️⃣ MANDATORY session confirmation
      let sessionConfirmed = false;

      try {
        const sessionResponse = await fetch(
          `${baseUrl}/api/order-booking/ob_login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id,
              entity_id: entityId,
            }),
          }
        );

        const sessionResult = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionResult?.success) {
          throw new Error(
            sessionResult?.message || "Session confirmation failed"
          );
        }

        sessionConfirmed = true;
      } catch (err) {
        Alert.alert(
          "Login Failed",
          "Session could not be established. Please scan QR again."
        );
      }

      // ❌ Stop here if session not confirmed
      if (!sessionConfirmed) {
        setIsLoading(false);
        setScannedData(null);
        setIsScanning(true);
        return;
      }

      // ✅ FINAL SUCCESS
      Alert.alert("Success", "Logged in successfully!");
      navigation.replace("Home");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "Invalid QR code");

      setIsLoading(false);
      setScannedData(null);
      setIsScanning(true);
    }
  };

  // ---------------- UI ----------------

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        flash={flashMode}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={styles.dimOverlay} />

      <BlurView intensity={20} tint="dark" style={styles.card}>
        <Text style={styles.title}>Scan to Login</Text>

        <Text style={styles.subtitle}>
          {isScanning
            ? "Place the QR inside the frame"
            : "Tap Scan Now to begin"}
        </Text>

        <Ionicons
          name="qr-code-outline"
          size={90}
          color="#fff"
          style={{ marginVertical: 20 }}
        />

        {!isScanning && !scannedData && !isLoading && (
          <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
            <Text style={styles.okText}>Scan Now</Text>
          </TouchableOpacity>
        )}

        {isLoading && (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.subtitle}>Logging in, please wait...</Text>
          </>
        )}
      </BlurView>

      <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
        <Feather name="zap" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ---------------- Styles ----------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { ...StyleSheet.absoluteFillObject },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  card: {
    width: 280,
    padding: 20,
    alignSelf: "center",
    marginTop: "65%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginVertical: 6,
  },
  okBtn: {
    backgroundColor: "#4678ff",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 10,
  },
  okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  flashBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 40,
  },
});




// Updated 22-1-2026
// import React, { useEffect, useState, useContext } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert,ActivityIndicator } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig, setLoginStatus, updateSessionId } from "../db/database";
// import { openUserDB } from "../db/dbManager";
// import { UserContext } from "../context/UserContext";
// import { autoResetDailyVisitStatus } from "../db/database";
// import { fetchItemsFromAPIAndDB } from "../utils/fetchItemsFromAPIAndDB";
// import { fetchCustomersFromAPIAndDB } from "../utils/fetchCustomersFromAPIAndDB";
// import { fetchAccountsFromAPIAndDB } from "../utils/fetchAccountsFromAPIAndDB";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);


//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") navigation.replace("Home");
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // ---------------- Functions ----------------
//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");

//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   const handleBarcodeScanned = async ({ data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);
//     setIsLoading(true);

//     try {
//       const qrPayload = JSON.parse(data.trim());
//       const { baseUrl, qrString } = qrPayload;

//       if (!baseUrl || !qrString) throw new Error("Missing QR data");

//       console.log("Base URL:", baseUrl);
//       console.log("QR String:", qrString);

//       // 1️⃣ First login request without session_id
//       const payload = {
//         qr_code_data: qrString,
//         last_seen: new Date().toISOString(),
//       };

      
//       const loginResponse = await fetch(
//         // `http://192.168.1.3:3000/api/order-booking/check-connection`,
//         `${baseUrl}/api/order-booking/check-connection`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         }
//       );

//       const loginResult = await loginResponse.json();
//       console.log("Login Result:", loginResult);

//       if (!loginResponse.ok || !loginResult.valid) {
//         throw new Error(loginResult?.message || "Login failed");
//       }

//       const entity = loginResult.entity || {};
//       const entityId = entity.entity_id;
//       const entityName = entity.name || "User";

//       if (!entityId) throw new Error("QR missing entity_id");

//       // 2️⃣ Generate session_id AFTER successful login
//       const session_id = Math.floor(100000 + Math.random() * 900000);
//       console.log("Generated session_id:", session_id);

//       await AsyncStorage.setItem("session_id", String(session_id));

//       // 3️⃣ Save user + session_id to local DB & AsyncStorage
//       await AsyncStorage.setItem("dynamic_connection_url", baseUrl);
//       await AsyncStorage.setItem("current_user_id", String(entityId));
//       await AsyncStorage.setItem("user_name", entityName);
//       await AsyncStorage.setItem("logged_in", "true");
//       await AsyncStorage.setItem("qr_scanned", "true");

//       // ⚠️ IMPORTANT: Fully initialize DB before any DB operations
//       try {
//         await openUserDB(entityId, baseUrl);
//         console.log("✅ Database opened successfully");
//       } catch (dbError) {
//         console.error("❌ Database initialization failed:", dbError);
//         throw new Error("Failed to initialize database: " + dbError.message);
//       }

//       // Wait before saving to ensure DB is ready
//       try {
//         await new Promise(resolve => setTimeout(resolve, 100)); // Small buffer
//         await autoResetDailyVisitStatus();
//         await saveQRConfig({
//           ...loginResult,
//           session_id: session_id, // store session_id in DB
//         });
//         console.log("✅ QR config saved successfully");
//       } catch (saveError) {
//         console.error("❌ Failed to save QR config:", saveError);
//         throw new Error("Failed to save login config: " + saveError.message);
//       }

//       updateUserName(entityName);
//       await setLoginStatus(true);

//        // 4️⃣ Fetch all data after login
//       await Promise.all([
//         fetchItemsFromAPIAndDB(),
//         fetchAccountsFromAPIAndDB(),
//         fetchCustomersFromAPIAndDB(),
//       ]);

//       // 4️⃣ Send session_id + entity_id + original qr_code_data to New API
//       const sessionPayload = {
//         session_id: session_id,
//         entity_id: entityId,
//       };

//       try {
//         const sessionResponse = await fetch(
//           `${baseUrl}/api/order-booking/ob_login`,
          
//         // `http://192.168.1.3:3000/api/order-booking/ob_login`,

//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(sessionPayload),
//           }
//         );
//         const sessionResult = await sessionResponse.json();
//         console.log("Session ID sent back result:", sessionResult);
//       } catch (err) {
//         console.log("Failed to send session_id back:", err);
//       }

//       Alert.alert("Success", "Logged in successfully!");
//       navigation.replace("Home");
//     } catch (error) {
//       console.log(error);
//       setIsLoading(false);
//       Alert.alert("Error", error.message || "Invalid QR code");
//       setScannedData(null);
//       setIsScanning(true);
//     }
//   };

//   // ---------------- JSX ----------------
//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />
//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>
//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />
//         {/* {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )} */}

//         {!isScanning && !scannedData && !isLoading && (
//   <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//     <Text style={styles.okText}>Scan Now</Text>
//   </TouchableOpacity>
// )}

//         {/* {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>} */}

//         {isLoading && (
//   <>
//     <ActivityIndicator size="large" color="#fff" style={{ marginTop: 15 }} />
//     <Text style={styles.subtitle}>Logging in, please wait...</Text>
//   </>
// )}

//       </BlurView>
//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// // ---------------- Styles ----------------
// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.65)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });






// import React, { useEffect, useState, useContext } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig, setLoginStatus } from "../db/database";
// import { openUserDB } from "../db/dbManager";
// import { UserContext } from "../context/UserContext";
// import { autoResetDailyVisitStatus } from "../db/database";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") navigation.replace("Home");
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const handleBarcodeScanned = async ({ data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);

//     try {
//       // Parse QR payload JSON
//       const qrPayload = JSON.parse(data.trim());
//       const { baseUrl, qrString } = qrPayload;

//       if (!baseUrl || !qrString) throw new Error("Missing QR data");

//       console.log("Base URL:", baseUrl);
//       console.log("QR String:", qrString);

//       const payload = {
//   qr_code_data: qrString,
//   status: "active",
//   last_seen: new Date().toISOString(),
// };
// console.log("📤 Sending payload to backend:", payload);

//       // Send encrypted QR string to backend dynamically
//       const loginResponse = await fetch(`${baseUrl}/api/order-booking/check-connection`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const loginResult = await loginResponse.json();
//       console.log("Login Result:", loginResult);

//       if (loginResponse.ok && loginResult.valid) {
//         const entity = loginResult.entity || {};
//         const entityId = entity.entity_id;
//         const entityName = entity.name || "User";

//         if (!entityId) throw new Error("QR missing entity_id");

//         // Save dynamic data & persist user
//         await AsyncStorage.setItem("dynamic_connection_url", baseUrl);
//         await AsyncStorage.setItem("current_user_id", String(entityId));
//         await AsyncStorage.setItem("user_name", entityName);
//         await AsyncStorage.setItem("logged_in", "true");
//         await AsyncStorage.setItem("qr_scanned", "true");

//         await openUserDB(entityId, baseUrl);
//         await autoResetDailyVisitStatus();
//         await saveQRConfig(loginResult);
//         updateUserName(entityName);
//         await setLoginStatus(true);

//         Alert.alert("Success", "Logged in successfully!");
//         navigation.replace("Home");
//       } else {
//         throw new Error(loginResult?.message || "Login failed");
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Error", error.message || "Invalid QR code");
//       setScannedData(null);
//       setIsScanning(true);
//     }
//   };

//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");
//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />
//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>
//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />
//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}
//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>
//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.65)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });






// Updated at 17-12-2025

// // src/screens/ScanQRScreen.js
// import React, { useEffect, useState, useContext } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig, setLoginStatus } from "../db/database";
// import { openUserDB } from "../db/dbManager";
// import { UserContext } from "../context/UserContext";
// import { autoResetDailyVisitStatus } from "../db/database";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") {
//         navigation.replace("Home");
//       }
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // -----------------------------
//   // Step 1: Validate QR on default staging server
//   // -----------------------------
//   const validateQRCode = async (qr) => {
//     try {
//       const defaultBaseUrl = "https://staging.axonerp.com";
//       const checkConnectionUrl = `${defaultBaseUrl}/api/order-booking/check-connection`;

//       const response = await fetch(checkConnectionUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });

//       const result = await response.json();
//       console.log("Check Connection Response:", result);

//       if (response.ok && result.valid) {
//         return result.qr_payload?.baseUrl || defaultBaseUrl;
//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");
//         return null;
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       return null;
//     }
//   };

//   // -----------------------------
//   // Step 2: Login with dynamic URL
//   // -----------------------------
//   const loginWithDynamicURL = async (qr, baseUrl) => {
//     try {
//       if (!baseUrl) {
//         Alert.alert("Error", "Base URL missing for login");
//         return;
//       }

//       const dynamicConnectionUrl = `${baseUrl}/api/order-booking/check-connection`;
//       console.log("Dynamic Connection URL:", dynamicConnectionUrl);

//       const loginResponse = await fetch(dynamicConnectionUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });

//       const loginResult = await loginResponse.json();
//       console.log("Login Response:", loginResult);

//       if (loginResponse.ok && loginResult.valid) {
//         const entity = loginResult.entity || {};
//         const entityId = entity.entity_id;
//         const entityName = entity.name || "User";

//         if (!entityId) {
//           Alert.alert("Error", "QR missing entity_id");
//           return;
//         }

//         // Save dynamic data and persist user
//         await AsyncStorage.setItem("dynamic_connection_url", baseUrl);
//         await AsyncStorage.setItem("current_user_id", String(entityId));
//         await AsyncStorage.setItem("user_name", entityName);
//         await AsyncStorage.setItem("logged_in", "true");
//         await AsyncStorage.setItem("qr_scanned", "true");

//         // ✅ OPEN DB with baseUrl for unique DB per company
//         await openUserDB(entityId, baseUrl);

//         await autoResetDailyVisitStatus();

//         await saveQRConfig(loginResult);
//         updateUserName(entityName);
//         await setLoginStatus(true);

//         Alert.alert("Success", "Logged in successfully!");
//         navigation.replace("Home");
//       } else {
//         Alert.alert("Error", loginResult?.message || "Login failed");
//         setScannedData(null);
//         setIsScanning(false);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   };

//   // -----------------------------
//   // Handle QR scan
//   // -----------------------------
//   const handleBarcodeScanned = async ({ type, data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);

//     const dynamicBaseUrl = await validateQRCode(data);
//     if (dynamicBaseUrl) {
//       await loginWithDynamicURL(data, dynamicBaseUrl);
//     } else {
//       setScannedData(null);
//       setIsScanning(true);
//     }
//   };

//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");
//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.65)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });



// Updated 15-12-2025
// // src/screens/ScanQRScreen.js
// import React, { useEffect, useState, useContext } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig, setLoginStatus } from "../db/database";
// import { openUserDB } from "../db/dbManager";
// import { UserContext } from "../context/UserContext";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") {
//         navigation.replace("Home");
//       }
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // -----------------------------
//   // Step 1: Validate QR on default staging server
//   // -----------------------------
//   const validateQRCode = async (qr) => {
//     try {
//       const defaultBaseUrl = "https://staging.axonerp.com";
//       const checkConnectionUrl = `${defaultBaseUrl}/api/order-booking/check-connection`;

//       const response = await fetch(checkConnectionUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });

//       const result = await response.json();
//       console.log("Check Connection Response:", result);

//       if (response.ok && result.valid) {
//         return result.qr_payload?.baseUrl || defaultBaseUrl;
//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");
//         return null;
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       return null;
//     }
//   };

//   // -----------------------------
//   // Step 2: Login with dynamic URL
//   // -----------------------------
//   const loginWithDynamicURL = async (qr, baseUrl) => {
//     try {
//       const dynamicConnectionUrl = `${baseUrl}/api/order-booking/check-connection`;
//       console.log("Dynamic Connection URL:", dynamicConnectionUrl);

//       const loginResponse = await fetch(dynamicConnectionUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });

//       const loginResult = await loginResponse.json();
//       console.log("Login Response:", loginResult);

//       if (loginResponse.ok && loginResult.valid) {
//         const entity = loginResult.entity || {};
//         const entityId = entity.entity_id;
//         const entityName = entity.name || "User";

//         if (!entityId) {
//           Alert.alert("Error", "QR missing entity_id");
//           return;
//         }

//         // Save dynamic data and persist user
//         await AsyncStorage.setItem("dynamic_connection_url", baseUrl);
//         await AsyncStorage.setItem("current_user_id", String(entityId));
//         await AsyncStorage.setItem("user_name", entityName);
//         await AsyncStorage.setItem("logged_in", "true");
//         await AsyncStorage.setItem("qr_scanned", "true");

//         await openUserDB(entityId);
//         await saveQRConfig(loginResult);
//         updateUserName(entityName);
//         await setLoginStatus(true);

//         Alert.alert("Success", "Logged in successfully!");
//         navigation.replace("Home");
//       } else {
//         Alert.alert("Error", loginResult?.message || "Login failed");
//         setScannedData(null);
//         setIsScanning(false);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   };

//   // -----------------------------
//   // Handle QR scan
//   // -----------------------------
//   const handleBarcodeScanned = async ({ type, data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);

//     const dynamicBaseUrl = await validateQRCode(data);
//     if (dynamicBaseUrl) {
//       await loginWithDynamicURL(data, dynamicBaseUrl);
//     } else {
//       setScannedData(null);
//       setIsScanning(true);
//     }
//   };

//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");
//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.65)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });



// // src/screens/ScanQRScreen.js
// import React, { useEffect, useState, useContext  } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig } from "../db/database";
// import { openUserDB, getCurrentUserId } from "../db/dbManager";
// import { setLoginStatus } from "../db/database"; // if you keep setLoginStatus here
// import { UserContext } from "../context/UserContext";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") {
//         navigation.replace("Home");
//       }
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>We need your permission to show the camera</Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//  const sendDataToServer = async (qr) => {
//   try {
//     // Step 1: default staging server to validate QR
//     const defaultBaseUrl = "https://staging.axonerp.com";
//     const checkConnectionUrl = `${defaultBaseUrl}/api/order-booking/check-connection`;

//     const response = await fetch(checkConnectionUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ qr_code_data: qr }),
//     });

//     const result = await response.json();
//     console.log("Check Connection Response:", result);

//     if (response.ok && result.valid) {
//       const entity = result.entity || {};
//       const entityId = entity.entity_id;
//       const entityName = entity.name || "User";

//       if (!entityId) {
//         Alert.alert("Error", "QR missing entity_id");
//         return;
//       }

//       // Step 2: Extract dynamic baseUrl
//       const baseUrl = result.qr_payload?.baseUrl || defaultBaseUrl;
//       console.log("Dynamic Base URL:", baseUrl);

//       // Step 3: Build dynamic connection URL
//       const dynamicConnectionUrl = `${baseUrl}/api/order-booking/check-connection`;
//       console.log("Dynamic Connection URL:", dynamicConnectionUrl);

//       // Step 4: Call the dynamic URL for login/connection
//       const loginResponse = await fetch(dynamicConnectionUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });
//       const loginResult = await loginResponse.json();
//       console.log("Login Response:", loginResult);

//       if (loginResponse.ok && loginResult.valid) {
//         // Save user info and persist
//         await openUserDB(entityId);
//         await saveQRConfig(loginResult);
//         updateUserName(entityName);

//         await AsyncStorage.setItem("current_user_id", String(entityId));
//         await AsyncStorage.setItem("user_name", entityName);
//         await AsyncStorage.setItem("logged_in", "true");
//         await setLoginStatus(true);
//         await AsyncStorage.setItem("qr_scanned", "true");

//         Alert.alert("Success", "Logged in successfully!");
//         navigation.replace("Home");
//       } else {
//         Alert.alert("Error", loginResult?.message || "Login failed");
//       }
//     } else {
//       Alert.alert("Error", result?.message || "Invalid QR Code");
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   } catch (error) {
//     console.log(error);
//     Alert.alert("Network Error", "Unable to reach the server.");
//     setScannedData(null);
//     setIsScanning(false);
//   }
// };


//   const handleBarcodeScanned = ({ type, data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);
//     sendDataToServer(data);
//   };

//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");
//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>{isScanning ? "Place the QR code inside the camera area" : "Tap 'Scan Now' to begin"}</Text>

//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
//   card: { width: 280, padding: 20, alignSelf: "center", marginTop: "65%", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, alignItems: "center" },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", marginVertical: 5 },
//   okBtn: { backgroundColor: "#4678ff", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30, marginTop: 10 },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: { position: "absolute", bottom: 40, alignSelf: "center", padding: 14, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 40 },
// });




// Updated 12-12-2025
// // src/screens/ScanQRScreen.js
// import React, { useEffect, useState, useContext  } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig } from "../db/database";
// import { openUserDB, getCurrentUserId } from "../db/dbManager";
// import { setLoginStatus } from "../db/database"; // if you keep setLoginStatus here
// import { UserContext } from "../context/UserContext";

// export default function ScanQRScreen({ navigation }) {
//   const { updateUserName } = useContext(UserContext);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await AsyncStorage.getItem("logged_in");
//       if (loggedIn === "true") {
//         navigation.replace("Home");
//       }
//     };
//     checkLogin();
//   }, []);

//   useEffect(() => {
//     if (!permission?.granted) requestPermission();
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;
//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>We need your permission to show the camera</Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const sendDataToServer = async (qr) => {
//     try {
//       const response = await fetch("https://staging.axonerp.com/api/order-booking/check-connection", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr_code_data: qr }),
//       });

//       const result = await response.json();
//       console.log("API Response:", result);

//       if (response.ok && result.valid) {
//         const entity = result.entity || {};
//         const entityId = entity.entity_id;
//         const entityName = entity.name || "User";

//         if (!entityId) {
//           Alert.alert("Error", "QR missing entity_id");
//           return;
//         }

//         // If different user previously opened, no need to delete old DB file.
//         // Just open the new user's DB which will automatically isolate data.
//         await openUserDB(entityId);

//         // Save QR config inside this user's DB
//         await saveQRConfig(result);

//         updateUserName(entityName);

//         // Persist current user id + name
//         await AsyncStorage.setItem("current_user_id", String(entityId));
//         await AsyncStorage.setItem("user_name", entityName);

//         // Set logged in flag - you already had a function for this
//         await AsyncStorage.setItem("logged_in", "true");
//         await setLoginStatus(true);

//         await AsyncStorage.setItem("qr_scanned", "true");

//         Alert.alert("Success", "Connection verified!");
//         navigation.replace("Home");
//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");
//         setScannedData(null);
//         setIsScanning(false);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   };

//   const handleBarcodeScanned = ({ type, data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);
//     sendDataToServer(data);
//   };

//   const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");
//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>{isScanning ? "Place the QR code inside the camera area" : "Tap 'Scan Now' to begin"}</Text>

//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
//   card: { width: 280, padding: 20, alignSelf: "center", marginTop: "65%", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, alignItems: "center" },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", marginVertical: 5 },
//   okBtn: { backgroundColor: "#4678ff", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30, marginTop: 10 },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: { position: "absolute", bottom: 40, alignSelf: "center", padding: 14, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 40 },
// });






// QRScanScreen.js
// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig, getLoginStatus, setLoginStatus } from "../db/database";

// export default function ScanQRScreen({ navigation }) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   // Check login status on mount
//   useEffect(() => {
//     const checkLogin = async () => {
//       const loggedIn = await getLoginStatus();
//       if (loggedIn) {
//         navigation.replace("Home");
//       }
//     };
//     checkLogin();
//   }, []);

//   // Request camera permission
//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const sendDataToServer = async (qr) => {
//     try {
//       const response = await fetch(
//         "https://staging.axonerp.com/api/order-booking/check-connection",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ qr_code_data: qr }),
//         }
//       );

//       const result = await response.json();
//       console.log("API Response:", result);

//       if (response.ok && result.valid) {
//         await saveQRConfig(result);

//         const entityName = result.entity?.name || "User";
//         await AsyncStorage.setItem("user_name", entityName);

//         // Set logged_in = true so next app open goes to Home
//         await setLoginStatus(true);
//         await AsyncStorage.setItem("qr_scanned", "true"); // optional

//         Alert.alert("Success", "Connection verified!");
//         navigation.replace("Home");
//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");
//         setScannedData(null);
//         setIsScanning(false);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   };

//   const handleBarcodeScanned = ({ type, data }) => {
//     if (!isScanning || scannedData) return;
//     setScannedData(data);
//     setIsScanning(false);
//     sendDataToServer(data);
//   };

//   const toggleFlash = () => {
//     setFlashMode(flashMode === "off" ? "on" : "off");
//   };

//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />

//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: { width: "100%", height: "100%", position: "absolute" },
//   dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });









// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig } from "../db/database";

// export default function ScanQRScreen({ navigation }) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>

//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const sendDataToServer = async (qr) => {
//     try {
//       const response = await fetch(
//         "https://staging.axonerp.com/api/order-booking/check-connection",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ qr_code_data: qr }),
//         }
//       );

//       const result = await response.json();
//       console.log("API Response:", result);

//       if (response.ok && result.valid) {

//         await saveQRConfig(result);

//         const entityName = result.entity?.name || "User";
//         await AsyncStorage.setItem("user_name", entityName);

//         await AsyncStorage.setItem("qr_scanned", "true");

//         Alert.alert("Success", "Connection verified!");
//         navigation.replace("Home");

//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");

//         // Reset to allow re-scan
//         setScannedData(null);
//         setIsScanning(false);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");

//       // Reset to allow re-scan
//       setScannedData(null);
//       setIsScanning(false);
//     }
//   };

//   const handleBarcodeScanned = ({ type, data }) => {
//     if (!isScanning || scannedData) return;

//     setScannedData(data);
//     setIsScanning(false);

//     sendDataToServer(data);
//   };

//   const toggleFlash = () => {
//     setFlashMode(flashMode === "off" ? "on" : "off");
//   };

//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />

//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>

//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code inside the camera area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && (
//           <Text style={styles.subtitle}>Processing QR Code...</Text>
//         )}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//   },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.65)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "65%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });



// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { saveQRConfig } from "../database";   

// export default function ScanQRScreen({ navigation }) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: "center", color: "#fff" }}>
//           We need your permission to show the camera
//         </Text>

//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // ============================================
//   // 🔥 SEND TO API + SAVE INTO SQLITE
//   // ============================================
//   const sendDataToServer = async (qr) => {
//     try {
//       const response = await fetch(
//         "https://staging.axonerp.com/api/order-booking/check-connection",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ qr_code_data: qr }),
//         }
//       );

//       const result = await response.json();
//       console.log("API Response:", result);

//       if (response.ok && result.valid) {

//         // Save to SQLite
//         await saveQRConfig(result);

//         // Save Name to AsyncStorage
//         const entityName = result.entity?.name || "User";
//         await AsyncStorage.setItem("user_name", entityName);

//         Alert.alert("Success", "Connection verified!");
//         navigation.navigate("MainTabs");
//       } else {
//         Alert.alert("Error", result?.message || "Invalid QR Code");
//         setIsScanning(true);
//       }
//     } catch (error) {
//       console.log(error);
//       Alert.alert("Network Error", "Unable to reach the server.");
//       setIsScanning(true);
//     }
//   };

//   // ============================================
//   // 📌 QR Scan Handler
//   // ============================================
//   const handleBarcodeScanned = ({ type, data }) => {
//     if (scannedData || !isScanning) return;

//     setScannedData(data);
//     setIsScanning(false);

//     console.log(`Scanned type: ${type}, Scanned data: ${data}`);

//     sendDataToServer(data);
//   };

//   const toggleFlash = () => {
//     setFlashMode(flashMode === "off" ? "on" : "off");
//   };

//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={handleBarcodeScanned}
//         barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
//       />

//       <View style={styles.dimOverlay} />

//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>

//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code properly inside the area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons
//           name="qr-code-outline"
//           size={90}
//           color="#fff"
//           style={{ marginVertical: 20 }}
//         />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && (
//           <View>
//             <Text style={styles.subtitle}>Processing QR Code...</Text>
//           </View>
//         )}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//   },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "70%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
// });



// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export default function ScanQRScreen({ navigation }) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);

//   if (!permission) return <View style={styles.container} />;

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center', color: '#fff' }}>
//           We need your permission to show the camera
//         </Text>

//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//           <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // 🔥 SEND TO API + SAVE JSON
//   const sendDataToServer = async (qr) => {
//   try {
//     // Save in AsyncStorage
//     await AsyncStorage.setItem("qr_code_data", JSON.stringify({ qr_code_data: qr }));

//     // API Call
//     const response = await fetch("https://staging.axonerp.com/api/order-booking/check-connection", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         qr_code_data: qr,   // <-- Correct field name
//       }),
//     });

//     const result = await response.json();
//     console.log("API Response:", result);

//    if (response.ok) {
//   // Save the entity name from API response
//   const entityName = result.entity?.name || "User";
//   await AsyncStorage.setItem("user_name", entityName);

//   Alert.alert("Success", "Connection verified!");
//   navigation.navigate("MainTabs");
// }
//  else {
//       Alert.alert("Error", result?.message || "Invalid QR Code");
//       setIsScanning(true);
//     }

//   } catch (error) {
//     console.log(error);
//     Alert.alert("Network Error", "Unable to reach the server.");
//     setIsScanning(true);
//   }
// };


//   // 📌 QR Scan Handler
//   const handleBarcodeScanned = ({ type, data }) => {
//     if (scannedData || !isScanning) return;

//     setScannedData(data);
//     setIsScanning(false);

//     console.log(`Scanned type: ${type}, Scanned data: ${data}`);

//     // SEND QR TO API
//     sendDataToServer(data);
//   };

//   const toggleFlash = () => {
//     setFlashMode(flashMode === "off" ? "on" : "off");
//   };

//   const startScanning = () => {
//     setScannedData(null);
//     setIsScanning(true);
//     Alert.alert("Ready to Scan", "Point your camera at the QR code.");
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={handleBarcodeScanned}
//         barcodeScannerSettings={{
//           barcodeTypes: ["qr"],
//         }}
//       />

//       <View style={styles.dimOverlay} />

//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>

//         <Text style={styles.subtitle}>
//           {isScanning
//             ? "Place the QR code properly inside the area"
//             : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />

//         {!isScanning && !scannedData && (
//           <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//             <Text style={styles.okText}>Scan Now</Text>
//           </TouchableOpacity>
//         )}

//         {scannedData && (
//           <View>
//             <Text style={styles.subtitle}>Processing QR Code...</Text>
//           </View>
//         )}
//       </BlurView>

//       <TouchableOpacity onPress={toggleFlash} style={styles.flashBtn}>
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   camera: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//   },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "70%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: { color: "#fff", fontSize: 16, fontWeight: "600" },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
//   button: {
//     backgroundColor: "#676de3ff",
//     width: "90%",
//     paddingVertical: 18,
//     borderRadius: 10,
//     marginTop: 30,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     position: "absolute",
//     bottom: 100,
//     alignSelf: "center",
//   },
//   buttonText: { color: "#fff", fontSize: 16, fontWeight: "400" },
// });







// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather, Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";

// export default function ScanQRScreen({ navigation }) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flashMode, setFlashMode] = useState("off");
//   const [scannedData, setScannedData] = useState(null);
//   const [isScanning, setIsScanning] = useState(false); 

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);

//   if (!permission) {
//     return <View style={styles.container} />;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center', color: '#fff' }}>We need your permission to show the camera</Text>
//         <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
//             <Text style={styles.okText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const handleBarcodeScanned = ({ type, data }) => {
//     if (scannedData || !isScanning) return; // Only scan if scanning is active and not already scanned

//     setScannedData(data);
//     setIsScanning(false); // Stop scanning after successful scan
//     console.log(`Scanned type: ${type}, Scanned data: ${data}`);

//     // Automatically navigate to home after a short delay
//     setTimeout(() => {
//       navigation.navigate("MainTabs");
//     }, 1000); // 1 second delay
//   };

//   const toggleFlash = () => {
//     setFlashMode(flashMode === "off" ? "on" : "off");
//   };

//   const startScanning = () => {
//     setScannedData(null); // Clear previous data
//     setIsScanning(true); // Start scanning
//     Alert.alert("Ready to Scan", "Point your camera at the QR code.");
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flashMode}
//         onBarcodeScanned={handleBarcodeScanned}
//         barcodeScannerSettings={{
//           barcodeTypes: ['qr'],
//         }}
//       />

//       <View style={styles.dimOverlay} />

//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
        
//         {/* Update subtitle based on state */}
//         <Text style={styles.subtitle}>
//           {isScanning ? "Place the QR code properly inside the area" : "Tap 'Scan Now' to begin"}
//         </Text>

//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />
        
//         {/* Dynamic button for user action */}
//         {!isScanning && !scannedData && (
//             <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
//                 <Text style={styles.okText}>Scan Now</Text>
//             </TouchableOpacity>
//         )}

//         {/* Display scanned code and status */}
//         {scannedData && (
//           <View>
//             <Text style={styles.subtitle}>Scanned Code: {scannedData}</Text>
//             <Text style={styles.subtitle}>Navigating to Home...</Text>
//           </View>
//         )}
//       </BlurView>

//       <TouchableOpacity
//         onPress={toggleFlash}
//         style={styles.flashBtn}
//       >
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>

//        {/* Continue with Axon ERP button */}
//        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("MainTabs")}>
//            <Text style={styles.buttonText}>Continue with</Text>
//            {/* Replace with your actual image path */}
//            {/* <Image
//             source={require("../assets/Axon ERP.png")}
//             style={styles.icon}
//           /> */}
//            <Text style={styles.buttonText}>Axon ERP</Text>
//         </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   camera: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//   },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)",
//   },
//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "70%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 6,
//   },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//     marginVertical: 5,
//   },
//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },
//   button:{
//     backgroundColor:"#676de3ff",
//     width:"90%",
//     paddingVertical:18,
//     borderRadius:10,
//     marginTop:30,
//     flexDirection:"row",
//     justifyContent:"center",
//     alignItems:"center",
//     gap:8,
//     position: 'absolute',
//     bottom: 100,
//     alignSelf: 'center',
//   },
//   buttonText:{ color:"#ffffffff", fontSize:16, fontWeight:"400" },
//   icon:{ width:82.07, height:20, resizeMode:"contain" },
// });










// OLD CODE:


// import React, { useState } from 'react';
// import { StyleSheet, Text, View,Button } from 'react-native';
// import { CameraView, useCameraPermissions } from 'expo-camera';
// import { StatusBar } from 'expo-status-bar';

// export default function QRScanScreen() {
//   const [scannedData, setScannedData] = useState(null);
//   const [permission, requestPermission] = useCameraPermissions();

//   if (!permission) {
//     // Camera permissions are not granted yet.
//     return <View />;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
//         <Button onPress={requestPermission} title="grant permission" />
//       </View>
//     );
//   }

//   const handleBarcodeScanned = ({ type, data }) => {
//     setScannedData(data);
//     console.log(`Scanned type: ${type}, Scanned data: ${data}`);
//     // Here you can add logic to navigate or process the data
//   };

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.camera}
//         onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
//         barcodeScannerSettings={{
//           barcodeTypes: ['qr'], // Specify that we only want to scan QR codes
//         }}
//       >
//         {scannedData && (
//           <Text style={styles.scanText}>Scanned: {scannedData}</Text>
//         )}
//       </CameraView>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//   },
//   camera: {
//     flex: 1,
//   },
//   scanText: {
//     position: 'absolute',
//     bottom: 20,
//     alignSelf: 'center',
//     backgroundColor: 'white',
//     padding: 10,
//   }
// });


// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet,Image, ImageBackground } from "react-native";
// import { CameraView, useCameraPermissions } from "expo-camera";
// import { Feather,Ionicons  } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";

// export default function ScanQRScreen({navigation}) {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [flash, setFlash] = useState("off");

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, []);

//   if (!permission) return <View />;

//    const handleContinue = () => {

//       setTimeout(() => {
//         navigation.navigate("MainTabs");
//       }, 650);
//     };

//   return (
//     <View style={styles.container}>
//       {/* Full camera background */}
//       <CameraView
//         style={styles.camera}
//         facing="back"
//         flash={flash}
//       />

//       {/* Overlay dim background */}
//       <View style={styles.dimOverlay} />

//       {/* Center card */}
//       <BlurView intensity={20} tint="dark" style={styles.card}>
//         <Text style={styles.title}>Scan to Login</Text>
//         <Text style={styles.subtitle}>Place the QR code properly inside the area</Text>

//         {/* QR dummy icon */}
//         <Ionicons name="qr-code-outline" size={90} color="#fff" style={{ marginVertical: 20 }} />

//         <TouchableOpacity style={styles.okBtn}>
//           <Text style={styles.okText}>Ok</Text>
//         </TouchableOpacity>
//       </BlurView>

//       {/* Flashlight button */}
//       <TouchableOpacity
//         onPress={() => setFlash(flash === "off" ? "on" : "off")}
//         style={styles.flashBtn}
//       >
//         <Feather name="zap" size={26} color="#fff" />
//       </TouchableOpacity>

//        <TouchableOpacity style={styles.button} onPress={handleContinue}>
//                    <Text style={styles.buttonText}>Continue with</Text>
//                    <Image
//                     source={require("../assets/Axon ERP.png")}
//                     style={styles.icon}
//                   />
//                 </TouchableOpacity>
//     </View>

//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   camera: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//   },
//   dimOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)",
//   },

//   card: {
//     width: 280,
//     padding: 20,
//     alignSelf: "center",
//     marginTop: "70%",
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 20,
//     alignItems: "center",
//   },

//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 6,
//   },
//   subtitle: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     textAlign: "center",
//   },

//   okBtn: {
//     backgroundColor: "#4678ff",
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 30,
//     marginTop: 10,
//   },
//   okText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },

//   flashBtn: {
//     position: "absolute",
//     bottom: 40,
//     alignSelf: "center",
//     padding: 14,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     borderRadius: 40,
//   },

//      button:{
//     backgroundColor:"#676de3ff",
//     width:"100%",
//     paddingVertical:18,
//     borderRadius:10,
//     marginTop:30,
//     flexDirection:"row",
//     justifyContent:"center",
//     alignItems:"center",
//     gap:8

//   },
//   buttonText:{ color:"#ffffffff", fontSize:16, fontWeight:"400" },
//   icon:{ width:82.07, height:20, resizeMode:"contain" },
// });
