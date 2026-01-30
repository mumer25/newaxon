// src/screens/ProfileScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getActiveStatus, setLoginStatus, clearUserData, logoutDB } from "../db/database";
import { closeUserDB, deleteUserDB, openUserDB  } from "../db/dbManager";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { UserContext } from "../context/UserContext";

const { width, height } = Dimensions.get("window");
const RF = (size) => Math.round((size / 375) * width);

export default function ProfileScreen({ navigation }) {
  const isLoggingOutRef = React.useRef(false);

  const { userName, updateUserName } = useContext(UserContext);
const [companyName, setCompanyName] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const [status, setStatus] = useState("inActive"); // ✅ DEFINE STATE

  // useFocusEffect(
  //   useCallback(() => {
  //     const loadStatus = async () => {
  //       const entityId = await AsyncStorage.getItem("current_user_id");
  //       const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");

  //       if (!entityId || !baseUrl) return;

  //       await openUserDB(entityId, baseUrl); // 🔑 VERY IMPORTANT

  //       const dbStatus = await getActiveStatus();
  //       console.log("👤 Profile fetched status:", dbStatus);

  //       setStatus(dbStatus);
  //     };

  //     loadStatus();
  //   }, [])
  // );

  useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const loadStatusAndCompany = async () => {
      if (isLoggingOutRef.current) return;

      const entityId = await AsyncStorage.getItem("current_user_id");
      const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");

      if (!entityId || !baseUrl) return;

      try {
        await openUserDB(entityId, baseUrl);
        const dbStatus = await getActiveStatus();
        if (isActive) setStatus(dbStatus);
      } catch (err) {
        console.log("⚠️ Profile load skipped:", err.message);
      }
    };

    loadStatusAndCompany();

    return () => {
      isActive = false;
    };
  }, [])
);



  useEffect(() => {
    setEditName(userName);
  }, [userName]);

  const saveName = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    updateUserName(editName);
    Alert.alert("Success", "Name Updated Successfully");
    setModalVisible(false);
  };

  // const logout = async () => {
  //   await setLoginStatus(false);
  //   await AsyncStorage.setItem("logged_in", "false");
  //   await closeUserDB();
  //   await AsyncStorage.multiRemove(["qr_scanned"]);
  //   navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
  // };
