import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAllCustomers,
  searchCustomers,
  upsertCustomer,
  updateVisited,
  updateCustomerLastSeen,
} from "../db/database";
import { getCurrentUserId, openUserDB } from "../db/dbManager";

// ---------------------- Helper ----------------------
const getAvatarColor = (name) => {
  const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
  const charCode = name.charCodeAt(0) || 65;
  return colors[charCode % colors.length];
};

// ---------------------- Component ----------------------
export default function CustomerScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loadDBAndAPI = async () => {
      try {
        // 1️⃣ Load dynamic baseUrl and companyId from QR scan
        const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
        const companyIdStr = await AsyncStorage.getItem("company_id");
        const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

        if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

        // 2️⃣ Open the user DB with dynamic baseUrl
        const userId = await getCurrentUserId();
        await openUserDB(userId, baseUrl);
        console.log(`DB opened for user: ${userId} with baseUrl: ${baseUrl}`);

        // 3️⃣ Construct dynamic GraphQL URL
        const GRAPHQL_URL = `${baseUrl}/api/graphql`;

        
    // const GRAPHQL_URL = `http://192.168.1.3:3000/api/graphql`;


        // 4️⃣ Fetch customers from API
        const query = `
          query Customer($companyId: Int) {
            Customer(company_id: $companyId) {
              entity_id
              name
              phone
              email
              customer_rep_id

            }
          }
        `;
        const response = await fetch(GRAPHQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { companyId } }),
        });
        const json = await response.json();
        const apiCustomers = json?.data?.Customer || [];
        console.log("API Customers:", apiCustomers);

        // 5️⃣ Upsert API customers into local DB
        for (const c of apiCustomers) {
          await upsertCustomer({
            entity_id: c.entity_id,
            customer_rep_id: c.customer_rep_id,
            name: c.name,
            phone: c.phone,
            last_seen: null,
            visited: "Unvisited",
            latitude: null,
            longitude: null,
            location_status: "Not Updated",
          });
        }

        // 6️⃣ Load customers from local DB
        await fetchCustomersFromDB();
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    };

    loadDBAndAPI();
  }, []);

  const fetchCustomersFromDB = async () => {
    const data = await getAllCustomers();
    applyFilter(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchCustomersFromDB(); // reload whenever screen is focused
    }, [])
  );

  const applyFilter = (data) => {
    let filtered = [...data];
    if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
    else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
    setCustomers(filtered);
  };

  const handleFilterChange = async (type) => {
    setFilter(type);
    const all = await getAllCustomers();
    let filtered = [...all];
    if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
    else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
    setCustomers(filtered);
  };

  const handleSearch = async (text) => {
    setSearch(text);
    if (text.trim() === "") await fetchCustomersFromDB();
    else {
      const data = await searchCustomers(text);
      applyFilter(data);
    }
  };

  const toggleVisited = async (id, visited) => {
    const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
    const now = new Date().toISOString();
    await updateVisited(id, newStatus);
    await updateCustomerLastSeen(id, now);
    await fetchCustomersFromDB();
  };

  const handleCustomerPress = (customer) => {
    navigation.replace("Items", {
      customerId: customer.entity_id,
      customerName: customer.name,
      customerPhone: customer.phone,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleCustomerPress(item)}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <Text style={styles.phone}>📞 {item.phone}</Text>
        <Text style={styles.lastSeen}>Last Visit: {item.last_seen || "-"}</Text>
      </View>

      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => toggleVisited()}>
          <View
            style={[
              styles.visitedBox,
              {
                backgroundColor: item.visited === "Visited" ? "green" : "transparent",
                borderColor: item.visited === "Visited" ? "green" : "#888",
              },
            ]}
          >
            <Text
              style={[
                styles.tick,
                { color: item.visited === "Visited" ? "#fff" : "#666" },
              ]}
            >
              ✓
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (item.latitude != null && item.longitude != null) {
              navigation.navigate("Live Tracking", {
                customer: {
                  id: item.entity_id,
                  name: item.name,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  visited: item.visited,
                },
              });
            }
          }}
          disabled={item.latitude == null || item.longitude == null}
        >
          <Feather
            name="map-pin"
            size={20}
            color={item.latitude != null && item.longitude != null ? "#007bff" : "#ccc"}
            style={{ marginTop: 6 }}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* 🔍 Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search Customer..."
              value={search}
              onChangeText={handleSearch}
            />
            {search.length === 0 ? (
              <Feather name="search" size={20} color="#888" />
            ) : (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 🔘 Filter Buttons */}
        <View style={styles.filterContainer}>
          {["all", "visited", "notVisited"].map((type, index) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filter === type && styles.activeFilter,
                index === 0 && styles.leftButton,
                index === 2 && styles.rightButton,
              ]}
              onPress={() => handleFilterChange(type)}
            >
              <Text style={[styles.filterText, filter === type && styles.activeFilterText]}>
                {type === "all" ? "All" : type === "visited" ? "Visited" : "Not Visited"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 👥 Customer List */}
        <FlatList
          data={customers}
          keyExtractor={(item) => item.entity_id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------- STYLES ----------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1, paddingTop: 10, paddingHorizontal: 10, backgroundColor: "#fff" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
    justifyContent: "flex-start",
  },
  searchBar: { flex: 1, height: 40 },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 2,
    overflow: "hidden",
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#f8f9fa",
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
  leftButton: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  rightButton: { borderTopRightRadius: 2, borderBottomRightRadius: 2, borderRightWidth: 0 },
  filterText: { fontSize: 14, fontWeight: "600", color: "#444" },
  activeFilter: { backgroundColor: "#007bff" },
  activeFilterText: { color: "#fff" },
  itemContainer: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
    elevation: 1,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
  infoContainer: { flex: 1 },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "bold", fontSize: 16 },
  phone: { color: "#555", marginTop: 2 },
  lastSeen: { color: "#888", fontSize: 12, marginTop: 2 },
  iconContainer: { alignItems: "center", gap: 10 },
  visitedBox: { width: 24, height: 24, borderRadius: 4, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  tick: { fontWeight: "bold", fontSize: 16, textAlign: "center" },
});



