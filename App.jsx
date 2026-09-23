import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'select'); // 'select', 'worker', 'admin'
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);

  // Formlar üçün state-lər
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqDesc, setReqDesc] = useState('');

  // Admin formları
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [paymentWorkerId, setPaymentWorkerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

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
    return () => { unsubWorkers(); unsubPayments(); unsubExtra(); };
  }, []);

  const selectRole = (r) => {
    setRole(r);
    localStorage.setItem('user_role', r);
  };

  // USTANIN SORĞU GÖNDƏRMƏSİ
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId || !reqAmount || !reqDesc) return alert("Bütün xanaları doldurun!");
    const worker = workers.find(w => w.id === selectedWorkerId);
    try {
      await addDoc(collection(db, "extraJobs"), {
        workerId: selectedWorkerId,
        workerName: worker?.fullname || worker?.name || 'Usta',
        amount: Number(reqAmount),
        description: reqDesc,
        status: "pending",
        date: new Date().toLocaleDateString('az-AZ')
      });
      setReqAmount('');
      setReqDesc('');
      alert("Sorğunuz adminə göndərildi!");
    } catch (err) {
      alert("Xəta baş verdi.");
    }
  };

  // ADMIN: Sorğunu təsdiqləmək
  const handleApprove = async (req) => {
    try {
      const worker = workers.find(w => w.id === req.workerId);
      const currentEarned = Number(worker?.totalEarned) || 0;
      await updateDoc(doc(db, "users", req.workerId), { totalEarned: currentEarned + Number(req.amount) });
      await updateDoc(doc(db, "extraJobs", req.id), { status: "approved" });
      alert("Təsdiqləndi!");
    } catch (err) { alert("Xəta!"); }
  };

  // ADMIN: Sorğunu rədd etmək
  const handleReject = async (id) => {
    await updateDoc(doc(db, "extraJobs", id), { status: "rejected" });
  };

  // ADMIN: Ödəniş etmək
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentWorkerId || !paymentAmount) return alert("Məlumatları daxil edin!");
    await addDoc(collection(db, "payments"), {
      workerId: paymentWorkerId,
      amount: Number(paymentAmount),
      date: new Date().toLocaleDateString('az-AZ')
    });
    setPaymentAmount('');
    alert("Ödəniş edildi!");
  };

  // ADMIN: İşçi əlavə etmək
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName) return;
    await addDoc(collection(db, "users"), { fullname: newWorkerName, phone: newWorkerPhone, totalEarned: 0 });
    setNewWorkerName(''); setNewWorkerPhone('');
    alert("İşçi əlavə olundu!");
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' };

  // 1. ROLLARI SEÇMƏK EKRANI (İLK DƏFƏ GİRƏNDƏ)
  if (role === 'select') {
    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h2>NeVeRa Mebel</h2>
        <p>Giriş rejimini seçin:</p>
        <button onClick={() => selectRole('worker')} style={{ width: '100%', maxWidth: '300px', padding: '15px', marginBottom: '15px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
          🔨 Usta Girişi
        </button>
        <button onClick={() => selectRole('admin')} style={{ width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
          👑 Admin Girişi
        </button>
      </div>
    );
  }

  // 2. USTA KABİNETİ (SADƏ VƏ İŞÇİLƏR ÜÇÜN)
  if (role === 'worker') {
    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    const workerPayments = payments.filter(p => p.workerId === selectedWorkerId);
    const totalPaid = workerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalEarned = Number(selectedWorker?.totalEarned) || 0;
    const myRequests = extraJobs.filter(j => j.workerId === selectedWorkerId);

    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: '#f59e0b' }}>Usta Kabineti</h2>
          <button onClick={() => selectRole('select')} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Çıxış</button>
        </div>

        <form onSubmit={handleSendRequest} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
          <h3>İş Barədə Sorğu Göndər</h3>
          <select value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- Adınızı Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="Görülən işin məbləği (AZN)" value={reqAmount} onChange={e => setReqAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="İşin təsviri (Məs: Mətbəx mebeli)" value={reqDesc} onChange={e => setReqDesc(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📤 Sorğunu Göndər</button>
        </form>

        {selectedWorkerId && (
          <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
            <h4>Mənim Hesabım ({selectedWorker?.fullname})</h4>
            <p>Qazancım: <strong style={{ color: '#38bdf8' }}>{totalEarned} AZN</strong></p>
            <p>Aldığım ödəniş: <strong style={{ color: '#4ade80' }}>{totalPaid} AZN</strong></p>
            <p>Qalan alacaq: <strong style={{ color: '#f43f5e' }}>{totalEarned - totalPaid} AZN</strong></p>
            
            <h5>Göndərdiyim Sorğular:</h5>
            {myRequests.map(r => (
              <div key={r.id} style={{ backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>
                <div>{r.description} - <strong>{r.amount} AZN</strong></div>
                <small style={{ color: r.status === 'approved' ? '#4ade80' : r.status === 'rejected' ? '#f43f5e' : '#f59e0b' }}>
                  Status: {r.status === 'approved' ? 'Təsdiqləndi' : r.status === 'rejected' ? 'Rədd edildi' : 'Gözləyir'}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. ADMIN PANELİ (SİZİN ÜÇÜN)
  const pendingRequests = extraJobs.filter(j => j.status === 'pending');

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, color: '#38bdf8' }}>👑 Admin Paneli</h2>
        <button onClick={() => selectRole('select')} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Çıxış</button>
      </div>

      {/* GƏLƏN SORĞULAR */}
      <div style={{ marginTop: '20px' }}>
        <h3>📥 Gələn Sorğular ({pendingRequests.length})</h3>
        {pendingRequests.map(req => (
          <div key={req.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{req.workerName}</strong>
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{req.amount} AZN</span>
            </div>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>{req.description}</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => handleApprove(req)} style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px' }}>Təsdiqlə</button>
              <button onClick={() => handleReject(req.id)} style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px' }}>Rədd et</button>
            </div>
          </div>
        ))}
      </div>

      {/* İŞÇİLƏRİN HESABI */}
      <div style={{ marginTop: '25px' }}>
        <h3>İşçilərin Balansı</h3>
        {workers.map(w => {
          const wPayments = payments.filter(p => p.workerId === w.id);
          const paid = wPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const earned = Number(w.totalEarned) || 0;
          return (
            <div key={w.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{w.fullname || w.name}</strong>
                <span>Qalan: <strong style={{ color: '#f43f5e' }}>{earned - paid} AZN</strong></span>
              </div>
              <small style={{ color: '#94a3b8' }}>Qazanc: {earned} AZN | Ödənilib: {paid} AZN</small>
            </div>
          );
        })}
      </div>

      {/* ÖDƏNİŞ ET VƏ İŞÇİ ƏLAVƏ ET */}
      <div style={{ marginTop: '25px', display: 'grid', gap: '15px' }}>
        <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px' }}>
          <h4>Ödəniş Et</h4>
          <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
            <option value="">-- İşçi Seçin --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name}</option>)}
          </select>
          <input type="number" placeholder="Məbləğ (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
          <button style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px' }}>Ödənişi Qeyd Et</button>
        </form>

        <form onSubmit={handleAddWorker} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px' }}>
          <h4>Yeni İşçi Əlavə Et</h4>
          <input type="text" placeholder="Ad Soyad" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Telefon" value={newWorkerPhone} onChange={e => setNewWorkerPhone(e.target.value)} style={inputStyle} />
          <button style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>İşçini Əlavə Et</button>
        </form>
      </div>
    </div>
  );
}
