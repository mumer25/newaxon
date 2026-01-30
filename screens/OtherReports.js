import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ArrowUpRight, ArrowDownRight, LayoutDashboard } from "lucide-react-native";
import { getAllOrders, getAllCustomerReceipts } from "../db/database"; 
import { useNavigation } from "@react-navigation/native";

export default function OtherReports() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalOrders: 0,
    totalPayments: 0,
    amountComparison: { percentage: 0, arrow: "up", color: "#1DBA4B" },
    ordersComparison: { percentage: 0, arrow: "up", color: "#1DBA4B" },
    paymentsComparison: { percentage: 0, arrow: "up", color: "#1DBA4B" },
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const calcComparison = (todayValue, prevValues) => {
    const avg = prevValues.reduce((a, b) => a + b, 0) / prevValues.length;
    let percentage = avg === 0 ? 100 : ((todayValue - avg) / avg) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < -100) percentage = -100;
    return {
      percentage: percentage.toFixed(1),
      arrow: todayValue >= avg ? "up" : "down",
      color: todayValue >= avg ? "#1DBA4B" : "#FF3B30",
    };
  };

  const fetchStats = async () => {
    try {
      const orders = await getAllOrders();
      const receipts = await getAllCustomerReceipts();
      const now = new Date();

      // Last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        last7Days.push(d.toDateString());
      }

      // Initialize daily totals
      const dailyOrders = {};
      const dailyAmount = {};
      const dailyPayments = {};
      last7Days.forEach(date => {
        dailyOrders[date] = 0;
        dailyAmount[date] = 0;
        dailyPayments[date] = 0;
      });

      // Fill daily totals for orders
      orders.forEach(order => {
        const orderDateStr = new Date(order.order_date).toDateString();
        if (dailyOrders[orderDateStr] !== undefined) {
          dailyOrders[orderDateStr] += 1;
          dailyAmount[orderDateStr] += order.total_amount || 0;
        }
      });

      // Fill daily totals for payments
      receipts.forEach(receipt => {
        const receiptDateStr = new Date(receipt.created_at).toDateString();
        if (dailyPayments[receiptDateStr] !== undefined) {
          dailyPayments[receiptDateStr] += receipt.amount || 0;
        }
      });

      const today = last7Days[last7Days.length - 1];
      const prev6Days = last7Days.slice(0, 6);

      setStats({
        totalAmount: dailyAmount[today],
        totalOrders: dailyOrders[today],
        totalPayments: dailyPayments[today],

        amountComparison: calcComparison(dailyAmount[today], prev6Days.map(d => dailyAmount[d])),
        ordersComparison: calcComparison(dailyOrders[today], prev6Days.map(d => dailyOrders[d])),
        paymentsComparison: calcComparison(dailyPayments[today], prev6Days.map(d => dailyPayments[d])),
      });

    } catch (error) {
      console.error(error);
    }
  };

  const reports = [
    {
      title: "Payments Received",
      icon: <Image source={require("../assets/Icons/PaymentReceived.png")} style={styles.icon} />,
      amount: `Rs ${stats.totalPayments.toFixed(2)}`,
      change: `${stats.paymentsComparison.percentage}%`,
      days: "last week",
      changeColor: stats.paymentsComparison.color,
      arrow: stats.paymentsComparison.arrow,
      navigateToScreen: "All Payments",
    },
    {
      title: "Orders Booked",
      icon: <Image source={require("../assets/Icons/OrderBooked.png")} style={styles.icon} />,
      amount: `Rs ${stats.totalAmount.toFixed(2)}`,
      change: `${stats.amountComparison.percentage}%`,
      days: "last week",
      changeColor: stats.amountComparison.color,
      arrow: stats.amountComparison.arrow,
      navigateToScreen: "All Orders",
    },
    {
      title: "Orders Quantity",
      icon: <Image source={require("../assets/Icons/OutstandingLedgers.png")} style={styles.icon} />,
      amount: stats.totalOrders,
      change: `${stats.ordersComparison.percentage}%`,
      days: "last week",
      changeColor: stats.ordersComparison.color,
      arrow: stats.ordersComparison.arrow,
      navigateToScreen: "All Orders",
    },
  ];

  return (
    <View style={styles.reports}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Other Reports</Text>
        <TouchableOpacity style={styles.seeMoreBtn} onPress={() => navigation.navigate("Dashboard")}>
          <LayoutDashboard size={20} color="#447ac2" />
        </TouchableOpacity>
      </View>

      {reports.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => navigation.navigate(item.navigateToScreen)}
        >
          <View style={styles.row}>
            <View style={styles.iconBox}>{item.icon}</View>
            <Text style={styles.title}>{item.title}</Text>

            <View style={styles.right}>
              <Text style={styles.amount}>{item.amount}</Text>
              <View style={styles.changeRow}>
                <View
                  style={[
                    styles.arrowBg,
                    { backgroundColor: item.arrow === "up" ? "#E9F8EE" : "#FFECEC" },
                  ]}
                >
                  {item.arrow === "up" ? (
                    <ArrowUpRight size={14} color={item.changeColor} />
                  ) : (
                    <ArrowDownRight size={14} color={item.changeColor} />
                  )}
                </View>

                <Text style={[styles.changeText, { color: item.changeColor }]}>
                  {item.change}
                </Text>
                <Text style={[styles.changeText, { color: "gray" }]}>
                  {item.days}
                </Text>
              </View>
            </View>
          </View>

          {index < reports.length - 1 && <View style={styles.divider} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reports: {
    backgroundColor: "#F4F6F9",
    padding: 20,
    borderRadius: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  seeMoreBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E6EFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#DFE5EB",
    marginVertical: 4,
  },
  icon: { width: 26, height: 26, resizeMode: "contain" },
  arrowBg: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    marginRight: 4,
  },
});




