import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getItems,
  upsertItem,
  getOrderLineByBookingAndItem,
  addOrderBookingLine,
  updateOrderBookingLine,
} from "../db/database";
import { openUserDB, getCurrentUserId } from "../db/dbManager";
import { getBaseUrl, getGraphQLUrl} from "../utils/apiConfig";
import { fetchItemsFromAPI } from "../api/graphql";
import { Search, Plus, Minus, ShoppingCart } from "lucide-react-native";
import { Feather } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { fetchItemsFromAPIAndDB } from "../utils/fetchItemsFromAPIAndDB";


export default function ItemsScreen({ navigation, route }) {
  const customerId = route.params.customerId;
  const customerName = route.params.customerName || "Customer";
  const customerPhone = route.params.customerPhone;
  const bookingId = route.params.bookingId || null;

  const [imageErrors, setImageErrors] = useState({});
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState({});
  const [newItemsToAdd, setNewItemsToAdd] = useState([]);
  const [filterType, setFilterType] = useState("All Items");
  const [types, setTypes] = useState([]);
  const [loadingItems, setLoadingItems] = useState({}); // loader for plus/minus


//   useEffect(() => {
//   const loadDBAndAPI = async () => {
//     try {
//       console.log("🔹 Starting ItemsScreen load...");

//       // 1️⃣ Get baseUrl safely
//       const baseUrl = await getBaseUrl();
//       if (!baseUrl) throw new Error("Base URL not found. Make sure QR scan is done.");
//       console.log("Base URL:", baseUrl);

//       // 2️⃣ Get current user ID safely
//       const userId = await getCurrentUserId();
//       if (!userId) throw new Error("User ID not found. Make sure openUserDB() was called.");
//       console.log("User ID:", userId);

//       // 3️⃣ Open user's DB
//       await openUserDB(userId, baseUrl);
//       console.log("User DB opened successfully");

//       // 4️⃣ Load items from local DB first (fast)
//       await fetchItems("", "All Items");
//       console.log("Loaded items from local DB");

//       // 5️⃣ Load product types for filter
//       await loadProductTypes();

//       // 6️⃣ Load existing order if editing
//       if (bookingId) {
//         console.log("Booking ID found. Loading existing order...");
//         await loadExistingOrder();
//       }

//       // 7️⃣ Fetch items from API in the background
//       fetchItemsFromAPI()
//         .then(async (apiItems) => {
//           console.log("API items fetched:", apiItems.length, apiItems);

//           for (const item of apiItems) {
//             if (item.id) await upsertItem(item); // upsert into DB
//           }

//           // Reload items from DB after API sync
//           await fetchItems("", filterType);
//           await loadProductTypes();
//           console.log("Items updated from API");
//         })
//         .catch((err) => console.error("API fetch error:", err));

//       console.log("✅ ItemsScreen load completed successfully (local first)");
//     } catch (error) {
//       console.error("❌ Error loading DB/API:", error);
//       Alert.alert("Error", error.message || "Failed to load items.");
//     }
//   };

//   loadDBAndAPI();
// }, []);

//  // -------------------- LOAD ITEMS --------------------
//   useEffect(() => {
//     const loadItems = async () => {
//       try {
//         console.log("🔹 Loading items...");
//         // 1️⃣ Fetch items from API and upsert into DB
//         await fetchItemsFromAPIAndDB();

//         // 2️⃣ Load items from local DB
//         await fetchItems("", filterType);

//         // 3️⃣ Load product types for filter
//         await loadProductTypes();

//         // 4️⃣ Load existing order if editing
//         if (bookingId) await loadExistingOrder();

//         console.log("✅ Items loaded successfully");
//       } catch (err) {
//         console.error("Error loading items:", err);
//         Alert.alert("Error", "Failed to load items");
//       }
//     };

//     loadItems();
//   }, []);

useEffect(() => {
  const loadItems = async () => {
    try {
      console.log("🔹 Loading items from local DB...");

      // 1️⃣ Load items from local DB immediately
      await fetchItems("", filterType);
      await loadProductTypes();

      // 2️⃣ Load existing order if editing
      if (bookingId) await loadExistingOrder();

      console.log("✅ Items loaded from DB");

      // 3️⃣ Fetch items from API in the background (async, non-blocking)
      fetchItemsFromAPIAndDB()
        .then(async () => {
          console.log("🔹 API items fetched and updated in DB");

          // Reload items from DB after API sync
          await fetchItems("", filterType);
          await loadProductTypes();
          console.log("✅ Items updated from API");
        })
        .catch(err => console.error("API fetch error:", err));
    } catch (err) {
      console.error("Error loading items:", err);
      Alert.alert("Error", "Failed to load items");
    }
  };

  loadItems();
}, []);



//  useEffect(() => {
//   const loadDBAndAPI = async () => {
//     try {
//       console.log("🔹 Starting ItemsScreen load...");

//       // 1️⃣ Get baseUrl safely
//       const baseUrl = await getBaseUrl();
//       if (!baseUrl) throw new Error("Base URL not found. Make sure QR scan is done.");
//       console.log("Base URL:", baseUrl);

//       // 2️⃣ Get current user ID safely
//       const userId = await getCurrentUserId();
//       if (!userId) throw new Error("User ID not found. Make sure openUserDB() was called.");
//       console.log("User ID:", userId);

//       // 3️⃣ Open user's DB
//       await openUserDB(userId, baseUrl);
//       console.log("User DB opened successfully");

//       // 4️⃣ Fetch items from API
//       const apiItems = await fetchItemsFromAPI();
//       console.log("API items fetched:", apiItems.length, apiItems);

//       // 5️⃣ Upsert items into local DB safely
//       for (const item of apiItems) {
//         if (item.id) await upsertItem(item);
//       }
//       console.log("Items upserted into local DB");

//       // 6️⃣ Load items from DB with safe defaults
//       await fetchItems("", "All Items");

//       // 7️⃣ Load product types for filter
//       await loadProductTypes();

//       // 8️⃣ Load existing order if editing
//       if (bookingId) {
//         console.log("Booking ID found. Loading existing order...");
//         await loadExistingOrder();
//       }

//       console.log("✅ ItemsScreen load completed successfully");
//     } catch (error) {
//       console.error("❌ Error loading DB/API:", error);
//       Alert.alert("Error", error.message || "Failed to load items.");
//     }
//   };

//   loadDBAndAPI();
// }, []);




  useEffect(() => {
    setImageErrors({});
  }, [items]);

  const loadProductTypes = async () => {
    const allItems = await getItems();
    const uniqueTypes = [...new Set(allItems.map((i) => i.type).filter(Boolean))];
    setTypes(["All Items", ...uniqueTypes]);
  };

  const loadExistingOrder = async () => {
    const existingOrderList = [];
    const allItems = await getItems();
    for (const item of allItems) {
      const orderLines = await getOrderLineByBookingAndItem(bookingId, item.id);
      if (orderLines.length > 0) {
        const line = orderLines[0];
        existingOrderList.push({
          ...item,
          quantity: line.order_qty,
          total: line.order_qty * item.price,
        });
        setQuantity((prev) => ({ ...prev, [item.id]: line.order_qty.toString() }));
      }
    }
    setNewItemsToAdd(existingOrderList);
  };

  // const fetchItems = async (query = "", typeFilter = "") => {
  //   let data = await getItems(query);
  //   if (typeFilter && typeFilter !== "All Items") {
  //     data = data.filter((item) => item.type === typeFilter);
  //   }
  //   setItems(data);
  // };

  const fetchItems = async (query = "", typeFilter = "") => {
  let data = await getItems(query);
  data = data.map((item, index) => ({
    ...item,
    id: item.id ?? `tmp-${index}`,
    price: item.price ?? 0,
    stock: item.stock ?? 0,
    name: item.name ?? "Unnamed Item",
    type: item.type ?? "Unknown",
    image: item.image ?? null,
  }));

  if (typeFilter && typeFilter !== "All Items") {
    data = data.filter((item) => item.type === typeFilter);
  }
  setItems(data);
};


  const handleSearch = (text) => {
    setSearch(text);
    fetchItems(text, filterType);
  };

  // const handleFilterChange = (type) => {
  //   const nextType = filterType === type ? "All Items" : type;
  //   setFilterType(nextType);
  //   fetchItems(search, nextType);
  // };
  // Filter logic
const handleFilterChange = (type) => {
  if (filterType === type) return; // do nothing if same category clicked
  setFilterType(type);
  fetchItems(search, type);
};

  // const updateQuantity = async (itemId, newQty) => {
  //   setLoadingItems((prev) => ({ ...prev, [itemId]: true }));
  //   try {
  //     setQuantity((prev) => ({ ...prev, [itemId]: newQty.toString() }));

  //     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
  //     if (index !== -1) {
  //       if (newQty > 0) {
  //         const updatedList = [...newItemsToAdd];
  //         updatedList[index].quantity = newQty;
  //         updatedList[index].total = newQty * updatedList[index].price;
  //         setNewItemsToAdd(updatedList);
  //       } else {
  //         setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
  //       }
  //     } else if (newQty > 0) {
  //       const item = items.find((i) => i.id === itemId);
  //       if (item)
  //         setNewItemsToAdd([
  //           ...newItemsToAdd,
  //           { ...item, quantity: newQty, total: newQty * item.price },
  //         ]);
  //     }
  //   } finally {
  //     setLoadingItems((prev) => ({ ...prev, [itemId]: false }));
  //   }
  // };


  const updateQuantity = async (itemId, newQty) => {
  if (!itemId) {
    console.warn("updateQuantity called with null itemId");
    return;
  }

  setLoadingItems((prev) => ({
    ...prev,
    [itemId]: true,
  }));

  try {
    // Ensure newQty is a number and convert safely
    const qty = newQty != null ? parseInt(newQty, 10) : 0;
    setQuantity((prev) => ({
      ...prev,
      [itemId]: qty.toString(), // safe
    }));

    const index = newItemsToAdd.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      if (qty > 0) {
        const updatedList = [...newItemsToAdd];
        updatedList[index] = {
          ...updatedList[index],
          quantity: qty,
          total: qty * (updatedList[index].price ?? 0),
          id: updatedList[index].id ?? `tmp-${Math.random()}`, // ensure id
        };
        setNewItemsToAdd(updatedList);
      } else {
        // Remove if quantity zero
        setNewItemsToAdd((prev) =>
          prev.filter((i) => i.id != null && i.id !== itemId)
        );
      }
    } else if (qty > 0) {
      // Find item from main items list
      const item = items.find((i) => i.id === itemId);
      if (item) {
        setNewItemsToAdd((prev) => [
          ...prev,
          {
            ...item,
            id: item.id ?? `tmp-${Math.random()}`,
            quantity: qty,
            total: qty * (item.price ?? 0),
          },
        ]);
      }
    }
  } catch (err) {
    console.error("updateQuantity error:", err);
  } finally {
    setLoadingItems((prev) => ({ ...prev, [itemId]: false }));
  }
};

  const increaseQty = (itemId) => {
    // const current = parseInt(quantity[itemId] || "0") + 1;
    const current = parseInt(quantity[itemId] ?? "0", 10) + 1;
    updateQuantity(itemId, current);
  };

  const decreaseQty = (itemId) => {
    // const current = parseInt(quantity[itemId] || "0") - 1;
    // updateQuantity(itemId, current > 0 ? current : 0);
    const current = parseInt(quantity[itemId] ?? "0", 10) - 1;
updateQuantity(itemId, current > 0 ? current : 0);

  };

  const handleQuantityChange = (itemId, val) => {
    const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
    updateQuantity(itemId, num);
  };

  const handleProceed = async () => {
    if (newItemsToAdd.length === 0) {
      Alert.alert("Error", "Please add at least one item before proceeding.");
      return;
    }

    try {
      if (bookingId) {
        for (const item of newItemsToAdd) {
          const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
          if (existingLines.length > 0) {
            await updateOrderBookingLine(existingLines[0].line_id, {
              order_qty: item.quantity,
              amount: item.quantity * item.price,
            });
          } else {
            await addOrderBookingLine({
              booking_id: bookingId,
              item_id: item.id,
              order_qty: item.quantity,
              unit_price: item.price,
              amount: item.total,
            });
          }
        }
        // Alert.alert("Success", "Order updated successfully!");
        Toast.show({
  type: "success",
  text1: "Success",
  text2: "Order updated successfully!",
  position: "top",
  visibilityTime: 3000,
});
        navigation.replace("Order Details", {
          bookingId,
          customerId,
          customerName,
          orderNo: route.params.orderNo || "",
        });
      } else {
        navigation.navigate("Order List", {
          customerId,
          customerName,
          customerPhone,
          orderList: newItemsToAdd,
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add items");
    }
  };

  const handleViewOrders = () => {
    navigation.replace("All Orders", { customerId, customerName });
  };

  const markImageError = (itemId) => {
    setImageErrors((prev) => ({ ...prev, [itemId]: true }));
  };

  const renderItem = ({ item }) => {
    const useUri =
      !imageErrors[item.id] &&
      item.image &&
      typeof item.image === "string" &&
      item.image.trim() !== "";

    return (
      <View style={styles.itemContainer}>
        <Image
          source={
            useUri
              ? { uri: item.image.trim() }
              : require("../assets/Images/placeholder.png")
          }
          style={styles.itemImage}
          resizeMode="cover"
          onError={() => markImageError(item.id)}
        />

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.stockQtyRow}>
           <View style={styles.stockRow}>
              <Text style={styles.typeText}> {item.type || 0}</Text>
            </View>
            {/* <View style={styles.stockRow}>
              <ShoppingCart size={14} color="#10B981" />
              <Text style={styles.stockText}> {item.stock || 0}</Text>
            </View> */}

            <View style={styles.qtyBox}>
              {loadingItems[item.id] ? (
                <ActivityIndicator
                  size="small"
                  color="#2954E5"
                  style={{ marginHorizontal: 6 }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => decreaseQty(item.id)}
                    style={styles.qtyBtn}
                  >
                    <Minus size={16} color="#000" />
                  </TouchableOpacity>

                  <TextInput
                    placeholder="0"
                    keyboardType="number-pad"
                    style={styles.qtyInput}
                    // value={quantity[item.id] ? quantity[item.id].toString() : "0"}
                    value={(quantity[item.id] ?? 0).toString()}
                    onChangeText={(val) => handleQuantityChange(item.id, val)}
                  />

                  <TouchableOpacity
                    onPress={() => increaseQty(item.id)}
                    style={styles.qtyBtn}
                  >
                    <Plus size={16} color="#000" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <Text style={styles.itemPrice}>Rs.{item.price}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Customer:</Text>
            <Text style={styles.customerName} numberOfLines={2} ellipsizeMode="tail">
              {customerName}
            </Text>
          </View>

          <View style={styles.searchRow}>
            {/* <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search items..."
                value={search}
                onChangeText={handleSearch}
                style={styles.searchInput}
                placeholderTextColor="#888"
              />
              <TouchableOpacity onPress={() => handleSearch(search)}>
                <Search size={22} color="#2954E5" style={styles.searchIcon} />
              </TouchableOpacity>
            </View> */}
            <View style={styles.searchContainer}>
  <TextInput
    placeholder="Search items..."
    value={search}
    onChangeText={handleSearch}
    style={styles.searchInput}
    placeholderTextColor="#888"
  />

   {search.length === 0 ? (
    // Show search icon when input is empty
    <Feather name="search" size={20} color="#888" />
  ) : (
    // Show cross icon when there is text
    <TouchableOpacity onPress={() => handleSearch("")}>
      <Feather name="x" size={20} color="#888" />
    </TouchableOpacity>
  )}
</View>


            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
                  onPress={() => handleFilterChange(type)}
                >
                  <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 70 }}
            showsVerticalScrollIndicator={false}
          /> */}

            <FlatList
            data={items}
            keyExtractor={(item, index) => (item.id ?? index).toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 70 }}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.bottomButtons, bookingId ? { justifyContent: "center" } : { justifyContent: "space-between" }]}>
            {bookingId ? (
              <TouchableOpacity
                style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0", flex: 0.9 }]}
                onPress={handleProceed}
                disabled={newItemsToAdd.length === 0}
              >
                <Text style={styles.proceedText}>
                  Add to Order ({newItemsToAdd.length} items)
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0" }]}
                  onPress={handleProceed}
                  disabled={newItemsToAdd.length === 0}
                >
                  <Text style={styles.proceedText}>
                    Proceed ({newItemsToAdd.length} items)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewOrders}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
  container: { flex: 1, padding: 16, paddingBottom: 10 },
  customerInfo: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 },
  customerLabel: { fontSize: 15, fontWeight: "600", color: "#555", marginRight: 6 },
  customerName: { fontSize: 16, fontWeight: "bold", color: "#2954E5", flexShrink: 1 },

  searchRow: { marginVertical: 10 },
  searchContainer: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  paddingHorizontal: 10,
  backgroundColor: "#f9f9f9",
},
searchInput: {
  flex: 1,
  height: 40,
  color: "#000",
},
searchIcon: {
  marginLeft: 8,
},

  filterScroll: { marginTop: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 20, marginRight: 6, marginBottom: 6 },
  filterBtnActive: { backgroundColor: "#2954E5" },
  filterText: { color: "#555" },
  filterTextActive: { color: "#fff" },

  itemContainer: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", marginBottom: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemDetails: { flex: 1, marginLeft: 12 },
  itemName: { fontWeight: "bold", fontSize: 14 },
  stockQtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",top:2},
  stockRow: { flexDirection: "row", alignItems: "center" },
  typeText: { color: "#555", fontSize: 10,left:-3 },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 6,marginHorizontal: 2 },
  qtyBtn: { padding: 4 },
  qtyInput: { width: 40,height:20,padding: 0, textAlign: "center", fontSize: 14, color: "#000",
    marginHorizontal: 2,
   },
  itemPrice: { color: "#555", fontSize: 14 },

  bottomButtons: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", padding: 6, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#ddd" },
  proceedBtn: { flex: 0.7, padding: 18, borderRadius: 12, alignItems: "center" },
  proceedText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  viewAllBtn: { flex: 0.25, padding: 18, borderRadius: 12, alignItems: "center", backgroundColor: "#2954E5" },
  viewAllText: { color: "#fff", fontWeight: "600" },
});




