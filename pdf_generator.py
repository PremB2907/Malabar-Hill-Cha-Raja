from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime

PAGE_HEIGHT = 841.89  # A4 height in points

def draw_rect(c, x, y, width, height, fill_color=None, stroke_color=None, stroke_width=1):
    c.saveState()
    ry = PAGE_HEIGHT - y - height
    if fill_color:
        c.setFillColor(fill_color)
        c.rect(x, ry, width, height, fill=1, stroke=0)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(stroke_width)
        c.rect(x, ry, width, height, fill=0, stroke=1)
    c.restoreState()

def draw_text(c, text, x, y, font_name='Helvetica', font_size=10, color=colors.black, width=None):
    c.saveState()
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    val = str(text) if text is not None else "N/A"
    
    if width and len(val) * (font_size * 0.55) > width:
        words = val.split(' ')
        lines = []
        current_line = []
        for word in words:
            test_line = ' '.join(current_line + [word])
            # Approximate character width calculation
            if len(test_line) * (font_size * 0.55) < width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        curr_y = y
        for line in lines[:3]:  # Max 3 lines
            ry = PAGE_HEIGHT - curr_y - font_size
            c.drawString(x, ry, line)
            curr_y += font_size + 2
    else:
        ry = PAGE_HEIGHT - y - font_size
        c.drawString(x, ry, val)
    c.restoreState()

def draw_line(c, x1, y1, x2, y2, color, stroke_width=1):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(stroke_width)
    c.line(x1, PAGE_HEIGHT - y1, x2, PAGE_HEIGHT - y2)
    c.restoreState()

