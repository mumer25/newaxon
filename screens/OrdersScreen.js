import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getAllOrders } from "../db/database";
import { Home } from "lucide-react-native";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("all");

  const navigation = useNavigation();
  const route = useRoute();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data);

      if (route.params?.customerName) {
        setSearchQuery(route.params.customerName);
        setFilteredOrders(
          data.filter((item) =>
            item.customer_name
              ?.toLowerCase()
              .includes(route.params.customerName.toLowerCase())
          )
        );
      } else {
        setFilteredOrders(data);
        setSearchQuery("");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadOrders);
    return unsubscribe;
  }, [navigation, route.params?.customerName]);

  useEffect(() => {
    let result = orders;

    if (searchQuery.trim()) {
      result = result.filter(
        (item) =>
          item.customer_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.order_no.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const now = new Date();
    if (filterPeriod === "today") {
      result = result.filter(
        (item) =>
          new Date(item.order_date).toDateString() === now.toDateString()
      );
    } else if (filterPeriod === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      result = result.filter(
        (item) => new Date(item.order_date) >= weekAgo
      );
    } else if (filterPeriod === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      result = result.filter(
        (item) => new Date(item.order_date) >= monthAgo
      );
    }

    setFilteredOrders(result);
  }, [searchQuery, orders, filterPeriod]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading orders...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery
            ? `No orders found for "${searchQuery}"`
            : "No orders found"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Customer or Order No"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Feather name="search" size={20} color="gray" />
          )}
        </View>

        {/* FILTER */}
        <View style={styles.filterContainer}>
          <Picker
            selectedValue={filterPeriod}
            onValueChange={setFilterPeriod}
            style={styles.picker}
            dropdownIconColor="#007bff"
          >
            <Picker.Item label="All Orders" value="all" />
            <Picker.Item label="Today" value="today" />
            <Picker.Item label="Last Week" value="week" />
            <Picker.Item label="Last Month" value="month" />
          </Picker>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{filteredOrders.length}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Amount</Text>
            <Text style={styles.statValue}>
              Rs{" "}
              {filteredOrders
                .reduce((sum, o) => sum + (o.total_amount || 0), 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          {searchQuery ? (
            <Text style={styles.headerText}>
              <Text style={styles.grayText}>Customer: </Text>
              <Text style={styles.blueText}>{searchQuery}</Text>
            </Text>
          ) : (
            <Text style={[styles.headerText, styles.grayText]}>
              All Orders
            </Text>
          )}
        </View>

        {/* LIST */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.booking_id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.replace("Order Details", {
                  bookingId: item.booking_id,
                  customerId: item.customer_id,
                  customerName: item.customer_name,
                  orderNo: item.order_no,
                  customerPhone: item.customer_phone,

                })
              }
            >
              {/* ROW 1 */}
              <View style={styles.row}>
                <Text
                  style={styles.orderNo}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.order_no}
                </Text>

                {item.synced === 1 ? (
                  <Feather name="check-circle" size={20} color="green" />
                ) : (
                  <Feather name="clock" size={20} color="#999" />
                )}
              </View>

              {/* ROW 2 */}
              <View style={styles.row}>
                <Text
                  style={styles.customer}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.customer_name}
                </Text>

                <Text style={styles.date}>
                  {new Date(item.order_date).toLocaleDateString()}
                </Text>
              </View>

              {/* ROW 3 */}
              <View style={styles.row}>
                <Text style={styles.infoText}>
                  Items: {item.item_count}
                </Text>

                <Text style={styles.totalAmount}>
                  Rs {item.total_amount?.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* BOTTOM TAB */}
<View style={styles.bottomTabs}>
  {/* Home Tab */}
  <TouchableOpacity
    style={styles.tab}
    onPress={() => navigation.replace("Home")}
  >
    <Home size={22} color="gray" />
    <Text style={styles.tabText}>Home</Text>
  </TouchableOpacity>

  {/* Order Booking Tab */}
  <TouchableOpacity
    style={styles.tab}
    onPress={() => navigation.navigate("Customer")} // replace with your screen name
  >
    <Feather name="file-plus" size={22} color="gray" />
    <Text style={[styles.tabText, { color: "gray" }]}>Order Booking</Text>
  </TouchableOpacity>
</View>


      {/* BOTTOM TAB
      <View style={styles.bottomTabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.replace("Home")}
        >
          <Home size={22} color="gray" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
      </View> */}
    </SafeAreaView>
  );
}

