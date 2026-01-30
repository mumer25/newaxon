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
  ScrollView,
  Linking,
  PermissionsAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import * as Print from "expo-print";
import bluetoothPrinter from "../utils/bluetoothPrinter";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator } from "react-native";

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

  // Bluetooth printer modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

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

const scanBluetoothDevices = async () => {
  setIsLoadingDevices(true);
  setPrintError(null);
  try {
    const permResult = await bluetoothPrinter.requestPermissions();
    let permissionsGranted = false;
    let statuses = null;
    if (typeof permResult === "object" && permResult !== null) {
      permissionsGranted = !!permResult.allGranted;
      statuses = permResult.statuses;
    } else {
      permissionsGranted = !!permResult;
    }
    if (!permissionsGranted && statuses) {
      const scanDenied = statuses["android.permission.BLUETOOTH_SCAN"] === "never_ask_again" ||
        statuses["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      const connectDenied = statuses["android.permission.BLUETOOTH_CONNECT"] === "never_ask_again" ||
        statuses["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      if (scanDenied || connectDenied) {
        setIsLoadingDevices(false);
        Alert.alert(
          "Permissions Required",
          "Bluetooth permissions were permanently denied. Open app settings to allow Bluetooth permissions.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        setPrintError("Bluetooth permissions were permanently denied. Please open app settings to enable them.");
        return;
      }
    }
    if (!permissionsGranted) {
      setPrintError(
        "Bluetooth permissions were not granted. Please enable them in Settings > Apps > AXON-ERP > Permissions"
      );
      setIsLoadingDevices(false);
      return;
    }
    const devices = await bluetoothPrinter.getAvailableDevices();
    setAvailableDevices(devices || []);
    if (!devices || devices.length === 0) {
      setPrintError(
        "No Bluetooth devices found.\n\nMake sure:\n1. Your printer is turned ON\n2. Bluetooth is enabled on your phone\n3. Printer is paired in Bluetooth settings\n4. Try clicking Rescan"
      );
    } else {
      if (devices.length === 1) {
        setSelectedDevice(devices[0]);
        Alert.alert("Success", `Found printer: ${devices[0].name}\n\nClick Connect to continue`);
      }
    }
  } catch (error) {
    setPrintError("Failed to scan: " + (error.message || JSON.stringify(error)) + "\n\nMake sure Bluetooth permission is granted.");
  } finally {
    setIsLoadingDevices(false);
  }
};

const connectToDevice = async (device) => {
  if (!device || !device.address) {
    Alert.alert("Error", "Invalid device selected");
    return;
  }
  setIsLoadingDevices(true);
  setPrintError(null);
  try {
    await bluetoothPrinter.connectToDevice(device.address, device.name);
    setSelectedDevice(device);
    Alert.alert("Success", `Connected to ${device.name}`);
  } catch (error) {
    setPrintError("Failed to connect: " + (error.message || "Unknown error"));
    Alert.alert("Connection Failed", error.message || "Could not connect to printer");
  } finally {
    setIsLoadingDevices(false);
  }
};

const handleBluetoothPrint = async () => {
  if (!selectedDevice) {
    Alert.alert("Error", "Please select and connect to a printer first");
    return;
  }
  setIsPrinting(true);
  setPrintError(null);
  try {
    const config = await getQRConfig();
    const companyLogoBase64 = config?.company_logo || null;
    const companyAddress = config?.company_address || null;
    const companyNTN = config?.company_ntn_number || null;
    const invoiceNo = currentOrderNo || "N/A";
    const dateTime = new Date().toLocaleString();
    const subtotal = orderList.reduce((s, i) => s + i.total, 0);
    const tax = 0;
    const discount = 0;
    const grandTotal = subtotal + tax - discount;
    const cash = grandTotal;
    const change = 0;
    const barcodeText = invoiceNo;
    const receiptData = {
      header: companyLogoBase64 ? undefined : "AXON ERP",
      invoiceNo,
      dateTime,
      customerName,
      customerPhone: customerPhone || "N/A",
      cashierName,
      items: orderList.map((item) => ({
        item_name: item.name,
        order_qty: item.quantity,
        unit_price: item.price,
        amount: item.total,
      })),
      subtotal,
      tax,
      discount,
      total: grandTotal,
      footer: "Thank you for your purchase!",
      companyAddress,
      companyNTN,
      cashierEmail,
      barcodeText,
    };
    if (!bluetoothPrinter.isConnectedDevice()) {
      await bluetoothPrinter.connectToDevice(selectedDevice.address, selectedDevice.name);
    }
    await bluetoothPrinter.printReceipt(receiptData, companyLogoBase64);
    setShowPrintModal(false);
    Alert.alert("Success", "Receipt printed successfully!");
  } catch (error) {
    setPrintError("Print failed: " + error.message);
    Alert.alert("Print Error", error.message || "Failed to print receipt");
  } finally {
    setIsPrinting(false);
  }
};

const showPrintOptions = async () => {
  setShowPrintModal(true);
  await scanBluetoothDevices();
};

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
            <TouchableOpacity onPress={showPrintOptions}>
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

      {/* PRINT MODAL */}
      <Modal
  visible={showPrintModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowPrintModal(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Print Receipt</Text>
        <TouchableOpacity onPress={() => setShowPrintModal(false)}>
          <Feather name="x" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalBody}>
        <View style={styles.infoBox}>
          <Feather name="info" size={18} color="#2954E5" />
          <Text style={styles.infoText}>
            Make sure your printer is paired in Bluetooth Settings first
          </Text>
        </View>
        <View style={styles.printOption}>
          <Text style={styles.optionTitle}>🖨 Thermal Printer (Bluetooth)</Text>
          {selectedDevice ? (
            <View style={styles.connectedDevice}>
              <Feather name="check-circle" size={20} color="green" />
              <Text style={styles.connectedText}>
                Connected: {selectedDevice.name}
              </Text>
            </View>
          ) : (
            <Text style={styles.optionDesc}>
              Select a 58mm Bluetooth thermal printer
            </Text>
          )}
          {isLoadingDevices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2954E5" />
              <Text style={styles.loadingText}>Scanning devices...</Text>
            </View>
          ) : availableDevices.length > 0 ? (
            <ScrollView style={styles.deviceList}>
              {availableDevices.map((device, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.deviceItem,
                    selectedDevice?.address === device.address &&
                      styles.deviceItemSelected,
                  ]}
                  onPress={() => connectToDevice(device)}
                >
                  <Feather name="bluetooth" size={20} color="#2954E5" />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceAddress}>{device.address}</Text>
                  </View>
                  {selectedDevice?.address === device.address && (
                    <Feather name="check" size={20} color="green" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View>
              {printError ? (
                <>
                  <Text style={[styles.errorText, { textAlign: "left", fontSize: 13, lineHeight: 20 }]}> 
                    {printError}
                  </Text>
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={scanBluetoothDevices}
                  >
                    <Text style={styles.rescanBtnText}>🔄 Rescan Devices</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.errorText}>
                  No devices found
                </Text>
              )}
            </View>
          )}
          {selectedDevice && !isPrinting && (
            <TouchableOpacity
              style={styles.printActionBtn}
              onPress={handleBluetoothPrint}
            >
              <Text style={styles.printActionText}>Print via Bluetooth</Text>
            </TouchableOpacity>
          )}
          {isPrinting && (
            <View style={styles.printingContainer}>
              <ActivityIndicator size="large" color="#2954E5" />
              <Text style={styles.printingText}>Printing...</Text>
            </View>
          )}
        </View>
        <View style={styles.divider} />
      </ScrollView>
    </View>
  </View>
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
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginBottom: 6,
    marginLeft: 12,
    paddingHorizontal: 4,
    padding: 12,
    flexWrap: "wrap",        // 🔥 allows items to go to next line
    width: "90%",            // 🔥 prevents overflow
  },

  customerLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
    marginRight: 6,
  },

  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2954E5",
    flexShrink: 1,           // 🔥 prevents overflow
    flexWrap: "wrap",        // 🔥 wraps long names
  },

  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    elevation: 2,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  itemInfo: {
    color: "#666",
    marginTop: 4,
  },

  amount: {
    marginTop: 4,
    fontWeight: "bold",
    color: "#007bff",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 6,
    marginRight: 10,
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
    bottom: 0,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 6,
  },
  totalLabel: {
    fontWeight: "bold",
    fontSize: 16,
  },
  totalValue: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#10B981",
  },

  submitBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
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

