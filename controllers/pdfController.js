const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

module.exports = {
  generateDonationPDF(donation, res, options = {}) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_${donation.receipt_no}.pdf`);

    doc.pipe(res);

    // Header Box
    doc.rect(40, 40, 515, 100).fill('#4A0404');
    doc.fillColor('#FFD700').fontSize(18).font('Helvetica-Bold').text('SHREE BAL GOPAL GANESHUTSAV MANDAL', 55, 52, { width: 485 });
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('MALABAR HILL CHA RAJA (SEC 80G TAX EXEMPT)', 55, 85);
    doc.fillColor('#FFC107').fontSize(9).font('Helvetica').text('Reg Trust No: E-3892/MUM | 80G Approval: CIT(E)/80G/2024-25/A-1029 | @malabarhill_cha_raja', 55, 106);

    // Main Receipt Body
    doc.rect(40, 155, 515, 335).lineWidth(1.5).strokeColor('#800020').stroke();

    doc.fillColor('#4A0404').fontSize(13).font('Helvetica-Bold').text('OFFICIAL DONATION ACKNOWLEDGEMENT RECEIPT', 60, 172);
    doc.moveTo(60, 190).lineTo(535, 190).lineWidth(1).strokeColor('#FCD34D').stroke();

    const drawField = (label, value, x, y, width = 220) => {
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
      doc.fillColor('#1E293B').fontSize(11).font('Helvetica-Bold').text(value || 'N/A', x, y + 13, { width });
    };

    drawField('Receipt Number', donation.receipt_no, 60, 205);
    drawField('Donation Date', new Date(donation.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }), 300, 205);

    drawField('Donor Full Name', donation.donor_name, 60, 250);
    drawField('Contact Phone', donation.phone, 300, 250);

    drawField('PAN Number (80G)', donation.pan_number || 'NOT PROVIDED', 60, 295);
    drawField('Seva Category', donation.category, 300, 295);

    drawField('Razorpay Payment ID', donation.payment_id || 'pay_Simulated123', 60, 340);
    drawField('Transaction Status', donation.status || 'SUCCESS', 300, 340);

    // Amount Highlight Card
    doc.rect(60, 395, 455, 65).fill('#FFFBEB');
    doc.rect(60, 395, 455, 65).lineWidth(1.5).strokeColor('#F59E0B').stroke();
    
    const grossAmount = parseFloat(donation.gross_amount || donation.amount);
    const netAmount = parseFloat(donation.net_amount || grossAmount * 0.98);
    const receiptAmount = options.adminCopy ? netAmount : grossAmount;
    doc.fillColor('#92400E').fontSize(10).font('Helvetica-Bold').text(options.adminCopy ? 'AMOUNT RECEIVED AFTER 2% PAYMENT PROCESSING CUTOFF' : 'ACTUAL CONTRIBUTION AMOUNT PAID BY DONOR', 75, 408);
    doc.fillColor('#B45309').fontSize(20).font('Helvetica-Bold').text(`₹ ${receiptAmount.toLocaleString('en-IN')}/-`, 75, 427);

    // Tax Exemption Note
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text('All donations made to Shree Bal Gopal Ganeshutsav Mandal are 50% tax exempt under Section 80G of the Income Tax Act, 1961.', 40, 505, { align: 'center', width: 515 });

    // Signatures
    doc.fillColor('#4A0404').fontSize(10).font('Helvetica-Bold').text('For Malabar Hill Cha Raja Mandal', 350, 570);
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Authorized Trustee / Treasurer', 350, 620);
    
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('Ganpati Bappa Morya! Follow us on Instagram @malabarhill_cha_raja', 40, 750, { align: 'center', width: 515 });

    doc.end();
  },

  generateTshirtPDF(order, res) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Tshirt_Booking_${order.receipt_no}.pdf`);

    doc.pipe(res);

    // Header Banner
    doc.rect(40, 40, 515, 100).fill('#800020');
    doc.fillColor('#FFD700').fontSize(18).font('Helvetica-Bold').text('SHREE BAL GOPAL GANESHUTSAV MANDAL', 55, 52, { width: 485 });
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('OFFICIAL T-SHIRT & MERCHANDISE BOOKING TOKEN', 55, 85);
    doc.fillColor('#FFC107').fontSize(9).font('Helvetica').text('Reg Trust No: E-3892/MUM | Instagram: @malabarhill_cha_raja', 55, 106);

    // Main Receipt Body
    doc.rect(40, 155, 515, 340).lineWidth(1.5).strokeColor('#800020').stroke();

    doc.fillColor('#800020').fontSize(13).font('Helvetica-Bold').text('MALABAR HILL CHA RAJA OFFICIAL MERCHANDISE', 60, 172);
    doc.moveTo(60, 190).lineTo(535, 190).lineWidth(1).strokeColor('#FCD34D').stroke();

    const drawField = (label, value, x, y, width = 220) => {
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
      doc.fillColor('#1E293B').fontSize(11).font('Helvetica-Bold').text(value || 'N/A', x, y + 13, { width });
    };

    drawField('Order Token Number', order.receipt_no, 60, 205);
    drawField('Order Date', new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }), 300, 205);

    drawField('Buyer Full Name', order.buyer_name, 60, 250);
    drawField('Contact Mobile', order.phone, 300, 250);

    drawField('Selected Size', `${order.size} (Chest Fit)`, 60, 295);
    drawField('T-Shirt Color & Qty', `${order.color} (${order.quantity} Pcs)`, 300, 295);

    drawField('Payment ID / Ref', order.payment_id || 'pay_SimulatedTshirt', 60, 340);
    drawField('Delivery / Pickup Option', order.address || 'Mandap Counter Pickup', 300, 340, 220);

    // Highlight Total Amount
    doc.rect(60, 400, 455, 65).fill('#FFFBEB');
    doc.rect(60, 400, 455, 65).lineWidth(1.5).strokeColor('#F59E0B').stroke();
    
    doc.fillColor('#92400E').fontSize(10).font('Helvetica-Bold').text('TOTAL AMOUNT PAID FOR MERCHANDISE', 75, 413);
    doc.fillColor('#B45309').fontSize(20).font('Helvetica-Bold').text(`₹ ${parseFloat(order.total_amount).toLocaleString('en-IN')}/-`, 75, 432);

    // Mandap Pickup Note
    doc.rect(40, 510, 515, 120).fill('#EFF6FF');
    doc.rect(40, 510, 515, 120).lineWidth(1).strokeColor('#93C5FD').stroke();
    
    doc.fillColor('#1E40AF').fontSize(10).font('Helvetica-Bold').text('T-SHIRT PICKUP INSTRUCTIONS FOR DEVOTEES', 55, 525);
    const instructions = [
      '1. Please show this PDF order token (digital or printed) at Mandap Merchandise Desk.',
      '2. Pickup Address: Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007.',
      '3. For courier delivery queries, contact Mandal Help Desk: +91 98765 43210.'
    ];
    let instY = 545;
    instructions.forEach(inst => {
      doc.fillColor('#1E3A8A').fontSize(9).font('Helvetica').text(inst, 55, instY);
      instY += 20;
    });

    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('Ganpati Bappa Morya! Shree Bal Gopal Ganeshutsav Mandal', 40, 750, { align: 'center', width: 515 });

    doc.end();
  }
};
