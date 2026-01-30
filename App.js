import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CartProvider } from "./context/CartContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { openUserDB } from "./db/dbManager"; // adjust path
import {
  // initRecentActivityTable,
  autoResetDailyVisitStatus,
  getLoginStatus,
  syncAttachments ,
} from "./db/database";
import { saveAppActivity, showAppActivityLogs } from "./db/app_activity";
import NetInfo from '@react-native-community/netinfo';
import { syncCustomers } from "./utils/syncCustomers";
import { fetchItemsFromAPIAndDB } from "./utils/fetchItemsFromAPIAndDB";
import { fetchCustomersFromAPIAndDB } from "./utils/fetchCustomersFromAPIAndDB";
import { fetchAccountsFromAPIAndDB } from "./utils/fetchAccountsFromAPIAndDB";
// Screens
import WelcomeScreen from "./screens/WelcomeScreen";
import OnboardScreen1 from "./screens/OnboardScreen1";
import OnboardScreen2 from "./screens/OnboardScreen2";
import OnboardScreen3 from "./screens/OnboardScreen3";
import OnboardScreen4 from "./screens/OnboardScreen4";
import QRScanScreen from "./screens/QRScanScreen";
import HomeScreen from "./screens/HomeScreen";
import CustomerScreen from "./screens/CustomerScreen";
import AddCustomerScreen from "./screens/AddCustomerScreen";
import ItemsScreen from "./screens/ItemsScreen";
import OrdersScreen from "./screens/OrdersScreen";
import OrderDetailsScreen from "./screens/OrderDetailsScreen";
import OrderListScreen from "./screens/OrderListScreen";
import LiveTrackingScreen from "./screens/LiveTrackingScreen";
import UpdateLocationScreen from "./screens/UpdateLocationScreen";
import UpdateLocationMapScreen from "./screens/UpdateLocationMapScreen";
import CustomerPaymentRecovery from "./screens/CustomerPaymentRecovery";
import PaymentRecoveryForm from "./screens/PaymentRecoveryForm";
import AllPaymentsScreen from "./screens/AllPaymentsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Toast from "react-native-toast-message";
import { UserProvider } from "./context/UserContext";
import DashboardScreen from "./screens/DashboardScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

// "projectId": "2540b639-2fb6-4b8c-8431-3e0a09a99bfc"


        // "projectId": "baba4100-6589-4286-baa3-8f7417449851"

//   useEffect(() => {
//   const initDBAndTracking = async () => {
//     try {
//       // Open DB for current user
//       await openUserDB(CURRENT_USER_ID);

//       // Request location permission
//       let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") {
//         console.log("Location permission not granted");
//         return;
//       }

//       // Track location every 10 minutes (600000 ms)
//       setInterval(async () => {
//         const loc = await Location.getCurrentPositionAsync({});
//         await saveAppActivity(loc.coords.latitude, loc.coords.longitude);
//         }, 1 * 60 * 1000);

//       // }, 10000);


//       // Show existing activity logs
//       await showAppActivityLogs();
//     } catch (err) {
//       console.log("Error initializing DB or location tracking:", err);
//     }
//   };

//   initDBAndTracking();
// }, []);

//   useEffect(() => {
//   const initApp = async () => {
//     try {
//       const uid = await AsyncStorage.getItem("current_user_id");

//       if (uid) {
//         await openUserDB(uid);   
//         await autoResetDailyVisitStatus();
//       }

//       const loginStatus = await getLoginStatus();
//       setIsLoggedIn(loginStatus);

//     } catch (err) {
//       console.log("Startup error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   initApp();
// }, []);