const logout = async () => {
  try {
    isLoggingOutRef.current = true;

    // 1️⃣ Stop sync / DB usage first
    await setLoginStatus(false);

    // 2️⃣ Clear session from DB (guarded internally)
    try {
      await logoutDB();
    } catch (e) {
      console.log("ℹ️ logoutDB skipped:", e.message);
    }

    // 3️⃣ Clear AsyncStorage
    await AsyncStorage.multiRemove([
      "logged_in",
      "qr_scanned",
      "session_id",
      "current_user_id",
      "user_name",
      "dynamic_connection_url",
      "current_db_key",
    ]);

    // 4️⃣ Close DB LAST
    await closeUserDB();

    // 5️⃣ Navigate AFTER everything is done
    navigation.reset({
      index: 0,
      routes: [{ name: "QRScan" }],
    });
  } catch (err) {
    console.log("❌ Logout error:", err);
    Alert.alert("Error", "Failed to logout safely.");
  }
};


  const deleteAllData = async () => {
    Alert.alert(
      "Delete All Data",
      "Are you sure you want to delete all user data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUserId = await AsyncStorage.getItem("current_user_id");
              if (currentUserId) {
                await clearUserData();
                await deleteUserDB(currentUserId);
                await AsyncStorage.multiRemove([
                  "user_name",
                  "logged_in",
                  "current_user_id",
                  "qr_scanned",
                  "synced_customer_ids",
                  "synced_item_ids",
                  "synced_booking_ids",
                  "synced_line_ids",
                  "synced_receipt_ids",
                ]);
                updateUserName("");
                await closeUserDB();
                navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete user data.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      
      {/* ---------- Top Header ---------- */}
      <View style={styles.header}>
        {/* <View style={styles.profileIconWrapper}>
          <MaterialIcons name="person" size={RF(50)} color="#fff" />
        </View> */}
        <View style={styles.profileIconWrapper}>
  <MaterialIcons name="person" size={RF(50)} color="#fff" />

  {/* Status Badge */}
  {/* <View
    style={[
      styles.statusBadge,
      status === "active" ? styles.activeBadge : styles.inactiveBadge,
    ]}
  >
    <Text style={styles.statusText}>
      {status === "active" ? "ACTIVE" : "INACTIVE"}
    </Text>
  </View> */}
</View>
 <Text style={styles.companyText}>
    {companyName ? companyName.toUpperCase() : ""}
  </Text>

      </View>


      {/* ---------- Main Content ---------- */}
      <View style={styles.content}>
        {/* Profile Heading */}
        <Text style={styles.sectionTitle}>Profile</Text>

        {/* ---------- Profile Name Row ---------- */}
         <TouchableOpacity
          style={styles.itemRow}
        >
          <View style={styles.rowCenter}>
            <MaterialIcons
              name="person"
              size={RF(24)}
              color="#0a84ff"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.itemText}>{userName || "Your Name"}</Text>
          </View>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.itemRow}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.rowCenter}>
            <MaterialIcons
              name="person"
              size={RF(24)}
              color="#0a84ff"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.itemText}>{userName || "Your Name"}</Text>
          </View>
          <Feather name="edit" size={RF(20)} color="#0a84ff" />
        </TouchableOpacity> */}

        {/* ---------- Modules Section ---------- */}
        <Text style={styles.sectionTitle}>Modules</Text>

         <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <View style={styles.rowCenter}>
            <Feather name="grid" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Dashboard</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate("Customer")}
        >
          <View style={styles.rowCenter}>
            <Feather name="users" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Customers</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate("All Orders")}
        >
          <View style={styles.rowCenter}>
            <Feather name="shopping-bag" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Orders</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate("Live Tracking")}
        >
          <View style={styles.rowCenter}>
            <Feather name="map-pin" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Live Location</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate("All Payments")}
        >
          <View style={styles.rowCenter}>
            <Feather name="credit-card" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Payments</Text>
          </View>
        </TouchableOpacity>


        {/* ---------- Actions Section ---------- */}
        <Text style={styles.sectionTitle}>Actions</Text>

        {/* <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
          <View style={styles.rowCenter}>
            <Feather name="trash-2" size={RF(22)} color="#d11a2a" style={{ marginRight: 12 }} />
            <Text style={styles.itemText}>Delete All Data</Text>
          </View>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.itemRow} onPress={logout}>
          <View style={styles.rowCenter}>
            <MaterialIcons
              name="logout"
              size={RF(24)}
              color="#333"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.itemText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ---------- Footer ---------- */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by{" "}
          <Text style={styles.companyName}>
            Multi Techno Integrated Solutions
          </Text>
        </Text>
      </View>

      {/* ---------- Edit Name Modal ---------- */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile Name</Text>

            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={RF(22)} color="#555" style={{ marginRight: 12 }} />
              <TextInput
                style={styles.input}
                value={editName}
                placeholder="Enter your name"
                onChangeText={setEditName}
              />
            </View>

            <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
              <Text style={styles.btnText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0a84ff",
    height: RF(80),
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileIconWrapper: {
    backgroundColor: "#0a84ff",
    borderWidth: 3,
    borderColor: "#fff",
    width: RF(80),
    height: RF(80),
    borderRadius: RF(40),
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: -RF(40),
  },

  companyText: {
  position: "absolute",
  top: RF(120),   // ⬅ under icon
  textAlign: "center",
  fontSize: RF(14),
  fontWeight: "700",
  color: "#000",
  letterSpacing: 1,
},


  statusBadge: {
  position: "absolute",
  top: 60,
  right: 30,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: "#fff",
},

activeBadge: {
  backgroundColor: "#16a34a", // green
},

inactiveBadge: {
  backgroundColor: "#dc2626", // red
},

statusText: {
  color: "#fff",
  fontSize: RF(9),
  fontWeight: "700",
},


  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: RF(40), // spacing below profile icon
  },

  sectionTitle: {
    fontSize: RF(16),
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
    marginTop: 15,
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  itemText: { fontSize: RF(16), color: "#111" },

  footer: {
    height: RF(40),
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: RF(10), color: "#555" },
  companyName: { fontSize: RF(10), fontWeight: "600", color: "#111" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: RF(20), fontWeight: "700", textAlign: "center", marginBottom: 15 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
  updateBtn: {
    backgroundColor: "#0a84ff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
  cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
  cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
});



// Updated 22-12-2025
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Modal,
//   TextInput,
//   Dimensions,
// } from "react-native";

// import { useFocusEffect } from "@react-navigation/native";
// import { useCallback } from "react";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getActiveStatus, setLoginStatus, clearUserData, logoutDB } from "../db/database";
// import { closeUserDB, deleteUserDB, openUserDB  } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather } from "@expo/vector-icons";
// import { UserContext } from "../context/UserContext";

// const { width, height } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width);

// export default function ProfileScreen({ navigation }) {
//   const { userName, updateUserName } = useContext(UserContext);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editName, setEditName] = useState("");

//   const [status, setStatus] = useState("inActive"); // ✅ DEFINE STATE

//   useFocusEffect(
//     useCallback(() => {
//       const loadStatus = async () => {
//         const entityId = await AsyncStorage.getItem("current_user_id");
//         const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");

//         if (!entityId || !baseUrl) return;

//         await openUserDB(entityId, baseUrl); // 🔑 VERY IMPORTANT

//         const dbStatus = await getActiveStatus();
//         console.log("👤 Profile fetched status:", dbStatus);

//         setStatus(dbStatus);
//       };

//       loadStatus();
//     }, [])
//   );


//   useEffect(() => {
//     setEditName(userName);
//   }, [userName]);

//   const saveName = async () => {
//     if (!editName.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     updateUserName(editName);
//     Alert.alert("Success", "Name Updated Successfully");
//     setModalVisible(false);
//   };

//   // const logout = async () => {
//   //   await setLoginStatus(false);
//   //   await AsyncStorage.setItem("logged_in", "false");
//   //   await closeUserDB();
//   //   await AsyncStorage.multiRemove(["qr_scanned"]);
//   //   navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   // };
// const logout = async () => {
//   // Clear session ID from DB
//   await logoutDB();

//   // Clear AsyncStorage
//   await AsyncStorage.multiRemove([
//     "logged_in",
//     "qr_scanned",
//     "session_id",
//     "current_user_id",
//     "user_name",
//     "dynamic_connection_url",
//   ]);

//   // Update login status in your app
//   await setLoginStatus(false);

//   // Close user DB
//   await closeUserDB();

//   // Navigate to QR Scan screen
//   navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
// };


//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all user data?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem("current_user_id");
//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);
//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);
//                 updateUserName("");
//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      
//       {/* ---------- Top Header ---------- */}
//       <View style={styles.header}>
//         {/* <View style={styles.profileIconWrapper}>
//           <MaterialIcons name="person" size={RF(50)} color="#fff" />
//         </View> */}
//         <View style={styles.profileIconWrapper}>
//   <MaterialIcons name="person" size={RF(50)} color="#fff" />

//   {/* Status Badge */}
//   {/* <View
//     style={[
//       styles.statusBadge,
//       status === "active" ? styles.activeBadge : styles.inactiveBadge,
//     ]}
//   >
//     <Text style={styles.statusText}>
//       {status === "active" ? "ACTIVE" : "INACTIVE"}
//     </Text>
//   </View> */}
// </View>

//       </View>


//       {/* ---------- Main Content ---------- */}
//       <View style={styles.content}>
//         {/* Profile Heading */}
//         <Text style={styles.sectionTitle}>Profile</Text>

//         {/* ---------- Profile Name Row ---------- */}
//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => setModalVisible(true)}
//         >
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="person"
//               size={RF(24)}
//               color="#0a84ff"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>{userName || "Your Name"}</Text>
//           </View>
//           <Feather name="edit" size={RF(20)} color="#0a84ff" />
//         </TouchableOpacity>

//         {/* ---------- Modules Section ---------- */}
//         <Text style={styles.sectionTitle}>Modules</Text>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Customer")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="users" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Customers</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Orders")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="shopping-bag" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Orders</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Live Tracking")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="map-pin" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Location</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Payments")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="credit-card" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Payments</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Dashboard")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="grid" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Dashboard</Text>
//           </View>
//         </TouchableOpacity>

//         {/* ---------- Actions Section ---------- */}
//         <Text style={styles.sectionTitle}>Actions</Text>

//         {/* <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
//           <View style={styles.rowCenter}>
//             <Feather name="trash-2" size={RF(22)} color="#d11a2a" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Delete All Data</Text>
//           </View>
//         </TouchableOpacity> */}

//         <TouchableOpacity style={styles.itemRow} onPress={logout}>
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="logout"
//               size={RF(24)}
//               color="#333"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>Logout</Text>
//           </View>
//         </TouchableOpacity>
//       </View>

//       {/* ---------- Footer ---------- */}
//       <View style={styles.footer}>
//         <Text style={styles.footerText}>
//           Powered by{" "}
//           <Text style={styles.companyName}>
//             Multi Techno Integrated Solutions
//           </Text>
//         </Text>
//       </View>

//       {/* ---------- Edit Name Modal ---------- */}
//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Edit Profile Name</Text>

//             <View style={styles.inputWrapper}>
//               <MaterialIcons name="person" size={RF(22)} color="#555" style={{ marginRight: 12 }} />
//               <TextInput
//                 style={styles.input}
//                 value={editName}
//                 placeholder="Enter your name"
//                 onChangeText={setEditName}
//               />
//             </View>

//             <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//               <Text style={styles.btnText}>Save Changes</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.cancelBtn}
//               onPress={() => setModalVisible(false)}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     backgroundColor: "#0a84ff",
//     height: RF(80),
//     justifyContent: "flex-end",
//     alignItems: "center",
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//   },
//   profileIconWrapper: {
//     backgroundColor: "#0a84ff",
//     borderWidth: 3,
//     borderColor: "#fff",
//     width: RF(80),
//     height: RF(80),
//     borderRadius: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//     position: "absolute",
//     bottom: -RF(40),
//   },

//   statusBadge: {
//   position: "absolute",
//   top: 60,
//   right: 30,
//   paddingHorizontal: 8,
//   paddingVertical: 3,
//   borderRadius: 12,
//   borderWidth: 2,
//   borderColor: "#fff",
// },

// activeBadge: {
//   backgroundColor: "#16a34a", // green
// },

// inactiveBadge: {
//   backgroundColor: "#dc2626", // red
// },

// statusText: {
//   color: "#fff",
//   fontSize: RF(9),
//   fontWeight: "700",
// },


//   content: {
//     flex: 1,
//     paddingHorizontal: 15,
//     paddingTop: RF(30), // spacing below profile icon
//   },

//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },
//   itemText: { fontSize: RF(16), color: "#111" },

//   footer: {
//     height: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   footerText: { fontSize: RF(10), color: "#555" },
//   companyName: { fontSize: RF(10), fontWeight: "600", color: "#111" },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", textAlign: "center", marginBottom: 15 },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
// });




// Updated 17-12-2025
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Modal,
//   TextInput,
//   Dimensions,
// } from "react-native";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus, clearUserData } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather } from "@expo/vector-icons";

// import { UserContext } from "../context/UserContext";

// const { width, height } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width);

// export default function ProfileScreen({ navigation }) {
//   const { userName, updateUserName } = useContext(UserContext);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editName, setEditName] = useState("");

//   useEffect(() => {
//     setEditName(userName);
//   }, [userName]);

//   const saveName = async () => {
//     if (!editName.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     updateUserName(editName);
//     Alert.alert("Success", "Name Updated Successfully");
//     setModalVisible(false);
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);
//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all user data?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem("current_user_id");
//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);
//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);
//                 updateUserName("");
//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      
//       {/* ---------- Top Header ---------- */}
//       <View style={styles.header}>
//         <View style={styles.profileIconWrapper}>
//           <MaterialIcons name="person" size={RF(50)} color="#fff" />
//         </View>
//       </View>

//       {/* ---------- Main Content ---------- */}
//       <View style={styles.content}>
//         {/* Profile Heading */}
//         <Text style={styles.sectionTitle}>Profile</Text>

//         {/* ---------- Profile Name Row ---------- */}
//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => setModalVisible(true)}
//         >
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="person"
//               size={RF(24)}
//               color="#0a84ff"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>{userName || "Your Name"}</Text>
//           </View>
//           <Feather name="edit" size={RF(20)} color="#0a84ff" />
//         </TouchableOpacity>

//         {/* ---------- Modules Section ---------- */}
//         <Text style={styles.sectionTitle}>Modules</Text>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Customer")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="users" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Customers</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Orders")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="shopping-bag" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Orders</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Live Tracking")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="map-pin" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Location</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Payments")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="credit-card" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Payments</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Dashboard")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="grid" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Dashboard</Text>
//           </View>
//         </TouchableOpacity>

//         {/* ---------- Actions Section ---------- */}
//         <Text style={styles.sectionTitle}>Actions</Text>

//         {/* <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
//           <View style={styles.rowCenter}>
//             <Feather name="trash-2" size={RF(22)} color="#d11a2a" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Delete All Data</Text>
//           </View>
//         </TouchableOpacity> */}

//         <TouchableOpacity style={styles.itemRow} onPress={logout}>
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="logout"
//               size={RF(24)}
//               color="#333"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>Logout</Text>
//           </View>
//         </TouchableOpacity>
//       </View>

//       {/* ---------- Footer ---------- */}
//       <View style={styles.footer}>
//         <Text style={styles.footerText}>
//           Powered by{" "}
//           <Text style={styles.companyName}>
//             Multi Techno Integrated Solutions
//           </Text>
//         </Text>
//       </View>

//       {/* ---------- Edit Name Modal ---------- */}
//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Edit Profile Name</Text>

//             <View style={styles.inputWrapper}>
//               <MaterialIcons name="person" size={RF(22)} color="#555" style={{ marginRight: 12 }} />
//               <TextInput
//                 style={styles.input}
//                 value={editName}
//                 placeholder="Enter your name"
//                 onChangeText={setEditName}
//               />
//             </View>

//             <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//               <Text style={styles.btnText}>Save Changes</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.cancelBtn}
//               onPress={() => setModalVisible(false)}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     backgroundColor: "#0a84ff",
//     height: RF(80),
//     justifyContent: "flex-end",
//     alignItems: "center",
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//   },
//   profileIconWrapper: {
//     backgroundColor: "#0a84ff",
//     borderWidth: 3,
//     borderColor: "#fff",
//     width: RF(80),
//     height: RF(80),
//     borderRadius: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//     position: "absolute",
//     bottom: -RF(40),
//   },

//   content: {
//     flex: 1,
//     paddingHorizontal: 15,
//     paddingTop: RF(30), // spacing below profile icon
//   },

//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },
//   itemText: { fontSize: RF(16), color: "#111" },

//   footer: {
//     height: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   footerText: { fontSize: RF(10), color: "#555" },
//   companyName: { fontSize: RF(10), fontWeight: "600", color: "#111" },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", textAlign: "center", marginBottom: 15 },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
// });





// Comapny Name
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Modal,
//   TextInput,
//   Dimensions,
// } from "react-native";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus, clearUserData, getAppConfig  } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather } from "@expo/vector-icons";

// import { UserContext } from "../context/UserContext";

// const { width, height } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width);

// export default function ProfileScreen({ navigation }) {
//   const [companyBaseUrl, setCompanyBaseUrl] = useState("");
//   const { userName, updateUserName } = useContext(UserContext);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editName, setEditName] = useState("");

//    useEffect(() => {
//     const fetchCompany = async () => {
//       const config = await getAppConfig();
//       if (config?.baseUrl) {
//         setCompanyBaseUrl(config.baseUrl);
//       }
//     };
//     fetchCompany();
//   }, []);

//   useEffect(() => {
//     setEditName(userName);
//   }, [userName]);

//   const saveName = async () => {
//     if (!editName.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     updateUserName(editName);
//     Alert.alert("Success", "Name Updated Successfully");
//     setModalVisible(false);
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);
//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all user data?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem("current_user_id");
//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);
//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);
//                 updateUserName("");
//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      
//       {/* ---------- Top Header ---------- */}
//       <View style={styles.header}>
//         <View style={styles.profileIconWrapper}>
//           <MaterialIcons name="person" size={RF(50)} color="#fff" />
//         </View>
//          {companyBaseUrl ? (
//           <Text style={styles.companyText}>{companyBaseUrl}</Text>
//         ) : null}
//       </View>


     


//       {/* ---------- Main Content ---------- */}
//       <View style={styles.content}>
//         {/* Profile Heading */}
//         <Text style={styles.sectionTitle}>Profile</Text>

//         {/* ---------- Profile Name Row ---------- */}
//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => setModalVisible(true)}
//         >
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="person"
//               size={RF(24)}
//               color="#0a84ff"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>{userName || "Your Name"}</Text>
//           </View>
//           <Feather name="edit" size={RF(20)} color="#0a84ff" />
//         </TouchableOpacity>

//         {/* ---------- Modules Section ---------- */}
//         <Text style={styles.sectionTitle}>Modules</Text>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Customer")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="users" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Customers</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Orders")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="shopping-bag" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Orders</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Live Tracking")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="map-pin" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Location</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("All Payments")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="credit-card" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Payments</Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.itemRow}
//           onPress={() => navigation.navigate("Dashboard")}
//         >
//           <View style={styles.rowCenter}>
//             <Feather name="grid" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Dashboard</Text>
//           </View>
//         </TouchableOpacity>

//         {/* ---------- Actions Section ---------- */}
//         <Text style={styles.sectionTitle}>Actions</Text>

//         {/* <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
//           <View style={styles.rowCenter}>
//             <Feather name="trash-2" size={RF(22)} color="#d11a2a" style={{ marginRight: 12 }} />
//             <Text style={styles.itemText}>Delete All Data</Text>
//           </View>
//         </TouchableOpacity> */}

//         <TouchableOpacity style={styles.itemRow} onPress={logout}>
//           <View style={styles.rowCenter}>
//             <MaterialIcons
//               name="logout"
//               size={RF(24)}
//               color="#333"
//               style={{ marginRight: 12 }}
//             />
//             <Text style={styles.itemText}>Logout</Text>
//           </View>
//         </TouchableOpacity>
//       </View>

//       {/* ---------- Footer ---------- */}
//       <View style={styles.footer}>
//         <Text style={styles.footerText}>
//           Powered by{" "}
//           <Text style={styles.companyName}>
//             Multi Techno Integrated Solutions
//           </Text>
//         </Text>
//       </View>

//       {/* ---------- Edit Name Modal ---------- */}
//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Edit Profile Name</Text>

//             <View style={styles.inputWrapper}>
//               <MaterialIcons name="person" size={RF(22)} color="#555" style={{ marginRight: 12 }} />
//               <TextInput
//                 style={styles.input}
//                 value={editName}
//                 placeholder="Enter your name"
//                 onChangeText={setEditName}
//               />
//             </View>

//             <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//               <Text style={styles.btnText}>Save Changes</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.cancelBtn}
//               onPress={() => setModalVisible(false)}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     backgroundColor: "#0a84ff",
//     height: RF(80),
//     justifyContent: "flex-end",
//     alignItems: "center",
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//   },
//   profileIconWrapper: {
//     backgroundColor: "#0a84ff",
//     borderWidth: 3,
//     borderColor: "#fff",
//     width: RF(80),
//     height: RF(80),
//     borderRadius: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//     position: "absolute",
//     bottom: -RF(40),
//   },

//   companyText: {
//   marginTop: RF(50),
//   color: "red",
//   fontSize: RF(16),
//   fontWeight: "600",
//   textAlign: "center",
//   top:60,
// },


//   content: {
//     flex: 1,
//     paddingHorizontal: 15,
//     paddingTop: RF(60), // spacing below profile icon
//   },

//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },
//   itemText: { fontSize: RF(16), color: "#111" },

//   footer: {
//     height: RF(40),
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   footerText: { fontSize: RF(10), color: "#555" },
//   companyName: { fontSize: RF(10), fontWeight: "600", color: "#111" },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", textAlign: "center", marginBottom: 15 },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
// });


// // Layout Upgraded
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   FlatList,
//   Modal,
//   TextInput,
//   ScrollView,
//   Dimensions,
// } from "react-native";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus, clearUserData } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather } from "@expo/vector-icons";

// import { UserContext } from "../context/UserContext";

// const { width } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width);

// export default function ProfileScreen({ navigation }) {
//   const { userName, updateUserName } = useContext(UserContext);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [editName, setEditName] = useState("");

//   useEffect(() => {
//     setEditName(userName);
//   }, [userName]);

//   const saveName = async () => {
//     if (!editName.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }

//     updateUserName(editName); // 🔥 Instant update + saves to AsyncStorage
//     Alert.alert("Success", "Name Updated Successfully");
//     setModalVisible(false);
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);