// Updated 15-12-2025
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Alert,
//   KeyboardAvoidingView,
//   ScrollView,
//   ActivityIndicator,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   getItems,
//   upsertItem,
//   getOrderLineByBookingAndItem,
//   addOrderBookingLine,
//   updateOrderBookingLine,
// } from "../db/database";
// import { openUserDB, getCurrentUserId } from "../db/dbManager";
// import { fetchItemsFromAPI } from "../api/graphql";
// import { Search, Plus, Minus, ShoppingCart } from "lucide-react-native";
// import { Feather } from "@expo/vector-icons";


// export default function ItemsScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;

//   const [imageErrors, setImageErrors] = useState({});
//   const [items, setItems] = useState([]);
//   const [search, setSearch] = useState("");
//   const [quantity, setQuantity] = useState({});
//   const [newItemsToAdd, setNewItemsToAdd] = useState([]);
//   const [filterType, setFilterType] = useState("All Items");
//   const [types, setTypes] = useState([]);
//   const [loadingItems, setLoadingItems] = useState({}); // loader for plus/minus

//   useEffect(() => {
//     const loadDBAndAPI = async () => {
//       const userId = await getCurrentUserId();
//       await openUserDB(userId);

//       // 1️⃣ Fetch API items and upsert in DB
//       const apiItems = await fetchItemsFromAPI();
//       for (const item of apiItems) await upsertItem(item);

