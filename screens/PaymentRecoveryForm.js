import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import {
  addCustomerReceipt,
  updateCustomerReceipt,
  syncAttachments,
  insertAccounts,
  fetchLocalAccounts
} from '../db/database';
import { fetchAccountsFromAPI } from '../api/graphql';
import Toast from 'react-native-toast-message';
import { getDB } from '../db/dbManager';
import {fetchAccountsFromDB,fetchAccountsFromAPIAndDB} from '../utils/fetchAccountsFromAPIAndDB';


const { width } = Dimensions.get('window');

export default function PaymentRecoveryForm({ route, navigation }) {
  const { customerId, customerName, mode, receiptData } = route.params || {};

  const [selectedBank, setSelectedBank] = useState(null); // {id, name}
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState('');
  const isAttachmentUploaded = !!attachment;
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

  const [banks, setBanks] = useState([]); // {id, name}
  const [loadingBanks, setLoadingBanks] = useState(true);

  // Request camera/gallery permissions
  useEffect(() => {
    (async () => {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!camPerm.granted || !libPerm.granted) {
        Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
      }
    })();
  }, []);

 // Load banks dynamically (API + local DB)
  useEffect(() => {
    const loadBanks = async () => {
      setLoadingBanks(true);
      try {
        // 1️⃣ Load local accounts first
        const localBanks = await fetchAccountsFromDB();
        setBanks(localBanks);

        // 2️⃣ If online, fetch from API and upsert
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          const apiBanks = await fetchAccountsFromAPIAndDB();
          if (apiBanks?.length) {
            const db = getDB();
            // API already upserts inside fetchAccountsFromAPIAndDB
            setBanks(apiBanks.map(acc => ({ id: String(acc.account_id), name: acc.name || 'Unknown' })));
          }
        }
      } catch (error) {
        console.log('Error loading banks:', error);
      } finally {
        setLoadingBanks(false);
      }
    };

    loadBanks();
  }, []);


  // Pre-fill form if editing
  useEffect(() => {
    if (mode === 'edit' && receiptData) {
      setSelectedBank({
        id: String(receiptData.cash_bank_id || ''),
        name: receiptData.cash_bank_name || 'Unknown'
      });
      setAmount(receiptData.amount?.toString() ?? '');
      setNote(receiptData.note ?? '');
      setAttachment(receiptData.attachment ?? '');
    }
  }, [mode, receiptData]);

  const pickAttachment = async (fromCamera) => {
    try {
      let result;
      if (fromCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
        });
      }

      if (!result.canceled) {
        setAttachment(result.assets[0].uri);
        setAttachModalVisible(false);
      }
    } catch (error) {
      console.log('ImagePicker Error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const savePayment = async () => {
    if (!selectedBank?.id || !amount) {
      Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
      return;
    }

    const payload = {
      customer_id: customerId,
      cash_bank_id: selectedBank.id,
      cash_bank_name: selectedBank.name,
      amount: parseFloat(amount),
      note,
      attachment,
    };

    try {
      if (mode === 'edit' && receiptData?.id) {
        await updateCustomerReceipt({ ...payload, id: receiptData.id });
        Toast.show({ type: 'success', text1: 'Success', text2: 'Payment updated successfully!', position: 'top', visibilityTime: 3000 });
      } else {
        await addCustomerReceipt(payload);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!', position: 'top', visibilityTime: 3000 });
      }

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        syncAttachments();
      }

      navigation.replace('All Payments');
    } catch (error) {
      console.log('DB Save Error:', error);
      Alert.alert('Error', 'Failed to save payment.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

      {/* Customer */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Customer</Text>
        <TextInput value={customerName} style={styles.input} editable={false} />
      </View>

      {/* Cash/Bank */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cash/Bank Account</Text>
        <TouchableOpacity 
          style={styles.dropdown} 
          onPress={() => !loadingBanks && setBankDropdownVisible(true)}
        >
          <Text>{selectedBank?.name || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
          <Feather name="chevron-down" size={20} color="#555" />
        </TouchableOpacity>

        <Modal transparent visible={bankDropdownVisible} animationType="fade">
          <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.dropdownModal}>
                  <ScrollView>
                    {banks.map((bank, index) => (
                      <TouchableOpacity
                        key={`${bank.id}-${index}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedBank(bank);
                          setBankDropdownVisible(false);
                        }}
                      >
                        <Text>{bank.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {/* Amount */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          placeholder="Enter Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      {/* Note */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          placeholder="Optional Note"
          value={note}
          onChangeText={setNote}
          style={[styles.input, { height: 80 }]}
          multiline
        />
      </View>

      {/* Attachment */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Attachment</Text>
        <TouchableOpacity
  style={[
    styles.attachmentButton,
    isAttachmentUploaded && { backgroundColor: '#9CA3AF' } // gray when disabled
  ]}
  disabled={isAttachmentUploaded}
  onPress={() => setAttachModalVisible(true)}
>
  <Feather name="paperclip" size={20} color="#fff" />
  <Text style={styles.attachmentText}>
    {isAttachmentUploaded ? 'Attachment Uploaded' : 'Select Attachment'}
  </Text>
</TouchableOpacity>
{isAttachmentUploaded && (
  <Text style={styles.attachmentSuccessText}>
    Image uploaded successfully
  </Text>
)}

        {/* <TouchableOpacity
          style={styles.attachmentButton}
          onPress={() => setAttachModalVisible(true)}
        >
          <Feather name="paperclip" size={20} color="#fff" />
          <Text style={styles.attachmentText}>
            {attachment ? 'Attachment Selected' : 'Select Attachment'}
          </Text>
        </TouchableOpacity> */}

        <Modal transparent visible={attachModalVisible} animationType="fade">
          <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.attachModal}>
                  <View style={styles.attachRow}>
                    <TouchableOpacity
                      style={styles.attachOption}
                      onPress={() => pickAttachment(true)}
                    >
                      <MaterialIcons name="photo-camera" size={28} color="#333" />
                      <Text style={styles.attachOptionText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachOption}
                      onPress={() => pickAttachment(false)}
                    >
                      <MaterialIcons name="photo-library" size={28} color="#333" />
                      <Text style={styles.attachOptionText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
        <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
  attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
  attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  attachOption: { alignItems: 'center' },
  attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
  saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  attachmentSuccessText: {
  marginTop: 6,
  color: '#16A34A', // green
  fontSize: 14,
  fontWeight: '600',
},
});



// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import {
//   addCustomerReceipt,
//   updateCustomerReceipt,
//   syncAttachments,
//   insertAccounts,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from 'react-native-toast-message';
// import { getDB } from '../db/dbManager';


// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [selectedBank, setSelectedBank] = useState(null); // {id, name}
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const isAttachmentUploaded = !!attachment;
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const [banks, setBanks] = useState([]); // {id, name}
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//  // Load bank accounts from local DB and API
// useEffect(() => {
//   const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//     const localMap = {};
//     localAccounts.forEach(acc => { localMap[acc.id] = acc; });

//     return apiAccounts.filter(acc => {
//       const localAcc = localMap[String(acc.account_id || acc.id)];
//       if (!localAcc) return true;
//       if (localAcc.name !== acc.name) return true;
//       if (localAcc.account_type !== acc.account_type) return true;
//       if (localAcc.root_type !== acc.root_type) return true;
//       if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//       return false;
//     });
//   };

//  const normalizeBank = acc => ({
//   id: String(acc.id), 
//   name: acc.name || 'Unknown'
// });


//   const loadBanks = async () => {
//     setLoadingBanks(true);
//     try {
//       const localAccounts = await fetchLocalAccounts();
//       console.log("Local Banks:", localAccounts);

//       // Set local banks first
//       setBanks(localAccounts);

//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         const apiAccounts = await fetchAccountsFromAPI();
//         console.log("API Banks:", apiAccounts);

//         if (apiAccounts?.length) {
//           const db = getDB();
//           const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//           if (accountsToUpdate.length > 0) {
//             await insertAccounts(db, accountsToUpdate);
//           }

//           // Update UI with API banks
//           setBanks(apiAccounts.map(normalizeBank));
//         }
//       }
//     } catch (error) {
//       console.log("Error loading banks:", error);
//     } finally {
//       setLoadingBanks(false);
//     }
//   };

//   loadBanks();
// }, []);


//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setSelectedBank({
//         id: String(receiptData.cash_bank_id || ''),
//         name: receiptData.cash_bank_name || 'Unknown'
//       });
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!selectedBank?.id || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//       return;
//     }

//     const payload = {
//       customer_id: customerId,
//       cash_bank_id: selectedBank.id,
//       cash_bank_name: selectedBank.name,
//       amount: parseFloat(amount),
//       note,
//       attachment,
//     };

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({ ...payload, id: receiptData.id });
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment updated successfully!', position: 'top', visibilityTime: 3000 });
//       } else {
//         await addCustomerReceipt(payload);
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!', position: 'top', visibilityTime: 3000 });
//       }

//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         syncAttachments();
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           <Text>{selectedBank?.name || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={`${bank.id}-${index}`}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setSelectedBank(bank);
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank.name}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//   style={[
//     styles.attachmentButton,
//     isAttachmentUploaded && { backgroundColor: '#9CA3AF' } // gray when disabled
//   ]}
//   disabled={isAttachmentUploaded}
//   onPress={() => setAttachModalVisible(true)}
// >
//   <Feather name="paperclip" size={20} color="#fff" />
//   <Text style={styles.attachmentText}>
//     {isAttachmentUploaded ? 'Attachment Uploaded' : 'Select Attachment'}
//   </Text>
// </TouchableOpacity>
// {isAttachmentUploaded && (
//   <Text style={styles.attachmentSuccessText}>
//     Image uploaded successfully
//   </Text>
// )}

//         {/* <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity> */}

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
//   attachmentSuccessText: {
//   marginTop: 6,
//   color: '#16A34A', // green
//   fontSize: 14,
//   fontWeight: '600',
// },
// });





// Updated 22-12-2025
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments,
//   insertAccounts,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from "react-native-toast-message";
// import { getDB } from '../db/dbManager';
// import { v4 as uuidv4 } from 'uuid';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [selectedBank, setSelectedBank] = useState(null); // {id, name}
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const [banks, setBanks] = useState([]); // {id, name}
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Load bank accounts from local DB and API
//   useEffect(() => {
//     const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//       const localMap = {};
//       localAccounts.forEach(acc => { localMap[acc.id] = acc; });

//       return apiAccounts.filter(acc => {
//         const localAcc = localMap[acc.account_id];
//         if (!localAcc) return true;
//         if (localAcc.name !== acc.name) return true;
//         if (localAcc.account_type !== acc.account_type) return true;
//         if (localAcc.root_type !== acc.root_type) return true;
//         if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//         return false;
//       });
//     };

//     const loadBanks = async () => {
//       try {
//         const localAccounts = await fetchLocalAccounts();
//         if (localAccounts.length > 0) {
//           setBanks(localAccounts.map(acc => ({
//             id: acc.id,
//             name: acc.name || 'Unknown'
//           })));
//         }

//         const netState = await NetInfo.fetch();
//         if (netState.isConnected) {
//           const apiAccounts = await fetchAccountsFromAPI();
//           if (apiAccounts?.length) {
//             const db = getDB();
//             const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//             if (accountsToUpdate.length > 0) {
//               await insertAccounts(db, accountsToUpdate);
//             }

//             setBanks(apiAccounts.map(acc => ({
//               id: String(acc.account_id),
//               name: acc.name || 'Unknown'
//             })));
//           }
//         }
//       } catch (error) {
//         console.log("Error loading banks:", error);
//       } finally {
//         setLoadingBanks(false);
//       }
//     };

//     loadBanks();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setSelectedBank({
//         id: receiptData.cash_bank_id,
//         name: receiptData.cash_bank_name || 'Unknown'
//       });
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!selectedBank?.id || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//       return;
//     }

//     const payload = {
//       customer_id: customerId,
//       cash_bank_id: selectedBank.id,
//       cash_bank_name: selectedBank.name,
//       amount: parseFloat(amount),
//       note,
//       attachment,
//     };

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({ ...payload, id: receiptData.id });
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment updated successfully!', position: 'top', visibilityTime: 3000 });
//       } else {
//         await addCustomerReceipt(payload);
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!', position: 'top', visibilityTime: 3000 });
//       }

//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         syncAttachments();
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           <Text>{selectedBank?.name || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                    {banks.map((bank, index) => (
//   <TouchableOpacity
//     key={`${bank.id}-${index}`} // guaranteed unique
//     style={styles.dropdownItem}
//     onPress={() => {
//       setSelectedBank(bank);
//       setBankDropdownVisible(false);
//     }}
//   >
//     <Text>{bank.name}</Text>
//   </TouchableOpacity>
// ))}

//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });




// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments 
// } from '../db/database';
// import Toast from "react-native-toast-message";

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [cashBankId, setCashBankId] = useState('');
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const banks = [
//     'Habib Bank Limited',
//     'MCB Bank Limited',
//     'United Bank Limited',
//     'National Bank of Pakistan',
//     'Bank Alfalah',
//     'Standard Chartered',
//     'Faysal Bank',
//   ];

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setCashBankId(receiptData.cash_bank_id ?? '');
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!cashBankId || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank ID and Amount.');
//       return;
//     }

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({
//           id: receiptData.id,
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         // Alert.alert('Success', 'Payment updated successfully!');
//         Toast.show({
//   type: 'success',
//   text1: 'Success',
//   text2: 'Payment updated successfully!',
//   position: 'top',
//   visibilityTime: 3000,
// });
//       } else {
//         await addCustomerReceipt({
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         // Alert.alert('Success', 'Payment recorded successfully!');
//         Toast.show({
//   type: 'success',
//   text1: 'Success',
//   text2: 'Payment recorded successfully!',
//   position: 'top',
//   visibilityTime: 3000,
// });
//       }

//       // Check internet connection & sync attachments automatically
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         console.log('Online! Syncing attachments...');
//         syncAttachments(); // upload any unsynced images
//       } else {
//         console.log('Offline, attachment will be synced later.');
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity style={styles.dropdown} onPress={() => setBankDropdownVisible(true)}>
//           <Text>{cashBankId || 'Select Bank Account'}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank);
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });




// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments,
//   insertAccounts,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from "react-native-toast-message";
// import { getDB } from '../db/dbManager';
// import { v4 as uuidv4 } from 'uuid';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [selectedBank, setSelectedBank] = useState(null); // {id, name}
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const [banks, setBanks] = useState([]); // {id, name}
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Load bank accounts from local DB and API
//   useEffect(() => {
//     const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//       const localMap = {};
//       localAccounts.forEach(acc => { localMap[acc.id] = acc; });

//       return apiAccounts.filter(acc => {
//         const localAcc = localMap[acc.account_id];
//         if (!localAcc) return true;
//         if (localAcc.name !== acc.name) return true;
//         if (localAcc.account_type !== acc.account_type) return true;
//         if (localAcc.root_type !== acc.root_type) return true;
//         if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//         return false;
//       });
//     };

//     const loadBanks = async () => {
//       try {
//         const localAccounts = await fetchLocalAccounts();
//         if (localAccounts.length > 0) {
//           setBanks(localAccounts.map(acc => ({
//             id: acc.id,
//             name: acc.name || 'Unknown'
//           })));
//         }

//         const netState = await NetInfo.fetch();
//         if (netState.isConnected) {
//           const apiAccounts = await fetchAccountsFromAPI();
//           if (apiAccounts?.length) {
//             const db = getDB();
//             const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//             if (accountsToUpdate.length > 0) {
//               await insertAccounts(db, accountsToUpdate);
//             }

//             setBanks(apiAccounts.map(acc => ({
//               id: String(acc.account_id),
//               name: acc.name || 'Unknown'
//             })));
//           }
//         }
//       } catch (error) {
//         console.log("Error loading banks:", error);
//       } finally {
//         setLoadingBanks(false);
//       }
//     };

//     loadBanks();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setSelectedBank({
//         id: receiptData.cash_bank_id,
//         name: receiptData.cash_bank_name || 'Unknown'
//       });
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!selectedBank?.id || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//       return;
//     }

//     const payload = {
//       customer_id: customerId,
//       cash_bank_id: selectedBank.id,
//       cash_bank_name: selectedBank.name,
//       amount: parseFloat(amount),
//       note,
//       attachment,
//     };

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({ ...payload, id: receiptData.id });
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment updated successfully!', position: 'top', visibilityTime: 3000 });
//       } else {
//         await addCustomerReceipt(payload);
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!', position: 'top', visibilityTime: 3000 });
//       }

//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         syncAttachments();
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           <Text>{selectedBank?.name || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                    {banks.map((bank, index) => (
//   <TouchableOpacity
//     key={`${bank.id}-${index}`} // guaranteed unique
//     style={styles.dropdownItem}
//     onPress={() => {
//       setSelectedBank(bank);
//       setBankDropdownVisible(false);
//     }}
//   >
//     <Text>{bank.name}</Text>
//   </TouchableOpacity>
// ))}

//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });




// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments,
//   insertAccounts ,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from "react-native-toast-message";
// import { getDB } from '../db/dbManager';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};
// const [cashBankId, setCashBankId] = useState('');       // account_id
// const [cashBankName, setCashBankName] = useState('');   // account name
//   // const [cashBankId, setCashBankId] = useState(''); // store bank name
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   // const [banks, setBanks] = useState([]); // bank names for dropdown
//   const [banks, setBanks] = useState([]); 
// // each item: { account_id, name }
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Load bank accounts from API
// useEffect(() => {
//   const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//     const localMap = {};
//     localAccounts.forEach(acc => {
//       // localMap[acc.id] = acc;
//       localMap[acc.account_id] = acc;
//     });

//     // Return only accounts that are new or changed
//     return apiAccounts.filter(acc => {
//       const localAcc = localMap[acc.account_id];
//       if (!localAcc) return true; // new account
//       if (localAcc.name !== acc.name) return true;
//       if (localAcc.account_type !== acc.account_type) return true;
//       if (localAcc.root_type !== acc.root_type) return true;
//       if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//       return false; // unchanged
//     });
//   };

//   const loadBanks = async () => {
//     try {
//       const localAccounts = await fetchLocalAccounts();

//       if (localAccounts.length > 0) {
//         // Load from DB immediately
//         // setBanks(localAccounts.map(acc => acc.name));
//         setBanks(
//   localAccounts.map(acc => ({
//     account_id: acc.account_id,
//     name: acc.name,
//   }))
// );
//         console.log("✅ Loaded banks from local DB:", localAccounts);
//       }

//       // Check network
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         const apiAccounts = await fetchAccountsFromAPI();

//         if (apiAccounts?.length) {
//           const db = getDB();

//           // Only update/insert changed or new accounts
//           const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//           if (accountsToUpdate.length > 0) {
//             await insertAccounts(db, accountsToUpdate);
//             console.log("✅ Updated/Inserted accounts:", accountsToUpdate);
//           } else {
//             console.log("No changes, DB is up-to-date");
//           }

//           // Update state from API
//           // setBanks(apiAccounts.map(acc => acc.name));
//           setBanks(
//   apiAccounts.map(acc => ({
//     account_id: acc.account_id,
//     name: acc.name,
//   }))
// );

//         }
//       } else {
//         console.log("Offline: using local DB banks");
//       }
//     } catch (error) {
//       console.log("Error loading banks:", error);
//     } finally {
//       setLoadingBanks(false);
//     }
//   };

//   loadBanks();
// }, []);




//   // useEffect(() => {
//   //   const loadBanks = async () => {
//   //     try {
//   //       const accounts = await fetchAccountsFromAPI();
//   //       const names = accounts.map(acc => acc.name);
//   //       setBanks(names);
//   //     } catch (error) {
//   //       console.log("Error fetching bank accounts:", error);
//   //     } finally {
//   //       setLoadingBanks(false);
//   //     }
//   //   };

//   //   loadBanks();
//   // }, []);

//   // Pre-fill form if editing
//  useEffect(() => {
//   if (mode === 'edit' && receiptData) {
//     setCashBankId(
//       receiptData.cash_bank_id !== null
//         ? String(receiptData.cash_bank_id)
//         : ''
//     );
//     setCashBankName(receiptData.cash_bank_name || '');
//     setAmount(receiptData.amount?.toString() ?? '');
//     setNote(receiptData.note ?? '');
//     setAttachment(receiptData.attachment ?? '');
//   }
// }, [mode, receiptData]);


//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

// const savePayment = async () => {
//   if (
//     cashBankId.trim() === '' ||
//     cashBankName.trim() === '' ||
//     amount.trim() === '' ||
//     isNaN(Number(amount))
//   ) {
//     Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//     return;
//   }

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({
//   id: receiptData.id,
//   customer_id: customerId,
//   cash_bank_id: cashBankId,
//   cash_bank_name: cashBankName,
//   amount: parseFloat(amount),
//   note,
//   attachment,
// });


//         // await updateCustomerReceipt({
//         //   id: receiptData.id,
//         //   customer_id: customerId,
//         //   cash_bank_id: cashBankId, // store bank name
//         //   amount: parseFloat(amount),
//         //   note,
//         //   attachment,
//         // });
//         Toast.show({
//           type: 'success',
//           text1: 'Success',
//           text2: 'Payment updated successfully!',
//           position: 'top',
//           visibilityTime: 3000,
//         });
//       } else {
//         // await addCustomerReceipt({
//         //   customer_id: customerId,
//         //   cash_bank_id: cashBankId, // store bank name
//         //   amount: parseFloat(amount),
//         //   note,
//         //   attachment,
//         // });
//         await addCustomerReceipt({
//   customer_id: customerId,
//   cash_bank_id: cashBankId,          // ✅ ID
//   cash_bank_name: cashBankName,      // ✅ Name
//   amount: parseFloat(amount),
//   note,
//   attachment,
// });

//         Toast.show({
//           type: 'success',
//           text1: 'Success',
//           text2: 'Payment recorded successfully!',
//           position: 'top',
//           visibilityTime: 3000,
//         });
//       }

//       console.log({
//   cashBankId,
//   typeofCashBankId: typeof cashBankId,
//   cashBankName,
//   amount
// });


//       // Check internet connection & sync attachments automatically
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         console.log('Online! Syncing attachments...');
//         syncAttachments();
//       } else {
//         console.log('Offline, attachment will be synced later.');
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           {/* <Text>{cashBankId || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text> */}
//           <Text>
//   {cashBankName || (loadingBanks ? 'Loading...' : 'Select Bank Account')}
// </Text>

//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback 
//           onPress={() => {
//   setCashBankId(String(bank.account_id)); // ✅ FORCE STRING
//   setCashBankName(bank.name);
//   setBankDropdownVisible(false);
// }}
// >
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {/* {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank); // store name directly
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))} */}

//                    {banks.map((bank, index) => (
//   <TouchableOpacity
//     key={`${bank.account_id}-${index}`}
//     style={styles.dropdownItem}
//     onPress={() => {
//       setCashBankId(String(bank.account_id)); // important (see issue 2)
//       setCashBankName(bank.name);
//       setBankDropdownVisible(false);
//     }}
//   >
//     <Text>{bank.name}</Text>
//   </TouchableOpacity>
// ))}


//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });





// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments,
//   insertAccounts,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from "react-native-toast-message";
// import { getDB } from '../db/dbManager';
// import { v4 as uuidv4 } from 'uuid';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [selectedBank, setSelectedBank] = useState(null); // {id, name}
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const [banks, setBanks] = useState([]); // {id, name}
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Load bank accounts from local DB and API
//   useEffect(() => {
//     const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//       const localMap = {};
//       localAccounts.forEach(acc => { localMap[acc.id] = acc; });

//       return apiAccounts.filter(acc => {
//         const localAcc = localMap[acc.account_id];
//         if (!localAcc) return true;
//         if (localAcc.name !== acc.name) return true;
//         if (localAcc.account_type !== acc.account_type) return true;
//         if (localAcc.root_type !== acc.root_type) return true;
//         if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//         return false;
//       });
//     };

//     const loadBanks = async () => {
//       try {
//         const localAccounts = await fetchLocalAccounts();
//         if (localAccounts.length > 0) {
//           setBanks(localAccounts.map(acc => ({
//             id: acc.id,
//             name: acc.name || 'Unknown'
//           })));
//         }

//         const netState = await NetInfo.fetch();
//         if (netState.isConnected) {
//           const apiAccounts = await fetchAccountsFromAPI();
//           if (apiAccounts?.length) {
//             const db = getDB();
//             const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//             if (accountsToUpdate.length > 0) {
//               await insertAccounts(db, accountsToUpdate);
//             }

//             setBanks(apiAccounts.map(acc => ({
//               id: String(acc.account_id),
//               name: acc.name || 'Unknown'
//             })));
//           }
//         }
//       } catch (error) {
//         console.log("Error loading banks:", error);
//       } finally {
//         setLoadingBanks(false);
//       }
//     };

//     loadBanks();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setSelectedBank({
//         id: receiptData.cash_bank_id,
//         name: receiptData.cash_bank_name || 'Unknown'
//       });
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!selectedBank?.id || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//       return;
//     }

//     const payload = {
//       customer_id: customerId,
//       cash_bank_id: selectedBank.id,
//       cash_bank_name: selectedBank.name,
//       amount: parseFloat(amount),
//       note,
//       attachment,
//     };

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({ ...payload, id: receiptData.id });
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment updated successfully!', position: 'top', visibilityTime: 3000 });
//       } else {
//         await addCustomerReceipt(payload);
//         Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!', position: 'top', visibilityTime: 3000 });
//       }

//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         syncAttachments();
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           <Text>{selectedBank?.name || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                    {banks.map((bank, index) => (
//   <TouchableOpacity
//     key={`${bank.id}-${index}`} // guaranteed unique
//     style={styles.dropdownItem}
//     onPress={() => {
//       setSelectedBank(bank);
//       setBankDropdownVisible(false);
//     }}
//   >
//     <Text>{bank.name}</Text>
//   </TouchableOpacity>
// ))}

//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });



// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments,
//   insertAccounts ,
//   fetchLocalAccounts
// } from '../db/database';
// import { fetchAccountsFromAPI } from '../api/graphql';
// import Toast from "react-native-toast-message";
// import { getDB } from '../db/dbManager';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [cashBankId, setCashBankId] = useState(''); // store bank name
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const [banks, setBanks] = useState([]); // bank names for dropdown
//   const [loadingBanks, setLoadingBanks] = useState(true);

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Load bank accounts from API
// useEffect(() => {
//   const getUpdatedAccounts = (localAccounts, apiAccounts) => {
//     const localMap = {};
//     localAccounts.forEach(acc => {
//       localMap[acc.id] = acc;
//     });

//     // Return only accounts that are new or changed
//     return apiAccounts.filter(acc => {
//       const localAcc = localMap[acc.account_id];
//       if (!localAcc) return true; // new account
//       if (localAcc.name !== acc.name) return true;
//       if (localAcc.account_type !== acc.account_type) return true;
//       if (localAcc.root_type !== acc.root_type) return true;
//       if ((localAcc.is_group ? 1 : 0) !== (acc.is_group ? 1 : 0)) return true;
//       return false; // unchanged
//     });
//   };

//   const loadBanks = async () => {
//     try {
//       const localAccounts = await fetchLocalAccounts();

//       if (localAccounts.length > 0) {
//         // Load from DB immediately
//         setBanks(localAccounts.map(acc => acc.name));
//         console.log("✅ Loaded banks from local DB:", localAccounts);
//       }

//       // Check network
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         const apiAccounts = await fetchAccountsFromAPI();

//         if (apiAccounts?.length) {
//           const db = getDB();

//           // Only update/insert changed or new accounts
//           const accountsToUpdate = getUpdatedAccounts(localAccounts, apiAccounts);
//           if (accountsToUpdate.length > 0) {
//             await insertAccounts(db, accountsToUpdate);
//             console.log("✅ Updated/Inserted accounts:", accountsToUpdate);
//           } else {
//             console.log("No changes, DB is up-to-date");
//           }

//           // Update state from API
//           setBanks(apiAccounts.map(acc => acc.name));
//         }
//       } else {
//         console.log("Offline: using local DB banks");
//       }
//     } catch (error) {
//       console.log("Error loading banks:", error);
//     } finally {
//       setLoadingBanks(false);
//     }
//   };

//   loadBanks();
// }, []);




//   // useEffect(() => {
//   //   const loadBanks = async () => {
//   //     try {
//   //       const accounts = await fetchAccountsFromAPI();
//   //       const names = accounts.map(acc => acc.name);
//   //       setBanks(names);
//   //     } catch (error) {
//   //       console.log("Error fetching bank accounts:", error);
//   //     } finally {
//   //       setLoadingBanks(false);
//   //     }
//   //   };

//   //   loadBanks();
//   // }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setCashBankId(receiptData.cash_bank_id || '');
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!cashBankId || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank and Amount.');
//       return;
//     }

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({
//           id: receiptData.id,
//           customer_id: customerId,
//           cash_bank_id: cashBankId, // store bank name
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         Toast.show({
//           type: 'success',
//           text1: 'Success',
//           text2: 'Payment updated successfully!',
//           position: 'top',
//           visibilityTime: 3000,
//         });
//       } else {
//         await addCustomerReceipt({
//           customer_id: customerId,
//           cash_bank_id: cashBankId, // store bank name
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         Toast.show({
//           type: 'success',
//           text1: 'Success',
//           text2: 'Payment recorded successfully!',
//           position: 'top',
//           visibilityTime: 3000,
//         });
//       }

//       // Check internet connection & sync attachments automatically
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         console.log('Online! Syncing attachments...');
//         syncAttachments();
//       } else {
//         console.log('Offline, attachment will be synced later.');
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity 
//           style={styles.dropdown} 
//           onPress={() => !loadingBanks && setBankDropdownVisible(true)}
//         >
//           <Text>{cashBankId || (loadingBanks ? 'Loading...' : 'Select Bank Account')}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank); // store name directly
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });





// Updated 17-12-2025
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import NetInfo from '@react-native-community/netinfo';
// import { 
//   addCustomerReceipt, 
//   updateCustomerReceipt, 
//   syncAttachments 
// } from '../db/database';
// import Toast from "react-native-toast-message";

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [cashBankId, setCashBankId] = useState('');
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const banks = [
//     'Habib Bank Limited',
//     'MCB Bank Limited',
//     'United Bank Limited',
//     'National Bank of Pakistan',
//     'Bank Alfalah',
//     'Standard Chartered',
//     'Faysal Bank',
//   ];

//   // Request camera/gallery permissions
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setCashBankId(receiptData.cash_bank_id ?? '');
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!cashBankId || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank ID and Amount.');
//       return;
//     }

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         await updateCustomerReceipt({
//           id: receiptData.id,
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         // Alert.alert('Success', 'Payment updated successfully!');
//         Toast.show({
//   type: 'success',
//   text1: 'Success',
//   text2: 'Payment updated successfully!',
//   position: 'top',
//   visibilityTime: 3000,
// });
//       } else {
//         await addCustomerReceipt({
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         // Alert.alert('Success', 'Payment recorded successfully!');
//         Toast.show({
//   type: 'success',
//   text1: 'Success',
//   text2: 'Payment recorded successfully!',
//   position: 'top',
//   visibilityTime: 3000,
// });
//       }

//       // Check internet connection & sync attachments automatically
//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         console.log('Online! Syncing attachments...');
//         syncAttachments(); // upload any unsynced images
//       } else {
//         console.log('Offline, attachment will be synced later.');
//       }

//       navigation.replace('All Payments');
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity style={styles.dropdown} onPress={() => setBankDropdownVisible(true)}>
//           <Text>{cashBankId || 'Select Bank Account'}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank);
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });





// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Image,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import { addCustomerReceipt, updateCustomerReceipt } from '../db/database';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName, mode, receiptData } = route.params || {};

//   const [cashBankId, setCashBankId] = useState('');
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const banks = [
//     'Habib Bank Limited',
//     'MCB Bank Limited',
//     'United Bank Limited',
//     'National Bank of Pakistan',
//     'Bank Alfalah',
//     'Standard Chartered',
//     'Faysal Bank',
//   ];

//   // Request permissions on mount
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (mode === 'edit' && receiptData) {
//       setCashBankId(receiptData.cash_bank_id ?? '');
//       setAmount(receiptData.amount?.toString() ?? '');
//       setNote(receiptData.note ?? '');
//       setAttachment(receiptData.attachment ?? '');
//     }
//   }, [mode, receiptData]);

//   const pickAttachment = async (fromCamera) => {
//     try {
//       let result;
//       if (fromCamera) {
//         result = await ImagePicker.launchCameraAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       } else {
//         result = await ImagePicker.launchImageLibraryAsync({
//           mediaTypes: ImagePicker.MediaTypeOptions.Images,
//           quality: 0.7,
//           allowsEditing: false,
//         });
//       }

//       if (!result.canceled) {
//         setAttachment(result.assets[0].uri);
//         setAttachModalVisible(false);
//       }
//     } catch (error) {
//       console.log('ImagePicker Error:', error);
//       Alert.alert('Error', 'Failed to pick image.');
//     }
//   };

//   const savePayment = async () => {
//     if (!cashBankId || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank ID and Amount.');
//       return;
//     }

//     try {
//       if (mode === 'edit' && receiptData?.id) {
//         // Update existing payment
//         await updateCustomerReceipt({
//           id: receiptData.id,
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         Alert.alert('Success', 'Payment updated successfully!');
//       } else {
//         // Add new payment
//         await addCustomerReceipt({
//           customer_id: customerId,
//           cash_bank_id: cashBankId,
//           amount: parseFloat(amount),
//           note,
//           attachment,
//         });
//         Alert.alert('Success', 'Payment recorded successfully!');
//       }
//       navigation.replace("All Payments");
//     } catch (error) {
//       console.log('DB Save Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>{mode === 'edit' ? 'Edit Payment' : 'Payment Recovery'}</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity style={styles.dropdown} onPress={() => setBankDropdownVisible(true)}>
//           <Text>{cashBankId || 'Select Bank Account'}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank);
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Attachment</Text>
//         <TouchableOpacity
//           style={styles.attachmentButton}
//           onPress={() => setAttachModalVisible(true)}
//         >
//           <Feather name="paperclip" size={20} color="#fff" />
//           <Text style={styles.attachmentText}>
//             {attachment ? 'Attachment Selected' : 'Select Attachment'}
//           </Text>
//         </TouchableOpacity>

//         <Modal transparent visible={attachModalVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.attachModal}>
//                   <View style={styles.attachRow}>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(true)}
//                     >
//                       <MaterialIcons name="photo-camera" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Camera</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={styles.attachOption}
//                       onPress={() => pickAttachment(false)}
//                     >
//                       <MaterialIcons name="photo-library" size={28} color="#333" />
//                       <Text style={styles.attachOptionText}>Gallery</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update Payment' : 'Save Payment'}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });





// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TouchableWithoutFeedback,
//   Image,
//   Alert,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import { addCustomerReceipt } from '../db/database';

// const { width } = Dimensions.get('window');

// export default function PaymentRecoveryForm({ route, navigation }) {
//   const { customerId, customerName } = route.params;

//   const [cashBankId, setCashBankId] = useState('');
//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [attachment, setAttachment] = useState('');
//   const [attachModalVisible, setAttachModalVisible] = useState(false);
//   const [bankDropdownVisible, setBankDropdownVisible] = useState(false);

//   const banks = [
//     'Habib Bank Limited',
//     'MCB Bank Limited',
//     'United Bank Limited',
//     'National Bank of Pakistan',
//     'Bank Alfalah',
//     'Standard Chartered',
//     'Faysal Bank',
//   ];

//   // Request permissions on mount
//   useEffect(() => {
//     (async () => {
//       const camPerm = await ImagePicker.requestCameraPermissionsAsync();
//       const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!camPerm.granted || !libPerm.granted) {
//         Alert.alert('Permissions required', 'Camera and gallery permissions are required!');
//       }
//     })();
//   }, []);

//  const pickAttachment = async (fromCamera) => {
//   try {
//     let result;
//     if (fromCamera) {
//       result = await ImagePicker.launchCameraAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images, // just images
//         quality: 0.7,
//         allowsEditing: false, // no cropping
//       });
//     } else {
//       result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images, // just images
//         quality: 0.7,
//         allowsEditing: false, // no cropping
//       });
//     }

//     if (!result.canceled) {
//       setAttachment(result.assets[0].uri); // save URI only
//       setAttachModalVisible(false); // close modal
//     }
//   } catch (error) {
//     console.log('ImagePicker Error:', error);
//     Alert.alert('Error', 'Failed to pick image.');
//   }
// };


//   const savePayment = async () => {
//     if (!cashBankId || !amount) {
//       Alert.alert('Error', 'Please fill Cash/Bank ID and Amount.');
//       return;
//     }

//     try {
//       await addCustomerReceipt({
//         customer_id: customerId,
//         cash_bank_id: cashBankId,
//         amount: parseFloat(amount),
//         note,
//         attachment,
//       });
//       Alert.alert('Success', 'Payment recorded successfully!');
//       navigation.goBack();
//     } catch (error) {
//       console.log('DB Insert Error:', error);
//       Alert.alert('Error', 'Failed to save payment.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
//       <Text style={styles.header}>Payment Recovery</Text>

//       {/* Customer */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Customer</Text>
//         <TextInput value={customerName} style={styles.input} editable={false} />
//       </View>

//       {/* Cash/Bank */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Cash/Bank Account</Text>
//         <TouchableOpacity style={styles.dropdown} onPress={() => setBankDropdownVisible(true)}>
//           <Text>{cashBankId || 'Select Bank Account'}</Text>
//           <Feather name="chevron-down" size={20} color="#555" />
//         </TouchableOpacity>

//         <Modal transparent visible={bankDropdownVisible} animationType="fade">
//           <TouchableWithoutFeedback onPress={() => setBankDropdownVisible(false)}>
//             <View style={styles.modalOverlay}>
//               <TouchableWithoutFeedback>
//                 <View style={styles.dropdownModal}>
//                   <ScrollView>
//                     {banks.map((bank, index) => (
//                       <TouchableOpacity
//                         key={index}
//                         style={styles.dropdownItem}
//                         onPress={() => {
//                           setCashBankId(bank);
//                           setBankDropdownVisible(false);
//                         }}
//                       >
//                         <Text>{bank}</Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         </Modal>
//       </View>

//       {/* Amount */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Amount</Text>
//         <TextInput
//           placeholder="Enter Amount"
//           value={amount}
//           onChangeText={setAmount}
//           keyboardType="numeric"
//           style={styles.input}
//         />
//       </View>

//       {/* Note */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Note</Text>
//         <TextInput
//           placeholder="Optional Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 80 }]}
//           multiline
//         />
//       </View>

//       {/* Attachment */}
//      {/* Attachment */}
// <View style={styles.inputGroup}>
//   <Text style={styles.label}>Attachment</Text>
//   <TouchableOpacity style={styles.attachmentButton} onPress={() => setAttachModalVisible(true)}>
//     <Feather name="paperclip" size={20} color="#fff" />
//     <Text style={styles.attachmentText}>
//       {attachment ? 'Attachment Selected' : 'Select Attachment'}
//     </Text>
//   </TouchableOpacity>

//   {/* Removed preview image */}

//   <Modal transparent visible={attachModalVisible} animationType="fade">
//     <TouchableWithoutFeedback onPress={() => setAttachModalVisible(false)}>
//       <View style={styles.modalOverlay}>
//         <TouchableWithoutFeedback>
//           <View style={styles.attachModal}>
//             <View style={styles.attachRow}>
//               <TouchableOpacity style={styles.attachOption} onPress={() => pickAttachment(true)}>
//                 <MaterialIcons name="photo-camera" size={28} color="#333" />
//                 <Text style={styles.attachOptionText}>Camera</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.attachOption} onPress={() => pickAttachment(false)}>
//                 <MaterialIcons name="photo-library" size={28} color="#333" />
//                 <Text style={styles.attachOptionText}>Gallery</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </TouchableWithoutFeedback>
//       </View>
//     </TouchableWithoutFeedback>
//   </Modal>
// </View>


//       {/* Save */}
//       <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
//         <Text style={styles.saveButtonText}>Save Payment</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: width * 0.05, backgroundColor: '#f4f6f9' },
//   header: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
//   inputGroup: { marginBottom: 15 },
//   label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '700' },
//   input: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
//   dropdownModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, maxHeight: 250 },
//   dropdownItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
//   attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', padding: 12, borderRadius: 12 },
//   attachmentText: { color: '#fff', marginLeft: 10, fontSize: 16, flexShrink: 1 },
//   attachModal: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
//   attachRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   attachOption: { alignItems: 'center' },
//   attachOptionText: { marginTop: 5, fontSize: 16, color: '#333' },
//   attachmentPreview: { width: 120, height: 120, marginTop: 10, borderRadius: 12 },
//   saveButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
//   saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });