const ExcelJS = require('exceljs');
const db = require('../config/db');

function normalizeHeader(value, index) {
  const text = String(value ?? '').trim();
  return text || `Column ${index + 1}`;
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function numberFromValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value ?? '')
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function getDerivedAmount(data) {
  const keys = Object.keys(data);
  const preferred = [
    'amount', 'donation_amount', 'total_amount', 'total',
    'paid_amount', 'paid', 'price', 'value', 'donation'
  ];
  for (const wanted of preferred) {
    const key = keys.find(k => normalizeKey(k) === wanted);
    if (key && numberFromValue(data[key]) !== 0) return numberFromValue(data[key]);
  }
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (/(amount|donation|total|paid|price|value)/.test(normalized)) {
      const n = numberFromValue(data[key]);
      if (n !== 0) return n;
    }
  }
  return 0;
}

function getDerivedQuantity(data) {
  const keys = Object.keys(data);
  for (const wanted of ['quantity', 'qty', 'count', 'number_of_tshirts', 'tshirt_quantity']) {
    const key = keys.find(k => normalizeKey(k) === wanted);
    if (key) {
      const n = Math.floor(numberFromValue(data[key]));
      return n > 0 ? n : 1;
    }
  }
  return 1;
}

async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('The Excel file does not contain a worksheet.');

  const headerRow = worksheet.getRow(1);
  const columns = [];
  const seen = new Set();

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    let header = normalizeHeader(cell.value, colNumber - 1);
    const original = header;
    let suffix = 2;
    while (seen.has(header.toLowerCase())) {
      header = `${original} ${suffix++}`;
    }
    seen.add(header.toLowerCase());
    columns.push(header);
  });

  if (!columns.length) throw new Error('The first row must contain column names.');

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const data = {};
    let hasValue = false;

    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      let value = cell.value;
      if (value && typeof value === 'object') {
        if (value.text !== undefined) value = value.text;
        else if (value.result !== undefined) value = value.result;
        else if (value.richText) value = value.richText.map(x => x.text).join('');
        else if (value.hyperlink) value = value.text || value.hyperlink;
      }
      if (value instanceof Date) value = value.toISOString();
      if (value !== null && value !== undefined && String(value).trim() !== '') hasValue = true;
      data[column] = value ?? '';
    });

    if (hasValue) {
      rows.push({
        row_number: rowNumber,
        data,
        amount: getDerivedAmount(data),
        quantity: getDerivedQuantity(data)
      });
    }
  }

  return { worksheetName: worksheet.name, columns, rows };
}

