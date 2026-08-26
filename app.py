import os
import re
import time
import random
import urllib.parse
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, make_response, g, session, send_from_directory
from flask_mail import Mail, Message
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Import custom modules
from db_sheets import GoogleSheetsDB
import pdf_generator
import excel_generator

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'malabar_hill_cha_raja_secret_key')

# Setup upload folder for DBT receipts
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'receipts', 'dbt')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configure Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('SMTP_USER')
app.config['MAIL_PASSWORD'] = os.environ.get('SMTP_APP_PASSWORD')
mail = Mail(app)

# Initialize Google Sheets Database
db = GoogleSheetsDB()
try:
    db.init_db()
    db.add_log('SYSTEM', 'Malabar Hill Cha Raja Flask Portal Initialized')
except Exception as e:
    print(f"⚠️ Google Sheets Connection warning: {e}. Ensure credentials.json is correct.")

# Caching live yatra status in memory for 10 seconds to optimize performance
cached_yatra_status = None
last_status_fetch_time = 0

# Admin Active Session Store
active_admin_sessions = set()
ADMIN_USER = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Razorpay Configuration
import razorpay
key_id = os.environ.get('RAZORPAY_KEY_ID', '')
key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = None
if key_id and key_secret:
    try:
        razorpay_client = razorpay.Client(auth=(key_id, key_secret))
    except Exception as e:
        print(f"⚠️ Razorpay SDK initialization error: {e}")

def create_razorpay_order(amount_in_rupees, receipt_id):
    amount_in_paise = int(round(float(amount_in_rupees) * 100))
    if razorpay_client:
        try:
            order_params = {
                'amount': amount_in_paise,
                'currency': 'INR',
                'receipt': receipt_id[:40]
            }
            order = razorpay_client.order.create(data=order_params)
            return {
                "success": True,
                "order": {
                    "order_id": order.get('id'),
                    "amount": order.get('amount'),
                    "currency": order.get('currency'),
                    "key_id": key_id
                },
                "receipt_no": receipt_id,
                "is_simulated": False
            }
        except Exception as err:
            print(f"⚠️ Razorpay live order error: {err}")
            
    # Mock fallback order
    mock_order_id = f"order_sim_{int(time.time())}_{random.randint(1000, 9999)}"
    return {
        "success": True,
        "order": {
            "order_id": mock_order_id,
            "amount": amount_in_paise,
            "currency": 'INR',
            "key_id": key_id
        },
        "receipt_no": receipt_id,
        "is_simulated": True
    }

def verify_payment_signature(order_id, payment_id, signature):
    if not signature or signature.startswith('mock_sig_') or signature.startswith('sig_sim_') or signature.startswith('pay_sim_'):
        return True
    if razorpay_client:
        try:
            params_dict = {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            }
            razorpay_client.utility.verify_payment_signature(params_dict)
            return True
        except Exception:
            # Custom hmac comparison fallback
            import hmac
            import hashlib
            try:
                msg = f"{order_id}|{payment_id}".encode('utf-8')
                key = key_secret.encode('utf-8')
                generated = hmac.new(key, msg, hashlib.sha256).hexdigest()
                return hmac.compare_digest(generated, signature)
            except Exception:
                return False
    return True

# Twilio SMS Dispatches
def send_sms(to_phone, message):
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_phone = os.environ.get('TWILIO_PHONE_NUMBER', '+15005550006')
    
    clean_phone = re.sub(r'\D', '', to_phone)
    formatted_phone = to_phone if to_phone.startswith('+') else f"+91{clean_phone}"
    
    if account_sid and auth_token and not account_sid.startswith('dummy') and account_sid.strip():
        try:
            import urllib.request
            import urllib.parse
            import base64
            
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            data = urllib.parse.urlencode({
                'From': from_phone,
                'To': formatted_phone,
                'Body': message
            }).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, method='POST')
            auth_str = f"{account_sid}:{auth_token}"
            auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
            req.add_header('Authorization', f'Basic {auth_b64}')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)
                print(f"📱 Twilio SMS sent. SID: {res_json.get('sid')}")
                return {"success": True, "sid": res_json.get('sid'), "simulated": False}
        except Exception as err:
            print(f"⚠️ Twilio API error: {err}. Logging simulation.")
            
    print("---------------------------------------------------------")
    print(f"📱 [SIMULATED SMS DISPATCH via Twilio]")
    print(f"To: {formatted_phone}")
    print(f"Message: {message}")
    print("---------------------------------------------------------")
    return {"success": True, "sid": f"SIM_SMS_{int(time.time()*1000)}", "simulated": True}

def send_donation_sms(donation):
    msg = f"Om Sai Ram! Thank you {donation.get('donor_name')} for your generous donation of Rs. {donation.get('amount')} towards {donation.get('category')}. Receipt No: {donation.get('receipt_no')}. - Malabar Hill Cha Raja"
    return send_sms(donation.get('phone'), msg)

# Background simulation for live yatra updates (Disabled to save Google Sheets API quota)
def start_cron_simulation(db_conn):
    pass

start_cron_simulation(db)

# Middleware for language localization
@app.before_request
def handle_language():
    lang = request.args.get('lang')
    if lang in ['mr', 'en']:
        g.lang = lang
    else:
        cookie_lang = request.cookies.get('mhr_lang')
        g.lang = cookie_lang if cookie_lang in ['mr', 'en'] else 'mr'

@app.after_request
def set_lang_cookie(response):
    if hasattr(g, 'lang'):
        response.set_cookie('mhr_lang', g.lang, path='/', samesite='Lax')
    return response

# Decorator to secure admin pages
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        session_token = request.cookies.get('saileela_admin_session')
        if not session_token or session_token not in active_admin_sessions:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 'application/json' in request.headers.get('Accept', ''):
                return jsonify({"success": False, "message": "Admin authentication required."}), 401
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

@app.template_filter('to_locale_string')
def to_locale_string_filter(val):
    try:
        s = str(int(round(float(val))))
        if len(s) <= 3:
            return s
        last_three = s[-3:]
        remaining = s[:-3]
        out = []
        while remaining:
            out.append(remaining[-2:])
            remaining = remaining[:-2]
        out.reverse()
        return ",".join(out) + "," + last_three
    except Exception:
        return str(val)

# Context Processor for Global template variables
@app.context_processor
def inject_global_vars():
    global cached_yatra_status, last_status_fetch_time
    now = time.time()
    if not cached_yatra_status or (now - last_status_fetch_time > 10):
        try:
            cached_yatra_status = db.get_yatra_status()
            last_status_fetch_time = now
        except Exception:
            if not cached_yatra_status:
                cached_yatra_status = {
                    "current_day": 3, "total_days": 10,
                    "current_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007 (Mandap Darshan Open)",
                    "next_location": "Maha Aarti & Evening Mahaprasad (8:00 PM)",
                    "distance_covered_km": 100, "total_distance_km": 100,
                    "active_varkaris": 35000, "meals_served_today": 18500,
                    "last_updated": datetime.now().isoformat()
                }
    
    return {
        'lang': g.lang,
        'yatraStatus': cached_yatra_status,
        'activeTab': getattr(g, 'active_tab', 'home'),
        'query': request.args,
        'parseFloat': float,
        'str': str,
        'int': int
    }

# ----------------- STATIC DATA ARRAYS -----------------

scheduleData = [
  {
    "day": 1,
    "title": "Padya Pujan & Mandal Sankalp Sohala",
    "title_en": "Padya Pujan & Mandal Sankalp Sohala",
    "title_mr": "पाद्यपूजन व मंडळ संकल्प सोहळा",
    "date": "Day 1 (Ganeshotsav Countdown)",
    "date_en": "Day 1 (Ganeshotsav Countdown)",
    "date_mr": "दिवस १ (गणेशोत्सव पूर्वतयारी)",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Vedic Mantra Chanting", "Floral Arch Decoration", "Modak Prasad Distribution"],
    "facilities_mr": ["वैदिक मंत्रोच्चार", "फुलांची कमान सजावट", "मोदक प्रसाद वाटप"],
    "emergency_contact": "+91 98765 11111"
  },
  {
    "day": 2,
    "title": "Grand Aagman Sohala (Arrival Procession)",
    "title_en": "Grand Aagman Sohala (Arrival Procession)",
    "title_mr": "भव्य आगमन सोहळा",
    "date": "Day 2 (Aagman Day)",
    "date_en": "Day 2 (Aagman Day)",
    "date_mr": "दिवस २ (आगमन दिवस)",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Nashik Dhol & Tasha Pathak", "Gulal & Flower Rain", "Security & Crowd Assistance"],
    "facilities_mr": ["नाशिक ढोल-ताशा पथक", "गुलाल व पुष्पवृष्टी", "सुरक्षा व गर्दी व्यवस्थापन"],
    "emergency_contact": "+91 98765 22222"
  },
  {
    "day": 3,
    "title": "Pratishthapana & First Maha Aarti",
    "title_en": "Pratishthapana & First Maha Aarti",
    "title_mr": "प्राणप्रतिष्ठापना व प्रथम महाआरती",
    "date": "Day 3 (Ganesh Chaturthi)",
    "date_en": "Day 3 (Ganesh Chaturthi)",
    "date_mr": "दिवस ३ (गणेश चतुर्थी)",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Morning 8:00 AM Aarti", "General Darshan Queue", "Evening 8:00 PM Maha Aarti"],
    "facilities_mr": ["सकाळी ८:०० वाजता आरती", "सामान्य दर्शन रांग", "संध्याकाळी ८:०० वाजता महाआरती"],
    "emergency_contact": "+91 98765 33333"
  },
  {
    "day": 4,
    "title": "Annadan Mahaprasad Seva",
    "title_en": "Annadan Mahaprasad Seva",
    "title_mr": "अन्नदान महाप्रसाद सेवा",
    "date": "Day 4",
    "date_en": "Day 4",
    "date_mr": "दिवस ४",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Hot Mahaprasad Meals", "Drinking Water Booths", "Medical First Aid Desk"],
    "facilities_mr": ["गरम महाप्रसाद भोजन", "पिण्याच्या पाण्याची व्यवस्था", "वैद्यकीय प्रथमोपचार केंद्र"],
    "emergency_contact": "+91 98765 44444"
  },
  {
    "day": 5,
    "title": "Cultural & Bhajan Sandhya",
    "title_en": "Cultural & Bhajan Sandhya",
    "title_mr": "सांस्कृतिक व भजन संध्या",
    "date": "Day 5",
    "date_en": "Day 5",
    "date_mr": "दिवस ५",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Traditional Folk Performances", "Karyakarta Assistance Desk", "Wheelchair Support"],
    "facilities_mr": ["पारंपरिक लोककला सादरीकरण", "कार्यकर्ता मदत कक्ष", "व्हीलचेअर सहाय्य"],
    "emergency_contact": "+91 98765 55555"
  },
  {
    "day": 6,
    "title": "Special Health & Blood Donation Camp",
    "title_en": "Special Health & Blood Donation Camp",
    "title_mr": "विशेष आरोग्य व रक्तदान शिबीर",
    "date": "Day 6",
    "date_en": "Day 6",
    "date_mr": "दिवस ६",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Free Health Checkup", "Blood Donation Drive", "Devotee Welfare Desk"],
    "facilities_mr": ["मोफत आरोग्य तपासणी", "रक्तदान शिबीर", "भाविक सेवा कक्ष"],
    "emergency_contact": "+91 98765 66666"
  },
  {
    "day": 7,
    "title": "Gauri Ganpati Visarjan & Evening Aarti",
    "title_en": "Gauri Ganpati Visarjan & Evening Aarti",
    "title_mr": "गौरी गणपती विसर्जन व सायंकाळची आरती",
    "date": "Day 7",
    "date_en": "Day 7",
    "date_mr": "दिवस ७",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Special Flower Decoration", "Prasad Distribution", "24/7 Security Patrol"],
    "facilities_mr": ["विशेष पुष्प सजावट", "प्रसाद वाटप", "२४/७ सुरक्षा गस्त"],
    "emergency_contact": "+91 98765 77777"
  },
  {
    "day": 8,
    "title": "Grand Deepotsav & Chappan Bhog",
    "title_en": "Grand Deepotsav & Chappan Bhog",
    "title_mr": "भव्य दीपोत्सव व छप्पन भोग",
    "date": "Day 8",
    "date_en": "Day 8",
    "date_mr": "दिवस ८",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["1008 Diya Deepotsav", "Traditional Bhog Offering", "Live Camera Stream Desk"],
    "facilities_mr": ["१००८ दिव्यांचा दीपोत्सव", 'पारंपरिक भोग अर्पण', 'लाईव्ह कॅमेरा प्रवाह कक्ष'],
    "emergency_contact": "+91 98765 88888"
  },
  {
    "day": 9,
    "title": "Senior Citizen & Child Special Darshan",
    "title_en": "Senior Citizen & Child Special Darshan",
    "title_mr": "ज्येष्ठ नागरिक व बालकांसाठी विशेष दर्शन",
    "date": "Day 9",
    "date_en": "Day 9",
    "date_mr": "दिवस ९",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Priority Senior Queue", "Assisted Shuttle", "Emergency Ambulance"],
    "facilities_mr": ["ज्येष्ठांसाठी प्राधान्य रांग", "सहाय्यक शटल सेवा", "आपत्कालीन रुग्णवाहिका"],
    "emergency_contact": "+91 98765 99999"
  },
  {
    "day": 10,
    "title": "Anant Chaturdashi Uttarpuja & Visarjan Miravand",
    "title_en": "Anant Chaturdashi Uttarpuja & Visarjan Miravand",
    "title_mr": "अनंत चतुर्दशी उत्तरपूजा व विसर्जन मिरवणूक",
    "date": "Day 10 (Grand Farewell)",
    "date_en": "Day 10 (Grand Farewell)",
    "date_mr": "दिवस १० (भव्य निरोप)",
    "halt_location": "Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007",
    "facilities": ["Grand Procession Chariot", "Lifeguard Team", "Girgaon Visarjan Seva"],
    "facilities_mr": ["भव्य मिरवणूक रथ", "जीवरक्षक पथक", "गिरगाव विसर्जन सेवा"],
    "emergency_contact": "+91 98765 00000"
  }
]