// MODAL STYLES
modalContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
},
modalContent: {
  width: "90%",
  backgroundColor: "#fff",
  borderRadius: 10,
  padding: 16,
  elevation: 4,
},
modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
modalTitle: {
  fontSize: 18,
  fontWeight: "bold",
},
modalBody: {
  marginTop: 10,
},
infoBox: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#e3f2fd",
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
},
infoText: {
  marginLeft: 8,
  color: "#0d47a1",
},
printOption: {
  marginBottom: 20,
},
optionTitle: {
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 8,
},
optionDesc: {
  fontSize: 14,
  color: "#666",
  marginBottom: 12,
},
connectedDevice: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#e8f5e9",
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
},
connectedText: {
  marginLeft: 8,
  fontWeight: "500",
},
deviceList: {
  maxHeight: 200,
},
deviceItem: {
  flexDirection: "row",
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
  backgroundColor: "#f9f9f9",
},
deviceItemSelected: {
  backgroundColor: "#e1f5fe",
},
deviceInfo: {
  marginLeft: 10,
  flex: 1,
},
deviceName: {
  fontWeight: "500",
},
deviceAddress: {
  fontSize: 12,
  color: "#666",
},
loadingContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 10,
},
loadingText: {
  marginLeft: 8,
  color: "#2954E5",
},
printActionBtn: {
  backgroundColor: "#10B981",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
  marginTop: 10,
},
printActionText: {
  color: "#fff",
  fontWeight: "bold",
},
printingContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 10,
},
printingText: {
  marginLeft: 8,
  color: "#2954E5",
},
divider: {
  height: 1,
  backgroundColor: "#ddd",
  marginVertical: 10,
},
errorText: {
  color: "#d32f2f",
  fontSize: 14,
  marginTop: 4,
},
rescanBtn: {
  marginTop: 10,
  padding: 10,
  borderRadius: 8,
  backgroundColor: "#e1f5fe",
  alignItems: "center",
},
rescanBtnText: {
  color: "#039be5",
  fontWeight: "bold",
},
});