//       // 2️⃣ Load items from DB
//       await fetchItems("", "All Items");

//       // 3️⃣ Load product types for filter
//       await loadProductTypes();

//       // 4️⃣ Load existing order if editing
//       if (bookingId) await loadExistingOrder();
//     };
//     loadDBAndAPI();
//   }, []);

//   useEffect(() => {
//     setImageErrors({});
//   }, [items]);

//   const loadProductTypes = async () => {
//     const allItems = await getItems();
//     const uniqueTypes = [...new Set(allItems.map((i) => i.type).filter(Boolean))];
//     setTypes(["All Items", ...uniqueTypes]);
//   };

//   const loadExistingOrder = async () => {
//     const existingOrderList = [];
//     const allItems = await getItems();
//     for (const item of allItems) {
//       const orderLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//       if (orderLines.length > 0) {
//         const line = orderLines[0];
//         existingOrderList.push({
//           ...item,
//           quantity: line.order_qty,
//           total: line.order_qty * item.price,
//         });
//         setQuantity((prev) => ({ ...prev, [item.id]: line.order_qty.toString() }));
//       }
//     }
//     setNewItemsToAdd(existingOrderList);
//   };

//   const fetchItems = async (query = "", typeFilter = "") => {
//     let data = await getItems(query);
//     if (typeFilter && typeFilter !== "All Items") {
//       data = data.filter((item) => item.type === typeFilter);
//     }
//     setItems(data);
//   };

//   const handleSearch = (text) => {
//     setSearch(text);
//     fetchItems(text, filterType);
//   };

//   // const handleFilterChange = (type) => {
//   //   const nextType = filterType === type ? "All Items" : type;
//   //   setFilterType(nextType);
//   //   fetchItems(search, nextType);
//   // };
//   // Filter logic
// const handleFilterChange = (type) => {
//   if (filterType === type) return; // do nothing if same category clicked
//   setFilterType(type);
//   fetchItems(search, type);
// };

//   const updateQuantity = async (itemId, newQty) => {
//     setLoadingItems((prev) => ({ ...prev, [itemId]: true }));
//     try {
//       setQuantity((prev) => ({ ...prev, [itemId]: newQty.toString() }));

//       const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//       if (index !== -1) {
//         if (newQty > 0) {
//           const updatedList = [...newItemsToAdd];
//           updatedList[index].quantity = newQty;
//           updatedList[index].total = newQty * updatedList[index].price;
//           setNewItemsToAdd(updatedList);
//         } else {
//           setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//         }
//       } else if (newQty > 0) {
//         const item = items.find((i) => i.id === itemId);
//         if (item)
//           setNewItemsToAdd([
//             ...newItemsToAdd,
//             { ...item, quantity: newQty, total: newQty * item.price },
//           ]);
//       }
//     } finally {
//       setLoadingItems((prev) => ({ ...prev, [itemId]: false }));
//     }
//   };

//   const increaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") + 1;
//     updateQuantity(itemId, current);
//   };

//   const decreaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") - 1;
//     updateQuantity(itemId, current > 0 ? current : 0);
//   };

//   const handleQuantityChange = (itemId, val) => {
//     const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
//     updateQuantity(itemId, num);
//   };

//   const handleProceed = async () => {
//     if (newItemsToAdd.length === 0) {
//       Alert.alert("Error", "Please add at least one item before proceeding.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of newItemsToAdd) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             await updateOrderBookingLine(existingLines[0].line_id, {
//               order_qty: item.quantity,
//               amount: item.quantity * item.price,
//             });
//           } else {
//             await addOrderBookingLine({
//               booking_id: bookingId,
//               item_id: item.id,
//               order_qty: item.quantity,
//               unit_price: item.price,
//               amount: item.total,
//             });
//           }
//         }
//         Alert.alert("Success", "Order updated successfully!");
//         navigation.replace("Order Details", {
//           bookingId,
//           customerId,
//           customerName,
//           orderNo: route.params.orderNo || "",
//         });
//       } else {
//         navigation.navigate("Order List", {
//           customerId,
//           customerName,
//           orderList: newItemsToAdd,
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Failed to add items");
//     }
//   };

//   const handleViewOrders = () => {
//     navigation.replace("All Orders", { customerId, customerName });
//   };