//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all user data?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem("current_user_id");

//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);

//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);

//                 updateUserName(""); // clear context also

//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
//       <View style={{ flex: 1, paddingHorizontal: 15 }}>
//         <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
//           {/* ---------- Profile Section ---------- */}
//           <Text style={styles.sectionTitle}>Profile</Text>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => setModalVisible(true)}
//           >
//             <View style={styles.rowCenter}>
//               <MaterialIcons
//                 name="person"
//                 size={RF(24)}
//                 color="#0a84ff"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>{userName || "Your Name"}</Text>
//             </View>
//             <Feather name="edit" size={RF(20)} color="#0a84ff" />
//           </TouchableOpacity>

//           {/* ---------- Modules Section ---------- */}
//           <Text style={styles.sectionTitle}>Modules</Text>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("Customer")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather name="users" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//               <Text style={styles.itemText}>Customers</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("All Orders")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather name="shopping-bag" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//               <Text style={styles.itemText}>Orders</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("Live Tracking")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather name="map-pin" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//               <Text style={styles.itemText}>Location</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("All Payments")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather name="credit-card" size={RF(22)} color="#333" style={{ marginRight: 12 }} />
//               <Text style={styles.itemText}>Payments</Text>
//             </View>
//           </TouchableOpacity>