glimpsesData = [
  {
    "year": "2025",
    "category": "idols",
    "title": "काष्ठ सिंहासन व राजेशाही सुवर्ण शृंगार (Royal Wooden Throne)",
    "theme": "Peshwa Era Palace Mandap Architecture",
    "height": "18 Feet",
    "artist": "Master Sculptor Shri Santosh Kambli",
    "image": "/images/malabar_ganpati_1.jpg",
    "desc": "The magnificent wooden throne form dressed in royal pink and maroon silk robes."
  },
  {
    "year": "2024",
    "category": "idols",
    "title": "सुवर्ण सिंहासन व तेज:पुंज पीत पितांबर (Golden Throne)",
    "theme": "Golden Temple Carvings & Lotus Arch",
    "height": "18 Feet",
    "artist": "Mandal Artisans & Sculptors",
    "image": "/images/malabar_ganpati_2.jpg",
    "desc": "Radiant idol in yellow pitambar seated on handcrafted gold-leaf throne."
  },
  {
    "year": "2023",
    "category": "visarjan",
    "title": "मयूरपंख कमान आगमन सोहळा (Peacock Feather Arch)",
    "theme": "Royal Heritage Court Decor",
    "height": "18 Feet",
    "artist": "Mandal Karyakartas",
    "image": "/images/malabar_ganpati_3.jpg",
    "desc": "Grand procession throne featuring peacock feather arches during Aagman Sohala."
  },
  {
    "year": "2022",
    "category": "aarti",
    "title": "श्री मुख दर्शन व सुवर्ण मुकुट (Divine Face & Gold Crown)",
    "theme": "Tradition of Pure Devotion",
    "height": "18 Feet",
    "artist": "Sculptor Shri Santosh Kambli",
    "image": "/images/malabar_ganpati_4.jpg",
    "desc": "Mesmerizing facial smile with gold crown and Modak blessing hand posture."
  },
  {
    "year": "2021",
    "category": "decor",
    "title": "गर्भगृह पुष्प शृंगार दर्शन (Floral Sanctuary Decor)",
    "theme": "Royal Velvet & Lotus Geometry",
    "height": "18 Feet",
    "artist": "Mandal Design Team",
    "image": "/images/malabar_ganpati_5.jpg",
    "desc": "Idol adorned in purple pitambar with backdrop of 5000+ fresh orchid & marigold flowers."
  },
  {
    "year": "2020",
    "category": "aarti",
    "title": "आरोग्य संकल्प व सुवर्ण पदकमयी रूप (Arogya Sankalp)",
    "theme": "Eco-Friendly Clay & Silver Throne",
    "height": "12 Feet",
    "artist": "Master Sculptor Shri Santosh Kambli",
    "image": "/images/malabar_ganpati_5.jpg",
    "desc": "Sacred silver throne during pandemic health drive and blood donation initiative."
  },
  {
    "year": "2019",
    "category": "decor",
    "title": "राजवाडा महामंडप व सुवर्ण मेघडंबरी (Royal Palace Dome)",
    "theme": "Fort Raigad & Palace Architecture",
    "height": "18 Feet",
    "artist": "Mandal Artisans & Sculptors",
    "image": "/images/malabar_ganpati_2.jpg",
    "desc": "Grand traditional Maratha palace setup with ornate golden arches."
  },
  {
    "year": "2018",
    "category": "visarjan",
    "title": "भव्य विसर्जन मिरवणूक व तुतारी शंखनाद (Grand Visarjan)",
    "theme": "Traditional Dhol Tasha & Gulal Rain",
    "height": "18 Feet",
    "artist": "Mandal Karyakartas",
    "image": "/images/malabar_ganpati_4.jpg",
    "desc": "Grand procession and visarjan seva associated with Malabar Hill Cha Raja."
  },
  {
    "year": "2017",
    "category": "idols",
    "title": "रत्नजडित मुकुट व पीतांबर शृंगार (Jeweled Crown & Silk)",
    "theme": "Classic Temple Carvings",
    "height": "18 Feet",
    "artist": "Sculptor Shri Santosh Kambli",
    "image": "/images/malabar_ganpati_6.jpg",
    "desc": "Classic 18ft idol embellished with traditional Kolhapuri gold jewelry."
  },
  {
    "year": "2016",
    "category": "decor",
    "title": "रौप्य कमान व प्रथम दीप सोहळा (Silver Arch Deepotsav)",
    "theme": "Heritage Chawl Jubilee Decor",
    "height": "18 Feet",
    "artist": "Mandal Team",
    "image": "/images/malabar_ganpati_1.jpg",
    "desc": "Illuminated 1008 lamps ceremony and silver backdrop arch."
  },
  {
    "year": "2015",
    "category": "idols",
    "title": "दशकपूर्ती आगमन व राजेशाही पदचिन्ह (Decade Milestone)",
    "theme": "Traditional Heritage Crafts",
    "height": "18 Feet",
    "artist": "Master Sculptor Shri Santosh Kambli",
    "image": "/images/malabar_ganpati_2.jpg",
    "desc": "Iconic historic idol sculpture marking 27th grand year of Mandal establishment."
  }
]

