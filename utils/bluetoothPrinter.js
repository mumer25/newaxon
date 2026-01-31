import { Platform, PermissionsAndroid, ToastAndroid } from "react-native";

let ThermalPrinter = null;
try {
  // BLEPrinter is for Bluetooth (BLE) thermal printers
  const { BLEPrinter } = require("react-native-thermal-receipt-printer");
  ThermalPrinter = BLEPrinter;
} catch (e) {
  console.warn("ThermalPrinter module not available:", e && e.message);
}

class BluetoothThermalPrinter {
  constructor() {
    this.isConnected = false;
    this.printerDevice = null;
  }

  // Request Bluetooth permissions (Android)
  async requestPermissions() {
    if (Platform.OS !== "android") return { allGranted: true, statuses: {} };

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(granted).every(
        (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        ToastAndroid.show("Permissions granted!", ToastAndroid.SHORT);
      } else {
        ToastAndroid.show("Some permissions were denied", ToastAndroid.SHORT);
      }

      return { allGranted, statuses: granted };
    } catch (error) {
      console.error("Permission request error:", error);
      return { allGranted: false, statuses: {} };
    }
  }

  // Get paired and scanned devices
  async getAvailableDevices() {
    if (!ThermalPrinter) {
      console.warn("ThermalPrinter native module not available when scanning for devices");
      return [];
    }

    let devices = [];

    try {
      console.log("ThermalPrinter available methods:", Object.keys(ThermalPrinter));

      // Initialize BLEPrinter first if init exists
      if (typeof ThermalPrinter.init === "function") {
        try {
          console.log("Initializing BLEPrinter...");
          await this._promiseWithTimeout(ThermalPrinter.init(), 5000, "BLEPrinter.init");
          console.log("BLEPrinter initialized successfully");
        } catch (err) {
          console.warn("Error initializing BLEPrinter:", err);
        }
      }

      // Call getDeviceList which should return paired/scanned devices
      if (typeof ThermalPrinter.getDeviceList === "function") {
        try {
          console.log("Calling ThermalPrinter.getDeviceList()");
          const result = await this._promiseWithTimeout(
            ThermalPrinter.getDeviceList(),
            8000,
            "getDeviceList"
          );
          console.log("Result from getDeviceList:", result);
          if (Array.isArray(result) && result.length > 0) {
            // Normalize device fields returned by the native library
            devices = result.map((dev) => ({
              // Support both field name formats
              address: dev.address || dev.inner_mac_address || dev.mac_address,
              name: dev.name || dev.device_name,
              // Keep original fields for reference
              ...dev,
            }));
            console.log("Normalized devices:", devices);
          } else if (result && Array.isArray(result.devices)) {
            devices = result.devices.map((dev) => ({
              address: dev.address || dev.inner_mac_address || dev.mac_address,
              name: dev.name || dev.device_name,
              ...dev,
            }));
          }
        } catch (err) {
          console.warn("Error calling getDeviceList:", err);
        }
      }
    } catch (e) {
      console.warn("Error fetching devices:", e);
    }

    return devices;
  }

  // Helper to wrap promises with timeout
  async _promiseWithTimeout(promise, timeoutMs, methodName) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${methodName} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  // Expose module availability for runtime checks
  isModuleAvailable() {
    return !!ThermalPrinter;
  }

  getModuleMethods() {
    try {
      return ThermalPrinter ? Object.keys(ThermalPrinter) : [];
    } catch (e) {
      return [];
    }
  }

  // Connect to printer
  async connectToDevice(address, name) {
    if (!ThermalPrinter) throw new Error("Bluetooth module not available");

    if (this.isConnected) {
      console.log("Already connected to a device");
      return true;
    }

    try {
      console.log(`Attempting to connect to ${name} (${address})...`);
      
      if (ThermalPrinter.connectPrinter) {
        // connectPrinter expects (address, timeout) in some versions
        // Try with timeout first, fallback to address only
        try {
          await this._promiseWithTimeout(
            ThermalPrinter.connectPrinter(address, 10000),
            15000,
            `connectPrinter(${address})`
          );
        } catch (err) {
          // If the above fails, try without timeout
          console.warn("Retrying connection without timeout...");
          await this._promiseWithTimeout(
            ThermalPrinter.connectPrinter(address),
            15000,
            `connectPrinter(${address})`
          );
        }
      }

      this.isConnected = true;
      this.printerDevice = { address, name };
      console.log(`✓ Connected to ${name}`);
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error("Connection error:", error);
      throw error;
    }
  }

