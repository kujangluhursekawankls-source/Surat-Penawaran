import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';
import { formatIndonesianDate, formatRupiah, generatePdfFileName } from './formatters';

export async function generateQuotationPdf(
  quotation: Quotation,
  customFileName?: string
): Promise<{ doc: jsPDF; fileName: string; blobUrl?: string }> {
  // A4 dimensions: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight; // 180mm
  const centerX = pageWidth / 2; // 105mm (Rata Tengah)

  const company = quotation.companySnapshot || {};

  // --- 1. KOP SURAT PROFESIONAL (RATA TENGAH & TINGGI LOGO SEJAJAR ATAS-BAWAH TEKS) ---
  const kopTopY = 15; // Batas atas Kop Surat

  const companyName = (company.name || 'PERUSAHAAN').trim().toUpperCase();
  const addressStr = `${company.address || ''}${company.city ? ', ' + company.city : ''}${company.postalCode ? ' ' + company.postalCode : ''}`.trim();

  const contactsArr: string[] = [];
  if (company.phone) contactsArr.push(`Telp: ${company.phone}`);
  if (company.whatsapp) contactsArr.push(`WA: ${company.whatsapp}`);
  if (company.email) contactsArr.push(`Email: ${company.email}`);
  if (company.website) contactsArr.push(`Web: ${company.website}`);
  const contactStr = contactsArr.join('  |  ');

  const npwpStr = company.npwp ? `NPWP: ${company.npwp}` : '';

  // Hitung baris teks dan kalkulasi tinggi total teks secara presisi
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);

  // Batasi lebar baris agar tidak bertabrakan dengan logo di kiri (lebar aman 136mm di tengah halaman)
  const maxCenterTextWidth = 136;
  const addressLines: string[] = addressStr ? doc.splitTextToSize(addressStr, maxCenterTextWidth) : [];

  // Hitung posisi Y tiap elemen teks
  const nameFontSize = 17.5; // Heading formal berwibawa khas kop surat resmi (Times Bold)
  const nameLineHeight = 7.0; // mm
  const normalLineHeight = 4.2; // mm

  let textBottomY = kopTopY + nameLineHeight;
  if (addressLines.length > 0) {
    textBottomY += addressLines.length * normalLineHeight;
  }
  if (contactStr) {
    textBottomY += normalLineHeight;
  }
  if (npwpStr) {
    textBottomY += normalLineHeight;
  }

  // Tinggi total teks dari batas atas nama perusahaan sampai batas bawah baris teks terakhir
  const textTotalHeight = textBottomY - kopTopY;

  // TINGGI LOGO SEJAJAR BATAS ATAS TEKS DAN BATAS BAWAH TEKS
  const logoHeight = Math.max(22, textTotalHeight);
  const logoWidth = logoHeight; // 1:1 proporsional
  const logoX = marginLeft; // Posisi kiri logo
  const logoY = kopTopY; // Batas atas logo sejajar dengan batas atas teks

  // Gambar logo di sisi kiri (sejajar persis atas & bawah teks)
  if (company.logoUrl && (company.logoUrl.startsWith('data:image') || company.logoUrl.startsWith('blob:') || company.logoUrl.startsWith('http'))) {
    try {
      doc.addImage(company.logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } catch {
      // fallback if image fail
    }
  }

  // TULIS TEKS KOP SURAT SECARA RATA TENGAH (CENTER ALIGNED) - FONT RESMI TIMES NEW ROMAN
  let currentTextY = kopTopY + 5.5;

  // Nama Perusahaan (Times Bold, Navy Resmi, Rata Tengah)
  doc.setFont('times', 'bold');
  doc.setFontSize(nameFontSize);
  doc.setTextColor(20, 35, 75); // Royal Navy
  doc.text(companyName, centerX, currentTextY, { align: 'center' });

  // Alamat Lengkap (Times Normal, Rata Tengah)
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  if (addressLines.length > 0) {
    currentTextY += normalLineHeight + 1.2;
    doc.text(addressLines, centerX, currentTextY, { align: 'center' });
    currentTextY += (addressLines.length - 1) * normalLineHeight;
  }

  // Kontak (Telp, WA, Email, Web - Rata Tengah)
  if (contactStr) {
    currentTextY += normalLineHeight;
    doc.text(contactStr, centerX, currentTextY, { align: 'center' });
  }

  // NPWP (Rata Tengah)
  if (npwpStr) {
    currentTextY += normalLineHeight;
    doc.text(npwpStr, centerX, currentTextY, { align: 'center' });
  }

  // Posisi Y untuk Garis Pemisah Kop Surat (di bawah elemen yang tertinggi)
  const kopEndY = Math.max(logoY + logoHeight, currentTextY) + 3.5;

  // GARIS PEMISAH KOP SURAT GANDA RESMI (Tebal 1.2mm + Tipis 0.4mm)
  doc.setDrawColor(20, 35, 75);
  doc.setLineWidth(1.2);
  doc.line(marginLeft, kopEndY, pageWidth - marginRight, kopEndY);

  const thinLineY = kopEndY + 1.2;
  doc.setLineWidth(0.4);
  doc.line(marginLeft, thinLineY, pageWidth - marginRight, thinLineY);

  // Kursor Y berpindah ke isi surat
  let currentY = thinLineY + 6;

  // --- 2. INFORMASI SURAT & TUJUAN ---
  const dateFormatted = formatIndonesianDate(quotation.date);
  const city = company.city || '';

  // Tanggal & Tempat di sisi kanan atas
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const placeDate = city ? `${city}, ${dateFormatted}` : dateFormatted;
  doc.text(placeDate, pageWidth - marginRight, currentY, { align: 'right' });

  // Nomor, Lampiran (opsional/bisa diedit ada atau tidaknya), Perihal di kiri
  const metaLabelX = marginLeft;
  const metaValX = marginLeft + 24;

  doc.text('Nomor', metaLabelX, currentY);
  doc.text(`:  ${quotation.quotationNumber}`, metaValX, currentY);
  currentY += 4.5;

  // Lampiran: bisa diedit ada atau tidaknya
  const showAttachment =
    quotation.hasAttachment !== false &&
    Boolean(quotation.attachment && quotation.attachment.trim() !== '' && quotation.attachment !== '-');

  if (showAttachment) {
    doc.text('Lampiran', metaLabelX, currentY);
    doc.text(`:  ${quotation.attachment}`, metaValX, currentY);
    currentY += 4.5;
  }

  doc.text('Perihal', metaLabelX, currentY);
  doc.setFont('times', 'bold');
  doc.text(`:  ${quotation.subject || 'Surat Penawaran Harga'}`, metaValX, currentY);
  doc.setFont('times', 'normal');
  currentY += 7;

  // Tujuan Surat (Kepada Yth)
  doc.text('Kepada Yth.', marginLeft, currentY);
  currentY += 4.5;

  doc.setFont('times', 'bold');
  doc.text(quotation.customerCompany || quotation.toRecipient || 'Pimpinan / Management', marginLeft, currentY);
  currentY += 4.5;

  doc.setFont('times', 'normal');
  if (quotation.customerPic) {
    doc.text(`Up. Bapak / Ibu ${quotation.customerPic}`, marginLeft, currentY);
    currentY += 4.5;
  }

  if (quotation.customerAddress) {
    const addrLines = doc.splitTextToSize(quotation.customerAddress, 110);
    doc.text(addrLines, marginLeft, currentY);
    currentY += addrLines.length * 4.2;
  }
  currentY += 3;

  // --- 3. ISI SURAT PEMBUKA ---
  const openingText =
    quotation.openingText ||
    'Dengan hormat,\nBersama surat ini kami mengajukan penawaran pekerjaan sesuai kebutuhan yang Bapak/Ibu sampaikan. Adapun rincian penawaran kami sebagai berikut:';

  const openingLines = doc.splitTextToSize(openingText, contentWidth);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(openingLines, marginLeft, currentY);
  currentY += openingLines.length * 4.4 + 3;

  // --- 4. TABEL PENAWARAN ---
  const tableData = quotation.items.map((item, idx) => [
    idx + 1,
    item.description,
    item.dimension || '-',
    item.qty,
    item.unit,
    formatRupiah(item.price).replace('Rp', '').trim(),
    formatRupiah(item.total).replace('Rp', '').trim(),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginLeft, right: marginRight },
    head: [['No', 'Deskripsi Pekerjaan', 'Dimensi / Spesifikasi', 'Qty', 'Satuan', 'Harga (Rp)', 'Total (Rp)']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'times',
    },
    headStyles: {
      font: 'times',
      fillColor: [30, 64, 175], // Royal Navy Blue (#1e40af)
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.5,
    },
    bodyStyles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 32 },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableInfo = (doc as any).lastAutoTable;
  currentY = lastTableInfo ? lastTableInfo.finalY + 3 : currentY + 40;

  // Cek overflow jika sisa halaman kurang dari 80mm
  if (currentY > pageHeight - 85) {
    doc.addPage();
    currentY = 20;
  }

  // --- 5. RINGKASAN HARGA (Subtotal, Diskon, PPN, Trade-in, Grand Total) ---
  const summaryBoxWidth = 92;
  const summaryX = pageWidth - marginRight - summaryBoxWidth;

  doc.setFontSize(9);

  // Subtotal
  doc.setFont('times', 'normal');
  doc.text('Subtotal', summaryX, currentY);
  doc.text(formatRupiah(quotation.subtotal), pageWidth - marginRight, currentY, { align: 'right' });
  currentY += 4.5;

  // Diskon jika ada
  if (quotation.discountAmount > 0) {
    const discLabel =
      quotation.discountType === 'percent'
        ? `Diskon (${quotation.discountValue}%)`
        : 'Diskon Khusus';
    doc.text(discLabel, summaryX, currentY);
    doc.text(`- ${formatRupiah(quotation.discountAmount)}`, pageWidth - marginRight, currentY, { align: 'right' });
    currentY += 4.5;
  }

  // PPN jika ada
  if (quotation.ppnAmount > 0) {
    doc.text(`PPN (${quotation.ppnPercent}%)`, summaryX, currentY);
    doc.text(formatRupiah(quotation.ppnAmount), pageWidth - marginRight, currentY, { align: 'right' });
    currentY += 4.5;
  }

  // Fitur Pengurang / Trade-In (jika aktif & diisi)
  if (quotation.hasTradeIn && (quotation.tradeInAmount || 0) > 0) {
    const tradeInLabel = (quotation.tradeInTitle || 'Trade-In / Tukar Tambah').trim();
    doc.text(tradeInLabel, summaryX, currentY);
    doc.text(`- ${formatRupiah(quotation.tradeInAmount || 0)}`, pageWidth - marginRight, currentY, { align: 'right' });
    currentY += 4.5;
  }

  // Grand Total Box
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryX - 2, currentY - 3.5, summaryBoxWidth + 2, 7.5, 1.5, 1.5, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('GRAND TOTAL', summaryX, currentY + 1.2);
  doc.text(formatRupiah(quotation.grandTotal), pageWidth - marginRight, currentY + 1.2, { align: 'right' });

  // Catatan kecil unit trade-in (jika ada deskripsi)
  if (quotation.hasTradeIn && quotation.tradeInDescription && quotation.tradeInDescription.trim()) {
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`* Ket. Pengurang: ${quotation.tradeInDescription.trim()}`, marginLeft, currentY + 1.2);
  }

  currentY += 9;

  // --- 6. TEKS PENUTUP RESMI ---
  const closingText =
    quotation.closingText ||
    'Demikian surat penawaran ini kami sampaikan. Besar harapan kami untuk dapat bekerjasama dengan perusahaan Bapak/Ibu. Atas perhatian dan kesempatannya kami ucapkan terima kasih.';

  const closingLines = doc.splitTextToSize(closingText, contentWidth);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(closingLines, marginLeft, currentY);
  currentY += closingLines.length * 4.4 + 5;

  // Cek overflow sebelum tanda tangan
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  // --- 8. BLOK TANDA TANGAN PENGIRIM SURAT (KANAN) ---
  const signWidth = 70;
  const signX = pageWidth - marginRight - signWidth;
  let signY = currentY;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Hormat Kami,', signX, signY, { align: 'left' });
  signY += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text((company.name || '').toUpperCase(), signX, signY, { align: 'left' });
  signY += 4.5;

  // Stempel & Tanda Tangan
  const signAreaY = signY;
  const signAreaHeight = 20;

  if (company.stampUrl && (company.stampUrl.startsWith('data:image') || company.stampUrl.startsWith('blob:') || company.stampUrl.startsWith('http'))) {
    try {
      doc.addImage(company.stampUrl, 'PNG', signX + 18, signAreaY, 20, 20, undefined, 'FAST');
    } catch {
      // ignore
    }
  }

  if (company.signatureUrl && (company.signatureUrl.startsWith('data:image') || company.signatureUrl.startsWith('blob:') || company.signatureUrl.startsWith('http'))) {
    try {
      doc.addImage(company.signatureUrl, 'PNG', signX, signAreaY, 28, signAreaHeight, undefined, 'FAST');
    } catch {
      // ignore
    }
  }

  signY += signAreaHeight + 2;

  // Nama Direktur & Jabatan (Diambil dari Pengaturan)
  const directorName = company.directorName || '';
  const directorTitle = company.directorTitle || 'Direktur';

  if (directorName) {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 35, 75);
    doc.text(directorName, signX, signY);

    const nameWidth = doc.getTextWidth(directorName);
    doc.setDrawColor(20, 35, 75);
    doc.setLineWidth(0.4);
    doc.line(signX, signY + 0.8, signX + nameWidth, signY + 0.8);

    signY += 4.5;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(directorTitle, signX, signY);
  signY += 6; // Jarak setelah tanda tangan selesai

  // --- 9. CATATAN / PEMBAYARAN : SISI KIRI, DI BAWAH TANDA TANGAN PENGIRIM SURAT (JANGAN SEJAJAR) ---
  if (quotation.additionalNotes && quotation.additionalNotes.trim()) {
    let notesY = Math.max(currentY + 36, signY) + 2;

    const notesWidth = contentWidth; // Lebar proporsional di sisi kiri dokumen
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(quotation.additionalNotes.trim(), notesWidth - 8);
    const boxHeight = noteLines.length * 3.8 + 9;

    // Cek overflow jika butuh halaman baru
    if (notesY + boxHeight > pageHeight - 15) {
      doc.addPage();
      notesY = 20;
    }

    // Desain Box Elegan di Sisi Kiri
    doc.setFillColor(248, 250, 252); // slate-50 lembut
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, notesY, notesWidth, boxHeight, 1.5, 1.5, 'FD');

    // Judul Catatan / Pembayaran
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Catatan / Syarat Pembayaran :', marginLeft + 3.5, notesY + 4.5);

    // Isi Catatan / Nomor Rekening
    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(noteLines, marginLeft + 3.5, notesY + 8.5);
  }

  // --- 9. FOOTER RESMI ---
  const totalPages = doc.getNumberOfPages();
  const todayFormatted = formatIndonesianDate(new Date().toISOString().slice(0, 10));

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Watermark jika status khusus
    if (quotation.status === 'draft') {
      doc.saveGraphicsState();
      doc.setFont('times', 'bold');
      doc.setFontSize(48);
      doc.setTextColor(226, 232, 240);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text('D R A F T', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
      doc.restoreGraphicsState();
    } else if (quotation.status === 'revisi') {
      doc.saveGraphicsState();
      doc.setFont('times', 'bold');
      doc.setFontSize(46);
      doc.setTextColor(254, 226, 226);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text('R E V I S I', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
      doc.restoreGraphicsState();
    }

    // Garis tipis footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    // Teks Footer
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    const docRef = `${quotation.quotationNumber}  •  Dicetak: ${todayFormatted}`;
    doc.text(docRef, marginLeft, pageHeight - 8);

    const pageStr = `Halaman ${i} dari ${totalPages}`;
    doc.text(pageStr, pageWidth - marginRight, pageHeight - 8, { align: 'right' });
  }

  const fileName =
    customFileName ||
    generatePdfFileName(
      quotation.customerCompany,
      quotation.customerPic,
      quotation.quotationNumber
    );

  const blobUrl = doc.output('bloburl').toString();

  return { doc, fileName, blobUrl };
}