/* ================== STYLES ================== */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1, padding: 10 },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 16, color: "#888" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14 },
  clearSearchBtn: { paddingHorizontal: 6 },
  clearSearchText: { fontSize: 18, color: "#999" },

  // filterContainer: {
  //   backgroundColor: "#fff",
  //   borderRadius: 10,
  //   marginBottom: 12,
  //   elevation: 2,
  // },
  // picker: { height: 48, color: "#000" },

    // 🗓 Filter
  filterContainer: {
  backgroundColor: "#fff",
  borderRadius: 10,
  paddingHorizontal: 12,
  marginBottom: 12,
  elevation: 2,
  justifyContent: "center",
  height: 30, // increase height for small screens
},
picker: {
  height: 60, // match container height
  color: "#000", // text color
  fontSize: 16, // visible font size
},

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  statLabel: { fontSize: 13, color: "gray" },
  statValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    textAlign: "center",
  },

  header: { marginBottom: 10 },
  headerText: { fontSize: 16, fontWeight: "500" },
  grayText: { color: "gray" },
  blueText: { color: "#007bff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  orderNo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  customer: {
    fontSize: 15,
    color: "#007bff",
    flex: 1,
    marginRight: 10,
  },
  date: { fontSize: 13, color: "#666" },
  infoText: { fontSize: 14, color: "#555" },
  totalAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  bottomTabs: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 96,
  paddingBottom: 38,
  backgroundColor: "#fff",
  flexDirection: "row", // added
  justifyContent: "space-around", // spread tabs evenly
  alignItems: "center",
},
tab: {
  alignItems: "center",
},
tabText: {
  fontSize: 10,
  color: "gray",
  marginTop: 2,
},


  // bottomTabs: {
  //   position: "absolute",
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   height: 96,
  //   paddingBottom: 35,
  //   backgroundColor: "#fff",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // tab: { alignItems: "center" },
  // tabText: { fontSize: 10, color: "gray", marginTop: 2 },
});



// Updated 15-12-2025
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   TextInput,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useNavigation, useRoute } from "@react-navigation/native";
// import { getAllOrders } from "../db/database";
// import { Home, QrCode } from "lucide-react-native";
// import { Feather } from "@expo/vector-icons";
// import { Picker } from "@react-native-picker/picker"; // npm install @react-native-picker/picker

// export default function OrdersScreen() {
//   const [orders, setOrders] = useState([]);
//   const [filteredOrders, setFilteredOrders] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [filterPeriod, setFilterPeriod] = useState("all"); // all | today | week | month

//   const navigation = useNavigation();
//   const route = useRoute();

//   const loadOrders = async () => {
//     setLoading(true);
//     try {
//       const data = await getAllOrders();
//       setOrders(data);

//       if (route.params?.customerName) {
//         setSearchQuery(route.params.customerName);
//         setFilteredOrders(
//           data.filter((item) =>
//             item.customer_name
//               ?.toLowerCase()
//               .includes(route.params.customerName.toLowerCase())
//           )
//         );
//       } else {
//         setFilteredOrders(data);
//         setSearchQuery("");
//       }
//     } catch (error) {
//       console.error("Error fetching orders:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const unsubscribe = navigation.addListener("focus", loadOrders);
//     return unsubscribe;
//   }, [navigation, route.params?.customerName]);

//   // 🔍 Filter and Search
//   useEffect(() => {
//     let result = orders;

//     // Search filter
//     if (searchQuery.trim() !== "") {
//       result = result.filter(
//         (item) =>
//           item.customer_name
//             ?.toLowerCase()
//             .includes(searchQuery.toLowerCase()) ||
//           item.order_no.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }

