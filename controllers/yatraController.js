const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Ganeshotsav Event Schedule Data for Malabar Hill Cha Raja
const scheduleData = [
  {
    day: 1,
    title: 'Padya Pujan & Mandal Sankalp Sohala',
    title_en: 'Padya Pujan & Mandal Sankalp Sohala',
    title_mr: 'पाद्यपूजन व मंडळ संकल्प सोहळा',
    date: 'Day 1 (Ganeshotsav Countdown)',
    date_en: 'Day 1 (Ganeshotsav Countdown)',
    date_mr: 'दिवस १ (गणेशोत्सव पूर्वतयारी)',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Vedic Mantra Chanting', 'Floral Arch Decoration', 'Modak Prasad Distribution'],
    facilities_mr: ['वैदिक मंत्रोच्चार', 'फुलांची कमान सजावट', 'मोदक प्रसाद वाटप'],
    emergency_contact: '+91 98765 11111'
  },
  {
    day: 2,
    title: 'Grand Aagman Sohala (Arrival Procession)',
    title_en: 'Grand Aagman Sohala (Arrival Procession)',
    title_mr: 'भव्य आगमन सोहळा',
    date: 'Day 2 (Aagman Day)',
    date_en: 'Day 2 (Aagman Day)',
    date_mr: 'दिवस २ (आगमन दिवस)',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Nashik Dhol & Tasha Pathak', 'Gulal & Flower Rain', 'Security & Crowd Assistance'],
    facilities_mr: ['नाशिक ढोल-ताशा पथक', 'गुलाल व पुष्पवृष्टी', 'सुरक्षा व गर्दी व्यवस्थापन'],
    emergency_contact: '+91 98765 22222'
  },
  {
    day: 3,
    title: 'Pratishthapana & First Maha Aarti',
    title_en: 'Pratishthapana & First Maha Aarti',
    title_mr: 'प्राणप्रतिष्ठापना व प्रथम महाआरती',
    date: 'Day 3 (Ganesh Chaturthi)',
    date_en: 'Day 3 (Ganesh Chaturthi)',
    date_mr: 'दिवस ३ (गणेश चतुर्थी)',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Morning 8:00 AM Aarti', 'General Darshan Queue', 'Evening 8:00 PM Maha Aarti'],
    facilities_mr: ['सकाळी ८:०० वाजता आरती', 'सामान्य दर्शन रांग', 'संध्याकाळी ८:०० वाजता महाआरती'],
    emergency_contact: '+91 98765 33333'
  },
  {
    day: 4,
    title: 'Annadan Mahaprasad Seva',
    title_en: 'Annadan Mahaprasad Seva',
    title_mr: 'अन्नदान महाप्रसाद सेवा',
    date: 'Day 4',
    date_en: 'Day 4',
    date_mr: 'दिवस ४',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Hot Mahaprasad Meals', 'Drinking Water Booths', 'Medical First Aid Desk'],
    facilities_mr: ['गरम महाप्रसाद भोजन', 'पिण्याच्या पाण्याची व्यवस्था', 'वैद्यकीय प्रथमोपचार केंद्र'],
    emergency_contact: '+91 98765 44444'
  },
  {
    day: 5,
    title: 'Cultural & Bhajan Sandhya',
    title_en: 'Cultural & Bhajan Sandhya',
    title_mr: 'सांस्कृतिक व भजन संध्या',
    date: 'Day 5',
    date_en: 'Day 5',
    date_mr: 'दिवस ५',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Traditional Folk Performances', 'Karyakarta Assistance Desk', 'Wheelchair Support'],
    facilities_mr: ['पारंपरिक लोककला सादरीकरण', 'कार्यकर्ता मदत कक्ष', 'व्हीलचेअर सहाय्य'],
    emergency_contact: '+91 98765 55555'
  },
  {
    day: 6,
    title: 'Special Health & Blood Donation Camp',
    title_en: 'Special Health & Blood Donation Camp',
    title_mr: 'विशेष आरोग्य व रक्तदान शिबीर',
    date: 'Day 6',
    date_en: 'Day 6',
    date_mr: 'दिवस ६',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Free Health Checkup', 'Blood Donation Drive', 'Devotee Welfare Desk'],
    facilities_mr: ['मोफत आरोग्य तपासणी', 'रक्तदान शिबीर', 'भाविक सेवा कक्ष'],
    emergency_contact: '+91 98765 66666'
  },
  {
    day: 7,
    title: 'Gauri Ganpati Visarjan & Evening Aarti',
    title_en: 'Gauri Ganpati Visarjan & Evening Aarti',
    title_mr: 'गौरी गणपती विसर्जन व सायंकाळची आरती',
    date: 'Day 7',
    date_en: 'Day 7',
    date_mr: 'दिवस ७',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Special Flower Decoration', 'Prasad Distribution', '24/7 Security Patrol'],
    facilities_mr: ['विशेष पुष्प सजावट', 'प्रसाद वाटप', '२४/७ सुरक्षा गस्त'],
    emergency_contact: '+91 98765 77777'
  },
  {
    day: 8,
    title: 'Grand Deepotsav & Chappan Bhog',
    title_en: 'Grand Deepotsav & Chappan Bhog',
    title_mr: 'भव्य दीपोत्सव व छप्पन भोग',
    date: 'Day 8',
    date_en: 'Day 8',
    date_mr: 'दिवस ८',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['1008 Diya Deepotsav', 'Traditional Bhog Offering', 'Live Camera Stream Desk'],
    facilities_mr: ['१००८ दिव्यांचा दीपोत्सव', 'पारंपरिक भोग अर्पण', 'लाईव्ह कॅमेरा प्रवाह कक्ष'],
    emergency_contact: '+91 98765 88888'
  },
  {
    day: 9,
    title: 'Senior Citizen & Child Special Darshan',
    title_en: 'Senior Citizen & Child Special Darshan',
    title_mr: 'ज्येष्ठ नागरिक व बालकांसाठी विशेष दर्शन',
    date: 'Day 9',
    date_en: 'Day 9',
    date_mr: 'दिवस ९',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Priority Senior Queue', 'Assisted Shuttle', 'Emergency Ambulance'],
    facilities_mr: ['ज्येष्ठांसाठी प्राधान्य रांग', 'सहाय्यक शटल सेवा', 'आपत्कालीन रुग्णवाहिका'],
    emergency_contact: '+91 98765 99999'
  },
  {
    day: 10,
    title: 'Anant Chaturdashi Uttarpuja & Visarjan Miravand',
    title_en: 'Anant Chaturdashi Uttarpuja & Visarjan Miravand',
    title_mr: 'अनंत चतुर्दशी उत्तरपूजा व विसर्जन मिरवणूक',
    date: 'Day 10 (Grand Farewell)',
    date_en: 'Day 10 (Grand Farewell)',
    date_mr: 'दिवस १० (भव्य निरोप)',
    halt_location: 'Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007',
    facilities: ['Grand Procession Chariot', 'Lifeguard Team', 'Girgaon Visarjan Seva'],
    facilities_mr: ['भव्य मिरवणूक रथ', 'जीवरक्षक पथक', 'गिरगाव विसर्जन सेवा'],
    emergency_contact: '+91 98765 00000'
  }
];

