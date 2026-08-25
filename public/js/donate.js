document.addEventListener('DOMContentLoaded', () => {
  const donationForm = document.getElementById('donationForm');
  if (!donationForm) return;

  const amountInput = document.getElementById('donationAmount');
  const amountButtons = document.querySelectorAll('.btn-preset-chip');

  // Modal elements
  const modalBackdrop = document.getElementById('sevaModalBackdrop');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnConfirmSevaPayment = document.getElementById('btnConfirmSevaPayment');

  const modalCategoryText = document.getElementById('modalCategoryText');
  const modalAmountText = document.getElementById('modalAmountText');
  const upiQrCodeImg = document.getElementById('upiQrCodeImg');

  const payTabs = document.querySelectorAll('.pay-tab');
  const payContents = document.querySelectorAll('.pay-content');

  let activeDonationPayload = null;

  // Handle Preset Amount Button Clicks
  amountButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      amountButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedVal = btn.dataset.amount;
      if (amountInput) amountInput.value = selectedVal;
    });
  });

  // Modal Tab Switcher
  payTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      payTabs.forEach(t => {
        t.style.background = 'var(--bg-surface)';
        t.style.color = 'var(--text-muted)';
        t.classList.remove('active');
      });

      tab.style.background = 'var(--chintamani-red)';
      tab.style.color = '#FFFFFF';
      tab.classList.add('active');

      const targetId = tab.dataset.tab;
      payContents.forEach(c => {
        c.style.display = c.id === targetId ? 'block' : 'none';
      });
    });
  });

  // Close Modal Handler
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (modalBackdrop) modalBackdrop.style.display = 'none';
    });
  }

  // Toast Helper
  function showToast(msg, type = 'info') {
    alert(msg);
  }

  // Finalize Donation API Call
  async function finalizeDonation(paymentDetails) {
    try {
      const confirmRes = await fetch('/api/confirm-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDetails)
      });

      const confirmData = await confirmRes.json();
      if (confirmData.success) {
        alert('देणगी यशस्वी झाली! ८०जी कर सवलत पावती तयार होत आहे...');
        setTimeout(() => {
          window.location.href = `/download-receipt/${confirmData.receipt_no}`;
        }, 800);
      } else {
        alert(confirmData.message || 'पेमेंट करताना त्रुटी आली.');
      }
    } catch (err) {
      alert('पेमेंट नोंदवताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    }
  }

  // Handle Donation Submission & Payment Modal Trigger
  donationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const donorName = document.getElementById('donor_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const amount = amountInput.value.trim();
    const category = document.getElementById('category').value;
    const panNumber = document.getElementById('pan_number').value.trim();

    if (!donorName || !phone || !amount || parseFloat(amount) <= 0) {
      alert('कृपया तुमचे नाव, मोबाईल नंबर आणि वैध रक्कम प्रविष्ट करा.');
      return;
    }

    if (parseFloat(amount) >= 2000 && !panNumber) {
      alert('२००० रुपयांपेक्षा जास्त देणगीसाठी ८०जी कर सवलतीकरिता पॅन कार्ड आवश्यक आहे.');
    }

    // Prepare Donation Payload
    const tempReceiptNo = `SLP-REC-2026-${Math.floor(100 + Math.random() * 900)}`;
    activeDonationPayload = {
      receipt_no: tempReceiptNo,
      donor_name: donorName,
      phone,
      email,
      amount,
      category,
      pan_number: panNumber,
      payment_id: `pay_seva_${Date.now()}`,
      order_id: `order_seva_${Date.now()}`,
      signature: `mock_sig_${Date.now()}`
    };

    // Update Modal Details
    if (modalCategoryText) modalCategoryText.textContent = category;
    if (modalAmountText) modalAmountText.textContent = `₹${parseFloat(amount).toLocaleString('en-IN')}`;

    // Generate Dynamic UPI QR Code
    const upiString = `upi://pay?pa=saileelatrust@upi&pn=Shri%20Sai%20Leela%20Seva%20Trust&am=${amount}&cu=INR`;
    if (upiQrCodeImg) {
      upiQrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(upiString)}`;
    }

    // Open Modal
    if (modalBackdrop) {
      modalBackdrop.style.display = 'flex';
    }
  });

  // Handle Modal Confirm Payment Button Click
  if (btnConfirmSevaPayment) {
    btnConfirmSevaPayment.addEventListener('click', async () => {
      if (!activeDonationPayload) return;

      btnConfirmSevaPayment.disabled = true;
      btnConfirmSevaPayment.innerHTML = '<span>⏳ पावती डाऊनलोड होत आहे...</span>';

      if (modalBackdrop) modalBackdrop.style.display = 'none';
      await finalizeDonation(activeDonationPayload);
    });
  }
});
