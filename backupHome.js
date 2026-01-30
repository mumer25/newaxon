import React, { useState,useContext  } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Animated, Easing } from "react-native";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  CloudCheck,
  CloudOff,
  WifiSync,
} from "lucide-react-native";
import OtherReports from "./OtherReports";
import RecentActivitySection from "./RecentActivitySection";
import Toast from "react-native-toast-message";
import {
  getTodaysSales,
  getLastMonthSales,
  getAllCustomersForSync,
  getAllItemsForSync,
  getAllOrderBookings,
  getAllOrderBookingLines,
  getAllCustomerReceiptsForSync,
  markCustomerReceiptSynced, 
  markOrderSynced 

} from "../db/database";
import { handleSync } from "../sync/syncService";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileScreen from "./ProfileScreen";
import { UserContext } from "../context/UserContext";
import UserStats from "./UserStats";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const [showBalance, setShowBalance] = useState(true);
  const [todaySales, setTodaySales] = useState(0);
  const [lastMonthSales, setLastMonthSales] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
const slideAnim = useState(new Animated.Value(-width))[0]; // hidden left
const { height: screenHeight } = Dimensions.get("window");
const statusBarHeight = StatusBar.currentHeight || 0;
const { userName } = useContext(UserContext);
 const [refreshKey, setRefreshKey] = React.useState(0);



  useFocusEffect(
    React.useCallback(() => {
      loadSales();
      loadUserName();
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  const loadSales = async () => {
    const today = await getTodaysSales();
    const lastMonth = await getLastMonthSales();
    setTodaySales(today);
    setLastMonthSales(lastMonth);
  };

  const loadUserName = async () => {
    const name = await AsyncStorage.getItem("user_name");
    if (name) userName(name);
  };

  const handleSyncPress = async () => {
    setSyncStatus("loading"); // show loading while syncing

    const result = await handleSync(null, navigation);

    if (result.success) {
      if (result.syncedCount > 0) {
        setSyncStatus("success"); // ✅ show success permanently
        Toast.show({
          type: "success",
          text1: "Data Synced Successfully!",
          // text2: `${result.syncedCount} items synced ✅`,
        });
      } else {
        setSyncStatus("nonew"); // 🔵 show nothing new permanently
        Toast.show({
          type: "info",
          text1: "Nothing new to sync",
          text2: "Your data is already up-to-date ℹ️",
        });
      }
    } else {
      setSyncStatus("failed"); // ❌ show failed permanently
      Toast.show({
        type: "error",
        text1: "Sync Failed!",
        text2: result.message || "Please try again ❌",
      });
    }
  };

//   const handleSync = async (onOrderSynced) => {
//   try {
//     // --- Fetch all data ---
//     const allCustomers = await getAllCustomersForSync();
//     const allItems = await getAllItemsForSync();
//     const allBookings = await getAllOrderBookings();
//     const allLines = await getAllOrderBookingLines();
//     const allReceipts = await getAllCustomerReceiptsForSync();

//     // --- Load previously synced row counts ---
//     const [
//       prevCustomerCountStr,
//       prevItemCountStr,
//       prevBookingCountStr,
//       prevLineCountStr,
//       prevReceiptCountStr,
//     ] = await Promise.all([
//       AsyncStorage.getItem("synced_customer_count"),
//       AsyncStorage.getItem("synced_item_count"),
//       AsyncStorage.getItem("synced_booking_count"),
//       AsyncStorage.getItem("synced_line_count"),
//       AsyncStorage.getItem("synced_receipt_count"),
//     ]);

//     const prevCustomerCount = prevCustomerCountStr ? Number(prevCustomerCountStr) : 0;
//     const prevItemCount = prevItemCountStr ? Number(prevItemCountStr) : 0;
//     const prevBookingCount = prevBookingCountStr ? Number(prevBookingCountStr) : 0;
//     const prevLineCount = prevLineCountStr ? Number(prevLineCountStr) : 0;
//     const prevReceiptCount = prevReceiptCountStr ? Number(prevReceiptCountStr) : 0;

//     // --- Check if any table has changed ---
//     const isUpdated =
//       allCustomers.length !== prevCustomerCount ||
//       allItems.length !== prevItemCount ||
//       allBookings.length !== prevBookingCount ||
//       allLines.length !== prevLineCount ||
//       allReceipts.length !== prevReceiptCount;

//     if (!isUpdated) {
//       console.log("Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Prepare payload ---
//     const payload = {
//       customers: allCustomers,
//       items: allItems,
//       order_booking: allBookings,
//       order_booking_line: allLines,
//       receipts: allReceipts,
//     };

//     console.log("SYNC PAYLOAD:", payload);

//     // --- Send to API ---  
//     // "https://192.168.1.3:3000/api/order-booking/sync",
//     // "https://staging.axonerp.com/api/order-booking/sync",

//     const response = await fetch(
//           "https://staging.axonerp.com/api/order-booking/sync",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       }
//     );

//     const result = await response.json();

//     if (result.success) {
//       // --- Mark synced rows in database ---
//       await Promise.all([
//         ...allReceipts.map((r) => markCustomerReceiptSynced(r.id)),
//         ...allBookings.map((b) => markOrderSynced(b.booking_id)),
//       ]);

//       // --- Update synced counts in AsyncStorage ---
//       await Promise.all([
//         AsyncStorage.setItem("synced_customer_count", allCustomers.length.toString()),
//         AsyncStorage.setItem("synced_item_count", allItems.length.toString()),
//         AsyncStorage.setItem("synced_booking_count", allBookings.length.toString()),
//         AsyncStorage.setItem("synced_line_count", allLines.length.toString()),
//         AsyncStorage.setItem("synced_receipt_count", allReceipts.length.toString()),
//       ]);

//       const syncedCount =
//         allCustomers.length +
//         allItems.length +
//         allBookings.length +
//         allLines.length +
//         allReceipts.length;

//       console.log("Data synced successfully!", result);

//       // --- Notify OrderDetailScreen to update UI ---
//       if (onOrderSynced && typeof onOrderSynced === "function") {
//         onOrderSynced(allBookings.map((b) => b.booking_id));
//       }

//       return { success: true, message: "Data synced successfully", syncedCount };
//     } else {
//       console.log("Sync failed:", result.error);
//       return { success: false, message: result.error || "Sync failed", syncedCount: 0 };
//     }
//   } catch (err) {
//     console.log("Sync error:", err);
//     return { success: false, message: err.message || "Something went wrong", syncedCount: 0 };
//   }
// };


const openProfile = () => {
  setIsProfileOpen(true);
  Animated.timing(slideAnim, {
    toValue: 0, // fully visible
    duration: 300,
    useNativeDriver: false,
    easing: Easing.out(Easing.ease),
  }).start();
};

const closeProfile = () => {
  Animated.timing(slideAnim, {
    toValue: -width, // move out to left
    duration: 300,
    useNativeDriver: false,
    easing: Easing.in(Easing.ease),
  }).start(() => setIsProfileOpen(false));
};


  const menu = [
    {
      title: "Order Booking",
      icon: require("../assets/Icons/OrderBooking.png"),
    },
    { title: "Payment Recovery", icon: require("../assets/Icons/payment.png") },
    {
      title: "Update Location",
      icon: require("../assets/Icons/UpdateLocation.png"),
    },
    {
      title: "Live Tracking",
      icon: require("../assets/Icons/LiveTraking.png"),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!isProfileOpen}>
        <View style={styles.headerWrapper}>
          <ImageBackground
            source={require("../assets/EllipseHome.png")}
            style={styles.bg}
            resizeMode="cover"
          >
            {/* Header */}
            <View style={styles.container}>
              <View style={styles.profileContainer}>
                <TouchableOpacity
                  // onPress={() => navigation.navigate("Profile")}
                  onPress={openProfile}
                >
                  <Image
                    source={require("../assets/Profile-Placeholder.jpg")}
                    style={styles.profileImage}
                  />
                </TouchableOpacity>
                <View style={styles.textContainer}>
                  <Text style={styles.name}>Hello, {userName || "User"}</Text>
                  <Text style={styles.welcome}>Welcome back</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.syncContainer}
                onPress={handleSyncPress}
              >
                {syncStatus === "loading" ? (
                  <ActivityIndicator size="small" color="orange" />
                ) : syncStatus === "success" ? (
                  <CloudCheck size={22} color="green" />
                ) : syncStatus === "nonew" ? (
                  <CloudCheck size={22} color="blue" />
                ) : syncStatus === "failed" ? (
                  <CloudOff size={22} color="red" />
                ) : (
                  <WifiSync size={22} color="black" />
                )}
              </TouchableOpacity>
            </View>

            {/* Balance */}
            {/* <View style={styles.balanceContainer}>
              <Text style={styles.baltitle}>Today BALANCE (Overall Sale)</Text>

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <EyeOff size={18} color="#fff" />
                ) : (
                  <Eye size={22} color="#fff" />
                )}
              </TouchableOpacity>

              <Text style={styles.amount}>
                {showBalance ? `Rs ${todaySales.toFixed(2)}` : "*****"}
              </Text>

              <View style={styles.perfRow}>
                <View style={styles.arrowBox}>
                  <ArrowUpRight size={12} color="#fff" />
                </View>
                <Text style={styles.avginc}>
                  {showBalance ? `Rs ${lastMonthSales.toFixed(2)}` : "*****"}
                </Text>
                <Text style={styles.avgSale}> last month</Text>
              </View>
            </View> */}

             <View style={{ marginTop: 15 }}>
    <UserStats key={refreshKey} />
  </View>
          </ImageBackground>


          {/* Tabs container overlapping background */}
          <View style={styles.tabsContainer}>
            {menu.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => {
                  if (item.title === "Order Booking")
                    navigation.navigate("Customer");
                  else if (item.title === "Live Tracking")
                    navigation.navigate("Live Tracking");
                  else if (item.title === "Update Location")
                    navigation.navigate("Update Location");
                  else if (item.title === "Payment Recovery")
                    navigation.navigate("Customers List");
                }}
              >
                <View style={styles.leftSection}>
                  <View style={styles.iconBox}>
                    <Image source={item.icon} style={styles.icon} />
                  </View>
                  <View style={styles.rowContainer}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.arrowBox2}>
                      <ArrowUpRight size={12} color="blue" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 25 }}>
          <OtherReports key={refreshKey} />
        </View>

        <RecentActivitySection />

    {/* Sidebar */}
{isProfileOpen && (
  <Animated.View
    style={{
      position: "absolute",
      top: 0,
      left: slideAnim,
      width: "75%",
      height: Dimensions.get("screen").height,
      backgroundColor: "#0a84ff",
      zIndex: 999,
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
      elevation: 2,
    }}
  >
    {/* Header with heading on left and close button on right */}
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 15,
        paddingVertical: 12,
        // borderBottomWidth: 1,
        // borderBottomColor: "#ddd",
        paddingTop: statusBarHeight + 8,
      }}
    >
      {/* Heading */}
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}>
        Profile
      </Text>

      {/* Close button */}
      <TouchableOpacity onPress={closeProfile}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff"  }}>✕</Text>
      </TouchableOpacity>
    </View>

    {/* Render ProfileScreen inside sidebar */}
    <ProfileScreen isSidebar={true} navigation={navigation} />
  </Animated.View>
)}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrapper: { position: "relative", width: "100%" },
  bg: { width: "100%", height: 420 },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  syncContainer: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 50,
    elevation: 3,
  },
  profileContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileImage: { width: 40, height: 40, borderRadius: 24 },
  textContainer: { flexDirection: "column" },
  name: { fontSize: 16, fontWeight: "600", color: "#fff" },
  welcome: { fontSize: 10, color: "#fff" },
  balanceContainer: { marginTop: 20, alignItems: "center" },
  baltitle: { fontSize: 14, color: "#fff", marginBottom: 6, fontWeight: "500" },
  amount: { fontSize: 36, color: "#fff", fontWeight: "700", marginTop: 4 },
  eyeButton: { position: "absolute", right: 25, top: 0 },
  perfRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  arrowBox: {
    width: 18,
    height: 18,
    backgroundColor: "#63b466cc",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  avginc: {
    fontSize: 10,
    color: "#fff",
    backgroundColor: "#63b466cc",
    fontWeight: "700",
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  avgSale: { fontSize: 10, color: "#fff", fontWeight: "500", marginLeft: 4 },
  tabsContainer: {
    position: "absolute",
    top: 230,
    left: 20,
    right: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 15,
    paddingBottom: 2,
    paddingHorizontal: 20,
    shadowRadius: 5,
    elevation: 4,
  },
  card: {
    width: "49%",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  leftSection: { flexDirection: "column" },
  iconBox: {
    backgroundColor: "#e1ecff",
    padding: 6,
    borderRadius: 10,
    marginBottom: 6,
    width: 42,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 11,
    color: "#2a2a2a",
    fontWeight: "700",
    flexShrink: 1,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrowBox2: {
    backgroundColor: "#e1ecff",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { width: 26, height: 26, resizeMode: "contain" },
});
