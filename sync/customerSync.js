import { db } from "../db/customerTable";
import { fetchCustomersFromAPI } from "../api/graphql";

export const saveCustomersToDB = async (customers) => {
  const query = `
    INSERT INTO customer (
      entity_id,
      name,
      phone,
      email,
      address,
      created_date,
      sequence_id,
      entity_code,
      is_customer,
      company_id,
      province,
      registration_type,
      ntn_number
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      email = excluded.email,
      address = excluded.address,
      created_date = excluded.created_date,
      sequence_id = excluded.sequence_id,
      entity_code = excluded.entity_code,
      is_customer = excluded.is_customer,
      company_id = excluded.company_id,
      province = excluded.province,
      registration_type = excluded.registration_type,
      ntn_number = excluded.ntn_number
  `;

  for (const c of customers) {
    await db.runAsync(query, [
      c.entity_id,
      c.name,
      c.phone,
      c.email,
      c.address,
      c.created_date,
      c.sequence_id,
      c.entity_code,
      c.is_customer,
      c.company_id,
      c.province,
      c.registration_type,
      c.ntn_number,
    ]);
  }

  console.log("Customers synced to SQLite");
};

export const syncCustomers = async (companyId, token) => {
  const customers = await fetchCustomersFromAPI(companyId, token);
  if (customers?.length > 0) {
    await saveCustomersToDB(customers);
  }
};