//           {/* ---------- Actions Section ---------- */}
//           <Text style={styles.sectionTitle}>Actions</Text>

//           <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
//             <View style={styles.rowCenter}>
//               <Feather name="trash-2" size={RF(22)} color="#d11a2a" style={{ marginRight: 12 }} />
//               <Text style={styles.itemText}>Delete All Data</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.itemRow} onPress={logout}>
//             <View style={styles.rowCenter}>
//               <MaterialIcons
//                 name="logout"
//                 size={RF(24)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Logout</Text>
//             </View>
//           </TouchableOpacity>
//         </ScrollView>

//         {/* ---------- Footer ---------- */}
//         <View style={styles.footer}>
//           <Text style={styles.footerText}>
//             Powered by{" "}
//             <Text style={styles.companyName}>
//               Multi Techno Integrated Solutions
//             </Text>
//           </Text>
//         </View>

//         {/* ---------- Edit Name Modal ---------- */}
//         <Modal visible={modalVisible} transparent animationType="slide">
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContainer}>
//               <Text style={styles.modalTitle}>Edit Profile Name</Text>

//               <View style={styles.inputWrapper}>
//                 <MaterialIcons name="person" size={RF(22)} color="#555" style={{ marginRight: 12 }} />
//                 <TextInput
//                   style={styles.input}
//                   value={editName}
//                   placeholder="Enter your name"
//                   onChangeText={setEditName}
//                 />
//               </View>