// Updated 15-12-2025
// import React, { useEffect, useState, useCallback  } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Feather } from "@expo/vector-icons";
// import { useFocusEffect } from "@react-navigation/native";

// import {
//   getAllCustomers,
//   searchCustomers,
//   upsertCustomer,
//   updateVisited,
//   updateCustomerLastSeen,
//   clearUserData,
// } from "../db/database";

// import { getCurrentUserId, openUserDB } from "../db/dbManager";

// // ---------------------- GraphQL API ----------------------
// const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";
// const COMPANY_ID = 1; // change as needed

// const fetchCustomersFromAPI = async () => {
//   try {
//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//         }
//       }
//     `;
//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId: COMPANY_ID } }),
//     });
//     const json = await response.json();
//     if (json.errors) {
//       console.error("GraphQL errors:", json.errors);
//       // Alert.alert("Error", "Failed to fetch customers from API");
//       return [];
//     }
//     return json.data.Customer || [];
//   } catch (error) {
//     console.error("API fetch error:", error);
//     // Alert.alert("Error", "Cannot fetch customers from API");
//     return [];
//   }
// };

// // ---------------------- Helper ----------------------
// const getAvatarColor = (name) => {
//   const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
//   const charCode = name.charCodeAt(0) || 65;
//   return colors[charCode % colors.length];
// };

// // ---------------------- Component ----------------------
// export default function CustomerScreen({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");

//   useEffect(() => {
//     const loadDBAndAPI = async () => {
//       const userId = await getCurrentUserId();
//       await openUserDB(userId); // Open DB for logged-in user
//       console.log("DB opened for user:", userId);

//       // Optional: clear old data for fresh sync
//       // await clearUserData();

//       const apiCustomers = await fetchCustomersFromAPI();
//       console.log("API Customers:", apiCustomers);

//       // Upsert API customers into local DB
//       for (const c of apiCustomers) {
//         await upsertCustomer({
//           entity_id: c.entity_id,
//           name: c.name,
//           phone: c.phone,
//           last_seen: null,
//           visited: "Unvisited",
//           latitude: null,
//           longitude: null,
//           location_status: "Not Updated",
//         });
//       }

//       // Load customers from local DB
//       await fetchCustomersFromDB();
//     };

//     loadDBAndAPI();
//   }, []);

//   const fetchCustomersFromDB = async () => {
//     const data = await getAllCustomers();
//     applyFilter(data);
//   };

//   useFocusEffect(
//   useCallback(() => {
//     fetchCustomersFromDB(); // reload whenever screen is focused
//   }, [])
// );

//   const applyFilter = (data) => {
//     let filtered = [...data];
//     if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
//     else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleFilterChange = async (type) => {
//     setFilter(type);
//     const all = await getAllCustomers();
//     let filtered = [...all];
//     if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
//     else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleSearch = async (text) => {
//     setSearch(text);
//     if (text.trim() === "") await fetchCustomersFromDB();
//     else {
//       const data = await searchCustomers(text);
//       applyFilter(data);
//     }
//   };

//   const toggleVisited = async (id, visited) => {
//     const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
//     const now = new Date().toISOString();
//     await updateVisited(id, newStatus);
//     await updateCustomerLastSeen(id, now);
//     await fetchCustomersFromDB();
//   };

//   const handleCustomerPress = (customer) => {
//     navigation.replace("Items", {
//       customerId: customer.entity_id,
//       customerName: customer.name,
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.itemContainer}
//       onPress={() => handleCustomerPress(item)}
//     >
//       <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
//         <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
//       </View>

//       <View style={styles.infoContainer}>
//         <View style={styles.nameRow}>
//           <Text style={styles.name}>{item.name}</Text>
//         </View>
//         <Text style={styles.phone}>📞 {item.phone}</Text>
//         <Text style={styles.lastSeen}>Last Visit: {item.last_seen || "-"}</Text>
//       </View>

//       <View style={styles.iconContainer}>
//         <TouchableOpacity onPress={() => toggleVisited()}>
//           <View
//             style={[
//               styles.visitedBox,
//               {
//                 backgroundColor: item.visited === "Visited" ? "green" : "transparent",
//                 borderColor: item.visited === "Visited" ? "green" : "#888",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.tick,
//                 { color: item.visited === "Visited" ? "#fff" : "#666" },
//               ]}
//             >
//               ✓
//             </Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => {
//             if (item.latitude != null && item.longitude != null) {
//               navigation.navigate("Live Tracking", {
//                 customer: {
//                   id: item.entity_id,
//                   name: item.name,
//                   latitude: item.latitude,
//                   longitude: item.longitude,
//                   visited: item.visited,
//                 },
//               });
//             }
//           }}
//           disabled={item.latitude == null || item.longitude == null}
//         >
//           <Feather
//             name="map-pin"
//             size={20}
//             color={item.latitude != null && item.longitude != null ? "#007bff" : "#ccc"}
//             style={{ marginTop: 6 }}
//           />
//         </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 Search Bar */}
//         <View style={styles.searchRow}>
//           <View style={styles.searchContainer}>
//   <TextInput
//     style={styles.searchBar}
//     placeholder="Search Customer..."
//     value={search}
//     onChangeText={handleSearch}
//   />