// Glimpses over a Decade (10+ Years Historical Retrospective Data)
const glimpsesData = [
  {
    year: '2025',
    category: 'idols',
    title: 'काष्ठ सिंहासन व राजेशाही सुवर्ण शृंगार (Royal Wooden Throne)',
    theme: 'Peshwa Era Palace Mandap Architecture',
    height: '18 Feet',
    artist: 'Master Sculptor Shri Santosh Kambli',
    image: '/images/malabar_ganpati_1.jpg',
    desc: 'The magnificent wooden throne form dressed in royal pink and maroon silk robes.'
  },
  {
    year: '2024',
    category: 'idols',
    title: 'सुवर्ण सिंहासन व तेज:पुंज पीत पितांबर (Golden Throne)',
    theme: 'Golden Temple Carvings & Lotus Arch',
    height: '18 Feet',
    artist: 'Mandal Artisans & Sculptors',
    image: '/images/malabar_ganpati_2.jpg',
    desc: 'Radiant idol in yellow pitambar seated on handcrafted gold-leaf throne.'
  },
  {
    year: '2023',
    category: 'visarjan',
    title: 'मयूरपंख कमान आगमन सोहळा (Peacock Feather Arch)',
    theme: 'Royal Heritage Court Decor',
    height: '18 Feet',
    artist: 'Mandal Karyakartas',
    image: '/images/malabar_ganpati_3.jpg',
    desc: 'Grand procession throne featuring peacock feather arches during Aagman Sohala.'
  },
  {
    year: '2022',
    category: 'aarti',
    title: 'श्री मुख दर्शन व सुवर्ण मुकुट (Divine Face & Gold Crown)',
    theme: 'Tradition of Pure Devotion',
    height: '18 Feet',
    artist: 'Sculptor Shri Santosh Kambli',
    image: '/images/malabar_ganpati_4.jpg',
    desc: 'Mesmerizing facial smile with gold crown and Modak blessing hand posture.'
  },
  {
    year: '2021',
    category: 'decor',
    title: 'गर्भगृह पुष्प शृंगार दर्शन (Floral Sanctuary Decor)',
    theme: 'Royal Velvet & Lotus Geometry',
    height: '18 Feet',
    artist: 'Mandal Design Team',
    image: '/images/malabar_ganpati_5.jpg',
    desc: 'Idol adorned in purple pitambar with backdrop of 5000+ fresh orchid & marigold flowers.'
  },
  {
    year: '2020',
    category: 'aarti',
    title: 'आरोग्य संकल्प व सुवर्ण पदकमयी रूप (Arogya Sankalp)',
    theme: 'Eco-Friendly Clay & Silver Throne',
    height: '12 Feet',
    artist: 'Master Sculptor Shri Santosh Kambli',
    image: '/images/malabar_ganpati_5.jpg',
    desc: 'Sacred silver throne during pandemic health drive and blood donation initiative.'
  },
  {
    year: '2019',
    category: 'decor',
    title: 'राजवाडा महामंडप व सुवर्ण मेघडंबरी (Royal Palace Dome)',
    theme: 'Fort Raigad & Palace Architecture',
    height: '18 Feet',
    artist: 'Mandal Artisans & Sculptors',
    image: '/images/malabar_ganpati_2.jpg',
    desc: 'Grand traditional Maratha palace setup with ornate golden arches.'
  },
  {
    year: '2018',
    category: 'visarjan',
    title: 'भव्य विसर्जन मिरवणूक व तुतारी शंखनाद (Grand Visarjan)',
    theme: 'Traditional Dhol Tasha & Gulal Rain',
    height: '18 Feet',
    artist: 'Mandal Karyakartas',
    image: '/images/malabar_ganpati_4.jpg',
    desc: 'Grand procession and visarjan seva associated with Malabar Hill Cha Raja.'
  },
  {
    year: '2017',
    category: 'idols',
    title: 'रत्नजडित मुकुट व पीतांबर शृंगार (Jeweled Crown & Silk)',
    theme: 'Classic Temple Carvings',
    height: '18 Feet',
    artist: 'Sculptor Shri Santosh Kambli',
    image: '/images/malabar_ganpati_6.jpg',
    desc: 'Classic 18ft idol embellished with traditional Kolhapuri gold jewelry.'
  },
  {
    year: '2016',
    category: 'decor',
    title: 'रौप्य कमान व प्रथम दीप सोहळा (Silver Arch Deepotsav)',
    theme: 'Heritage Chawl Jubilee Decor',
    height: '18 Feet',
    artist: 'Mandal Team',
    image: '/images/malabar_ganpati_1.jpg',
    desc: 'Illuminated 1008 lamps ceremony and silver backdrop arch.'
  },
  {
    year: '2015',
    category: 'idols',
    title: 'दशकपूर्ती आगमन व राजेशाही पदचिन्ह (Decade Milestone)',
    theme: 'Traditional Heritage Crafts',
    height: '18 Feet',
    artist: 'Master Sculptor Shri Santosh Kambli',
    image: '/images/malabar_ganpati_2.jpg',
    desc: 'Iconic historic idol sculpture marking 27th grand year of Mandal establishment.'
  }
];

