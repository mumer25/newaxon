import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform, StyleSheet, TextInput, KeyboardAvoidingView, Dimensions } from 'react-native';
import { getAllCustomers, searchCustomers } from '../db/database'; // your existing db functions
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function CustomerPaymentRecovery({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await getAllCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      fetchCustomers();
    } else {
      const results = await searchCustomers(text);
      setCustomers(results);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getAvatarColor = (name) => {
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D4EDD', '#FF6EC7'];
    const charCode = name.charCodeAt(0) - 65;
    return colors[charCode % colors.length];
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => navigation.navigate('Payment Recovery Form', { customerId: item.entity_id, customerName: item.name })}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, padding: 10 }}>

          {/* Search Bar */}
          {/* <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
          </View> */}
          {/* Search Bar */}
<View style={styles.searchContainer}>
  <TextInput
    style={styles.searchInput}
    placeholder="Search customer..."
    value={searchQuery}
    onChangeText={handleSearch}
    placeholderTextColor="#888"
  />

  {searchQuery.length === 0 ? (
    // Show search icon when input is empty
    <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
  ) : (
    // Show cross icon when there is text
    <TouchableOpacity onPress={() => handleSearch('')}>
      <Feather name="x" size={20} color="#888" style={styles.searchIcon} />
    </TouchableOpacity>
  )}
</View>


          {/* Customer List */}
          <FlatList
            data={customers}
            keyExtractor={(item) => item.entity_id.toString()}
            renderItem={renderCustomerItem}
            contentContainerStyle={{ paddingBottom: 80 }} // space for button
            showsVerticalScrollIndicator={false}
          />

          {/* View All Payments Button */}
          <TouchableOpacity
            style={styles.viewPaymentsButton}
            onPress={() => navigation.replace('All Payments')} // Replace with your screen name for all payments
          >
            <Text style={styles.viewPaymentsButtonText}>View All Payments</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  avatar: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: (width * 0.12) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  viewPaymentsButton: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPaymentsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, TouchableOpacity, ActivityIndicator,Platform, StyleSheet, TextInput,KeyboardAvoidingView, Dimensions } from 'react-native';
// import { getAllCustomers, searchCustomers } from '../database'; // your existing db functions
// import { Feather } from '@expo/vector-icons';
// import { SafeAreaView } from 'react-native-safe-area-context';

// const { width } = Dimensions.get('window');

// export default function CustomerPaymentRecovery({ navigation }) {
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');

//   const fetchCustomers = async () => {
//     setLoading(true);
//     const data = await getAllCustomers();
//     setCustomers(data);
//     setLoading(false);
//   };

//   const handleSearch = async (text) => {
//     setSearchQuery(text);
//     if (text.trim() === '') {
//       fetchCustomers();
//     } else {
//       const results = await searchCustomers(text);
//       setCustomers(results);
//     }
//   };

//   useEffect(() => {
//     fetchCustomers();
//   }, []);

//   const getAvatarColor = (name) => {
//     // Generate color based on name
//     const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D4EDD', '#FF6EC7'];
//     const charCode = name.charCodeAt(0) - 65;
//     return colors[charCode % colors.length];
//   };

//   const renderCustomerItem = ({ item }) => {
//     return (
//       <TouchableOpacity
//         style={styles.customerItem}
//         onPress={() => navigation.navigate('Payment Recovery Form', { customerId: item.entity_id, customerName: item.name })}
//       >
//         <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
//           <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
//         </View>
//         <View style={styles.customerInfo}>
//           <Text style={styles.customerName}>{item.name}</Text>
//           <Text style={styles.customerPhone}>{item.phone}</Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   if (loading) return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;

//   return (
//      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
//           <KeyboardAvoidingView
//             style={{ flex: 1 }}
//             behavior={Platform.OS === "ios" ? "padding" : undefined}
//           >
//     <View style={{ flex: 1, padding: 10 }}>
//       {/* Search Bar */}
//       <View style={styles.searchContainer}>
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search customer..."
//           value={searchQuery}
//           onChangeText={handleSearch}
//         />
//         <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
//       </View>

//       {/* Customer List */}
//       <FlatList
//         data={customers}
//         keyExtractor={(item) => item.entity_id.toString()}
//         renderItem={renderCustomerItem}
//         contentContainerStyle={{ paddingBottom: 0 }}
//       />
//     </View>
//     </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     backgroundColor: '#fff',
//   },
//   searchInput: {
//     flex: 1,
//     height: 40,
//     fontSize: 16,
//   },
//   searchIcon: {
//     marginLeft: 10,
//   },
//   customerItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     marginBottom: 8,
//     backgroundColor: '#f9f9f9',
//     borderRadius: 12,
//     elevation: 1, // shadow for Android
//     shadowColor: '#000', // shadow for iOS
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 1 },
//     shadowRadius: 2,
//   },
//   avatar: {
//     width: width * 0.12,
//     height: width * 0.12,
//     borderRadius: (width * 0.12) / 2,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   avatarText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   customerInfo: {
//     flex: 1,
//     justifyContent: 'center',
//   },
//   customerName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   customerPhone: {
//     fontSize: 14,
//     color: '#555',
//     marginTop: 2,
//   },
// });
