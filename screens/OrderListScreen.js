import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import * as Print from "expo-print";

import {
  addOrderBooking,
  addOrderBookingLine,
  getOrderLineByBookingAndItem,
  updateOrderBookingLine,
  addRecentActivity,
  generateNextOrderNo,
  getQRConfig,
} from "../db/database";
import { Plus, Minus, X } from "lucide-react-native";
import Toast from "react-native-toast-message";

export default function OrderListScreen({ navigation, route }) {
  const customerId = route.params.customerId;
  const customerName = route.params.customerName || "Customer";
  const customerPhone = route.params.customerPhone;
  const bookingId = route.params.bookingId || null;
  const initialList = route.params.orderList || [];
  const setStatsRefresh = route.params?.setStatsRefresh || null;

  const [cashierName, setCashierName] = useState("N/A");
const [cashierEmail, setCashierEmail] = useState("N/A");


  const [showInvoice, setShowInvoice] = useState(false);
const [invoiceData, setInvoiceData] = useState(null);

const [currentOrderNo, setCurrentOrderNo] = useState(""); // store invoice/order number

const [companyLogo, setCompanyLogo] = useState(null);
const [companyAddress, setCompanyAddress] = useState(null);
const [companyNTN, setCompanyNTN] = useState(null);



  const [orderList, setOrderList] = useState(
    Array.isArray(initialList) ? initialList.filter(Boolean) : []
  );

  const handleRemoveItem = (itemId) => {
    setOrderList((prev) => prev.filter((item) => item.id !== itemId));
  };

  const increaseQty = (itemId) => {
    setOrderList((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * item.price,
            }
          : item
      )
    );
  };

  const decreaseQty = (itemId) => {
    setOrderList((prev) =>
      prev
        .map((item) =>
          item.id === itemId && item.quantity > 1
            ? {
                ...item,
                quantity: item.quantity - 1,
                total: (item.quantity - 1) * item.price,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

//  useEffect(() => {
//   const loadConfig = async () => {
//     const config = await getQRConfig();
//     if (config) {
//       setCashierName(config.name || "N/A");
//       setCashierEmail(config.email || "N/A");
//     }
//   };

//   loadConfig();
// }, []);

useEffect(() => {
  const loadConfig = async () => {
    const config = await getQRConfig();
    if (config) {
      // Cashier info
      setCashierName(config.name || "N/A");
      setCashierEmail(config.email || "N/A");

      // ✅ Company logo (base64)
      if (config.company_logo) {
        setCompanyLogo(`data:image/png;base64,${config.company_logo}`);
      }

      // ✅ Company address
      setCompanyAddress(config.company_address || "N/A");

      // ✅ Company NTN number
      setCompanyNTN(config.company_ntn_number || "N/A");
    }
  };

  loadConfig();
}, []);


const generateInvoiceHTML = (companyLogoBase64, companyAddress, companyNTN) => {
  const invoiceNo = currentOrderNo || "N/A";
  const dateTime = new Date().toLocaleString();

  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${invoiceNo}&scale=3&includetext`;

  const subtotal = orderList.reduce((s, i) => s + i.total, 0);
  const tax = 0;
  const discount = 0;
  const grandTotal = subtotal + tax - discount;
  const cash = grandTotal;
  const change = 0;

  const itemsHTML = orderList
    .map(
      (item, index) => `
        <tr>
          <td style="width:5%; text-align:center;">${index + 1}</td>
          <td style="width:45%; word-wrap: break-word;">${item.name}</td>
          <td style="width:15%; text-align:center;">${item.quantity}</td>
          <td style="width:15%; text-align:right;">${item.price.toFixed(2)}</td>
          <td style="width:20%; text-align:right;">${item.total.toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  // Conditional fields HTML
  const companyAddressHTML = companyAddress
    ? `<div class="center small-text">${companyAddress}</div>`
    : "";
  const companyNTNHTML = companyNTN ? `<div class="left small-text">NTN: ${companyNTN}</div>` : "";
  const customerPhoneHTML = customerPhone
    ? `<div class="left small-text">Phone: ${customerPhone}</div>`
    : "";
  const cashierEmailHTML = cashierEmail
    ? `<div class="left small-text">Email: ${cashierEmail}</div>`
    : "";

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
    <div class="small-text">Customer: ${customerName || ""}</div>
    ${customerPhone ? `<div class="small-text">Phone: ${customerPhone}</div>` : ""}
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
    const config = await getQRConfig();
    const companyLogoBase64 = config?.company_logo || null;
    const companyAddress = config?.company_address || null;
    const companyNTN = config?.company_ntn_number || null;

    await Print.printAsync({
      html: generateInvoiceHTML(companyLogoBase64,companyAddress,companyNTN),
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


  const handleSubmitOrder = async () => {
    if (!orderList.length) {
      Alert.alert("Error", "No items in the order list.");
      return;
    }

    try {
      if (bookingId) {
        const existingOrderNo = await getOrderNoByBookingId(bookingId); // create this DB function
        setCurrentOrderNo(existingOrderNo);
        for (const item of orderList) {
          const existingLines = await getOrderLineByBookingAndItem(
            bookingId,
            item.id
          );

          if (existingLines.length > 0) {
            const existingLine = existingLines[0];
            const newQty = existingLine.order_qty + item.quantity;

            await updateOrderBookingLine(existingLine.line_id, {
              order_qty: newQty,
              amount: newQty * item.price,
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

        // Alert.alert("Success", "Items added to existing order!");
        Toast.show({
  type: "success",
  text1: "Success",
  text2: "Items added to existing order!",
  position: "top",
  visibilityTime: 3000,
});

setInvoiceData(orderList);
setShowInvoice(true);

// navigation.navigate("Order Details", { bookingId, customerId });

      } else {
        const orderNo = await generateNextOrderNo();
        const newBookingId = await addOrderBooking({
          order_date: new Date().toISOString(),
          customer_id: customerId,
          order_no: orderNo,
          // order_no: `ORD-${Date.now()}`,
          created_by_id: 1,
          created_date: new Date().toISOString(),
        });

        setCurrentOrderNo(orderNo);

        let totalAmount = 0;
        let totalItems = 0;

        for (const item of orderList) {
          await addOrderBookingLine({
            booking_id: newBookingId,
            item_id: item.id,
            order_qty: item.quantity,
            unit_price: item.price,
            amount: item.total,
          });
          totalAmount += item.total;
          totalItems += item.quantity;
        }

        await addRecentActivity({
          booking_id: newBookingId,
          customer_name: customerName,
          customer_Phone: customerPhone,
          item_count: totalItems,
          total_amount: totalAmount,
        });

        if (setStatsRefresh) {
          setStatsRefresh((prev) => prev + 1);
        }

        // Alert.alert("Success", "Order submitted successfully!");
        Toast.show({
  type: "success",
  text1: "Success",
  text2: "Order submitted successfully!",
  position: "top",
  visibilityTime: 3000, // duration in ms
});

setInvoiceData(orderList);
setShowInvoice(true);

// navigation.replace("All Orders", { customerId, customerName });
      }
    } catch (error) {
      console.error("Order submission error:", error);
      // Alert.alert("Error", "Failed to submit order");
      Toast.show({
  type: "error",
  text1: "Error",
  text2: "Failed to submit order",
  position: "top",
  visibilityTime: 3000,
});
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        {/* LEFT CONTENT */}
        <View style={styles.itemContent}>
          <Text
            style={styles.itemName}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>

          <Text style={styles.itemInfo}>
            Qty: {item.quantity} × Rs {item.price.toFixed(2)}
          </Text>

          <Text style={styles.amount}>
            Total: Rs {item.total.toFixed(2)}
          </Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <View style={styles.qtyBox}>
            <TouchableOpacity
              onPress={() => decreaseQty(item.id)}
              style={styles.qtyBtn}
            >
              <Minus size={16} color="#000" />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => increaseQty(item.id)}
              style={styles.qtyBtn}
            >
              <Plus size={16} color="#000" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleRemoveItem(item.id)}
          >
            <X size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);
  const totalItems = orderList.length;


  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={orderList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.customerInfo}>
              <Text style={styles.customerLabel}>Customer:</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
          }
        />

        {/* BOTTOM BAR */}
        <View style={styles.bottomBar}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Items</Text>
            <Text style={styles.totalValue}>{totalItems}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              Rs. {totalAmount.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitOrder}
          >
            <Text style={styles.submitText}>
              {bookingId ? "Add to Order" : "Submit Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

 {/* INVOICE MODAL */}
<Modal isVisible={showInvoice} style={{ margin: 20 }}>
  <SafeAreaView style={styles.invoiceContainer}>

    {/* HEADER ACTIONS */}
    <View style={styles.invoiceHeader}>
      <TouchableOpacity onPress={handlePrintInvoice}>
        <Text style={styles.printBtn}>🖨 Print</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setShowInvoice(false);
          if (bookingId) {
            navigation.navigate("Order Details", { bookingId, customerId, customerName, customerPhone });
          } else {
            navigation.replace("All Orders", { customerId, customerName, customerPhone });
          }
        }}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </View>

    {/* RECEIPT */}
    <View style={styles.receipt}>

      {/* LOGO */}
      {companyLogo ? (
        <Image
          source={{ uri: companyLogo }}
          style={styles.receiptLogo}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.centerBold}>AXON ERP</Text> // fallback
      )}

      {/* COMPANY ADDRESS */}
{companyAddress && (
  <Text style={styles.centerText}>{companyAddress}</Text>
)}

{/* COMPANY NTN */}
{companyNTN && (
  <Text style={styles.leftText}>NTN: {companyNTN}</Text>
)}

{/* CUSTOMER PHONE */}
{customerPhone && (
  <Text style={styles.leftText}>Phone: {customerPhone}</Text>
)}

{/* CASHIER EMAIL */}
{cashierEmail && (
  <Text style={styles.leftText}>Email: {cashierEmail}</Text>
)}

      <View style={styles.dashed} />

      <Text style={styles.centerBold}>SALE INVOICE</Text>

      <View style={styles.dashed} />

      {/* META */}
      {currentOrderNo && <Text>Invoice: {currentOrderNo}</Text>}
      {cashierName && <Text>Cashier: {cashierName}</Text>}
      {customerName && <Text>Customer: {customerName}</Text>}
      {customerPhone && <Text>Phone: {customerPhone}</Text>}
      <Text>Date: {new Date().toLocaleString()}</Text>

      <View style={styles.dashed} />

      {/* TABLE HEADER */}
      <View style={styles.itemHeader}>
        <Text style={{ flex: 0.6 }}>#</Text>
        <Text style={{ flex: 2 }}>Item</Text>
        <Text style={{ flex: 0.8, textAlign: "center" }}>Qty</Text>
        <Text style={{ flex: 1, textAlign: "right" }}>Rate</Text>
        <Text style={{ flex: 1, textAlign: "right" }}>Total</Text>
      </View>

      {/* ITEMS */}
      {orderList.map((item, index) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={{ flex: 0.6 }}>{index + 1}</Text>
          <Text style={{ flex: 2 }}>{item.name}</Text>
          <Text style={{ flex: 0.8, textAlign: "center" }}>{item.quantity}</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>{item.price.toFixed(2)}</Text>
          <Text style={{ flex: 1, textAlign: "right" }}>{item.total.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.dashed} />

      {/* TOTALS */}
      <View style={styles.rowBetween}>
        <Text>Subtotal</Text>
        <Text>{totalAmount.toFixed(2)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text>Total Taxes</Text>
        <Text>0.00</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text>Discount</Text>
        <Text>0.00</Text>
      </View>
      <View style={styles.rowBetweenBold}>
        <Text>TOTAL AMOUNT</Text>
        <Text>{totalAmount.toFixed(2)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text>Cash</Text>
        <Text>{totalAmount.toFixed(2)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text>Change</Text>
        <Text>0.00</Text>
      </View>

      <View style={styles.dashed} />

      {/* FOOTER */}
      <Text style={styles.centerText}>Thank You For Shopping!</Text>
      <Text style={styles.centerText}>No Return / No Exchange For Frozen</Text>
      <Text style={styles.centerText}>No Refund Without Receipt</Text>

    </View>
  </SafeAreaView>
</Modal>



    </SafeAreaView>
  );
}

/* ======================= STYLES ======================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8fa",
  },

  customerInfo: {
    flexDirection: "row",
    padding: 16,
    flexWrap: "wrap",
  },

  customerLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 6,
    color: "#555",
  },

  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2954E5",
    flexShrink: 1,
  },

  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    elevation: 2,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  itemContent: {
    flex: 1,
    paddingRight: 10,
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  itemInfo: {
    color: "#666",
    marginTop: 4,
    fontSize: 13,
  },

  amount: {
    marginTop: 4,
    fontWeight: "bold",
    color: "#007bff",
    fontSize: 14,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 6,
    marginRight: 8,
  },

  qtyBtn: {
    padding: 4,
  },

  qtyText: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 6,
    minWidth: 20,
    textAlign: "center",
  },

  deleteBtn: {
    padding: 6,
  },

  bottomBar: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 8,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },

  submitBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },

  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },



  invoiceContainer: {
  flex: 1,
  backgroundColor: "#fff",
},
invoiceHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 14,
  borderBottomWidth: 1,
  borderColor: "#e5e7eb",
  backgroundColor: "#f9fafb",
},

companyName: {
  fontSize: 18,
  fontWeight: "800",
  color: "#111827",
},

invoiceTitle: {
  fontSize: 18,
  fontWeight: "bold",
},

printBtn: {
  color: "#2563EB",
  fontWeight: "700",
},

closeIcon: {
  fontSize: 20,
  color: "#EF4444",
  fontWeight: "700",
},


receipt: {
  padding: 12,
  backgroundColor: "#fff",
  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
},

receiptLogo: {
  width: 220,
  height: 50,
  alignSelf: "center",
  marginBottom: 6,
},

centerText: {
  textAlign: "center",
  fontSize: 12,
},
leftText: {
  textAlign: "left",
  fontSize: 12,
},

centerBold: {
  textAlign: "center",
  fontSize: 14,
  fontWeight: "bold",
},

dashed: {
  borderTopWidth: 1,
  borderStyle: "dashed",
  borderColor: "#000",
  marginVertical: 8,
},

itemHeader: {
  flexDirection: "row",
  borderBottomWidth: 1,
  borderColor: "#000",
  paddingBottom: 4,
  marginBottom: 4,
  fontWeight: "bold",
},

itemRow: {
  flexDirection: "row",
  paddingVertical: 2,
},

rowBetween: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: 2,
},

rowBetweenBold: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: 4,
  fontWeight: "bold",
},

barcode: {
  textAlign: "center",
  letterSpacing: 2,
  marginTop: 8,
},
});





// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   Platform,
//   KeyboardAvoidingView,
//   Image,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Modal from "react-native-modal";
// import * as Print from "expo-print";

// import {
//   addOrderBooking,
//   addOrderBookingLine,
//   getOrderLineByBookingAndItem,
//   updateOrderBookingLine,
//   addRecentActivity,
//   generateNextOrderNo,
//   getQRConfig,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";
// import Toast from "react-native-toast-message";

// export default function OrderListScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const customerPhone = route.params.customerPhone;
//   const bookingId = route.params.bookingId || null;
//   const initialList = route.params.orderList || [];
//   const setStatsRefresh = route.params?.setStatsRefresh || null;

//   const [cashierName, setCashierName] = useState("N/A");
// const [cashierEmail, setCashierEmail] = useState("N/A");


//   const [showInvoice, setShowInvoice] = useState(false);
// const [invoiceData, setInvoiceData] = useState(null);

// const [currentOrderNo, setCurrentOrderNo] = useState(""); // store invoice/order number

// const [companyLogo, setCompanyLogo] = useState(null);
// const [companyAddress, setCompanyAddress] = useState(null);
// const [companyNTN, setCompanyNTN] = useState(null);



//   const [orderList, setOrderList] = useState(
//     Array.isArray(initialList) ? initialList.filter(Boolean) : []
//   );

//   const handleRemoveItem = (itemId) => {
//     setOrderList((prev) => prev.filter((item) => item.id !== itemId));
//   };

//   const increaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev.map((item) =>
//         item.id === itemId
//           ? {
//               ...item,
//               quantity: item.quantity + 1,
//               total: (item.quantity + 1) * item.price,
//             }
//           : item
//       )
//     );
//   };

//   const decreaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev
//         .map((item) =>
//           item.id === itemId && item.quantity > 1
//             ? {
//                 ...item,
//                 quantity: item.quantity - 1,
//                 total: (item.quantity - 1) * item.price,
//               }
//             : item
//         )
//         .filter((item) => item.quantity > 0)
//     );
//   };

// //  useEffect(() => {
// //   const loadConfig = async () => {
// //     const config = await getQRConfig();
// //     if (config) {
// //       setCashierName(config.name || "N/A");
// //       setCashierEmail(config.email || "N/A");
// //     }
// //   };

// //   loadConfig();
// // }, []);

// useEffect(() => {
//   const loadConfig = async () => {
//     const config = await getQRConfig();
//     if (config) {
//       // Cashier info
//       setCashierName(config.name || "N/A");
//       setCashierEmail(config.email || "N/A");

//       // ✅ Company logo (base64)
//       if (config.company_logo) {
//         setCompanyLogo(`data:image/png;base64,${config.company_logo}`);
//       }

//       // ✅ Company address
//       setCompanyAddress(config.company_address || "N/A");

//       // ✅ Company NTN number
//       setCompanyNTN(config.company_ntn_number || "N/A");
//     }
//   };

//   loadConfig();
// }, []);


// const generateInvoiceHTML = (companyLogoBase64, companyAddress, companyNTN) => {
//   const invoiceNo = currentOrderNo || "N/A";
//   const dateTime = new Date().toLocaleString();

//   const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${invoiceNo}&scale=3&includetext`;

//   const subtotal = orderList.reduce((s, i) => s + i.total, 0);
//   const tax = 0;
//   const discount = 0;
//   const grandTotal = subtotal + tax - discount;
//   const cash = grandTotal;
//   const change = 0;

//   const itemsHTML = orderList
//     .map(
//       (item, index) => `
//         <tr>
//           <td style="width:5%; text-align:center;">${index + 1}</td>
//           <td style="width:45%; word-wrap: break-word;">${item.name}</td>
//           <td style="width:15%; text-align:center;">${item.quantity}</td>
//           <td style="width:15%; text-align:right;">${item.price.toFixed(2)}</td>
//           <td style="width:20%; text-align:right;">${item.total.toFixed(2)}</td>
//         </tr>
//       `
//     )
//     .join("");

//   // Conditional fields HTML
//   const companyAddressHTML = companyAddress
//     ? `<div class="center small-text">${companyAddress}</div>`
//     : "";
//   const companyNTNHTML = companyNTN ? `<div class="left small-text">NTN: ${companyNTN}</div>` : "";
//   const customerPhoneHTML = customerPhone
//     ? `<div class="left small-text">Phone: ${customerPhone}</div>`
//     : "";
//   const cashierEmailHTML = cashierEmail
//     ? `<div class="left small-text">Email: ${cashierEmail}</div>`
//     : "";

//   return `
//   <html>
//   <head>
//     <meta charset="utf-8" />
//     <style>
//       @media print {
//         body { width: 58mm; margin: 0; padding: 4px; font-family: monospace; font-size: 12px; }
//       }
//       body { width: 58mm; margin: 0; padding: 4px; font-family: monospace; font-size: 12px; }
//       .left { text-align: left; }
//       .center { text-align: center; }
//       .right { text-align: right; }
//       .bold { font-weight: bold; }
//       hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
//       table { width: 100%; border-collapse: collapse; font-size: 11px; }
//       th, td { padding: 2px 0; word-wrap: break-word; }
//       th { border-bottom: 1px dashed #000; font-weight: bold; font-size: 12px; }
//       .totals td { padding: 2px 0; }
//       .barcode { margin-top: 6px; text-align: center; font-size: 10px; letter-spacing: 2px; word-break: break-all; }
//       .small-text { font-size: 10px; }
//       .medium-text { font-size: 12px; }
//       .large-text { font-size: 38px; font-weight: bold; }
//       .nowrap { white-space: nowrap; }
//       .wrap { word-wrap: break-word; }
//     </style>
//   </head>

//   <body>
//     <!-- LOGO -->
//     <div class="center">
//       ${
//         companyLogoBase64
//           ? `<img src="data:image/png;base64,${companyLogoBase64}" width="130" height="40" />`
//           : `<div class="bold">AXON ERP</div>`
//       }
//     </div>

//     ${companyAddressHTML}
//     ${companyNTNHTML}
//     ${customerPhoneHTML}
//     ${cashierEmailHTML}

//     <hr/>

//     <div class="center bold medium-text">SALE INVOICE</div>
//     <hr/>

//     <div class="small-text">Invoice: ${invoiceNo}</div>
//     <div class="small-text">Cashier: ${cashierName || ""}</div>
//     <div class="small-text">Customer: ${customerName || ""}</div>
//     ${customerPhone ? `<div class="small-text">Phone: ${customerPhone}</div>` : ""}
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
//       <tr><td>Subtotal</td><td class="right">${subtotal.toFixed(2)}</td></tr>
//       <tr><td>Total Taxes</td><td class="right">${tax.toFixed(2)}</td></tr>
//       <tr><td>Discount</td><td class="right">${discount.toFixed(2)}</td></tr>
//       <tr><td class="bold">TOTAL AMOUNT</td><td class="right bold">${grandTotal.toFixed(2)}</td></tr>
//       <tr><td>Cash</td><td class="right">${cash.toFixed(2)}</td></tr>
//       <tr><td>Change</td><td class="right">${change.toFixed(2)}</td></tr>
//     </table>

//     <hr/>
//     <div class="center small-text">Thank You For Shopping!</div>
//     <div class="center small-text">No Return / No Exchange For Frozen</div>
//     <div class="center small-text">No Refund Without Receipt</div>
//     <hr/>
//     <div class="barcode">
//       <img src="${barcodeUrl}" width="200" height="60" />
//     </div>
//   </body>
//   </html>
//   `;
// };

// const handlePrintInvoice = async () => {
//   try {
//     const config = await getQRConfig();
//     const companyLogoBase64 = config?.company_logo || null;
//     const companyAddress = config?.company_address || null;
//     const companyNTN = config?.company_ntn_number || null;

//     await Print.printAsync({
//       html: generateInvoiceHTML(companyLogoBase64,companyAddress,companyNTN),
//     });
//   } catch (error) {
//     console.error("Print error:", error);
//     Alert.alert("Print Error", "Unable to print invoice");
//   }
// };



// // const handlePrintInvoice = async () => {
// //   try {
// //     await Print.printAsync({
// //       html: generateInvoiceHTML(),
// //     });
// //   } catch (error) {
// //     console.error("Print error:", error);
// //     Alert.alert("Print Error", "Unable to print invoice");
// //   }
// // };


//   const handleSubmitOrder = async () => {
//     if (!orderList.length) {
//       Alert.alert("Error", "No items in the order list.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         const existingOrderNo = await getOrderNoByBookingId(bookingId); // create this DB function
//         setCurrentOrderNo(existingOrderNo);
//         for (const item of orderList) {
//           const existingLines = await getOrderLineByBookingAndItem(
//             bookingId,
//             item.id
//           );

//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             const newQty = existingLine.order_qty + item.quantity;

//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: newQty,
//               amount: newQty * item.price,
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

//         // Alert.alert("Success", "Items added to existing order!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Items added to existing order!",
//   position: "top",
//   visibilityTime: 3000,
// });

// setInvoiceData(orderList);
// setShowInvoice(true);

// // navigation.navigate("Order Details", { bookingId, customerId });

//       } else {
//         const orderNo = await generateNextOrderNo();
//         const newBookingId = await addOrderBooking({
//           order_date: new Date().toISOString(),
//           customer_id: customerId,
//           order_no: orderNo,
//           // order_no: `ORD-${Date.now()}`,
//           created_by_id: 1,
//           created_date: new Date().toISOString(),
//         });

//         setCurrentOrderNo(orderNo);

//         let totalAmount = 0;
//         let totalItems = 0;

//         for (const item of orderList) {
//           await addOrderBookingLine({
//             booking_id: newBookingId,
//             item_id: item.id,
//             order_qty: item.quantity,
//             unit_price: item.price,
//             amount: item.total,
//           });
//           totalAmount += item.total;
//           totalItems += item.quantity;
//         }

//         await addRecentActivity({
//           booking_id: newBookingId,
//           customer_name: customerName,
//           customer_Phone: customerPhone,
//           item_count: totalItems,
//           total_amount: totalAmount,
//         });

//         if (setStatsRefresh) {
//           setStatsRefresh((prev) => prev + 1);
//         }

//         // Alert.alert("Success", "Order submitted successfully!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Order submitted successfully!",
//   position: "top",
//   visibilityTime: 3000, // duration in ms
// });

// setInvoiceData(orderList);
// setShowInvoice(true);

// // navigation.replace("All Orders", { customerId, customerName });
//       }
//     } catch (error) {
//       console.error("Order submission error:", error);
//       // Alert.alert("Error", "Failed to submit order");
//       Toast.show({
//   type: "error",
//   text1: "Error",
//   text2: "Failed to submit order",
//   position: "top",
//   visibilityTime: 3000,
// });
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemCard}>
//       <View style={styles.itemRow}>
//         {/* LEFT CONTENT */}
//         <View style={styles.itemContent}>
//           <Text
//             style={styles.itemName}
//             numberOfLines={2}
//             ellipsizeMode="tail"
//           >
//             {item.name}
//           </Text>

//           <Text style={styles.itemInfo}>
//             Qty: {item.quantity} × Rs {item.price.toFixed(2)}
//           </Text>

//           <Text style={styles.amount}>
//             Total: Rs {item.total.toFixed(2)}
//           </Text>
//         </View>

//         {/* ACTIONS */}
//         <View style={styles.actions}>
//           <View style={styles.qtyBox}>
//             <TouchableOpacity
//               onPress={() => decreaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Minus size={16} color="#000" />
//             </TouchableOpacity>

//             <Text style={styles.qtyText}>{item.quantity}</Text>

//             <TouchableOpacity
//               onPress={() => increaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Plus size={16} color="#000" />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             style={styles.deleteBtn}
//             onPress={() => handleRemoveItem(item.id)}
//           >
//             <X size={22} color="#EF4444" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);
//   const totalItems = orderList.length;


//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         <FlatList
//           data={orderList}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderItem}
//           contentContainerStyle={{ paddingBottom: 140 }}
//           showsVerticalScrollIndicator={false}
//           ListHeaderComponent={
//             <View style={styles.customerInfo}>
//               <Text style={styles.customerLabel}>Customer:</Text>
//               <Text style={styles.customerName}>{customerName}</Text>
//             </View>
//           }
//         />

//         {/* BOTTOM BAR */}
//         <View style={styles.bottomBar}>
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Items</Text>
//             <Text style={styles.totalValue}>{totalItems}</Text>
//           </View>

//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Amount</Text>
//             <Text style={styles.totalValue}>
//               Rs. {totalAmount.toFixed(2)}
//             </Text>
//           </View>

//           <TouchableOpacity
//             style={styles.submitBtn}
//             onPress={handleSubmitOrder}
//           >
//             <Text style={styles.submitText}>
//               {bookingId ? "Add to Order" : "Submit Order"}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//  {/* INVOICE MODAL */}
// <Modal isVisible={showInvoice} style={{ margin: 20 }}>
//   <SafeAreaView style={styles.invoiceContainer}>

//     {/* HEADER ACTIONS */}
//     <View style={styles.invoiceHeader}>
//       <TouchableOpacity onPress={handlePrintInvoice}>
//         <Text style={styles.printBtn}>🖨 Print</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPress={() => {
//           setShowInvoice(false);
//           if (bookingId) {
//             navigation.navigate("Order Details", { bookingId, customerId, customerName, customerPhone });
//           } else {
//             navigation.replace("All Orders", { customerId, customerName, customerPhone });
//           }
//         }}
//       >
//         <Text style={styles.closeIcon}>✕</Text>
//       </TouchableOpacity>
//     </View>

//     {/* RECEIPT */}
//     <View style={styles.receipt}>

//       {/* LOGO */}
//       {companyLogo ? (
//         <Image
//           source={{ uri: companyLogo }}
//           style={styles.receiptLogo}
//           resizeMode="contain"
//         />
//       ) : (
//         <Text style={styles.centerBold}>AXON ERP</Text> // fallback
//       )}

//       {/* COMPANY ADDRESS */}
// {companyAddress && (
//   <Text style={styles.centerText}>{companyAddress}</Text>
// )}

// {/* COMPANY NTN */}
// {companyNTN && (
//   <Text style={styles.leftText}>NTN: {companyNTN}</Text>
// )}

// {/* CUSTOMER PHONE */}
// {customerPhone && (
//   <Text style={styles.leftText}>Phone: {customerPhone}</Text>
// )}

// {/* CASHIER EMAIL */}
// {cashierEmail && (
//   <Text style={styles.leftText}>Email: {cashierEmail}</Text>
// )}

//       <View style={styles.dashed} />

//       <Text style={styles.centerBold}>SALE INVOICE</Text>

//       <View style={styles.dashed} />

//       {/* META */}
//       {currentOrderNo && <Text>Invoice: {currentOrderNo}</Text>}
//       {cashierName && <Text>Cashier: {cashierName}</Text>}
//       {customerName && <Text>Customer: {customerName}</Text>}
//       {customerPhone && <Text>Phone: {customerPhone}</Text>}
//       <Text>Date: {new Date().toLocaleString()}</Text>

//       <View style={styles.dashed} />

//       {/* TABLE HEADER */}
//       <View style={styles.itemHeader}>
//         <Text style={{ flex: 0.6 }}>#</Text>
//         <Text style={{ flex: 2 }}>Item</Text>
//         <Text style={{ flex: 0.8, textAlign: "center" }}>Qty</Text>
//         <Text style={{ flex: 1, textAlign: "right" }}>Rate</Text>
//         <Text style={{ flex: 1, textAlign: "right" }}>Total</Text>
//       </View>

//       {/* ITEMS */}
//       {orderList.map((item, index) => (
//         <View key={item.id} style={styles.itemRow}>
//           <Text style={{ flex: 0.6 }}>{index + 1}</Text>
//           <Text style={{ flex: 2 }}>{item.name}</Text>
//           <Text style={{ flex: 0.8, textAlign: "center" }}>{item.quantity}</Text>
//           <Text style={{ flex: 1, textAlign: "right" }}>{item.price.toFixed(2)}</Text>
//           <Text style={{ flex: 1, textAlign: "right" }}>{item.total.toFixed(2)}</Text>
//         </View>
//       ))}

//       <View style={styles.dashed} />

//       {/* TOTALS */}
//       <View style={styles.rowBetween}>
//         <Text>Subtotal</Text>
//         <Text>{totalAmount.toFixed(2)}</Text>
//       </View>
//       <View style={styles.rowBetween}>
//         <Text>Total Taxes</Text>
//         <Text>0.00</Text>
//       </View>
//       <View style={styles.rowBetween}>
//         <Text>Discount</Text>
//         <Text>0.00</Text>
//       </View>
//       <View style={styles.rowBetweenBold}>
//         <Text>TOTAL AMOUNT</Text>
//         <Text>{totalAmount.toFixed(2)}</Text>
//       </View>
//       <View style={styles.rowBetween}>
//         <Text>Cash</Text>
//         <Text>{totalAmount.toFixed(2)}</Text>
//       </View>
//       <View style={styles.rowBetween}>
//         <Text>Change</Text>
//         <Text>0.00</Text>
//       </View>

//       <View style={styles.dashed} />

//       {/* FOOTER */}
//       <Text style={styles.centerText}>Thank You For Shopping!</Text>
//       <Text style={styles.centerText}>No Return / No Exchange For Frozen</Text>
//       <Text style={styles.centerText}>No Refund Without Receipt</Text>

//     </View>
//   </SafeAreaView>
// </Modal>



//     </SafeAreaView>
//   );
// }

// /* ======================= STYLES ======================= */

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#f7f8fa",
//   },

//   customerInfo: {
//     flexDirection: "row",
//     padding: 16,
//     flexWrap: "wrap",
//   },

//   customerLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//     marginRight: 6,
//     color: "#555",
//   },

//   customerName: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#2954E5",
//     flexShrink: 1,
//   },

//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     marginHorizontal: 16,
//     marginBottom: 10,
//     elevation: 2,
//   },

//   itemRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//   },

//   itemContent: {
//     flex: 1,
//     paddingRight: 10,
//   },

//   itemName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//   },

//   itemInfo: {
//     color: "#666",
//     marginTop: 4,
//     fontSize: 13,
//   },

//   amount: {
//     marginTop: 4,
//     fontWeight: "bold",
//     color: "#007bff",
//     fontSize: 14,
//   },

//   actions: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexShrink: 0,
//   },

//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     marginRight: 8,
//   },

//   qtyBtn: {
//     padding: 4,
//   },

//   qtyText: {
//     fontSize: 14,
//     fontWeight: "600",
//     marginHorizontal: 6,
//     minWidth: 20,
//     textAlign: "center",
//   },

//   deleteBtn: {
//     padding: 6,
//   },

//   bottomBar: {
//     position: "absolute",
//     left: 10,
//     right: 10,
//     bottom: 8,
//     backgroundColor: "#fff",
//     padding: 14,
//     borderRadius: 12,
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//   },

//   totalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },

//   totalLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//   },

//   totalValue: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#10B981",
//   },

//   submitBtn: {
//     backgroundColor: "#10B981",
//     padding: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 6,
//   },

//   submitText: {
//     color: "#fff",
//     fontWeight: "bold",
//     fontSize: 16,
//   },



//   invoiceContainer: {
//   flex: 1,
//   backgroundColor: "#fff",
// },
// invoiceHeader: {
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
//   padding: 14,
//   borderBottomWidth: 1,
//   borderColor: "#e5e7eb",
//   backgroundColor: "#f9fafb",
// },

// companyName: {
//   fontSize: 18,
//   fontWeight: "800",
//   color: "#111827",
// },

// invoiceTitle: {
//   fontSize: 18,
//   fontWeight: "bold",
// },

// printBtn: {
//   color: "#2563EB",
//   fontWeight: "700",
// },

// closeIcon: {
//   fontSize: 20,
//   color: "#EF4444",
//   fontWeight: "700",
// },


// receipt: {
//   padding: 12,
//   backgroundColor: "#fff",
//   fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
// },

// receiptLogo: {
//   width: 220,
//   height: 50,
//   alignSelf: "center",
//   marginBottom: 6,
// },

// centerText: {
//   textAlign: "center",
//   fontSize: 12,
// },
// leftText: {
//   textAlign: "left",
//   fontSize: 12,
// },

// centerBold: {
//   textAlign: "center",
//   fontSize: 14,
//   fontWeight: "bold",
// },

// dashed: {
//   borderTopWidth: 1,
//   borderStyle: "dashed",
//   borderColor: "#000",
//   marginVertical: 8,
// },

// itemHeader: {
//   flexDirection: "row",
//   borderBottomWidth: 1,
//   borderColor: "#000",
//   paddingBottom: 4,
//   marginBottom: 4,
//   fontWeight: "bold",
// },

// itemRow: {
//   flexDirection: "row",
//   paddingVertical: 2,
// },

// rowBetween: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   marginVertical: 2,
// },

// rowBetweenBold: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   marginVertical: 4,
//   fontWeight: "bold",
// },

// barcode: {
//   textAlign: "center",
//   letterSpacing: 2,
//   marginTop: 8,
// },
// });




// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   Platform,
//   KeyboardAvoidingView,
//   Image,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Modal from "react-native-modal";
// import * as Print from "expo-print";

// import {
//   addOrderBooking,
//   addOrderBookingLine,
//   getOrderLineByBookingAndItem,
//   updateOrderBookingLine,
//   addRecentActivity,
//   generateNextOrderNo ,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";
// import Toast from "react-native-toast-message";

// export default function OrderListScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;
//   const initialList = route.params.orderList || [];
//   const setStatsRefresh = route.params?.setStatsRefresh || null;

//   const [showInvoice, setShowInvoice] = useState(false);
// const [invoiceData, setInvoiceData] = useState(null);


//   const [orderList, setOrderList] = useState(
//     Array.isArray(initialList) ? initialList.filter(Boolean) : []
//   );

//   const handleRemoveItem = (itemId) => {
//     setOrderList((prev) => prev.filter((item) => item.id !== itemId));
//   };

//   const increaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev.map((item) =>
//         item.id === itemId
//           ? {
//               ...item,
//               quantity: item.quantity + 1,
//               total: (item.quantity + 1) * item.price,
//             }
//           : item
//       )
//     );
//   };

//   const decreaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev
//         .map((item) =>
//           item.id === itemId && item.quantity > 1
//             ? {
//                 ...item,
//                 quantity: item.quantity - 1,
//                 total: (item.quantity - 1) * item.price,
//               }
//             : item
//         )
//         .filter((item) => item.quantity > 0)
//     );
//   };


// const generateInvoiceHTML = () => {
//   const rows = orderList
//     .map(
//       (item, i) => `
//       <tr>
//         <td style="padding:2px 0;">${i + 1}</td>
//         <td style="padding:2px 0;">${item.name}</td>
//         <td style="padding:2px 0; text-align:center;">${item.quantity}</td>
//         <td style="padding:2px 0; text-align:right;">${item.price.toFixed(2)}</td>
//         <td style="padding:2px 0; text-align:right;">${item.total.toFixed(2)}</td>
//       </tr>
//     `
//     )
//     .join("");

//   return `
//   <html>
//     <head>
//       <style>
//         /* Use monospace for thermal printers */
//         body { font-family: monospace; font-size: 12px; margin: 0; padding: 4px; width: 58mm; }
//         .logo { display: block; margin: 0 auto; width: 40mm; height: auto; }
//         h2 { text-align: center; font-size: 14px; margin: 0 0 4px 0; }
//         p { margin: 2px 0; font-size: 12px; }
//         table { width: 100%; border-collapse: collapse; margin-top: 4px; }
//         th, td { font-size: 12px; padding: 2px 0; }
//         th { text-align: left; }
//         hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
//         .total { text-align: right; font-weight: bold; margin-top: 4px; }
//         .thank-you { text-align: center; font-size: 12px; margin-top: 6px; }
//       </style>
//     </head>
//     <body>
//       <h2>Axon ERP</h2>
//       <p>Customer: ${customerName}</p>
//       <p>Date: ${new Date().toLocaleString()}</p>
//       <hr />

//       <table>
//         <thead>
//           <tr>
//             <th>#</th>
//             <th>Item</th>
//             <th style="text-align:center;">Qty</th>
//             <th style="text-align:right;">Rate</th>
//             <th style="text-align:right;">Total</th>
//           </tr>
//         </thead>
//         <tbody>${rows}</tbody>
//       </table>

//       <hr />
//       <p class="total">Grand Total: Rs ${totalAmount.toFixed(2)}</p>
//       <p class="thank-you">Thank you for choosing Axon ERP</p>
//     </body>
//   </html>
//   `;
// };


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


//   const handleSubmitOrder = async () => {
//     if (!orderList.length) {
//       Alert.alert("Error", "No items in the order list.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of orderList) {
//           const existingLines = await getOrderLineByBookingAndItem(
//             bookingId,
//             item.id
//           );

//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             const newQty = existingLine.order_qty + item.quantity;

//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: newQty,
//               amount: newQty * item.price,
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

//         // Alert.alert("Success", "Items added to existing order!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Items added to existing order!",
//   position: "top",
//   visibilityTime: 3000,
// });

// setInvoiceData(orderList);
// setShowInvoice(true);

// // navigation.navigate("Order Details", { bookingId, customerId });

//       } else {
//         const orderNo = await generateNextOrderNo();
//         const newBookingId = await addOrderBooking({
//           order_date: new Date().toISOString(),
//           customer_id: customerId,
//           order_no: orderNo,
//           // order_no: `ORD-${Date.now()}`,
//           created_by_id: 1,
//           created_date: new Date().toISOString(),
//         });

//         let totalAmount = 0;
//         let totalItems = 0;

//         for (const item of orderList) {
//           await addOrderBookingLine({
//             booking_id: newBookingId,
//             item_id: item.id,
//             order_qty: item.quantity,
//             unit_price: item.price,
//             amount: item.total,
//           });
//           totalAmount += item.total;
//           totalItems += item.quantity;
//         }

//         await addRecentActivity({
//           booking_id: newBookingId,
//           customer_name: customerName,
//           item_count: totalItems,
//           total_amount: totalAmount,
//         });

//         if (setStatsRefresh) {
//           setStatsRefresh((prev) => prev + 1);
//         }

//         // Alert.alert("Success", "Order submitted successfully!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Order submitted successfully!",
//   position: "top",
//   visibilityTime: 3000, // duration in ms
// });

// setInvoiceData(orderList);
// setShowInvoice(true);

// // navigation.replace("All Orders", { customerId, customerName });
//       }
//     } catch (error) {
//       console.error("Order submission error:", error);
//       // Alert.alert("Error", "Failed to submit order");
//       Toast.show({
//   type: "error",
//   text1: "Error",
//   text2: "Failed to submit order",
//   position: "top",
//   visibilityTime: 3000,
// });
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemCard}>
//       <View style={styles.itemRow}>
//         {/* LEFT CONTENT */}
//         <View style={styles.itemContent}>
//           <Text
//             style={styles.itemName}
//             numberOfLines={2}
//             ellipsizeMode="tail"
//           >
//             {item.name}
//           </Text>

//           <Text style={styles.itemInfo}>
//             Qty: {item.quantity} × Rs {item.price.toFixed(2)}
//           </Text>

//           <Text style={styles.amount}>
//             Total: Rs {item.total.toFixed(2)}
//           </Text>
//         </View>

//         {/* ACTIONS */}
//         <View style={styles.actions}>
//           <View style={styles.qtyBox}>
//             <TouchableOpacity
//               onPress={() => decreaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Minus size={16} color="#000" />
//             </TouchableOpacity>

//             <Text style={styles.qtyText}>{item.quantity}</Text>

//             <TouchableOpacity
//               onPress={() => increaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Plus size={16} color="#000" />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             style={styles.deleteBtn}
//             onPress={() => handleRemoveItem(item.id)}
//           >
//             <X size={22} color="#EF4444" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);
//   const totalItems = orderList.length;


//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         <FlatList
//           data={orderList}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderItem}
//           contentContainerStyle={{ paddingBottom: 140 }}
//           showsVerticalScrollIndicator={false}
//           ListHeaderComponent={
//             <View style={styles.customerInfo}>
//               <Text style={styles.customerLabel}>Customer:</Text>
//               <Text style={styles.customerName}>{customerName}</Text>
//             </View>
//           }
//         />

//         {/* BOTTOM BAR */}
//         <View style={styles.bottomBar}>
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Items</Text>
//             <Text style={styles.totalValue}>{totalItems}</Text>
//           </View>

//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Amount</Text>
//             <Text style={styles.totalValue}>
//               Rs. {totalAmount.toFixed(2)}
//             </Text>
//           </View>

//           <TouchableOpacity
//             style={styles.submitBtn}
//             onPress={handleSubmitOrder}
//           >
//             <Text style={styles.submitText}>
//               {bookingId ? "Add to Order" : "Submit Order"}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>

//       {/* INVOICE MODAL */}

//       <Modal isVisible={showInvoice} style={{ margin: 0 }}>
//   <SafeAreaView style={styles.invoiceContainer}>
    
//     {/* HEADER */}
//    {/* HEADER */}
// <View style={styles.invoiceHeader}>
//   <TouchableOpacity onPress={handlePrintInvoice}>
//     <Text style={styles.printBtn}>🖨 Print</Text>
//   </TouchableOpacity>

//   {/* <Text style={styles.companyName}>Axon ERP</Text> */}
//    {/* LOGO */}
//       <Image
//         source={require('../assets/Axon ERP.png')} // Path to your logo in assets
//         style={styles.logo}
//         resizeMode="contain"
//       />

//   <TouchableOpacity
//     onPress={() => {
//       setShowInvoice(false);
//       if (bookingId) {
//         navigation.navigate("Order Details", { bookingId, customerId });
//       } else {
//         navigation.replace("All Orders", { customerId, customerName });
//       }
//     }}
//   >
//     <Text style={styles.closeIcon}>✕</Text>
//   </TouchableOpacity>
// </View>

// <View style={styles.invoiceMeta}>
//   <View style={styles.metaBlock}>
//     <Text style={styles.metaLabel}>Customer</Text>
//     <Text
//       style={styles.metaValue}
//       numberOfLines={1}        // limit to 1 line
//       ellipsizeMode="tail"    // show "..." if too long
//     >
//       {customerName}
//     </Text>
//   </View>

//   <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
//     <Text style={styles.metaLabel}>Date & Time</Text>
//     <Text style={styles.metaValue}>
//       {new Date().toLocaleString()}
//     </Text>
//   </View>
// </View>



// <View style={styles.tableHeader}>
//   <Text style={{ flex: 2, fontWeight: "700" }}>Item</Text>
//   <Text style={{ flex: 1, textAlign: "center", fontWeight: "700" }}>Qty</Text>
//   <Text style={{ flex: 1, textAlign: "right", fontWeight: "700" }}>Amount</Text>
// </View>


//     {/* BODY */}
//     <FlatList
//       data={orderList}
//       keyExtractor={(item) => item.id.toString()}
//      renderItem={({ item }) => (
//   <View style={styles.invoiceRow}>
//     <Text style={{ flex: 2 }}>{item.name}</Text>
//     <Text style={{ flex: 1, textAlign: "center" }}>{item.quantity}</Text>
//     <Text style={{ flex: 1, textAlign: "right" }}>
//       Rs {item.total.toFixed(2)}
//     </Text>
//   </View>
// )}

//     />

//     {/* FOOTER */}
//    <View style={styles.invoiceFooter}>
//   <View style={styles.totalBox}>
//     <Text style={styles.totalLabel}>Grand Total</Text>
//     <Text style={styles.invoiceTotal}>
//       Rs {totalAmount.toFixed(2)}
//     </Text>
//   </View>

//   <Text style={styles.thankYou}>
//     Thank you for choosing Axon ERP
//   </Text>
// </View>


//   </SafeAreaView>
// </Modal>

//     </SafeAreaView>
//   );
// }

// /* ======================= STYLES ======================= */

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#f7f8fa",
//   },

//   customerInfo: {
//     flexDirection: "row",
//     padding: 16,
//     flexWrap: "wrap",
//   },

//   customerLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//     marginRight: 6,
//     color: "#555",
//   },

//   customerName: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#2954E5",
//     flexShrink: 1,
//   },

//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     marginHorizontal: 16,
//     marginBottom: 10,
//     elevation: 2,
//   },

//   itemRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//   },

//   itemContent: {
//     flex: 1,
//     paddingRight: 10,
//   },

//   itemName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//   },

//   itemInfo: {
//     color: "#666",
//     marginTop: 4,
//     fontSize: 13,
//   },

//   amount: {
//     marginTop: 4,
//     fontWeight: "bold",
//     color: "#007bff",
//     fontSize: 14,
//   },

//   actions: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexShrink: 0,
//   },

//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     marginRight: 8,
//   },

//   qtyBtn: {
//     padding: 4,
//   },

//   qtyText: {
//     fontSize: 14,
//     fontWeight: "600",
//     marginHorizontal: 6,
//     minWidth: 20,
//     textAlign: "center",
//   },

//   deleteBtn: {
//     padding: 6,
//   },

//   bottomBar: {
//     position: "absolute",
//     left: 10,
//     right: 10,
//     bottom: 8,
//     backgroundColor: "#fff",
//     padding: 14,
//     borderRadius: 12,
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//   },

//   totalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },

//   totalLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//   },

//   totalValue: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#10B981",
//   },

//   submitBtn: {
//     backgroundColor: "#10B981",
//     padding: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 6,
//   },

//   submitText: {
//     color: "#fff",
//     fontWeight: "bold",
//     fontSize: 16,
//   },



//   invoiceContainer: {
//   flex: 1,
//   backgroundColor: "#fff",
// },
// invoiceHeader: {
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
//   padding: 14,
//   borderBottomWidth: 1,
//   borderColor: "#e5e7eb",
//   backgroundColor: "#f9fafb",
// },

// companyName: {
//   fontSize: 18,
//   fontWeight: "800",
//   color: "#111827",
// },

// invoiceTitle: {
//   fontSize: 18,
//   fontWeight: "bold",
// },

// printBtn: {
//   color: "#2563EB",
//   fontWeight: "700",
// },

// closeIcon: {
//   fontSize: 20,
//   color: "#EF4444",
//   fontWeight: "700",
// },


// invoiceMeta: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   padding: 16,
//   backgroundColor: "#fff",
// },

// metaBlock: {
//   flex: 1,           // allow block to take available space
//   flexShrink: 1,     // allow it to shrink if needed
//   marginHorizontal: 4,
// },

// metaLabel: {
//   fontSize: 12,
//   color: "#6B7280",
// },


// metaValue: {
//   fontSize: 14,
//   fontWeight: "600",
//   color: "#111827",
// },

// tableHeader: {
//   flexDirection: "row",
//   paddingHorizontal: 16,
//   paddingVertical: 10,
//   backgroundColor: "#F3F4F6",
//   borderTopWidth: 1,
//   borderBottomWidth: 1,
//   borderColor: "#E5E7EB",
// },

// invoiceRow: {
//   flexDirection: "row",
//   paddingHorizontal: 16,
//   paddingVertical: 10,
//   borderBottomWidth: 1,
//   borderColor: "#F1F5F9",
// },

// invoiceFooter: {
//   padding: 16,
//   borderTopWidth: 1,
//   borderColor: "#E5E7EB",
//   backgroundColor: "#fff",
// },

// totalBox: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   marginBottom: 8,
// },

// totalLabel: {
//   fontSize: 16,
//   fontWeight: "700",
// },

// invoiceTotal: {
//   fontSize: 18,
//   fontWeight: "800",
//   color: "#10B981",
// },

// thankYou: {
//   textAlign: "center",
//   marginTop: 10,
//   fontSize: 13,
//   color: "#6B7280",
// },
// logo: {
//   width: 100,        // adjust width according to your design
//   height: 40,        // adjust height
//   alignSelf: 'center',
// },

// });





// import React, { useState } from "react";
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
//   addOrderBooking,
//   addOrderBookingLine,
//   getOrderLineByBookingAndItem,
//   updateOrderBookingLine,
//   addRecentActivity,
//   generateNextOrderNo ,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";
// import Toast from "react-native-toast-message";

// export default function OrderListScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;
//   const initialList = route.params.orderList || [];
//   const setStatsRefresh = route.params?.setStatsRefresh || null;

//   const [orderList, setOrderList] = useState(
//     Array.isArray(initialList) ? initialList.filter(Boolean) : []
//   );

//   const handleRemoveItem = (itemId) => {
//     setOrderList((prev) => prev.filter((item) => item.id !== itemId));
//   };

//   const increaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev.map((item) =>
//         item.id === itemId
//           ? {
//               ...item,
//               quantity: item.quantity + 1,
//               total: (item.quantity + 1) * item.price,
//             }
//           : item
//       )
//     );
//   };

//   const decreaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev
//         .map((item) =>
//           item.id === itemId && item.quantity > 1
//             ? {
//                 ...item,
//                 quantity: item.quantity - 1,
//                 total: (item.quantity - 1) * item.price,
//               }
//             : item
//         )
//         .filter((item) => item.quantity > 0)
//     );
//   };

//   const handleSubmitOrder = async () => {
//     if (!orderList.length) {
//       Alert.alert("Error", "No items in the order list.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of orderList) {
//           const existingLines = await getOrderLineByBookingAndItem(
//             bookingId,
//             item.id
//           );

//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             const newQty = existingLine.order_qty + item.quantity;

//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: newQty,
//               amount: newQty * item.price,
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

//         // Alert.alert("Success", "Items added to existing order!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Items added to existing order!",
//   position: "top",
//   visibilityTime: 3000,
// });
//         navigation.navigate("Order Details", { bookingId, customerId });
//       } else {
//         const orderNo = await generateNextOrderNo();
//         const newBookingId = await addOrderBooking({
//           order_date: new Date().toISOString(),
//           customer_id: customerId,
//           order_no: orderNo,
//           // order_no: `ORD-${Date.now()}`,
//           created_by_id: 1,
//           created_date: new Date().toISOString(),
//         });

//         let totalAmount = 0;
//         let totalItems = 0;

//         for (const item of orderList) {
//           await addOrderBookingLine({
//             booking_id: newBookingId,
//             item_id: item.id,
//             order_qty: item.quantity,
//             unit_price: item.price,
//             amount: item.total,
//           });
//           totalAmount += item.total;
//           totalItems += item.quantity;
//         }

//         await addRecentActivity({
//           booking_id: newBookingId,
//           customer_name: customerName,
//           item_count: totalItems,
//           total_amount: totalAmount,
//         });

//         if (setStatsRefresh) {
//           setStatsRefresh((prev) => prev + 1);
//         }

//         // Alert.alert("Success", "Order submitted successfully!");
//         Toast.show({
//   type: "success",
//   text1: "Success",
//   text2: "Order submitted successfully!",
//   position: "top",
//   visibilityTime: 3000, // duration in ms
// });
//         navigation.replace("All Orders", { customerId, customerName });
//       }
//     } catch (error) {
//       console.error("Order submission error:", error);
//       // Alert.alert("Error", "Failed to submit order");
//       Toast.show({
//   type: "error",
//   text1: "Error",
//   text2: "Failed to submit order",
//   position: "top",
//   visibilityTime: 3000,
// });
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemCard}>
//       <View style={styles.itemRow}>
//         {/* LEFT CONTENT */}
//         <View style={styles.itemContent}>
//           <Text
//             style={styles.itemName}
//             numberOfLines={2}
//             ellipsizeMode="tail"
//           >
//             {item.name}
//           </Text>

//           <Text style={styles.itemInfo}>
//             Qty: {item.quantity} × Rs {item.price.toFixed(2)}
//           </Text>

//           <Text style={styles.amount}>
//             Total: Rs {item.total.toFixed(2)}
//           </Text>
//         </View>

//         {/* ACTIONS */}
//         <View style={styles.actions}>
//           <View style={styles.qtyBox}>
//             <TouchableOpacity
//               onPress={() => decreaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Minus size={16} color="#000" />
//             </TouchableOpacity>

//             <Text style={styles.qtyText}>{item.quantity}</Text>

//             <TouchableOpacity
//               onPress={() => increaseQty(item.id)}
//               style={styles.qtyBtn}
//             >
//               <Plus size={16} color="#000" />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             style={styles.deleteBtn}
//             onPress={() => handleRemoveItem(item.id)}
//           >
//             <X size={22} color="#EF4444" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);
//   const totalItems = orderList.length;

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//       >
//         <FlatList
//           data={orderList}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderItem}
//           contentContainerStyle={{ paddingBottom: 140 }}
//           showsVerticalScrollIndicator={false}
//           ListHeaderComponent={
//             <View style={styles.customerInfo}>
//               <Text style={styles.customerLabel}>Customer:</Text>
//               <Text style={styles.customerName}>{customerName}</Text>
//             </View>
//           }
//         />

//         {/* BOTTOM BAR */}
//         <View style={styles.bottomBar}>
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Items</Text>
//             <Text style={styles.totalValue}>{totalItems}</Text>
//           </View>

//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Amount</Text>
//             <Text style={styles.totalValue}>
//               Rs. {totalAmount.toFixed(2)}
//             </Text>
//           </View>

//           <TouchableOpacity
//             style={styles.submitBtn}
//             onPress={handleSubmitOrder}
//           >
//             <Text style={styles.submitText}>
//               {bookingId ? "Add to Order" : "Submit Order"}
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /* ======================= STYLES ======================= */

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: "#f7f8fa",
//   },

//   customerInfo: {
//     flexDirection: "row",
//     padding: 16,
//     flexWrap: "wrap",
//   },

//   customerLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//     marginRight: 6,
//     color: "#555",
//   },

//   customerName: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#2954E5",
//     flexShrink: 1,
//   },

//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     marginHorizontal: 16,
//     marginBottom: 10,
//     elevation: 2,
//   },

//   itemRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//   },

//   itemContent: {
//     flex: 1,
//     paddingRight: 10,
//   },

//   itemName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//   },

//   itemInfo: {
//     color: "#666",
//     marginTop: 4,
//     fontSize: 13,
//   },

//   amount: {
//     marginTop: 4,
//     fontWeight: "bold",
//     color: "#007bff",
//     fontSize: 14,
//   },

//   actions: {
//     flexDirection: "row",
//     alignItems: "center",
//     flexShrink: 0,
//   },

//   qtyBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     marginRight: 8,
//   },

//   qtyBtn: {
//     padding: 4,
//   },

//   qtyText: {
//     fontSize: 14,
//     fontWeight: "600",
//     marginHorizontal: 6,
//     minWidth: 20,
//     textAlign: "center",
//   },

//   deleteBtn: {
//     padding: 6,
//   },

//   bottomBar: {
//     position: "absolute",
//     left: 10,
//     right: 10,
//     bottom: 8,
//     backgroundColor: "#fff",
//     padding: 14,
//     borderRadius: 12,
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//   },

//   totalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 4,
//   },

//   totalLabel: {
//     fontSize: 15,
//     fontWeight: "600",
//   },

//   totalValue: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#10B981",
//   },

//   submitBtn: {
//     backgroundColor: "#10B981",
//     padding: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 6,
//   },

//   submitText: {
//     color: "#fff",
//     fontWeight: "bold",
//     fontSize: 16,
//   },
// });



// Updated 15-12-2025
// import React, { useState } from "react";
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
//   addOrderBooking,
//   addOrderBookingLine,
//   getOrderLineByBookingAndItem,
//   updateOrderBookingLine,
//   addRecentActivity,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";

// export default function OrderListScreen({ navigation, route }) {
//   const customerId = route.params.customerId;
//   const customerName = route.params.customerName || "Customer";
//   const bookingId = route.params.bookingId || null;
//   const initialList = route.params.orderList || [];
//    const setStatsRefresh = route.params?.setStatsRefresh || null;

//   const [orderList, setOrderList] = useState(
//     Array.isArray(initialList) ? initialList.filter((item) => item != null) : []
//   );

//   const handleRemoveItem = (itemId) => {
//     setOrderList((prev) => prev.filter((item) => item.id !== itemId));
//   };

//   const increaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev.map((item) =>
//         item.id === itemId
//           ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
//           : item
//       )
//     );
//   };

//   const decreaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev
//         .map((item) =>
//           item.id === itemId && item.quantity > 1
//             ? { ...item, quantity: item.quantity - 1, total: (item.quantity - 1) * item.price }
//             : item
//         )
//         .filter((item) => item.quantity > 0)
//     );
//   };

//   const handleSubmitOrder = async () => {
//     if (!orderList.length) {
//       Alert.alert("Error", "No items in the order list.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         for (const item of orderList) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             const newQty = existingLine.order_qty + item.quantity;
//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: newQty,
//               amount: newQty * item.price,
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
//         Alert.alert("Success", "Items added to existing order!");
//         navigation.navigate("Order Details", { bookingId, customerId });
//       } else {
//         const orderDate = new Date().toISOString();
//         const orderNo = `ORD-${Date.now()}`;
//         const createdBy = 1;
//         const createdDate = new Date().toISOString();

//         const newBookingId = await addOrderBooking({
//           order_date: orderDate,
//           customer_id: customerId,
//           order_no: orderNo,
//           created_by_id: createdBy,
//           created_date: createdDate,
//         });

//         let totalAmount = 0;
//         let totalItems = 0;

//         for (const item of orderList) {
//           await addOrderBookingLine({
//             booking_id: newBookingId,
//             item_id: item.id,
//             order_qty: item.quantity,
//             unit_price: item.price,
//             amount: item.total,
//           });
//           totalAmount += item.total;
//           totalItems += item.quantity;
//         }

//         await addRecentActivity({
//           booking_id: newBookingId,
//           customer_name: customerName,
//           item_count: totalItems,
//           total_amount: totalAmount,
//         });

//         Alert.alert("Success", "Order submitted successfully!");

//           // ✅ refresh UserStats instantly
//       if (setStatsRefresh) {
//         setStatsRefresh((prev) => prev + 1);
//       }
//         navigation.replace("All Orders", { customerId,customerName });
//         // navigation.navigate("MainTabs", { screen: "HomeTab" });

//         // navigation.navigate("Home");

//       }
//     } catch (error) {
//       console.error("Order submission error:", error);
//       Alert.alert("Error", "Failed to submit order");
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemCard}>
//       <View style={styles.itemRow}>
//         <View>
//           <Text style={styles.itemName}>{item.name}</Text>
//           <Text style={styles.itemInfo}>
//             Qty: {item.quantity} × Rs {item.price.toFixed(2)}
//           </Text>
//           <Text style={styles.amount}>Total: Rs {item.total.toFixed(2)}</Text>
//         </View>

 
//        <View style={styles.actions}>
//           <View style={styles.qtyBox}>
//             <TouchableOpacity onPress={() => decreaseQty(item.id)} style={styles.qtyBtn}>
//               <Minus size={16} color="#000" />
//             </TouchableOpacity>
//             <Text style={styles.qtyText}>{item.quantity}</Text>
//             <TouchableOpacity onPress={() => increaseQty(item.id)} style={styles.qtyBtn}>
//               <Plus size={16} color="#000" />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemoveItem(item.id)}>
//             <X size={22} color="#EF4444" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );

//   const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);
//   const totalItems = orderList.length;

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
//         <FlatList
//           data={orderList}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderItem}
//           contentContainerStyle={{ paddingBottom: 130 }}
//           showsVerticalScrollIndicator={false}
//           ListHeaderComponent={
//            <View style={styles.customerInfo}>
//                        <Text style={styles.customerLabel}>Customer:</Text>
//                        <Text style={styles.customerName}>{customerName}</Text>
//                      </View>
//           }
//         />

//         <View style={styles.bottomBar}>
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Items:</Text>
//             <Text style={styles.totalValue}>{totalItems}</Text>
//           </View>
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Total Amount:</Text>
//             <Text style={styles.totalValue}>Rs. {totalAmount.toFixed(2)}</Text>
//           </View>

//           <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitOrder}>
//             <Text style={styles.submitText}>{bookingId ? "Add to Order" : "Submit Order"}</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f7f8fa" },
//    customerInfo: {
//   flexDirection: "row",
//   alignItems: "flex-start",
//   justifyContent: "flex-start",
//   marginBottom: 6,
//   marginLeft: 12,
//   paddingHorizontal: 4,
//   padding: 12,
//   flexWrap: "wrap",        // 🔥 allows items to go to next line
//   width: "90%",            // 🔥 prevents overflow
// },

// customerLabel: {
//   fontSize: 15,
//   fontWeight: "600",
//   color: "#555",
//   marginRight: 6,
// },

// customerName: {
//   fontSize: 16,
//   fontWeight: "bold",
//   color: "#2954E5",
//   flexShrink: 1,           // 🔥 prevents overflow
//   flexWrap: "wrap",        // 🔥 wraps long names
// },


//   itemCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10, marginHorizontal: 16, elevation: 2 },
//   itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   itemName: { fontSize: 16, fontWeight: "600", color: "#333" },
//   itemInfo: { color: "#666", marginTop: 4 },
//   amount: { marginTop: 4, fontWeight: "bold", color: "#007bff" },

//   actions: { flexDirection: "row", alignItems: "center" },
//   qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 6, marginRight: 10 },
//   qtyBtn: { padding: 4 },
//   qtyText: { fontSize: 14, fontWeight: "600", marginHorizontal: 6 },
//   deleteBtn: { padding: 6 },

//   bottomBar: {
//     position: "absolute",
//     bottom: 0,
//     left: 10,
//     right: 10,
//     backgroundColor: "#fff",
//     padding: 12,
//     borderTopWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 10,
//   },
//   totalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
//   totalLabel: { fontWeight: "bold", fontSize: 16 },
//   totalValue: { fontWeight: "bold", fontSize: 16, color: "#10B981" },

//   submitBtn: { backgroundColor: "#10B981", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 6 },
//   submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
// });



// import React, { useState, useEffect } from "react";
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
//   addOrderBooking,
//   addOrderBookingLine,
//   getOrderLineByBookingAndItem,
//   updateOrderBookingLine,
//   addRecentActivity,
// } from "../database";
// import { X, Plus, Minus } from "lucide-react-native";

// export default function OrderListScreen({ navigation, route }) {
//   const { customerId, orderList: initialList = [], bookingId = null, customerName } =
//     route.params || {};
//   // Filter out undefined items just in case
//   const validInitialList = Array.isArray(initialList)
//     ? initialList.filter((item) => item != null)
//     : [];

//   const [orderList, setOrderList] = useState(validInitialList);

//   // Remove item
//   const handleRemoveItem = (itemId) => {
//     setOrderList((prev) => prev.filter((item) => item.id !== itemId));
//   };

//   // Increase quantity
//   const increaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev.map((item) =>
//         item.id === itemId
//           ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
//           : item
//       )
//     );
//   };

//   // Decrease quantity
//   const decreaseQty = (itemId) => {
//     setOrderList((prev) =>
//       prev
//         .map((item) =>
//           item.id === itemId && item.quantity > 1
//             ? { ...item, quantity: item.quantity - 1, total: (item.quantity - 1) * item.price }
//             : item
//         )
//         .filter((item) => item.quantity > 0)
//     );
//   };

//   // Submit or update order
//   const handleSubmitOrder = async () => {
//     if (!orderList.length) {
//       Alert.alert("Error", "No items in the order list.");
//       return;
//     }

//     try {
//       if (bookingId) {
//         // Update existing order
//         for (const item of orderList) {
//           const existingLines = await getOrderLineByBookingAndItem(bookingId, item.id);
//           if (existingLines.length > 0) {
//             const existingLine = existingLines[0];
//             const newQty = existingLine.order_qty + item.quantity;
//             await updateOrderBookingLine(existingLine.line_id, {
//               order_qty: newQty,
//               amount: newQty * item.price,
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
//         Alert.alert("Success", "Items added to existing order!");
//         navigation.navigate("Order Details", { bookingId, customerId });
//       } else {
//         // Create new order
//         const orderDate = new Date().toISOString();
//         const orderNo = `ORD-${Date.now()}`;
//         const createdBy = 1;
//         const createdDate = new Date().toISOString();

//         const newBookingId = await addOrderBooking({
//           order_date: orderDate,
//           customer_id: customerId,
//           order_no: orderNo,
//           created_by_id: createdBy,
//           created_date: createdDate,
//         });

//         let totalAmount = 0;
//         let totalItems = 0;

//         for (const item of orderList) {
//           await addOrderBookingLine({
//             booking_id: newBookingId,
//             item_id: item.id,
//             order_qty: item.quantity,
//             unit_price: item.price,
//             amount: item.total,
//           });
//           totalAmount += item.total;
//           totalItems += item.quantity;
//         }

//         // Add recent activity
//         await addRecentActivity({
//           booking_id: newBookingId,
//           customer_name: customerName || "Customer",
//           item_count: totalItems,
//           total_amount: totalAmount,
//         });

//         Alert.alert("Success", "Order submitted successfully!");
//         navigation.navigate("All Orders", { customerId });
//       }
//     } catch (error) {
//       console.error("Order submission error:", error);
//       Alert.alert("Error", "Failed to submit order");
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemRow}>
//       <View style={styles.itemInfo}>
//         <Text style={styles.itemName}>{item.name}</Text>
//         <Text style={styles.itemPrice}>Rs.{item.price}</Text>
//       </View>

//       <View style={styles.qtyContainer}>
//         <TouchableOpacity onPress={() => decreaseQty(item.id)} style={styles.qtyBtn}>
//           <Minus size={16} color="#000" />
//         </TouchableOpacity>

//         <Text style={styles.qtyText}>{item.quantity}</Text>

//         <TouchableOpacity onPress={() => increaseQty(item.id)} style={styles.qtyBtn}>
//           <Plus size={16} color="#000" />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.itemRight}>
//         <Text style={styles.itemTotal}>Rs.{item.total.toFixed(2)}</Text>
//         <TouchableOpacity style={styles.removeIcon} onPress={() => handleRemoveItem(item.id)}>
//           <X size={22} color="#EF4444" />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const totalAmount = orderList.reduce((sum, item) => sum + item.total, 0);

//   return (
//     <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
//         <View style={styles.container}>
//           <Text style={styles.title}>Your Order List:</Text>

//           {orderList.length > 0 ? (
//             <FlatList
//               data={orderList}
//               keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
//               renderItem={renderItem}
//               contentContainerStyle={{ paddingBottom: 150 }}
//               showsVerticalScrollIndicator={false}
//             />
//           ) : (
//             <Text style={styles.emptyText}>No items in your order.</Text>
//           )}

//           {orderList.length > 0 && (
//             <>
//               <View style={styles.totalRow}>
//                 <Text style={styles.totalLabel}>Total:</Text>
//                 <Text style={styles.totalValue}>Rs.{totalAmount.toFixed(2)}</Text>
//               </View>

//               <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitOrder}>
//                 <Text style={styles.submitText}>{bookingId ? "Add to Order" : "Submit Order"}</Text>
//               </TouchableOpacity>
//             </>
//           )}
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // ---------------- STYLES ----------------
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: "#f9fafb" },
//   container: { flex: 1, padding: 16 },
//   title: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "#111" },

//   itemRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     shadowOffset: { width: 0, height: 1 },
//   },

//   itemInfo: { flex: 1 },
//   itemName: { fontSize: 15, fontWeight: "bold", color: "#111" },
//   itemPrice: { fontSize: 13, color: "#555", marginTop: 2 },

//   qtyContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f0f0",
//     borderRadius: 8,
//     paddingHorizontal: 6,
//     paddingVertical: 4,
//     marginRight: 8,
//   },
//   qtyBtn: { paddingHorizontal: 6, paddingVertical: 4 },
//   qtyText: { fontSize: 14, fontWeight: "600", marginHorizontal: 6, color: "#000", width: 24, textAlign: "center" },

//   itemRight: { flexDirection: "row", alignItems: "center" },
//   itemTotal: { fontSize: 14, fontWeight: "bold", color: "#2954E5" },
//   removeIcon: { marginLeft: 10 },

//   totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, borderTopWidth: 1, borderColor: "#ddd", paddingTop: 6 },
//   totalLabel: { fontWeight: "bold", fontSize: 16, color: "#111" },
//   totalValue: { fontWeight: "bold", fontSize: 16, color: "#2954E5" },

//   submitBtn: { backgroundColor: "#10B981", padding: 16, borderRadius: 12, marginTop: 10, alignItems: "center" },
//   submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

//   emptyText: { textAlign: "center", color: "#999", fontSize: 15, marginTop: 60 },
// });