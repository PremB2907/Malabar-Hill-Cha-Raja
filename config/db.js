const mysql = require('mysql2/promise');
require('dotenv').config();

// In-memory fallback data store for offline / demo execution
const mockStore = {
  passes: [
    {
      id: 1,
      pass_code: 'MCC-2026-8942',
      full_name: 'Rahul Ramesh Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@example.com',
      age: 34,
      gender: 'Male',
      city: 'Malabar Hill',
      batch: 'VIP Mandap Entry & Aarti Pass',
      emergency_contact: '9876543211',
      id_proof_type: 'Aadhaar Card',
      id_proof_number: 'XXXX-XXXX-4812',
      status: 'Confirmed',
      created_at: new Date('2026-07-20T10:30:00Z')
    },
    {
      id: 2,
      pass_code: 'MCC-2026-9104',
      full_name: 'Priya Sunil Patil',
      phone: '9123456789',
      email: 'priya.patil@example.com',
      age: 28,
      gender: 'Female',
      city: 'Byculla, Mumbai',
      batch: 'Karyakarta / Sevak Pass',
      emergency_contact: '9123456780',
      id_proof_type: 'PAN Card',
      id_proof_number: 'ABCDE1234F',
      status: 'Confirmed',
      created_at: new Date('2026-07-21T14:15:00Z')
    }
  ],
  donations: [
    {
      id: 1,
      receipt_no: 'MCC-REC-2026-101',
      donor_name: 'Anand V. Deshmukh',
      phone: '9988776655',
      email: 'anand.deshmukh@example.com',
      amount: 5001,
      gross_amount: 5001,
      net_amount: 4900.98,
      category: 'Modak & Mahaprasad Seva',
      payment_id: 'pay_Mock101MCC',
      order_id: 'order_Mock101Order',
      pan_number: 'APZPD8923K',
      status: 'SUCCESS',
      created_at: new Date('2026-07-19T09:00:00Z')
    },
    {
      id: 2,
      receipt_no: 'MCC-REC-2026-102',
      donor_name: 'Sunita M. Kulkarni',
      phone: '9876123456',
      email: 'sunita.k@example.com',
      amount: 2100,
      gross_amount: 2100,
      net_amount: 2058,
      category: 'Mandap & Pushpa Alankar Seva',
      payment_id: 'pay_Mock102MCC',
      order_id: 'order_Mock102Order',
      pan_number: 'BKPKS4129L',
      status: 'SUCCESS',
      created_at: new Date('2026-07-22T16:45:00Z')
    }
  ],
  tshirt_orders: [
    {
      id: 1,
      receipt_no: 'MCC-TSHIRT-2026-101',
      buyer_name: 'Vikram A. Salunkhe',
      phone: '9820098200',
      email: 'vikram.salunkhe@example.com',
      size: 'L',
      color: 'Royal Maroon',
      quantity: 2,
      total_amount: 998,
      address: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
      payment_id: 'pay_MockTshirt101',
      status: 'SUCCESS',
      created_at: new Date('2026-07-25T11:20:00Z')
    }
  ],
  offline_excel_sheets: [],
  offline_excel_rows: [],
  yatra_status: {
    current_day: 3,
    total_days: 10,
    current_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007 (Mandap Darshan Open)',
    next_location: 'Maha Aarti & Evening Mahaprasad (8:00 PM)',
    distance_covered_km: 100,
    total_distance_km: 100,
    active_varkaris: 35000,
    meals_served_today: 18500,
    last_updated: new Date()
  },
  logs: [
    { id: 1, type: 'SYSTEM', message: 'Malabar Hill Cha Raja Portal Initialized', timestamp: new Date() }
  ]
};

let dbPool = null;
let useMock = false;

async function initDB() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'saileela_palkhi',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    dbPool = pool;
    console.log('✅ Connected to MySQL Database successfully.');

    // Create tables if they do not exist
    await createTables(dbPool);
  } catch (err) {
    console.log('⚠️ MySQL connection omitted or unavailable. Running with high-performance In-Memory Data Store.');
    useMock = true;
  }
}