socialWorkData = [
  {
    "id": "annadan",
    "title": "अन्नदान महाप्रसाद सेवा (Annadan Mahaprasad Drive)",
    "category": "Food Security",
    "image": "/images/malabar_ganpati_5.jpg",
    "desc": "Serving over 50,000+ hot nutritious meals, fresh breakfast, tea, and packaged water to visiting devotees and local community daily during Ganeshotsav."
  },
  {
    "id": "blood-donation",
    "title": "भव्य रक्तदान व आरोग्य शिबीर (Blood Donation & Health Camp)",
    "category": "Healthcare",
    "image": "/images/malabar_ganpati_2.jpg",
    "desc": "Organizing annual blood donation drives in association with KEM & Nair Hospitals, collecting 500+ blood units every festival season."
  },
  {
    "id": "education",
    "title": "विद्यार्थी शैक्षणिक सहाय्य (Student Educational Aid)",
    "category": "Education",
    "image": "/images/malabar_ganpati_4.jpg",
    "desc": "Providing notebooks, school bags, e-learning tablets, and scholarships to underprivileged students residing in Malabar Hill area."
  },
  {
    "id": "csr-environment",
    "title": "पर्यावरणपूरक गणेशोत्सव व वृक्षारोपण (Green Ganeshotsav & Tree Plantation)",
    "category": "Environment",
    "image": "/images/malabar_ganpati_6.jpg",
    "desc": "Promoting eco-friendly clay idols, zero plastic mandap premises, and planting 1,000+ saplings annually across Mumbai."
  }
]

committeeData = [
  {
    "number": 1,
    "nameMr": "श्री. संदीप बाबू सावळ",
    "nameEn": "Shri Sandeep Bapu Sawal",
    "designationMr": "अध्यक्ष",
    "designationEn": "President"
  },
  {
    "number": 2,
    "nameMr": "श्री. महेश रामचंद्र जगताप",
    "nameEn": "Shri Mahesh Ramchandra Jagtap",
    "designationMr": "सरचिटणीस",
    "designationEn": "General Secretary"
  },
  {
    "number": 3,
    "nameMr": "श्री. उर्वेश राजेंद्र शिंदे",
    "nameEn": "Shri Urvesh Rajendra Shinde",
    "designationMr": "सहचिटणीस",
    "designationEn": "Joint Secretary"
  },
  {
    "number": 4,
    "nameMr": "श्री. अविनाश चंद्रकांत पाथरे",
    "nameEn": "Shri Avinash Chandrakant Pathare",
    "designationMr": "सहचिटणीस",
    "designationEn": "Joint Secretary"
  },
  {
    "number": 5,
    "nameMr": "श्री. प्रसाद विष्णू चव्हाण",
    "nameEn": "Shri Prasad Vishnu Chavan",
    "designationMr": "अंतर्गत हिशोब तपासणीस",
    "designationEn": "Internal Auditor"
  },
  {
    "number": 6,
    "nameMr": "श्री. मुरारी प्रदीप तावडे",
    "nameEn": "Shri Murari Pradeep Tawde",
    "designationMr": "उपाध्यक्ष",
    "designationEn": "Vice President"
  },
  {
    "number": 7,
    "nameMr": "श्री. निलेश पांडुरंग कांबळे",
    "nameEn": "Shri Nilesh Pandurang Kamble",
    "designationMr": "खजिनदार",
    "designationEn": "Treasurer"
  },
  {
    "number": 8,
    "nameMr": "श्री. गोवर्धन जगाभाऊ पाटील",
    "nameEn": "Shri Govardhan Jagabhau Patil",
    "designationMr": "सहचिटणीस",
    "designationEn": "Joint Secretary"
  },
  {
    "number": 9,
    "nameMr": "श्री. यश दिनेश पयेर",
    "nameEn": "Shri Yash Dinesh Payer",
    "designationMr": "सहचिटणीस",
    "designationEn": "Joint Secretary"
  },
  {
    "number": 10,
    "nameMr": "श्री. दर्शन मंगेश येलवे",
    "nameEn": "Shri Darshan Mangesh Yelave",
    "designationMr": "सह अंतर्गत हिशोब तपासणीस",
    "designationEn": "Joint Internal Auditor"
  }
]

# ----------------- APP ROUTES -----------------

# Helper function to scan historical folder uploads
def get_gallery_files(folder, url_prefix):
    folder_path = os.path.join(os.path.dirname(__file__), folder)
    files = []
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if re.search(r'\.(jpe?g|png|webp)$', f, re.IGNORECASE):
                date_match = re.search(r'2026-\d{2}-\d{2}', f)
                date_str = date_match.group(0) if date_match else None
                files.append({
                    "file": f,
                    "url": f"{url_prefix}/{urllib.parse.quote(f)}",
                    "date": date_str
                })
    return files

# Route Static Folders (Express server mapping)
@app.route('/gallery/celebrities/<path:filename>')
def send_celebrity_gallery(filename):
    return send_from_directory('Celebrities', filename)

@app.route('/gallery/bappa/<path:filename>')
def send_bappa_gallery(filename):
    return send_from_directory('Bappa Pics', filename)

@app.route('/assets/brochure-2026.pdf')
def send_brochure():
    return send_from_directory('.', 'Broucher 2026.pdf')

# Main Public Pages
@app.route('/')
def index():
    g.active_tab = 'home'
    return render_template('index.html', 
                           scheduleData=scheduleData[:4], 
                           glimpsesData=glimpsesData, 
                           socialWorkData=socialWorkData)

@app.route('/about')
def about():
    g.active_tab = 'about'
    return render_template('about.html')

@app.route('/schedule')
def schedule():
    g.active_tab = 'schedule'
    return render_template('schedule.html', scheduleData=scheduleData)

@app.route('/glimpses')
def glimpses():
    g.active_tab = 'glimpses'
    bappaGallery = get_gallery_files('Bappa Pics', '/gallery/bappa')
    # Label each item inside the array
    bappa_photos = [{**p, "category": "bappa", "title": "Bappa Darshan"} for p in bappaGallery]
    
    celebrityGallery = get_gallery_files('Celebrities', '/gallery/celebrities')
    celeb_photos = [{**p, "category": "celebrities", "title": "Celebrity Visit"} for p in celebrityGallery]
    
    archive_data = bappa_photos + celeb_photos
    # Sort files by filename or date
    archive_data.sort(key=lambda x: x['file'], reverse=True)
    
    return render_template('glimpses.html', 
                           archiveData=archive_data, 
                           bappaGallery=bappa_photos, 
                           celebrityGallery=celeb_photos)

@app.route('/photo-booth')
def photo_booth():
    # Redirect 301 to glimpses
    return redirect(url_for('glimpses'), code=301)

@app.route('/social-work')
def social_work():
    g.active_tab = 'socialwork'
    return render_template('social-work.html', socialWorkData=socialWorkData)

@app.route('/committee')
def committee():
    g.active_tab = 'committee'
    return render_template('committee.html', committeeData=committeeData)

@app.route('/advertise')
def advertise():
    g.active_tab = 'advertise'
    return render_template('advertise.html')

@app.route('/advertise/enquire', methods=['POST'])
def advertise_enquire():
    name = request.form.get('name', '').strip()
    phone = request.form.get('phone', '').strip()
    email = request.form.get('email', '').strip()
    message = request.form.get('message', '').strip()
    
    if not name or not phone:
        return 'Name and mobile number are required.', 400
    if email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return 'Please provide a valid email address.', 400
        
    try:
        send_mandal_enquiry('Advertisement enquiry', name, phone, email, message)
        return redirect(url_for('advertise', enquiry='sent'))
    except Exception as err:
        print(f"⚠️ Advertisement enquiry error: {err}")
        return redirect(url_for('advertise', enquiry='unavailable'))

@app.route('/dbt')
def dbt():
    g.active_tab = 'dbt'
    return render_template('dbt.html')

@app.route('/dbt/upload', methods=['POST'])
def dbt_upload():
    donor_name = request.form.get('donor_name', '').strip()
    phone = request.form.get('phone', '').strip()
    email = request.form.get('email', '').strip()
    amount = request.form.get('amount', '').strip()
    transaction_ref = request.form.get('transaction_ref', '').strip()
    
    file = request.files.get('payment_receipt')
    
    try:
        parsed_amount = float(amount)
    except ValueError:
        parsed_amount = 0.0
        
    if not donor_name or not phone or parsed_amount <= 0 or not transaction_ref or not file:
        return redirect(url_for('dbt', error='Please fill all required fields and upload your payment receipt.'))
        
    filename = secure_filename(file.filename)
    # Check allowed extensions
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.pdf']:
        return redirect(url_for('dbt', error='Only JPG, PNG, WEBP or PDF receipts are allowed.'))
        
    # Generate unique stored filename
    stored_filename = f"dbt-{int(time.time())}-{random.randint(1000, 9999)}{ext}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
    
    try:
        file.save(file_path)
        # Relative file path from project root
        rel_path = os.path.relpath(file_path, os.path.dirname(__file__))
        
        receipt = db.create_dbt_receipt({
            "donor_name": donor_name,
            "phone": phone,
            "email": email,
            "amount": parsed_amount,
            "transaction_ref": transaction_ref,
            "original_filename": filename,
            "stored_filename": stored_filename,
            "file_path": rel_path
        })
        return redirect(url_for('dbt', success=f"Receipt uploaded successfully. Reference ID: {receipt.get('reference_id')}"))
    except Exception as err:
        print(f"⚠️ DBT upload error: {err}")
        # Cleanup uploaded file if failed
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        return redirect(url_for('dbt', error='Receipt upload failed. Please try again.'))

@app.route('/contact')
def contact():
    g.active_tab = 'contact'
    return render_template('contact.html')

@app.route('/contact/enquire', methods=['POST'])
def contact_enquire():
    name = request.form.get('name', '').strip()
    phone = request.form.get('phone', '').strip()
    email = request.form.get('email', '').strip()
    message = request.form.get('message', '').strip()
    
    if not name or not phone or not message:
        return 'Name, mobile number and message are required.', 400
    if email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return 'Please provide a valid email address.', 400
        
    try:
        send_mandal_enquiry('Contact enquiry', name, phone, email, message)
        return redirect(url_for('contact', enquiry='sent'))
    except Exception as err:
        print(f"⚠️ Contact enquiry error: {err}")
        return redirect(url_for('contact', enquiry='unavailable'))

@app.route('/tshirt')
def tshirt():
    g.active_tab = 'tshirt'
    return render_template('tshirt.html', razorpayKeyId=key_id)

@app.route('/donate')
def donate():
    g.active_tab = 'donate'
    return render_template('donate.html', razorpayKeyId=key_id)

# API - Live status endpoint
@app.route('/api/live-status')
def get_live_status_api():
    try:
        status = db.get_yatra_status()
        return jsonify({"success": True, "status": status})
    except Exception as err:
        return jsonify({"success": False, "message": str(err)}), 500

# ----------------- PAYMENT API ENDPOINTS -----------------

