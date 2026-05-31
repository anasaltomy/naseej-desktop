import type Database from "better-sqlite3";

/** Seeds the database with initial demo data. Each section checks the row count and skips if data already exists. */
export function seedDatabase(db: Database.Database): void {
  seedMerchantConfig(db);
  seedStaff(db);
  seedBrands(db);
  seedColors(db);
  seedSizes(db);
  seedCategories(db);
  seedLocations(db);
  seedProducts(db);
  seedInventoryLevels(db);
  seedCustomers(db);
  seedOrders(db);
  seedDailySummary(db);
  seedRoles(db);
  seedUsers(db);
  seedVariantTypes(db);
  seedDiscountCodes(db);
}

function count(db: Database.Database, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get() as { n: number };
  return row.n;
}

function seedMerchantConfig(db: Database.Database): void {
  if (count(db, "merchant_config") > 0) return;
  const insert = db.prepare("INSERT INTO merchant_config (key, value) VALUES (?, ?)");
  const configs = [
    ["name", "Naseej"],
    ["location", "Riyadh - Olaya Branch"],
    ["currency", "SAR"],
    ["taxRate", "0.15"],
    ["taxLabel", "VAT (15%)"],
    ["receiptHeader", "Thank you for shopping at Naseej"],
    ["receiptFooter", "Returns accepted within 14 days with receipt"],
  ];
  const seedAll = db.transaction(() => {
    for (const [key, value] of configs) {
      insert.run(key, value);
    }
  });
  seedAll();
}

function seedStaff(db: Database.Database): void {
  if (count(db, "staff") > 0) return;
  const insert = db.prepare(
    "INSERT INTO staff (id, first_name, last_name, email, role, pin) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insert.run("u1", "Ahmad", "Al-Rashidi", "ahmad@naseej.sa", "store_manager", "1234");
    insert.run("u2", "Sara", "Al-Otaibi", "sara@naseej.sa", "cashier", "5678");
    insert.run("u3", "Khalid", "Al-Shammari", "khalid@naseej.sa", "senior_cashier", "9012");
  });
  seedAll();
}

function seedBrands(db: Database.Database): void {
  if (count(db, "brands") > 0) return;
  const insert = db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)");
  const data = [
    ["b1", "Nike"], ["b2", "Adidas"], ["b3", "Zara"], ["b4", "H&M"],
    ["b5", "Uniqlo"], ["b6", "Massimo Dutti"], ["b7", "Mango"],
    ["b8", "Levi's"], ["b9", "Tommy Hilfiger"], ["b10", "Calvin Klein"],
    ["b11", "Naseej"],
  ];
  const seedAll = db.transaction(() => { for (const [id, name] of data) insert.run(id, name); });
  seedAll();
}

function seedColors(db: Database.Database): void {
  if (count(db, "colors") > 0) return;
  const insert = db.prepare("INSERT INTO colors (id, name, hex_code) VALUES (?, ?, ?)");
  const data = [
    ["c1", "Black", "#000000"], ["c2", "White", "#FFFFFF"], ["c3", "Navy", "#1E3A5F"],
    ["c4", "Red", "#DC2626"], ["c5", "Forest Green", "#166534"], ["c6", "Camel", "#C19A6B"],
    ["c7", "Burgundy", "#800020"], ["c8", "Sky Blue", "#87CEEB"], ["c9", "Charcoal", "#36454F"],
    ["c10", "Olive", "#808000"], ["c11", "Blush Pink", "#DE5D83"], ["c12", "Sand", "#C2B280"],
    ["c13", "Beige", "#C8B89A"],
  ];
  const seedAll = db.transaction(() => { for (const [id, name, hex] of data) insert.run(id, name, hex); });
  seedAll();
}

function seedSizes(db: Database.Database): void {
  if (count(db, "sizes") > 0) return;
  const insert = db.prepare("INSERT INTO sizes (id, name, sort_order) VALUES (?, ?, ?)");
  const data = [
    ["s1", "XS", 1], ["s2", "S", 2], ["s3", "M", 3], ["s4", "L", 4], ["s5", "XL", 5],
    ["s6", "XXL", 6], ["s7", "28", 7], ["s8", "30", 8], ["s9", "32", 9], ["s10", "34", 10],
    ["s11", "36", 11], ["s12", "37", 12], ["s13", "38", 13], ["s14", "39", 14],
    ["s15", "40", 15], ["s16", "41", 16], ["s17", "42", 17], ["s18", "43", 18],
    ["s19", "44", 19], ["s20", "One Size", 20],
  ];
  const seedAll = db.transaction(() => { for (const [id, name, ord] of data) insert.run(id, name, ord); });
  seedAll();
}