async function createTables(pool) {
  const createPassesTable = `
    CREATE TABLE IF NOT EXISTS passes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pass_code VARCHAR(50) UNIQUE NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100),
      age INT NOT NULL,
      gender VARCHAR(20) NOT NULL,
      city VARCHAR(100) NOT NULL,
      batch VARCHAR(100) NOT NULL,
      emergency_contact VARCHAR(20) NOT NULL,
      id_proof_type VARCHAR(50) NOT NULL,
      id_proof_number VARCHAR(50) NOT NULL,
      status VARCHAR(30) DEFAULT 'Confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createDonationsTable = `
    CREATE TABLE IF NOT EXISTS donations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receipt_no VARCHAR(50) UNIQUE NOT NULL,
      donor_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100),
      amount DECIMAL(10,2) NOT NULL,
      gross_amount DECIMAL(10,2) NOT NULL,
      net_amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      payment_id VARCHAR(100),
      order_id VARCHAR(100),
      pan_number VARCHAR(20),
      status VARCHAR(30) DEFAULT 'SUCCESS',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTshirtOrdersTable = `
    CREATE TABLE IF NOT EXISTS tshirt_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receipt_no VARCHAR(50) UNIQUE NOT NULL,
      buyer_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100),
      size VARCHAR(20) NOT NULL,
      color VARCHAR(30) NOT NULL,
      quantity INT NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      address TEXT,
      payment_id VARCHAR(100),
      status VARCHAR(30) DEFAULT 'SUCCESS',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createOfflineSheetsTable = `
    CREATE TABLE IF NOT EXISTS offline_excel_sheets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sheet_name VARCHAR(150) NOT NULL,
      record_type VARCHAR(30) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      columns_json LONGTEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createOfflineRowsTable = `
    CREATE TABLE IF NOT EXISTS offline_excel_rows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sheet_id INT NOT NULL,
      row_number INT NOT NULL,
      data_json LONGTEXT NOT NULL,
      amount DECIMAL(12,2) DEFAULT 0,
      quantity INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_offline_sheet (sheet_id),
      CONSTRAINT fk_offline_sheet FOREIGN KEY (sheet_id)
        REFERENCES offline_excel_sheets(id) ON DELETE CASCADE
    );
  `;

  try {
    await pool.query(createPassesTable);
    await pool.query(createDonationsTable);
    await pool.query('ALTER TABLE donations ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0');
    await pool.query('ALTER TABLE donations ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) NOT NULL DEFAULT 0');
    await pool.query(createTshirtOrdersTable);
    await pool.query(createOfflineSheetsTable);
    await pool.query(createOfflineRowsTable);
    console.log('✅ MySQL schema initialized.');
  } catch (err) {
    console.error('Error creating database tables:', err.message);
  }
}

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

