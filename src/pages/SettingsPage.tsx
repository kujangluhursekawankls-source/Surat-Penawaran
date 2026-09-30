import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { generateQuotationNumber, toRomanMonth } from '../utils/formatters';
import {
  Settings,
  Hash,
  Shield,
  Download,
  Upload,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Database,
  Smartphone,
  MessageCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const { settings, updateSettings, exportDataJson, importDataJson } = useData();

  const [numberFormat, setNumberFormat] = useState(
    settings?.numberFormat || '{Nomor}/SP/MTA/{BulanRomawi}/{Tahun}'
  );
  const [currentSeq, setCurrentSeq] = useState(settings?.currentSequence || 1);
  const [timeoutMins, setTimeoutMins] = useState(settings?.sessionTimeoutMinutes || 30);

  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const samplePreview = generateQuotationNumber(numberFormat, currentSeq);

  const handleSaveNumbering = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      numberFormat,
      currentSequence: currentSeq,
      sessionTimeoutMinutes: timeoutMins,
    });
    alert('Pengaturan nomor surat dan sesi berhasil disimpan!');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    try {
      await changePassword(newPassword);
      setPasswordMsg({ type: 'success', text: 'Password berhasil diperbarui!' });
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui password.';
      setPasswordMsg({ type: 'error', text: msg });
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SuratPenawaranPro_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importDataJson(content);
        setImportStatus(`Berhasil memulihkan ${res.count} data dokumen & profil!`);
      } catch (err) {
        console.error(err);
        setImportStatus('Gagal memulihkan file backup. Format file tidak sesuai.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Pengaturan Aplikasi & Keamanan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Format penomoran otomatis surat, auto-logout, backup data, dan manajemen akun.
        </p>
      </div>

      {/* 1. FORMAT NOMOR SURAT */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Hash className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Format Penomoran Surat Otomatis</h3>
        </div>

        <form onSubmit={handleSaveNumbering} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pola Format Nomor Surat
            </label>
            <input
              type="text"
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value)}
              placeholder="{Nomor}/SP/MTA/{BulanRomawi}/{Tahun}"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
            />
            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
              <p>Tag yang tersedia:</p>
              <ul className="list-disc list-inside font-mono text-[10px] text-blue-700 space-y-0.5">
                <li>{`{Nomor}`} : Urutan 3 digit (contoh: 001, 002)</li>
                <li>{`{BulanRomawi}`} : Bulan dalam angka Romawi (contoh: I, II, IX, XII)</li>
                <li>{`{Bulan}`} : Bulan angka 2 digit (contoh: 09)</li>
                <li>{`{Tahun}`} : Tahun 4 digit (contoh: 2026)</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Urut Surat Berikutnya
              </label>
              <input
                type="number"
                min="1"
                value={currentSeq}
                onChange={(e) => setCurrentSeq(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Durasi Timeout Inaktivitas Sesi
              </label>
              <select
                value={timeoutMins}
                onChange={(e) => setTimeoutMins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value={15}>15 Menit (Sangat Aman)</option>
                <option value={30}>30 Menit (Direkomendasikan)</option>
                <option value={60}>60 Menit (1 Jam)</option>
              </select>
            </div>
          </div>

          {/* Realtime Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-600 block uppercase">
                Preview Hasil Format Nomor:
              </span>
              <span className="text-sm font-black text-blue-900">{samplePreview}</span>
            </div>
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Format Penomoran</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. PWA & INSTALASI */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Instalasi Aplikasi (PWA)</h3>
        </div>
        <p className="text-xs text-slate-600">
          Instal aplikasi ini di layar utama Android, iPhone, Tablet, atau Laptop Anda untuk pengalaman kerja cepat seperti aplikasi native.
        </p>
        <div className="pt-2">
          <PWAInstallButton variant="settings" />
        </div>
      </div>

      {/* 3. BACKUP & RESTORE DATA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Database className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Backup & Pemulihan Data (Export / Restore)</h3>
        </div>

        <p className="text-xs text-slate-600">
          Seluruh data surat penawaran, master pelanggan, profil kop surat, dan katalog pekerjaan dapat diunduh ke komputer/HP Anda sebagai cadangan privat.
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor / Download Backup Data (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition active:scale-95 cursor-pointer text-center">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Pulihkan / Restore Data dari File</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* 4. KEAMANAN & GANTI PASSWORD */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Shield className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Keamanan Akun & Kata Sandi</h3>
        </div>

        <div className="text-xs text-slate-600">
          Akun saat ini: <strong className="text-slate-900">{user?.email}</strong>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ganti Password Baru</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
          >
            Perbarui Password
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900">Keluar dari Sesi</p>
            <p className="text-[11px] text-slate-400">
              Logout akan membersihkan seluruh memori dan cache lokal di perangkat ini.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Sekarang</span>
          </button>
        </div>
      </div>

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