//   const markImageError = (itemId) => {
//     setImageErrors((prev) => ({ ...prev, [itemId]: true }));
//   };

//   const renderItem = ({ item }) => {
//     const useUri =
//       !imageErrors[item.id] &&
//       item.image &&
//       typeof item.image === "string" &&
//       item.image.trim() !== "";

//     return (
//       <View style={styles.itemContainer}>
//         <Image
//           source={
//             useUri
//               ? { uri: item.image.trim() }
//               : require("../assets/Images/placeholder.png")
//           }
//           style={styles.itemImage}
//           resizeMode="cover"
//           onError={() => markImageError(item.id)}
//         />

//         <View style={styles.itemDetails}>
//           <Text style={styles.itemName} numberOfLines={1}>
//             {item.name}
//           </Text>

//           <View style={styles.stockQtyRow}>
//             <View style={styles.stockRow}>
//               <ShoppingCart size={14} color="#10B981" />
//               <Text style={styles.stockText}> {item.stock || 0}</Text>
//             </View>

//             <View style={styles.qtyBox}>
//               {loadingItems[item.id] ? (
//                 <ActivityIndicator
//                   size="small"
//                   color="#2954E5"
//                   style={{ marginHorizontal: 6 }}
//                 />
//               ) : (
//                 <>
//                   <TouchableOpacity
//                     onPress={() => decreaseQty(item.id)}
//                     style={styles.qtyBtn}
//                   >
//                     <Minus size={16} color="#000" />
//                   </TouchableOpacity>

//                   <TextInput
//                     placeholder="0"
//                     keyboardType="number-pad"
//                     style={styles.qtyInput}
//                     value={quantity[item.id] ? quantity[item.id].toString() : "0"}
//                     onChangeText={(val) => handleQuantityChange(item.id, val)}
//                   />

//                   <TouchableOpacity
//                     onPress={() => increaseQty(item.id)}
//                     style={styles.qtyBtn}
//                   >
//                     <Plus size={16} color="#000" />
//                   </TouchableOpacity>
//                 </>
//               )}
//             </View>
//           </View>

//           <Text style={styles.itemPrice}>Rs.{item.price}</Text>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }}>
//         <View style={styles.container}>
//           <View style={styles.customerInfo}>
//             <Text style={styles.customerLabel}>Customer:</Text>
//             <Text style={styles.customerName} numberOfLines={2} ellipsizeMode="tail">
//               {customerName}
//             </Text>
//           </View>

//           <View style={styles.searchRow}>
//             {/* <View style={styles.searchContainer}>
//               <TextInput
//                 placeholder="Search items..."
//                 value={search}
//                 onChangeText={handleSearch}
//                 style={styles.searchInput}
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={() => handleSearch(search)}>
//                 <Search size={22} color="#2954E5" style={styles.searchIcon} />
//               </TouchableOpacity>
//             </View> */}
//             <View style={styles.searchContainer}>
//   <TextInput
//     placeholder="Search items..."
//     value={search}
//     onChangeText={handleSearch}
//     style={styles.searchInput}
//     placeholderTextColor="#888"
//   />

//    {search.length === 0 ? (
//     // Show search icon when input is empty
//     <Feather name="search" size={20} color="#888" />
//   ) : (
//     // Show cross icon when there is text
//     <TouchableOpacity onPress={() => handleSearch("")}>
//       <Feather name="x" size={20} color="#888" />
//     </TouchableOpacity>
//   )}
// </View>


//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//               {types.map((type) => (
//                 <TouchableOpacity
//                   key={type}
//                   style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
//                   onPress={() => handleFilterChange(type)}
//                 >
//                   <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
//                     {type}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           <FlatList
//             data={items}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             contentContainerStyle={{ paddingBottom: 70 }}
//             showsVerticalScrollIndicator={false}
//           />

//           <View style={[styles.bottomButtons, bookingId ? { justifyContent: "center" } : { justifyContent: "space-between" }]}>
//             {bookingId ? (
//               <TouchableOpacity
//                 style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0", flex: 0.9 }]}
//                 onPress={handleProceed}
//                 disabled={newItemsToAdd.length === 0}
//               >
//                 <Text style={styles.proceedText}>
//                   Add to Order ({newItemsToAdd.length} items)
//                 </Text>
//               </TouchableOpacity>
//             ) : (
//               <>
//                 <TouchableOpacity
//                   style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0" }]}
//                   onPress={handleProceed}
//                   disabled={newItemsToAdd.length === 0}
//                 >
//                   <Text style={styles.proceedText}>
//                     Proceed ({newItemsToAdd.length} items)
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewOrders}>
//                   <Text style={styles.viewAllText}>View All</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
//   container: { flex: 1, padding: 16, paddingBottom: 10 },
//   customerInfo: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 },
//   customerLabel: { fontSize: 15, fontWeight: "600", color: "#555", marginRight: 6 },
//   customerName: { fontSize: 16, fontWeight: "bold", color: "#2954E5", flexShrink: 1 },

//   searchRow: { marginVertical: 10 },
//   searchContainer: {
//   flexDirection: "row",
//   alignItems: "center",
//   borderWidth: 1,
//   borderColor: "#ccc",
//   borderRadius: 8,
//   paddingHorizontal: 10,
//   backgroundColor: "#f9f9f9",
// },
// searchInput: {
//   flex: 1,
//   height: 40,
//   color: "#000",
// },
// searchIcon: {
//   marginLeft: 8,
// },

//   filterScroll: { marginTop: 6 },
//   filterBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 20, marginRight: 6, marginBottom: 6 },
//   filterBtnActive: { backgroundColor: "#2954E5" },
//   filterText: { color: "#555" },
//   filterTextActive: { color: "#fff" },

//   itemContainer: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", marginBottom: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
//   itemImage: { width: 60, height: 60, borderRadius: 8 },
//   itemDetails: { flex: 1, marginLeft: 12 },
//   itemName: { fontWeight: "bold", fontSize: 14 },
//   stockQtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
//   stockRow: { flexDirection: "row", alignItems: "center" },
//   qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 6,marginHorizontal: 2 },
//   qtyBtn: { padding: 4 },
//   qtyInput: { width: 40,height:20,padding: 0, textAlign: "center", fontSize: 14, color: "#000",
//     marginHorizontal: 2,
//    },
//   itemPrice: { color: "#555", fontSize: 14 },

//   bottomButtons: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", padding: 6, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#ddd" },
//   proceedBtn: { flex: 0.7, padding: 18, borderRadius: 12, alignItems: "center" },
//   proceedText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
//   viewAllBtn: { flex: 0.25, padding: 18, borderRadius: 12, alignItems: "center", backgroundColor: "#2954E5" },
//   viewAllText: { color: "#fff", fontWeight: "600" },
// });





// New DB Manager Fixes

// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Alert,
//   KeyboardAvoidingView,
//   ScrollView,
//   ActivityIndicator,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   // initDB,
//   getItems,
//   upsertItem,
//   getOrderLineByBookingAndItem,
//   addOrderBookingLine,
//   updateOrderBookingLine,
// } from "../db/database";
// import { openUserDB } from "../db/dbManager";
// import { fetchItemsFromAPI } from "../api/graphql";
// import { Search, Plus, Minus, ShoppingCart } from "lucide-react-native";

// export default function ItemsScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;

//   const [imageErrors, setImageErrors] = useState({});
//   const [items, setItems] = useState([]);
//   const [search, setSearch] = useState("");
//   const [quantity, setQuantity] = useState({});
//   const [newItemsToAdd, setNewItemsToAdd] = useState([]);
//   const [filterType, setFilterType] = useState("All Items");
//   const [types, setTypes] = useState([]);
//   const [loadingItems, setLoadingItems] = useState({}); // loader for plus/minus

//   useEffect(() => {
//     const loadDBAndAPI = async () => {
//       const userId = await getCurrentUserId(); // or get from login
// await openUserDB(userId);

//       const apiItems = await fetchItemsFromAPI();
//       for (const item of apiItems) await upsertItem(item);