function seedCategories(db: Database.Database): void {
  if (count(db, "categories") > 0) return;
  const insertCat = db.prepare(
    "INSERT INTO categories (id, name, slug, parent_id, has_standard_sizes) VALUES (?, ?, ?, ?, ?)"
  );
  const insertCatSize = db.prepare(
    "INSERT INTO category_sizes (category_id, size_id) VALUES (?, ?)"
  );
  const seedAll = db.transaction(() => {
    insertCat.run("cat-mens", "Men", "men", null, 1);
    insertCatSize.run("cat-mens", "s2"); insertCatSize.run("cat-mens", "s3");
    insertCatSize.run("cat-mens", "s4"); insertCatSize.run("cat-mens", "s5"); insertCatSize.run("cat-mens", "s6");

    insertCat.run("cat-womens", "Women", "women", null, 1);
    insertCatSize.run("cat-womens", "s1"); insertCatSize.run("cat-womens", "s2");
    insertCatSize.run("cat-womens", "s3"); insertCatSize.run("cat-womens", "s4"); insertCatSize.run("cat-womens", "s5");

    insertCat.run("cat-shirts", "Shirts", "shirts", "cat-mens", 0);
    insertCat.run("cat-pants", "Pants", "pants", "cat-mens", 1);
    insertCatSize.run("cat-pants", "s7"); insertCatSize.run("cat-pants", "s8");
    insertCatSize.run("cat-pants", "s9"); insertCatSize.run("cat-pants", "s10");

    insertCat.run("cat-dresses", "Dresses", "dresses", "cat-womens", 0);
    insertCat.run("cat-accessories", "Accessories", "accessories", null, 0);
    insertCat.run("cat-footwear", "Footwear", "footwear", null, 1);
    insertCatSize.run("cat-footwear", "s15"); insertCatSize.run("cat-footwear", "s16");
    insertCatSize.run("cat-footwear", "s17"); insertCatSize.run("cat-footwear", "s18"); insertCatSize.run("cat-footwear", "s19");

    insertCat.run("cat-abayas", "Abayas", "abayas", "cat-womens", 1);
    insertCatSize.run("cat-abayas", "s1"); insertCatSize.run("cat-abayas", "s2");
    insertCatSize.run("cat-abayas", "s3"); insertCatSize.run("cat-abayas", "s4");
  });
  seedAll();
}

function seedLocations(db: Database.Database): void {
  if (count(db, "locations") > 0) return;
  const insert = db.prepare(
    "INSERT INTO locations (id, name, city, address, phone) VALUES (?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insert.run("loc1", "Main Store", "Riyadh", "King Fahd Rd, Al Olaya", "+966 11 234 5678");
    insert.run("loc2", "Downtown Branch", "Riyadh", "Tahlia St, Al Sulaymaniyah", "+966 11 345 6789");
    insert.run("loc3", "East Warehouse", "Dammam", "Industrial Area 2", "+966 13 456 7890");
  });
  seedAll();
}

function seedProducts(db: Database.Database): void {
  if (count(db, "products") > 0) return;
  const insertProd = db.prepare(
    "INSERT INTO products (id, name, sku, barcode, brand_id, category_id) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertVar = db.prepare(
    "INSERT INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price, compare_at_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insertProd.run("p1", "Slim Fit Oxford Shirt", "SH-OXF", "6291012345001", "b11", "cat-shirts");
    insertVar.run("v1", "p1", "SH-OXF-S-WHT", "6291012345001", "S", "White", "#FFFFFF", 149, 199);
    insertVar.run("v2", "p1", "SH-OXF-M-WHT", "6291012345002", "M", "White", "#FFFFFF", 149, 199);
    insertVar.run("v3", "p1", "SH-OXF-L-NAV", "6291012345003", "L", "Navy", "#1E3A5F", 149, null);

    insertProd.run("p2", "Classic Chino Pants", "PT-CHN", "6291012346001", "b11", "cat-pants");
    insertVar.run("v4", "p2", "PT-CHN-30-BEI", "6291012346001", "30", "Beige", "#C8B89A", 229, 280);
    insertVar.run("v5", "p2", "PT-CHN-32-BEI", "6291012346002", "32", "Beige", "#C8B89A", 229, null);
    insertVar.run("v6", "p2", "PT-CHN-32-OLV", "6291012346003", "32", "Olive", "#6B7C45", 229, null);

    insertProd.run("p3", "Premium Leather Belt", "BT-LTH", "6291012347001", "b11", "cat-accessories");
    insertVar.run("v7", "p3", "BT-LTH-M-BLK", "6291012347001", "M", "Black", "#1A1A1A", 89, null);

    insertProd.run("p4", "Floral Abaya", "AB-FLR", "6291012348001", "b11", "cat-abayas");
    insertVar.run("v8", "p4", "AB-FLR-S-BLK", "6291012348001", "S", "Black", "#0A0A0A", 349, 420);
    insertVar.run("v9", "p4", "AB-FLR-M-BLK", "6291012348002", "M", "Black", "#0A0A0A", 349, null);

    insertProd.run("p5", "Urban Sneakers", "SN-URB", "6291012349001", "b11", "cat-footwear");
    insertVar.run("v10", "p5", "SN-URB-42-WHT", "6291012349001", "42", "White", "#F5F5F5", 299, null);
    insertVar.run("v11", "p5", "SN-URB-43-BLK", "6291012349002", "43", "Black", "#1A1A1A", 299, 350);
  });
  seedAll();
}

