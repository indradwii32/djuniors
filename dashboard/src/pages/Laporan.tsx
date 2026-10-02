// ============================================================
// Djuniors Dashboard - Laporan Harian CS
// ============================================================
// CS mengisi sendiri angka chat masuk per tanggal. Pendaftar, closing, dan
// persen closing dihitung server dari data pendaftaran — CS tidak menginput
// angka itu, jadi tidak bisa ada laporan yang bertentangan dengan data.
//
// Aturan yang terlihat di UI: laporan hanya bisa Disimpan/ Diperbarui.
// Tidak ada tombol Hapus di halaman ini karena backend memang tidak
// menyediakan endpoint delete.
//
// Admin: memilih CS lewat dropdown, lalu melihat laporan CS terpilih.
//        Filter "Semua CS" menampilkan rekap gabungan.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Percent,
  Save,
  RefreshCw,
  CheckCircle2 as Check,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  csReportsApi,
  adminAccountsApi,
  AdminAccountItem,
  CsReportItem,
  CsReportSummaryRow,
} from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '10px',
  border: '1px solid #E2E8F0',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
  color: '#1E293B',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 800,
  color: '#475569',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '6px',
};

/** Tanggal hari ini sebagai YYYY-MM-DD (WIB). */
function todayWib(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD → "12 Sep 2026" agar enak dibaca. */
function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

export const Laporan: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Filter tanggal untuk tabel rekap.
  const [from, setFrom] = useState<string>(addDays(todayWib(), -29));
  const [to, setTo] = useState<string>(todayWib());

  // Admin: CS yang dipilih. '' = semua CS.
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [selectedRef, setSelectedRef] = useState<string>('');

  // Formulir input laporan harian.
  const [reportDate, setReportDate] = useState<string>(todayWib());
  const [chatMasuk, setChatMasuk] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  const [rows, setRows] = useState<CsReportItem[]>([]);
  const [summary, setSummary] = useState<CsReportSummaryRow[]>([]);
  const [totals, setTotals] = useState<{
    total_pendaftar: number;
    total_closing: number;
    total_chat_masuk: number;
    persen_closing: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Error saat admin menulis laporan untuk CS yang dipilih.
  const [formError, setFormError] = useState<string | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const activeRef = isAdmin ? selectedRef : undefined;

  // Admin: muat daftar CS untuk dropdown.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAccountsApi.list();
        const list = (res.accounts || []).filter((a) => a.role === 'cs');
        if (!cancelled) setAccounts(list);
      } catch {
        if (!cancelled) setAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        csReportsApi.getAll({ ref: activeRef, from, to }),
        csReportsApi.getSummary({ ref: activeRef, from, to }),
      ]);
      setRows(listRes.data || []);
      setSummary(summaryRes.data || []);
      setTotals(summaryRes.totals || null);
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Gagal memuat laporan', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeRef, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Isi formulir dari baris yang tanggalnya sama — supaya "perbarui"
  // terasa seperti menyunting, bukan mengetik dari nol.
  useEffect(() => {
    const existing = rows.find((r) => r.report_date === reportDate);
    setChatMasuk(existing ? String(existing.chat_masuk) : '');
    setCatatan(existing?.catatan || '');
  }, [reportDate, rows]);

  const handleSave = async () => {
    if (isAdmin && !selectedRef) {
      setFormError('Pilih CS terlebih dahulu — laporan disimpan atas nama satu CS.');
      return;
    }
    const chat = Number(chatMasuk);
    if (chatMasuk.trim() === '' || !Number.isInteger(chat) || chat < 0) {
      setFormError('Jumlah chat masuk wajib diisi sebagai bilangan bulat 0 atau lebih.');
      return;
    }
    setFormError(null);
    try {
      setIsSaving(true);
      await csReportsApi.save({
        report_date: reportDate,
        chat_masuk: chat,
        catatan: catatan.trim() || undefined,
        ref: isAdmin ? selectedRef : undefined,
      });
      showNotice('Laporan tersimpan');
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan laporan';
      setFormError(msg);
      showNotice(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /** Baris tabel: baris summary (ada data) digabung dengan laporan manual. */
  const tableRows = useMemo(() => {
    if (summary.length > 0) return summary;
    return rows.map((r) => ({
      report_date: r.report_date,
      chat_masuk: r.chat_masuk,
      total_pendaftar: r.total_pendaftar,
      total_closing: r.total_closing,
      persen_closing: r.persen_closing,
    }));
  }, [summary, rows]);

  const hasReportForDate = useMemo(
    () => rows.some((r) => r.report_date === reportDate),
    [rows, reportDate]
  );

  const shiftRange = (days: number) => {
    const span = Math.max(
      1,
      Math.round(
        (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
          86_400_000
      ) + 1
    );
    setTo(addDays(to, days * span));
    setFrom(addDays(from, days * span));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: notice.type === 'success' ? '#047857' : '#B91C1C',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {notice.type === 'success' ? <Check size={17} /> : <AlertCircle size={17} />}
          {notice.text}
        </div>
      )}

      {/* Kartu filter + ringkasan */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#4A90D9',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <BarChart3 size={14} /> Laporan CS
            </span>
            <h2
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.45rem',
                color: '#1E293B',
                margin: '8px 0 4px 0',
              }}
            >
              Rekap Harian
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
              Chat masuk diisi manual. Pendaftar, closing, dan persen dihitung dari data
              pendaftaran.
            </p>
          </div>
          <button
            onClick={load}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              alignSelf: 'flex-start',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>

        {/* Filter baris */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            alignItems: 'flex-end',
            marginTop: '1.25rem',
          }}
        >
          {isAdmin && (
            <div style={{ minWidth: '220px', flex: '1 1 220px' }}>
              <label style={labelStyle}>Lihat Laporan CS</label>
              <select
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Semua CS (agregat)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.ref_code || ''}>
                    {a.display_name || a.name} ({a.ref_code || 'tanpa ref'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ minWidth: '150px' }}>
            <label style={labelStyle}>Dari</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={labelStyle}>Sampai</label>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => shiftRange(-1)}
              title="Rentang sebelumnya"
              style={{
                padding: '0.6rem 0.7rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => shiftRange(1)}
              title="Rentang berikutnya"
              style={{
                padding: '0.6rem 0.7rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Kartu angka total */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.85rem',
            marginTop: '1.25rem',
          }}
        >
          {[
            {
              label: 'Total Chat Masuk',
              value: totals?.total_chat_masuk ?? 0,
              icon: MessageSquare,
              color: '#4A90D9',
              bg: '#EFF6FF',
            },
            {
              label: 'Total Pendaftar',
              value: totals?.total_pendaftar ?? 0,
              icon: UserCheck,
              color: '#7C3AED',
              bg: '#F5F3FF',
            },
            {
              label: 'Total Closing',
              value: totals?.total_closing ?? 0,
              icon: CheckCircle2,
              color: '#059669',
              bg: '#ECFDF5',
            },
            {
              label: 'Persen Closing',
              value: `${totals?.persen_closing ?? 0}%`,
              icon: Percent,
              color: '#FF6B35',
              bg: '#FFF0EA',
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{
                  backgroundColor: s.bg,
                  borderRadius: '14px',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    color: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulir input harian */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} color="#4A90D9" />
          <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.15rem', color: '#1E293B', margin: 0 }}>
            {hasReportForDate ? 'Perbarui Laporan Tanggal Ini' : 'Isi Laporan Tanggal Ini'}
          </h3>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
          Laporan tidak bisa dihapus — kalau salah, perbarui angkanya. Tanggal boleh diisi
          ulang untuk hari-hari sebelumnya.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            alignItems: 'flex-end',
            marginTop: '1.1rem',
          }}
        >
          <div style={{ minWidth: '165px' }}>
            <label style={labelStyle}>Tanggal Laporan</label>
            <input
              type="date"
              value={reportDate}
              max={todayWib()}
              onChange={(e) => setReportDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={labelStyle}>Jumlah Chat Masuk</label>
            <input
              type="number"
              value={chatMasuk}
              min={0}
              step={1}
              onChange={(e) => setChatMasuk(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
          <div style={{ minWidth: '230px', flex: '1 1 230px' }}>
            <label style={labelStyle}>Catatan (opsional)</label>
            <input
              type="text"
              value={catatan}
              maxLength={500}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. Banyak tanya jadwal kelas"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.7rem 1.4rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isSaving ? '#94A3B8' : '#6D28D9',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: isSaving ? 'wait' : 'pointer',
            }}
          >
            {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {isSaving ? 'Menyimpan...' : hasReportForDate ? 'Perbarui Laporan' : 'Simpan Laporan'}
          </button>
        </div>

        {formError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '0.9rem',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} /> {formError}
          </div>
        )}
      </div>

      {/* Tabel harian */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem 0 1.5rem' }}>
          <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.15rem', color: '#1E293B', margin: 0 }}>
            Rincian Per Hari
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.83rem', margin: '4px 0 0 0' }}>
            {isAdmin && !selectedRef
              ? 'Agregat seluruh CS. Pilih satu CS di atas untuk melihat rincian per orang.'
              : 'Rincian harian dalam rentang yang dipilih.'}
          </p>
        </div>

        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2.5rem 1.5rem',
              color: '#64748B',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={18} className="animate-spin" color="#4A90D9" /> Memuat laporan...
          </div>
        ) : tableRows.length === 0 ? (
          <p style={{ padding: '2.5rem 1.5rem', color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>
            Belum ada data pendaftaran maupun laporan pada rentang ini.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  {['Tanggal', 'Chat Masuk', 'Pendaftar', 'Closing', 'Persen'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.9rem 1.1rem',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#475569',
                        textAlign: h === 'Tanggal' ? 'left' : 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const manual = rows.find((x) => x.report_date === r.report_date);
                  return (
                    <tr
                      key={r.report_date}
                      style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer' }}
                      onClick={() => setReportDate(r.report_date)}
                      title="Klik untuk mengisi / memperbarui laporan tanggal ini"
                    >
                      <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.875rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700 }}>{formatDate(r.report_date)}</span>
                          {manual && (
                            <span
                              style={{
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                borderRadius: '8px',
                                padding: '1px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                              }}
                            >
                              laporan diisi
                            </span>
                          )}
                          {manual?.catatan && (
                            <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                              — {manual.catatan}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.875rem', color: '#334155', textAlign: 'right', fontWeight: 700 }}>
                        {r.chat_masuk}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.875rem', color: '#334155', textAlign: 'right' }}>
                        {r.total_pendaftar}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', fontSize: '0.875rem', color: '#059669', textAlign: 'right', fontWeight: 700 }}>
                        {r.total_closing}
                      </td>
                      <td
                        style={{
                          padding: '0.85rem 1.1rem',
                          fontSize: '0.875rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          color:
                            r.persen_closing >= 50
                              ? '#059669'
                              : r.persen_closing > 0
                                ? '#FF6B35'
                                : '#94A3B8',
                        }}
                      >
                        {r.persen_closing}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Laporan;
