import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { CompanyProfile } from '../types';
import { DigitalSignaturePad } from '../components/DigitalSignaturePad';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Upload,
  ShieldCheck,
  Star,
  Globe,
  Phone,
  Mail,
  MapPin,
  X,
  MessageCircle,
} from 'lucide-react';

export const CompaniesPage: React.FC = () => {
  const { companies, saveCompany, deleteCompany, setDefaultCompany } = useData();

  const [editingCompany, setEditingCompany] = useState<Partial<CompanyProfile> | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCreateNew = () => {
    setEditingCompany({
      name: '',
      address: '',
      city: '',
      postalCode: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      npwp: '',
      directorName: '',
      directorTitle: 'Direktur',
      logoUrl: '',
      signatureUrl: '',
      stampUrl: '',
      isDefault: companies.length === 0,
    });
    setShowModal(true);
  };

  const handleEdit = (comp: CompanyProfile) => {
    setEditingCompany(comp);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (companies.length <= 1) {
      alert('Minimal harus ada 1 profil kop surat perusahaan.');
      return;
    }
    if (confirm(`Hapus profil kop surat ${name}?`)) {
      await deleteCompany(id);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res && editingCompany) {
        setEditingCompany({ ...editingCompany, logoUrl: res });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res && editingCompany) {
        setEditingCompany({ ...editingCompany, stampUrl: res });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany?.name?.trim()) {
      alert('Nama perusahaan wajib diisi.');
      return;
    }
    await saveCompany(editingCompany);
    setShowModal(false);
    setEditingCompany(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Setting Kop Surat & Perusahaan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Dukung Multi-Kop Surat. Kelola logo, legalitas, stempel, dan tanda tangan digital untuk kop surat resmi.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-xs sm:text-sm font-extrabold shadow-md shadow-blue-600/25 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tambah Profil Perusahaan Baru</span>
        </button>
      </div>

      {/* Grid of Company Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {companies.map((comp) => (
          <div
            key={comp.id}
            className={`bg-white rounded-3xl border-2 p-5 sm:p-6 shadow-xs flex flex-col justify-between transition ${
              comp.isDefault ? 'border-blue-600' : 'border-slate-200/90'
            }`}
          >
            <div>
              {/* Header Status & Actions */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">ID: {comp.id.slice(-6)}</span>
                  {comp.isDefault && (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-blue-600 text-blue-600" /> Kop Surat Utama
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!comp.isDefault && (
                    <button
                      onClick={() => setDefaultCompany(comp.id)}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                      title="Set sebagai kop utama"
                    >
                      Jadikan Utama
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(comp)}
                    className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(comp.id, comp.name)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* REALISTIC KOP SURAT PREVIEW BOX (RATA TENGAH & SEJAJAR) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-center gap-4 text-left max-w-xl mx-auto">
                  {/* Logo di sebelah kiri, tinggi sejajar batas atas dan bawah teks */}
                  {comp.logoUrl ? (
                    <div className="shrink-0 flex items-center justify-center">
                      <img
                        src={comp.logoUrl}
                        alt={comp.name}
                        className="w-18 h-18 object-contain rounded-xl border bg-white p-1"
                      />
                    </div>
                  ) : (
                    <div className="w-18 h-18 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0 text-center p-1">
                      <Building2 className="w-6 h-6 text-slate-300" />
                      <span className="text-[9px] font-bold mt-0.5">LOGO</span>
                    </div>
                  )}

                  {/* Teks di sebelah kanan sejajar sempurna */}
                  <div className="min-w-0 flex-1 font-serif">
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-wide uppercase leading-tight">
                      {comp.name || 'NAMA PERUSAHAAN'}
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {comp.address}
                      {comp.city ? `, ${comp.city}` : ''}
                      {comp.postalCode ? ` ${comp.postalCode}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1 font-medium">
                      {comp.phone && <span>Telp: {comp.phone}</span>}
                      {comp.whatsapp && <span>WA: {comp.whatsapp}</span>}
                      {comp.email && <span>Email: {comp.email}</span>}
                      {comp.website && <span>Web: {comp.website}</span>}
                    </div>
                    {comp.npwp && (
                      <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        NPWP: {comp.npwp}
                      </p>
                    )}
                  </div>
                </div>

                {/* Garis Ganda Kop Surat Resmi */}
                <div className="pt-2">
                  <div className="h-[2px] bg-slate-800 w-full" />
                  <div className="h-[0.7px] bg-slate-800 w-full mt-[1.5px]" />
                </div>
              </div>

              {/* Tanda Tangan & Stempel Preview */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Penandatangan</span>
                  <p className="font-extrabold text-slate-900">{comp.directorName || '-'}</p>
                  <p className="text-[11px] text-slate-500">{comp.directorTitle || 'Direktur'}</p>
                </div>

                <div className="flex items-center gap-3">
                  {comp.stampUrl && (
                    <div className="text-center">
                      <img src={comp.stampUrl} alt="Stempel" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] text-slate-400">Stempel</span>
                    </div>
                  )}
                  {comp.signatureUrl ? (
                    <div className="text-center">
                      <img src={comp.signatureUrl} alt="Tanda Tangan" className="h-10 object-contain mx-auto" />
                      <span className="text-[9px] text-slate-400">Ttd Digital</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                      Belum ada TTD
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => handleEdit(comp)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition text-center cursor-pointer"
              >
                Edit Data Kop & Legalitas
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FORM KOP SURAT */}
      {showModal && editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingCompany.id ? 'Edit Profil Perusahaan' : 'Tambah Profil Kop Surat'}
                </h3>
                <p className="text-xs text-slate-500">
                  Data ini akan otomatis tercetak pada kop surat & tanda tangan resmi
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Nama Perusahaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCompany.name || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  placeholder="Contoh: CV Mulia Tekhnik Abadi / PT MTA Engineering"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Upload Logo Perusahaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Logo Perusahaan (Rata Kiri Kop Surat)
                </label>
                <div className="flex items-center gap-4">
                  {editingCompany.logoUrl ? (
                    <div className="relative">
                      <img
                        src={editingCompany.logoUrl}
                        alt="Logo"
                        className="w-20 h-20 object-contain rounded-2xl border bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingCompany({ ...editingCompany, logoUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}

                  <label className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl p-4 cursor-pointer hover:bg-slate-50 transition text-center">
                    <Upload className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs font-bold text-slate-700 block">Pilih File Logo</span>
                    <span className="text-[11px] text-slate-400">PNG atau JPG transparan (maks 2MB)</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Alamat, Kota, Kode Pos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor / Workshop</label>
                <textarea
                  rows={2}
                  value={editingCompany.address || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  placeholder="Jl. Raya Industri No. 45, Kawasan Niaga Cikarang"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={editingCompany.city || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                    placeholder="Bekasi / Jakarta"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={editingCompany.postalCode || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, postalCode: e.target.value })}
                    placeholder="17530"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Kontak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon Kantor</label>
                  <input
                    type="text"
                    value={editingCompany.phone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    placeholder="(021) 8983-4567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Resmi</label>
                  <input
                    type="text"
                    value={editingCompany.whatsapp || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, whatsapp: e.target.value })}
                    placeholder="081298765432"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Perusahaan</label>
                  <input
                    type="email"
                    value={editingCompany.email || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    placeholder="info@muliatekhnik.co.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website Resmi</label>
                  <input
                    type="text"
                    value={editingCompany.website || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                    placeholder="www.muliatekhnik.co.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* NPWP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor NPWP Perusahaan</label>
                <input
                  type="text"
                  value={editingCompany.npwp || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, npwp: e.target.value })}
                  placeholder="02.456.789.1-413.000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Penandatangan (Direktur & Jabatan) */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Penandatangan</label>
                  <input
                    type="text"
                    value={editingCompany.directorName || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, directorName: e.target.value })}
                    placeholder="Jamhur"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Penandatangan</label>
                  <input
                    type="text"
                    value={editingCompany.directorTitle || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, directorTitle: e.target.value })}
                    placeholder="Direktur Utama"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Tanda Tangan Digital Pad */}
              <div className="pt-2">
                <DigitalSignaturePad
                  title="Tanda Tangan Digital Penandatangan"
                  value={editingCompany.signatureUrl}
                  onChange={(url) => setEditingCompany({ ...editingCompany, signatureUrl: url })}
                />
              </div>

              {/* Upload Stempel Perusahaan */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Stempel Perusahaan (Opsional)
                </label>
                <div className="flex items-center gap-4">
                  {editingCompany.stampUrl && (
                    <div className="relative">
                      <img
                        src={editingCompany.stampUrl}
                        alt="Stempel"
                        className="w-16 h-16 object-contain rounded-xl border bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingCompany({ ...editingCompany, stampUrl: '' })}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <label className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl p-3 cursor-pointer hover:bg-slate-50 transition text-center">
                    <span className="text-xs font-bold text-slate-700 block">Pilih Gambar Stempel</span>
                    <span className="text-[10px] text-slate-400">PNG transparan (akan ditumpangkan pada TTD)</span>
                    <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 -mx-4 -mb-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95"
                >
                  Simpan Profil Kop Surat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATED BY JAMHUR WA LINK FOOTER */}
      <div className="text-center pt-2">
        <a
          href="https://wa.me/628179015181?text=Halo%20Jamhur,%20saya%20menghubungi%20mengenai%20aplikasi%20Surat%20Penawaran"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Created by <strong className="text-slate-900">jamhur</strong> (WhatsApp: 628179015181)</span>
        </a>
      </div>
    </div>
  );
};