function seedInventoryLevels(db: Database.Database): void {
  if (count(db, "inventory_levels") > 0) return;
  const insert = db.prepare(
    "INSERT INTO inventory_levels (id, variant_id, location_id, qty, low_stock_threshold) VALUES (?, ?, ?, ?, ?)"
  );
  const variants = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10", "v11"];
  const stockQty: Record<string, number> = {
    v1: 12, v2: 8, v3: 5, v4: 7, v5: 4, v6: 9, v7: 20, v8: 3, v9: 6, v10: 2, v11: 5,
  };
  let idx = 0;
  const seedAll = db.transaction(() => {
    for (const vid of variants) {
      insert.run(`il-${idx++}`, vid, "loc1", stockQty[vid], 5);
      insert.run(`il-${idx++}`, vid, "loc2", Math.floor(Math.random() * 15), 5);
      insert.run(`il-${idx++}`, vid, "loc3", Math.floor(Math.random() * 20), 5);
    }
  });
  seedAll();
}

function seedCustomers(db: Database.Database): void {
  if (count(db, "customers") > 0) return;
  const insert = db.prepare(
    "INSERT INTO customers (id, first_name, last_name, email, phone, loyalty_points, total_orders, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insert.run("c1", "Nora", "Al-Harbi", "nora@email.com", "+966 50 111 2233", 1240, 18, 4720);
    insert.run("c2", "Fahad", "Al-Dosari", "fahad@email.com", "+966 55 887 6612", 340, 5, 1180);
    insert.run("c3", "Maha", "Al-Ghamdi", "maha@email.com", "+966 56 330 8871", 780, 11, 2890);
  });
  seedAll();
}

function seedOrders(db: Database.Database): void {
  if (count(db, "orders") > 0) return;
  const insertOrder = db.prepare(
    "INSERT INTO orders (id, receipt_number, staff_name, customer_id, customer_name, payment_method, subtotal, tax_amount, discount_amount, total, status, channel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertItem = db.prepare(
    "INSERT INTO order_items (id, order_id, product_name, size, color, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insertOrder.run("o1", "POS-2026-0834", "Ahmad Al-Rashidi", "c1", "Nora Al-Harbi", "CARD", 527, 79.05, 0, 606.05, "completed", "POS", "2026-05-18T09:14:22Z");
    insertItem.run("oi1", "o1", "Slim Fit Oxford Shirt", "M", "White", 2, 149, 298);
    insertItem.run("oi2", "o1", "Classic Chino Pants", "32", "Beige", 1, 229, 229);

    insertOrder.run("o2", "POS-2026-0833", "Sara Al-Otaibi", null, null, "CASH", 89, 13.35, 0, 102.35, "completed", "POS", "2026-05-18T08:57:03Z");
    insertItem.run("oi3", "o2", "Premium Leather Belt", "M", "Black", 1, 89, 89);

    insertOrder.run("o3", "POS-2026-0832", "Ahmad Al-Rashidi", "c2", "Fahad Al-Dosari", "SPLIT", 448, 67.2, 44.8, 470.4, "completed", "POS", "2026-05-18T08:31:47Z");
    insertItem.run("oi4", "o3", "Urban Sneakers", "43", "Black", 1, 299, 299);
    insertItem.run("oi5", "o3", "Slim Fit Oxford Shirt", "L", "Navy", 1, 149, 149);

    insertOrder.run("o4", "POS-2026-0831", "Khalid Al-Shammari", "c3", "Maha Al-Ghamdi", "LOYALTY", 349, 52.35, 0, 401.35, "completed", "POS", "2026-05-18T07:55:19Z");
    insertItem.run("oi6", "o4", "Floral Abaya", "M", "Black", 1, 349, 349);

    insertOrder.run("o5", "POS-2026-0830", "Sara Al-Otaibi", null, null, "CASH", 318, 47.7, 31.8, 333.9, "refunded", "POS", "2026-05-18T07:22:08Z");
    insertItem.run("oi7", "o5", "Classic Chino Pants", "30", "Beige", 1, 229, 229);
    insertItem.run("oi8", "o5", "Premium Leather Belt", "M", "Black", 1, 89, 89);
  });
  seedAll();
}