//               <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//                 <Text style={styles.btnText}>Save Changes</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={styles.cancelBtn}
//                 onPress={() => setModalVisible(false)}
//               >
//                 <Text style={styles.cancelText}>Cancel</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },
//   itemText: { fontSize: RF(16), color: "#111" },

//   footer: {
//     position: "absolute",
//     bottom: 10,
//     width: "100%",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   footerText: { fontSize: RF(10), color: "#555", textAlign: "center", marginLeft: 26 },
//   companyName: { fontSize: RF(10), fontWeight: "600", color: "#111" },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", textAlign: "center", marginBottom: 15 },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
// });




// // src/screens/ProfileScreen.js
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   FlatList,
//   Modal,
//   TextInput,
//   ScrollView,
//   Dimensions,
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus, clearUserData } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather, AntDesign } from "@expo/vector-icons";

// const { width } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width);

// export default function ProfileScreen({ navigation, closeSidebar }) {
//   const [name, setName] = useState("");
//   const [modalVisible, setModalVisible] = useState(false);
//   const [userList, setUserList] = useState([]);

//   useEffect(() => {
//     loadName();
//     loadUserList();
//   }, []);

//   const loadName = async () => {
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (savedName) setName(savedName);
//   };

//   const loadUserList = async () => {
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (currentId && savedName) {
//       setUserList([{ id: currentId, name: savedName }]);
//     }
//   };

//   const saveName = async () => {
//     if (!name.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     if (currentId) {
//       await AsyncStorage.setItem("user_name", name);
//       await AsyncStorage.setItem(`user_name_${currentId}`, name);
//       setUserList([{ id: currentId, name }]);
//       Alert.alert("Success", "Name updated successfully");
//       setModalVisible(false);
//     }
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);
//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all data for this user? This cannot be undone!",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem(
//                 "current_user_id"
//               );
//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);
//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);
//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               console.log("Delete All Data Error:", err);
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
//       {/* Sidebar container */}
//       <View style={{ flex: 1, paddingVertical: 0, paddingHorizontal: 15 }}>
//         {/* Top heading + close button */}
//         {/* <View style={styles.headerRow}>
//           <Text style={styles.topHeading}>Profile Settings</Text>
//         </View> */}

//         {/* Scrollable content */}
//         <ScrollView
//           contentContainerStyle={{ paddingBottom: 100 }}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Profile section */}
//           <Text style={styles.sectionTitle}>Profile</Text>
//           <FlatList
//             data={userList}
//             keyExtractor={(item) => item.id}
//             scrollEnabled={false}
//             renderItem={({ item }) => (
//               <TouchableOpacity
//                 style={styles.itemRow}
//                 onPress={() => {
//                   setName(item.name);
//                   setModalVisible(true);
//                 }}
//               >
//                 <View style={styles.rowCenter}>
//                   <MaterialIcons
//                     name="person"
//                     size={RF(24)}
//                     color="#0a84ff"
//                     style={{ marginRight: 12 }}
//                   />
//                   <Text style={styles.itemText}>{item.name}</Text>
//                 </View>
//                 <Feather name="edit" size={RF(20)} color="#0a84ff" />
//               </TouchableOpacity>
//             )}
//           />

