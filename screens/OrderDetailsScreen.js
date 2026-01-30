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
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  PermissionsAndroid,
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
import bluetoothPrinter from "../utils/bluetoothPrinter";

export default function OrderDetailsScreen({ navigation, route }) {
  const { bookingId, customerId, customerName, orderNo, customerPhone } = route.params;
  const [details, setDetails] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSynced, setIsSynced] = useState(false); // new state

  const [cashierName, setCashierName] = useState("N/A");
  const [cashierEmail, setCashierEmail] = useState("N/A");

  const [orderLines, setOrderLines] = useState([]);
  const [customer, setCustomer] = useState({});

  // Bluetooth Printer States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);



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

  /**
   * Scan for available Bluetooth devices
   */
  const scanBluetoothDevices = async () => {
    setIsLoadingDevices(true);
    setPrintError(null);
    try {
      console.log("Starting Bluetooth device scan...");
      
      // Request permissions first
      const permResult = await bluetoothPrinter.requestPermissions();

      // permResult may be boolean (legacy) or an object { allGranted, statuses }
      let permissionsGranted = false;
      let statuses = null;
      if (typeof permResult === "object" && permResult !== null) {
        permissionsGranted = !!permResult.allGranted;
        statuses = permResult.statuses;
      } else {
        permissionsGranted = !!permResult;
      }

      // If permissions denied and flagged as NEVER_ASK_AGAIN, prompt user to open settings
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

      console.log("Permissions granted, scanning for devices...");
      
      // Get available devices (includes paired and scanned devices)
      const devices = await bluetoothPrinter.getAvailableDevices();

      console.log("Found devices:", devices);

      setAvailableDevices(devices || []);

      if (!devices || devices.length === 0) {
        setPrintError(
          "No Bluetooth devices found.\n\n" +
          "Make sure:\n" +
          "1. Your printer is turned ON\n" +
          "2. Bluetooth is enabled on your phone\n" +
          "3. Printer is paired in Bluetooth settings\n" +
          "4. Try clicking Rescan"
        );
      } else {
        console.log(`✓ Found ${devices.length} device(s)`);
        // Auto-select if only one device
        if (devices.length === 1) {
          setSelectedDevice(devices[0]);
          Alert.alert("Success", `Found printer: ${devices[0].name}\n\nClick Connect to continue`);
        }
      }
    } catch (error) {
      console.error("Device scan error:", error);
      setPrintError(
        "Failed to scan: " + (error.message || JSON.stringify(error)) +
        "\n\nMake sure Bluetooth permission is granted."
      );
    } finally {
      setIsLoadingDevices(false);
    }
  };

  /**
   * Connect to selected Bluetooth printer
   */
  const connectToDevice = async (device) => {
    if (!device || !device.address) {
      Alert.alert("Error", "Invalid device selected");
      return;
    }

    setIsLoadingDevices(true);
    setPrintError(null);
    try {
      console.log(`Attempting to connect to ${device.name}...`);
      await bluetoothPrinter.connectToDevice(device.address, device.name);
      setSelectedDevice(device);
      console.log("✓ Connected successfully");
      Alert.alert("Success", `Connected to ${device.name}`);
    } catch (error) {
      console.error("Connection error:", error);
      setPrintError("Failed to connect: " + (error.message || "Unknown error"));
      Alert.alert("Connection Failed", error.message || "Could not connect to printer");
    } finally {
      setIsLoadingDevices(false);
    }
  };

  /**
   * Handle printing via Bluetooth thermal printer
   */
  // const handleBluetoothPrint = async () => {
  //   if (!selectedDevice) {
  //     Alert.alert("Error", "Please select and connect to a printer first");
  //     return;
  //   }

  //   setIsPrinting(true);
  //   setPrintError(null);

  //   try {
  //     const receiptData = {
  //       header: "AXON ERP",
  //       invoiceNo: orderNo || "N/A",
  //       dateTime: new Date().toLocaleString(),
  //       customerName: customerName,
  //       customerPhone: customerPhone || "N/A",
  //       cashierName: cashierName,
  //       items: details.map((item) => ({
  //         item_name: item.item_name,
  //         order_qty: item.order_qty,
  //         unit_price: item.unit_price,
  //         amount: item.amount,
  //       })),
  //       subtotal: totalAmount,
  //       tax: 0,
  //       discount: 0,
  //       total: totalAmount,
  //       footer: "Thank you for your purchase!",
  //     };

  //     // Ensure connected then print using helper
  //     if (!bluetoothPrinter.isConnectedDevice()) {
  //       await bluetoothPrinter.connectToDevice(selectedDevice.address, selectedDevice.name);
  //     }

  //     await bluetoothPrinter.printReceipt(receiptData);

  //     setShowPrintModal(false);
  //     Alert.alert("Success", "Receipt printed successfully!");
  //   } catch (error) {
  //     console.error("Print error:", error);
  //     setPrintError("Print failed: " + error.message);
  //     Alert.alert("Print Error", error.message || "Failed to print receipt");
  //   } finally {
  //     setIsPrinting(false);
  //   }
  // };


  // ... (existing imports)