//   {search.length === 0 ? (
//     // Show search icon when input is empty
//     <Feather name="search" size={20} color="#888" />
//   ) : (
//     // Show cross icon when there is text
//     <TouchableOpacity onPress={() => handleSearch("")}>
//       <Feather name="x" size={20} color="#888" />
//     </TouchableOpacity>
//   )}
// </View>

//         </View>

//         {/* 🔘 Filter Buttons */}
//         <View style={styles.filterContainer}>
//           {["all", "visited", "notVisited"].map((type, index) => (
//             <TouchableOpacity
//               key={type}
//               style={[
//                 styles.filterButton,
//                 filter === type && styles.activeFilter,
//                 index === 0 && styles.leftButton,
//                 index === 2 && styles.rightButton,
//               ]}
//               onPress={() => handleFilterChange(type)}
//             >
//               <Text style={[styles.filterText, filter === type && styles.activeFilterText]}>
//                 {type === "all" ? "All" : type === "visited" ? "Visited" : "Not Visited"}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* 👥 Customer List */}
//         <FlatList
//           data={customers}
//           keyExtractor={(item) => item.entity_id.toString()}
//           renderItem={renderItem}
//           showsVerticalScrollIndicator={false}
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// // ---------------------- STYLES ----------------------
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, paddingTop: 10, paddingHorizontal: 10, backgroundColor: "#fff" },
//   searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
//   searchContainer: {
//   flex: 1,
//   flexDirection: "row",
//   alignItems: "center",
//   borderWidth: 1,
//   borderColor: "#ccc",
//   borderRadius: 8,
//   paddingHorizontal: 10,
//   backgroundColor: "#f9f9f9",
//   justifyContent: "flex-start", // keeps icons at the end
// },
// searchBar: {
//   flex: 1,
//   height: 40,
// },

//   searchIcon: { marginLeft: 10 },
//   filterContainer: {
//     flexDirection: "row",
//     marginBottom: 6,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 2,
//     overflow: "hidden",
//   },
//   filterButton: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f8f9fa",
//     borderRightWidth: 1,
//     borderColor: "#ccc",
//   },
//   leftButton: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
//   rightButton: { borderTopRightRadius: 2, borderBottomRightRadius: 2, borderRightWidth: 0 },
//   filterText: { fontSize: 14, fontWeight: "600", color: "#444" },
//   activeFilter: { backgroundColor: "#007bff" },
//   activeFilterText: { color: "#fff" },
//   itemContainer: {
//     flexDirection: "row",
//     padding: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     alignItems: "center",
//     borderRadius: 8,
//     marginBottom: 6,
//     backgroundColor: "#fff",
//     elevation: 1,
//   },
//   avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, justifyContent: "center", alignItems: "center" },
//   avatarText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
//   infoContainer: { flex: 1 },
//   nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   name: { fontWeight: "bold", fontSize: 16 },
//   phone: { color: "#555", marginTop: 2 },
//   lastSeen: { color: "#888", fontSize: 12, marginTop: 2 },
//   iconContainer: { alignItems: "center", gap: 10 },
//   visitedBox: { width: 24, height: 24, borderRadius: 4, justifyContent: "center", alignItems: "center", borderWidth: 1 },
//   tick: { fontWeight: "bold", fontSize: 16, textAlign: "center" },
// });



// import React, { useEffect, useState, useCallback  } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Feather } from "@expo/vector-icons";
// import { useFocusEffect } from "@react-navigation/native";

// import {
//   getAllCustomers,
//   searchCustomers,
//   upsertCustomer,
//   updateVisited,
//   updateCustomerLastSeen,
//   clearUserData,
// } from "../db/database";

// import { getCurrentUserId, openUserDB } from "../db/dbManager";

// // ---------------------- GraphQL API ----------------------
// const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";
// const COMPANY_ID = 1; // change as needed

// const fetchCustomersFromAPI = async () => {
//   try {
//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//         }
//       }
//     `;
//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId: COMPANY_ID } }),
//     });
//     const json = await response.json();
//     if (json.errors) {
//       console.error("GraphQL errors:", json.errors);
//       // Alert.alert("Error", "Failed to fetch customers from API");
//       return [];
//     }
//     return json.data.Customer || [];
//   } catch (error) {
//     console.error("API fetch error:", error);
//     // Alert.alert("Error", "Cannot fetch customers from API");
//     return [];
//   }
// };

// // ---------------------- Helper ----------------------
// const getAvatarColor = (name) => {
//   const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
//   const charCode = name.charCodeAt(0) || 65;
//   return colors[charCode % colors.length];
// };

// // ---------------------- Component ----------------------
// export default function CustomerScreen({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");

//   useEffect(() => {
//     const loadDBAndAPI = async () => {
//       const userId = await getCurrentUserId();
//       await openUserDB(userId); // Open DB for logged-in user
//       console.log("DB opened for user:", userId);

//       // Optional: clear old data for fresh sync
//       // await clearUserData();

//       const apiCustomers = await fetchCustomersFromAPI();
//       console.log("API Customers:", apiCustomers);

//       // Upsert API customers into local DB
//       for (const c of apiCustomers) {
//         await upsertCustomer({
//           entity_id: c.entity_id,
//           name: c.name,
//           phone: c.phone,
//           last_seen: null,
//           visited: "Unvisited",
//           latitude: null,
//           longitude: null,
//           location_status: "Not Updated",
//         });
//       }

//       // Load customers from local DB
//       await fetchCustomersFromDB();
//     };

//     loadDBAndAPI();
//   }, []);