//     // Date filter
//     const now = new Date();
//     if (filterPeriod === "today") {
//       result = result.filter(
//         (item) =>
//           new Date(item.order_date).toDateString() === now.toDateString()
//       );
//     } else if (filterPeriod === "week") {
//       const weekAgo = new Date();
//       weekAgo.setDate(now.getDate() - 7);
//       result = result.filter(
//         (item) => new Date(item.order_date) >= weekAgo
//       );
//     } else if (filterPeriod === "month") {
//       const monthAgo = new Date();
//       monthAgo.setMonth(now.getMonth() - 1);
//       result = result.filter(
//         (item) => new Date(item.order_date) >= monthAgo
//       );
//     }

//     setFilteredOrders(result);
//   }, [searchQuery, orders, filterPeriod]);

//   if (loading) {
//     return (
//       <View style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color="#007bff" />
//         <Text>Loading orders...</Text>
//       </View>
//     );
//   }

//   if (orders.length === 0) {
//     return (
//       <View style={styles.emptyContainer}>
//         <Text style={styles.emptyText}>
//           {searchQuery
//             ? `No orders found for "${searchQuery}"`
//             : "No orders found"}
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 SEARCH BAR */}
//         {/* <View style={styles.searchContainer}>
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search Customer or Order No"
//             value={searchQuery}
//             onChangeText={setSearchQuery}
//           />
//           <Feather
//             name="search"
//             size={20}
//             color="gray"
//             style={styles.searchIcon}
//           />
//         </View> */}
//        <View style={styles.searchContainer}>
//   <TextInput
//     style={styles.searchInput}
//     placeholder="Search Customer or Order No"
//     value={searchQuery}
//     onChangeText={setSearchQuery}
//   />

//   {/* Conditional Icon */}
//   {searchQuery.length > 0 ? (
//     <TouchableOpacity
//       style={styles.clearSearchBtn}
//       onPress={() => setSearchQuery("")}
//     >
//       <Text style={styles.clearSearchText}>✕</Text>
//     </TouchableOpacity>
//   ) : (
//     <Feather
//       name="search"
//       size={20}
//       color="gray"
//       style={styles.searchIcon}
//     />
//   )}
// </View>

//         {/* 🗓 FILTER DROPDOWN */}
//       <View style={styles.filterContainer}>
//   <Picker
//     selectedValue={filterPeriod}
//     onValueChange={(itemValue) => setFilterPeriod(itemValue)}
//     style={styles.picker}
//     dropdownIconColor="#007bff"
//   >
//     <Picker.Item label="All Orders" value="all" color="#000" />
//     <Picker.Item label="Today" value="today" color="#000" />
//     <Picker.Item label="Last Week" value="week" color="#000" />
//     <Picker.Item label="Last Month" value="month" color="#000" />
//   </Picker>
// </View>



//         {/* 📊 DASHBOARD STATS */}
//         <View style={styles.statsRow}>
//           <View style={styles.statBox}>
//             <Text style={styles.statLabel}>Total Orders</Text>
//             <Text style={styles.statValue}>{filteredOrders.length}</Text>
//           </View>

//           <View style={styles.statBox}>
//             <Text style={styles.statLabel}>Total Amount</Text>
//             <Text style={styles.statValue}>
//               Rs{" "}
//               {filteredOrders
//                 .reduce((sum, o) => sum + (o.total_amount || 0), 0)
//                 .toFixed(2)}
//             </Text>
//           </View>
//         </View>

//         {/* HEADER */}
//         <View style={styles.header}>
//           {searchQuery.trim() !== "" ? (
//             <Text style={styles.headerText}>
//               <Text style={styles.grayText}>Customer: </Text>
//               <Text style={styles.blueText}>{searchQuery}</Text>
//             </Text>
//           ) : (
//             <Text style={[styles.headerText, styles.grayText]}>All Orders</Text>
//           )}
//         </View>