// Social Work Data
const socialWorkData = [
  {
    id: 'annadan',
    title: 'अन्नदान महाप्रसाद सेवा (Annadan Mahaprasad Drive)',
    category: 'Food Security',
    image: '/images/malabar_ganpati_5.jpg',
    desc: 'Serving over 50,000+ hot nutritious meals, fresh breakfast, tea, and packaged water to visiting devotees and local community daily during Ganeshotsav.'
  },
  {
    id: 'blood-donation',
    title: 'भव्य रक्तदान व आरोग्य शिबीर (Blood Donation & Health Camp)',
    category: 'Healthcare',
    image: '/images/malabar_ganpati_2.jpg',
    desc: 'Organizing annual blood donation drives in association with KEM & Nair Hospitals, collecting 500+ blood units every festival season.'
  },
  {
    id: 'education',
    title: 'विद्यार्थी शैक्षणिक सहाय्य (Student Educational Aid)',
    category: 'Education',
    image: '/images/malabar_ganpati_4.jpg',
    desc: 'Providing notebooks, school bags, e-learning tablets, and scholarships to underprivileged students residing in Malabar Hill area.'
  },
  {
    id: 'csr-environment',
    title: 'पर्यावरणपूरक गणेशोत्सव व वृक्षारोपण (Green Ganeshotsav & Tree Plantation)',
    category: 'Environment',
    image: '/images/malabar_ganpati_6.jpg',
    desc: 'Promoting eco-friendly clay idols, zero plastic mandap premises, and planting 1,000+ saplings annually across Mumbai.'
  }
];