//       await fetchItems("", "All Items");
//       await loadProductTypes();
//       if (bookingId) await loadExistingOrder();
//     };
//     loadDBAndAPI();
//   }, []);

//   useEffect(() => {
//     setImageErrors({});
//   }, [items]);

//   const loadProductTypes = async () => {
//     const allItems = await getItems();
//     const uniqueTypes = [...new Set(allItems.map((i) => i.type).filter(Boolean))];
//     setTypes(["All Items", ...uniqueTypes]);
//   };

//   const loadExistingOrder = async () => {
//     const existingOrderList = [];
//     const allItems = await getItems();
//     for (const item of allItems) {
//       const orderLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//       if (orderLines.length > 0) {
//         const line = orderLines[0];
//         existingOrderList.push({
//           ...item,
//           quantity: line.order_qty,
//           total: line.order_qty * item.price,
//         });
//         setQuantity((prev) => ({ ...prev, [item.id]: line.order_qty.toString() }));
//       }
//     }
//     setNewItemsToAdd(existingOrderList);
//   };

//   const fetchItems = async (query = "", typeFilter = "") => {
//     let data = await getItems(query);
//     if (typeFilter && typeFilter !== "All Items") {
//       data = data.filter((item) => item.type === typeFilter);
//     }
//     setItems(data);
//   };

//   const handleSearch = (text) => {
//     setSearch(text);
//     fetchItems(text, filterType);
//   };

//   const handleFilterChange = (type) => {
//     const nextType = filterType === type ? "All Items" : type;
//     setFilterType(nextType);
//     fetchItems(search, nextType);
//   };

//   // Quantity handlers with loader
//   const updateQuantity = async (itemId, newQty) => {
//     setLoadingItems((prev) => ({ ...prev, [itemId]: true }));
//     try {
//       setQuantity((prev) => ({ ...prev, [itemId]: newQty.toString() }));

//       const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//       if (index !== -1) {
//         if (newQty > 0) {
//           const updatedList = [...newItemsToAdd];
//           updatedList[index].quantity = newQty;
//           updatedList[index].total = newQty * updatedList[index].price;
//           setNewItemsToAdd(updatedList);
//         } else {
//           setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//         }
//       } else if (newQty > 0) {
//         const item = items.find((i) => i.id === itemId);
//         if (item)
//           setNewItemsToAdd([
//             ...newItemsToAdd,
//             { ...item, quantity: newQty, total: newQty * item.price },
//           ]);
//       }
//     } finally {
//       setLoadingItems((prev) => ({ ...prev, [itemId]: false }));
//     }
//   };

//   const increaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") + 1;
//     updateQuantity(itemId, current);
//   };

//   const decreaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") - 1;
//     updateQuantity(itemId, current > 0 ? current : 0);
//   };

//   const handleQuantityChange = (itemId, val) => {
//     const num = parseInt(val.replace(/[^0-9]/g, "")) || 0;
//     updateQuantity(itemId, num);
//   };

//   const handleProceed = async () => {
//     if (newItemsToAdd.length === 0) {
//       Alert.alert("Error", "Please add at least one item before proceeding.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of newItemsToAdd) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: item.quantity,
//               amount: item.quantity * item.price,
//             });
//           } else {
//             await addOrderBookingLine({
//               booking_id: bookingId,
//               item_id: item.id,
//               order_qty: item.quantity,
//               unit_price: item.price,
//               amount: item.total,
//             });
//           }
//         }
//         Alert.alert("Success", "Order updated successfully!");
//         navigation.navigate("Order Details", {
//           bookingId,
//           customerId,
//           customerName,
//           orderNo: route.params.orderNo || "",
//         });
//       } else {
//         navigation.navigate("Order List", {
//           customerId,
//           customerName,
//           orderList: newItemsToAdd,
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Failed to add items");
//     }
//   };

//   const handleViewOrders = () => {
//     navigation.navigate("All Orders", { customerId, customerName });
//   };

//   const markImageError = (itemId) => {
//     setImageErrors((prev) => ({ ...prev, [itemId]: true }));
//   };

//  const renderItem = ({ item }) => {
//   const useUri =
//     !imageErrors[item.id] &&
//     item.image &&
//     typeof item.image === "string" &&
//     item.image.trim() !== "";

//   return (
//     <View style={styles.itemContainer}>
//       <Image
//         source={
//           useUri
//             ? { uri: item.image.trim() }
//             : require("../assets/Images/placeholder.png")
//         }
//         style={styles.itemImage}
//         resizeMode="cover"
//         onError={() => markImageError(item.id)}
//       />

//       <View style={styles.itemDetails}>
//         <Text style={styles.itemName} numberOfLines={1}>
//           {item.name}
//         </Text>

//         <View style={styles.stockQtyRow}>
//           <View style={styles.stockRow}>
//             <ShoppingCart size={14} color="#10B981" />
//             <Text style={styles.stockText}> {item.stock || 0}</Text>
//           </View>

//           <View style={styles.qtyBox}>
//             {loadingItems[item.id] ? (
//               <ActivityIndicator
//                 size="small"
//                 color="#2954E5"
//                 style={{ marginHorizontal: 6 }}
//               />
//             ) : (
//               <>
//                 <TouchableOpacity
//                   onPress={() => decreaseQty(item.id)}
//                   style={styles.qtyBtn}
//                 >
//                   <Minus size={16} color="#000" />
//                 </TouchableOpacity>

//                 <TextInput
//                   placeholder="0"
//                   keyboardType="number-pad"
//                   style={styles.qtyInput}
//                   value={quantity[item.id] ? quantity[item.id].toString() : "0"}
//                   onChangeText={(val) => handleQuantityChange(item.id, val)}
//                 />

//                 <TouchableOpacity
//                   onPress={() => increaseQty(item.id)}
//                   style={styles.qtyBtn}
//                 >
//                   <Plus size={16} color="#000" />
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </View>

//         <Text style={styles.itemPrice}>Rs.{item.price}</Text>
//       </View>
//     </View>
//   );
// };


//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }}>
//         <View style={styles.container}>
//          <View style={styles.customerInfo}>
//   <Text style={styles.customerLabel}>Customer:</Text>
//   <Text style={styles.customerName} numberOfLines={2} ellipsizeMode="tail">
//     {customerName}
//   </Text>
// </View>


//           <View style={styles.searchRow}>
//             <View style={styles.searchContainer}>
//               <TextInput
//                 placeholder="Search items..."
//                 value={search}
//                 onChangeText={handleSearch}
//                 style={styles.searchInput}
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={() => handleSearch(search)}>
//                 <Search size={22} color="#2954E5" style={styles.searchIcon} />
//               </TouchableOpacity>
//             </View>

//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//               {types.map((type) => (
//                 <TouchableOpacity
//                   key={type}
//                   style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
//                   onPress={() => handleFilterChange(type)}
//                 >
//                   <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
//                     {type}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           <FlatList
//             data={items}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             contentContainerStyle={{ paddingBottom: 62 }}
//             showsVerticalScrollIndicator={false}
//           />

//           <View style={[styles.bottomButtons, bookingId ? { justifyContent: "center" } : { justifyContent: "space-between" }]}>
//             {bookingId ? (
//               <TouchableOpacity
//                 style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0", flex: 0.9 }]}
//                 onPress={handleProceed}
//                 disabled={newItemsToAdd.length === 0}
//               >
//                 <Text style={styles.proceedText}>
//                   Add to Order ({newItemsToAdd.length} items)
//                 </Text>
//               </TouchableOpacity>
//             ) : (
//               <>
//                 <TouchableOpacity
//                   style={[styles.proceedBtn, { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0" }]}
//                   onPress={handleProceed}
//                   disabled={newItemsToAdd.length === 0}
//                 >
//                   <Text style={styles.proceedText}>
//                     Proceed ({newItemsToAdd.length} items)
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewOrders}>
//                   <Text style={styles.viewAllText}>View All</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
//   container: { flex: 1, padding: 16, paddingBottom: 10 },
//  customerInfo: { 
//   flexDirection: "row", 
//   alignItems: "center", 
//   flexWrap: "wrap",       // allow wrapping
//   marginBottom: 6 
// },
// customerLabel: { 
//   fontSize: 15, 
//   fontWeight: "600", 
//   color: "#555", 
//   marginRight: 6 
// },
// customerName: { 
//   fontSize: 16, 
//   fontWeight: "bold", 
//   color: "#2954E5", 
//   flexShrink: 1            // allow shrinking to fit the row
// },