//         {/* ORDERS LIST */}
//         <FlatList
//           data={filteredOrders}
//           keyExtractor={(item) => item.booking_id.toString()}
//           renderItem={({ item }) => (
//             <TouchableOpacity
//   style={styles.card}
//   onPress={() =>
//     navigation.replace("Order Details", {
//       bookingId: item.booking_id,
//       customerId: item.customer_id,
//       customerName: item.customer_name,
//       orderNo: item.order_no,
//     })
//   }
// >
//   {/* Row 1: Order No + Sync Icon */}
//   <View style={styles.row}>
//     <Text style={styles.orderNo}>{item.order_no}</Text>
//     {item.synced == 1 ? (
//       <Feather name="check-circle" size={22} color="green" />
//     ) : (
//       <Feather name="clock" size={22} color="#999" />
//     )}
//   </View>

//   {/* Row 2: Customer Name + Date */}
//   <View style={styles.row}>
//     <Text style={styles.customer}>{item.customer_name}</Text>
//     <Text style={styles.date}>
//       {new Date(item.order_date).toLocaleDateString()}
//     </Text>
//   </View>

//   {/* Row 3: Items + Total */}
//   <View style={styles.row}>
//     <Text style={styles.infoText}>Items: {item.item_count}</Text>
//     <Text style={styles.totalAmount}>Rs {item.total_amount?.toFixed(2)}</Text>
//   </View>
// </TouchableOpacity>

//             // <TouchableOpacity
//             //   style={styles.card}
//             //   onPress={() =>
//             //     navigation.replace("Order Details", {
//             //       bookingId: item.booking_id,
//             //       customerId: item.customer_id,
//             //       customerName: item.customer_name,
//             //       orderNo: item.order_no,
//             //     })
//             //   }
//             // >
//             //   <View style={styles.headerRow}>
//             //     <Text style={styles.orderNo}>{item.order_no}</Text>
//             //     <Text style={styles.date}>
//             //       {new Date(item.order_date).toLocaleDateString()}
//             //     </Text>
//             //   </View>

//             //   <Text style={styles.customer}>{item.customer_name}</Text>

//             //   <View style={styles.infoRow}>
//             //     <Text style={styles.infoText}>Items: {item.item_count}</Text>
//             //     <Text style={styles.infoText}>
//             //       Total: Rs {item.total_amount?.toFixed(2)}
//             //     </Text>
//             //   </View>
//             // </TouchableOpacity>
//           )}
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 35 }}
//         />
//       </View>

//       {/* BOTTOM TABS */}
//       <View style={styles.bottomTabs}>
//         <TouchableOpacity
//           style={styles.tab}
//           onPress={() => navigation.replace("Home")}
//         >
//           <Home size={22} color="gray" />
//           <Text style={styles.tabText}>Home</Text>
//         </TouchableOpacity>

//         {/* <TouchableOpacity
//           style={styles.tab}
//           onPress={() => navigation.navigate("QRScan")}
//         >
//           <QrCode size={22} color="gray" />
//           <Text style={styles.tabText}>QR Scan</Text>
//         </TouchableOpacity> */}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, padding: 10 },

//   // 🔍 Search Bar
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     paddingVertical: 1,
//     marginBottom: 12,
//     elevation: 2,
//   },
//   searchInput: { flex: 1, fontSize: 14 },
//   // searchIcon: { marginLeft: 8 },
  
//   clearSearchBtn: {
//   position: "absolute",
//   right: 10,
//   height: "100%",
//   justifyContent: "center",
//   alignItems: "center",
//   paddingHorizontal: 6,
// },
// clearSearchText: {
//   fontSize: 18,
//   color: "#999",
//   fontWeight: "600",
// },
// searchIcon: {
//   marginRight: 10,
// },


//   // 🗓 Filter
//   filterContainer: {
//   backgroundColor: "#fff",
//   borderRadius: 10,
//   paddingHorizontal: 12,
//   marginBottom: 12,
//   elevation: 2,
//   justifyContent: "center",
//   height: 30, // increase height for small screens
// },
// picker: {
//   height: 60, // match container height
//   color: "#000", // text color
//   fontSize: 16, // visible font size
// },

//   // 📊 Dashboard Stats
//   statsRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 15,
//   },
//   statBox: {
//     flex: 1,
//     backgroundColor: "#fff",
//     padding: 15,
//     marginHorizontal: 4,
//     borderRadius: 12,
//     alignItems: "center",
//     elevation: 2,
//   },
//   statLabel: { fontSize: 13, color: "gray" },
//   statValue: {
//     marginTop: 5,
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#007bff",
//   },

