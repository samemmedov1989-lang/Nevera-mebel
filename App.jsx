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

  // Form State-ləri
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('Usta');

  const [paymentWorkerId, setPaymentWorkerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [jobWorkerId, setJobWorkerId] = useState('');
  const [jobAmount, setJobAmount] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  // Usta tərəfindən sorğu göndərilməsi forması üçün state
  const [reqWorkerId, setReqWorkerId] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqDesc, setReqDesc] = useState('');

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

  // 1. Yeni İşçi Əlavə Etmə
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName) return alert("Zəhmət olmasa işçinin adını yazın!");
    try {
      await addDoc(collection(db, "users"), {
        fullname: newWorkerName,
        phone: newWorkerPhone || '',
        role: newWorkerRole,
        totalEarned: 0
      });
      setNewWorkerName('');
      setNewWorkerPhone('');
      alert("İşçi uğurla əlavə olundu!");
    } catch (err) {
      alert("Xəta baş verdi: " + err.message);
    }
  };

  // 2. İşçi Silmə
  const handleDeleteWorker = async (workerId, workerName) => {
    if (window.confirm(`${workerName} adlı işçini silmək istədiyinizə əminsiniz?`)) {
      try {
        await deleteDoc(doc(db, "users", workerId));
        alert("İşçi silindi!");
      } catch (err) {
        alert("Silinərkən xəta baş verdi!");
      }
    }
  };

  // 3. Ödəniş Etmə
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentWorkerId || !paymentAmount) return alert("İşçini və məbləği daxil edin!");
    try {
      await addDoc(collection(db, "payments"), {
        workerId: paymentWorkerId,
        amount: Number(paymentAmount),
        note: paymentNote,
        date: new Date().toLocaleDateString('az-AZ')
      });
      setPaymentWorkerId('');
      setPaymentAmount('');
      setPaymentNote('');
      alert("Ödəniş qeydə alındı!");
    } catch (err) {
      alert("Ödəniş əlavə edilərkən xəta baş verdi!");
    }
  };

  // 4. Birbaşa İş / Qazanc Əlavə Etmə (Admin tərəfindən)
  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!jobWorkerId || !jobAmount) return alert("İşçini və məbləği daxil edin!");
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
        status: "approved",
        date: new Date().toLocaleDateString('az-AZ')
      });

      setJobWorkerId('');
      setJobAmount('');
      setJobDesc('');
      alert("İş və qazanc uğurla qeydə alındı!");
    } catch (err) {
      alert("İş əlavə edilərkən xəta baş verdi!");
    }
  };

  // 5. Ustanın İş Sorğusu Göndərməsi
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!reqWorkerId || !reqAmount) return alert("İşçini və məbləği seçin!");
    try {
      const worker = workers.find(w => w.id === reqWorkerId);
      await addDoc(collection(db, "extraJobs"), {
        workerId: reqWorkerId,
        workerName: worker?.fullname || worker?.name || 'İşçi',
        amount: Number(reqAmount),
        description: reqDesc,
        status: "pending",
        date: new Date().toLocaleDateString('az-AZ')
      });
      setReqWorkerId('');
      setReqAmount('');
      setReqDesc('');
      alert("Sorğunuz göndərildi! Admin təsdiqlədikdən sonra balansınıza əlavə olunacaq.");
    } catch (err) {
      alert("Sorğu göndərilərkən xəta baş verdi!");
    }
  };

  // 6. Sorğunu TƏSDİQLƏMƏK (Admin üçün)
  const handleApproveRequest = async (req) => {
    try {
      const worker = workers.find(w => w.id === req.workerId);
      const currentEarned = Number(worker?.totalEarned) || 0;

      // İşçinin ümumi qazancını artırırıq
      if (req.workerId) {
        await updateDoc(doc(db, "users", req.workerId), {
          totalEarned: currentEarned + Number(req.amount)
        });
      }

      // Sorğunun statusunu 'approved' edirik
      await updateDoc(doc(db, "extraJobs", req.id), {
        status: "approved"
      });

      alert("Sorğu təsdiqləndi və məbləğ ustanın qazancına əlavə olundu!");
    } catch (err) {
      alert("Təsdiqlənərkən xəta baş verdi: " + err.message);
    }
  };

  // 7. Sorğunu RƏDD ETMƏK (Admin üçün)
  const handleRejectRequest = async (reqId) => {
    if (window.confirm("Bu sorğunu rədd etmək istədiyinizə əminsiniz?")) {
      try {
        await updateDoc(doc(db, "extraJobs", reqId), {
          status: "rejected"
        });
        alert("Sorğu rədd edildi.");
      } catch (err) {
        alert("Xəta baş verdi.");
      }
    }
  };

  // 8. Sorğunu Silmək
  const handleDeleteRequest = async (requestId) => {
    if (window.confirm("Bu sorğunu tamamilə silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "extraJobs", requestId));
        alert("Sorğu silindi!");
      } catch (err) {
        alert("Xəta baş verdi.");
      }
    }
  };

  const pendingRequests = extraJobs.filter(j => j.status === 'pending');

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
          <small style={{ color: '#94a3b8' }}>👑 İdarəetmə Paneli</small>
        </div>
      </header>

      {/* Naviqasiya Menyusu */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        <button onClick={() => setActiveTab('overview')} style={btnStyle('overview')}>Ümumi Nəzarət</button>
        <button onClick={() => setActiveTab('pending')} style={{ ...btnStyle('pending'), backgroundColor: activeTab === 'pending' ? '#2563eb' : (pendingRequests.length > 0 ? '#d97706' : '#1e293b') }}>
          📥 Sorğular ({pendingRequests.length})
        </button>
        <button onClick={() => setActiveTab('workers')} style={btnStyle('workers')}>İşçilər ({workers.length})</button>
        <button onClick={() => setActiveTab('sendReq')} style={btnStyle('sendReq')}>📝 Sorğu Göndər</button>
        <button onClick={() => setActiveTab('addPayment')} style={btnStyle('addPayment')}>💳 Ödəniş Et</button>
        <button onClick={() => setActiveTab('addWorker')} style={btnStyle('addWorker')}>+ İşçi Əlavə Et</button>
      </div>

      {/* 1. ÜMUMİ NƏZARƏT SEKSİYASI */}
      {activeTab === 'overview' && (
        <div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
            💡 Ödəniş tarixçəsini görmək üçün ustanın kartına klikləyin.
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
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0 10px 0' }}>Tel: {worker.phone || 'Yoxdur'}</p>

                  <div style={{ borderTop: '1px dashed #334155', paddingTop: '10px', display: 'grid', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Ümumi Qazanc:</span>
                      <strong style={{ color: '#38bdf8' }}>{totalEarned} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Ödənilib:</span>
                      <strong style={{ color: '#4ade80' }}>{totalPaid} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginTop: '5px' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>Qalan Alacaq:</span>
                      <strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80' }}>{remaining} AZN</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GƏLƏN İŞ SORĞULARINI TƏSDİQLƏMƏK BÖLMƏSİ */}
      {activeTab === 'pending' && (
        <div>
          <h3>Gözləyən İş Sorğuları</h3>
          {pendingRequests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Gözləyən yeni sorğu yoxdur.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingRequests.map((req) => (
                <div key={req.id} style={{ backgroundColor: '#1e293b', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#38bdf8', fontSize: '16px' }}>{req.workerName || 'Usta'}</strong>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '18px' }}>{req.amount} AZN</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#f8fafc', margin: '8px 0' }}>{req.description || 'Təsvir qeyd edilməyib'}</p>
                  <small style={{ color: '#64748b' }}>Tarix: {req.date || 'Yoxdur'}</small>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button 
                      onClick={() => handleApproveRequest(req)}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✓ Təsdiqlə
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(req.id)}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕ Rədd et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. İŞÇİ LİSTƏSİ VƏ SİLMƏ */}
      {activeTab === 'workers' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <h3>İşçilərin Siyahısı</h3>
          {workers.map(w => (
            <div key={w.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{w.fullname || w.name}</strong> ({w.role || 'Usta'})
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tel: {w.phone || 'Yoxdur'}</div>
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

      {/* 4. İŞÇİNİN İŞ BARƏSİNDƏ SORĞU GÖNDƏRMƏSİ FORM-U */}
      {activeTab === 'sendReq' && (
        <form onSubmit={handleSendRequest} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>Görülən İş Barədə Sorğu Göndər</h3>
          <select value={reqWorkerId} onChange={e => setReqWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- Adınızı / Ustanı Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="Görülən işin məbləği (AZN)" value={reqAmount} onChange={e => setReqAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Görülən iş barədə məlumat (Məsələn: Mətbəx mebeli quraşdırıldı)" value={reqDesc} onChange={e => setReqDesc(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            📤 Sorğunu Göndər
          </button>
        </form>
      )}

      {/* 5. ÖDƏNİŞ ET FORM-U */}
      {activeTab === 'addPayment' && (
        <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>Ustaya Ödəniş Et</h3>
          <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- İşçini Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="Ödənilən Məbləğ (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Qeyd (İstəyə bağlı)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Ödənişi Qeyd Et
          </button>
        </form>
      )}

      {/* 6. YENİ İŞÇİ ƏLAVƏ ET FORM-U */}
      {activeTab === 'addWorker' && (
        <form onSubmit={handleAddWorker} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3>Yeni İşçi Əlavə Et</h3>
          <input type="text" placeholder="Ad Soyad" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Telefon Nömrəsi" value={newWorkerPhone} onChange={e => setNewWorkerPhone(e.target.value)} style={inputStyle} />
          <select value={newWorkerRole} onChange={e => setNewWorkerRole(e.target.value)} style={inputStyle}>
            <option value="Usta">Usta</option>
            <option value="Şagird">Şagird</option>
            <option value="Quraşdırıcı">Quraşdırıcı</option>
          </select>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            İşçini Yadda Saxla
          </button>
        </form>
      )}

      {/* ÖDƏNİŞ TARİXÇƏSİ PƏNCƏRƏSİ (MODAL) */}
      {selectedWorkerForHistory && (
        <div onClick={() => setSelectedWorkerForHistory(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '420px', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>{selectedWorkerForHistory.fullname || selectedWorkerForHistory.name}</h3>
              <button onClick={() => setSelectedWorkerForHistory(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>Ödəniş Tarixçəsi:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
              {payments.filter(p => p.workerId === selectedWorkerForHistory.id).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Hələ ki, ödəniş edilməyib.</p>
              ) : (
                payments.filter(p => p.workerId === selectedWorkerForHistory.id).map((p) => (
                  <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#4ade80', fontSize: '15px' }}>+{p.amount} AZN</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{p.date || 'Tarix yoxdur'}</div>
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