//   const fetchCustomersFromDB = async () => {
//     const data = await getAllCustomers();
//     applyFilter(data);
//   };

//   useFocusEffect(
//   useCallback(() => {
//     fetchCustomersFromDB(); // reload whenever screen is focused
//   }, [])
// );

//   const applyFilter = (data) => {
//     let filtered = [...data];
//     if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
//     else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleFilterChange = async (type) => {
//     setFilter(type);
//     const all = await getAllCustomers();
//     let filtered = [...all];
//     if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
//     else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleSearch = async (text) => {
//     setSearch(text);
//     if (text.trim() === "") await fetchCustomersFromDB();
//     else {
//       const data = await searchCustomers(text);
//       applyFilter(data);
//     }
//   };

//   const toggleVisited = async (id, visited) => {
//     const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
//     const now = new Date().toISOString();
//     await updateVisited(id, newStatus);
//     await updateCustomerLastSeen(id, now);
//     await fetchCustomersFromDB();
//   };

//   const handleCustomerPress = (customer) => {
//     navigation.replace("Items", {
//       customerId: customer.entity_id,
//       customerName: customer.name,
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.itemContainer}
//       onPress={() => handleCustomerPress(item)}
//     >
//       <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
//         <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
//       </View>

//       <View style={styles.infoContainer}>
//         <View style={styles.nameRow}>
//           <Text style={styles.name}>{item.name}</Text>
//         </View>
//         <Text style={styles.phone}>📞 {item.phone}</Text>
//         <Text style={styles.lastSeen}>Last Visit: {item.last_seen || "-"}</Text>
//       </View>

//       <View style={styles.iconContainer}>
//         <TouchableOpacity onPress={() => toggleVisited()}>
//           <View
//             style={[
//               styles.visitedBox,
//               {
//                 backgroundColor: item.visited === "Visited" ? "green" : "transparent",
//                 borderColor: item.visited === "Visited" ? "green" : "#888",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.tick,
//                 { color: item.visited === "Visited" ? "#fff" : "#666" },
//               ]}
//             >
//               ✓
//             </Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => {
//             if (item.latitude != null && item.longitude != null) {
//               navigation.navigate("Live Tracking", {
//                 customer: {
//                   id: item.entity_id,
//                   name: item.name,
//                   latitude: item.latitude,
//                   longitude: item.longitude,
//                   visited: item.visited,
//                 },
//               });
//             }
//           }}
//           disabled={item.latitude == null || item.longitude == null}
//         >
//           <Feather
//             name="map-pin"
//             size={20}
//             color={item.latitude != null && item.longitude != null ? "#007bff" : "#ccc"}
//             style={{ marginTop: 6 }}
//           />
//         </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 Search Bar */}
//         <View style={styles.searchRow}>
//           <View style={styles.searchContainer}>
//   <TextInput
//     style={styles.searchBar}
//     placeholder="Search Customer..."
//     value={search}
//     onChangeText={handleSearch}
//   />

//   {search.length === 0 ? (
//     // Show search icon when input is empty
//     <Feather name="search" size={20} color="#888" />
//   ) : (
//     // Show cross icon when there is text
//     <TouchableOpacity onPress={() => handleSearch("")}>
//       <Feather name="x" size={20} color="#888" />
//     </TouchableOpacity>
//   )}
// </View>

//         </View>

//         {/* 🔘 Filter Buttons */}
//         <View style={styles.filterContainer}>
//           {["all", "visited", "notVisited"].map((type, index) => (
//             <TouchableOpacity
//               key={type}
//               style={[
//                 styles.filterButton,
//                 filter === type && styles.activeFilter,
//                 index === 0 && styles.leftButton,
//                 index === 2 && styles.rightButton,
//               ]}
//               onPress={() => handleFilterChange(type)}
//             >
//               <Text style={[styles.filterText, filter === type && styles.activeFilterText]}>
//                 {type === "all" ? "All" : type === "visited" ? "Visited" : "Not Visited"}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* 👥 Customer List */}
//         <FlatList
//           data={customers}
//           keyExtractor={(item) => item.entity_id.toString()}
//           renderItem={renderItem}
//           showsVerticalScrollIndicator={false}
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// // ---------------------- STYLES ----------------------
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, paddingTop: 10, paddingHorizontal: 10, backgroundColor: "#fff" },
//   searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
//   searchContainer: {
//   flex: 1,
//   flexDirection: "row",
//   alignItems: "center",
//   borderWidth: 1,
//   borderColor: "#ccc",
//   borderRadius: 8,
//   paddingHorizontal: 10,
//   backgroundColor: "#f9f9f9",
//   justifyContent: "flex-start", // keeps icons at the end
// },
// searchBar: {
//   flex: 1,
//   height: 40,
// },

//   searchIcon: { marginLeft: 10 },
//   filterContainer: {
//     flexDirection: "row",
//     marginBottom: 6,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 2,
//     overflow: "hidden",
//   },
//   filterButton: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f8f9fa",
//     borderRightWidth: 1,
//     borderColor: "#ccc",
//   },
//   leftButton: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
//   rightButton: { borderTopRightRadius: 2, borderBottomRightRadius: 2, borderRightWidth: 0 },
//   filterText: { fontSize: 14, fontWeight: "600", color: "#444" },
//   activeFilter: { backgroundColor: "#007bff" },
//   activeFilterText: { color: "#fff" },
//   itemContainer: {
//     flexDirection: "row",
//     padding: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     alignItems: "center",
//     borderRadius: 8,
//     marginBottom: 6,
//     backgroundColor: "#fff",
//     elevation: 1,
//   },
//   avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, justifyContent: "center", alignItems: "center" },
//   avatarText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
//   infoContainer: { flex: 1 },
//   nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   name: { fontWeight: "bold", fontSize: 16 },
//   phone: { color: "#555", marginTop: 2 },
//   lastSeen: { color: "#888", fontSize: 12, marginTop: 2 },
//   iconContainer: { alignItems: "center", gap: 10 },
//   visitedBox: { width: 24, height: 24, borderRadius: 4, justifyContent: "center", alignItems: "center", borderWidth: 1 },
//   tick: { fontWeight: "bold", fontSize: 16, textAlign: "center" },
// });


