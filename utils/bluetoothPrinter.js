import { Platform, PermissionsAndroid, ToastAndroid } from "react-native";

let ThermalPrinter = null;
try {
  ThermalPrinter = require("react-native-thermal-receipt-printer").default;
} catch (e) {
  console.warn("ThermalPrinter module not available yet");
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
    if (!ThermalPrinter) return [];

    let devices = [];

    try {
      if (ThermalPrinter.getBondedDevices) {
        const bondedDevices = await ThermalPrinter.getBondedDevices();
        devices = bondedDevices || [];
      }

      if (ThermalPrinter.getBluetoothDevices) {
        const scannedDevices = await ThermalPrinter.getBluetoothDevices();
        if (scannedDevices && scannedDevices.length > 0) {
          scannedDevices.forEach((d) => {
            if (!devices.find((dev) => dev.address === d.address)) {
              devices.push(d);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Error fetching devices:", e);
    }

    return devices;
  }

  // Connect to printer
  async connectToDevice(address, name) {
    if (!ThermalPrinter) throw new Error("Bluetooth module not available");

    if (this.isConnected) {
      console.log("Already connected to a device");
      return true;
    }

    try {
      if (ThermalPrinter.connectPrinter) {
        await ThermalPrinter.connectPrinter(address);
      }

      this.isConnected = true;
      this.printerDevice = { address, name };
      console.log(`Connected to ${name}`);
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
  async printReceipt(data) {
    if (!this.isConnected) throw new Error("Printer not connected");
    if (!ThermalPrinter) throw new Error("Bluetooth module not available");

    try {
      const receiptText = this.formatReceiptFor58mm(data);
      await ThermalPrinter.printText(receiptText);
      await ThermalPrinter.printText("\n\n\n"); // spacing
      return true;
    } catch (error) {
      console.error("Print error:", error);
      throw error;
    }
  }

  // Format receipt (58mm)
  formatReceiptFor58mm(data) {
    const {
      header,
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
      footer,
    } = data;

    const LINE_WIDTH = 32;
    const SEPARATOR = "=".repeat(LINE_WIDTH);
    const DASH = "-".repeat(LINE_WIDTH);

    let receipt = "";

    if (header) receipt += this.centerText(header, LINE_WIDTH) + "\n" + SEPARATOR + "\n";

    receipt += this.leftAlignText(`Invoice: ${invoiceNo}`, LINE_WIDTH) + "\n";
    receipt += this.leftAlignText(`Date: ${dateTime}`, LINE_WIDTH) + "\n";
    if (cashierName) receipt += this.leftAlignText(`Cashier: ${cashierName}`, LINE_WIDTH) + "\n";
    if (customerName) receipt += this.leftAlignText(`Customer: ${customerName}`, LINE_WIDTH) + "\n";
    if (customerPhone) receipt += this.leftAlignText(`Phone: ${customerPhone}`, LINE_WIDTH) + "\n";

    receipt += DASH + "\n";
    receipt += this.formatItemsHeader(LINE_WIDTH);

    if (items && items.length > 0) {
      items.forEach((item) => {
        receipt += this.formatItemLine(item, LINE_WIDTH);
      });
    }

    receipt += DASH + "\n";

    receipt += this.rightAlignText(`Subtotal: Rs ${subtotal.toFixed(2)}`, LINE_WIDTH) + "\n";
    if (tax > 0) receipt += this.rightAlignText(`Tax: Rs ${tax.toFixed(2)}`, LINE_WIDTH) + "\n";
    if (discount > 0) receipt += this.rightAlignText(`Discount: Rs ${discount.toFixed(2)}`, LINE_WIDTH) + "\n";

    receipt += SEPARATOR + "\n";
    receipt += this.rightAlignText(`TOTAL: Rs ${total.toFixed(2)}`, LINE_WIDTH) + "\n";
    receipt += SEPARATOR + "\n";

    if (footer) receipt += this.centerText(footer, LINE_WIDTH) + "\n";

    receipt += this.centerText("Thank You!", LINE_WIDTH) + "\n";

    return receipt;
  }

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