//   // Header
//   header: { marginBottom: 10 },
//   headerText: { fontSize: 16, fontWeight: "500" },
//   grayText: { color: "gray" },
//   blueText: { color: "#007bff" },

//   // Cards
//   loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   emptyText: { fontSize: 16, color: "#888" },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 15,
//     marginVertical: 8,
//     elevation: 3,
//   },
//   row: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   alignItems: "center",
//   marginTop: 2,
// },
// totalAmount: {
//   fontSize: 14,
//   fontWeight: "600",
//   color: "#333",
// },

//   headerRow: { flexDirection: "row", justifyContent: "space-between" },
//   orderNo: { fontWeight: "bold", fontSize: 16, color: "#333" },
//   date: { color: "#666", fontSize: 13 },
//   customer: { marginTop: 5, fontSize: 15, color: "#007bff" },
//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 10,
//   },
//   infoText: { fontSize: 14, color: "#555" },

//   // Bottom Tabs
//   bottomTabs: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 96,
//     paddingBottom: 35,
//     flexDirection: "row",
//     justifyContent: "space-around",
//     alignItems: "center",
//     backgroundColor: "#fff",
//   },
//   tab: { alignItems: "center" },
//   tabText: { fontSize: 10, color: "gray", marginTop: 2 },
// });




// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useNavigation, useRoute } from "@react-navigation/native";
// import { getAllOrders, getOrdersByCustomer } from "../database";
// import { Home, QrCode } from "lucide-react-native";
// import { Feather } from '@expo/vector-icons'; 

// export default function OrdersScreen() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const navigation = useNavigation();
//   const route = useRoute();

//   const loadOrders = async () => {
//     setLoading(true);
//     try {
//       if (route.params?.customerId) {
//         const data = await getOrdersByCustomer(route.params.customerId);
//         setOrders(data);
//       } else {
//         const data = await getAllOrders();
//         setOrders(data);
//       }
//     } catch (error) {
//       console.error("Error fetching orders:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const unsubscribe = navigation.addListener("focus", loadOrders);
//     return unsubscribe;
//   }, [navigation, route.params?.customerId]);

//   if (loading) {
//     return (
//       <View style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color="#007bff" />
//         <Text>Loading orders...</Text>
//       </View>
//     );
//   }

//   if (orders.length === 0) {
//     return (
//       <View style={styles.emptyContainer}>
//         <Text style={styles.emptyText}>
//           {route.params?.customerName
//             ? `No orders found for ${route.params.customerName}`
//             : "No orders found"}
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           {route.params?.customerName ? (
//             <Text style={styles.headerText}>
//               <Text style={styles.grayText}>Customer: </Text>
//               <Text style={styles.blueText}>{route.params.customerName}</Text>
//             </Text>
//           ) : (
//             <Text style={[styles.headerText, styles.grayText]}>All Orders</Text>
//           )}
//         </View>

//         {/* Orders List */}
//         <FlatList
//           data={orders}
//           keyExtractor={(item) => item.booking_id.toString()}
//           renderItem={({ item }) => (
//             <TouchableOpacity
//               style={styles.card}
//               onPress={() =>
//                 navigation.navigate("Order Details", {
//                   bookingId: item.booking_id,
//                   customerId: item.customer_id,
//                   customerName: item.customer_name,
//                   orderNo: item.order_no,
//                 })
//               }
//             >
//               <View style={styles.headerRow}>
//                 <Text style={styles.orderNo}>{item.order_no}</Text>
//                 <Text style={styles.date}>
//                   {new Date(item.order_date).toLocaleDateString()}
//                 </Text>
//               </View>
//               <Text style={styles.customer}>{item.customer_name}</Text>
//               <View style={styles.infoRow}>
//                 <Text style={styles.infoText}>Items: {item.item_count}</Text>
//                 <Text style={styles.infoText}>
//                   Total: Rs {item.total_amount?.toFixed(2)}
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           )}
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 35 }}
//         />
//       </View>