module.exports = {
  async renderExcelPage(req, res) {
    try {
      const sheets = await db.getOfflineExcelSheets();
      const onlineDonations = await db.getDonations();
      const onlineTshirtOrders = await db.getTshirtOrders();
      const selectedSheetId = req.query.sheet ? Number(req.query.sheet) : null;
      const selectedSheet = selectedSheetId ? sheets.find(s => Number(s.id) === selectedSheetId) : null;
      const selectedRows = selectedSheet ? await db.getOfflineExcelRows(selectedSheet.id) : [];

      res.render('admin/excel', {
        title: 'Excel & Offline Records | Malabar Hill Cha Raja',
        activeTab: 'admin',
        sheets,
        onlineDonations,
        onlineTshirtOrders,
        selectedSheet,
        selectedRows,
        query: req.query,
        error: null
      });
    } catch (err) {
      console.error('Excel page error:', err);
      res.status(500).send(`Excel page error: ${err.message}`);
    }
  },

  async uploadExcel(req, res) {
    try {
      if (!req.file) return res.redirect('/admin/excel?error=Please select an Excel file.');

      const recordType = req.body.record_type === 'tshirt' ? 'tshirt' : 'donation';
      const requestedName = String(req.body.sheet_name || '').trim();
      const parsed = await parseWorkbook(req.file.buffer);
      const sheetName = requestedName || parsed.worksheetName || 'Offline Records';

      if (!parsed.rows.length) {
        return res.redirect('/admin/excel?error=The Excel sheet contains no data rows.');
      }

      await db.createOfflineExcelSheet({
        sheet_name: sheetName,
        record_type: recordType,
        original_filename: req.file.originalname,
        columns: parsed.columns,
        rows: parsed.rows
      });

      res.redirect('/admin/excel?success=Excel sheet uploaded successfully.');
    } catch (err) {
      console.error('Excel upload error:', err);
      res.redirect(`/admin/excel?error=${encodeURIComponent(err.message || 'Failed to process Excel file.')}`);
    }
  },

  async deleteSheet(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) throw new Error('Invalid sheet ID.');
      await db.deleteOfflineExcelSheet(id);
      res.redirect('/admin/excel?success=Excel sheet deleted successfully.');
    } catch (err) {
      console.error('Excel delete error:', err);
      res.redirect(`/admin/excel?error=${encodeURIComponent(err.message)}`);
    }
  },

  async exportExcel(req, res) {
    try {
      const type = ['donation', 'tshirt', 'all'].includes(req.query.type) ? req.query.type : 'all';
      const sheets = await db.getOfflineExcelSheets();
      const filtered = type === 'all' ? sheets : sheets.filter(s => s.record_type === type);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Malabar Hill Cha Raja Admin';
      workbook.created = new Date();

      if (!filtered.length) {
        const ws = workbook.addWorksheet('No Records');
        ws.addRow(['No offline records available.']);
      } else {
        for (const sheet of filtered) {
          const safeName = String(sheet.sheet_name || 'Records').replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31) || 'Records';
          let name = safeName;
          let i = 2;
          while (workbook.getWorksheet(name)) name = `${safeName.slice(0, 27)} ${i++}`;
          const ws = workbook.addWorksheet(name);
          ws.addRow(['Record Type', sheet.record_type === 'donation' ? 'Offline Donation' : 'Offline T-Shirt']);
          ws.addRow(['Original File', sheet.original_filename]);
          ws.addRow([]);
          ws.addRow(sheet.columns);
          const rows = await db.getOfflineExcelRows(sheet.id);
          rows.forEach(row => ws.addRow(sheet.columns.map(c => row.data[c] ?? '')));
          ws.views = [{ state: 'frozen', ySplit: 4 }];
          ws.getRow(4).font = { bold: true };
          ws.columns.forEach(column => { column.width = Math.min(Math.max(column.width || 12, 12), 35); });
        }
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="mcc-offline-records-${type}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Excel export error:', err);
      res.status(500).send(`Excel export error: ${err.message}`);
    }
  },

  async exportCombined(req, res) {
    try {
      const donations = await db.getDonations();
      const tshirts = await db.getTshirtOrders();
      const offlineDonations = await db.getOfflineDonations();
      const offlineTshirts = await db.getOfflineTshirtOrders();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Malabar Hill Cha Raja Admin';

      const donationSheet = workbook.addWorksheet('All Donations');
      donationSheet.addRow(['Source', 'Receipt / Row', 'Name', 'Phone', 'Amount', 'Date']);
      donations.forEach(d => donationSheet.addRow(['Online', d.receipt_no, d.donor_name, d.phone, Number(d.amount) || 0, d.created_at || '']));
      offlineDonations.forEach(r => {
        const nameKey = Object.keys(r.data).find(k => /^(name|donor_name|donor|full_name)$/i.test(String(k).trim())) || Object.keys(r.data)[0];
        const phoneKey = Object.keys(r.data).find(k => /phone|mobile|contact/i.test(String(k))) || '';
        donationSheet.addRow(['Offline', `${r.sheet_name} / Row ${r.row_number}`, r.data[nameKey] || '', phoneKey ? r.data[phoneKey] : '', Number(r.amount) || 0, '']);
      });

      const tshirtSheet = workbook.addWorksheet('All T-Shirt Bookings');
      tshirtSheet.addRow(['Source', 'Receipt / Row', 'Name', 'Phone', 'Quantity', 'Amount', 'Date']);
      tshirts.forEach(o => tshirtSheet.addRow(['Online', o.receipt_no, o.buyer_name, o.phone, Number(o.quantity) || 0, Number(o.total_amount) || 0, o.created_at || '']));
      offlineTshirts.forEach(r => {
        const nameKey = Object.keys(r.data).find(k => /^(name|buyer_name|buyer|full_name)$/i.test(String(k).trim())) || Object.keys(r.data)[0];
        const phoneKey = Object.keys(r.data).find(k => /phone|mobile|contact/i.test(String(k))) || '';
        tshirtSheet.addRow(['Offline', `${r.sheet_name} / Row ${r.row_number}`, r.data[nameKey] || '', phoneKey ? r.data[phoneKey] : '', Number(r.quantity) || 1, Number(r.amount) || 0, '']);
      });

      for (const ws of [donationSheet, tshirtSheet]) {
        ws.getRow(1).font = { bold: true };
        ws.columns.forEach(c => { c.width = Math.min(Math.max(c.width || 12, 14), 32); });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="mcc-combined-online-offline-records.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Combined export error:', err);
      res.status(500).send(`Combined export error: ${err.message}`);
    }
  }
};