  // Disconnect printer
  async disconnect() {
    if (!ThermalPrinter || !this.isConnected) return;

    try {
      if (ThermalPrinter.disconnectPrinter) {
        await ThermalPrinter.disconnectPrinter();
      }
      this.isConnected = false;
      this.printerDevice = null;
      console.log("Printer disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }

  // Print receipt
 // ... (keep your existing class structure and permissions)

  async printReceipt(data, companyLogoBase64) {
    if (!this.isConnected) throw new Error("Printer not connected");
    if (!ThermalPrinter) throw new Error("Bluetooth module not available");

    try {
      // 1. TOP LOGO (Mirroring PDF)
      if (companyLogoBase64 && typeof ThermalPrinter.printImageBase64 === "function") {
        await ThermalPrinter.printImageBase64(companyLogoBase64, { width: 130, height: 40 });
      } else {
        await ThermalPrinter.printText("<C><B>AXON ERP</B></B>\n");
      }

      // 2. RECEIPT BODY (Aligned with PDF Layout)
      const receiptText = this.formatReceiptFor58mm(data);
      await ThermalPrinter.printText(receiptText);

      // 3. BOTTOM BARCODE (Mirroring PDF)
      if (data.invoiceNo && data.invoiceNo !== "N/A") {
        if (typeof ThermalPrinter.printBarcode === "function") {
          try {
            // Type 73 is CODE128 (matches your PDF barcodeUrl)
            await ThermalPrinter.printBarcode(data.invoiceNo, 73, 2, 60, 2, 1);
          } catch (e) {
            await ThermalPrinter.printText(`<C>${data.invoiceNo}</C>\n`);
          }
        } else {
          await ThermalPrinter.printText(`<C>${data.invoiceNo}</C>\n`);
        }
      }

      await ThermalPrinter.printText("\n\n\n"); 
      return true;
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
  }

  formatReceiptFor58mm(data) {
    const {
      companyAddress,
      companyNTN,
      invoiceNo,
      dateTime,
      customerName,
      customerPhone,
      cashierName,
      items,
      subtotal,
      tax,
      discount,
      total,
    } = data;

    const LINE_WIDTH = 32;
    const DASH = "-".repeat(LINE_WIDTH);

    let receipt = "";

    // Header Details (PDF Style)
    if (companyAddress) receipt += `<C>${companyAddress}</C>\n`;
    if (companyNTN) receipt += `<C>NTN: ${companyNTN}</C>\n`;
    
    receipt += DASH + "\n";
    receipt += "<C><B>SALE INVOICE</B></C>\n";
    receipt += DASH + "\n";

    // Info Section
    receipt += `Invoice: ${invoiceNo}\n`;
    receipt += `Cashier: ${cashierName || ""}\n`;
    receipt += `Customer: ${customerName || "Walk-in"}\n`;
    if (customerPhone) receipt += `Phone: ${customerPhone}\n`;
    receipt += `Date: ${dateTime}\n`;
    receipt += DASH + "\n";

    // Table Header (Matches PDF: S# Item Qty Rate Total)
    // Layout: 2(S#) 10(Item) 4(Qty) 7(Rate) 9(Total) = 32
    receipt += "S# Item      Qty  Rate   Total\n";
    receipt += DASH + "\n";

    // Items Loop
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        const sNo = String(index + 1).padEnd(2);
        const name = (item.item_name || "Item").substring(0, 9).padEnd(10);
        const qty = String(item.order_qty || 0).padStart(4);
        const rate = parseFloat(item.unit_price || 0).toFixed(0).padStart(7);
        const amt = parseFloat(item.amount || 0).toFixed(0).padStart(9);
        
        receipt += `${sNo}${name}${qty}${rate}${amt}\n`;
      });
    }

    receipt += DASH + "\n";

    // Totals Section (Mirroring PDF table)
    receipt += this.rightAlignText(`Subtotal: ${subtotal.toFixed(2)}`, LINE_WIDTH) + "\n";
    receipt += this.rightAlignText(`Tax: ${(tax || 0).toFixed(2)}`, LINE_WIDTH) + "\n";
    receipt += this.rightAlignText(`Discount: ${(discount || 0).toFixed(2)}`, LINE_WIDTH) + "\n";
    receipt += DASH + "\n";
    receipt += this.rightAlignText(`TOTAL: Rs ${total.toFixed(2)}`, LINE_WIDTH) + "\n";
    receipt += DASH + "\n";

    // Footer Disclaimer (Mirroring PDF exactly)
    receipt += "<C>Thank You For Shopping!</C>\n";
    receipt += "<C>No Return / No Exchange For Frozen</C>\n";
    receipt += "<C>No Refund Without Receipt</C>\n";
    receipt += DASH + "\n";

    return receipt;
  }

  // rightAlignText(text, width) {
  //   // Remove tags for calculation if they exist
  //   const cleanText = text.replace(/<[^>]*>/g, "");
  //   const pad = Math.max(0, width - cleanText.length);
  //   return " ".repeat(pad) + text;
  // }
  centerText(text, width) {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(pad) + text;
  }

  leftAlignText(text, width) {
    return text.length >= width ? text.substring(0, width) : text + " ".repeat(width - text.length);
  }

  rightAlignText(text, width) {
    return text.length >= width ? text.substring(0, width) : " ".repeat(width - text.length) + text;
  }

  formatItemsHeader(width) {
    const header = this.leftAlignText("Item", 15) + "Qty  Price";
    return header + "\n";
  }

  formatItemLine(item, width) {
    let name = item.item_name || "Item";
    if (name.length > 15) name = name.substring(0, 12) + "...";

    const qty = String(item.order_qty || 0).padEnd(5);
    const price = `Rs ${parseFloat(item.unit_price || 0).toFixed(2)}`;

    return this.leftAlignText(name, 15) + qty + price + "\n";
  }

  isConnectedDevice() {
    return this.isConnected;
  }

  getConnectedDevice() {
    return this.printerDevice;
  }
}

export default new BluetoothThermalPrinter();