// Data Access API
module.exports = {
  initDB,
  isMock: () => useMock,
  mockStore,

  async getPasses() {
    if (useMock) return mockStore.passes;
    try {
      const [rows] = await dbPool.query('SELECT * FROM passes ORDER BY created_at DESC');
      return rows;
    } catch (err) {
      return mockStore.passes;
    }
  },

  async getPassByCode(code) {
    if (useMock) {
      return mockStore.passes.find(p => p.pass_code.toUpperCase() === code.toUpperCase());
    }
    try {
      const [rows] = await dbPool.query('SELECT * FROM passes WHERE UPPER(pass_code) = UPPER(?)', [code]);
      return rows[0] || null;
    } catch (err) {
      return mockStore.passes.find(p => p.pass_code.toUpperCase() === code.toUpperCase());
    }
  },

  async getPassByPhone(phone) {
    if (useMock) {
      return mockStore.passes.find(p => p.phone === phone);
    }
    try {
      const [rows] = await dbPool.query('SELECT * FROM passes WHERE phone = ? ORDER BY created_at DESC', [phone]);
      return rows[0] || null;
    } catch (err) {
      return mockStore.passes.find(p => p.phone === phone);
    }
  },

  async createPass(passData) {
    if (useMock) {
      const newPass = {
        id: mockStore.passes.length + 1,
        ...passData,
        created_at: new Date()
      };
      mockStore.passes.unshift(newPass);
      return newPass;
    }
    try {
      const query = `
        INSERT INTO passes (pass_code, full_name, phone, email, age, gender, city, batch, emergency_contact, id_proof_type, id_proof_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        passData.pass_code, passData.full_name, passData.phone, passData.email || '',
        passData.age, passData.gender, passData.city, passData.batch,
        passData.emergency_contact, passData.id_proof_type, passData.id_proof_number,
        passData.status || 'Confirmed'
      ];
      const [result] = await dbPool.query(query, values);
      return { id: result.insertId, ...passData, created_at: new Date() };
    } catch (err) {
      console.error('MySQL insert pass error:', err.message);
      const newPass = { id: mockStore.passes.length + 1, ...passData, created_at: new Date() };
      mockStore.passes.unshift(newPass);
      return newPass;
    }
  },

  async getDonations() {
    if (useMock) return mockStore.donations;
    try {
      const [rows] = await dbPool.query('SELECT * FROM donations ORDER BY created_at DESC');
      return rows;
    } catch (err) {
      return mockStore.donations;
    }
  },

  async getDonationByReceipt(receiptNo) {
    if (useMock) {
      return mockStore.donations.find(d => d.receipt_no.toUpperCase() === receiptNo.toUpperCase());
    }
    try {
      const [rows] = await dbPool.query('SELECT * FROM donations WHERE UPPER(receipt_no) = UPPER(?)', [receiptNo]);
      return rows[0] || null;
    } catch (err) {
      return mockStore.donations.find(d => d.receipt_no.toUpperCase() === receiptNo.toUpperCase());
    }
  },

  async createDonation(donationData) {
    if (useMock) {
      const newDonation = {
        id: mockStore.donations.length + 1,
        ...donationData,
        created_at: new Date()
      };
      mockStore.donations.unshift(newDonation);
      return newDonation;
    }
    try {
      const query = `
        INSERT INTO donations (receipt_no, donor_name, phone, email, amount, gross_amount, net_amount, category, payment_id, order_id, pan_number, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        donationData.receipt_no, donationData.donor_name, donationData.phone, donationData.email || '',
        donationData.amount, donationData.gross_amount || donationData.amount,
        donationData.net_amount || donationData.amount * 0.98, donationData.category, donationData.payment_id || '',
        donationData.order_id || '', donationData.pan_number || '', donationData.status || 'SUCCESS'
      ];
      const [result] = await dbPool.query(query, values);
      return { id: result.insertId, ...donationData, created_at: new Date() };
    } catch (err) {
      console.error('MySQL insert donation error:', err.message);
      const newDonation = { id: mockStore.donations.length + 1, ...donationData, created_at: new Date() };
      mockStore.donations.unshift(newDonation);
      return newDonation;
    }
  },


  async getTshirtOrders() {
    if (useMock) return mockStore.tshirt_orders || [];
    try {
      const [rows] = await dbPool.query('SELECT * FROM tshirt_orders ORDER BY created_at DESC');
      return rows;
    } catch (err) {
      return mockStore.tshirt_orders || [];
    }
  },

  async getOfflineExcelSheets() {
    if (useMock) return mockStore.offline_excel_sheets || [];
    try {
      const [rows] = await dbPool.query('SELECT * FROM offline_excel_sheets ORDER BY uploaded_at DESC');
      return rows.map(row => ({
        ...row,
        columns: safeJsonParse(row.columns_json, []),
        uploaded_at: row.uploaded_at
      }));
    } catch (err) {
      return mockStore.offline_excel_sheets || [];
    }
  },

  async getOfflineExcelRows(sheetId = null) {
    if (useMock) {
      const rows = mockStore.offline_excel_rows || [];
      return sheetId ? rows.filter(r => Number(r.sheet_id) === Number(sheetId)) : rows;
    }
    try {
      let rows;
      if (sheetId) {
        [rows] = await dbPool.query('SELECT * FROM offline_excel_rows WHERE sheet_id = ? ORDER BY row_number ASC', [sheetId]);
      } else {
        [rows] = await dbPool.query('SELECT * FROM offline_excel_rows ORDER BY sheet_id DESC, row_number ASC');
      }
      return rows.map(row => ({
        ...row,
        data: safeJsonParse(row.data_json, {})
      }));
    } catch (err) {
      const rows = mockStore.offline_excel_rows || [];
      return sheetId ? rows.filter(r => Number(r.sheet_id) === Number(sheetId)) : rows;
    }
  },

  async getOfflineRecords(recordType = null) {
    const sheets = await this.getOfflineExcelSheets();
    const filteredSheets = recordType ? sheets.filter(s => s.record_type === recordType) : sheets;
    const result = [];
    for (const sheet of filteredSheets) {
      const rows = await this.getOfflineExcelRows(sheet.id);
      for (const row of rows) result.push({ ...row, sheet_name: sheet.sheet_name, record_type: sheet.record_type, columns: sheet.columns });
    }
    return result;
  },

  async createOfflineExcelSheet({ sheet_name, record_type, original_filename, columns, rows }) {
    if (useMock) {
      const sheetId = (mockStore.offline_excel_sheets || []).length + 1;
      const sheet = {
        id: sheetId,
        sheet_name,
        record_type,
        original_filename,
        columns,
        uploaded_at: new Date()
      };
      mockStore.offline_excel_sheets.unshift(sheet);
      for (const row of rows) {
        mockStore.offline_excel_rows.push({
          id: mockStore.offline_excel_rows.length + 1,
          sheet_id: sheetId,
          row_number: row.row_number,
          data: row.data,
          amount: row.amount || 0,
          quantity: row.quantity || 1,
          created_at: new Date()
        });
      }
      return sheet;
    }

    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      const [sheetResult] = await conn.query(
        'INSERT INTO offline_excel_sheets (sheet_name, record_type, original_filename, columns_json) VALUES (?, ?, ?, ?)',
        [sheet_name, record_type, original_filename, JSON.stringify(columns)]
      );
      const sheetId = sheetResult.insertId;
      for (const row of rows) {
        await conn.query(
          'INSERT INTO offline_excel_rows (sheet_id, row_number, data_json, amount, quantity) VALUES (?, ?, ?, ?, ?)',
          [sheetId, row.row_number, JSON.stringify(row.data), row.amount || 0, row.quantity || 1]
        );
      }
      await conn.commit();
      return { id: sheetId, sheet_name, record_type, original_filename, columns, uploaded_at: new Date() };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async deleteOfflineExcelSheet(sheetId) {
    if (useMock) {
      mockStore.offline_excel_sheets = (mockStore.offline_excel_sheets || []).filter(s => Number(s.id) !== Number(sheetId));
      mockStore.offline_excel_rows = (mockStore.offline_excel_rows || []).filter(r => Number(r.sheet_id) !== Number(sheetId));
      return true;
    }
    await dbPool.query('DELETE FROM offline_excel_sheets WHERE id = ?', [sheetId]);
    return true;
  },

  async getOfflineDonations() {
    return this.getOfflineRecords('donation');
  },

  async getOfflineTshirtOrders() {
    return this.getOfflineRecords('tshirt');
  },

  async getTshirtOrderByReceipt(receiptNo) {
    if (useMock) {
      return (mockStore.tshirt_orders || []).find(d => d.receipt_no.toUpperCase() === receiptNo.toUpperCase());
    }
    try {
      const [rows] = await dbPool.query('SELECT * FROM tshirt_orders WHERE UPPER(receipt_no) = UPPER(?)', [receiptNo]);
      return rows[0] || null;
    } catch (err) {
      return (mockStore.tshirt_orders || []).find(d => d.receipt_no.toUpperCase() === receiptNo.toUpperCase());
    }
  },

  async createTshirtOrder(orderData) {
    if (useMock) {
      const newOrder = {
        id: (mockStore.tshirt_orders || []).length + 1,
        ...orderData,
        created_at: new Date()
      };
      if (!mockStore.tshirt_orders) mockStore.tshirt_orders = [];
      mockStore.tshirt_orders.unshift(newOrder);
      return newOrder;
    }
    try {
      const query = `
        INSERT INTO tshirt_orders (receipt_no, buyer_name, phone, email, size, color, quantity, total_amount, address, payment_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        orderData.receipt_no, orderData.buyer_name, orderData.phone, orderData.email || '',
        orderData.size, orderData.color, orderData.quantity, orderData.total_amount,
        orderData.address || '', orderData.payment_id || '', orderData.status || 'SUCCESS'
      ];
      const [result] = await dbPool.query(query, values);
      return { id: result.insertId, ...orderData, created_at: new Date() };
    } catch (err) {
      const newOrder = { id: (mockStore.tshirt_orders || []).length + 1, ...orderData, created_at: new Date() };
      if (!mockStore.tshirt_orders) mockStore.tshirt_orders = [];
      mockStore.tshirt_orders.unshift(newOrder);
      return newOrder;
    }
  },

  getYatraStatus() {
    return mockStore.yatra_status;
  },

  addLog(type, message) {
    const log = { id: mockStore.logs.length + 1, type, message, timestamp: new Date() };
    mockStore.logs.unshift(log);
    return log;
  },

  getLogs() {
    return mockStore.logs;
  }
};