useEffect(() => {
  const initApp = async () => {
    try {
      // Get last logged-in user ID
      const uid = await AsyncStorage.getItem("current_user_id");
      const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");

      if (uid && baseUrl) {
        // Open correct DB for this user
        await openUserDB(uid, baseUrl);

        // Reset daily visit statuses
        await autoResetDailyVisitStatus();

        // Start location tracking after DB is opened
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setInterval(async () => {
            const loc = await Location.getCurrentPositionAsync({});
            await saveAppActivity(loc.coords.latitude, loc.coords.longitude);
          }, 20 * 60 * 1000);
        }

        // Show logs
        await showAppActivityLogs();
      }

      const loginStatus = await getLoginStatus();
      setIsLoggedIn(loginStatus);

    } catch (err) {
      console.log("Startup error:", err);
    } finally {
      setLoading(false);
    }
  };

  initApp();
}, []);


useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log('Online! Syncing attachments...');
      syncAttachments(); // try uploading any offline images
    }
  });

  return () => unsubscribe();
}, []);


 useEffect(() => {
    syncCustomers();
  }, []);

  useEffect(() => {
  fetchItemsFromAPIAndDB();     
}, []);
 useEffect(() => {
  fetchCustomersFromAPIAndDB();     
}, []);
 useEffect(() => {
  fetchAccountsFromAPIAndDB();     
}, []);


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <UserProvider>
      <CartProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
              headerStyle: { backgroundColor: "#1E90FF" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          >
            {/* Welcome Screen - always shown first */}
            <Stack.Screen name="Welcome" options={{ headerShown: false }}>
              {(props) => (
                <WelcomeScreen {...props} isLoggedIn={isLoggedIn} />
              )}
            </Stack.Screen>

            {/* QR Scan & Home */}
            <Stack.Screen name="QRScan" component={QRScanScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

            {/* Onboarding Screens */}
            <Stack.Screen name="Onboard1" component={OnboardScreen1} options={{ headerShown: false }} />
            <Stack.Screen name="Onboard2" component={OnboardScreen2} options={{ headerShown: false }} />
            <Stack.Screen name="Onboard3" component={OnboardScreen3} options={{ headerShown: false }} />
            <Stack.Screen name="Onboard4" component={OnboardScreen4} options={{ headerShown: false }} />

            {/* Main App Screens */}
            <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: true }} />
            <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Items" component={ItemsScreen} options={{ headerShown: true }} />
            <Stack.Screen name="All Orders" component={OrdersScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Order Details" component={OrderDetailsScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Order List" component={OrderListScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Update Location" component={UpdateLocationScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Update Location Map" component={UpdateLocationMapScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Customers List" component={CustomerPaymentRecovery} options={{ headerShown: true }} />
            <Stack.Screen name="Payment Recovery Form" component={PaymentRecoveryForm} options={{ headerShown: true }} />
            <Stack.Screen name="All Payments" component={AllPaymentsScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: true }} />
          </Stack.Navigator>

          <Toast />
        </NavigationContainer>
      </CartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}


// import React, { useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { CartProvider } from "./context/CartContext";
// import { openUserDB } from "./db/dbManager"; // adjust path
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import {
//   // initDB,
//   initRecentActivityTable,
//   autoResetDailyVisitStatus,
//   getLoginStatus,
// } from "./db/database";

// // Screens
// import WelcomeScreen from "./screens/WelcomeScreen";
// import OnboardScreen1 from "./screens/OnboardScreen1";
// import OnboardScreen2 from "./screens/OnboardScreen2";
// import OnboardScreen3 from "./screens/OnboardScreen3";
// import OnboardScreen4 from "./screens/OnboardScreen4";
// import QRScanScreen from "./screens/QRScanScreen";
// import HomeScreen from "./screens/HomeScreen";
// import CustomerScreen from "./screens/CustomerScreen";
// import AddCustomerScreen from "./screens/AddCustomerScreen";
// import ItemsScreen from "./screens/ItemsScreen";
// import OrdersScreen from "./screens/OrdersScreen";
// import OrderDetailsScreen from "./screens/OrderDetailsScreen";
// import OrderListScreen from "./screens/OrderListScreen";
// import LiveTrackingScreen from "./screens/LiveTrackingScreen";
// import UpdateLocationScreen from "./screens/UpdateLocationScreen";
// import UpdateLocationMapScreen from "./screens/UpdateLocationMapScreen";
// import CustomerPaymentRecovery from "./screens/CustomerPaymentRecovery";
// import PaymentRecoveryForm from "./screens/PaymentRecoveryForm";
// import AllPaymentsScreen from "./screens/AllPaymentsScreen";
// import ProfileScreen from "./screens/ProfileScreen";
// import Toast from "react-native-toast-message";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   const [loading, setLoading] = useState(true);
//   const [isLoggedIn, setIsLoggedIn] = useState(false);



//   useEffect(() => {
//     const init = async () => {
//       const currentUserId = await AsyncStorage.getItem("current_user_id");
//       if (currentUserId) {
//         try {
//           await openUserDB(currentUserId);
//           console.log("Loaded DB for user", currentUserId);
//         } catch (e) {
//           console.warn("Failed to open user DB", e);
//         }
//       }
//     };
//     init();
//   }, []);

//   useEffect(() => {
//     autoResetDailyVisitStatus();
//   }, []);

//   useEffect(() => {
//     const initializeApp = async () => {
//       try {
//         // await initDB();
//         await initRecentActivityTable();

//         // Get login status from DB table
//         const loginStatus = await getLoginStatus();
//         setIsLoggedIn(loginStatus);
//       } catch (err) {
//         console.log("Startup error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     initializeApp();
//   }, []);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <CartProvider>
//         <NavigationContainer>
//           <Stack.Navigator
//             initialRouteName="Welcome"
//             screenOptions={{
//               headerStyle: { backgroundColor: "#1E90FF" },
//               headerTintColor: "#fff",
//               headerTitleStyle: { fontWeight: "bold" },
//             }}
//           >
//             {/* Welcome Screen - always shown first */}
//             <Stack.Screen name="Welcome" options={{ headerShown: false }}>
//               {(props) => (
//                 <WelcomeScreen {...props} isLoggedIn={isLoggedIn} />
//               )}
//             </Stack.Screen>

//             {/* QR Scan & Home */}
//             <Stack.Screen name="QRScan" component={QRScanScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

//             {/* Onboarding Screens */}
//             <Stack.Screen name="Onboard1" component={OnboardScreen1} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard2" component={OnboardScreen2} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard3" component={OnboardScreen3} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard4" component={OnboardScreen4} options={{ headerShown: false }} />

//             {/* Main App Screens */}
//             <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Items" component={ItemsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="All Orders" component={OrdersScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order Details" component={OrderDetailsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order List" component={OrderListScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location" component={UpdateLocationScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location Map" component={UpdateLocationMapScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Customers List" component={CustomerPaymentRecovery} options={{ headerShown: true }} />
//             <Stack.Screen name="Payment Recovery Form" component={PaymentRecoveryForm} options={{ headerShown: true }} />
//             <Stack.Screen name="All Payments" component={AllPaymentsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true }} />
//           </Stack.Navigator>

//           <Toast />
//         </NavigationContainer>
//       </CartProvider>
//     </GestureHandlerRootView>
//   );
// }














// import React, { useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import {
//   initDB,
//   initRecentActivityTable,
//   autoResetDailyVisitStatus,
// } from "./db/database";
// import { CartProvider } from "./context/CartContext";

// // Screens
// import WelcomeScreen from "./screens/WelcomeScreen";
// import OnboardScreen1 from "./screens/OnboardScreen1";
// import OnboardScreen2 from "./screens/OnboardScreen2";
// import OnboardScreen3 from "./screens/OnboardScreen3";
// import OnboardScreen4 from "./screens/OnboardScreen4";
// import QRScanScreen from "./screens/QRScanScreen";
// import HomeScreen from "./screens/HomeScreen";
// import CustomerScreen from "./screens/CustomerScreen";
// import AddCustomerScreen from "./screens/AddCustomerScreen";
// import ItemsScreen from "./screens/ItemsScreen";
// import OrdersScreen from "./screens/OrdersScreen";
// import OrderDetailsScreen from "./screens/OrderDetailsScreen";
// import OrderListScreen from "./screens/OrderListScreen";
// import LiveTrackingScreen from "./screens/LiveTrackingScreen";
// import UpdateLocationScreen from "./screens/UpdateLocationScreen";
// import UpdateLocationMapScreen from "./screens/UpdateLocationMapScreen";
// import CustomerPaymentRecovery from "./screens/CustomerPaymentRecovery";
// import PaymentRecoveryForm from "./screens/PaymentRecoveryForm";
// import AllPaymentsScreen from "./screens/AllPaymentsScreen";
// import Toast from "react-native-toast-message";
// import ProfileScreen from "./screens/ProfileScreen";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   const [loading, setLoading] = useState(true);
//   const [firstLaunch, setFirstLaunch] = useState(false);
//   const [qrScanned, setQrScanned] = useState(false);

//   useEffect(() => {
//     autoResetDailyVisitStatus();
//   }, []);

//   useEffect(() => {
//     const initializeApp = async () => {
//       try {
//         await initDB();
//         await initRecentActivityTable();

//         const launched = await AsyncStorage.getItem("alreadyLaunched");
//         const qrStatus = await AsyncStorage.getItem("qr_scanned");

//         // First install
//         if (launched === null) {
//           setFirstLaunch(true);
//           await AsyncStorage.setItem("alreadyLaunched", "true");
//         } else {
//           setFirstLaunch(false);
//         }

//         // QR scan status
//         setQrScanned(qrStatus === "true");
//       } catch (err) {
//         console.log("Startup error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     initializeApp();
//   }, []);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <CartProvider>
//         <NavigationContainer>
//           <Stack.Navigator
//             initialRouteName="Welcome"
//             screenOptions={{
//               headerStyle: { backgroundColor: "#1E90FF" },
//               headerTintColor: "#fff",
//               headerTitleStyle: { fontWeight: "bold" },
//             }}
//           >
//             {/* Welcome Screen */}
//             <Stack.Screen name="Welcome" options={{ headerShown: false }}>
//               {(props) => (
//                 <WelcomeScreen
//                   {...props}
//                   firstLaunch={firstLaunch}
//                   isQrScanned={qrScanned}
//                 />
//               )}
//             </Stack.Screen>

//             {/* Onboarding Screens */}
//             <Stack.Screen name="Onboard1" component={OnboardScreen1} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard2" component={OnboardScreen2} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard3" component={OnboardScreen3} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard4" component={OnboardScreen4} options={{ headerShown: false }} />

//             {/* QR Scan & Home */}
//             <Stack.Screen name="QRScan" component={QRScanScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

//             {/* Main App Screens */}
//             <Stack.Screen
//               name="Customer"
//               component={CustomerScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="AddCustomer"
//               component={AddCustomerScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Items"
//               component={ItemsScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="All Orders"
//               component={OrdersScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Order Details"
//               component={OrderDetailsScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Order List"
//               component={OrderListScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Live Tracking"
//               component={LiveTrackingScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Update Location"
//               component={UpdateLocationScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Update Location Map"
//               component={UpdateLocationMapScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Customers List"
//               component={CustomerPaymentRecovery}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Payment Recovery Form"
//               component={PaymentRecoveryForm}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="All Payments"
//               component={AllPaymentsScreen}
//               options={{ headerShown: true }}
//             />
//             <Stack.Screen
//               name="Profile"
//               component={ProfileScreen}
//               options={{ headerShown: true }}
//             />
//           </Stack.Navigator>

//           <Toast />
//         </NavigationContainer>
//       </CartProvider>
//     </GestureHandlerRootView>
//   );
// }



// import React, { useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { initDB,initRecentActivityTable, autoResetDailyVisitStatus } from "./db/database";
// import { CartProvider } from "./context/CartContext";

// // Screens
// import WelcomeScreen from "./screens/WelcomeScreen";
// import OnboardScreen1 from "./screens/OnboardScreen1";
// import OnboardScreen2 from "./screens/OnboardScreen2";
// import OnboardScreen3 from "./screens/OnboardScreen3";
// import OnboardScreen4 from "./screens/OnboardScreen4";
// import QRScanScreen from "./screens/QRScanScreen";
// import HomeScreen from "./screens/HomeScreen";
// import CustomerScreen from "./screens/CustomerScreen";
// import AddCustomerScreen from "./screens/AddCustomerScreen";
// import ItemsScreen from "./screens/ItemsScreen";
// import OrdersScreen from "./screens/OrdersScreen";
// import OrderDetailsScreen from "./screens/OrderDetailsScreen";
// import OrderListScreen from "./screens/OrderListScreen";
// import LiveTrackingScreen from "./screens/LiveTrackingScreen";
// import UpdateLocationScreen from "./screens/UpdateLocationScreen";
// import UpdateLocationMapScreen from "./screens/UpdateLocationMapScreen";
// import CustomerPaymentRecovery from "./screens/CustomerPaymentRecovery";
// import PaymentRecoveryForm from "./screens/PaymentRecoveryForm";
// import AllPaymentsScreen from "./screens/AllPaymentsScreen";
// import Toast from "react-native-toast-message";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   const [isFirstLaunch, setIsFirstLaunch] = useState(null);
//   const [qrScanned, setQrScanned] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     autoResetDailyVisitStatus();
//   }, []);

//   useEffect(() => {
//     const initializeApp = async () => {
//       try {
//         await initDB();
//         await initRecentActivityTable();

//         const launched = await AsyncStorage.getItem("alreadyLaunched");
//         const qrStatus = await AsyncStorage.getItem("qr_scanned");

//         setIsFirstLaunch(launched === null);
//         setQrScanned(qrStatus === "true");

//         if (launched === null) {
//           await AsyncStorage.setItem("alreadyLaunched", "true");
//         }
//       } catch (err) {
//         console.log("Startup error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     initializeApp();
//   }, []);

//   if (loading || isFirstLaunch === null) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   // First launch → Onboarding
//   // If QR not scanned → start at QRScan
//   // Only navigate to Home after successful QR scan
//   let initialRoute = "QRScan";
//   if (isFirstLaunch) initialRoute = "Welcome";
//   else if (qrScanned) initialRoute = "Home";

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <CartProvider>
//         <NavigationContainer>
//           <Stack.Navigator
//             initialRouteName={initialRoute}
//             screenOptions={{
//               headerStyle: { backgroundColor: "#1E90FF" },
//               headerTintColor: "#fff",
//               headerTitleStyle: { fontWeight: "bold" },
//             }}
//           >
//             {/* Onboarding Screens */}
//             <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard1" component={OnboardScreen1} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard2" component={OnboardScreen2} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard3" component={OnboardScreen3} options={{ headerShown: false }} />
//             <Stack.Screen name="Onboard4" component={OnboardScreen4} options={{ headerShown: false }} />

//             {/* QR Scan & Home */}
//             <Stack.Screen name="QRScan" component={QRScanScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

//             {/* Main App Screens */}
//             <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Items" component={ItemsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="All Orders" component={OrdersScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order Details" component={OrderDetailsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order List" component={OrderListScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location" component={UpdateLocationScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location Map" component={UpdateLocationMapScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Customers List" component={CustomerPaymentRecovery} options={{ headerShown: true }} />
//             <Stack.Screen name="Payment Recovery Form" component={PaymentRecoveryForm} options={{ headerShown: true }} />
//             <Stack.Screen name="All Payments" component={AllPaymentsScreen} options={{ headerShown: true }} />
//           </Stack.Navigator>
//              <Toast />
//         </NavigationContainer>
//       </CartProvider>
//     </GestureHandlerRootView>
//   );
// }




// import React, { useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { initDB, initRecentActivityTable,autoResetDailyVisitStatus } from "./database";
// import { CartProvider } from "./context/CartContext";

// // Screens
// import WelcomeScreen from "./screens/WelcomeScreen";
// import OnboardScreen1 from "./screens/OnboardScreen1";
// import OnboardScreen2 from "./screens/OnboardScreen2";
// import OnboardScreen3 from "./screens/OnboardScreen3";
// import OnboardScreen4 from "./screens/OnboardScreen4";
// import QRScanScreen from "./screens/QRScanScreen";
// import HomeScreen from "./screens/HomeScreen";
// import CustomerScreen from "./screens/CustomerScreen";
// import AddCustomerScreen from "./screens/AddCustomerScreen";
// import ItemsScreen from "./screens/ItemsScreen";
// import OrdersScreen from "./screens/OrdersScreen";
// import OrderDetailsScreen from "./screens/OrderDetailsScreen";
// import OrderListScreen from "./screens/OrderListScreen";
// import LiveTrackingScreen from "./screens/LiveTrackingScreen";
// import UpdateLocationScreen from "./screens/UpdateLocationScreen";
// import UpdateLocationMapScreen from "./screens/UpdateLocationMapScreen";
// import CustomerPaymentRecovery from "./screens/CustomerPaymentRecovery";
// import PaymentRecoveryForm from "./screens/PaymentRecoveryForm";
// import AllPaymentsScreen from "./screens/AllPaymentsScreen";
// import BottomTabs from "./navigation/BottomTabs";
// import HomeStack from "./navigation/HomeStack";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   const [isFirstLaunch, setIsFirstLaunch] = useState(null);


//   useEffect(() => {
//   autoResetDailyVisitStatus();
// }, []);

//   useEffect(() => {
//     // Initialize databases
//     initDB();
//     initRecentActivityTable();

//     // Check AsyncStorage for first launch
//     const checkFirstLaunch = async () => {
//       try {
//         const alreadyLaunched = await AsyncStorage.getItem("alreadyLaunched");
//         if (alreadyLaunched === null) {
//           // First launch
//           await AsyncStorage.setItem("alreadyLaunched", "true");
//           setIsFirstLaunch(true);
//         } else {
//           setIsFirstLaunch(false);
//         }
//       } catch (err) {
//         console.error("Error checking first launch", err);
//         setIsFirstLaunch(false);
//       }
//     };

//     checkFirstLaunch();
//   }, []);

//   // Show loading indicator while checking
//   if (isFirstLaunch === null) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <CartProvider>
//         <NavigationContainer>
//           <Stack.Navigator   screenOptions={{
//           headerStyle: {
//             backgroundColor: '#1E90FF', // header background color
//           },
//           headerTintColor: '#fff', // header text color
//           headerTitleStyle: {
//             fontWeight: 'bold',
//           },
//         }}>
//             {isFirstLaunch && (
//               <>
//                 <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
//                 <Stack.Screen name="Onboard1" component={OnboardScreen1} options={{ headerShown: false }} />
//                 <Stack.Screen name="Onboard2" component={OnboardScreen2} options={{ headerShown: false }} />
//                 <Stack.Screen name="Onboard3" component={OnboardScreen3} options={{ headerShown: false }} />
//                 <Stack.Screen name="Onboard4" component={OnboardScreen4} options={{ headerShown: false }} />
//               </>
//             )}

//              <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />

//             {/* Main App Screens */}
//             <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Customer" component={CustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Items" component={ItemsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="All Orders" component={OrdersScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order Details" component={OrderDetailsScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Order List" component={OrderListScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="QRScan" component={QRScanScreen} options={{ headerShown: false }} />
//             <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location" component={UpdateLocationScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Update Location Map" component={UpdateLocationMapScreen} options={{ headerShown: true }} />
//             <Stack.Screen name="Customers List" component={CustomerPaymentRecovery} options={{ headerShown: true }} />
//             <Stack.Screen name="Payment Recovery Form" component={PaymentRecoveryForm} options={{ headerShown: true }} />
//             <Stack.Screen name="All Payments" component={AllPaymentsScreen} options={{ headerShown: true }} />

//           </Stack.Navigator>
//         </NavigationContainer>
//       </CartProvider>
//     </GestureHandlerRootView>
//   );
// }






















// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import { initDB } from "./database";
// import { CartProvider } from "./context/CartContext";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { initRecentActivityTable } from './database';

// // Screens
// import WelcomeScreen from "./screens/WelcomeScreen";
// import OnboardScreen1 from "./screens/OnboardScreen1";
// import OnboardScreen2 from "./screens/OnboardScreen2";
// import OnboardScreen3 from "./screens/OnboardScreen3";
// import OnboardScreen4 from "./screens/OnboardScreen4";
// import QRScanScreen from "./screens/QRScanScreen";
// import HomeScreen from "./screens/HomeScreen";
// import CustomerScreen from "./screens/CustomerScreen";
// import AddCustomerScreen from "./screens/AddCustomerScreen";
// import ItemsScreen from "./screens/ItemsScreen";
// import OrdersScreen from "./screens/OrdersScreen";
// import OrderDetailsScreen from "./screens/OrderDetailsScreen";
// import OrderListScreen from "./screens/OrderListScreen";
// import AllRecentActivities from "./screens/AllRecentActivities";

// const Stack = createNativeStackNavigator();

// export default function App() {
//   useEffect(() => {
//     initDB(); // ✅ Initialize database once
//   }, []);

//   // const [ready, setReady] = useState(false);

//   // useEffect(() => {
//   //   (async () => {
//   //     await initDB();
//   //     setReady(true);
//   //   })();
//   // }, []);

//   // if (!ready) {
//   //   return (
//   //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//   //       <ActivityIndicator size="large" />
//   //     </View>
//   //   );
//   // }

//   useEffect(() => {
//   initRecentActivityTable();
// }, []);
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//     <CartProvider>
//       <NavigationContainer>
//         <Stack.Navigator>
//           <Stack.Screen
//             name="Welcome"
//             component={WelcomeScreen}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="Onboard1"
//             component={OnboardScreen1}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="Onboard2"
//             component={OnboardScreen2}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="Onboard3"
//             component={OnboardScreen3}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="Onboard4"
//             component={OnboardScreen4}
//             options={{ headerShown: false }}
//           />

//           <Stack.Screen
//             name="QRScan"
//             component={QRScanScreen}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="Home"
//             component={HomeScreen}
//             options={{ headerShown: false }}
//           />

//            <Stack.Screen
//             name="Customer"
//             component={CustomerScreen}
//             options={{ headerShown: true }}
//           />

//            <Stack.Screen
//             name="AddCustomer"
//             component={AddCustomerScreen}
//             options={{ headerShown: true }}
//           />

//              <Stack.Screen
//             name="Items"
//             component={ItemsScreen}
//             options={{ headerShown: true }}
//           />

//            <Stack.Screen
//             name="All Orders"
//             component={OrdersScreen}
//             options={{ headerShown: true }}
//           />

//             <Stack.Screen
//             name="Order Details"
//             component={OrderDetailsScreen}
//             options={{ headerShown: true }}
//           />

//             <Stack.Screen
//             name="Order List"
//             component={OrderListScreen}
//             options={{ headerShown: true }}
//           />

//           <Stack.Screen
//   name="AllRecentActivities"
//   component={AllRecentActivities}
//   options={{ headerShown: true }}
// />


//         </Stack.Navigator>
//       </NavigationContainer>
//     </CartProvider>
//     </GestureHandlerRootView>
//   );
// }