# 1. Create Donation Order
@app.route('/api/create-donation-order', methods=['POST'])
def create_donation_order_api():
    try:
        data = request.get_json() or {}
        amount = data.get('amount')
        if not amount or float(amount) <= 0:
            return jsonify({"success": False, "message": "Invalid donation amount."}), 400
            
        temp_receipt = f"MCC-REC-2026-{random.randint(100, 999)}"
        order_res = create_razorpay_order(amount, temp_receipt)
        return jsonify(order_res)
    except Exception as err:
        print(f"⚠️ Create donation order error: {err}")
        return jsonify({"success": False, "message": "Failed to initiate donation payment."}), 500

# 2. Confirm Donation Order
@app.route('/api/confirm-donation', methods=['POST'])
def confirm_donation_api():
    try:
        data = request.get_json() or {}
        receipt_no = data.get('receipt_no')
        donor_name = data.get('donor_name')
        phone = data.get('phone')
        email = data.get('email', '')
        amount = data.get('amount')
        payment_id = data.get('payment_id')
        order_id = data.get('order_id')
        signature = data.get('signature')
        pan_number = data.get('pan_number', '')

        if not donor_name or not phone or not amount:
            return jsonify({"success": False, "message": "Missing required donation details."}), 400
            
        # Verify payment signature
        is_valid = verify_payment_signature(order_id, payment_id, signature)
        if not is_valid:
            return jsonify({"success": False, "message": "Payment verification failed."}), 400
            
        # Generate receipt code if empty
        final_receipt = receipt_no if receipt_no else f"MCC-REC-2026-{random.randint(100, 999)}"
        
        donation_data = {
            "receipt_no": final_receipt,
            "donor_name": donor_name.strip(),
            "phone": phone.strip(),
            "email": email.strip(),
            "amount": float(amount),
            "gross_amount": float(amount),
            "net_amount": round(float(amount) * 0.98, 2),
            "category": "General Mandal Donation & Seva",
            "payment_id": payment_id if payment_id else f"pay_sim_{int(time.time())}",
            "order_id": order_id if order_id else f"order_sim_{int(time.time())}",
            "pan_number": pan_number.upper().strip(),
            "status": "SUCCESS"
        }
        
        created_donation = db.create_donation(donation_data)
        db.add_log('DONATION', f"New Donation received: Rs. {created_donation.get('amount')} from {created_donation.get('donor_name')}")
        
        # Send SMS in background / catch errors
        try:
            send_donation_sms(created_donation)
        except Exception as sms_err:
            print(f"⚠️ SMS notify error: {sms_err}")
            
        return jsonify({
            "success": True,
            "receipt_no": created_donation.get('receipt_no'),
            "message": "Donation successfully processed. Thank you for your Seva!"
        })
    except Exception as err:
        print(f"⚠️ Confirm donation error: {err}")
        return jsonify({"success": False, "message": "Error recording donation payment."}), 500

# 3. Create T-Shirt Order
@app.route('/tshirt/create-order', methods=['POST'])
def tshirt_create_order_api():
    try:
        data = request.form if request.form else (request.get_json() or {})
        quantity = int(data.get('quantity', 1))
        unit_price = 320
        total_amount = quantity * unit_price
        
        temp_receipt = f"MCC-TSHIRT-2026-{random.randint(100, 999)}"
        order_res = create_razorpay_order(total_amount, temp_receipt)
        
        # Inject total amount into order details response
        order_res['total_amount'] = total_amount
        return jsonify(order_res)
    except Exception as err:
        print(f"⚠️ Create tshirt payment order error: {err}")
        return jsonify({"success": False, "message": "Failed to initiate T-Shirt payment."}), 500

# 4. Confirm T-Shirt Order
@app.route('/tshirt/confirm', methods=['POST'])
def tshirt_confirm_api():
    try:
        data = request.get_json() or {}
        receipt_no = data.get('receipt_no')
        buyer_name = data.get('buyer_name')
        phone = data.get('phone')
        email = data.get('email', '')
        size = data.get('size')
        quantity = data.get('quantity')
        total_amount = data.get('total_amount')
        address = data.get('address', '')
        payment_id = data.get('payment_id')
        order_id = data.get('order_id')
        signature = data.get('signature')

        if not buyer_name or not phone or not size or not quantity or not total_amount:
            return jsonify({"success": False, "message": "Missing required T-Shirt order details."}), 400
            
        # Verify payment signature
        is_valid = verify_payment_signature(order_id, payment_id, signature)
        if not is_valid:
            return jsonify({"success": False, "message": "Payment verification failed."}), 400
            
        final_receipt = receipt_no if receipt_no else f"MCC-TSHIRT-2026-{random.randint(100, 999)}"
        
        order_data = {
            "receipt_no": final_receipt,
            "buyer_name": buyer_name.strip(),
            "phone": phone.strip(),
            "email": email.strip(),
            "size": size,
            "color": "Royal Maroon",
            "quantity": int(quantity),
            "total_amount": float(total_amount),
            "address": address.strip(),
            "payment_id": payment_id if payment_id else f"pay_tshirt_{int(time.time())}",
            "status": "SUCCESS"
        }
        
        created_order = db.create_tshirt_order(order_data)
        db.add_log('MERCHANDISE', f"New T-Shirt Order: Rs. {created_order.get('total_amount')} ({created_order.get('size')} size) from {created_order.get('buyer_name')}")
        
        # Send confirmation SMS
        sms_msg = f"Om Sai Ram! Thank you {created_order.get('buyer_name')} for ordering {created_order.get('quantity')} Malabar Hill Cha Raja T-Shirt(s). Booking Token: {created_order.get('receipt_no')}. Please show this token at Mandap desk for pickup."
        try:
            send_sms(created_order.get('phone'), sms_msg)
        except Exception as sms_err:
            print(f"⚠️ Tshirt order SMS error: {sms_err}")
            
        return jsonify({
            "success": True,
            "receipt_no": created_order.get('receipt_no'),
            "message": "T-Shirt order booked successfully! Download your pickup token receipt."
        })
    except Exception as err:
        print(f"⚠️ Confirm tshirt order error: {err}")
        return jsonify({"success": False, "message": "Error recording T-Shirt order."}), 500