// New DB Customer Screen

// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Feather } from "@expo/vector-icons";

// import {
//   initDB,
//   getAllCustomers,
//   searchCustomers,
//   upsertCustomer,
//   updateVisited,
//   updateCustomerLastSeen,
// } from "../db/database";

// // ---------------------- GraphQL API ----------------------
// const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";
// const COMPANY_ID = 1; // change as needed

// const fetchCustomersFromAPI = async () => {
//   try {
//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//         }
//       }
//     `;
//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         query,
//         variables: { companyId: COMPANY_ID },
//       }),
//     });
//     const json = await response.json();
//     if (json.errors) {
//       console.error("GraphQL errors:", json.errors);
//       Alert.alert("Error", "Failed to fetch customers from API");
//       return [];
//     }
//     return json.data.Customer || [];
//   } catch (error) {
//     console.error("API fetch error:", error);
//     Alert.alert("Error", "Cannot fetch customers from API");
//     return [];
//   }
// };

// // ---------------------- Helper ----------------------
// const getAvatarColor = (name) => {
//   const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
//   const charCode = name.charCodeAt(0) || 65;
//   return colors[charCode % colors.length];
// };

// // ---------------------- Component ----------------------
// export default function CustomerScreen({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");

//   useEffect(() => {
//     const loadDBAndAPI = async () => {
//       await initDB();

//       // 1️⃣ Fetch from API
//       const apiCustomers = await fetchCustomersFromAPI();
//       console.log("API Customers:", apiCustomers);

//       // 2️⃣ Save/update in local DB
//       for (const c of apiCustomers) {
//         await upsertCustomer({
//           entity_id: c.entity_id,
//           name: c.name,
//           phone: c.phone,
//           last_seen: null,
//           visited: "Unvisited",
//           latitude: null,
//           longitude: null,
//           location_status: "Not Updated",
//         });
//       }

//       // 3️⃣ Load from local DB
//       fetchCustomersFromDB();
//     };

//     loadDBAndAPI();
//   }, []);

//   const fetchCustomersFromDB = async () => {
//     const data = await getAllCustomers();
//     applyFilter(data);
//   };

//   const applyFilter = (data) => {
//     let filtered = [...data];
//     if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
//     else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleFilterChange = async (type) => {
//     setFilter(type);
//     const all = await getAllCustomers();
//     let filtered = [...all];
//     if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
//     else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleSearch = async (text) => {
//     setSearch(text);
//     if (text.trim() === "") fetchCustomersFromDB();
//     else {
//       const data = await searchCustomers(text);
//       applyFilter(data);
//     }
//   };

//   const toggleVisited = async (id, visited) => {
//     const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
//     const now = new Date().toISOString();
//     await updateVisited(id, newStatus);
//     await updateCustomerLastSeen(id, now);
//     fetchCustomersFromDB();
//   };

//   const handleCustomerPress = (customer) => {
//     navigation.replace("Items", {
//       customerId: customer.entity_id,
//       customerName: customer.name,
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.itemContainer}
//       onPress={() => handleCustomerPress(item)}
//     >
//       <View
//         style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}
//       >
//         <Text style={styles.avatarText}>
//           {item.name.charAt(0).toUpperCase()}
//         </Text>
//       </View>

//       <View style={styles.infoContainer}>
//         <View style={styles.nameRow}>
//           <Text style={styles.name}>{item.name}</Text>
//         </View>
//         <Text style={styles.phone}>📞 {item.phone}</Text>
//         <Text style={styles.lastSeen}>Last Visit: {item.last_seen || "-"}</Text>
//       </View>

//       <View style={styles.iconContainer}>
//         <TouchableOpacity
//           onPress={() => toggleVisited()}
//         >
//           <View
//             style={[
//               styles.visitedBox,
//               {
//                 backgroundColor: item.visited === "Visited" ? "green" : "transparent",
//                 borderColor: item.visited === "Visited" ? "green" : "#888",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.tick,
//                 { color: item.visited === "Visited" ? "#fff" : "#666" },
//               ]}
//             >
//               ✓
//             </Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => {
//             if (item.latitude != null && item.longitude != null) {
//               navigation.navigate("Live Tracking", {
//                 customer: {
//                   id: item.entity_id,
//                   name: item.name,
//                   latitude: item.latitude,
//                   longitude: item.longitude,
//                   visited: item.visited,
//                 },
//               });
//             }
//           }}
//           disabled={item.latitude == null || item.longitude == null}
//         >
//           <Feather
//             name="map-pin"
//             size={20}
//             color={
//               item.latitude != null && item.longitude != null ? "#007bff" : "#ccc"
//             }
//             style={{ marginTop: 6 }}
//           />
//         </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 Search Bar */}
//         <View style={styles.searchRow}>
//           <View style={styles.searchContainer}>
//             <TextInput
//               style={styles.searchBar}
//               placeholder="Search Customer..."
//               value={search}
//               onChangeText={handleSearch}
//             />
//             <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
//           </View>
//         </View>