function seedDailySummary(db: Database.Database): void {
  if (count(db, "daily_summaries") > 0) return;
  db.prepare(
    "INSERT INTO daily_summaries (date, total_sales, transaction_count, items_sold, cash_sales, card_sales, refunds_total, opening_cash, closing_cash, variance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("2026-05-18", 1914.05, 34, 52, 762.05, 1152, 333.9, 500, 1228, -34.05);
}

function seedRoles(db: Database.Database): void {
  if (count(db, "roles") > 0) return;
  const insert = db.prepare(
    "INSERT INTO roles (id, name, description, permissions, user_count) VALUES (?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insert.run("r1", "Admin", "Full system access", JSON.stringify(["pos:sell", "pos:refund", "pos:end_of_day", "pos:discount", "catalog:view", "catalog:create", "catalog:edit", "catalog:delete", "inventory:view", "inventory:edit", "users:view", "users:manage", "reports:view"]), 1);
    insert.run("r2", "Store Manager", "Manages daily operations and staff", JSON.stringify(["pos:sell", "pos:refund", "pos:end_of_day", "pos:discount", "catalog:view", "catalog:edit", "inventory:view", "inventory:edit", "reports:view"]), 2);
    insert.run("r3", "Cashier", "Point of sale operations only", JSON.stringify(["pos:sell", "catalog:view", "inventory:view"]), 4);
  });
  seedAll();
}

function seedUsers(db: Database.Database): void {
  if (count(db, "users") > 0) return;
  const insert = db.prepare(
    "INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insert.run("usr1", "Ahmed Al-Rashid", "ahmed@naseej.com", "+966 55 123 4567", "Admin", "active");
    insert.run("usr2", "Sara Mohammed", "sara@naseej.com", "+966 55 234 5678", "Cashier", "active");
    insert.run("usr3", "Omar Hassan", "omar@naseej.com", "+966 55 345 6789", "Store Manager", "active");
    insert.run("usr4", "Layla Abdullah", "layla@naseej.com", "+966 55 456 7890", "Cashier", "inactive");
  });
  seedAll();
}

function seedVariantTypes(db: Database.Database): void {
  if (count(db, "variant_types") > 0) return;
  const insertType = db.prepare("INSERT INTO variant_types (id, name) VALUES (?, ?)");
  const insertVal = db.prepare(
    "INSERT INTO variant_type_values (id, variant_type_id, value) VALUES (?, ?, ?)"
  );
  const seedAll = db.transaction(() => {
    insertType.run("vt1", "Size");
    const sizeVals = ["XS", "S", "M", "L", "XL", "XXL"];
    sizeVals.forEach((v, i) => insertVal.run(`vtv-1-${i}`, "vt1", v));

    insertType.run("vt2", "Color");
    const colorVals = ["Black", "White", "Navy", "Gray", "Red", "Blue"];
    colorVals.forEach((v, i) => insertVal.run(`vtv-2-${i}`, "vt2", v));

    insertType.run("vt3", "Material");
    const matVals = ["Cotton", "Polyester", "Linen", "Silk"];
    matVals.forEach((v, i) => insertVal.run(`vtv-3-${i}`, "vt3", v));

    insertType.run("vt4", "Length");
    const lenVals = ["Short", "Regular", "Long"];
    lenVals.forEach((v, i) => insertVal.run(`vtv-4-${i}`, "vt4", v));
  });
  seedAll();
}

function seedDiscountCodes(db: Database.Database): void {
  if (count(db, "discount_codes") > 0) return;
  const insert = db.prepare(
    "INSERT INTO discount_codes (id, code, type, value, min_order) VALUES (?, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    insert.run("dc1", "SAVE10",    "percentage", 10,  0);
    insert.run("dc2", "FLAT50",    "fixed",      50,  200);
    insert.run("dc3", "WELCOME15", "percentage", 15,  100);
  })();
}
