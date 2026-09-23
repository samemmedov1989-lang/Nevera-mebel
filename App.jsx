import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

export default function App() {
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState(null);

  // Form State-leri
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('Usta');

  const [paymentWorkerId, setPaymentWorkerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [jobWorkerId, setJobWorkerId] = useState('');
  const [jobAmount, setJobAmount] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  useEffect(() => {
    const unsubWorkers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setWorkers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubExtra = onSnapshot(collection(db, 'extraJobs'), (snapshot) => {
      setExtraJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubWorkers();
      unsubPayments();
      unsubExtra();
    };
  }, []);

  // 1. Yeni İşçi Ekleme
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName) return alert("Lütfen işçi adını yazın!");
    try {
      await addDoc(collection(db, "users"), {
        fullname: newWorkerName,
        phone: newWorkerPhone || '',
        role: newWorkerRole,
        totalEarned: 0
      });
      setNewWorkerName('');
      setNewWorkerPhone('');
      alert("İşçi başarıyla eklendi!");
    } catch (err) {
      alert("Hata oluştu: " + err.message);
    }
  };

  // 2. İşçi Silme
  const handleDeleteWorker = async (workerId, workerName) => {
    if (window.confirm(`${workerName} adlı işçiyi silmek istediğinizden emin misiniz?`)) {
      try {
        await deleteDoc(doc(db, "users", workerId));
        alert("İşçi silindi!");
      } catch (err) {
        alert("Silinirken hata oluştu!");
      }
    }
  };

  // 3. Ödeme Yapma
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentWorkerId || !paymentAmount) return alert("İşçi ve miktarı girin!");
    try {
      await addDoc(collection(db, "payments"), {
        workerId: paymentWorkerId,
        amount: Number(paymentAmount),
        note: paymentNote,
        date: new Date().toLocaleDateString('tr-TR')
      });
      setPaymentWorkerId('');
      setPaymentAmount('');
      setPaymentNote('');
      alert("Ödeme kaydı eklendi!");
    } catch (err) {
      alert("Ödeme eklenirken hata oluştu!");
    }
  };

  // 4. İş Ekleme (Kazanç Ekle)
  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!jobWorkerId || !jobAmount) return alert("İşçi ve tutarı girin!");
    try {
      const worker = workers.find(w => w.id === jobWorkerId);
      const currentEarned = Number(worker?.totalEarned) || 0;
      
      await updateDoc(doc(db, "users", jobWorkerId), {
        totalEarned: currentEarned + Number(jobAmount)
      });

      await addDoc(collection(db, "extraJobs"), {
        workerId: jobWorkerId,
        workerName: worker?.fullname || worker?.name || 'İşçi',
        amount: Number(jobAmount),
        description: jobDesc,
        status: "approved"
      });

      setJobWorkerId('');
      setJobAmount('');
      setJobDesc('');
      alert("İş ve kazanç başarıyla tanımlandı!");
    } catch (err) {
      alert("İş eklenirken hata oluştu!");
    }
  };

  // 5. İstek Silme
  const handleDeleteRequest = async (requestId) => {
    if (window.confirm("Bu isteği silmek istediğinizden emin misiniz?")) {
      try {
        await deleteDoc(doc(db, "extraJobs", requestId));
        alert("İstek silindi!");
      } catch (err) {
        alert("Hata oluştu.");
      }
    }
  };

  // 6. İstek Düzenleme
  const handleEditRequest = async (request) => {
    const newAmount = prompt("Yeni miktarı girin (AZN):", request.amount);
    if (newAmount === null) return;
    const newDesc = prompt("Yeni iş tanımını girin:", request.description || "");
    if (newDesc === null) return;

    if (newAmount && newDesc) {
      try {
        await updateDoc(doc(db, "extraJobs", request.id), {
          amount: Number(newAmount),
          description: newDesc,
          status: "pending"
        });
        alert("İstek güncellendi!");
      } catch (err) {
        alert("Hata oluştu.");
      }
    }
  };

  const btnStyle = (tab) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#2563eb' : '#1e293b',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  });

  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#fff',
    boxSizing: 'border-box',
    marginBottom: '10px'
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '15px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #334155' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8' }}>NeVeRa Mebel</h1>
          <small style={{ color: '#94a3b8' }}>👑 Yönetici Paneli</small>
        </div>
      </header>

      {/* Menü Butonları */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        <button onClick={() => setActiveTab('overview')} style={btnStyle('overview')}>Genel Durum</button>
        <button onClick={() => setActiveTab('workers')} style={btnStyle('workers')}>İşçiler ({workers.length})</button>
        <button onClick={() => setActiveTab('addWorker')} style={btnStyle('addWorker')}>+ İşçi Ekle</button>
        <button onClick={() => setActiveTab('addPayment')} style={btnStyle('addPayment')}>💳 Ödeme Yap</button>
        <button onClick={() => setActiveTab('addJob')} style={btnStyle('addJob')}>🔨 İş/Kazanç Ekle</button>
      </div>

      {/* 1. GENEL DURUM SEKMESİ */}
      {activeTab === 'overview' && (
        <div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
            💡 Ödeme geçmişini görmek için işçinin kartına tıklayın.
          </p>

          <div style={{ display: 'grid', gap: '15px' }}>
            {workers.map((worker) => {
              const workerPayments = payments.filter(p => p.workerId === worker.id);
              const totalPaid = workerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
              const totalEarned = Number(worker.totalEarned) || 0;
              const remaining = totalEarned - totalPaid;

              return (
                <div 
                  key={worker.id}
                  onClick={() => setSelectedWorkerForHistory(worker)}
                  style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '15px', border: '1px solid #334155', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>{worker.fullname || worker.name || "Usta"}</h3>
                    <span style={{ backgroundColor: '#334155', color: '#94a3b8', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>
                      {worker.role || 'Usta'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0 10px 0' }}>Tel: {worker.phone || 'Yok'}</p>

                  <div style={{ borderTop: '1px dashed #334155', paddingTop: '10px', display: 'grid', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Toplam Hak Ediş:</span>
                      <strong style={{ color: '#38bdf8' }}>{totalEarned} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Ödenen:</span>
                      <strong style={{ color: '#4ade80' }}>{totalPaid} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginTop: '5px' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>Kalan Alacak:</span>
                      <strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80' }}>{remaining} AZN</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reddedilen İstekler */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#ef4444', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Reddedilen İstekler</h3>
            {extraJobs.filter(j => j.status === 'rejected').length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Reddedilen istek yok.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {extraJobs.filter(j => j.status === 'rejected').map((req) => (
                  <div key={req.id} style={{ backgroundColor: '#1e293b', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#f8fafc' }}>{req.workerName || 'İşçi'}</strong>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{req.amount} AZN</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '5px 0' }}>{req.description}</p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button onClick={() => handleEditRequest(req)} style={{ flex: 1, padding: '6px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        ✏️ Düzenle
                      </button>
                      <button onClick={() => handleDeleteRequest(req.id)} style={{ flex: 1, padding: '6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. İŞÇİ LİSTESİ VE SİLME */}
      {activeTab === 'workers' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <h3>İşçi Yönetimi</h3>
          {workers.map(w => (
            <div key={w.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{w.fullname || w.name}</strong> ({w.role || 'Usta'})
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tel: {w.phone || 'Yok'}</div>
              </div>
              <button 
                onClick={() => handleDeleteWorker(w.id, w.fullname || w.name)}
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                🗑️ Sil
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. İŞÇİ EKLE FORM */}
      {activeTab === 'addWorker' && (
        <form onSubmit={handleAddWorker} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>Yeni İşçi Ekle</h3>
          <input type="text" placeholder="Ad Soyad" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Telefon Numarası" value={newWorkerPhone} onChange={e => setNewWorkerPhone(e.target.value)} style={inputStyle} />
          <select value={newWorkerRole} onChange={e => setNewWorkerRole(e.target.value)} style={inputStyle}>
            <option value="Usta">Usta</option>
            <option value="Çırak">Çırak</option>
            <option value="Montajcı">Montajcı</option>
          </select>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Kaydet
          </button>
        </form>
      )}

      {/* 4. ÖDEME YAP FORM */}
      {activeTab === 'addPayment' && (
        <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>Ödeme Kaydı Ekle</h3>
          <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- İşçi Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="Ödenen Miktar (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Not / Açıklama (Opsiyonel)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Ödemeyi Kaydet
          </button>
        </form>
      )}

      {/* 5. İŞ / KAZANÇ EKLE FORM */}
      {activeTab === 'addJob' && (
        <form onSubmit={handleAddJob} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>İşçiye İş / Hak Ediş Ekle</h3>
          <select value={jobWorkerId} onChange={e => setJobWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- İşçi Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="İş Tutarı / Qazanc (AZN)" value={jobAmount} onChange={e => setJobAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="İş Açıklaması (Örn: Mutfak Dolabı Montajı)" value={jobDesc} onChange={e => setJobDesc(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            İşi Kaydet ve Kazanca Ekle
          </button>
        </form>
      )}

      {/* ÖDEME GEÇMİŞİ MODALI */}
      {selectedWorkerForHistory && (
        <div onClick={() => setSelectedWorkerForHistory(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '420px', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>{selectedWorkerForHistory.fullname || selectedWorkerForHistory.name}</h3>
              <button onClick={() => setSelectedWorkerForHistory(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>Ödeme Geçmişi:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
              {payments.filter(p => p.workerId === selectedWorkerForHistory.id).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Henüz ödeme yapılmadı.</p>
              ) : (
                payments.filter(p => p.workerId === selectedWorkerForHistory.id).map((p) => (
                  <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#4ade80', fontSize: '15px' }}>+{p.amount} AZN</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{p.date || 'Tarih yok'}</div>
                    </div>
                    {p.note && <small style={{ color: '#94a3b8', fontSize: '12px' }}>{p.note}</small>}
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setSelectedWorkerForHistory(null)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bağla</button>
          </div>
        </div>
      )}

    </div>
  );
}