//         {/* 🔘 Filter Buttons */}
//         <View style={styles.filterContainer}>
//           {["all", "visited", "notVisited"].map((type, index) => (
//             <TouchableOpacity
//               key={type}
//               style={[
//                 styles.filterButton,
//                 filter === type && styles.activeFilter,
//                 index === 0 && styles.leftButton,
//                 index === 2 && styles.rightButton,
//               ]}
//               onPress={() => handleFilterChange(type)}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   filter === type && styles.activeFilterText,
//                 ]}
//               >
//                 {type === "all"
//                   ? "All"
//                   : type === "visited"
//                   ? "Visited"
//                   : "Not Visited"}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* 👥 Customer List */}
//         <FlatList
//           data={customers}
//           keyExtractor={(item) => item.entity_id.toString()}
//           renderItem={renderItem}
//           showsVerticalScrollIndicator={false}
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// // ---------------------- STYLES ----------------------
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, paddingTop: 10, paddingHorizontal: 10, backgroundColor: "#fff" },
//   searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
//   searchContainer: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     backgroundColor: "#f9f9f9",
//   },
//   searchBar: { flex: 1, height: 40 },
//   searchIcon: { marginLeft: 10 },
//   filterContainer: {
//     flexDirection: "row",
//     marginBottom: 6,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 2,
//     overflow: "hidden",
//   },
//   filterButton: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f8f9fa",
//     borderRightWidth: 1,
//     borderColor: "#ccc",
//   },
//   leftButton: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
//   rightButton: { borderTopRightRadius: 2, borderBottomRightRadius: 2, borderRightWidth: 0 },
//   filterText: { fontSize: 14, fontWeight: "600", color: "#444" },
//   activeFilter: { backgroundColor: "#007bff" },
//   activeFilterText: { color: "#fff" },
//   itemContainer: {
//     flexDirection: "row",
//     padding: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     alignItems: "center",
//     borderRadius: 8,
//     marginBottom: 6,
//     backgroundColor: "#fff",
//     elevation: 1,
//   },
//   avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, justifyContent: "center", alignItems: "center" },
//   avatarText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
//   infoContainer: { flex: 1 },
//   nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   name: { fontWeight: "bold", fontSize: 16 },
//   phone: { color: "#555", marginTop: 2 },
//   lastSeen: { color: "#888", fontSize: 12, marginTop: 2 },
//   iconContainer: { alignItems: "center", gap: 10 },
//   visitedBox: { width: 24, height: 24, borderRadius: 4, justifyContent: "center", alignItems: "center", borderWidth: 1 },
//   tick: { fontWeight: "bold", fontSize: 16, textAlign: "center" },
// });






// Fetch Custoemrs from API

// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
// } from "react-native";
// import {
//   initDB,
//   getAllCustomers,
//   searchCustomers,
//   updateVisited,
//   updateCustomerLastSeen,
// } from "../database"; // ✅ added function to update last_seen
// import { Feather } from "@expo/vector-icons";
// import { SafeAreaView } from "react-native-safe-area-context";

// const getAvatarColor = (name) => {
//   const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
//   const charCode = name.charCodeAt(0) || 65;
//   return colors[charCode % colors.length];
// };

// export default function CustomerScreen({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");

//   useEffect(() => {
//     const loadDB = async () => {
//       await initDB();
//       fetchCustomers();
//     };
//     loadDB();
//   }, []);

//   const fetchCustomers = async () => {
//     const data = await getAllCustomers();
//     applyFilter(data);
//   };

//   const applyFilter = (data) => {
//     let filtered = [...data];
//     if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
//     else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleFilterChange = async (type) => {
//     setFilter(type);
//     const all = await getAllCustomers();
//     let filtered = [...all];
//     if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
//     else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleSearch = async (text) => {
//     setSearch(text);
//     if (text.trim() === "") fetchCustomers();
//     else {
//       const data = await searchCustomers(text);
//       applyFilter(data);
//     }
//   };

//   // ✅ toggle visited and update last_seen
//   const toggleVisited = async (id, visited) => {
//     const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
//     const now = new Date().toISOString();
//     await updateVisited(id, newStatus);          // update visited status
//     await updateCustomerLastSeen(id, now);       // update last_seen timestamp
//     fetchCustomers();
//   };

//   const handleCustomerPress = (customer) => {
//     navigation.replace("Items", {
//       customerId: customer.entity_id,
//       customerName: customer.name,
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.itemContainer}
//       onPress={() => handleCustomerPress(item)}
//     >
//       <View
//         style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}
//       >
//         <Text style={styles.avatarText}>
//           {item.name.charAt(0).toUpperCase()}
//         </Text>
//       </View>

//       <View style={styles.infoContainer}>
//         <View style={styles.nameRow}>
//           <Text style={styles.name}>{item.name}</Text>
//         </View>
//         <Text style={styles.phone}>📞 {item.phone}</Text>
//         <Text style={styles.lastSeen}>Last Visit: {item.last_seen}</Text>
//       </View>

//       <View style={styles.iconContainer}>
//         <TouchableOpacity
//           onPress={() => toggleVisited()}
//         >
//           <View
//             style={[
//               styles.visitedBox,
//               {
//                 backgroundColor: item.visited === "Visited" ? "green" : "transparent",
//                 borderColor: item.visited === "Visited" ? "green" : "#888",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.tick,
//                 { color: item.visited === "Visited" ? "#fff" : "#666" },
//               ]}
//             >
//               ✓
//             </Text>
//           </View>
//         </TouchableOpacity>