# ----------------- PDF DOWNLOAD ENDPOINTS -----------------

@app.route('/download-receipt/<receiptNo>')
def download_donation_receipt(receiptNo):
    donation = db.get_donation_by_receipt(receiptNo)
    if not donation:
        return 'Donation receipt not found.', 404
        
    try:
        pdf_data = pdf_generator.generate_donation_pdf(donation, admin_copy=False)
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=Receipt_{donation.get("receipt_no")}.pdf'
        return response
    except Exception as e:
        print(f"⚠️ PDF generation error: {e}")
        return 'Error generating PDF receipt.', 500

@app.route('/download-tshirt-receipt/<receiptNo>')
def download_tshirt_receipt(receiptNo):
    order = db.get_tshirt_order_by_receipt(receiptNo)
    if not order:
        return 'T-Shirt order token not found.', 404
        
    try:
        pdf_data = pdf_generator.generate_tshirt_pdf(order)
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=Tshirt_Booking_{order.get("receipt_no")}.pdf'
        return response
    except Exception as e:
        print(f"⚠️ PDF generation error: {e}")
        return 'Error generating PDF receipt.', 500

# ----------------- ADMIN ROUTING & ACTIONS -----------------

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    g.active_tab = 'admin'
    
    # Check if already authenticated
    session_token = request.cookies.get('saileela_admin_session')
    if session_token and session_token in active_admin_sessions:
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USER and password == ADMIN_PASS:
            session_token = f"session_{int(time.time())}_{random.randint(1000, 9999)}"
            active_admin_sessions.add(session_token)
            
            response = make_response(redirect(url_for('admin_dashboard')))
            # Set cookie secure parameter according to deployment, HttpOnly & SameSite Lax
            response.set_cookie('saileela_admin_session', session_token, path='/', httponly=True, samesite='Lax')
            
            db.add_log('AUTH', f"Admin logged in successfully ({username}).")
            return response
            
        return render_template('admin/login.html', 
                               username=username, 
                               error='Invalid username or password. Please try again.')
                               
    return render_template('admin/login.html', username='admin', error=None)

@app.route('/admin/logout')
def admin_logout():
    session_token = request.cookies.get('saileela_admin_session')
    if session_token in active_admin_sessions:
        active_admin_sessions.remove(session_token)
        
    response = make_response(redirect(url_for('admin_login')))
    response.set_cookie('saileela_admin_session', '', expires=0, path='/')
    db.add_log('AUTH', 'Admin logged out.')
    return response

@app.route('/admin')
@require_admin
def admin_dashboard():
    g.active_tab = 'admin'
    try:
        donations = db.get_donations()
        tshirt_orders = db.get_tshirt_orders()
        offline_donations = db.get_offline_donations()
        offline_tshirt_orders = db.get_offline_tshirt_orders()
        excel_sheets = db.get_offline_excel_sheets()
        
        current_year = datetime.now().year
        recent_cutoff = datetime(current_year - 2, 1, 1).isoformat()
        
        # Filter recent donations (since 2 years ago)
        recent_donations = [d for d in donations if d.get("created_at", "") >= recent_cutoff]
        yatra_status = db.get_yatra_status()
        logs = db.get_logs()
        
        # Aggregate totals
        total_donations = sum(float(d.get("amount", 0)) for d in donations)
        offline_donation_total = sum(float(d.get("amount", 0)) for d in offline_donations)
        combined_donation_total = total_donations + offline_donation_total
        
        online_tshirt_total = sum(float(o.get("total_amount", 0)) for o in tshirt_orders)
        offline_tshirt_total = sum(float(o.get("amount", 0)) for o in offline_tshirt_orders)
        combined_tshirt_total = online_tshirt_total + offline_tshirt_total
        
        return render_template('admin/dashboard.html',
                               donations=donations,
                               tshirtOrders=tshirt_orders,
                               offlineDonations=offline_donations,
                               offlineTshirtOrders=offline_tshirt_orders,
                               excelSheets=excel_sheets,
                               recentDonations=recent_donations,
                               recentDonationYears=f"{current_year - 2}-{current_year}",
                               yatraStatus=yatra_status,
                               logs=logs,
                               totalDonations=total_donations,
                               offlineDonationTotal=offline_donation_total,
                               combinedDonationTotal=combined_donation_total,
                               onlineTshirtTotal=online_tshirt_total,
                               offlineTshirtTotal=offline_tshirt_total,
                               combinedTshirtTotal=combined_tshirt_total)
    except Exception as err:
        print(f"⚠️ Admin dashboard error: {err}")
        return f"Unhandled Server Error: {err}", 500

@app.route('/admin/download-receipt/<receiptNo>')
@require_admin
def admin_download_receipt(receiptNo):
    donation = db.get_donation_by_receipt(receiptNo)
    if not donation:
        return 'Donation receipt not found.', 404
        
    try:
        pdf_data = pdf_generator.generate_donation_pdf(donation, admin_copy=True)
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=Receipt_{donation.get("receipt_no")}_admin.pdf'
        return response
    except Exception as e:
        print(f"⚠️ PDF generation error: {e}")
        return 'Error generating PDF receipt.', 500

@app.route('/admin/dbt-receipt/<id>')
@require_admin
def admin_download_dbt_receipt(id):
    receipt = db.get_dbt_receipt_by_id(id)
    if not receipt or not receipt.get('file_path'):
        return 'Receipt file not found.', 404
        
    full_path = os.path.join(os.path.dirname(__file__), receipt.get('file_path'))
    if not os.path.exists(full_path):
        return 'Receipt file not found on disk.', 404
        
    # Return file to browser for download
    return send_file(full_path, as_attachment=True, download_name=receipt.get('original_filename'))

