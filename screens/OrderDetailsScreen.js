// Data Synced Marked
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOrderDetails,
  deleteOrderBookingLine,
  updateOrderBookingLineDetails,
  checkOrderSynced, // new function to check if order is synced
  getQRConfig,
} from "../db/database";
import { Plus, Minus, X } from "lucide-react-native";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";

export default function OrderDetailsScreen({ navigation, route }) {
  const { bookingId, customerId, customerName, orderNo, customerPhone } = route.params;
  const [details, setDetails] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSynced, setIsSynced] = useState(false); // new state

  const [cashierName, setCashierName] = useState("N/A");
const [cashierEmail, setCashierEmail] = useState("N/A");

const [orderLines, setOrderLines] = useState([]);
const [customer, setCustomer] = useState({});



useEffect(() => {
  const loadOrder = async () => {
    const rows = await getOrderDetails(bookingId);

    if (rows.length > 0) {
      setCustomer({
        id: rows[0].customer_id,
        name: rows[0].customer_name,
        phone: rows[0].customer_phone,
        orderNo: rows[0].order_no,
        orderDate: rows[0].order_date,
      });
    }

    setOrderLines(rows);
  };

  loadOrder();
}, [bookingId]);


  useEffect(() => {
    loadDetails();
  }, [bookingId]);

  // Load order details
  const loadDetails = async () => {
    try {
      const data = await getOrderDetails(bookingId);
      setDetails(data);
      calculateTotal(data);

      // Check if order is already synced
      const synced = await checkOrderSynced(bookingId);
      setIsSynced(synced);
    } catch (error) {
      console.error("Failed to load order details:", error);
    }
  };

  // Calculate total amount
  const calculateTotal = (list) => {
    const sum = list.reduce((acc, item) => acc + item.amount, 0);
    setTotalAmount(sum);
  };

  // Delete a single order line (disabled if synced)
  const handleDeleteItem = (lineId) => {
    if (isSynced) return;
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrderBookingLine(lineId);
              const updatedList = details.filter((item) => item.line_id !== lineId);
              setDetails(updatedList);
              calculateTotal(updatedList);
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // Increase quantity (disabled if synced)
  const increaseQty = async (item) => {
    if (!item || isSynced) return;
    try {
      const currentQty = parseInt(item.order_qty) || 0;
      const newQty = currentQty + 1;
      const newAmount = newQty * parseFloat(item.unit_price);

      const updatedList = details.map((d) =>
        d.line_id === item.line_id
          ? { ...d, order_qty: newQty, amount: newAmount }
          : d
      );
      setDetails(updatedList);
      calculateTotal(updatedList);

      await updateOrderBookingLineDetails({
        booking_line_id: item.line_id,
        order_qty: newQty,
        amount: newAmount,
      });
    } catch (error) {
      console.error("Failed to increase quantity:", error);
    }
  };

  // Decrease quantity (disabled if synced)
  const decreaseQty = async (item) => {
    if (!item || isSynced) return;
    try {
      const currentQty = parseInt(item.order_qty) || 0;
      if (currentQty <= 1) return;

      const newQty = currentQty - 1;
      const newAmount = newQty * parseFloat(item.unit_price);

      const updatedList = details.map((d) =>
        d.line_id === item.line_id
          ? { ...d, order_qty: newQty, amount: newAmount }
          : d
      );
      setDetails(updatedList);
      calculateTotal(updatedList);

      await updateOrderBookingLineDetails({
        booking_line_id: item.line_id,
        order_qty: newQty,
        amount: newAmount,
      });
    } catch (error) {
      console.error("Failed to decrease quantity:", error);
    }
  };

  const totalItems = details.length;

   useEffect(() => {
    const loadConfig = async () => {
      const config = await getQRConfig();
      if (config) {
        setCashierName(config.name || "N/A");
        setCashierEmail(config.email || "N/A");
      }
    };
  
    loadConfig();
  }, []);

// const generateInvoiceHTML = () => {
//   const invoiceNo = orderNo || "N/A";
//   const dateTime = new Date().toLocaleString();

//   // Prepare items from current details
//   const itemsHTML = details
//     .map(
//       (item, index) => `
//       <tr>
//         <td style="width:5%; text-align:center;">${index + 1}</td>
//         <td style="width:45%; word-wrap: break-word;">${item.item_name}</td>
//         <td style="width:15%; text-align:center;">${item.order_qty}</td>
//         <td style="width:15%; text-align:right;">${parseFloat(item.unit_price).toFixed(2)}</td>
//         <td style="width:20%; text-align:right;">${parseFloat(item.amount).toFixed(2)}</td>
//       </tr>
//     `
//     )
//     .join("");

//   const subtotal = totalAmount || 0;
//   const tax = 0;
//   const discount = 0;
//   const grandTotal = subtotal + tax - discount;
//   const cash = grandTotal;
//   const change = 0;

//   return `
//   <html>
//   <head>
//     <meta charset="utf-8" />
//     <style>
//       @media print {
//         body {
//           width: 58mm;
//           margin: 0;
//           padding: 4px;
//           font-family: monospace;
//           font-size: 12px;
//         }
//       }

//       body {
//         width: 58mm;
//         margin: 0;
//         padding: 4px;
//         font-family: monospace;
//         font-size: 12px;
//       }
//       .left { text-align: left; }
//       .center { text-align: center; }
//       .right { text-align: right; }
//       .bold { font-weight: bold; }

//       hr {
//         border: none;
//         border-top: 1px dashed #000;
//         margin: 4px 0;
//       }

//       table {
//         width: 100%;
//         border-collapse: collapse;
//         font-size: 11px;
//       }

//       th, td {
//         padding: 2px 0;
//         word-wrap: break-word;
//       }

//       th {
//         border-bottom: 1px dashed #000;
//         font-weight: bold;
//         font-size: 12px;
//       }

//       .totals td {
//         padding: 2px 0;
//       }

//       .barcode {
//         margin-top: 6px;
//         text-align: center;
//         font-size: 10px;
//         letter-spacing: 2px;
//         word-break: break-all;
//       }

//       .small-text { font-size: 10px; }
//       .medium-text { font-size: 12px; }
//       .large-text { font-size: 38px; font-weight: bold; }
//       .nowrap { white-space: nowrap; }
//       .wrap { word-wrap: break-word; }
//     </style>
//   </head>

//   <body>
//     <div class="center bold large-text">AXON ERP</div>
//     <div class="center medium-text">MULTI-TECHNO INTEGRATED SOLUTIONS</div>
//     <div class="center small-text">KOHINOOR Plaza 1, 2nd Floor, Office #17</div>
//     <div class="center small-text">Faisalabad</div>
//     <div class="left small-text">Phone: ${customer.phone || "N/A"}</div>
//     <div class="left small-text">Email: ${cashierEmail || "N/A"}</div>

//     <hr/>

//     <div class="center bold medium-text">SALE INVOICE</div>

//     <hr/>

//     <div class="small-text">Invoice: ${invoiceNo}</div>
//     <div class="small-text">Cashier: ${cashierName || "N/A"}</div>
//     <div class="small-text">Customer: ${customerName}</div>
//     <div class="small-text">Phone: ${customerPhone || "N/A"}</div>
//     <div class="small-text">Date: ${dateTime}</div>

//     <hr/>

//     <table>
//       <thead>
//         <tr>
//           <th style="width:5%;">S#</th>
//           <th style="width:45%;">Item</th>
//           <th style="width:15%; text-align:center;">Qty</th>
//           <th style="width:15%; text-align:right;">Rate</th>
//           <th style="width:20%; text-align:right;">Total</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${itemsHTML}
//       </tbody>
//     </table>

//     <hr/>

//     <table class="totals">
//       <tr>
//         <td>Subtotal</td>
//         <td class="right">${subtotal.toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td>Total Taxes</td>
//         <td class="right">${tax.toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td>Discount</td>
//         <td class="right">${discount.toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td class="bold">TOTAL AMOUNT</td>
//         <td class="right bold">${grandTotal.toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td>Cash</td>
//         <td class="right">${cash.toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td>Change</td>
//         <td class="right">${change.toFixed(2)}</td>
//       </tr>
//     </table>

//     <hr/>

//     <div class="center small-text">Thank You For Shopping!</div>
//     <div class="center small-text">No Return / No Exchange For Frozen</div>
//     <div class="center small-text">No Refund Without Receipt</div>

//     <div class="barcode">|||| ||| |||| |||</div>
//     <div class="center small-text">${invoiceNo}</div>
//   </body>
//   </html>
//   `;
// };


const generateInvoiceHTML = (companyLogoBase64, companyAddress, companyNTN) => {
  const dateTime = new Date().toLocaleString();

  // Use first item to get customer info safely
  const firstRow = details && details.length > 0 ? details[0] : {};
  const invoiceNo = firstRow.order_no || "N/A";
  const safeCustomerName = firstRow.customer_name || customerName || "Walk-in Customer";
  const safeCustomerPhone = firstRow.customer_phone || customerPhone;
  const safeCashierEmail = cashierEmail;

  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${invoiceNo}&scale=3&includetext`;

  // Prepare items from current details
  const itemsHTML = details
    .map(
      (item, index) => `
      <tr>
        <td style="width:5%; text-align:center;">${index + 1}</td>
        <td style="width:45%; word-wrap: break-word;">${item.item_name}</td>
        <td style="width:15%; text-align:center;">${item.order_qty}</td>
        <td style="width:15%; text-align:right;">${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="width:20%; text-align:right;">${parseFloat(item.amount).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const subtotal = totalAmount || 0;
  const tax = 0;
  const discount = 0;
  const grandTotal = subtotal + tax - discount;
  const cash = grandTotal;
  const change = 0;

  // Conditional fields
  const companyAddressHTML = companyAddress ? `<div class="center small-text">${companyAddress}</div>` : "";
  const companyNTNHTML = companyNTN ? `<div class="center small-text">NTN: ${companyNTN}</div>` : "";
  const customerPhoneHTML = safeCustomerPhone ? `<div class="left small-text">Phone: ${safeCustomerPhone}</div>` : "";
  const cashierEmailHTML = safeCashierEmail ? `<div class="left small-text">Email: ${safeCashierEmail}</div>` : "";

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @media print {
        body { width: 58mm; margin: 0; padding: 4px; font-family: monospace; font-size: 12px; }
      }
      body { width: 58mm; margin: 0; padding: 4px; font-family: monospace; font-size: 12px; }
      .left { text-align: left; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { padding: 2px 0; word-wrap: break-word; }
      th { border-bottom: 1px dashed #000; font-weight: bold; font-size: 12px; }
      .totals td { padding: 2px 0; }
      .barcode { margin-top: 6px; text-align: center; font-size: 10px; letter-spacing: 2px; word-break: break-all; }
      .small-text { font-size: 10px; }
      .medium-text { font-size: 12px; }
      .large-text { font-size: 38px; font-weight: bold; }
      .nowrap { white-space: nowrap; }
      .wrap { word-wrap: break-word; }
    </style>
  </head>

  <body>
    <!-- LOGO -->
    <div class="center">
      ${
        companyLogoBase64
          ? `<img src="data:image/png;base64,${companyLogoBase64}" width="130" height="40" />`
          : `<div class="bold">AXON ERP</div>`
      }
    </div>

    ${companyAddressHTML}
    ${companyNTNHTML}
    ${customerPhoneHTML}
    ${cashierEmailHTML}

    <hr/>

    <div class="center bold medium-text">SALE INVOICE</div>
    <hr/>

    <div class="small-text">Invoice: ${invoiceNo}</div>
    <div class="small-text">Cashier: ${cashierName || ""}</div>
    <div class="small-text">Customer: ${safeCustomerName}</div>
    ${safeCustomerPhone ? `<div class="small-text">Phone: ${safeCustomerPhone}</div>` : ""}
    <div class="small-text">Date: ${dateTime}</div>

    <hr/>

    <table>
      <thead>
        <tr>
          <th style="width:5%;">S#</th>
          <th style="width:45%;">Item</th>
          <th style="width:15%; text-align:center;">Qty</th>
          <th style="width:15%; text-align:right;">Rate</th>
          <th style="width:20%; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <hr/>

    <table class="totals">
      <tr><td>Subtotal</td><td class="right">${subtotal.toFixed(2)}</td></tr>
      <tr><td>Total Taxes</td><td class="right">${tax.toFixed(2)}</td></tr>
      <tr><td>Discount</td><td class="right">${discount.toFixed(2)}</td></tr>
      <tr><td class="bold">TOTAL AMOUNT</td><td class="right bold">${grandTotal.toFixed(2)}</td></tr>
      <tr><td>Cash</td><td class="right">${cash.toFixed(2)}</td></tr>
      <tr><td>Change</td><td class="right">${change.toFixed(2)}</td></tr>
    </table>

    <hr/>

    <div class="center small-text">Thank You For Shopping!</div>
    <div class="center small-text">No Return / No Exchange For Frozen</div>
    <div class="center small-text">No Refund Without Receipt</div>
    <hr/>

    <div class="barcode">
      <img src="${barcodeUrl}" width="200" height="60" />
    </div>
  </body>
  </html>
  `;
};


const handlePrintInvoice = async () => {
  try {
    // Load QR Config including logo, address, and NTN
    const config = await getQRConfig();
    const companyLogoBase64 = config?.company_logo || null;
    const companyAddress = config?.company_address || null;
    const companyNTN = config?.company_ntn_number || null;

    await Print.printAsync({
      html: generateInvoiceHTML(companyLogoBase64, companyAddress, companyNTN),
    });
  } catch (error) {
    console.error("Print error:", error);
    Alert.alert("Print Error", "Unable to print invoice");
  }
};



// const handlePrintInvoice = async () => {
//   try {
//     await Print.printAsync({
//       html: generateInvoiceHTML(),
//     });
//   } catch (error) {
//     console.error("Print error:", error);
//     Alert.alert("Print Error", "Unable to print invoice");
//   }
// };



  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerInfo}>
            <Text style={styles.orderText}>Customer Name</Text>
            <Text style={styles.customerText}>{customerName}</Text>
          </View>

          {/* Add more items button (disabled if synced) */}
          <TouchableOpacity
            style={[styles.plusBtn, isSynced && { backgroundColor: "#a0a0a0" }]}
            onPress={() =>
              !isSynced &&
              navigation.navigate("Items", { customerId, bookingId, customerName })
            }
            disabled={isSynced}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Order items list */}
        <FlatList
          data={details}
          keyExtractor={(item) => item.line_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View>
                  <Text style={styles.itemName}>{item.item_name}</Text>
                  <Text style={styles.itemInfo}>
                    Qty: {item.order_qty} × Rs {item.unit_price.toFixed(2)}
                  </Text>
                  <Text style={styles.amount}>
                    Total: Rs {item.amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.actions}>
                  {/* Quantity controls (disabled if synced) */}
                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      onPress={() => decreaseQty(item)}
                      style={styles.qtyBtn}
                      disabled={isSynced}
                    >
                      <Minus size={16} color={isSynced ? "#999" : "#000"} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.order_qty}</Text>
                    <TouchableOpacity
                      onPress={() => increaseQty(item)}
                      style={styles.qtyBtn}
                      disabled={isSynced}
                    >
                      <Plus size={16} color={isSynced ? "#999" : "#000"} />
                    </TouchableOpacity>
                  </View>

                  {/* Sync status icon */}
                  <View style={styles.deleteBtn}>
                    {isSynced ? (
                     <Feather name="check-circle" size={22} color="green" />
                    ) : (
                      <TouchableOpacity onPress={() => handleDeleteItem(item.line_id)}>
                        <X size={22} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 66 }}
          showsVerticalScrollIndicator={false}
        />

       {/* Bottom bar */}
<View style={styles.bottomBarContainer}>
  <View style={styles.bottomBar}>
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Items:</Text>
      <Text style={styles.totalValue}>{totalItems}</Text>
    </View>
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Amount:</Text>
      <Text style={styles.totalValue}>Rs. {totalAmount.toFixed(2)}</Text>
    </View>

    {/* Buttons row */}
   <View style={styles.bottomButtonsRow}>
  <TouchableOpacity
   style={styles.completedBtn}
    onPress={() => navigation.replace("Home")}
  >
    <Text style={styles.completedBtnText}>Completed</Text>
  </TouchableOpacity>

  <TouchableOpacity
   style={styles.printBtn}
    onPress={handlePrintInvoice} // now it exists
    
  >
    <Text style={styles.printBtnText}>🖨 Print</Text>
  </TouchableOpacity>
</View>

  </View>
</View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f8fa", paddingTop: 10 },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerInfo: { flex: 1 },
  orderText: { fontSize: 14, fontWeight: 400, color: "gray", marginBottom: 4 },
  customerText: { fontSize: 18, fontWeight: "bold", color: "#2954E5" },
  plusBtn: {
    backgroundColor: "#10B981",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
    marginHorizontal: 16,
  },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 16, fontWeight: "600", color: "#333" },
  itemInfo: { color: "#666", marginTop: 5 },
  amount: { marginTop: 5, fontWeight: "bold", color: "#007bff" },
  actions: { flexDirection: "row", alignItems: "center" },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 6,
    marginRight: 10,
  },
  qtyBtn: { padding: 4 },
  qtyText: { fontSize: 14, fontWeight: "600", marginHorizontal: 6 },
  deleteBtn: { padding: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  totalLabel: { fontWeight: "bold", fontSize: 16 },
  totalValue: { fontWeight: "bold", fontSize: 16, color: "#10B981" },
  bottomBarContainer: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "#f7f8fa" },
  bottomBar: { backgroundColor: "#fff", padding: 10, borderRadius: 12, marginBottom: 10, elevation: 2 },
  completedBtn: { backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14, alignItems: "center",width:"70%", justifyContent: "center" },
  completedBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  printBtn: { backgroundColor: "#2954E5", borderRadius: 12, paddingVertical: 14, alignItems: "center",width:"26%", justifyContent: "center" },
  printBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  bottomButtonsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
},
});



// // Data Synced Marked
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   Platform,
//   KeyboardAvoidingView,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   getOrderDetails,
//   deleteOrderBookingLine,
//   updateOrderBookingLineDetails,
//   checkOrderSynced, // new function to check if order is synced
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";
// import { Feather } from "@expo/vector-icons";

// export default function OrderDetailsScreen({ navigation, route }) {
//   const { bookingId, customerId, customerName, orderNo } = route.params;
//   const [details, setDetails] = useState([]);
//   const [totalAmount, setTotalAmount] = useState(0);
//   const [isSynced, setIsSynced] = useState(false); // new state

//   useEffect(() => {
//     loadDetails();
//   }, [bookingId]);

//   // Load order details
//   const loadDetails = async () => {
//     try {
//       const data = await getOrderDetails(bookingId);
//       setDetails(data);
//       calculateTotal(data);

//       // Check if order is already synced
//       const synced = await checkOrderSynced(bookingId);
//       setIsSynced(synced);
//     } catch (error) {
//       console.error("Failed to load order details:", error);
//     }
//   };

//   // Calculate total amount
//   const calculateTotal = (list) => {
//     const sum = list.reduce((acc, item) => acc + item.amount, 0);
//     setTotalAmount(sum);
//   };

//   // Delete a single order line (disabled if synced)
//   const handleDeleteItem = (lineId) => {
//     if (isSynced) return;
//     Alert.alert(
//       "Confirm Delete",
//       "Are you sure you want to remove this item?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await deleteOrderBookingLine(lineId);
//               const updatedList = details.filter((item) => item.line_id !== lineId);
//               setDetails(updatedList);
//               calculateTotal(updatedList);
//             } catch (error) {
//               console.error(error);
//               Alert.alert("Error", "Failed to delete item");
//             }
//           },
//         },
//       ]
//     );
//   };

//   // Increase quantity (disabled if synced)
//   const increaseQty = async (item) => {
//     if (!item || isSynced) return;
//     try {
//       const currentQty = parseInt(item.order_qty) || 0;
//       const newQty = currentQty + 1;
//       const newAmount = newQty * parseFloat(item.unit_price);

//       const updatedList = details.map((d) =>
//         d.line_id === item.line_id
//           ? { ...d, order_qty: newQty, amount: newAmount }
//           : d
//       );
//       setDetails(updatedList);
//       calculateTotal(updatedList);

//       await updateOrderBookingLineDetails({
//         booking_line_id: item.line_id,
//         order_qty: newQty,
//         amount: newAmount,
//       });
//     } catch (error) {
//       console.error("Failed to increase quantity:", error);
//     }
//   };

//   // Decrease quantity (disabled if synced)
//   const decreaseQty = async (item) => {
//     if (!item || isSynced) return;
//     try {
//       const currentQty = parseInt(item.order_qty) || 0;
//       if (currentQty <= 1) return;

//       const newQty = currentQty - 1;
//       const newAmount = newQty * parseFloat(item.unit_price);

//       const updatedList = details.map((d) =>
//         d.line_id === item.line_id
//           ? { ...d, order_qty: newQty, amount: newAmount }
//           : d
//       );
//       setDetails(updatedList);
//       calculateTotal(updatedList);

//       await updateOrderBookingLineDetails({
//         booking_line_id: item.line_id,
//         order_qty: newQty,
//         amount: newAmount,
//       });
//     } catch (error) {
//       console.error("Failed to decrease quantity:", error);
//     }
//   };

//   const totalItems = details.length;

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         {/* Header */}
//         <View style={styles.headerCard}>
//           <View style={styles.headerInfo}>
//             <Text style={styles.orderText}>Customer Name</Text>
//             <Text style={styles.customerText}>{customerName}</Text>
//           </View>

//           {/* Add more items button (disabled if synced) */}
//           <TouchableOpacity
//             style={[styles.plusBtn, isSynced && { backgroundColor: "#a0a0a0" }]}
//             onPress={() =>
//               !isSynced &&
//               navigation.navigate("Items", { customerId, bookingId, customerName })
//             }
//             disabled={isSynced}
//           >
//             <Plus size={24} color="#fff" />
//           </TouchableOpacity>
//         </View>

//         {/* Order items list */}
//         <FlatList
//           data={details}
//           keyExtractor={(item) => item.line_id.toString()}
//           renderItem={({ item }) => (
//             <View style={styles.itemCard}>
//               <View style={styles.itemRow}>
//                 <View>
//                   <Text style={styles.itemName}>{item.item_name}</Text>
//                   <Text style={styles.itemInfo}>
//                     Qty: {item.order_qty} × Rs {item.unit_price.toFixed(2)}
//                   </Text>
//                   <Text style={styles.amount}>
//                     Total: Rs {item.amount.toFixed(2)}
//                   </Text>
//                 </View>

//                 <View style={styles.actions}>
//                   {/* Quantity controls (disabled if synced) */}
//                   <View style={styles.qtyBox}>
//                     <TouchableOpacity
//                       onPress={() => decreaseQty(item)}
//                       style={styles.qtyBtn}
//                       disabled={isSynced}
//                     >
//                       <Minus size={16} color={isSynced ? "#999" : "#000"} />
//                     </TouchableOpacity>
//                     <Text style={styles.qtyText}>{item.order_qty}</Text>
//                     <TouchableOpacity
//                       onPress={() => increaseQty(item)}
//                       style={styles.qtyBtn}
//                       disabled={isSynced}
//                     >
//                       <Plus size={16} color={isSynced ? "#999" : "#000"} />
//                     </TouchableOpacity>
//                   </View>

//                   {/* Sync status icon */}
//                   <View style={styles.deleteBtn}>
//                     {isSynced ? (
//                      <Feather name="check-circle" size={22} color="green" />
//                     ) : (
//                       <TouchableOpacity onPress={() => handleDeleteItem(item.line_id)}>
//                         <X size={22} color="#EF4444" />
//                       </TouchableOpacity>
//                     )}
//                   </View>
//                 </View>
//               </View>
//             </View>
//           )}
//           contentContainerStyle={{ paddingBottom: 66 }}
//           showsVerticalScrollIndicator={false}
//         />

//         {/* Bottom bar */}
//         <View style={styles.bottomBarContainer}>
//           <View style={styles.bottomBar}>
//             <View style={styles.totalRow}>
//               <Text style={styles.totalLabel}>Total Items:</Text>
//               <Text style={styles.totalValue}>{totalItems}</Text>
//             </View>
//             <View style={styles.totalRow}>
//               <Text style={styles.totalLabel}>Total Amount:</Text>
//               <Text style={styles.totalValue}>Rs. {totalAmount.toFixed(2)}</Text>
//             </View>
//           </View>

//           {/* Completed button */}
//           <TouchableOpacity
//             style={styles.completedBtn}
//             onPress={() => navigation.replace("Home")}
//           >
//             <Text style={styles.completedBtnText}>Completed</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // Styles remain unchanged
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f7f8fa", paddingTop: 10 },
//   headerCard: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     padding: 16,
//     marginHorizontal: 16,
//     marginBottom: 10,
//     borderRadius: 12,
//     elevation: 3,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   headerInfo: { flex: 1 },
//   orderText: { fontSize: 14, fontWeight: 400, color: "gray", marginBottom: 4 },
//   customerText: { fontSize: 18, fontWeight: "bold", color: "#2954E5" },
//   plusBtn: {
//     backgroundColor: "#10B981",
//     padding: 10,
//     borderRadius: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 10,
//     marginBottom: 10,
//     elevation: 2,
//     marginHorizontal: 16,
//   },
//   itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   itemName: { fontSize: 16, fontWeight: "600", color: "#333" },
//   itemInfo: { color: "#666", marginTop: 5 },
//   amount: { marginTop: 5, fontWeight: "bold", color: "#007bff" },
//   actions: { flexDirection: "row", alignItems: "center" },
//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     marginRight: 10,
//   },
//   qtyBtn: { padding: 4 },
//   qtyText: { fontSize: 14, fontWeight: "600", marginHorizontal: 6 },
//   deleteBtn: { padding: 6 },
//   totalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
//   totalLabel: { fontWeight: "bold", fontSize: 16 },
//   totalValue: { fontWeight: "bold", fontSize: 16, color: "#10B981" },
//   bottomBarContainer: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "#f7f8fa" },
//   bottomBar: { backgroundColor: "#fff", padding: 10, borderRadius: 12, marginBottom: 10, elevation: 2 },
//   completedBtn: { backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
//   completedBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
// });



// // Data Synced Marked
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   Platform,
//   KeyboardAvoidingView,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   getOrderDetails,
//   deleteOrderBookingLine,
//   updateOrderBookingLineDetails,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";

// export default function OrderDetailsScreen({ navigation, route }) {
//   const { bookingId, customerId, customerName, orderNo } = route.params;
//   const [details, setDetails] = useState([]);
//   const [totalAmount, setTotalAmount] = useState(0);

//   useEffect(() => {
//     loadDetails();
//   }, [bookingId]);

//   // Load order details
//   const loadDetails = async () => {
//     try {
//       const data = await getOrderDetails(bookingId);
//       setDetails(data);
//       calculateTotal(data);
//     } catch (error) {
//       console.error("Failed to load order details:", error);
//     }
//   };

//   // Calculate total amount
//   const calculateTotal = (list) => {
//     const sum = list.reduce((acc, item) => acc + item.amount, 0);
//     setTotalAmount(sum);
//   };

//   // Delete a single order line
//   const handleDeleteItem = (lineId) => {
//     Alert.alert(
//       "Confirm Delete",
//       "Are you sure you want to remove this item?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await deleteOrderBookingLine(lineId);
//               const updatedList = details.filter((item) => item.line_id !== lineId);
//               setDetails(updatedList);
//               calculateTotal(updatedList);
//             } catch (error) {
//               console.error(error);
//               Alert.alert("Error", "Failed to delete item");
//             }
//           },
//         },
//       ]
//     );
//   };

//   // Increase quantity
//   const increaseQty = async (item) => {
//     if (!item) return;
//     try {
//       const currentQty = parseInt(item.order_qty) || 0;
//       const newQty = currentQty + 1;
//       const newAmount = newQty * parseFloat(item.unit_price);

//       const updatedList = details.map((d) =>
//         d.line_id === item.line_id
//           ? { ...d, order_qty: newQty, amount: newAmount }
//           : d
//       );
//       setDetails(updatedList);
//       calculateTotal(updatedList);

//       await updateOrderBookingLineDetails({
//         booking_line_id: item.line_id,
//         order_qty: newQty,
//         amount: newAmount,
//       });
//     } catch (error) {
//       console.error("Failed to increase quantity:", error);
//     }
//   };

//   // Decrease quantity
//   const decreaseQty = async (item) => {
//     if (!item) return;
//     try {
//       const currentQty = parseInt(item.order_qty) || 0;
//       if (currentQty <= 1) return;

//       const newQty = currentQty - 1;
//       const newAmount = newQty * parseFloat(item.unit_price);

//       const updatedList = details.map((d) =>
//         d.line_id === item.line_id
//           ? { ...d, order_qty: newQty, amount: newAmount }
//           : d
//       );
//       setDetails(updatedList);
//       calculateTotal(updatedList);

//       await updateOrderBookingLineDetails({
//         booking_line_id: item.line_id,
//         order_qty: newQty,
//         amount: newAmount,
//       });
//     } catch (error) {
//       console.error("Failed to decrease quantity:", error);
//     }
//   };

//   const totalItems = details.length;

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         {/* Header */}
//         <View style={styles.headerCard}>
//           <View style={styles.headerInfo}>
//             {/* <Text style={styles.orderText}>Order No: {orderNo}</Text> */}
//             <Text style={styles.orderText}>Customer Name</Text>
//             <Text style={styles.customerText}>{customerName}</Text>
//           </View>

//           {/* Add more items */}
//           <TouchableOpacity
//             style={styles.plusBtn}
//             onPress={() =>
//               navigation.navigate("Items", { customerId, bookingId, customerName })
//             }
//           >
//             <Plus size={24} color="#fff" />
//           </TouchableOpacity>
//         </View>

//         {/* Order items list */}
//         <FlatList
//           data={details}
//           keyExtractor={(item) => item.line_id.toString()}
//           renderItem={({ item }) => (
//             <View style={styles.itemCard}>
//               <View style={styles.itemRow}>
//                 <View>
//                   <Text style={styles.itemName}>{item.item_name}</Text>
//                   <Text style={styles.itemInfo}>
//                     Qty: {item.order_qty} × Rs {item.unit_price.toFixed(2)}
//                   </Text>
//                   <Text style={styles.amount}>
//                     Total: Rs {item.amount.toFixed(2)}
//                   </Text>
//                 </View>

//                 <View style={styles.actions}>
//                   {/* Quantity controls */}
//                   <View style={styles.qtyBox}>
//                     <TouchableOpacity onPress={() => decreaseQty(item)} style={styles.qtyBtn}>
//                       <Minus size={16} color="#000" />
//                     </TouchableOpacity>
//                     <Text style={styles.qtyText}>{item.order_qty}</Text>
//                     <TouchableOpacity onPress={() => increaseQty(item)} style={styles.qtyBtn}>
//                       <Plus size={16} color="#000" />
//                     </TouchableOpacity>
//                   </View>

//                   {/* Delete button */}
//                   <TouchableOpacity
//                     style={styles.deleteBtn}
//                     onPress={() => handleDeleteItem(item.line_id)}
//                   >
//                     <X size={22} color="#EF4444" />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>
//           )}
//           contentContainerStyle={{ paddingBottom: 66 }}
//           showsVerticalScrollIndicator={false}
//         />

//         {/* Bottom bar: total items, total amount, and Completed button */}
// <View style={styles.bottomBarContainer}>
//   <View style={styles.bottomBar}>
//     <View style={styles.totalRow}>
//       <Text style={styles.totalLabel}>Total Items:</Text>
//       <Text style={styles.totalValue}>{totalItems}</Text>
//     </View>
//     <View style={styles.totalRow}>
//       <Text style={styles.totalLabel}>Total Amount:</Text>
//       <Text style={styles.totalValue}>Rs. {totalAmount.toFixed(2)}</Text>
//     </View>
//   </View>

//   {/* Completed button under totals */}
//   <TouchableOpacity
//     style={styles.completedBtn}
//     onPress={() => navigation.navigate("Home")}
//   >
//     <Text style={styles.completedBtnText}>Completed</Text>
//   </TouchableOpacity>
// </View>

//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f7f8fa", paddingTop: 10 },
  
//   headerCard: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     padding: 16,
//     marginHorizontal: 16,
//     marginBottom: 10,
//     borderRadius: 12,
//     elevation: 3,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   headerInfo: { flex: 1 },
//   orderText: { fontSize: 14, fontWeight: 400, color: "gray", marginBottom: 4 },
//   customerText: { fontSize: 18, fontWeight: "bold", color: "#2954E5" },
//   plusBtn: {
//     backgroundColor: "#10B981",
//     padding: 10,
//     borderRadius: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 10,
//     marginBottom: 10,
//     elevation: 2,
//     marginHorizontal: 16,
//   },
//   itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   itemName: { fontSize: 16, fontWeight: "600", color: "#333" },
//   itemInfo: { color: "#666", marginTop: 5 },
//   amount: { marginTop: 5, fontWeight: "bold", color: "#007bff" },
//   actions: { flexDirection: "row", alignItems: "center" },
//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     marginRight: 10,
//   },
//   qtyBtn: { padding: 4 },
//   qtyText: { fontSize: 14, fontWeight: "600", marginHorizontal: 6 },
//   deleteBtn: { padding: 6 },

//   totalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginVertical: 2,
//   },
//   totalLabel: { fontWeight: "bold", fontSize: 16 },
//   totalValue: { fontWeight: "bold", fontSize: 16, color: "#10B981" },

//   bottomBarContainer: {
//   paddingHorizontal: 16,
//   paddingBottom: 16,
//   backgroundColor: "#f7f8fa",
// },
// bottomBar: {
//   backgroundColor: "#fff",
//   padding: 10,
//   borderRadius: 12,
//   marginBottom: 10,
//   elevation: 2,
// },
// completedBtn: {
//   backgroundColor: "#10B981",
//   borderRadius: 12,
//   paddingVertical: 14,
//   alignItems: "center",
//   justifyContent: "center",
// },
// completedBtnText: {
//   color: "#fff",
//   fontSize: 16,
//   fontWeight: "bold",
// },
// });