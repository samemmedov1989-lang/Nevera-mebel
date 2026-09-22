import React, { useState } from 'react';
import { Users, FileText, Plus, CheckCircle, Clock } from 'lucide-react';

export default function App() {
  const [workers] = useState([
    { id: 1, name: 'Əli Məmmədov', role: 'Usta', status: 'Aktiv', task: 'Mətbəx mebeli montajı' },
    { id: 2, name: 'Həsən Əliyev', role: 'Köməkçi', status: 'Məşğul', task: 'Qapı kəsimi' },
    { id: 3, name: 'Vüqar Qasımov', role: 'Usta', status: 'Gözləmədə', task: 'Rəngləmə' },
  ]);

  const [reports] = useState([
    { id: 1, worker: 'Əli Məmmədov', date: '2026-09-23', text: 'Mətbəx dolablarının quraşdırılması tamamlandı.', cost: '120 AZN' },
    { id: 2, worker: 'Həsən Əliyev', date: '2026-09-23', text: 'Cilalama işləri görüldü.', cost: '50 AZN' },
  ]);

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f5f7', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>NeVeRa Mebel — İdarəetmə Paneli</h1>
        <button style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Yeni Tapşırıq
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* İşçilər Bölməsi */}
        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '18px', color: '#334155' }}>
            <Users size={20} /> İşçilərin Siyahısı (15 Usta)
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {workers.map(w => (
              <li key={w.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{w.name}</strong> <small style={{ color: '#64748b' }}>({w.role})</small>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{w.task}</div>
                </div>
                <span style={{
                  padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                  backgroundColor: w.status === 'Aktiv' ? '#dcfce7' : w.status === 'Məşğul' ? '#fef9c3' : '#f1f5f9',
                  color: w.status === 'Aktiv' ? '#166534' : w.status === 'Məşğul' ? '#854d0e' : '#475569'
                }}>
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Günlük Hesabatlar Bölməsi */}
        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '18px', color: '#334155' }}>
            <FileText size={20} /> Son İş Hesabatları
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {reports.map(r => (
              <li key={r.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>{r.worker}</strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{r.date}</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#334155' }}>{r.text}</p>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669' }}>Xərc/Ödəniş: {r.cost}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

