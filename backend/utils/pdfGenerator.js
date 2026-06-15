import PDFDocument from 'pdfkit';

/**
 * Generates an invoice PDF and pipes it to the provided writable stream.
 * @param {Object} booking - The populated Booking document.
 * @param {Object} res - Express Response object (writable stream).
 */
export const generateInvoicePDF = (booking, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Pipe the PDF into the response
  doc.pipe(res);

  // Styling constants
  const primaryColor = '#ff385c';
  const secondaryColor = '#0f172a';
  const lightGray = '#f1f5f9';
  const textGray = '#64748b';

  // --- HEADER SECTION ---
  doc
    .fillColor(primaryColor)
    .fontSize(24)
    .text('TripNest', 50, 50, { bold: true })
    .fillColor(textGray)
    .fontSize(10)
    .text('AI-Powered Vacation Rentals', 50, 75)
    .fillColor(secondaryColor)
    .fontSize(16)
    .text('INVOICE', 450, 50, { align: 'right' })
    .fontSize(10)
    .fillColor(textGray)
    .text(`Invoice Ref: INV-${booking._id.toString().substring(0, 8).toUpperCase()}`, 400, 75, { align: 'right' })
    .text(`Issued Date: ${new Date().toLocaleDateString()}`, 400, 90, { align: 'right' });

  // Draw horizontal line
  doc
    .moveTo(50, 115)
    .lineTo(560, 115)
    .strokeColor(lightGray)
    .lineWidth(2)
    .stroke();

  // --- CLIENT & STAYS INFO ---
  doc
    .fillColor(secondaryColor)
    .fontSize(12)
    .text('Billed To:', 50, 140, { bold: true })
    .fontSize(10)
    .fillColor(textGray)
    .text(`Name: ${booking.guest.name}`, 50, 160)
    .text(`Email: ${booking.guest.email}`, 50, 175);

  doc
    .fillColor(secondaryColor)
    .fontSize(12)
    .text('Stay Details:', 350, 140, { bold: true })
    .fontSize(10)
    .fillColor(textGray)
    .text(`Property: ${booking.property.title}`, 350, 160)
    .text(`Location: ${booking.property.city}, ${booking.property.country}`, 350, 175)
    .text(`Duration: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`, 350, 190);

  // Draw horizontal line
  doc
    .moveTo(50, 220)
    .lineTo(560, 220)
    .strokeColor(lightGray)
    .lineWidth(1)
    .stroke();

  // --- ITEM TABLE ---
  let y = 250;
  
  // Table Header
  doc
    .fillColor(secondaryColor)
    .fontSize(10)
    .text('Description', 50, y, { bold: true })
    .text('Rate / Night', 220, y, { bold: true, align: 'right', width: 80 })
    .text('Nights', 320, y, { bold: true, align: 'right', width: 60 })
    .text('Guests', 400, y, { bold: true, align: 'right', width: 60 })
    .text('Total', 480, y, { bold: true, align: 'right', width: 80 });

  // Underline table header
  doc
    .moveTo(50, y + 15)
    .lineTo(560, y + 15)
    .strokeColor(secondaryColor)
    .lineWidth(1)
    .stroke();

  // Calculate stays length
  const dateDiff = Math.abs(new Date(booking.endDate) - new Date(booking.startDate));
  const nightsCount = Math.ceil(dateDiff / (1000 * 60 * 60 * 24)) || 1;

  // Table Body Row
  y += 25;
  doc
    .fillColor(textGray)
    .fontSize(10)
    .text(`Accommodation Stay at ${booking.property.title}`, 50, y, { width: 160 })
    .text(`INR ${booking.property.pricePerNight.toLocaleString()}`, 220, y, { align: 'right', width: 80 })
    .text(`${nightsCount}`, 320, y, { align: 'right', width: 60 })
    .text(`${booking.guests}`, 400, y, { align: 'right', width: 60 })
    .text(`INR ${booking.totalPrice.toLocaleString()}`, 480, y, { align: 'right', width: 80 });

  // Draw total price box
  y += 50;
  doc
    .rect(350, y, 210, 80)
    .fill(lightGray);

  doc
    .fillColor(secondaryColor)
    .fontSize(10)
    .text('Subtotal:', 370, y + 15)
    .text(`INR ${booking.totalPrice.toLocaleString()}`, 480, y + 15, { align: 'right', width: 70 })
    .text('Taxes & Fees (0%):', 370, y + 35)
    .text('INR 0', 480, y + 35, { align: 'right', width: 70 })
    .fontSize(12)
    .text('Grand Total:', 370, y + 55, { bold: true })
    .text(`INR ${booking.totalPrice.toLocaleString()}`, 480, y + 55, { bold: true, align: 'right', width: 70 });

  // --- FOOTER SECTION ---
  doc
    .fillColor(textGray)
    .fontSize(10)
    .text('Payment Status: PAID & CONFIRMED', 50, y + 15, { bold: true, color: '#10b981' })
    .text(`Payment ID: ${booking.payment ? booking.payment.toString().substring(0, 12) : 'N/A'}`, 50, y + 35);

  doc
    .fillColor(textGray)
    .fontSize(10)
    .text('Thank you for booking with TripNest. Have a wonderful stay!', 50, 650, { align: 'center', italic: true });

  // Finalize the PDF document
  doc.end();
};