//           {/* Modules section */}
//           <Text style={styles.sectionTitle}>Modules</Text>
//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("Customer")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="users"
//                 size={RF(22)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Customers</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("All Orders")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="shopping-bag"
//                 size={RF(22)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Orders</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("Live Tracking")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="map-pin"
//                 size={RF(22)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Location</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.itemRow}
//             onPress={() => navigation.navigate("All Payments")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="credit-card"
//                 size={RF(22)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Payments</Text>
//             </View>
//           </TouchableOpacity>

//           {/* Actions section */}
//           <Text style={styles.sectionTitle}>Actions</Text>
//           <TouchableOpacity style={styles.itemRow} onPress={deleteAllData}>
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="trash-2"
//                 size={RF(22)}
//                 color="#d11a2a"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Delete All Data</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.itemRow} onPress={logout}>
//             <View style={styles.rowCenter}>
//               <MaterialIcons
//                 name="logout"
//                 size={RF(24)}
//                 color="#333"
//                 style={{ marginRight: 12 }}
//               />
//               <Text style={styles.itemText}>Logout</Text>
//             </View>
//           </TouchableOpacity>
//         </ScrollView>

//         {/* Footer fixed at bottom */}
//         <View style={styles.footer}>
//           <Text style={styles.footerText}>
//             Powered by{" "}
//             <Text style={styles.companyName}>
//               Multi Techno Integrated Solutions
//             </Text>
//           </Text>
//         </View>

//         {/* Edit Name Modal */}
//         <Modal visible={modalVisible} transparent animationType="slide">
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContainer}>
//               <Text style={styles.modalTitle}>Edit Profile Name</Text>
//               <View style={styles.inputWrapper}>
//                 <MaterialIcons
//                   name="person"
//                   size={RF(22)}
//                   color="#555"
//                   style={{ marginRight: 12 }}
//                 />
//                 <TextInput
//                   style={styles.input}
//                   value={name}
//                   placeholder="Enter your name"
//                   onChangeText={setName}
//                 />
//               </View>
//               <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//                 <Text style={styles.btnText}>Save Changes</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={styles.cancelBtn}
//                 onPress={() => setModalVisible(false)}
//               >
//                 <Text style={styles.cancelText}>Cancel</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   headerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 20,
//   },
//   topHeading: { fontSize: RF(22), fontWeight: "700", color: "#111" },
//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },
//   itemText: { fontSize: RF(16), color: "#111" },

//   // Footer
//   footer: {
//     position: "absolute",
//     bottom: 10,
//     width: "100%",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#fff",
//   },
//   footerText: { fontSize: RF(10), color: "#555", textAlign: "center",marginLeft:18 },
//   companyName: {fontSize: RF(10), fontWeight: "600", color: "#111" },

//   // Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", marginBottom: 15, textAlign: "center" },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },
// });


// Layout Enhanced
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   FlatList,
//   Modal,
//   ScrollView,
//   Dimensions,
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus, clearUserData } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons, Feather } from "@expo/vector-icons";

// const { width, height } = Dimensions.get("window");
// const RF = (size) => Math.round((size / 375) * width); // Responsive Font / Size

// export default function ProfileScreen({ navigation, isSidebar }) {
//   const [name, setName] = useState("");
//   const [modalVisible, setModalVisible] = useState(false);
//   const [userList, setUserList] = useState([]);

//   useEffect(() => {
//     loadName();
//     loadUserList();
//   }, []);

//   const loadName = async () => {
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (savedName) setName(savedName);
//   };

//   const loadUserList = async () => {
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (currentId && savedName) {
//       setUserList([{ id: currentId, name: savedName }]);
//     }
//   };

//   const saveName = async () => {
//     if (!name.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     if (currentId) {
//       await AsyncStorage.setItem("user_name", name);
//       await AsyncStorage.setItem(`user_name_${currentId}`, name);
//       setUserList([{ id: currentId, name }]);
//       Alert.alert("Success", "Name updated successfully");
//       setModalVisible(false);
//     }
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);
//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all data for this user? This cannot be undone!",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem(
//                 "current_user_id"
//               );
//               if (currentUserId) {
//                 await clearUserData();
//                 await deleteUserDB(currentUserId);

//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);

//                 await closeUserDB();
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               console.log("Delete All Data Error:", err);
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, padding: isSidebar ? 0 : 0 }} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* Scrollable Content */}
//         <ScrollView
//           style={{ flex: 1 }}
//           contentContainerStyle={{ paddingBottom: 20 }}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Main Heading */}
//           <Text style={styles.screenTitle}>Profile Settings</Text>

//           {/* Profile Section */}
//           <Text style={styles.sectionTitle}>Profile</Text>

//           <FlatList
//             data={userList}
//             keyExtractor={(item) => item.id}
//             scrollEnabled={false}
//             renderItem={({ item }) => (
//               <TouchableOpacity
//                 style={styles.profileCard}
//                 activeOpacity={0.8}
//                 onPress={() => {
//                   setName(item.name);
//                   setModalVisible(true);
//                 }}
//               >
//                 <View style={styles.rowCenter}>
//                   <MaterialIcons
//                     name="person"
//                     size={RF(26)}
//                     color="#333"
//                     style={styles.iconMargin}
//                   />
//                   <Text style={styles.profileName}>{item.name}</Text>
//                 </View>
//                 <Feather name="edit" size={RF(20)} color="#0a84ff" />
//               </TouchableOpacity>
//             )}
//           />

//           {/* Modules Section */}
//           <Text style={styles.sectionTitle}>Modules</Text>

//           <TouchableOpacity
//             style={styles.profileCard}
//             onPress={() => navigation.navigate("Customer")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="users"
//                 size={RF(22)}
//                 color="#333"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.profileName}>Customers</Text>
//             </View>
//             <Feather name="chevron-right" size={RF(22)} color="#999" />
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.profileCard}
//             onPress={() => navigation.navigate("All Orders")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="shopping-bag"
//                 size={RF(22)}
//                 color="#333"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.profileName}>Orders</Text>
//             </View>
//             <Feather name="chevron-right" size={RF(22)} color="#999" />
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.profileCard}
//             onPress={() => navigation.navigate("Live Tracking")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="map-pin"
//                 size={RF(22)}
//                 color="#333"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.profileName}>Location</Text>
//             </View>
//             <Feather name="chevron-right" size={RF(22)} color="#999" />
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.profileCard}
//             onPress={() => navigation.navigate("All Payments")}
//           >
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="credit-card"
//                 size={RF(22)}
//                 color="#333"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.profileName}>Payments</Text>
//             </View>
//             <Feather name="chevron-right" size={RF(22)} color="#999" />
//           </TouchableOpacity>