//   searchRow: { marginVertical: 10 },
//   searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "#ddd" },
//   searchInput: { flex: 1, height: 40, color: "#000" },
//   searchIcon: { marginLeft: 8 },

//   filterScroll: { marginTop: 6 },
//   filterBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 20, marginRight: 6, marginBottom: 6 },
//   filterBtnActive: { backgroundColor: "#2954E5" },
//   filterText: { color: "#555" },
//   filterTextActive: { color: "#fff" },

//   itemContainer: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", marginBottom: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
//   itemImage: { width: 60, height: 60, borderRadius: 8 },
//   itemDetails: { flex: 1, marginLeft: 12 },
//   itemName: { fontWeight: "bold", fontSize: 16 },
// stockQtyRow: {
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
//   marginTop: 4, // gap from item name
// },
// stockRow: {
//   flexDirection: "row",
//   alignItems: "center",
// },
// qtyBox: {
//   flexDirection: "row",
//   alignItems: "center",
//   backgroundColor: "#f0f0f0",
//   borderRadius: 8,
//   paddingHorizontal: 6,
// },
// qtyBtn: { padding: 6 },
// qtyInput: { width: 40, textAlign: "center", fontSize: 14, color: "#000" },
// itemPrice: { color: "#555", fontSize: 14},

//   bottomButtons: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", padding: 6, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#ddd" },
//   proceedBtn: { flex: 0.7, padding: 18, borderRadius: 12, alignItems: "center" },
//   proceedText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
//   viewAllBtn: { flex: 0.25, padding: 18, borderRadius: 12, alignItems: "center", backgroundColor: "#2954E5" },
//   viewAllText: { color: "#fff", fontWeight: "600" },
// });







// Fetch Items From API

// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Alert,
//   KeyboardAvoidingView,
//   ScrollView,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   initDB,
//   getItems,
//   getOrderLineByBookingAndItem,
//   addOrderBookingLine,
//   updateOrderBookingLine,
// } from "../database";
// import { Search, Plus, Minus, ShoppingCart } from "lucide-react-native";

// export default function ItemsScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;

//   const [imageErrors, setImageErrors] = useState({});
//   const [items, setItems] = useState([]);
//   const [search, setSearch] = useState("");
//   const [quantity, setQuantity] = useState({});
//   const [newItemsToAdd, setNewItemsToAdd] = useState([]);
//   // const [filterType, setFilterType] = useState("");
//   const [filterType, setFilterType] = useState("All Items");
//   const [types, setTypes] = useState([]);
//   const [changedQuantity, setChangedQuantity] = useState({});

//   useEffect(() => {
//     const loadDB = async () => {
//       await initDB();
//       // await fetchItems();
//       await fetchItems("", "All Items");
//       await loadProductTypes();
//       if (bookingId) await loadExistingOrder();
//     };
//     loadDB();
//   }, []);

//   useEffect(() => {
//     setImageErrors({});
//   }, [items]);

//   const loadProductTypes = async () => {
//     const allItems = await getItems();
//     const uniqueTypes = [...new Set(allItems.map((i) => i.type).filter(Boolean))];
//     setTypes(["All Items", ...uniqueTypes]);
//   };

//   const loadExistingOrder = async () => {
//     const existingOrderList = [];
//     const allItems = await getItems();
//     for (const item of allItems) {
//       const orderLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//       if (orderLines.length > 0) {
//         const line = orderLines[0];
//         existingOrderList.push({
//           ...item,
//           quantity: line.order_qty,
//           total: line.order_qty * item.price,
//         });
//         setQuantity((prev) => ({ ...prev, [item.id]: line.order_qty.toString() }));
//       }
//     }
//     setNewItemsToAdd(existingOrderList);
//   };

//   const fetchItems = async (query = "", typeFilter = "") => {
//     let data = await getItems(query);
//     if (typeFilter && typeFilter !== "All Items") {
//       data = data.filter((item) => item.type === typeFilter);
//     }
//     setItems(data);
//   };

//   const handleSearch = (text) => {
//     setSearch(text);
//     fetchItems(text, filterType);
//   };

//   const handleFilterChange = (type) => {
//     const nextType = filterType === type ? "All Items" : type;
//     setFilterType(nextType);
//     fetchItems(search, nextType);
//   };

//   // Quantity handlers
//   const increaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") + 1;
//     setQuantity({ ...quantity, [itemId]: current.toString() });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (index !== -1) {
//       const updatedList = [...newItemsToAdd];
//       updatedList[index].quantity = current;
//       updatedList[index].total = current * updatedList[index].price;
//       setNewItemsToAdd(updatedList);
//     }
//   };

//   const decreaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") - 1;
//     const newVal = current > 0 ? current.toString() : "";
//     setQuantity({ ...quantity, [itemId]: newVal });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (index !== -1) {
//       if (current > 0) {
//         const updatedList = [...newItemsToAdd];
//         updatedList[index].quantity = current;
//         updatedList[index].total = current * updatedList[index].price;
//         setNewItemsToAdd(updatedList);
//       } else {
//         setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//       }
//     }
//   };

//   const handleQuantityChange = (itemId, val) => {
//     const num = val.replace(/[^0-9]/g, "");
//     setQuantity({ ...quantity, [itemId]: num });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (num === "" && index !== -1) {
//       setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//     } else if (index !== -1) {
//       const updatedList = [...newItemsToAdd];
//       updatedList[index].quantity = parseInt(num);
//       updatedList[index].total = updatedList[index].quantity * updatedList[index].price;
//       setNewItemsToAdd(updatedList);
//     }
//   };

//   const handleAddItem = (item) => {
//     const existingIndex = newItemsToAdd.findIndex((o) => o.id === item.id);
//     const qty = parseInt(quantity[item.id] || "1");
//     if (existingIndex === -1) {
//       const newItem = { ...item, quantity: qty, total: qty * item.price };
//       setNewItemsToAdd([...newItemsToAdd, newItem]);
//     }
//     setChangedQuantity((prev) => ({ ...prev, [item.id]: false }));
//   };

//   const handleProceed = async () => {
//     if (newItemsToAdd.length === 0) {
//       Alert.alert("Error", "Please add at least one item before proceeding.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of newItemsToAdd) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: item.quantity,
//               amount: item.quantity * item.price,
//             });
//           } else {
//             await addOrderBookingLine({
//               booking_id: bookingId,
//               item_id: item.id,
//               order_qty: item.quantity,
//               unit_price: item.price,
//               amount: item.total,
//             });
//           }
//         }
//         Alert.alert("Success", "Order updated successfully!");
//         navigation.navigate("Order Details", {
//           bookingId,
//           customerId,
//           customerName,
//           orderNo: route.params.orderNo || "",
//         });
//       } else {
//         navigation.navigate("Order List", {
//           customerId,
//           customerName,
//           orderList: newItemsToAdd,
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Failed to add items");
//     }
//   };

//   const handleViewOrders = () => {
//     navigation.navigate("All Orders", { customerId, customerName });
//   };

//   const markImageError = (itemId) => {
//     setImageErrors((prev) => ({ ...prev, [itemId]: true }));
//   };

//   const renderItem = ({ item }) => {
//     const useUri =
//       !imageErrors[item.id] &&
//       item.image &&
//       typeof item.image === "string" &&
//       item.image.trim() !== "";

//     return (
//       <View style={styles.itemContainer}>
//         <Image
//           source={
//             useUri
//               ? { uri: item.image.trim() }
//               : require("../assets/Images/placeholder.png")
//           }
//           style={styles.itemImage}
//           resizeMode="cover"
//           onError={() => markImageError(item.id)}
//         />

