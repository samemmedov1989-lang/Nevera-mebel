import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { Users, FileText, Plus } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyC9u1zaYHRxjUo9Hq17In",
  authDomain: "nevera-mebel.firebaseapp.com",
  projectId: "nevera-mebel",
  storageBucket: "nevera-mebel.firebasestorage.app",
  messagingSenderId: "522820690949",
  appId: "1:522820690949:web:e7ebf196",
  measurementId: "G-W0WRBHP0R2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [reports, setReports] = useState([]);
  const [workerName, setWorkerName] = useState('');
  const [reportText, setReportText] = useState('');
  const [cost, setCost] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!workerName || !reportText) return;

    await addDoc(collection(db, "reports"), {
      worker: workerName,
      text: reportText,
      cost: cost ? `${cost} AZN` : '0 AZN',
      date: new Date().toISOString().split('T')[0]
    });

    setWorkerName('');
    setReportText('');
    setCost('');
    setShowModal(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f5f7', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>NeVeRa Mebel — İdarəetmə Paneli</h1>
        <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Hesabat Əlavə Et
        </button>
      </header>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={handleAddReport} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Yeni İş Hesabatı</h3>
            <input 
              type="text" 
              placeholder="Ustanın Adı və Soyadı" 
              value={workerName} 
              onChange={e => setWorkerName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
              required 
            />
            <textarea 
              placeholder="Görülən iş haqqında məlumat" 
              value={reportText} 
              onChange={e => setReportText(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box', height: '80px' }}
              required 
            />
            <input 
              type="number" 
              placeholder="Məbləğ/Xərc (AZN)" 
              value={cost} 
              onChange={e => setCost(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ləğv et</button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Göndər</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '18px', color: '#334155' }}>
            <FileText size={20} /> Canlı İş Hesabatları ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Hələ heç bir hesabat daxil edilməyib.</p>
          ) : (
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
          )}
        </section>
      </div>
    </div>
  );
}
