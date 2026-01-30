// UserStats.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { getAllOrders, getTodayVisitStats } from "../db/database";
import { MaterialIcons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;
const cardWidth = (screenWidth - 50) / 2;

export default function UserStats() {
  const [orderCount, setOrderCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const orders = await getAllOrders();
        const today = new Date();
        const todayOrders = orders.filter((o) => {
          const d = new Date(o.order_date);
          return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
          );
        });

        setOrderCount(todayOrders.length);

        const visitData = await getTodayVisitStats();
        const totalVisits = visitData.dataPoints.reduce((a, b) => a + b, 0);
        setVisitCount(totalVisits);
      } catch (err) {
        console.log("Stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // --- Loading Placeholder (Skeleton Cards) ---
  if (loading) {
    return (
      <View style={styles.container}>
        {[1, 2].map((_, index) => (
          <View key={index} style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator size="large" color="#2176FF" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Orders Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="shopping-bag" size={56} color="#2176FF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Today Orders</Text>
          <Text style={styles.count}>{orderCount}</Text>
        </View>
      </View>

      {/* Visits Card */}
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: "#E6EFFF" }]}>
          <MaterialIcons name="person-pin-circle" size={56} color="#2176FF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Today Visits</Text>
          <Text style={styles.count}>{visitCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 30,
  },
  card: {
    width: cardWidth,
    height: 80,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: "100%",
    backgroundColor: "#E6EFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#55637A",
    letterSpacing: 0.2,
    textAlign:"center",
  },
  count: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A2D5A",
    marginTop: 2,
    textAlign:"center",

  },
  loadingCard: {
    justifyContent: "center",
    alignItems: "center",
  },
});




// // UserStats.js
// import React, { useEffect, useState } from "react";
// import { View, Text, StyleSheet, Dimensions } from "react-native";
// import { getAllOrders, getTodayVisitStats } from "../db/database";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons } from "@expo/vector-icons";

// const screenWidth = Dimensions.get("window").width;
// const cardWidth = (screenWidth - 50) / 2;

// export default function UserStats() {
//   const [orderCount, setOrderCount] = useState(0);
//   const [visitCount, setVisitCount] = useState(0);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const orders = await getAllOrders();

//         const today = new Date();
//         const todayOrders = orders.filter((o) => {
//           const d = new Date(o.order_date);
//           return (
//             d.getDate() === today.getDate() &&
//             d.getMonth() === today.getMonth() &&
//             d.getFullYear() === today.getFullYear()
//           );
//         });

//         setOrderCount(todayOrders.length);

//         const visitData = await getTodayVisitStats();
//         const totalVisits = visitData.dataPoints.reduce((a, b) => a + b, 0);

//         setVisitCount(totalVisits);
//       } catch (err) {
//         console.log("Stats error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchStats();
//   }, []);

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <Text style={styles.loadingText}>Loading stats...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Orders Card */}
//       <View style={styles.card}>
//         <View style={styles.iconContainer}>
//           <MaterialIcons name="shopping-bag" size={56} color="#2176FF" />
//         </View>

//         <View style={styles.textContainer}>
//           <Text style={styles.title}>Today Orders</Text>
//           <Text style={styles.count}>{orderCount}</Text>
//         </View>
//       </View>

//       {/* Visits Card */}
//       <View style={styles.card}>
//         <View style={[styles.iconContainer, { backgroundColor: "#E6EFFF" }]}>
//           <MaterialIcons name="person-pin-circle" size={56} color="#2176FF" />
//         </View>

//         <View style={styles.textContainer}>
//           <Text style={styles.title}>Today Visits</Text>
//           <Text style={styles.count}>{visitCount}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
//   loadingText: { marginTop: 50, textAlign: "center", fontSize: 16 },

//   container: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     marginTop: 30,
//   },

//   card: {
//     width: cardWidth,
//     height: 80,
//     backgroundColor: "#ffffff",
//     borderRadius: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     paddingRight: 16,
//     overflow: "hidden",

//     shadowColor: "#000",
//     shadowOpacity: 0.08,
//     shadowRadius: 10,
//     elevation: 5,
//   },

//   iconContainer: {
//     width: 60,
//     height: "100%",
//     backgroundColor: "#E6EFFF",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   textContainer: {
//     flex: 1,
//     paddingLeft: 14,
//     justifyContent: "center",
//   },

//   title: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#55637A",
//     letterSpacing: 0.2,
//     textAlign:"center",
//   },

//   count: {
//     fontSize: 26,
//     fontWeight: "600",
//     color: "#1A2D5A",
//     marginTop: 2,
//     textAlign:"center",
//   },
// });










// // UserStats.js
// import React, { useEffect, useState } from "react";
// import { View, Text, StyleSheet, Dimensions } from "react-native";
// import { getAllOrders, getTodayVisitStats } from "../db/database";
// import { LineChart } from "react-native-chart-kit";
// import { SafeAreaView } from "react-native-safe-area-context";

// const screenWidth = Dimensions.get("window").width;
// const squareSize = (screenWidth - 64) / 2.5; // perfect squares

// export default function UserStats() {
//   const [orderStats, setOrderStats] = useState({ labels: [], dataPoints: [] });
//   const [visitStats, setVisitStats] = useState({ labels: [], dataPoints: [] });
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const orders = await getAllOrders();

//         // Filter only today's orders
//         const today = new Date();
//         const todayOrders = orders.filter(o => {
//           const orderDate = new Date(o.order_date);
//           return (
//             orderDate.getDate() === today.getDate() &&
//             orderDate.getMonth() === today.getMonth() &&
//             orderDate.getFullYear() === today.getFullYear()
//           );
//         });

//         const counts = [0, 0, 0, 0];
//         const intervals = ["0-5", "6-11", "12-17", "18-23"];

//         todayOrders.forEach((o) => {
//           const hour = new Date(o.order_date).getHours();
//           if (hour >= 0 && hour <= 5) counts[0]++;
//           else if (hour >= 6 && hour <= 11) counts[1]++;
//           else if (hour >= 12 && hour <= 17) counts[2]++;
//           else if (hour >= 18 && hour <= 23) counts[3]++;
//         });

//         setOrderStats({ labels: intervals, dataPoints: counts });

//         // Fetch visits stats normally
//         const visitData = await getTodayVisitStats();
//         setVisitStats(visitData);

//       } catch (err) {
//         console.log("Stats error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchStats();

//     // Refresh every 24 hours
//     const interval = setInterval(fetchStats, 24 * 60 * 60 * 1000);
//     return () => clearInterval(interval);

//   }, []);

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <Text style={styles.loadingText}>Loading stats...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.row}>

