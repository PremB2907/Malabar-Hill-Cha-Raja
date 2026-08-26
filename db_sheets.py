import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

class GoogleSheetsDB:
    def __init__(self, credentials_path="credentials.json"):
        self.credentials_path = credentials_path
        self.client = None
        self.spreadsheet = None
        
        # Schema Definitions (Worksheet name -> Header columns)
        self.schemas = {
            "passes": [
                "id", "pass_code", "full_name", "phone", "email", "age", "gender", 
                "city", "batch", "emergency_contact", "id_proof_type", "id_proof_number", 
                "status", "created_at"
            ],
            "donations": [
                "id", "receipt_no", "donor_name", "phone", "email", "amount", 
                "gross_amount", "net_amount", "category", "payment_id", "order_id", 
                "pan_number", "status", "created_at"
            ],
            "tshirt_orders": [
                "id", "receipt_no", "buyer_name", "phone", "email", "size", "color", 
                "quantity", "total_amount", "address", "payment_id", "status", "created_at"
            ],
            "dbt_receipts": [
                "id", "reference_id", "donor_name", "phone", "email", "amount", 
                "transaction_ref", "original_filename", "stored_filename", "file_path", 
                "status", "created_at"
            ],
            "offline_excel_sheets": [
                "id", "sheet_name", "record_type", "original_filename", "columns_json", "uploaded_at"
            ],
            "offline_excel_rows": [
                "id", "sheet_id", "row_number", "data_json", "amount", "quantity", "created_at"
            ],
            "yatra_status": [
                "current_day", "total_days", "current_location", "next_location", 
                "distance_covered_km", "total_distance_km", "active_varkaris", 
                "meals_served_today", "last_updated"
            ],
            "logs": [
                "id", "type", "message", "timestamp"
            ]
        }

    def init_db(self):
        """Authenticate, open or create spreadsheet, and initialize all worksheets."""
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive"
        ]
        
        # Verify credentials file exists
        if not os.path.exists(self.credentials_path):
            raise FileNotFoundError(f"Google credentials file not found at: {self.credentials_path}")

        creds = ServiceAccountCredentials.from_json_keyfile_name(self.credentials_path, scope)
        self.client = gspread.authorize(creds)

        # 1. Open or create the spreadsheet
        sheet_id = os.environ.get("GOOGLE_SHEET_ID")
        sheet_name = "Malabar Hill Cha Raja Data"

        if sheet_id:
            try:
                self.spreadsheet = self.client.open_by_key(sheet_id)
                print(f"✅ Connected to Google Sheet by key: {sheet_id}")
            except Exception as e:
                print(f"⚠️ Error opening by key {sheet_id}: {e}. Falling back to name search.")

        if not self.spreadsheet:
            try:
                self.spreadsheet = self.client.open(sheet_name)
                print(f"✅ Connected to Google Sheet: {sheet_name}")
            except gspread.SpreadsheetNotFound:
                # Create spreadsheet if not found
                self.spreadsheet = self.client.create(sheet_name)
                print(f"✨ Created new Google Sheet: {sheet_name}")
                
                # Share with SMTP_USER so it's visible in Google Drive
                admin_email = os.environ.get("SMTP_USER")
                if admin_email:
                    try:
                        self.spreadsheet.share(admin_email, perm_type='user', role='writer')
                        print(f"📬 Shared Google Sheet with {admin_email}")
                    except Exception as err:
                        print(f"⚠️ Failed to share sheet: {err}")

        # 2. Check and initialize each worksheet
        for title, headers in self.schemas.items():
            try:
                worksheet = self.spreadsheet.worksheet(title)
                # Verify headers match
                existing_headers = worksheet.row_values(1)
                if not existing_headers:
                    worksheet.append_row(headers)
            except gspread.WorksheetNotFound:
                worksheet = self.spreadsheet.add_worksheet(title=title, rows="100", cols=str(len(headers)))
                worksheet.append_row(headers)
                print(f"   Initialized worksheet: {title}")

        # Initialize yatra_status with defaults if empty
        status_sheet = self.spreadsheet.worksheet("yatra_status")
        if len(status_sheet.get_all_values()) <= 1:
            default_status = [
                3, 10, 
                "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007 (Mandap Darshan Open)",
                "Maha Aarti & Evening Mahaprasad (8:00 PM)",
                100, 100, 35000, 18500,
                datetime.now().isoformat()
            ]
            status_sheet.append_row(default_status)
            print("   Seeded default live Yatra status.")

    def _get_worksheet(self, name):
        if not self.spreadsheet:
            self.init_db()
        return self.spreadsheet.worksheet(name)

    def _get_next_id(self, worksheet):
        """Helper to get next auto-incrementing ID."""
        records = worksheet.get_all_records()
        if not records:
            return 1
        ids = []
        for r in records:
            val = r.get("id")
            if val is not None and str(val).isdigit():
                ids.append(int(val))
        return max(ids) + 1 if ids else 1

    # PASSES
    def get_passes(self):
        ws = self._get_worksheet("passes")
        return ws.get_all_records()

    def get_pass_by_code(self, code):
        records = self.get_passes()
        for p in records:
            if str(p.get("pass_code", "")).upper() == str(code).upper():
                return p
        return None

    def get_pass_by_phone(self, phone):
        records = self.get_passes()
        matched = [p for p in records if str(p.get("phone", "")) == str(phone)]
        if matched:
            # Sort by created_at desc (or position in list)
            return matched[-1]
        return None

    def create_pass(self, pass_data):
        ws = self._get_worksheet("passes")
        new_id = self._get_next_id(ws)
        row = {
            "id": new_id,
            "pass_code": pass_data.get("pass_code", ""),
            "full_name": pass_data.get("full_name", ""),
            "phone": pass_data.get("phone", ""),
            "email": pass_data.get("email", ""),
            "age": pass_data.get("age", 0),
            "gender": pass_data.get("gender", ""),
            "city": pass_data.get("city", ""),
            "batch": pass_data.get("batch", ""),
            "emergency_contact": pass_data.get("emergency_contact", ""),
            "id_proof_type": pass_data.get("id_proof_type", ""),
            "id_proof_number": pass_data.get("id_proof_number", ""),
            "status": pass_data.get("status", "Confirmed"),
            "created_at": datetime.now().isoformat()
        }
        headers = self.schemas["passes"]
        ws.append_row([row[h] for h in headers])
        return row

    # DONATIONS
    def get_donations(self):
        ws = self._get_worksheet("donations")
        return ws.get_all_records()

    def get_donation_by_receipt(self, receipt_no):
        records = self.get_donations()
        for d in records:
            if str(d.get("receipt_no", "")).upper() == str(receipt_no).upper():
                return d
        return None

    def create_donation(self, donation_data):
        ws = self._get_worksheet("donations")
        new_id = self._get_next_id(ws)
        row = {
            "id": new_id,
            "receipt_no": donation_data.get("receipt_no", ""),
            "donor_name": donation_data.get("donor_name", ""),
            "phone": donation_data.get("phone", ""),
            "email": donation_data.get("email", ""),
            "amount": donation_data.get("amount", 0.0),
            "gross_amount": donation_data.get("gross_amount", donation_data.get("amount", 0.0)),
            "net_amount": donation_data.get("net_amount", donation_data.get("amount", 0.0)),
            "category": donation_data.get("category", "General Mandal Donation & Seva"),
            "payment_id": donation_data.get("payment_id", ""),
            "order_id": donation_data.get("order_id", ""),
            "pan_number": donation_data.get("pan_number", ""),
            "status": donation_data.get("status", "SUCCESS"),
            "created_at": datetime.now().isoformat()
        }
        headers = self.schemas["donations"]
        ws.append_row([row[h] for h in headers])
        return row

    # T-SHIRT ORDERS
    def get_tshirt_orders(self):
        ws = self._get_worksheet("tshirt_orders")
        return ws.get_all_records()

    def get_tshirt_order_by_receipt(self, receipt_no):
        records = self.get_tshirt_orders()
        for o in records:
            if str(o.get("receipt_no", "")).upper() == str(receipt_no).upper():
                return o
        return None

    def create_tshirt_order(self, order_data):
        ws = self._get_worksheet("tshirt_orders")
        new_id = self._get_next_id(ws)
        row = {
            "id": new_id,
            "receipt_no": order_data.get("receipt_no", ""),
            "buyer_name": order_data.get("buyer_name", ""),
            "phone": order_data.get("phone", ""),
            "email": order_data.get("email", ""),
            "size": order_data.get("size", ""),
            "color": order_data.get("color", "Royal Maroon"),
            "quantity": int(order_data.get("quantity", 1)),
            "total_amount": float(order_data.get("total_amount", 0.0)),
            "address": order_data.get("address", ""),
            "payment_id": order_data.get("payment_id", ""),
            "status": order_data.get("status", "SUCCESS"),
            "created_at": datetime.now().isoformat()
        }
        headers = self.schemas["tshirt_orders"]
        ws.append_row([row[h] for h in headers])
        return row

    # DBT RECEIPTS
    def get_dbt_receipts(self):
        ws = self._get_worksheet("dbt_receipts")
        return ws.get_all_records()

    def get_dbt_receipt_by_id(self, receipt_id):
        records = self.get_dbt_receipts()
        for r in records:
            if str(r.get("id")) == str(receipt_id):
                return r
        return None

    def create_dbt_receipt(self, receipt_data):
        ws = self._get_worksheet("dbt_receipts")
        new_id = self._get_next_id(ws)
        reference_id = f"DBT-{datetime.now().year}-{new_id}{datetime.now().strftime('%M%S')}"
        row = {
            "id": new_id,
            "reference_id": reference_id,
            "donor_name": receipt_data.get("donor_name", ""),
            "phone": receipt_data.get("phone", ""),
            "email": receipt_data.get("email", ""),
            "amount": float(receipt_data.get("amount", 0.0)),
            "transaction_ref": receipt_data.get("transaction_ref", ""),
            "original_filename": receipt_data.get("original_filename", ""),
            "stored_filename": receipt_data.get("stored_filename", ""),
            "file_path": receipt_data.get("file_path", ""),
            "status": receipt_data.get("status", "PENDING VERIFICATION"),
            "created_at": datetime.now().isoformat()
        }
        headers = self.schemas["dbt_receipts"]
        ws.append_row([row[h] for h in headers])
        return row

    def update_dbt_receipt_status(self, receipt_id, status):
        ws = self._get_worksheet("dbt_receipts")
        records = ws.get_all_records()
        row_idx = None
        for idx, r in enumerate(records):
            if str(r.get("id")) == str(receipt_id):
                row_idx = idx + 2  # header + 0-index offset
                break

        if row_idx:
            status_col = self.schemas["dbt_receipts"].index("status") + 1
            ws.update_cell(row_idx, status_col, status)
            return True
        return False

    # OFFLINE SPREADSHEETS
    def get_offline_excel_sheets(self):
        ws = self._get_worksheet("offline_excel_sheets")
        records = ws.get_all_records()
        for r in records:
            r["columns"] = json.loads(r.get("columns_json", "[]"))
        return records

    def get_offline_excel_rows(self, sheet_id=None):
        ws = self._get_worksheet("offline_excel_rows")
        records = ws.get_all_records()
        parsed = []
        for r in records:
            row_sheet_id = int(r.get("sheet_id", 0))
            if sheet_id is None or row_sheet_id == int(sheet_id):
                r["data"] = json.loads(r.get("data_json", "{}"))
                parsed.append(r)
        return parsed

    def get_offline_records(self, record_type=None):
        sheets = self.get_offline_excel_sheets()
        if record_type:
            sheets = [s for s in sheets if s.get("record_type") == record_type]
            
        result = []
        for sheet in sheets:
            rows = self.get_offline_excel_rows(sheet["id"])
            for row in rows:
                row_data = row.copy()
                row_data["sheet_name"] = sheet.get("sheet_name", "")
                row_data["record_type"] = sheet.get("record_type", "")
                row_data["columns"] = sheet.get("columns", [])
                result.append(row_data)
        return result

    def create_offline_excel_sheet(self, sheet_data):
        ws_sheets = self._get_worksheet("offline_excel_sheets")
        ws_rows = self._get_worksheet("offline_excel_rows")

        sheet_id = self._get_next_id(ws_sheets)
        
        # Save Sheet Metadata
        sheet_row = {
            "id": sheet_id,
            "sheet_name": sheet_data.get("sheet_name", ""),
            "record_type": sheet_data.get("record_type", ""),
            "original_filename": sheet_data.get("original_filename", ""),
            "columns_json": json.dumps(sheet_data.get("columns", [])),
            "uploaded_at": datetime.now().isoformat()
        }
        ws_sheets.append_row([sheet_row[h] for h in self.schemas["offline_excel_sheets"]])

        # Save Rows (append multiple rows at once to be highly performant)
        rows_to_append = []
        next_row_id = self._get_next_id(ws_rows)
        
        for r in sheet_data.get("rows", []):
            row = [
                next_row_id,
                sheet_id,
                r.get("row_number", 0),
                json.dumps(r.get("data", {})),
                float(r.get("amount", 0.0)),
                int(r.get("quantity", 1)),
                datetime.now().isoformat()
            ]
            rows_to_append.append(row)
            next_row_id += 1

        if rows_to_append:
            ws_rows.append_rows(rows_to_append)

        return sheet_row

    def delete_offline_excel_sheet(self, sheet_id):
        ws_sheets = self._get_worksheet("offline_excel_sheets")
        ws_rows = self._get_worksheet("offline_excel_rows")

        # Delete sheet metadata row
        sheets = ws_sheets.get_all_records()
        sheet_row_num = None
        for idx, s in enumerate(sheets):
            if str(s.get("id")) == str(sheet_id):
                sheet_row_num = idx + 2
                break

        if sheet_row_num:
            ws_sheets.delete_rows(sheet_row_num)

        # Delete associated row records
        rows = ws_rows.get_all_records()
        rows_to_delete = []
        for idx, r in enumerate(rows):
            if str(r.get("sheet_id")) == str(sheet_id):
                # We save the row number in google sheet (1-indexed, header counts)
                rows_to_delete.append(idx + 2)

        # Delete from bottom up to preserve row index alignment
        for row_num in sorted(rows_to_delete, reverse=True):
            ws_rows.delete_rows(row_num)

        return True

    def get_offline_donations(self):
        return self.get_offline_records("donation")

    def get_offline_tshirt_orders(self):
        return self.get_offline_records("tshirt")

    # YATRA STATUS
    def get_yatra_status(self):
        ws = self._get_worksheet("yatra_status")
        records = ws.get_all_records()
        if not records:
            self.init_db()
            records = ws.get_all_records()
        return records[0]

    def update_yatra_status(self, status_data):
        ws = self._get_worksheet("yatra_status")
        records = ws.get_all_records()
        if not records:
            return
        
        current = records[0]
        # Update current status dictionary with incoming key-values
        current.update(status_data)
        
        headers = self.schemas["yatra_status"]
        row_values = [current.get(h, '') for h in headers]
        
        # Update row 2 (which is the first data row)
        range_name = f"A2:{gspread.utils.rowcol_to_a1(2, len(headers))}"
        ws.update(range_name=range_name, values=[row_values])

    # SYSTEM LOGS
    def get_logs(self):
        ws = self._get_worksheet("logs")
        return ws.get_all_records()

    def add_log(self, type_str, message):
        ws = self._get_worksheet("logs")
        new_id = self._get_next_id(ws)
        row = {
            "id": new_id,
            "type": type_str,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        headers = self.schemas["logs"]
        ws.append_row([row[h] for h in headers])
        return row
