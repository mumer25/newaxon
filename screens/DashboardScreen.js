// src/screens/DashboardScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LineChart } from "react-native-chart-kit";
import { getAllOrders, getAllCustomerReceipts } from "../db/database";

const { width } = Dimensions.get("window");
const RF = (size) => Math.round((size / 375) * width);

export default function DashboardScreen() {
  // -----------------------------
  // STATES
  // -----------------------------
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 86400000)); 
  const [toDate, setToDate] = useState(new Date());

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [totalSales, setTotalSales] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);

  const [dailyLabels, setDailyLabels] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [dailyPayments, setDailyPayments] = useState([]);

  const [topCustomers, setTopCustomers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [fromDate, toDate]);

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  const fetchDashboardData = async () => {
    try {
      const orders = (await getAllOrders()) || [];
      const receipts = (await getAllCustomerReceipts()) || [];

      const start = new Date(fromDate.setHours(0, 0, 0, 0));
      const end = new Date(toDate.setHours(23, 59, 59, 999));

      // ✓ FILTER BY RANGE
      const filteredOrders = orders.filter((o) => {
        const d = new Date(o.order_date);
        return d >= start && d <= end;
      });

      const filteredReceipts = receipts.filter((r) => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      });

      // -----------------------------
      // TOTALS
      // -----------------------------
      setTotalSales(
        filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      );

      setTotalPayments(
        filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
      );

      // -----------------------------
      // DAILY MAPS
      // -----------------------------
      const salesMap = {};
      const paymentsMap = {};

      filteredOrders.forEach((order) => {
        const date = new Date(order.order_date).toISOString().slice(0, 10);
        salesMap[date] = (salesMap[date] || 0) + (order.total_amount || 0);
      });

      filteredReceipts.forEach((r) => {
        const date = new Date(r.created_at).toISOString().slice(0, 10);
        paymentsMap[date] = (paymentsMap[date] || 0) + (r.amount || 0);
      });

      const allDates = Array.from(
        new Set([...Object.keys(salesMap), ...Object.keys(paymentsMap)])
      ).sort();

      setDailyLabels(allDates.map((d) => new Date(d).getDate().toString()));
      setDailySales(allDates.map((d) => salesMap[d] || 0));
      setDailyPayments(allDates.map((d) => paymentsMap[d] || 0));

      // -----------------------------
      // TOP CUSTOMERS (ONLY MAX ORDERS)
      // -----------------------------
      const customerMap = {};

      filteredOrders.forEach((order) => {
        const name = order.customer_name || "Unknown";
        customerMap[name] = (customerMap[name] || 0) + 1;
      });

      // Remove customers with 0 orders automatically
      const top10 = Object.entries(customerMap)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, orders: count }));

      setTopCustomers(top10);
    } catch (err) {
      console.log("Dashboard Error:", err);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F9" }} edges={["bottom","left","right"]}>
      <ScrollView style={styles.container}>
        {/* DATE RANGE */}
        <Text style={styles.sectionTitle}>Select Date Range</Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.dateLabel}>From:</Text>
            <Text style={styles.dateValue}>
              {fromDate.toISOString().slice(0, 10)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateBox}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.dateLabel}>To:</Text>
            <Text style={styles.dateValue}>
              {toDate.toISOString().slice(0, 10)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DATE PICKERS */}
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            onChange={(e, d) => {
              setShowFromPicker(false);
              if (d) setFromDate(d);
            }}
          />
        )}

        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            onChange={(e, d) => {
              setShowToPicker(false);
              if (d) setToDate(d);
            }}
          />
        )}

        {/* TOTAL CARDS */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Sales</Text>
            <Text style={styles.cardAmount}>Rs {totalSales.toFixed(2)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Payments</Text>
            <Text style={styles.cardAmount}>Rs {totalPayments.toFixed(2)}</Text>
          </View>
        </View>

        {/* SALES GRAPH */}
        {dailySales.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Daily Sales</Text>

            <LineChart
              data={{
                labels: dailyLabels,
                datasets: [{ data: dailySales }],
              }}
              width={width - 20}
              height={250}
              yAxisLabel="Rs "
              chartConfig={chartWhiteBG}
              bezier
              style={styles.chartStyle}
            />
          </>
        )}

        {/* PAYMENTS GRAPH */}
        {dailyPayments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Daily Payments</Text>

            <LineChart
              data={{
                labels: dailyLabels,
                datasets: [{ data: dailyPayments }],
              }}
              width={width - 20}
              height={250}
              yAxisLabel="Rs "
              chartConfig={chartWhiteBG}
              bezier
              style={styles.chartStyle}
            />
          </>
        )}

        {/* TOP CUSTOMERS */}
        <Text style={styles.sectionTitle}>Top 10 Customers</Text>

        <FlatList
          data={topCustomers}
          keyExtractor={(item, i) => i.toString()}
          scrollEnabled={false}
          style={{paddingBottom:18}}
          renderItem={({ item }) => (
            <View style={styles.customerRow}>
              <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              <Text style={styles.customerOrders}>{item.orders} orders</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------
// WHITE BACKGROUND CHART
// -----------------------------
const chartWhiteBG = {
  backgroundColor: "#FFFFFF",
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: (o = 1) => `rgba(0, 122, 255, ${o})`,
  labelColor: () => "#444",
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#F4F6F9" },

  sectionTitle: {
    fontSize: RF(16),
    fontWeight: "700",
    marginVertical: 14,
    color: "#333",
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  dateBox: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    elevation: 2,
  },

  dateLabel: { fontSize: RF(12), color: "#777", marginLeft:8},
  dateValue: { fontSize: RF(14), fontWeight: "700", marginTop: 4, marginLeft:8 },

  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    elevation: 3,
    marginBottom: 10,
  },

  cardTitle: { fontSize: RF(14), color: "#555",textAlign:"center" },
  cardAmount: { fontSize: RF(20), fontWeight: "700", color: "#0a84ff",textAlign:"center"  },

  chartStyle: {
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 5,
    elevation: 3,
    marginBottom: 20,
  },

  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    elevation: 1,
    alignItems: "center",
    width: "100%",
  },

  customerName: { fontSize: RF(15), fontWeight: "600",color:"gray",flexShrink: 1,marginRight: 10 },
  customerOrders: { fontSize: RF(15), color: "#0a84ff", fontWeight: "700",textAlign: "right" },

  separator: { marginVertical: 5 },
});