def generate_donation_pdf(donation, admin_copy=False):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    maroon_dark = colors.HexColor('#4A0404')
    maroon_light = colors.HexColor('#800020')
    gold = colors.HexColor('#FFD700')
    gold_soft = colors.HexColor('#FFC107')
    white = colors.white
    grey_slate = colors.HexColor('#64748B')
    text_dark = colors.HexColor('#1E293B')
    yellow_bg = colors.HexColor('#FFFBEB')
    orange_border = colors.HexColor('#F59E0B')
    brown_text = colors.HexColor('#B45309')
    brown_text_light = colors.HexColor('#92400E')
    border_red = colors.HexColor('#FCD34D')
    tax_note_color = colors.HexColor('#475569')
    subtle_watermark = colors.HexColor('#94A3B8')

    # Header Box
    draw_rect(c, 40, 40, 515, 100, fill_color=maroon_dark)
    draw_text(c, 'SHREE BAL GOPAL GANESHUTSAV MANDAL', 55, 52, font_name='Helvetica-Bold', font_size=18, color=gold)
    draw_text(c, 'MALABAR HILL CHA RAJA (SEC 80G TAX EXEMPT)', 55, 85, font_name='Helvetica-Bold', font_size=14, color=white)
    draw_text(c, 'Reg Trust No: E-3892/MUM | 80G Approval: CIT(E)/80G/2024-25/A-1029 | @malabarhill_cha_raja', 55, 106, font_name='Helvetica', font_size=9, color=gold_soft)

    # Main Receipt Body Border
    draw_rect(c, 40, 155, 515, 335, stroke_color=maroon_light, stroke_width=1.5)

    # Receipt Subtitle
    draw_text(c, 'OFFICIAL DONATION ACKNOWLEDGEMENT RECEIPT', 60, 172, font_name='Helvetica-Bold', font_size=13, color=maroon_dark)
    draw_line(c, 60, 190, 535, 190, color=border_red, stroke_width=1)

    # Parse and format date
    date_str = donation.get("created_at", "")
    try:
        dt = datetime.fromisoformat(date_str)
        formatted_date = dt.strftime('%d %b %Y')
    except Exception:
        formatted_date = date_str if date_str else "N/A"

    def draw_field(label, value, x, y, width=220):
        draw_text(c, label.upper(), x, y, font_name='Helvetica-Bold', font_size=9, color=grey_slate)
        draw_text(c, value, x, y + 13, font_name='Helvetica-Bold', font_size=11, color=text_dark, width=width)

    draw_field('Receipt Number', donation.get('receipt_no', ''), 60, 205)
    draw_field('Donation Date', formatted_date, 300, 205)

    draw_field('Donor Full Name', donation.get('donor_name', ''), 60, 250)
    draw_field('Contact Phone', donation.get('phone', ''), 300, 250)
    
    pan_no = donation.get('pan_number', '')
    draw_field('PAN Number (80G)', pan_no if pan_no else 'NOT PROVIDED', 60, 295)
    draw_field('Seva Category', donation.get('category', 'General Mandal Donation & Seva'), 300, 295)

    draw_field('Razorpay Payment ID', donation.get('payment_id', 'pay_Simulated123'), 60, 340)
    draw_field('Transaction Status', donation.get('status', 'SUCCESS'), 300, 340)

    # Amount Highlight Card
    draw_rect(c, 60, 395, 455, 65, fill_color=yellow_bg, stroke_color=orange_border, stroke_width=1.5)
    
    gross_amount = float(donation.get('gross_amount', donation.get('amount', 0.0)))
    net_amount = float(donation.get('net_amount', gross_amount * 0.98))
    receipt_amount = net_amount if admin_copy else gross_amount
    
    amount_label = 'AMOUNT RECEIVED AFTER 2% PAYMENT PROCESSING CUTOFF' if admin_copy else 'ACTUAL CONTRIBUTION AMOUNT PAID BY DONOR'
    draw_text(c, amount_label, 75, 408, font_name='Helvetica-Bold', font_size=10, color=brown_text_light)
    draw_text(c, f"Rs. {receipt_amount:,.2f}/-", 75, 427, font_name='Helvetica-Bold', font_size=20, color=brown_text)

    # Tax Exemption Note
    draw_text(c, 'All donations made to Shree Bal Gopal Ganeshutsav Mandal are 50% tax exempt under Section 80G of the Income Tax Act, 1961.', 40, 505, font_name='Helvetica-Oblique', font_size=9, color=tax_note_color)

    # Signatures
    draw_text(c, 'For Malabar Hill Cha Raja Mandal', 350, 570, font_name='Helvetica-Bold', font_size=10, color=maroon_dark)
    draw_text(c, 'Authorized Trustee / Treasurer', 350, 620, font_name='Helvetica', font_size=9, color=grey_slate)

    # Watermark Footer
    draw_text(c, 'Ganpati Bappa Morya! Follow us on Instagram @malabarhill_cha_raja', 40, 750, font_name='Helvetica', font_size=8, color=subtle_watermark)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def generate_tshirt_pdf(order):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    maroon_dark = colors.HexColor('#4A0404')
    maroon_light = colors.HexColor('#800020')
    gold = colors.HexColor('#FFD700')
    gold_soft = colors.HexColor('#FFC107')
    white = colors.white
    grey_slate = colors.HexColor('#64748B')
    text_dark = colors.HexColor('#1E293B')
    yellow_bg = colors.HexColor('#FFFBEB')
    orange_border = colors.HexColor('#F59E0B')
    brown_text = colors.HexColor('#B45309')
    blue_bg = colors.HexColor('#EFF6FF')
    blue_border = colors.HexColor('#93C5FD')
    blue_text = colors.HexColor('#1E40AF')
    blue_text_dark = colors.HexColor('#1E3A8A')
    border_red = colors.HexColor('#FCD34D')
    subtle_watermark = colors.HexColor('#94A3B8')

    # Header Banner
    draw_rect(c, 40, 40, 515, 100, fill_color=maroon_light)
    draw_text(c, 'SHREE BAL GOPAL GANESHUTSAV MANDAL', 55, 52, font_name='Helvetica-Bold', font_size=18, color=gold)
    draw_text(c, 'OFFICIAL T-SHIRT & MERCHANDISE BOOKING TOKEN', 55, 85, font_name='Helvetica-Bold', font_size=14, color=white)
    draw_text(c, 'Reg Trust No: E-3892/MUM | Instagram: @malabarhill_cha_raja', 55, 106, font_name='Helvetica', font_size=9, color=gold_soft)

    # Main Receipt Body Border
    draw_rect(c, 40, 155, 515, 340, stroke_color=maroon_light, stroke_width=1.5)

    # Receipt Title
    draw_text(c, 'MALABAR HILL CHA RAJA OFFICIAL MERCHANDISE', 60, 172, font_name='Helvetica-Bold', font_size=13, color=maroon_light)
    draw_line(c, 60, 190, 535, 190, color=border_red, stroke_width=1)

    # Date formatting
    date_str = order.get("created_at", "")
    try:
        dt = datetime.fromisoformat(date_str)
        formatted_date = dt.strftime('%d %b %Y')
    except Exception:
        formatted_date = date_str if date_str else "N/A"

    def draw_field(label, value, x, y, width=220):
        draw_text(c, label.upper(), x, y, font_name='Helvetica-Bold', font_size=9, color=grey_slate)
        draw_text(c, value, x, y + 13, font_name='Helvetica-Bold', font_size=11, color=text_dark, width=width)

    draw_field('Order Token Number', order.get('receipt_no', ''), 60, 205)
    draw_field('Order Date', formatted_date, 300, 205)

    draw_field('Buyer Full Name', order.get('buyer_name', ''), 60, 250)
    draw_field('Contact Mobile', order.get('phone', ''), 300, 250)

    draw_field('Selected Size', f"{order.get('size', '')} (Chest Fit)", 60, 295)
    draw_field('T-Shirt Color & Qty', f"{order.get('color', 'Royal Maroon')} ({order.get('quantity', 1)} Pcs)", 300, 295)

    draw_field('Payment ID / Ref', order.get('payment_id', 'pay_SimulatedTshirt'), 60, 340)
    draw_field('Delivery / Pickup Option', order.get('address', 'Mandap Counter Pickup'), 300, 340, 220)

    # Highlight Total Amount
    draw_rect(c, 60, 400, 455, 65, fill_color=yellow_bg, stroke_color=orange_border, stroke_width=1.5)
    draw_text(c, 'TOTAL AMOUNT PAID FOR MERCHANDISE', 75, 413, font_name='Helvetica-Bold', font_size=10, color=brown_text)
    total_amount = float(order.get('total_amount', 0.0))
    draw_text(c, f"Rs. {total_amount:,.2f}/-", 75, 432, font_name='Helvetica-Bold', font_size=20, color=brown_text)

    # Mandap Pickup Note
    draw_rect(c, 40, 510, 515, 120, fill_color=blue_bg, stroke_color=blue_border, stroke_width=1)
    draw_text(c, 'T-SHIRT PICKUP INSTRUCTIONS FOR DEVOTEES', 55, 525, font_name='Helvetica-Bold', font_size=10, color=blue_text)
    
    instructions = [
        '1. Please show this PDF order token (digital or printed) at Mandap Merchandise Desk.',
        '2. Pickup Address: Bhaji Galli, Shankar Sheth Road, Grant Road, Mumbai - 400007.',
        '3. For courier delivery queries, contact Mandal Help Desk: +91 98765 43210.'
    ]
    inst_y = 545
    for inst in instructions:
        draw_text(c, inst, 55, inst_y, font_name='Helvetica', font_size=9, color=blue_text_dark)
        inst_y += 20

    # Footer
    draw_text(c, 'Ganpati Bappa Morya! Shree Bal Gopal Ganeshutsav Mandal', 40, 750, font_name='Helvetica', font_size=8, color=subtle_watermark)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