//         {/* Orders Graph */}
//         <View style={styles.graphBox}>
//           <Text style={styles.graphTitle}>Today Orders</Text>
//           <LineChart
//             data={{
//               labels: orderStats.labels,
//               datasets: [{ data: orderStats.dataPoints }],
//             }}
//             width={squareSize + 46} 
//             height={squareSize -38}
//             fromZero
//             chartConfig={chartConfig}
//             style={styles.chartStyle}
//             verticalLabelRotation={-20}
//           />
//         </View>

//         {/* Visits Graph */}
//         <View style={styles.graphBox}>
//           <Text style={styles.graphTitle}>Today Visits</Text>
//           <LineChart
//             data={{
//               labels: visitStats.labels,
//               datasets: [{ data: visitStats.dataPoints }],
//             }}
//             width={squareSize + 46}
//             height={squareSize -38}
//             fromZero
//             chartConfig={chartConfig}
//             style={styles.chartStyle}
//             verticalLabelRotation={-20}
//             withInnerLines={true}
//             withOuterLines={true}
//           />
//         </View>

//       </View>
//     </View>
//   );
// }

// const chartConfig = {
//   backgroundGradientFrom: "#fff",
//   backgroundGradientTo: "#fff",
//   decimalPlaces: 0,
//   color: (opacity = 1) => `rgba(41,84,229,${opacity})`,
//   labelColor: () => "#666",
//   propsForLabels: { fontSize: 8, padding: 0, margin: 0 },
//   propsForDots: { r: "3", strokeWidth: "1", stroke: "#2954E5" },
// };

// const styles = StyleSheet.create({
//   container: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 20 },
//   safeArea: { flex: 1, backgroundColor: "#f0f2f5" },
//   loadingText: { marginTop: 50, textAlign: "center", fontSize: 16 },
//   row: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
//   graphBox: { width: squareSize + 36, height: squareSize, backgroundColor: "#fff", paddingTop: 10, borderRadius: 16, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
//   graphTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
//   chartStyle: { borderRadius: 12, marginLeft: -30 },
// });