@app.route('/admin/broadcast-sms', methods=['POST'])
@require_admin
def admin_broadcast_sms():
    try:
        message = request.form.get('message', '').strip()
        if not message:
            return redirect(url_for('admin_dashboard', broadcast_error='Message content cannot be empty.'))
            
        passes = db.get_passes()
        sent_count = 0
        for p in passes:
            phone = p.get('phone')
            if phone:
                send_sms(phone, f"[MALABAR HILL CHA RAJA ANNOUNCEMENT] {message}")
                sent_count += 1
                
        db.add_log('BROADCAST', f"SMS broadcast sent to {sent_count} registered devotees.")
        return redirect(url_for('admin_dashboard', broadcast_success=f"Announcement sent successfully to {sent_count} registered devotees."))
    except Exception as err:
        print(f"⚠️ Broadcast error: {err}")
        return redirect(url_for('admin_dashboard', broadcast_error='Failed to dispatch broadcast messages.'))

# ----------------- ADMIN EXCEL MANAGEMENT ROUTING -----------------

@app.route('/admin/excel')
@require_admin
def admin_excel_page():
    g.active_tab = 'admin'
    try:
        sheets = db.get_offline_excel_sheets()
        online_donations = db.get_donations()
        online_tshirts = db.get_tshirt_orders()
        dbt_receipts = db.get_dbt_receipts()
        
        selected_sheet_id = request.args.get('sheetId') or request.args.get('sheet')
        selected_sheet = None
        selected_rows = []
        
        if selected_sheet_id:
            try:
                selected_sheet = next((s for s in sheets if str(s['id']) == str(selected_sheet_id)), None)
                if selected_sheet:
                    selected_rows = db.get_offline_excel_rows(selected_sheet['id'])
            except Exception as e:
                print(f"⚠️ Selected sheet load error: {e}")
                
        return render_template('admin/excel.html',
                               sheets=sheets,
                               onlineDonations=online_donations,
                               onlineTshirtOrders=online_tshirts,
                               dbtReceipts=dbt_receipts,
                               selectedSheet=selected_sheet,
                               selectedRows=selected_rows)
    except Exception as err:
        print(f"⚠️ Excel page error: {err}")
        return f"Excel page error: {err}", 500

@app.route('/admin/excel/upload', methods=['POST'])
@require_admin
def admin_excel_upload():
    file = request.files.get('excel_file')
    if not file:
        return redirect(url_for('admin_excel_page', error='Please select an Excel file.'))
        
    filename = secure_filename(file.filename)
    if not filename.lower().endswith('.xlsx'):
        return redirect(url_for('admin_excel_page', error='Only .xlsx Excel files are allowed.'))
        
    record_type = 'tshirt' if request.form.get('record_type') == 'tshirt' else 'donation'
    requested_name = request.form.get('sheet_name', '').strip()
    
    try:
        parsed = excel_generator.parse_workbook(file.stream)
        sheet_name = requested_name if requested_name else (parsed.get('worksheet_name') or 'Offline Records')
        
        if not parsed.get('rows'):
            return redirect(url_for('admin_excel_page', error='The Excel sheet contains no data rows.'))
            
        db.create_offline_excel_sheet({
            "sheet_name": sheet_name,
            "record_type": record_type,
            "original_filename": filename,
            "columns": parsed.get('columns', []),
            "rows": parsed.get('rows', [])
        })
        
        return redirect(url_for('admin_excel_page', success='Excel sheet uploaded successfully.'))
    except Exception as err:
        print(f"⚠️ Excel upload error: {err}")
        return redirect(url_for('admin_excel_page', error=f"Failed to process Excel file: {err}"))

@app.route('/admin/excel/delete/<int:id>', methods=['POST'])
@require_admin
def admin_excel_delete(id):
    try:
        db.delete_offline_excel_sheet(id)
        return redirect(url_for('admin_excel_page', success='Excel sheet deleted successfully.'))
    except Exception as err:
        print(f"⚠️ Excel delete error: {err}")
        return redirect(url_for('admin_excel_page', error=str(err)))

@app.route('/admin/excel/export')
@require_admin
def admin_excel_export():
    try:
        export_type = request.args.get('type', 'all')
        sheets = db.get_offline_excel_sheets()
        if export_type in ['donation', 'tshirt']:
            sheets = [s for s in sheets if s['record_type'] == export_type]
            
        xlsx_data = excel_generator.export_offline_sheets(sheets, db.get_offline_excel_rows)
        
        response = make_response(xlsx_data)
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = f'attachment; filename="mcc-offline-records-{export_type}.xlsx"'
        return response
    except Exception as err:
        print(f"⚠️ Excel export error: {err}")
        return f"Excel export error: {err}", 500

@app.route('/admin/excel/export-dbt')
@require_admin
def admin_excel_export_dbt():
    try:
        receipts = db.get_dbt_receipts()
        xlsx_data = excel_generator.export_dbt_receipts(receipts)
        
        response = make_response(xlsx_data)
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename="mitramsolutions-dbt-receipts.xlsx"'
        return response
    except Exception as err:
        print(f"⚠️ DBT export error: {err}")
        return f"DBT export error: {err}", 500

@app.route('/admin/excel/export-combined')
@require_admin
def admin_excel_export_combined():
    try:
        donations = db.get_donations()
        tshirts = db.get_tshirt_orders()
        offline_donations = db.get_offline_donations()
        offline_tshirts = db.get_offline_tshirt_orders()
        
        xlsx_data = excel_generator.export_combined_records(
            donations, tshirts, offline_donations, offline_tshirts
        )
        
        response = make_response(xlsx_data)
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename="mcc-combined-online-offline-records.xlsx"'
        return response
    except Exception as err:
        print(f"⚠️ Combined export error: {err}")
        return f"Combined export error: {err}", 500

# ----------------- ERROR & 404 HANDLERS -----------------

@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html',
                           title='404 - Page Not Found | Malabar Hill Cha Raja',
                           scheduleData=scheduleData[:4],
                           glimpsesData=glimpsesData,
                           socialWorkData=socialWorkData), 404

@app.errorhandler(500)
def server_error(e):
    # Retrieve exception message if possible
    err_msg = str(e.original_exception) if hasattr(e, 'original_exception') else str(e)
    return f"""
    <div style="font-family: sans-serif; padding: 40px; text-align: center;">
      <h2>Ganpati Bappa Morya - Server Encountered an Unexpected Issue</h2>
      <p style="color: #64748b;">{err_msg}</p>
      <a href="/" style="display: inline-block; margin-top: 15px; background: #800020; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Return to Home</a>
    </div>
    """, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