//           {/* Update Name Modal */}
//           <Modal visible={modalVisible} transparent animationType="slide">
//             <View style={styles.modalOverlay}>
//               <View style={styles.modalContainer}>
//                 <Text style={styles.modalTitle}>Edit Profile Name</Text>
//                 <View style={styles.inputWrapper}>
//                   <MaterialIcons
//                     name="person"
//                     size={RF(22)}
//                     color="#555"
//                     style={styles.iconMargin}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     value={name}
//                     placeholder="Enter your name"
//                     onChangeText={setName}
//                   />
//                 </View>

//                 <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//                   <Text style={styles.btnText}>Save Changes</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={styles.cancelBtn}
//                   onPress={() => setModalVisible(false)}
//                 >
//                   <Text style={styles.cancelText}>Cancel</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </Modal>

//           {/* Actions Section */}
//           <Text style={styles.sectionTitle}>Actions</Text>

//           <TouchableOpacity style={styles.actionCard} onPress={deleteAllData}>
//             <View style={styles.rowCenter}>
//               <Feather
//                 name="trash-2"
//                 size={RF(22)}
//                 color="#d11a2a"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.actionText}>Delete All Data</Text>
//             </View>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.actionCard} onPress={logout}>
//             <View style={styles.rowCenter}>
//               <MaterialIcons
//                 name="logout"
//                 size={RF(24)}
//                 color="#333"
//                 style={styles.iconMargin}
//               />
//               <Text style={styles.actionText}>Logout</Text>
//             </View>
//           </TouchableOpacity>
//         </ScrollView>

//         {/* Sticky Footer */}
//         <View style={styles.footer}>
//           <Text style={styles.footerText}>
//             Powered by{" "}
//             <Text style={styles.companyName}>
//               Multi Techno Integrated Solutions
//             </Text>
//           </Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     // backgroundColor: "#F7F9FC",
//     padding: width * 0.05,
//     justifyContent: "space-between", // Sticky footer at bottom
//   },

//   screenTitle: {
//     fontSize: RF(22),
//     fontWeight: "700",
//     marginBottom: 20,
//     color: "#111",
//   },

//   sectionTitle: {
//     fontSize: RF(16),
//     fontWeight: "700",
//     color: "#6B7280",
//     marginBottom: 10,
//   },

//   iconMargin: { marginRight: 12 },

//   /* Profile Card */
//   profileCard: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     padding: RF(16),
//     borderRadius: 14,
//     marginBottom: 10,
//     elevation: 3,
//   },
//   rowCenter: { flexDirection: "row", alignItems: "center" },
//   profileName: { fontSize: RF(17), fontWeight: "600" },

//   /* Modal */
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000066",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "90%",
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 20,
//     elevation: 10,
//   },
//   modalTitle: { fontSize: RF(20), fontWeight: "700", marginBottom: 15, textAlign: "center" },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     marginBottom: 20,
//   },
//   input: { flex: 1, paddingVertical: 12, fontSize: RF(16) },

//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 10,
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: RF(16) },
//   cancelBtn: { padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#e5e7eb" },
//   cancelText: { fontWeight: "700", fontSize: RF(16), color: "#333" },

//   /* Action Cards */
//   actionCard: {
//     backgroundColor: "#fff",
//     padding: RF(16),
//     borderRadius: 14,
//     elevation: 3,
//     marginBottom: 12,
//   },
//   actionText: { fontSize: RF(16), fontWeight: "600" },

//   /* Footer */
//   footer: {
//     alignItems: "center",
//     paddingVertical: 10,
//   },
//   footerText: { fontSize: RF(12), color: "#555", textAlign: "center" },
//   companyName: { fontWeight: "700", color: "#111" },
// });






// // Layout Updated
// // src/screens/ProfileScreen.js
// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   FlatList,
//   Modal,
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus } from "../db/database";
// import { closeUserDB, deleteUserDB } from "../db/dbManager";
// import { clearUserData } from "../db/database";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function ProfileScreen({ navigation }) {
//   const [name, setName] = useState("");
//   const [modalVisible, setModalVisible] = useState(false);
//   const [userList, setUserList] = useState([]);

//   useEffect(() => {
//     loadName();
//     loadUserList();
//   }, []);

//   const loadName = async () => {
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (savedName) setName(savedName);
//   };

