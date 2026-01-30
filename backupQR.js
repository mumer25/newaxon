import React, { useEffect, useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert,ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveQRConfig, setLoginStatus, updateSessionId } from "../db/database";
import { openUserDB } from "../db/dbManager";
import { UserContext } from "../context/UserContext";
import { autoResetDailyVisitStatus } from "../db/database";
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
        <Text style={{ textAlign: "center", color: "#fff" }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity style={styles.okBtn} onPress={requestPermission}>
          <Text style={styles.okText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------- Functions ----------------
  const toggleFlash = () => setFlashMode(flashMode === "off" ? "on" : "off");

  const startScanning = () => {
    setScannedData(null);
    setIsScanning(true);
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (!isScanning || scannedData) return;
    setScannedData(data);
    setIsScanning(false);
    setIsLoading(true);

    try {
      const qrPayload = JSON.parse(data.trim());
      const { baseUrl, qrString } = qrPayload;

      if (!baseUrl || !qrString) throw new Error("Missing QR data");

      console.log("Base URL:", baseUrl);
      console.log("QR String:", qrString);

      // 1️⃣ First login request without session_id
      const payload = {
        qr_code_data: qrString,
        last_seen: new Date().toISOString(),
      };

      
      const loginResponse = await fetch(
        // `http://192.168.1.3:3000/api/order-booking/check-connection`,
        `${baseUrl}/api/order-booking/check-connection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const loginResult = await loginResponse.json();
      console.log("Login Result:", loginResult);

      if (!loginResponse.ok || !loginResult.valid) {
        throw new Error(loginResult?.message || "Login failed");
      }

      const entity = loginResult.entity || {};
      const entityId = entity.entity_id;
      const entityName = entity.name || "User";

      if (!entityId) throw new Error("QR missing entity_id");

      // 2️⃣ Generate session_id AFTER successful login
      const session_id = Math.floor(100000 + Math.random() * 900000);
      console.log("Generated session_id:", session_id);

      await AsyncStorage.setItem("session_id", String(session_id));

      // 3️⃣ Save user + session_id to local DB & AsyncStorage
      await AsyncStorage.setItem("dynamic_connection_url", baseUrl);
      await AsyncStorage.setItem("current_user_id", String(entityId));
      await AsyncStorage.setItem("user_name", entityName);
      await AsyncStorage.setItem("logged_in", "true");
      await AsyncStorage.setItem("qr_scanned", "true");

      // ⚠️ IMPORTANT: Fully initialize DB before any DB operations
      try {
        await openUserDB(entityId, baseUrl);
        console.log("✅ Database opened successfully");
      } catch (dbError) {
        console.error("❌ Database initialization failed:", dbError);
        throw new Error("Failed to initialize database: " + dbError.message);
      }

      // Wait before saving to ensure DB is ready
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small buffer
        await autoResetDailyVisitStatus();
        await saveQRConfig({
          ...loginResult,
          session_id: session_id, // store session_id in DB
        });
        console.log("✅ QR config saved successfully");
      } catch (saveError) {
        console.error("❌ Failed to save QR config:", saveError);
        throw new Error("Failed to save login config: " + saveError.message);
      }

      updateUserName(entityName);
      await setLoginStatus(true);

       // 4️⃣ Fetch all data after login
      await Promise.all([
        fetchItemsFromAPIAndDB(),
        fetchAccountsFromAPIAndDB(),
        fetchCustomersFromAPIAndDB(),
      ]);

      // 4️⃣ Send session_id + entity_id + original qr_code_data to New API
      const sessionPayload = {
        session_id: session_id,
        entity_id: entityId,
      };

      try {
        const sessionResponse = await fetch(
          `${baseUrl}/api/order-booking/ob_login`,
          
        // `http://192.168.1.3:3000/api/order-booking/ob_login`,

          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionPayload),
          }
        );
        const sessionResult = await sessionResponse.json();
        console.log("Session ID sent back result:", sessionResult);
      } catch (err) {
        console.log("Failed to send session_id back:", err);
      }

      Alert.alert("Success", "Logged in successfully!");
      navigation.replace("Home");
    } catch (error) {
      console.log(error);
      setIsLoading(false);
      Alert.alert("Error", error.message || "Invalid QR code");
      setScannedData(null);
      setIsScanning(true);
    }
  };

  // ---------------- JSX ----------------
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
            ? "Place the QR code inside the camera area"
            : "Tap 'Scan Now' to begin"}
        </Text>
        <Ionicons
          name="qr-code-outline"
          size={90}
          color="#fff"
          style={{ marginVertical: 20 }}
        />
        {/* {!isScanning && !scannedData && (
          <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
            <Text style={styles.okText}>Scan Now</Text>
          </TouchableOpacity>
        )} */}

        {!isScanning && !scannedData && !isLoading && (
  <TouchableOpacity style={styles.okBtn} onPress={startScanning}>
    <Text style={styles.okText}>Scan Now</Text>
  </TouchableOpacity>
)}

        {/* {scannedData && <Text style={styles.subtitle}>Processing QR Code...</Text>} */}

        {isLoading && (
  <>
    <ActivityIndicator size="large" color="#fff" style={{ marginTop: 15 }} />
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
  camera: { width: "100%", height: "100%", position: "absolute" },
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
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginVertical: 5,
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