// // New Updated 08-12-2025
// import React, { useEffect, useState } from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
// import { ArrowUpRight, ArrowDownRight, LayoutDashboard } from "lucide-react-native";
// import { getAllOrders, getAllCustomerReceipts } from "../db/database"; 
// import { Feather } from "@expo/vector-icons";
// import { useNavigation } from "@react-navigation/native";

// export default function OtherReports() {
//   const navigation = useNavigation();
//   const [stats, setStats] = useState({
//     totalAmount: 0,
//     lastWeekAmount: 0,
//     lastWeekAmountPrev: 0,
//     totalOrders: 0,
//     last3DaysOrders: 0,
//     last3DaysOrdersPrev: 0,
//     totalPayments: 0,
//     last3DaysPayments: 0,
//     last3DaysPaymentsPrev: 0,
//   });

//   useEffect(() => {
//     fetchStats();
//   }, []);

//   const fetchStats = async () => {
//     try {
//       const orders = await getAllOrders();
//       const receipts = await getAllCustomerReceipts();

//       const now = new Date();

//       const lastWeek = new Date();
//       lastWeek.setDate(now.getDate() - 7);
//       const lastWeekPrev = new Date();
//       lastWeekPrev.setDate(now.getDate() - 14);

//       const last3Days = new Date();
//       last3Days.setDate(now.getDate() - 3);
//       const last3DaysPrev = new Date();
//       last3DaysPrev.setDate(now.getDate() - 6);

//       let totalAmount = 0,
//           lastWeekAmount = 0,
//           lastWeekAmountPrev = 0,
//           totalOrders = orders.length,
//           last3DaysOrders = 0,
//           last3DaysOrdersPrev = 0;

//       orders.forEach(order => {
//         const orderDate = new Date(order.order_date);
//         totalAmount += order.total_amount || 0;
//         if (orderDate >= lastWeek) lastWeekAmount += order.total_amount || 0;
//         if (orderDate >= lastWeekPrev && orderDate < lastWeek) lastWeekAmountPrev += order.total_amount || 0;
//         if (orderDate >= last3Days) last3DaysOrders += 1;
//         if (orderDate >= last3DaysPrev && orderDate < last3Days) last3DaysOrdersPrev += 1;
//       });

//       let totalPayments = 0,
//           last3DaysPayments = 0,
//           last3DaysPaymentsPrev = 0;

//       receipts.forEach(receipt => {
//         const createdAt = new Date(receipt.created_at);
//         totalPayments += receipt.amount || 0;
//         if (createdAt >= last3Days) last3DaysPayments += receipt.amount || 0;
//         if (createdAt >= last3DaysPrev && createdAt < last3Days) last3DaysPaymentsPrev += receipt.amount || 0;
//       });

//       setStats({
//         totalAmount,
//         lastWeekAmount,
//         lastWeekAmountPrev,
//         totalOrders,
//         last3DaysOrders,
//         last3DaysOrdersPrev,
//         totalPayments,
//         last3DaysPayments,
//         last3DaysPaymentsPrev,
//       });

