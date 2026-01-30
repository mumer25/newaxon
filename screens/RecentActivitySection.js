import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAllOrders } from "../db/database"; // fetch all orders

export default function RecentActivitySection() {
  const [orders, setOrders] = useState([]);
  const navigation = useNavigation();
  const { width } = Dimensions.get("window");

  const fetchOrders = async () => {
    try {
      const data = await getAllOrders();
      if (data && data.length > 0) {
        // sort by newest first (assuming booking_id increments)
        const sortedData = data.sort((a, b) => b.booking_id - a.booking_id);
        const latestThree = sortedData.slice(0, 3); // last 3 orders

        const mappedData = latestThree.map((item) => ({
          id: item.booking_id,
          orderNo: item.order_no,
          customerName: item.customer_name,
          desc: `${item.item_count} items purchased,\nTotal Rs.${item.total_amount?.toFixed(2) ?? 0}`,
          date: item.order_date ? new Date(item.order_date).toLocaleDateString() : "",
          day: item.order_date ? new Date(item.order_date).toLocaleDateString("en-US", { weekday: "short" }) : "",
          bg: "#D9F7E5",
          icon: (
            <Image
              source={require("../assets/Icons/LeadStatus.png")}
              style={styles.icon}
            />
          ),
        }));

        setOrders(mappedData);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Fetch latest orders every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => navigation.navigate("All Orders")}
          // onPress={() => navigation.getParent().navigate("All Orders")}
        >
          <Text style={styles.seeMoreText}>See more</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {orders.length > 0 ? (
          orders.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { width: width - 30 }]}
              onPress={() =>
                navigation.navigate("Order Details", {
                  bookingId: item.id,
                  customerName: item.customerName,
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                {item.icon}
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.orderNo}>Order #{item.orderNo}</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.customerName}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.desc}
                </Text>
              </View>

              <View style={styles.dateContainer}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.day}>{item.day}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent activity yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#2D99FF",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#fff", flexShrink: 1 },
  seeMoreButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  seeMoreText: { color: "gray", fontSize: 12, fontWeight: "500" },

  scrollContainer: {
    paddingBottom: 10,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dotted",
    borderColor: "#E3E3E3",
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  orderNo: { fontSize: 12, fontWeight: "500", color: "#888", marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
  cardDesc: { fontSize: 12, color: "#666", marginTop: 2 },
  dateContainer: { alignItems: "flex-end", gap: 10,marginTop:16 },
  date: { fontSize: 12, color: "gray", fontWeight: "600" },
  day: { fontSize: 11, color: "#888" },
  icon: { width: 26, height: 26, resizeMode: "contain" },
  emptyText: { textAlign: "center", color: "#fff", marginTop: 10, fontSize: 14 },
});



// import React, { useState, useCallback } from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
// import { useFocusEffect, useNavigation } from "@react-navigation/native";
// import { getRecentActivities } from "../database";

// export default function RecentActivitySection() {
//   const [activities, setActivities] = useState([]);
//   const navigation = useNavigation();
//   const { width } = Dimensions.get("window");

//   const fetchActivities = async () => {
//     try {
//       const data = await getRecentActivities();
//       const mappedData = data.map((item) => ({
//         id: item.id,
//         orderNo: item.booking_id,
//         customerName: item.customer_name, // Make sure your DB returns this
//         desc: `${item.item_count} items purchased,\nTotal Rs.${item.total_amount?.toFixed(2) ?? 0}`,
//         date: item.activity_date ? new Date(item.activity_date).toLocaleDateString() : "",
//         day: item.activity_date ? new Date(item.activity_date).toLocaleDateString("en-US", { weekday: "short" }) : "",
//         bg: "#D9F7E5",
//         icon: (
//           <Image
//             source={require("../assets/Icons/LeadStatus.png")}
//             style={styles.icon}
//           />
//         ),
//       }));
//       setActivities(mappedData.reverse().slice(0, 3)); // latest 4
//     } catch (error) {
//       console.error("Error fetching recent activities:", error);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       fetchActivities();
//     }, [])
//   );

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Recent Activity</Text>
//         <TouchableOpacity
//           style={styles.seeMoreButton}
//           onPress={() => navigation.navigate("All Orders")}
//         >
//           <Text style={styles.seeMoreText}>See more</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.scrollContainer}
//       >
//         {activities.length > 0 ? (
//           activities.map((item) => (
//             <TouchableOpacity
//               key={item.id}
//               style={[styles.card, { width: width - 30 }]}
//               onPress={() =>
//                 navigation.navigate("Order Details", {
//                   bookingId: item.orderNo,
//                   customerId: item.id, // Use actual customer ID from DB if available
//                   customerName: item.customerName,
//                 })
//               }
//             >
//               <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
//                 {item.icon}
//               </View>

//               <View style={styles.textContainer}>
//                 <Text style={styles.orderNo}>Order #{item.orderNo}</Text>
//                 <Text style={styles.cardTitle} numberOfLines={1}>
//                   {item.customerName}
//                 </Text>
//                 <Text style={styles.cardDesc} numberOfLines={2}>
//                   {item.desc}
//                 </Text>
//               </View>

//               <View style={styles.dateContainer}>
//                 <Text style={styles.date}>{item.date}</Text>
//                 <Text style={styles.day}>{item.day}</Text>
//               </View>
//             </TouchableOpacity>
//           ))
//         ) : (
//           <Text style={styles.emptyText}>No recent activity yet.</Text>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 15,
//     backgroundColor: "#2D99FF",
//     paddingBottom: 20,
//     marginBottom: 50,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   title: { fontSize: 18, fontWeight: "bold", color: "#fff", flexShrink: 1 },
//   seeMoreButton: {
//     backgroundColor: "#FFFFFF",
//     paddingVertical: 6,
//     paddingHorizontal: 14,
//     borderRadius: 20,
//   },
//   seeMoreText: { color: "gray", fontSize: 12, fontWeight: "500" },

//   scrollContainer: {
//     paddingBottom: 10,
//     gap: 12,
//   },

//   card: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     padding: 15,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderStyle: "dotted",
//     borderColor: "#E3E3E3",
//     marginBottom: 12,
//   },
//   iconContainer: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   textContainer: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   orderNo: { fontSize: 12, fontWeight: "500", color: "#888", marginBottom: 2 },
//   cardTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
//   cardDesc: { fontSize: 12, color: "#666", marginTop: 2 },
//   dateContainer: { alignItems: "flex-end", gap: 20 },
//   date: { fontSize: 12, color: "gray", fontWeight: "600" },
//   day: { fontSize: 11, color: "#888" },
//   icon: { width: 26, height: 26, resizeMode: "contain" },
//   emptyText: { textAlign: "center", color: "#fff", marginTop: 10, fontSize: 14 },
// });