/**
 * Handle printing via Bluetooth thermal printer
 */
const handleBluetoothPrint = async () => {
  if (!selectedDevice) {
    Alert.alert("Error", "Please select and connect to a printer first");
    return;
  }

  setIsPrinting(true);
  setPrintError(null);

  try {
    // 1. Fetch Config for Logo, Address, and NTN
    const config = await getQRConfig();
    
    // 2. Prepare receipt data matching your new thermal layout
    const receiptData = {
      // Company Info
      companyName: "AXON ERP", // Default or from config
      companyAddress: config?.company_address || "Faisalabad, Pakistan",
      companyNTN: config?.company_ntn_number || "N/A",
      
      // Order Info
      invoiceNo: details[0]?.order_no || orderNo || "N/A",
      dateTime: new Date().toLocaleString(),
      cashierName: config?.name || cashierName,
      
      // Customer Info
      customerName: details[0]?.customer_name || customerName || "Walk-in",
      customerPhone: details[0]?.customer_phone || customerPhone || "N/A",
      
      // Items (Mapping keys to match the printer helper)
      items: details.map((item) => ({
        item_name: item.item_name,
        order_qty: item.order_qty,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
      
      // Totals
      subtotal: totalAmount,
      tax: 0,
      discount: 0,
      total: totalAmount,
      footer: "Thank you for shopping!",
    };

    // 3. Get the Logo (Base64)
    const logoBase64 = config?.company_logo || null;

    // 4. Ensure connection and print
    if (!bluetoothPrinter.isConnectedDevice()) {
      await bluetoothPrinter.connectToDevice(selectedDevice.address, selectedDevice.name);
    }

    // Call helper with both data and logo
    await bluetoothPrinter.printReceipt(receiptData, logoBase64);

    setShowPrintModal(false);
    Alert.alert("Success", "Receipt printed successfully!");
  } catch (error) {
    console.error("Print error:", error);
    setPrintError("Print failed: " + error.message);
    Alert.alert("Print Error", error.message || "Failed to print receipt");
  } finally {
    setIsPrinting(false);
  }
};

  /**
   * Handle PDF print (existing functionality)
   */
  const handlePDFPrint = async () => {
    try {
      // Load QR Config including logo, address, and NTN
      const config = await getQRConfig();
      const companyLogoBase64 = config?.company_logo || null;
      const companyAddress = config?.company_address || null;
      const companyNTN = config?.company_ntn_number || null;

      await Print.printAsync({
        html: generateInvoiceHTML(companyLogoBase64, companyAddress, companyNTN),
      });
      setShowPrintModal(false);
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Print Error", "Unable to print invoice");
    }
  };

  /**
   * Show print options modal
   */
  const showPrintOptions = async () => {
    setShowPrintModal(true);
    await scanBluetoothDevices();
  };



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
  // Show print modal with Bluetooth and PDF options
  showPrintOptions();
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
      {/* Print Options Modal */}
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
              {/* Info Section */}
              <View style={styles.infoBox}>
                <Feather name="info" size={18} color="#2954E5" />
                <Text style={styles.infoText}>
                  Make sure your printer is paired in Bluetooth Settings first
                </Text>
              </View>

              {/* Bluetooth Printer Option */}
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

              {/* Divider */}
              <View style={styles.divider} />

              {/* PDF Print Option */}
              {/* <View style={styles.printOption}>
                <Text style={styles.optionTitle}>📄 Print as PDF</Text>
                <Text style={styles.optionDesc}>
                  Print using system printer or save as PDF
                </Text>
                <TouchableOpacity
                  style={[styles.printActionBtn, { backgroundColor: "#10B981" }]}
                  onPress={handlePDFPrint}
                >
                  <Text style={styles.printActionText}>Print PDF</Text>
                </TouchableOpacity>
              </View> */}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

connectedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  connectedText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rescanBtn: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  rescanBtnText: {
    color: '#2954E5',
    fontWeight: '600',
  },
  // Modal styles for Bluetooth printer
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    padding: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2954E5",
  },
  infoText: {
    marginLeft: 12,
    fontSize: 13,
    color: "#1565c0",
    fontWeight: "500",
    flex: 1,
  },
  printOption: {
    marginBottom: 20,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  printingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  printingText: {
    marginTop: 10,
    color: "#2954E5",
    fontSize: 14,
    fontWeight: "bold",
  },
  deviceList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  deviceItemSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2954E5",
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  deviceAddress: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  connectedDevice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  connectedText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "green",
  },
  rescanBtn: {
    backgroundColor: "#2954E5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 12,
  },
  rescanBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  printActionBtn: {
    backgroundColor: "#2954E5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 12,
  },
  printActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
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
//   getQRConfig,
// } from "../db/database";
// import { Plus, Minus, X } from "lucide-react-native";
// import { Feather } from "@expo/vector-icons";
// import * as Print from "expo-print";

// export default function OrderDetailsScreen({ navigation, route }) {
//   const { bookingId, customerId, customerName, orderNo, customerPhone } = route.params;
//   const [details, setDetails] = useState([]);
//   const [totalAmount, setTotalAmount] = useState(0);
//   const [isSynced, setIsSynced] = useState(false); // new state

//   const [cashierName, setCashierName] = useState("N/A");
// const [cashierEmail, setCashierEmail] = useState("N/A");

// const [orderLines, setOrderLines] = useState([]);
// const [customer, setCustomer] = useState({});



// useEffect(() => {
//   const loadOrder = async () => {
//     const rows = await getOrderDetails(bookingId);

//     if (rows.length > 0) {
//       setCustomer({
//         id: rows[0].customer_id,
//         name: rows[0].customer_name,
//         phone: rows[0].customer_phone,
//         orderNo: rows[0].order_no,
//         orderDate: rows[0].order_date,
//       });
//     }

//     setOrderLines(rows);
//   };

//   loadOrder();
// }, [bookingId]);


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

//    useEffect(() => {
//     const loadConfig = async () => {
//       const config = await getQRConfig();
//       if (config) {
//         setCashierName(config.name || "N/A");
//         setCashierEmail(config.email || "N/A");
//       }
//     };
  
//     loadConfig();
//   }, []);

// // const generateInvoiceHTML = () => {
// //   const invoiceNo = orderNo || "N/A";
// //   const dateTime = new Date().toLocaleString();

// //   // Prepare items from current details
// //   const itemsHTML = details
// //     .map(
// //       (item, index) => `
// //       <tr>
// //         <td style="width:5%; text-align:center;">${index + 1}</td>
// //         <td style="width:45%; word-wrap: break-word;">${item.item_name}</td>
// //         <td style="width:15%; text-align:center;">${item.order_qty}</td>
// //         <td style="width:15%; text-align:right;">${parseFloat(item.unit_price).toFixed(2)}</td>
// //         <td style="width:20%; text-align:right;">${parseFloat(item.amount).toFixed(2)}</td>
// //       </tr>
// //     `
// //     )
// //     .join("");

// //   const subtotal = totalAmount || 0;
// //   const tax = 0;
// //   const discount = 0;
// //   const grandTotal = subtotal + tax - discount;
// //   const cash = grandTotal;
// //   const change = 0;

// //   return `
// //   <html>
// //   <head>
// //     <meta charset="utf-8" />
// //     <style>
// //       @media print {
// //         body {
// //           width: 58mm;
// //           margin: 0;
// //           padding: 4px;
// //           font-family: monospace;
// //           font-size: 12px;
// //         }
// //       }

// //       body {
// //         width: 58mm;
// //         margin: 0;
// //         padding: 4px;
// //         font-family: monospace;
// //         font-size: 12px;
// //       }
// //       .left { text-align: left; }
// //       .center { text-align: center; }
// //       .right { text-align: right; }
// //       .bold { font-weight: bold; }

// //       hr {
// //         border: none;
// //         border-top: 1px dashed #000;
// //         margin: 4px 0;
// //       }

// //       table {
// //         width: 100%;
// //         border-collapse: collapse;
// //         font-size: 11px;
// //       }

// //       th, td {
// //         padding: 2px 0;
// //         word-wrap: break-word;
// //       }

// //       th {
// //         border-bottom: 1px dashed #000;
// //         font-weight: bold;
// //         font-size: 12px;
// //       }

// //       .totals td {
// //         padding: 2px 0;
// //       }

// //       .barcode {
// //         margin-top: 6px;
// //         text-align: center;
// //         font-size: 10px;
// //         letter-spacing: 2px;
// //         word-break: break-all;
// //       }

// //       .small-text { font-size: 10px; }
// //       .medium-text { font-size: 12px; }
// //       .large-text { font-size: 38px; font-weight: bold; }
// //       .nowrap { white-space: nowrap; }
// //       .wrap { word-wrap: break-word; }
// //     </style>
// //   </head>

// //   <body>
// //     <div class="center bold large-text">AXON ERP</div>
// //     <div class="center medium-text">MULTI-TECHNO INTEGRATED SOLUTIONS</div>
// //     <div class="center small-text">KOHINOOR Plaza 1, 2nd Floor, Office #17</div>
// //     <div class="center small-text">Faisalabad</div>
// //     <div class="left small-text">Phone: ${customer.phone || "N/A"}</div>
// //     <div class="left small-text">Email: ${cashierEmail || "N/A"}</div>

// //     <hr/>

// //     <div class="center bold medium-text">SALE INVOICE</div>

// //     <hr/>

// //     <div class="small-text">Invoice: ${invoiceNo}</div>
// //     <div class="small-text">Cashier: ${cashierName || "N/A"}</div>
// //     <div class="small-text">Customer: ${customerName}</div>
// //     <div class="small-text">Phone: ${customerPhone || "N/A"}</div>
// //     <div class="small-text">Date: ${dateTime}</div>

// //     <hr/>

// //     <table>
// //       <thead>
// //         <tr>
// //           <th style="width:5%;">S#</th>
// //           <th style="width:45%;">Item</th>
// //           <th style="width:15%; text-align:center;">Qty</th>
// //           <th style="width:15%; text-align:right;">Rate</th>
// //           <th style="width:20%; text-align:right;">Total</th>
// //         </tr>
// //       </thead>
// //       <tbody>
// //         ${itemsHTML}
// //       </tbody>
// //     </table>

// //     <hr/>

// //     <table class="totals">
// //       <tr>
// //         <td>Subtotal</td>
// //         <td class="right">${subtotal.toFixed(2)}</td>
// //       </tr>
// //       <tr>
// //         <td>Total Taxes</td>
// //         <td class="right">${tax.toFixed(2)}</td>
// //       </tr>
// //       <tr>
// //         <td>Discount</td>
// //         <td class="right">${discount.toFixed(2)}</td>
// //       </tr>
// //       <tr>
// //         <td class="bold">TOTAL AMOUNT</td>
// //         <td class="right bold">${grandTotal.toFixed(2)}</td>
// //       </tr>
// //       <tr>
// //         <td>Cash</td>
// //         <td class="right">${cash.toFixed(2)}</td>
// //       </tr>
// //       <tr>
// //         <td>Change</td>
// //         <td class="right">${change.toFixed(2)}</td>
// //       </tr>
// //     </table>

// //     <hr/>

// //     <div class="center small-text">Thank You For Shopping!</div>
// //     <div class="center small-text">No Return / No Exchange For Frozen</div>
// //     <div class="center small-text">No Refund Without Receipt</div>

// //     <div class="barcode">|||| ||| |||| |||</div>
// //     <div class="center small-text">${invoiceNo}</div>
// //   </body>
// //   </html>
// //   `;
// // };


// const generateInvoiceHTML = (companyLogoBase64, companyAddress, companyNTN) => {
//   const dateTime = new Date().toLocaleString();

//   // Use first item to get customer info safely
//   const firstRow = details && details.length > 0 ? details[0] : {};
//   const invoiceNo = firstRow.order_no || "N/A";
//   const safeCustomerName = firstRow.customer_name || customerName || "Walk-in Customer";
//   const safeCustomerPhone = firstRow.customer_phone || customerPhone;
//   const safeCashierEmail = cashierEmail;

//   const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${invoiceNo}&scale=3&includetext`;

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

//   // Conditional fields
//   const companyAddressHTML = companyAddress ? `<div class="center small-text">${companyAddress}</div>` : "";
//   const companyNTNHTML = companyNTN ? `<div class="center small-text">NTN: ${companyNTN}</div>` : "";
//   const customerPhoneHTML = safeCustomerPhone ? `<div class="left small-text">Phone: ${safeCustomerPhone}</div>` : "";
//   const cashierEmailHTML = safeCashierEmail ? `<div class="left small-text">Email: ${safeCashierEmail}</div>` : "";

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
//     <div class="small-text">Customer: ${safeCustomerName}</div>
//     ${safeCustomerPhone ? `<div class="small-text">Phone: ${safeCustomerPhone}</div>` : ""}
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
//     // Load QR Config including logo, address, and NTN
//     const config = await getQRConfig();
//     const companyLogoBase64 = config?.company_logo || null;
//     const companyAddress = config?.company_address || null;
//     const companyNTN = config?.company_ntn_number || null;

//     await Print.printAsync({
//       html: generateInvoiceHTML(companyLogoBase64, companyAddress, companyNTN),
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

//        {/* Bottom bar */}
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

//     {/* Buttons row */}
//    <View style={styles.bottomButtonsRow}>
//   <TouchableOpacity
//    style={styles.completedBtn}
//     onPress={() => navigation.replace("Home")}
//   >
//     <Text style={styles.completedBtnText}>Completed</Text>
//   </TouchableOpacity>

//   <TouchableOpacity
//    style={styles.printBtn}
//     onPress={handlePrintInvoice} // now it exists
    
//   >
//     <Text style={styles.printBtnText}>🖨 Print</Text>
//   </TouchableOpacity>
// </View>

//   </View>
// </View>

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
//   completedBtn: { backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14, alignItems: "center",width:"70%", justifyContent: "center" },
//   completedBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
//   printBtn: { backgroundColor: "#2954E5", borderRadius: 12, paddingVertical: 14, alignItems: "center",width:"26%", justifyContent: "center" },
//   printBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
//   bottomButtonsRow: {
//   flexDirection: "row",
//   justifyContent: "space-between",
//   marginTop: 12,
// },
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