//         {/* <TouchableOpacity
//           onPress={() =>
//             navigation.navigate("Live Tracking", {
//               customer: {
//                 id: item.entity_id,
//                 name: item.name,
//                 latitude: item.latitude,
//                 longitude: item.longitude,
//                 visited: item.visited,
//               },
//             })
//           }
//         >
//           <Feather
//             name="map-pin"
//             size={20}
//             color="#007bff"
//             style={{ marginTop: 6 }}
//           />
//         </TouchableOpacity> */}
//          <TouchableOpacity
//         onPress={() => {
//           if (item.latitude != null && item.longitude != null) {
//             navigation.navigate("Live Tracking", {
//               customer: {
//                 id: item.entity_id,
//                 name: item.name,
//                 latitude: item.latitude,
//                 longitude: item.longitude,
//                 visited: item.visited,
//               },
//             });
//           }
//         }}
//         disabled={item.latitude == null || item.longitude == null} // disable if no location
//       >
//         <Feather
//           name="map-pin"
//           size={20}
//           color={
//             item.latitude != null && item.longitude != null ? "#007bff" : "#ccc"
//           }
//           style={{ marginTop: 6 }}
//         />
//       </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 Search Bar */}
//         <View style={styles.searchRow}>
//           <View style={styles.searchContainer}>
//             <TextInput
//               style={styles.searchBar}
//               placeholder="Search Customer..."
//               value={search}
//               onChangeText={handleSearch}
//             />
//             <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
//           </View>
//         </View>

//         {/* 🔘 Compact Filter Buttons */}
//         <View style={styles.filterContainer}>
//           {["all", "visited", "notVisited"].map((type, index) => (
//             <TouchableOpacity
//               key={type}
//               style={[
//                 styles.filterButton,
//                 filter === type && styles.activeFilter,
//                 index === 0 && styles.leftButton,
//                 index === 2 && styles.rightButton,
//               ]}
//               onPress={() => handleFilterChange(type)}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   filter === type && styles.activeFilterText,
//                 ]}
//               >
//                 {type === "all"
//                   ? "All"
//                   : type === "visited"
//                   ? "Visited"
//                   : "Not Visited"}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* 👥 Customer List */}
//         <FlatList
//           data={customers}
//           keyExtractor={(item) => item.entity_id.toString()}
//           renderItem={renderItem}
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
//     paddingTop: 10,
//     paddingHorizontal: 10,
//     backgroundColor: "#fff",
//   },

//   searchRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   searchContainer: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     backgroundColor: "#f9f9f9",
//   },
//   searchBar: {
//     flex: 1,
//     height: 40,
//   },
//   searchIcon: {
//     marginLeft: 10,
//   },

//   // ✅ Compact Filter Layout
//   filterContainer: {
//     flexDirection: "row",
//     marginBottom: 6,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 2,
//     overflow: "hidden",
//   },
//   filterButton: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f8f9fa",
//     borderRightWidth: 1,
//     borderColor: "#ccc",
//   },
//   leftButton: {
//     borderTopLeftRadius: 2,
//     borderBottomLeftRadius: 2,
//   },
//   rightButton: {
//     borderTopRightRadius: 2,
//     borderBottomRightRadius: 2,
//     borderRightWidth: 0,
//   },
//   filterText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#444",
//   },
//   activeFilter: {
//     backgroundColor: "#007bff",
//   },
//   activeFilterText: {
//     color: "#fff",
//   },

//   itemContainer: {
//     flexDirection: "row",
//     padding: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     alignItems: "center",
//     borderRadius: 8,
//     marginBottom: 6,
//     backgroundColor: "#fff",
//     elevation: 1,
//   },
//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     marginRight: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   avatarText: {
//     fontSize: 20,
//     color: "#fff",
//     fontWeight: "bold",
//   },
//   infoContainer: { flex: 1 },
//   nameRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   name: {
//     fontWeight: "bold",
//     fontSize: 16,
//   },
//   phone: {
//     color: "#555",
//     marginTop: 2,
//   },
//   lastSeen: {
//     color: "#888",
//     fontSize: 12,
//     marginTop: 2,
//   },
//   iconContainer: {
//     alignItems: "center",
//     gap: 10,
//   },
//   visitedBox: {
//     width: 24,
//     height: 24,
//     borderRadius: 4,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//   },
//   tick: {
//     fontWeight: "bold",
//     fontSize: 16,
//     textAlign: "center",
//   },
// });




















// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
// } from "react-native";
// import {
//   initDB,
//   getAllCustomers,
//   searchCustomers,
//   updateVisited,
//   updateCustomerLastSeen,
// } from "../database"; // ✅ added function to update last_seen
// import { Feather } from "@expo/vector-icons";
// import { SafeAreaView } from "react-native-safe-area-context";

// const getAvatarColor = (name) => {
//   const colors = ["#FFB6C1", "#87CEFA", "#90EE90", "#FFA07A", "#DDA0DD"];
//   const charCode = name.charCodeAt(0) || 65;
//   return colors[charCode % colors.length];
// };

// export default function CustomerScreen({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState("all");

//   useEffect(() => {
//     const loadDB = async () => {
//       await initDB();
//       fetchCustomers();
//     };
//     loadDB();
//   }, []);

//   const fetchCustomers = async () => {
//     const data = await getAllCustomers();
//     applyFilter(data);
//   };

//   const applyFilter = (data) => {
//     let filtered = [...data];
//     if (filter === "visited") filtered = data.filter((i) => i.visited === "Visited");
//     else if (filter === "notVisited") filtered = data.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleFilterChange = async (type) => {
//     setFilter(type);
//     const all = await getAllCustomers();
//     let filtered = [...all];
//     if (type === "visited") filtered = all.filter((i) => i.visited === "Visited");
//     else if (type === "notVisited") filtered = all.filter((i) => i.visited === "Unvisited");
//     setCustomers(filtered);
//   };