//       {/* Manual Bottom Tabs with Icons */}
//       <View style={styles.bottomTabs}>
//         <TouchableOpacity
//           style={styles.tab}
//           onPress={() => navigation.navigate("MainTabs")}
//         >
//           <Home name="home" size={22} color="gray" />
//           <Text style={styles.tabText}>Home</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.tab}
//           onPress={() => navigation.navigate("QRScan")}
//         >
//           <QrCode name="camera" size={22} color="gray" />
//           <Text style={styles.tabText}>QR Scan</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, backgroundColor: "#f7f8fa", padding: 10 },
//   header: { marginBottom: 10 },
//   headerText: { fontSize: 16, fontWeight: "500" },
//   grayText: { color: "gray" },
//   blueText: { color: "#007bff" },
//   loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   emptyText: { fontSize: 16, color: "#888" },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 15,
//     marginVertical: 8,
//     elevation: 3,
//   },
//   headerRow: { flexDirection: "row", justifyContent: "space-between" },
//   orderNo: { fontWeight: "bold", fontSize: 16, color: "#333" },
//   date: { color: "#666", fontSize: 13 },
//   customer: { marginTop: 5, fontSize: 15, color: "#007bff" },
//   infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
//   infoText: { fontSize: 14, color: "#555" },

//   bottomTabs: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 96,
//     paddingBottom:35,
//     flexDirection: "row",
//     justifyContent: "space-around",
//     alignItems: "center",
//     backgroundColor: "#fff",
    
//   },
//   tab: {
//     alignItems: "center",
//   },
//   tabText: { fontSize: 10, color: "gray", marginTop: 2 },
// });











// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Platform,
//   ActivityIndicator,
// } from "react-native";
// import { getAllOrders } from "../database";
// import { useNavigation } from "@react-navigation/native";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function OrdersScreen() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigation = useNavigation();

//   const loadOrders = async () => {
//     try {
//       const data = await getAllOrders();
//       setOrders(data);
//     } catch (error) {
//       console.error("Error fetching orders:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const unsubscribe = navigation.addListener("focus", loadOrders);
//     return unsubscribe;
//   }, [navigation]);

//   if (loading) {
//     return (
//       <View style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color="#007bff" />
//         <Text>Loading orders...</Text>
//       </View>
//     );
//   }

//   if (orders.length === 0) {
//     return (
//       <View style={styles.emptyContainer}>
//         <Text style={styles.emptyText}>No orders found</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         <FlatList
//           data={orders}
//           keyExtractor={(item) => item.booking_id.toString()}
//           renderItem={({ item }) => (
//             <TouchableOpacity
//               style={styles.card}
//               onPress={() =>
//                 navigation.navigate("Order Details", {
//                   bookingId: item.booking_id,
//                   customerId: item.customer_id,
//                   customerName: item.customer_name, // pass customer name
//                   orderNo: item.order_no,           // pass order number
//                 })
//               }
//             >
//               <View style={styles.headerRow}>
//                 <Text style={styles.orderNo}>{item.order_no}</Text>
//                 <Text style={styles.date}>
//                   {new Date(item.order_date).toLocaleDateString()}
//                 </Text>
//               </View>

//               <Text style={styles.customer}>{item.customer_name}</Text>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoText}>Items: {item.item_count}</Text>
//                 <Text style={styles.infoText}>
//                   Total: Rs {item.total_amount?.toFixed(2)}
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           )}
//           showsVerticalScrollIndicator={false}
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: {
//     flex: 1,
//     backgroundColor: "#f7f8fa",
//     padding: 10,
//   },
//   loaderContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   emptyText: {
//     fontSize: 16,
//     color: "#888",
//   },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 15,
//     marginVertical: 8,
//     elevation: 3,
//   },
//   headerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   orderNo: {
//     fontWeight: "bold",
//     fontSize: 16,
//     color: "#333",
//   },
//   date: {
//     color: "#666",
//     fontSize: 13,
//   },
//   customer: {
//     marginTop: 5,
//     fontSize: 15,
//     color: "#007bff",
//   },
//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 10,
//   },
//   infoText: {
//     fontSize: 14,
//     color: "#555",
//   },
// });