//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const reports = [
//     {
//       title: "Payments Received",
//       icon: (
//         <Image
//           source={require("../assets/Icons/PaymentReceived.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: `Rs ${stats.totalPayments.toFixed(2)}`,
//       change: `Rs ${stats.last3DaysPayments.toFixed(2)}`,
//       days: "last 3 days",
//       changeColor: stats.last3DaysPayments >= stats.last3DaysPaymentsPrev ? "#1DBA4B" : "#FF3B30",
//       daysColor: "gray",
//       arrow: stats.last3DaysPayments >= stats.last3DaysPaymentsPrev ? "up" : "down",
//       navigateToScreen: "All Payments",
//     },
//     {
//       title: "Orders Booked",
//       icon: (
//         <Image
//           source={require("../assets/Icons/OrderBooked.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: `Rs ${stats.totalAmount.toFixed(2)}`,
//       change: `Rs ${stats.lastWeekAmount.toFixed(2)}`,
//       days: "last week",
//       changeColor: stats.lastWeekAmount >= stats.lastWeekAmountPrev ? "#1DBA4B" : "#FF3B30",
//       daysColor: "gray",
//       arrow: stats.lastWeekAmount >= stats.lastWeekAmountPrev ? "up" : "down",
//       navigateToScreen: "All Orders",
//       filter: "lastWeek",
//     },
//     {
//       title: "Orders Quantity",
//       icon: (
//         <Image
//           source={require("../assets/Icons/OutstandingLedgers.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: stats.totalOrders,
//       change: stats.last3DaysOrders,
//       days: "last 3 days",
//       changeColor: stats.last3DaysOrders >= stats.last3DaysOrdersPrev ? "#1DBA4B" : "#FF3B30",
//       daysColor: "gray",
//       arrow: stats.last3DaysOrders >= stats.last3DaysOrdersPrev ? "up" : "down",
//       navigateToScreen: "All Orders",
//       filter: "last3Days",
//     },
//   ];

//   return (
//     <View style={styles.reports}>
//       <View style={styles.headerRow}>
//         <Text style={styles.heading}>Other Reports</Text>
//         <TouchableOpacity style={styles.seeMoreBtn}  onPress={() => navigation.navigate("Dashboard")}>
//           {/* <Text style={styles.seeMoreText}>Dashboard</Text> */}
//           <LayoutDashboard  size={20} color="#447ac2" />
//       </TouchableOpacity>
//       </View>

//       {reports.map((item, index) => (
//         <TouchableOpacity
//           key={index}
//           onPress={() =>
//             navigation.navigate(item.navigateToScreen, { filter: item.filter })
//           }
//         >
//           <View style={styles.row}>
//             <View style={styles.iconBox}>{item.icon}</View>
//             <Text style={styles.title}>{item.title}</Text>

//             <View style={styles.right}>
//               <Text style={styles.amount}>{item.amount}</Text>
//               <View style={styles.changeRow}>
//                 <View
//                   style={[
//                     styles.arrowBg,
//                     { backgroundColor: item.arrow === "up" ? "#E9F8EE" : "#FFECEC" },
//                   ]}
//                 >
//                   {item.arrow === "up" ? (
//                     <ArrowUpRight size={14} color={item.changeColor} />
//                   ) : (
//                     <ArrowDownRight size={14} color={item.changeColor} />
//                   )}
//                 </View>