//   const handleSearch = async (text) => {
//     setSearch(text);
//     if (text.trim() === "") fetchCustomers();
//     else {
//       const data = await searchCustomers(text);
//       applyFilter(data);
//     }
//   };

//   // ✅ toggle visited and update last_seen
//   const toggleVisited = async (id, visited) => {
//     const newStatus = visited === "Visited" ? "Unvisited" : "Visited";
//     const now = new Date().toISOString();
//     await updateVisited(id, newStatus);          // update visited status
//     await updateCustomerLastSeen(id, now);       // update last_seen timestamp
//     fetchCustomers();
//   };

//   const handleCustomerPress = (customer) => {
//     navigation.navigate("Items", {
//       customerId: customer.entity_id,
//       customerName: customer.name,
//     });
//   };

//   const renderItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.itemContainer}
//       onPress={() => handleCustomerPress(item)}
//     >
//       <View
//         style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}
//       >
//         <Text style={styles.avatarText}>
//           {item.name.charAt(0).toUpperCase()}
//         </Text>
//       </View>

//       <View style={styles.infoContainer}>
//         <View style={styles.nameRow}>
//           <Text style={styles.name}>{item.name}</Text>
//         </View>
//         <Text style={styles.phone}>📞 {item.phone}</Text>
//         <Text style={styles.lastSeen}>Last Visit: {item.last_seen}</Text>
//       </View>

//       <View style={styles.iconContainer}>
//         <TouchableOpacity
//           onPress={() => toggleVisited(item.entity_id, item.visited)}
//         >
//           <View
//             style={[
//               styles.visitedBox,
//               {
//                 backgroundColor: item.visited === "Visited" ? "green" : "transparent",
//                 borderColor: item.visited === "Visited" ? "green" : "#888",
//               },
//             ]}
//           >
//             <Text
//               style={[
//                 styles.tick,
//                 { color: item.visited === "Visited" ? "#fff" : "#666" },
//               ]}
//             >
//               ✓
//             </Text>
//           </View>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() =>
//             navigation.navigate("Live Tracking", {
//               customer: {
//                 id: item.entity_id,
//                 name: item.name,
//                 latitude: item.latitude,
//                 longitude: item.longitude,
//                 visited: item.visited,
//               },
//             })
//           }
//         >
//           <Feather
//             name="map-pin"
//             size={20}
//             color="#007bff"
//             style={{ marginTop: 6 }}
//           />
//         </TouchableOpacity>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <View style={styles.container}>
//         {/* 🔍 Search Bar */}
//         <View style={styles.searchRow}>
//           <View style={styles.searchContainer}>
//             <TextInput
//               style={styles.searchBar}
//               placeholder="Search Customer..."
//               value={search}
//               onChangeText={handleSearch}
//             />
//             <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
//           </View>
//         </View>

//         {/* 🔘 Compact Filter Buttons */}
//         <View style={styles.filterContainer}>
//           {["all", "visited", "notVisited"].map((type, index) => (
//             <TouchableOpacity
//               key={type}
//               style={[
//                 styles.filterButton,
//                 filter === type && styles.activeFilter,
//                 index === 0 && styles.leftButton,
//                 index === 2 && styles.rightButton,
//               ]}
//               onPress={() => handleFilterChange(type)}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   filter === type && styles.activeFilterText,
//                 ]}
//               >
//                 {type === "all"
//                   ? "All"
//                   : type === "visited"
//                   ? "Visited"
//                   : "Not Visited"}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* 👥 Customer List */}
//         <FlatList
//           data={customers}
//           keyExtractor={(item) => item.entity_id.toString()}
//           renderItem={renderItem}
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
//     paddingTop: 10,
//     paddingHorizontal: 10,
//     backgroundColor: "#fff",
//   },

//   searchRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   searchContainer: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     backgroundColor: "#f9f9f9",
//   },
//   searchBar: {
//     flex: 1,
//     height: 40,
//   },
//   searchIcon: {
//     marginLeft: 10,
//   },

//   // ✅ Compact Filter Layout
//   filterContainer: {
//     flexDirection: "row",
//     marginBottom: 6,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 2,
//     overflow: "hidden",
//   },
//   filterButton: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f8f9fa",
//     borderRightWidth: 1,
//     borderColor: "#ccc",
//   },
//   leftButton: {
//     borderTopLeftRadius: 2,
//     borderBottomLeftRadius: 2,
//   },
//   rightButton: {
//     borderTopRightRadius: 2,
//     borderBottomRightRadius: 2,
//     borderRightWidth: 0,
//   },
//   filterText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#444",
//   },
//   activeFilter: {
//     backgroundColor: "#007bff",
//   },
//   activeFilterText: {
//     color: "#fff",
//   },

//   itemContainer: {
//     flexDirection: "row",
//     padding: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     alignItems: "center",
//     borderRadius: 8,
//     marginBottom: 6,
//     backgroundColor: "#fff",
//     elevation: 1,
//   },
//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     marginRight: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   avatarText: {
//     fontSize: 20,
//     color: "#fff",
//     fontWeight: "bold",
//   },
//   infoContainer: { flex: 1 },
//   nameRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   name: {
//     fontWeight: "bold",
//     fontSize: 16,
//   },
//   phone: {
//     color: "#555",
//     marginTop: 2,
//   },
//   lastSeen: {
//     color: "#888",
//     fontSize: 12,
//     marginTop: 2,
//   },
//   iconContainer: {
//     alignItems: "center",
//     gap: 10,
//   },
//   visitedBox: {
//     width: 24,
//     height: 24,
//     borderRadius: 4,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//   },
//   tick: {
//     fontWeight: "bold",
//     fontSize: 16,
//     textAlign: "center",
//   },
// });