//         <View style={styles.itemDetails}>
//           <Text style={styles.itemName} numberOfLines={1}>
//             {item.name}
//           </Text>

//           <View style={styles.stockRow}>
//             <ShoppingCart size={14} color="#10B981" />
//             <Text style={styles.stockText}> {item.stock || 0}</Text>
//           </View>

//           <Text style={styles.itemPrice}>Rs.{item.price}</Text>

//           <View style={styles.bottomRow}>
//             <View style={styles.qtyBox}>
//               <TouchableOpacity onPress={() => decreaseQty(item.id)} style={styles.qtyBtn}>
//                 <Minus size={16} color="#000" />
//               </TouchableOpacity>

//               <TextInput
//                 placeholder="0"
//                 keyboardType="number-pad"
//                 style={styles.qtyInput}
//                 value={quantity[item.id] ? quantity[item.id].toString() : ""}
//                 onChangeText={(val) => handleQuantityChange(item.id, val)}
//               />

//               <TouchableOpacity onPress={() => increaseQty(item.id)} style={styles.qtyBtn}>
//                 <Plus size={16} color="#000" />
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity
//               style={[styles.addBtn, { display: changedQuantity[item.id] ? "flex" : "none" }]}
//               onPress={() => handleAddItem(item)}
//             >
//               <Text style={styles.addText}>Add</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }}>
//         <View style={styles.container}>
//           <View style={styles.customerInfo}>
//             <Text style={styles.customerLabel}>Customer:</Text>
//             <Text style={styles.customerName}>{customerName}</Text>
//           </View>

//           <View style={styles.searchRow}>
//             <View style={styles.searchContainer}>
//               <TextInput
//                 placeholder="Search items..."
//                 value={search}
//                 onChangeText={handleSearch}
//                 style={styles.searchInput}
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={() => handleSearch(search)}>
//                 <Search size={22} color="#2954E5" style={styles.searchIcon} />
//               </TouchableOpacity>
//             </View>

//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//               {types.map((type) => (
//                 <TouchableOpacity
//                   key={type}
//                   style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
//                   onPress={() => handleFilterChange(type)}
//                 >
//                   <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
//                     {type}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           <FlatList
//             data={items}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             contentContainerStyle={{ paddingBottom: 62 }}
//             showsVerticalScrollIndicator={false}
//           />

          
//           <View style={[
//   styles.bottomButtons,
//   bookingId ? { justifyContent: "center" } : { justifyContent: "space-between" }
// ]}>
//   {bookingId ? (
//     <TouchableOpacity
//       style={[
//         styles.proceedBtn,
//         { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0", flex: 0.9 }
//       ]}
//       onPress={handleProceed}
//       disabled={newItemsToAdd.length === 0}
//     >
//       <Text style={styles.proceedText}>
//         Add to Order ({newItemsToAdd.length} items)
//       </Text>
//     </TouchableOpacity>
//   ) : (
//     <>
//       <TouchableOpacity
//         style={[
//           styles.proceedBtn,
//           { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0" }
//         ]}
//         onPress={handleProceed}
//         disabled={newItemsToAdd.length === 0}
//       >
//         <Text style={styles.proceedText}>
//           Proceed ({newItemsToAdd.length} items)
//         </Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewOrders}>
//         <Text style={styles.viewAllText}>View All</Text>
//       </TouchableOpacity>
//     </>
//   )}
// </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
//   container: { flex: 1, padding: 16, paddingBottom: 10 },
//   customerInfo: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
//   customerLabel: { fontSize: 15, fontWeight: "600", color: "#555", marginRight: 6 },
//   customerName: { fontSize: 16, fontWeight: "bold", color: "#2954E5" },

//   searchRow: { marginVertical: 10 },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     borderWidth: 1,
//     borderColor: "#ddd",
//   },
//   searchInput: { flex: 1, height: 40, color: "#000" },
//   searchIcon: { marginLeft: 8 },

//   filterScroll: { marginTop: 6 },
//   filterBtn: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: "#eee",
//     borderRadius: 20,
//     marginRight: 6,
//     marginBottom: 6,
//   },
//   filterBtnActive: { backgroundColor: "#2954E5" },
//   filterText: { color: "#555" },
//   filterTextActive: { color: "#fff" },

//   itemContainer: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     backgroundColor: "#fff",
//     marginBottom: 2,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 10,
//   },
//   itemImage: { width: 60, height: 60, borderRadius: 8 },
//   itemDetails: { flex: 1, marginLeft: 12 },
//   itemName: { fontWeight: "bold", fontSize: 16 },
//   stockRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
//   stockText: { color: "#10B981", marginLeft: 4, fontSize: 12, fontWeight: "500" },
//   itemPrice: { color: "#555", marginTop: 4 },

//   bottomRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "flex-end",
//     marginTop: 8,
//   },
//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     marginRight: 8,
//     paddingHorizontal: 6,
//   },
//   qtyBtn: { padding: 6 },
//   qtyInput: { width: 40, textAlign: "center", fontSize: 14, color: "#000" },

//   addBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#2954E5" },
//   addText: { color: "#fff", fontWeight: "bold" },

//   bottomButtons: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 6,
//     backgroundColor: "#fff",
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//   },
//   proceedBtn: { flex: 0.7, padding: 18, borderRadius: 12, alignItems: "center" },
//   proceedText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
//   viewAllBtn: { flex: 0.25, padding: 18, borderRadius: 12, alignItems: "center", backgroundColor: "#2954E5" },
//   viewAllText: { color: "#fff", fontWeight: "600" },
// });








// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Alert,
//   KeyboardAvoidingView,
//   ScrollView,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   initDB,
//   getItems,
//   getOrderLineByBookingAndItem,
//   addOrderBookingLine,
//   updateOrderBookingLine,
// } from "../database";
// import { Search, Plus, Minus } from "lucide-react-native";

// export default function ItemsScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;

//   const [items, setItems] = useState([]);
//   const [search, setSearch] = useState("");
//   const [quantity, setQuantity] = useState({});
//   const [newItemsToAdd, setNewItemsToAdd] = useState([]);
//   const [filterType, setFilterType] = useState(""); // selected filter
//   const [types, setTypes] = useState([]); // all available product types
//   const [changedQuantity, setChangedQuantity] = useState({}); // track changes for Add button

//   useEffect(() => {
//     const loadDB = async () => {
//       await initDB();
//       await fetchItems();
//       await loadProductTypes();
//       if (bookingId) await loadExistingOrder();
//     };
//     loadDB();
//   }, []);

//   const loadProductTypes = async () => {
//     const allItems = await getItems();
//     const uniqueTypes = [...new Set(allItems.map((i) => i.type).filter(Boolean))];
//     setTypes(uniqueTypes);
//   };

//   const loadExistingOrder = async () => {
//     const existingOrderList = [];
//     const allItems = await getItems();
//     for (const item of allItems) {
//       const orderLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//       if (orderLines.length > 0) {
//         const line = orderLines[0];
//         existingOrderList.push({
//           ...item,
//           quantity: line.order_qty,
//           total: line.order_qty * item.price,
//         });
//         // Set initial quantity input
//         setQuantity((prev) => ({ ...prev, [item.id]: line.order_qty.toString() }));
//       }
//     }
//     setNewItemsToAdd(existingOrderList);
//   };

//   const fetchItems = async (query = "", typeFilter = "") => {
//     let data = await getItems(query);
//     if (typeFilter) {
//       data = data.filter((item) => item.type === typeFilter);
//     }
//     setItems(data);
//   };

//   const handleSearch = (text) => {
//     setSearch(text);
//     fetchItems(text, filterType);
//   };

//   const handleFilterChange = (type) => {
//     setFilterType(type);
//     fetchItems(search, type);
//   };

//   // Quantity handlers
//   const increaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") + 1;
//     setQuantity({ ...quantity, [itemId]: current.toString() });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (index !== -1) {
//       const updatedList = [...newItemsToAdd];
//       updatedList[index].quantity = current;
//       updatedList[index].total = current * updatedList[index].price;
//       setNewItemsToAdd(updatedList);
//     }
//   };

