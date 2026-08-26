/**
 * Malabar Hill Cha Raja - Main Frontend Interactions
 * Libraries: GSAP, ScrollTrigger, Swiper.js
 * Official Mandal: Shree Bal Gopal Ganeshutsav Mandal
 */

window.addEventListener('error', function(e) {
  try {
    var errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#ff0055;color:#fff;z-index:999999;padding:15px;font-family:monospace;font-size:14px;border-bottom:3px solid #000;';
    errDiv.innerHTML = '<strong>JS Error:</strong> ' + e.message + ' at ' + e.filename + ':' + e.lineno;
    document.body.appendChild(errDiv);
  } catch(err) {}
});

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-list');
        icon.classList.toggle('bi-x');
      }
    });

    mainNav.querySelectorAll('a, button').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1220) {
          mainNav.classList.remove('active');
          const icon = mobileToggle.querySelector('i');
          if (icon) {
            icon.classList.add('bi-list');
            icon.classList.remove('bi-x');
          }
        }
      });
    });
  }

  // ==========================================================================
  // CUSTOM STUDIO FOLLOWER CURSOR LOGIC
  // ==========================================================================
  const cursorDot = document.getElementById('customCursorDot');
  const cursorOutline = document.getElementById('customCursorOutline');
  const isTouchDevice = window.matchMedia('(pointer: coarse), (hover: none)').matches;

  if (isTouchDevice && cursorDot && cursorOutline) {
    cursorDot.style.display = 'none';
    cursorOutline.style.display = 'none';
  }

  if (!isTouchDevice && cursorDot && cursorOutline) {
    let mouseX = -100, mouseY = -100;
    let outlineX = -100, outlineY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    function animateCursor() {
      outlineX += (mouseX - outlineX) * 0.18;
      outlineY += (mouseY - outlineY) * 0.18;
      cursorOutline.style.left = `${outlineX}px`;
      cursorOutline.style.top = `${outlineY}px`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .filter-pill, .gold-motion-frame, .scroll-reel-card, [data-lightbox], .mandala-node-item, .lang-btn')) {
        document.body.classList.add('cursor-hover');
      } else {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  // Live Video Streaming Modal Listener
  const btnLiveDarshanModal = document.getElementById('btnLiveDarshanModal');
  const videoModal = document.getElementById('videoModal');
  const btnCloseVideoModal = document.getElementById('btnCloseVideoModal');

  if (btnLiveDarshanModal && videoModal) {
    btnLiveDarshanModal.addEventListener('click', (e) => {
      e.preventDefault();
      videoModal.classList.add('active');
    });
  }

  if (btnCloseVideoModal && videoModal) {
    btnCloseVideoModal.addEventListener('click', () => {
      videoModal.classList.remove('active');
    });
  }

  // Close modal when clicking background overlay
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        videoModal.classList.remove('active');
      }
    });
  }

  // GSAP Animations (if loaded)
  if (typeof gsap !== 'undefined') {
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    gsap.from('.hero-content h1', {
      opacity: 0,
      y: 35,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.hero-subtitle', {
      opacity: 0,
      y: 25,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out'
    });
  }

  // ==========================================================================
  // SCROLL EVENT INTERACTIVE INFO POP-UP LOGIC
  // ==========================================================================
  const scrollInfoPopup = document.getElementById('scrollInfoPopup');
  const btnCloseScrollPopup = document.getElementById('btnCloseScrollPopup');

  if (scrollInfoPopup) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300 && !sessionStorage.getItem('mcc_popup_dismissed')) {
        scrollInfoPopup.classList.add('visible');
      }
    });

    if (btnCloseScrollPopup) {
      btnCloseScrollPopup.addEventListener('click', () => {
        scrollInfoPopup.classList.remove('visible');
        sessionStorage.setItem('mcc_popup_dismissed', 'true');
      });
    }
  }

  // ==========================================================================
  // GALLERY LIGHTBOX PREVIEW MODAL
  // ==========================================================================
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const btnCloseLightbox = document.getElementById('btnCloseLightbox');

  document.querySelectorAll('[data-lightbox]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const imgSrc = item.getAttribute('data-lightbox-src') || item.src;
      const title = item.getAttribute('data-lightbox-title') || 'Malabar Hill Cha Raja';
      const caption = item.getAttribute('data-lightbox-caption') || '';

      if (lightboxModal && lightboxImg) {
        lightboxImg.src = imgSrc;
        if (lightboxTitle) lightboxTitle.innerText = title;
        if (lightboxCaption) lightboxCaption.innerText = caption;
        lightboxModal.classList.add('active');
      }
    });
  });

  if (btnCloseLightbox && lightboxModal) {
    btnCloseLightbox.addEventListener('click', () => {
      lightboxModal.classList.remove('active');
    });

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // GALLERY CATEGORY FILTER PILLS
  // ==========================================================================
  const filterPills = document.querySelectorAll('.filter-pill');
  const galleryItems = document.querySelectorAll('.gallery-card-item');

  if (filterPills.length > 0 && galleryItems.length > 0) {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const category = pill.getAttribute('data-filter');
        galleryItems.forEach(item => {
          const itemCat = item.getAttribute('data-category');
          if (category === 'all' || itemCat === category) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  // ==========================================================================
  // GANESHOTSAV 3D RETRO FLIP-CLOCK COUNTDOWN TIMER
  // ==========================================================================
  const countdownTarget = new Date(2026, 8, 14, 0, 0, 0).getTime();

  function animateCountdownUnit(el, value) {
    if (!el) return;
    const parentEl = el.closest('.flip-clock-unit');
    const previousValue = el.dataset.value || '';
    if (previousValue !== value) {
      el.textContent = value;
      el.dataset.value = value;
      if (parentEl) {
        parentEl.classList.remove('fade-update');
        void parentEl.offsetWidth;
        parentEl.classList.add('fade-update');
      }
    }
  }

  function updateCountdown() {
    const now = Date.now();
    const diff = countdownTarget - now;
    const countdownFinished = document.getElementById('countdownFinished');
    if (diff <= 0 && countdownFinished) {
      countdownFinished.hidden = false;
      document.querySelector('.flip-clock-grid')?.setAttribute('hidden', '');
    }
    const safeDiff = diff > 0 ? diff : 0;

    const values = {
      days: String(Math.floor(safeDiff / 86400000)).padStart(2, '0'),
      hours: String(Math.floor((safeDiff % 86400000) / 3600000)).padStart(2, '0'),
      mins: String(Math.floor((safeDiff % 3600000) / 60000)).padStart(2, '0'),
      secs: String(Math.floor((safeDiff % 60000) / 1000)).padStart(2, '0')
    };

    animateCountdownUnit(document.getElementById('countDays'), values.days);
    animateCountdownUnit(document.getElementById('countHours'), values.hours);
    animateCountdownUnit(document.getElementById('countMins'), values.mins);
    animateCountdownUnit(document.getElementById('countSecs'), values.secs);
  }

  const startCountdown = () => {
    updateCountdown();
    window.clearInterval(window.countdownTimer);
    window.countdownTimer = window.setInterval(updateCountdown, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCountdown, { once: true });
  } else {
    startCountdown();
  }

  window.setTimeout(startCountdown, 120);

  // ==========================================================================
  // TOP UTILITY BAR SCROLL COLLAPSE LOGIC
  // ==========================================================================
  const topUtilityBar = document.getElementById('topUtilityBar');
  let lastScrollY = window.scrollY;

  if (topUtilityBar) {
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 80 && currentScrollY > lastScrollY) {
        topUtilityBar.classList.add('collapsed');
      } else {
        topUtilityBar.classList.remove('collapsed');
      }
      lastScrollY = currentScrollY;
    });
  }

  // ==========================================================================
  // HERO 3-SLIDE CAROUSEL LOGIC
  // ==========================================================================
  const heroSlides = document.querySelectorAll('.hero-slide');
  const carouselDots = document.querySelectorAll('.carousel-dot');

  if (heroSlides.length > 0 && carouselDots.length > 0) {
    let currentSlide = 0;
    const slideCount = heroSlides.length;

    function goToSlide(index) {
      heroSlides.forEach((slide, i) => {
        if (i === index) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      carouselDots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
      currentSlide = index;
    }

    function nextSlide() {
      const nextIndex = (currentSlide + 1) % slideCount;
      goToSlide(nextIndex);
    }

    carouselDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
        if (!isNaN(slideIndex)) {
          goToSlide(slideIndex);
        }
      });
    });

    setInterval(nextSlide, 6500);
  }

  // ==========================================================================
  // ANIMATED STAT NUMBER COUNTERS (Intersection Observer)
  // ==========================================================================
  const statNumElements = document.querySelectorAll('.stat-num-value[data-target]');

  if (statNumElements.length > 0 && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetNum = parseInt(el.getAttribute('data-target'), 10);
          const prefix = el.getAttribute('data-prefix') || '';
          const suffix = el.getAttribute('data-suffix') || '';

          if (!isNaN(targetNum)) {
            let startNum = 0;
            const duration = 2000;
            const stepTime = 30;
            const steps = duration / stepTime;
            const increment = targetNum / steps;

            const timer = setInterval(() => {
              startNum += increment;
              if (startNum >= targetNum) {
                el.innerText = prefix + targetNum.toLocaleString() + suffix;
                clearInterval(timer);
              } else {
                el.innerText = prefix + Math.floor(startNum).toLocaleString() + suffix;
              }
            }, stepTime);
          }
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    statNumElements.forEach(el => observer.observe(el));
  }

  // ==========================================================================
  // CRAZY 3D REEL SCROLL VIEW & PERSPECTIVE CONTROLLER
  // ==========================================================================
  const crazyContainers = document.querySelectorAll('.crazy-reel-container');

  crazyContainers.forEach(container => {
    const wrapper = container.closest('.crazy-reel-wrapper');
    const prevBtn = wrapper ? wrapper.querySelector('.crazy-reel-nav-btn.prev') : null;
    const nextBtn = wrapper ? wrapper.querySelector('.crazy-reel-nav-btn.next') : null;
    const cards = container.querySelectorAll('.crazy-reel-card');

    // Drag-to-scroll State
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
      isDown = true;
      container.classList.add('active');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.classList.remove('active');
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.classList.remove('active');
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    });

    // Prev / Next Button Navigation
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        container.scrollBy({ left: -340, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        container.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }

    // 3D Perspective Scroll Scaling Effect
    function updateCard3DTransforms() {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      cards.forEach(card => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distanceFromCenter = (cardCenter - containerCenter) / (containerRect.width / 2);

        const maxRotation = 14; // deg
        const rotationY = Math.max(-maxRotation, Math.min(maxRotation, distanceFromCenter * -maxRotation));
        const scale = Math.max(0.88, 1 - Math.abs(distanceFromCenter) * 0.12);

        if (!card.matches(':hover')) {
          card.style.transform = `perspective(1000px) rotateY(${rotationY}deg) scale(${scale})`;
        }
      });
    }

    container.addEventListener('scroll', updateCard3DTransforms, { passive: true });
    window.addEventListener('resize', updateCard3DTransforms);
    updateCard3DTransforms();

    // 3D Tilt on Hover Tracking
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        card.style.transform = `perspective(1000px) translateY(-10px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        updateCard3DTransforms();
      });
    });

    // Auto-scroll functionality with hover pause
    let autoScrollTimer = null;
    function startAutoScroll() {
      autoScrollTimer = setInterval(() => {
        if (!isDown) {
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollBy({ left: 320, behavior: 'smooth' });
          }
        }
      }, 4200);
    }

    function stopAutoScroll() {
      if (autoScrollTimer) clearInterval(autoScrollTimer);
    }

    container.addEventListener('mouseenter', stopAutoScroll);
    container.addEventListener('mouseleave', startAutoScroll);
    startAutoScroll();
  });

  // ==========================================================================
  // SCROLL REVEAL (FADE-IN FADE-OUT) INTERSECTION OBSERVER
  // ==========================================================================
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  if (revealElements.length > 0 && typeof IntersectionObserver !== 'undefined') {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          // Fade out smoothly when scrolling away if desired
          if (entry.boundingClientRect.top > 0) {
            entry.target.classList.remove('is-visible');
          }
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ==========================================================================
  // CRAZY INDIE MANDALA TIMELINE INTERACTIVE YEAR SHOWCASE
  // ==========================================================================
  const yearNodes = document.querySelectorAll('.mandala-node-item');
  const showcaseBox = document.getElementById('mandalaYearShowcase');
  const showcaseYearImg = document.getElementById('showcaseYearImg');
  const showcaseYearBadge = document.getElementById('showcaseYearBadge');
  const showcaseSubhead = document.getElementById('showcaseSubhead');
  const showcaseYearTitle = document.getElementById('showcaseYearTitle');
  const showcaseYearDesc = document.getElementById('showcaseYearDesc');
  const showcaseFeat1 = document.getElementById('showcaseFeat1');
  const showcaseFeat2 = document.getElementById('showcaseFeat2');
  const showcaseFeat3 = document.getElementById('showcaseFeat3');
  const btnPrevYearNode = document.getElementById('btnPrevYearNode');
  const btnNextYearNode = document.getElementById('btnNextYearNode');

  const timelineYearData = {
    '1973': {
      yearTag: 'वर्ष १९७३',
      subhead: 'स्थापना पर्व',
      title: 'मंडळ स्थापना व प्रथम श्री स्थापना',
      desc: 'श्री बाल गोपाल गणेशोत्सव मंडळ भाजी गल्ली, शंकर शेठ रोड, ग्रँट रोड येथील रहिवाशांनी एकत्र येऊन सार्वजनिक गणेशोत्सव मंडळाची स्थापना केली. अखंड भक्ती, परंपरा आणि सामाजिक ऐक्याचा ऐतिहासिक पाया १९७३ मध्ये रचला गेला.',
      image: '/images/malabar_ganpati_1.jpg',
      feat1: 'स्थापना: १९७३',
      feat2: 'स्थान: श्री बाल गोपाल गणेशोत्सव मंडळ भाजी गल्ली, शंकर शेठ रोड, ग्रँट रोड',
      feat3: 'संकल्पना: सांस्कृतिक ऐक्य'
    },
    '2000': {
      yearTag: 'वर्ष २०००',
      subhead: 'सेवा विस्तार',
      title: 'अन्नदान महाप्रसाद व सामाजिक उपक्रम',
      desc: 'मंडळाने धार्मिक उत्सवासोबत सामाजिक सेवेचा विस्तार केला. ५०,०००+ भाविकांसाठी भव्य अन्नदान महाप्रसाद, मोफत वैद्यकीय तपासणी आणि विद्यार्थी साहित्याची सुरुवात झाली.',
      image: '/images/malabar_ganpati_5.jpg',
      feat1: 'अन्नछत्र: ५०,०००+ भाविक',
      feat2: 'आरोग्य: मोफत शिबीर',
      feat3: 'मदत: शैक्षणिक साहित्य'
    },
    '2015': {
      yearTag: 'वर्ष २०१५',
      subhead: 'दशकपूर्ती सुवर्ण पर्व',
      title: 'दशकपूर्ती व १८ फूट राजेशाही रूप',
      desc: 'प्रसिद्ध मास्टर मूर्तिकार श्री. संतोष कांबळी यांच्या हस्तकलेतून १८ फुटी राजेशाही मूर्तीची परंपरा अधिक समृद्ध झाली. सुवर्ण सिंहासन व विलोभनीय शृंगार अवघ्या मुंबईत प्रसिद्ध झाला.',
      image: '/images/malabar_ganpati_2.jpg',
      feat1: 'उंची: १८ फूट',
      feat2: 'मूर्तिकार: श्री. संतोष कांबळी',
      feat3: 'शृंगार: सुवर्ण कमान'
    },
    '2020': {
      yearTag: 'वर्ष २०२०',
      subhead: 'आरोग्य संकल्प',
      title: 'आरोग्य संकल्प व सुवर्ण पदकमयी रूप',
      desc: 'कोरोना महामारीच्या काळात मंडळाने भव्य सामाजिक आरोग्य संकल्प राबवला. ५००+ युनिट्स रक्तदान आणि गरजू कुटुंबांना मोफत रेशन व वैद्यकीय सुरक्षा संच पुरवले गेले.',
      image: '/images/malabar_ganpati_6.jpg',
      feat1: 'रक्तदान: ५००+ युनिट्स',
      feat2: 'आरोग्य: वैद्यकीय मदत',
      feat3: 'सेवा: कुटुंब रेशन संच'
    },
    '2024': {
      yearTag: 'वर्ष २०२४',
      subhead: 'सुवर्ण सिंहासन शृंगार',
      title: 'सुवर्ण सिंहासन व तेज:पुंज पीत पितांबर',
      desc: 'हस्तकला नक्षीकामातील भव्य सुवर्ण सिंहासन आणि सुवर्ण मुकुटात विराजमान श्रींचे मनमोहक रूप. जगभरातून लाखो भाविकांनी थेट ऑनलाईन दर्शन घेतले.',
      image: '/images/malabar_ganpati_3.jpg',
      feat1: 'सिंहासन: हस्तकला सुवर्ण',
      feat2: 'वस्त्र: पीत पितांबर',
      feat3: 'दर्शन: ५ लाख+ भाविक'
    },
    '2025': {
      yearTag: 'वर्ष २०२५',
      subhead: 'पेशवाई काष्ठ सिंहासन व डिजिटल मंदिर',
      title: 'काष्ठ सिंहासन व डिजिटल दर्शन पोर्टल',
      desc: 'पेशवाई शैलीतील अप्रतिम काष्ठ सिंहासन आणि जागतिक भाविकांसाठी अत्याधुनिक २४/७ डिजिटल दर्शन व देणगी पोर्टलची निर्मिती करण्यात आली.',
      image: '/images/malabar_ganpati_4.jpg',
      feat1: 'काष्ठ सिंहासन: पेशवाई नक्षीकाम',
      feat2: 'डिजिटल: २४/७ लाईव्ह दर्शन',
      feat3: 'कर सवलत: ८०जी देणगी पावती'
    }
  };

  const yearKeys = Object.keys(timelineYearData);

  function setActiveTimelineYear(year) {
    const data = timelineYearData[year];
    if (!data || !showcaseBox) return;

    // Trigger visual pulse animation
    showcaseBox.classList.add('animating');

    setTimeout(() => {
      if (showcaseYearImg) showcaseYearImg.src = data.image;
      if (showcaseYearBadge) showcaseYearBadge.innerText = data.yearTag;
      if (showcaseSubhead) showcaseSubhead.innerText = data.subhead;
      if (showcaseYearTitle) showcaseYearTitle.innerText = data.title;
      if (showcaseYearDesc) showcaseYearDesc.innerText = data.desc;
      if (showcaseFeat1) showcaseFeat1.innerText = data.feat1;
      if (showcaseFeat2) showcaseFeat2.innerText = data.feat2;
      if (showcaseFeat3) showcaseFeat3.innerText = data.feat3;

      yearNodes.forEach(node => {
        if (node.getAttribute('data-year') === year) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });

      showcaseBox.classList.remove('animating');
    }, 200);
  }

  // Support data-year-node click attributes
  const nodeItems = document.querySelectorAll('[data-year-node]');
  if (nodeItems.length > 0) {
    nodeItems.forEach(item => {
      item.addEventListener('click', () => {
        const yr = item.getAttribute('data-year-node');
        nodeItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const showcaseImg = document.getElementById('showcaseImg');
        const showcaseYearBadge = document.getElementById('showcaseYearBadge');
        const showcaseTitle = document.getElementById('showcaseTitle');
        const showcaseTheme = document.getElementById('showcaseTheme');
        const showcaseDesc = document.getElementById('showcaseDesc');
        const showcaseBox = document.getElementById('mandalaShowcaseBox');

        const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('mhr_lang')) || 'en';

        const yearDetailsMr = {
          '2025': { title: 'काष्ठ सिंहासन व राजेशाही सुवर्ण शृंगार', theme: 'संकल्पना: Peshwa Era Palace Mandap Architecture', desc: 'पेशवाई नक्षीकामातील भव्य लाकडी सिंहासन आणि रेशमी पितांबर शृंगारातील १८ फुटी राजेशाही रूप दर्शन.', img: '/images/malabar_ganpati_1.jpg', badge: 'वर्ष २०२५' },
          '2024': { title: 'सुवर्ण सिंहासन व तेज:पुंज पीत पितांबर', theme: 'संकल्पना: Golden Temple Carvings & Lotus Arch', desc: 'हस्तकला नक्षीकामातील भव्य सुवर्ण सिंहासन आणि सुवर्ण मुकुटात विराजमान श्रींचे मनमोहक रूप.', img: '/images/malabar_ganpati_2.jpg', badge: 'वर्ष २०२४' },
          '2023': { title: 'मयूरपंख कमान आगमन सोहळा', theme: 'संकल्पना: Royal Heritage Court Decor', desc: 'मयुरासनी राजेशाही कमान आणि आगमन सोहळ्यातील श्रींचे भव्य रूप दर्शन.', img: '/images/malabar_ganpati_3.jpg', badge: 'वर्ष २०२३' },
          '2022': { title: 'श्री मुख दर्शन व सुवर्ण मुकुट', theme: 'संकल्पना: Tradition of Pure Devotion', desc: 'विलोभनीय हास्य, दिव्य नयन आणि सुवर्ण मुकुटातील १८ फुटी श्री मूर्ती रूप.', img: '/images/malabar_ganpati_4.jpg', badge: 'वर्ष २०२२' },
          '2021': { title: 'गर्भगृह पुष्प शृंगार दर्शन', theme: 'संकल्पना: Royal Velvet & Lotus Geometry', desc: '५०००+ ताजी फुले व जांभळ्या रेशमी पितांबरातील गर्भगृह शृंगार रूप.', img: '/images/malabar_ganpati_5.jpg', badge: 'वर्ष २०२१' },
          '2020': { title: 'आरोग्य संकल्प व सुवर्ण पदकमयी रूप', theme: 'संकल्पना: Arogya Seva & Blood Drive', desc: 'अखंड रक्तदान आणि आरोग्य शिबीरांच्या संकल्पातील सुवर्ण पदकमयी रूप.', img: '/images/malabar_ganpati_6.jpg', badge: 'वर्ष २०२०' },
          '2018': { title: 'राजवाडा महामंडप व सुवर्ण मेघडंबरी', theme: 'संकल्पना: Fort Raigad & Palace Architecture', desc: 'भव्य मराठा राजवाडा देखावा आणि सुवर्ण मेघडंबरीतील विलोभनीय रूप.', img: '/images/malabar_hero_2.jpg', badge: 'वर्ष २०१८' },
          '1973': { title: 'मंडळ स्थापना व प्रथम श्री स्थापना', theme: 'संकल्पना: Establishment & Sacred Foundation', desc: 'श्री बाल गोपाल गणेशोत्सव मंडळ भाजी गल्ली, शंकर शेठ रोड, ग्रँट रोड येथील रहिवाशांनी एकत्रित येऊन स्थापन केलेली श्रींची प्रथम प्रतिष्ठापना.', img: '/images/malabar_hero_3.jpg', badge: 'वर्ष १९७३' }
        };

        const yearDetailsEn = {
          '2025': { title: 'Wooden Throne & Royal Golden Adornment', theme: 'Theme: Peshwa Era Palace Mandap Architecture', desc: 'Grand 18-foot royal idol in carved wooden throne and silk pitambar adorned with Peshwai craftsmanship.', img: '/images/malabar_ganpati_1.jpg', badge: 'Year 2025' },
          '2024': { title: 'Golden Throne & Radiant Yellow Pitambar', theme: 'Theme: Golden Temple Carvings & Lotus Arch', desc: 'Grand golden throne carved by artisans, with the idol adorned in a golden crown — mesmerizing millions of devotees.', img: '/images/malabar_ganpati_2.jpg', badge: 'Year 2024' },
          '2023': { title: 'Peacock Feather Arch — Arrival Ceremony', theme: 'Theme: Royal Heritage Court Decor', desc: 'A grand peacock-throne arch and magnificent procession arrival form for the divine idol.', img: '/images/malabar_ganpati_3.jpg', badge: 'Year 2023' },
          '2022': { title: 'Divine Face & Golden Crown Darshan', theme: 'Theme: Tradition of Pure Devotion', desc: 'Enchanting smile, radiant eyes, and a golden crown — the 18-foot idol in full divine glory.', img: '/images/malabar_ganpati_4.jpg', badge: 'Year 2022' },
          '2021': { title: 'Sanctum Floral Adornment Darshan', theme: 'Theme: Royal Velvet & Lotus Geometry', desc: '5000+ fresh flowers and a royal purple silk pitambar — a breathtaking sanctum adornment.', img: '/images/malabar_ganpati_5.jpg', badge: 'Year 2021' },
          '2020': { title: 'Health Pledge & Golden Medallion Form', theme: 'Theme: Arogya Seva & Blood Drive', desc: 'Continuous blood donation and health camp seva — honoured with a golden medallion idol form.', img: '/images/malabar_ganpati_6.jpg', badge: 'Year 2020' },
          '2018': { title: 'Royal Mandap & Golden Canopy', theme: 'Theme: Fort Raigad & Palace Architecture', desc: 'Grand Maratha palace-style set and a breathtaking golden canopy mandap decor.', img: '/images/malabar_hero_2.jpg', badge: 'Year 2018' },
          '1973': { title: 'Mandal Founded & First Idol Consecration', theme: 'Theme: Establishment & Sacred Foundation', desc: 'Residents of Bhaji Galli, Shankar Sheth Road, Grant Road united to establish the Sarvajanik Ganeshotsav Mandal and first divine installation.', img: '/images/malabar_hero_3.jpg', badge: 'Year 1973' }
        };

        const yearDetails = lang === 'mr' ? yearDetailsMr : yearDetailsEn;
        const current = yearDetails[yr] || yearDetails['2025'];
        if (showcaseBox) showcaseBox.classList.add('animating');

        setTimeout(() => {
          if (showcaseImg) showcaseImg.src = current.img;
          if (showcaseYearBadge) showcaseYearBadge.innerText = current.badge;
          if (showcaseTitle) showcaseTitle.innerText = current.title;
          if (showcaseTheme) showcaseTheme.innerText = current.theme;
          if (showcaseDesc) showcaseDesc.innerText = current.desc;
          if (showcaseBox) showcaseBox.classList.remove('animating');
        }, 180);
      });
    });
  }

  // ==========================================================================
  // SCROLLYTELLING ANIMATION SYSTEM (Intersection Observer)
  // ==========================================================================
  const targetSelectors = [
    '.card-temple',
    '.committee-card',
    '.release-countdown',
    '.release-image-frame',
    '.release-map',
    '.release-facts div',
    '.release-gallery-item',
    '.about-card',
    '.stat-box',
    '.timings-grid .time-card',
    '.contact-info-card',
    '.contact-form-container'
  ];
  
  targetSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('scroll-reveal');
    });
  });

  const scrollytellingElements = document.querySelectorAll('.scroll-reveal');
  
  if (scrollytellingElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    });
    
    scrollytellingElements.forEach((el) => {
      revealObserver.observe(el);
    });
  }

});