//   const loadUserList = async () => {
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (currentId && savedName) {
//       setUserList([{ id: currentId, name: savedName }]);
//     }
//   };

//   const saveName = async () => {
//     if (!name.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     const currentId = await AsyncStorage.getItem("current_user_id");
//     if (currentId) {
//       await AsyncStorage.setItem("user_name", name);
//       await AsyncStorage.setItem(`user_name_${currentId}`, name);
//       setUserList([{ id: currentId, name }]);
//       Alert.alert("Success", "Name updated successfully");
//       setModalVisible(false);
//     }
//   };

//   const logout = async () => {
//     await setLoginStatus(false);
//     await AsyncStorage.setItem("logged_in", "false");
//     await closeUserDB();
//     await AsyncStorage.multiRemove(["qr_scanned"]);
//     navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//   };

//   const deleteAllData = async () => {
//     Alert.alert(
//       "Delete All Data",
//       "Are you sure you want to delete all data for this user? This cannot be undone!",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const currentUserId = await AsyncStorage.getItem("current_user_id");
//               if (currentUserId) {
//                 // 1. Clear all tables for current user
//                 await clearUserData();

//                 // 2. Optionally delete user DB file
//                 await deleteUserDB(currentUserId);

//                 // 3. Remove session data
//                 await AsyncStorage.multiRemove([
//                   "user_name",
//                   "logged_in",
//                   "current_user_id",
//                   "qr_scanned",
//                   "synced_customer_ids",
//                   "synced_item_ids",
//                   "synced_booking_ids",
//                   "synced_line_ids",
//                   "synced_receipt_ids",
//                 ]);

//                 // 4. Close DB
//                 await closeUserDB();

//                 console.log("All user data cleared for user:", currentUserId);

//                 // 5. Navigate to QRScan
//                 navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
//               }
//             } catch (err) {
//               console.log("Delete All Data Error:", err);
//               Alert.alert("Error", "Failed to delete user data.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//         <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//     <View style={styles.container}>
//       <Text style={styles.title}>Profile Settings</Text>

//       {/* User List */}
//       <FlatList
//         data={userList}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <TouchableOpacity
//             style={styles.listItem}
//             onPress={() => {
//               setName(item.name);
//               setModalVisible(true);
//             }}
//           >
//             <Text style={styles.listItemText}>{item.name}</Text>
//             <Text style={styles.editText}>Edit</Text>
//           </TouchableOpacity>
//         )}
//       />

//       {/* Update Name Modal */}
//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>Update Name</Text>
//             <TextInput
//               style={styles.input}
//               value={name}
//               placeholder="Enter your name"
//               onChangeText={setName}
//             />
//             <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//               <Text style={styles.btnText}>Save</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.cancelBtn}
//               onPress={() => setModalVisible(false)}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Delete All Data Button */}
//       <TouchableOpacity style={styles.deleteBtn} onPress={deleteAllData}>
//         <Text style={styles.deleteText}>Delete All Data</Text>
//       </TouchableOpacity>

//       {/* Logout Button */}
//       <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
//         <Text style={styles.logoutText}>Logout</Text>
//       </TouchableOpacity>

//       {/* Footer */}
//       <View style={styles.footer}>
//         <Text style={styles.footerText}>Powered by Multi Techno Integrated Solutions</Text>
//       </View>
//     </View>
//         </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1},
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
//   listItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 14,
//     backgroundColor: "#f5f7fa",
//     borderRadius: 10,
//     marginBottom: 12,
//   },
//   listItemText: { fontSize: 16, fontWeight: "600" },
//   editText: { color: "#0a84ff", fontWeight: "700" },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "#00000088",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContainer: {
//     width: "85%",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 20,
//     elevation: 5,
//   },
//   modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
//   input: { borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8, marginBottom: 20 },
//   updateBtn: { backgroundColor: "#0a84ff", padding: 14, borderRadius: 8, alignItems: "center", marginBottom: 10 },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
//   cancelBtn: { backgroundColor: "#ccc", padding: 14, borderRadius: 8, alignItems: "center" },
//   cancelText: { fontWeight: "700", fontSize: 16, color: "#333" },

//   deleteBtn: { backgroundColor: "#ff453a", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
//   deleteText: { color: "#fff", fontWeight: "700", fontSize: 16 },

//   logoutBtn: { backgroundColor: "#ff3b30", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
//   logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },

//   footer: { marginTop: 30, alignItems: "center" },
//   footerText: { fontSize: 12, color: "#888" },
// });









// ---------------------- PROFILE SCREEN ----------------------
// import React, { useState, useEffect } from "react";
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { setLoginStatus } from "../db/database"; // Import login/logout DB functions

// export default function ProfileScreen({ navigation }) {
//   const [name, setName] = useState("");

//   useEffect(() => {
//     loadName();
//   }, []);

//   const loadName = async () => {
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (savedName) setName(savedName);
//   };

//   const saveName = async () => {
//     if (!name.trim()) {
//       Alert.alert("Error", "Name cannot be empty");
//       return;
//     }
//     await AsyncStorage.setItem("user_name", name);
//     Alert.alert("Success", "Name updated successfully");
//     navigation.goBack();
//   };

//   const logout = async () => {
//     // Set login status to false in DB
//     await setLoginStatus(false);

//     // Clear AsyncStorage (optional: keep some keys if needed)
//     await AsyncStorage.multiRemove(["qr_scanned", "user_name"]);

//     // Reset navigation stack to QRScan
//     navigation.reset({
//       index: 0,
//       routes: [{ name: "QRScan" }],
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Profile Settings</Text>

//       <Text style={styles.label}>Your Name</Text>
//       <TextInput
//         style={styles.input}
//         value={name}
//         placeholder="Enter your name"
//         onChangeText={setName}
//       />

//       <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//         <Text style={styles.btnText}>Update Name</Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
//         <Text style={styles.logoutText}>Logout</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
//   label: { fontSize: 14, fontWeight: "600", marginTop: 10 },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 6,
//   },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 14,
//     borderRadius: 8,
//     marginTop: 20,
//     alignItems: "center",
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
//   logoutBtn: {
//     backgroundColor: "#ff3b30",
//     padding: 14,
//     borderRadius: 8,
//     marginTop: 20,
//     alignItems: "center",
//   },
//   logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
// });









// import React, { useState, useEffect } from "react";
// import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export default function ProfileScreen({ navigation }) {
//   const [name, setName] = useState("");

//   useEffect(() => {
//     loadName();
//   }, []);

//   const loadName = async () => {
//     const savedName = await AsyncStorage.getItem("user_name");
//     if (savedName) setName(savedName);
//   };

//   const saveName = async () => {
//     await AsyncStorage.setItem("user_name", name);
//     alert("Name updated successfully");
//     navigation.goBack();
//   };

//   const logout = async () => {
//     await AsyncStorage.clear();
//     navigation.reset({
//       index: 0,
//       routes: [{ name: "QRScan" }],
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Profile Settings</Text>

//       <Text style={styles.label}>Your Name</Text>
//       <TextInput
//         style={styles.input}
//         value={name}
//         placeholder="Enter your name"
//         onChangeText={setName}
//       />

//       <TouchableOpacity style={styles.updateBtn} onPress={saveName}>
//         <Text style={styles.btnText}>Update Name</Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
//         <Text style={styles.logoutText}>Logout</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
//   label: { fontSize: 14, fontWeight: "600", marginTop: 10 },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 6,
//   },
//   updateBtn: {
//     backgroundColor: "#0a84ff",
//     padding: 14,
//     borderRadius: 8,
//     marginTop: 20,
//     alignItems: "center",
//   },
//   btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
//   logoutBtn: {
//     backgroundColor: "#ff3b30",
//     padding: 14,
//     borderRadius: 8,
//     marginTop: 20,
//     alignItems: "center",
//   },
//   logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
// });