//   const decreaseQty = (itemId) => {
//     const current = parseInt(quantity[itemId] || "0") - 1;
//     const newVal = current > 0 ? current.toString() : "";
//     setQuantity({ ...quantity, [itemId]: newVal });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (index !== -1) {
//       if (current > 0) {
//         const updatedList = [...newItemsToAdd];
//         updatedList[index].quantity = current;
//         updatedList[index].total = current * updatedList[index].price;
//         setNewItemsToAdd(updatedList);
//       } else {
//         setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//       }
//     }
//   };

//   const handleQuantityChange = (itemId, val) => {
//     const num = val.replace(/[^0-9]/g, "");
//     setQuantity({ ...quantity, [itemId]: num });
//     setChangedQuantity({ ...changedQuantity, [itemId]: true });

//     const index = newItemsToAdd.findIndex((i) => i.id === itemId);
//     if (num === "" && index !== -1) {
//       setNewItemsToAdd((prev) => prev.filter((i) => i.id !== itemId));
//     } else if (index !== -1) {
//       const updatedList = [...newItemsToAdd];
//       updatedList[index].quantity = parseInt(num);
//       updatedList[index].total = updatedList[index].quantity * updatedList[index].price;
//       setNewItemsToAdd(updatedList);
//     }
//   };

//   const handleAddItem = (item) => {
//     const existingIndex = newItemsToAdd.findIndex((o) => o.id === item.id);
//     const qty = parseInt(quantity[item.id] || "1");
//     if (existingIndex === -1) {
//       const newItem = { ...item, quantity: qty, total: qty * item.price };
//       setNewItemsToAdd([...newItemsToAdd, newItem]);
//     }
//     setChangedQuantity((prev) => ({ ...prev, [item.id]: false })); // reset after add
//   };

//   const handleProceed = async () => {
//     if (newItemsToAdd.length === 0) {
//       Alert.alert("Error", "Please add at least one item before proceeding.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of newItemsToAdd) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: item.quantity,
//               amount: item.quantity * item.price,
//             });
//           } else {
//             await addOrderBookingLine({
//               booking_id: bookingId,
//               item_id: item.id,
//               order_qty: item.quantity,
//               unit_price: item.price,
//               amount: item.total,
//             });
//           }
//         }
//         Alert.alert("Success", "Order updated successfully!");
//         navigation.navigate("Order Details", {
//           bookingId,
//           customerId,
//           customerName,
//           orderNo: route.params.orderNo || "",
//         });
//       } else {
//         navigation.navigate("Order List", {
//           customerId,
//           customerName,
//           orderList: newItemsToAdd,
//         });
//       }
//     } catch (error) {
//       console.error(error);
//       Alert.alert("Error", "Failed to add items");
//     }
//   };

//   const handleViewOrders = () => {
//     navigation.navigate("All Orders", { customerId });
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemContainer}>
//       <Image
//         source={
//           item.image
//             ? { uri: item.image }
//             : require("../assets/Images/placeholderItem.png")
//         }
//         style={styles.itemImage}
//       />
//       <View style={styles.itemDetails}>
//         <Text style={styles.itemName}>{item.name}</Text>
//         <Text style={styles.itemPrice}>Rs.{item.price}</Text>

//         <View style={styles.bottomRow}>
//           <View style={styles.qtyBox}>
//             <TouchableOpacity onPress={() => decreaseQty(item.id)} style={styles.qtyBtn}>
//               <Minus size={16} color="#000" />
//             </TouchableOpacity>

//             <TextInput
//               placeholder="0"
//               keyboardType="number-pad"
//               style={styles.qtyInput}
//               value={quantity[item.id] ? quantity[item.id].toString() : ""}
//               onChangeText={(val) => handleQuantityChange(item.id, val)}
//             />

//             <TouchableOpacity onPress={() => increaseQty(item.id)} style={styles.qtyBtn}>
//               <Plus size={16} color="#000" />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             style={[
//               styles.addBtn,
//               { display: changedQuantity[item.id] ? "flex" : "none" },
//             ]}
//             onPress={() => handleAddItem(item)}
//           >
//             <Text style={styles.addText}>Add</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }}>
//         <View style={styles.container}>
//           <View style={styles.customerInfo}>
//             <Text style={styles.customerLabel}>Customer:</Text>
//             <Text style={styles.customerName}>{customerName}</Text>
//           </View>

//           {/* Search */}
//           <View style={styles.searchRow}>
//             <View style={styles.searchContainer}>
//               <TextInput
//                 placeholder="Search items..."
//                 value={search}
//                 onChangeText={handleSearch}
//                 style={styles.searchInput}
//                 placeholderTextColor="#888"
//               />
//               <TouchableOpacity onPress={() => handleSearch(search)}>
//                 <Search size={22} color="#2954E5" style={styles.searchIcon} />
//               </TouchableOpacity>
//             </View>

//             {/* Filter Dropdown - scrollable */}
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
//               {types.map((type) => (
//                 <TouchableOpacity
//                   key={type}
//                   style={[styles.filterBtn, filterType === type && styles.filterBtnActive]}
//                   onPress={() => handleFilterChange(filterType === type ? "" : type)}
//                 >
//                   <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
//                     {type}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           <FlatList
//             data={items}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             contentContainerStyle={{ paddingBottom: 62 }}
//             showsVerticalScrollIndicator={false}
//           />

//           <View style={styles.bottomButtons}>
//             <TouchableOpacity
//               style={[
//                 styles.proceedBtn,
//                 { backgroundColor: newItemsToAdd.length > 0 ? "#10B981" : "#A7F3D0" },
//               ]}
//               onPress={handleProceed}
//               disabled={newItemsToAdd.length === 0}
//             >
//               <Text style={styles.proceedText}>
//                 {bookingId
//                   ? `Add to Order (${newItemsToAdd.length} items)`
//                   : `Proceed (${newItemsToAdd.length} items)`}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewOrders}>
//               <Text style={styles.viewAllText}>View All</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
//   container: { flex: 1, padding: 16, paddingBottom: 10 },
//   customerInfo: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
//   customerLabel: { fontSize: 15, fontWeight: "600", color: "#555", marginRight: 6 },
//   customerName: { fontSize: 16, fontWeight: "bold", color: "#2954E5" },

//   searchRow: { marginVertical: 10 },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     borderWidth: 1,
//     borderColor: "#ddd",
//   },
//   searchInput: { flex: 1, height: 40, color: "#000" },
//   searchIcon: { marginLeft: 8 },

//   filterScroll: { marginTop: 6 },
//   filterBtn: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: "#eee",
//     borderRadius: 20,
//     marginRight: 6,
//     marginBottom: 6,
//   },
//   filterBtnActive: { backgroundColor: "#2954E5" },
//   filterText: { color: "#555" },
//   filterTextActive: { color: "#fff" },

//   itemContainer: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     backgroundColor: "#fff",
//     marginBottom: 2,
//     padding: 12,
//     borderRadius: 10,
//   },
//   itemImage: { width: 60, height: 60, borderRadius: 8, marginTop: 4 },
//   itemDetails: { flex: 1, marginLeft: 12 },
//   itemName: { fontWeight: "bold", fontSize: 16 },
//   itemPrice: { color: "#555", marginTop: 4 },

//   bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 8 },
//   qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", borderRadius: 8, marginRight: 8, paddingHorizontal: 6 },
//   qtyBtn: { padding: 6 },
//   qtyInput: { width: 40, textAlign: "center", fontSize: 14, color: "#000" },

//   addBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#2954E5" },
//   addText: { color: "#fff", fontWeight: "bold" },

//   bottomButtons: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 6,
//     backgroundColor: "#fff",
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//   },
//   proceedBtn: { flex: 0.7, padding: 18, borderRadius: 12, alignItems: "center" },
//   proceedText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
//   viewAllBtn: { flex: 0.25, padding: 18, borderRadius: 12, alignItems: "center", backgroundColor: "#2954E5" },
//   viewAllText: { color: "#fff", fontWeight: "600" },
// });