//                 <Text style={[styles.changeText, { color: item.changeColor }]}>
//                   {item.change}
//                 </Text>
//                 <Text style={[styles.changeText, { color: item.daysColor }]}>
//                   {item.days}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {index < reports.length - 1 && <View style={styles.divider} />}
//         </TouchableOpacity>
//       ))}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   reports: {
//     backgroundColor: "#F4F6F9",
//     padding: 20,
//     borderRadius: 14,
//   },
//   headerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   heading: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1A1A1A",
//   },
//   row: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//   },
//    seeMoreBtn: {
//     backgroundColor: "#fff",
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   seeMoreText: {
//     color: "#fff",
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   iconBox: {
//     width: 46,
//     height: 46,
//     borderRadius: 12,
//     backgroundColor: "#E6EFFF",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   title: {
//     flex: 1,
//     fontSize: 12,
//     color: "#333",
//     fontWeight: "700",
//   },
//   right: {
//     alignItems: "flex-end",
//   },
//   amount: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#2563EB",
//   },
//   changeRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 2,
//   },
//   changeText: {
//     fontSize: 13,
//     marginLeft: 4,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: "#DFE5EB",
//     marginVertical: 4,
//   },
//   icon: { width: 26, height: 26, resizeMode: "contain" },
//   arrowBg: {
//     width: 22,
//     height: 22,
//     justifyContent: "center",
//     alignItems: "center",
//     borderRadius: 11,
//     marginRight: 4,
//   },
// });







// import React from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
// import { ArrowUpRight, ArrowDownRight } from "lucide-react-native";

// export default function OtherReports() {
//   const reports = [
//     {
//       title: "Payments Received",
//       icon: (
//         <Image
//           source={require("../assets/Icons/PaymentReceived.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: "$70.2M",
//       change: "+500k",
//       days: "in last 3 days",
//       changeColor: "#1DBA4B",
//       daysColor: "gray",
//       arrow: "up",
//     },
//     {
//       title: "Orders Booked",
//       icon: (
//         <Image
//           source={require("../assets/Icons/OrderBooked.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: "$1.2M",
//       change: "+20k",
//       days: "in last 1 week",
//       changeColor: "#1DBA4B",
//       daysColor: "gray",
//       arrow: "up",
//     },
//     {
//       title: "Orders Quantity",
//       icon: (
//         <Image
//           source={require("../assets/Icons/OutstandingLedgers.png")}
//           style={styles.icon}
//         />
//       ),
//       amount: "$200.6k",
//       change: "-500k",
//       days: "in last 3 days",
//       changeColor: "#FF3B30",
//       daysColor: "gray",
//       arrow: "down",
//     },
//   ];

//   return (
//     <View style={styles.reports}>
//       {/* Header */}
//       <View style={styles.headerRow}>
//         <Text style={styles.heading}>Other Reports</Text>
//         <TouchableOpacity style={styles.seeMoreBtn}>
//           <Text style={styles.seeMoreText}>See more</Text>
//         </TouchableOpacity>
//       </View>

//       {/* List */}
//       {reports.map((item, index) => (
//         <View key={index}>
//           <View style={styles.row}>
//             {/* Left Side Icon */}
//             <View style={styles.iconBox}>
//               <Text style={styles.iconText}>{item.icon}</Text>
//             </View>

//             {/* Title */}
//             <Text style={styles.title}>{item.title}</Text>

//             {/* Right Side Amount + Change */}
//             <View style={styles.right}>
//               <Text style={styles.amount}>{item.amount}</Text>
//               <View style={styles.changeRow}>
//                <View
//   style={[
//     styles.arrowBg,
//     { backgroundColor: item.arrow === "up" ? "#E9F8EE" : "#FFECEC" }
//   ]}
// >
//   {item.arrow === "up" ? (
//     <ArrowUpRight size={14} color={item.changeColor} />
//   ) : (
//     <ArrowDownRight size={14} color={item.changeColor} />
//   )}
// </View>

//                 <Text style={[styles.changeText, { color: item.changeColor }]}>
//                   {item.change}
//                 </Text>
//                 <Text style={[styles.changeText, { color: item.daysColor }]}>
//                   {item.days}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {/* Divider except last */}
//           {index < reports.length - 1 && <View style={styles.divider} />}
//         </View>
//       ))}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   reports: {
//     backgroundColor: "#F4F6F9",
//     padding: 20,
//     borderRadius: 14,
//   },

//   // Header
//   headerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   heading: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1A1A1A",
//   },
//   seeMoreBtn: {
//     backgroundColor: "#447ac2",
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   seeMoreText: {
//     color: "#fff",
//     fontSize: 13,
//     fontWeight: "600",
//   },

//   // Row
//   row: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//   },

//   iconBox: {
//     width: 46,
//     height: 46,
//     borderRadius: 12,
//     backgroundColor: "#E6EFFF",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   iconText: {
//     fontSize: 22,
//   },

//   title: {
//     flex: 1,
//     fontSize: 12,
//     color: "gray",
//     fontWeight: "500",
//   },

//   right: {
//     alignItems: "flex-end",
//   },
//   amount: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#2563EB",
//   },
//   changeRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 2,
//   },
//   changeText: {
//     fontSize: 13,
//     marginLeft: 4,
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "#DFE5EB",
//     marginVertical: 4,
//   },

//   icon: { width: 26, height: 26, resizeMode: "contain" },

//   arrowBg: {
//   width: 22,
//   height: 22,
//   justifyContent: "center",
//   alignItems: "center",
//   borderRadius: 11,
//   marginRight: 4,
// }

// });
