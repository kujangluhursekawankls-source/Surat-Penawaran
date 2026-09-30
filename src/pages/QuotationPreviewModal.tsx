import React, { useState, useEffect } from 'react';
import { Quotation } from '../types';
import { generateQuotationPdf } from '../utils/pdfGenerator';
import { generatePdfFileName, formatRupiah, formatIndonesianDate } from '../utils/formatters';
import { useData } from '../context/DataContext';
import {
  X,
  Download,
  Printer,
  Share2,
  Mail,
  Edit,
  CheckCircle,
  FileCheck,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface QuotationPreviewModalProps {
  quotation: Quotation | null;
  onClose: () => void;
  onEdit: (q: Quotation) => void;
}

export const QuotationPreviewModal: React.FC<QuotationPreviewModalProps> = ({
  quotation,
  onClose,
  onEdit,
}) => {
  const { updateQuotationStatus, companies } = useData();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Selalu gunakan profil Kop Surat terbaru dari Pengaturan
  const activeCompany =
    companies.find((c) => c.id === quotation?.companyProfileId) ||
    companies.find((c) => c.isDefault) ||
    companies[0] ||
    quotation?.companySnapshot ||
    {};

  const quotationWithCompany: Quotation | null = quotation
    ? {
        ...quotation,
        companySnapshot: {
          ...(quotation.companySnapshot || {}),
          ...activeCompany,
        },
      }
    : null;

  useEffect(() => {
    if (!quotationWithCompany) return;

    const initialFileName = generatePdfFileName(
      quotationWithCompany.customerCompany,
      quotationWithCompany.customerPic,
      quotationWithCompany.quotationNumber
    );
    setFileName(initialFileName);

    let activeUrl: string | null = null;
    setLoadingPdf(true);

    generateQuotationPdf(quotationWithCompany, initialFileName)
      .then((res) => {
        setPdfBlobUrl(res.blobUrl || null);
        activeUrl = res.blobUrl || null;
      })
      .catch((err) => {
        console.error('Failed to generate preview PDF:', err);
      })
      .finally(() => {
        setLoadingPdf(false);
      });

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [quotationWithCompany?.id, quotationWithCompany?.updatedAt, activeCompany.updatedAt, activeCompany.name]);

  if (!quotation || !quotationWithCompany) return null;
  const curQuotation = quotationWithCompany;

  const handleDownload = async () => {
    try {
      const res = await generateQuotationPdf(curQuotation, fileName);
      res.doc.save(fileName || res.fileName);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePrint = async () => {
    try {
      const res = await generateQuotationPdf(curQuotation, fileName);
      res.doc.autoPrint();
      window.open(res.doc.output('bloburl'), '_blank');
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const handleSendWhatsApp = () => {
    // Generate standard WhatsApp message
    const picGreeting = curQuotation.customerPic ? `Bapak/Ibu ${curQuotation.customerPic}` : 'Bapak/Ibu';
    const compName = curQuotation.customerCompany ? ` (${curQuotation.customerCompany})` : '';

    const text = `Yth. ${picGreeting}${compName},

Bersama pesan ini kami kirimkan Surat Penawaran Harga resmi kami:
📄 *No. Surat:* ${curQuotation.quotationNumber}
📌 *Perihal:* ${curQuotation.subject}
💰 *Total Nilai:* ${formatRupiah(curQuotation.grandTotal)}
📑 *Nama File PDF:* ${fileName}

File PDF penawaran telah kami persiapkan. Mohon dapat dipelajari lebih lanjut.
Apabila ada pertanyaan mengenai spesifikasi teknis maupun negosiasi, kami siap membantu.

Terima kasih atas perhatian dan kerja samanya.
Hormat Kami,
*${curQuotation.companySnapshot?.name || ''}*`;

    let phone = curQuotation.customerPhone || '';
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`Surat Penawaran: ${curQuotation.quotationNumber} - ${curQuotation.subject}`);
    const body = encodeURIComponent(
      `Kepada Yth. ${curQuotation.customerPic || curQuotation.customerCompany || 'Bapak/Ibu'},\n\nTerlampir kami kirimkan Surat Penawaran No. ${curQuotation.quotationNumber} dengan perihal ${curQuotation.subject}.\nTotal Nilai Penawaran: ${formatRupiah(curQuotation.grandTotal)}.\n\nFile dokumen PDF: ${fileName}\n\nTerima kasih.`
    );
    const mailto = `mailto:${curQuotation.customerEmail || ''}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  const handleStatusChange = async (newStatus: Quotation['status']) => {
    setStatusMenuOpen(false);
    await updateQuotationStatus(curQuotation.id, newStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-md">
                {curQuotation.quotationNumber}
              </span>
              <div className="relative">
                <button
                  onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <span className="capitalize">{curQuotation.status}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {statusMenuOpen && (
                  <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 text-xs">
                    {(['draft', 'terkirim', 'revisi', 'disetujui', 'ditolak'] as Quotation['status'][]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          className={`w-full text-left px-3 py-1.5 capitalize hover:bg-blue-50 transition cursor-pointer ${
                            curQuotation.status === st ? 'font-bold text-blue-600' : 'text-slate-700'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1">
              {curQuotation.customerCompany || curQuotation.toRecipient || 'Customer'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(curQuotation);
              }}
              className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              title="Edit Surat Penawaran"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Name Preview Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-600 shrink-0">Nama File PDF:</span>
            {isEditingFileName ? (
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => setIsEditingFileName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingFileName(false)}
                autoFocus
                className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs text-blue-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-600 w-full max-w-sm"
              />
            ) : (
              <span
                onClick={() => setIsEditingFileName(true)}
                className="font-bold text-blue-800 truncate cursor-pointer hover:underline"
                title="Klik untuk mengubah nama file"
              >
                {fileName}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsEditingFileName(!isEditingFileName)}
            className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 ml-2"
          >
            {isEditingFileName ? 'Simpan Nama' : 'Ubah Nama'}
          </button>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 overflow-y-auto p-2 sm:p-4 flex items-center justify-center min-h-[350px]">
          {loadingPdf ? (
            <div className="flex flex-col items-center gap-3 text-slate-500 py-16">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Menghasilkan PDF Resmi A4...</p>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              title="Quotation PDF Preview"
              className="w-full h-full min-h-[480px] rounded-xl shadow-md border border-slate-300 bg-white"
            />
          ) : (
            <div className="p-8 text-center text-rose-600 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              Gagal memuat preview dokumen PDF. Silakan gunakan tombol unduh.
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Total: <strong className="text-slate-900">{formatRupiah(curQuotation.grandTotal)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              onClick={handleSendEmail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kirim Email</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WhatsApp</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
