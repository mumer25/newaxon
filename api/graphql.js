import { getCurrentBaseUrl, getCurrentUserId } from "../db/dbManager";

export const getGraphQLUrl = async () => {
  const baseUrl = await getCurrentBaseUrl();
  if (!baseUrl) throw new Error("Base URL not found. Make sure openUserDB() was called.");
  return `${baseUrl}/api/graphql`;
};

// -------------------- FETCH CUSTOMERS --------------------
export const fetchCustomersFromAPI = async () => {
  try {
    const GRAPHQL_URL = await getGraphQLUrl();
    const companyIdStr = await getCurrentUserId();
    if (!companyIdStr) throw new Error("Company ID not found. Make sure openUserDB() was called.");
    const companyId = parseInt(companyIdStr, 10);

    const query = `
      query Customer($companyId: Int) {
        Customer(company_id: $companyId) {
          entity_id
          name
          phone
          email
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();

    if (json.errors) {
      console.error("GraphQL Customer errors:", json.errors);
      return [];
    }
    
    return json.data.Customer || [];
  } catch (error) {
    console.error("API Customer fetch error:", error);
    return [];
  }


};



// -------------------- FETCH ACCOUNTS --------------------
export const fetchAccountsFromAPI = async () => {
  try {
    const GRAPHQL_URL = await getGraphQLUrl();
    const companyIdStr = await getCurrentUserId();
    if (!companyIdStr) throw new Error("Company ID not found.");
    const companyId = parseInt(companyIdStr, 10);

    const query = `
      query AccountsForBank($companyId: Int!) {
        accountsForBank(company_id: $companyId) {
          account_id
          name
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();

    if (json.errors) {
      console.error("GraphQL Accounts errors:", json.errors);
      return [];
    }

    // Map to consistent format: { id, name }
    return (json.data?.accountsForBank ?? []).map(acc => ({
      id: acc.account_id,
      name: acc.name ?? "Unnamed Account",
    }));
  } catch (error) {
    console.error("API Accounts fetch error:", error);
    return [];
  }
};



// -------------------- FETCH ITEMS --------------------

// export const fetchItemsFromAPI = async () => {
//   try {
//     const GRAPHQL_URL = await getGraphQLUrl();
//     const companyId = parseInt(await getCurrentUserId(), 10);

//     const query = `
//       query Items($companyId: Int) {
//         items(company_id: $companyId) {
//           item_id
//           name
//           item_type
//           retail_price
//           image_path
//           item_balance
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId } }),
//     });

//     const json = await response.json();

//     if (json.errors) {
//       console.error("GraphQL Items errors:", json.errors);
//       return [];
//     }

//     // Map API fields with defaults to avoid nulls
//     const mappedItems = (json.data?.items ?? []).map(item => ({
//       id: item.item_id ?? Math.random().toString(), // fallback ID
//       name: item.name ?? "Unnamed Item",
//       type: item.item_type ?? "Unknown",
//       price: item.retail_price ?? 0,
//       image: item.image_path ?? null,
//       stock: item.item_balance ?? 0,
//     }));

//     return mappedItems;
//   } catch (error) {
//     console.error("API Items fetch error:", error);
//     return [];
//   }
// };









// Updated 15-12-2025
// export const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";
// export const COMPANY_ID = 1; // replace with actual company ID

// // -------------------- FETCH CUSTOMERS --------------------
// export const fetchCustomersFromAPI = async () => {
//   try {
//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId: COMPANY_ID } }),
//     });

//     const json = await response.json();

//     if (json.errors) {
//       console.error("GraphQL errors:", json.errors);
//       return [];
//     }

//     return json.data.Customer || [];
//   } catch (error) {
//     console.error("API fetch error:", error);
//     return [];
//   }
// };

// // -------------------- FETCH ITEMS --------------------
// export const fetchItemsFromAPI = async () => {
//   try {
//     const query = `
//       query Items($companyId: Int) {
//         items(company_id: $companyId) {
//           item_id
//           name
//           item_type
//           retail_price
//           image_path
//           item_balance
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId: COMPANY_ID } }),
//     });

//     const json = await response.json();

//     if (json.errors) {
//       console.error("GraphQL Items errors:", json.errors);
//       return [];
//     }

//     return json.data?.items ?? [];
//   } catch (error) {
//     console.error("API Items fetch error:", error);
//     return [];
//   }
// };