// Committee Members Data - 2025-26
const committeeData = [
  {
    number: 1,
    nameMr: 'श्री. संदीप बाबू सावळ',
    nameEn: 'Shri Sandeep Bapu Sawal',
    designationMr: 'अध्यक्ष',
    designationEn: 'President'
  },
  {
    number: 2,
    nameMr: 'श्री. महेश रामचंद्र जगताप',
    nameEn: 'Shri Mahesh Ramchandra Jagtap',
    designationMr: 'सरचिटणीस',
    designationEn: 'General Secretary'
  },
  {
    number: 3,
    nameMr: 'श्री. उर्वेश राजेंद्र शिंदे',
    nameEn: 'Shri Urvesh Rajendra Shinde',
    designationMr: 'सहचिटणीस',
    designationEn: 'Joint Secretary'
  },
  {
    number: 4,
    nameMr: 'श्री. अविनाश चंद्रकांत पाथरे',
    nameEn: 'Shri Avinash Chandrakant Pathare',
    designationMr: 'सहचिटणीस',
    designationEn: 'Joint Secretary'
  },
  {
    number: 5,
    nameMr: 'श्री. प्रसाद विष्णू चव्हाण',
    nameEn: 'Shri Prasad Vishnu Chavan',
    designationMr: 'अंतर्गत हिशोब तपासणीस',
    designationEn: 'Internal Auditor'
  },
  {
    number: 6,
    nameMr: 'श्री. मुरारी प्रदीप तावडे',
    nameEn: 'Shri Murari Pradeep Tawde',
    designationMr: 'उपाध्यक्ष',
    designationEn: 'Vice President'
  },
  {
    number: 7,
    nameMr: 'श्री. निलेश पांडुरंग कांबळे',
    nameEn: 'Shri Nilesh Pandurang Kamble',
    designationMr: 'खजिनदार',
    designationEn: 'Treasurer'
  },
  {
    number: 8,
    nameMr: 'श्री. गोवर्धन जगाभाऊ पाटील',
    nameEn: 'Shri Govardhan Jagabhau Patil',
    designationMr: 'सहचिटणीस',
    designationEn: 'Joint Secretary'
  },
  {
    number: 9,
    nameMr: 'श्री. यश दिनेश पयेर',
    nameEn: 'Shri Yash Dinesh Payer',
    designationMr: 'सहचिटणीस',
    designationEn: 'Joint Secretary'
  },
  {
    number: 10,
    nameMr: 'श्री. दर्शन मंगेश येलवे',
    nameEn: 'Shri Darshan Mangesh Yelave',
    designationMr: 'सह अंतर्गत हिशोब तपासणीस',
    designationEn: 'Joint Internal Auditor'
  }
];

module.exports = {
  // Render Home Page
  renderHomePage(req, res) {
    const status = db.getYatraStatus();
    res.render('index', {
      title: 'Malabar Hill Cha Raja | Shree Bal Gopal Ganeshutsav Mandal',
      activeTab: 'home',
      yatraStatus: status,
      scheduleData: scheduleData.slice(0, 4),
      glimpsesData,
      socialWorkData
    });
  },

  // Render About Us Page
  renderAboutPage(req, res) {
    res.render('about', {
      title: 'आमच्याबद्दल | Malabar Hill Cha Raja Official',
      activeTab: 'about'
    });
  },

  // Render Schedule Page
  renderSchedulePage(req, res) {
    const status = db.getYatraStatus();
    res.render('schedule', {
      title: 'गणेशोत्सव कार्यसूची व आरती वेळ | Malabar Hill Cha Raja',
      activeTab: 'schedule',
      yatraStatus: status,
      scheduleData
    });
  },

  // Render Glimpses Page
  renderGlimpsesPage(req, res) {
    const galleryFiles = (folder, url) => fs.readdirSync(path.join(__dirname, '..', folder))
      .filter(file => /\.(jpe?g|png|webp)$/i.test(file))
      .map(file => ({
        file,
        url: `${url}/${encodeURIComponent(file)}`,
        date: (file.match(/2026-\d{2}-\d{2}/) || [])[0] || null
      }));
    const bappaGallery = galleryFiles('Bappa Pics', '/gallery/bappa').map(photo => ({ ...photo, category: 'bappa', title: 'Bappa Darshan' }));
    const celebrityGallery = galleryFiles('Celebrities', '/gallery/celebrities').map(photo => ({ ...photo, category: 'celebrities', title: 'Celebrity Visit' }));
    res.render('glimpses', {
      title: 'वर्षभरातील क्षणचित्रे | Malabar Hill Cha Raja',
      activeTab: 'glimpses',
      archiveData: [...bappaGallery, ...celebrityGallery],
      celebrityGallery,
      bappaGallery
    });
  },

  // Render Decade Gallery (Renamed from Photo Booth)
  renderPhotoBoothPage(req, res) {
    res.render('photo-booth', {
      title: 'दशकातील क्षणचित्रे (२०१५-२०२५) | Malabar Hill Cha Raja',
      activeTab: 'photobooth',
      glimpsesData
    });
  },

  // Render Social Work Page
  renderSocialWorkPage(req, res) {
    res.render('social-work', {
      title: 'सामाजिक कार्य व सेवा | Malabar Hill Cha Raja',
      activeTab: 'socialwork',
      socialWorkData
    });
  },

  renderCommitteePage(req, res) {
    res.render('committee', {
      title: 'कार्यकारिणी समिती | Malabar Hill Cha Raja',
      activeTab: 'committee',
      committeeData
    });
  },

  // Live Status API
  getLiveStatusApi(req, res) {
    const status = db.getYatraStatus();
    res.json({ success: true, status });
  }
};
