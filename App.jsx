import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function App() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'select');
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);

  // Admin Giriş State-i
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const ADMIN_PIN = "9999"; 

  // Usta Giriş / Qeydiyyat State-ləri
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [activeWorker, setActiveWorker] = useState(null); 

  // Admin Modal (Tarixçə pəncərəsi)
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState(null);

  // Usta Form State-ləri
  const [reqAmount, setReqAmount] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  
  // Admin Form State-ləri (Ödəniş və İş Tapşırığı)
  const [paymentWorkerId, setPaymentWorkerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignAmount, setAssignAmount] = useState('');
  const [assignTitle, setAssignTitle] = useState('');

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
    if (r === 'select') {
      setActiveWorker(null);
      setIsAdminLoggedIn(false);
      setAdminPinInput('');
      setLoginPhone('');
      setLoginPin('');
    }
  };

  // ADMIN GİRİŞİ
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPinInput === ADMIN_PIN) {
      setIsAdminLoggedIn(true);
      setAdminPinInput('');
    } else {
      alert("Yanlış Admin Şifrəsi!");
    }
  };

  // USTA QEYDİYYATI
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone || !regPin) return alert("Bütün xanaları doldurun!");
    
    const exist = workers.find(w => w.phone === regPhone.trim());
    if (exist) {
      return alert("Bu telefon nömrəsi ilə artıq usta qeydiyyatdan keçib!");
    }

    try {
      const docRef = await addDoc(collection(db, "users"), {
        fullname: regName,
        phone: regPhone.trim(),
        pin: regPin.trim(),
        totalEarned: 0
      });
      alert("Qeydiyyat uğurla tamamlandı!");
      setActiveWorker({ id: docRef.id, fullname: regName, phone: regPhone.trim(), pin: regPin.trim(), totalEarned: 0 });
      setRegName(''); setRegPhone(''); setRegPin('');
      setIsRegistering(false);
    } catch (err) {
      alert("Qeydiyyat zamanı xəta baş verdi.");
    }
  };

  // USTA GİRİŞİ
  const handleWorkerLogin = (e) => {
    e.preventDefault();
    if (!loginPhone || !loginPin) return alert("Telefon nömrənizi və şifrənizi daxil edin!");
    
    const targetWorker = workers.find(w => w.phone === loginPhone.trim() && w.pin === loginPin.trim());
    
    if (targetWorker) {
      setActiveWorker(targetWorker);
      setLoginPhone('');
      setLoginPin('');
    } else {
      alert("Telefon nömrəsi və ya şifrə yanlışdır!");
    }
  };

  // USTA: Sorğu Göndərmək
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!reqAmount || !reqDesc || !activeWorker) return alert("Zəhmət olmasa bütün xanaları doldurun!");
    try {
      await addDoc(collection(db, "extraJobs"), {
        workerId: activeWorker.id,
        workerName: activeWorker.fullname || activeWorker.name || 'Usta',
        amount: Number(reqAmount),
        description: reqDesc,
        status: "pending",
        assignedByAdmin: false,
        date: new Date().toLocaleDateString('az-AZ')
      });
      setReqAmount('');
      setReqDesc('');
      alert("Sorğunuz göndərildi! Admin təsdiqlədikdən sonra balansınıza əlavə olunacaq.");
    } catch (err) {
      alert("Xəta baş verdi.");
    }
  };

  // ADMIN: USTAYA İŞ TAPŞIRMAQ VƏ QİYMƏT TƏYİN ETMƏK
  const handleAssignJob = async (e) => {
    e.preventDefault();
    if (!assignWorkerId || !assignAmount || !assignTitle) return alert("Bütün xanaları doldurun!");
    
    try {
      const targetWorker = workers.find(w => w.id === assignWorkerId);
      const currentEarned = Number(targetWorker?.totalEarned) || 0;
      
      // 1. Ustanın balansı artırılır
      await updateDoc(doc(db, "users", assignWorkerId), {
        totalEarned: currentEarned + Number(assignAmount)
      });

      // 2. İşlərin siyahısına Admin tərəfindən tapşırılmış təsdiqli iş kimi əlavə olunur
      await addDoc(collection(db, "extraJobs"), {
        workerId: assignWorkerId,
        workerName: targetWorker.fullname || targetWorker.name || 'Usta',
        amount: Number(assignAmount),
        description: assignTitle,
        status: "approved",
        assignedByAdmin: true,
        date: new Date().toLocaleDateString('az-AZ')
      });

      setAssignWorkerId('');
      setAssignAmount('');
      setAssignTitle('');
      alert("İş tapşırıldı və qiymət ustanın hesabına əlavə olundu!");
    } catch (err) {
      alert("Xəta baş verdi!");
    }
  };

  // ADMIN: Sorğunu Təsdiqləmək
  const handleApprove = async (req) => {
    try {
      const worker = workers.find(w => w.id === req.workerId);
      const currentEarned = Number(worker?.totalEarned) || 0;
      await updateDoc(doc(db, "users", req.workerId), { totalEarned: currentEarned + Number(req.amount) });
      await updateDoc(doc(db, "extraJobs", req.id), { status: "approved" });
      alert("Sorğu təsdiqləndi və məbləğ ustanın qazancına əlavə olundu!");
    } catch (err) { alert("Xəta baş verdi!"); }
  };

  // ADMIN: Sorğunu Rədd Etmək
  const handleReject = async (id) => {
    await updateDoc(doc(db, "extraJobs", id), { status: "rejected" });
  };

  // ADMIN: Ödəniş Etmək
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentWorkerId || !paymentAmount) return alert("İşçini və məbləği daxil edin!");
    await addDoc(collection(db, "payments"), {
      workerId: paymentWorkerId,
      amount: Number(paymentAmount),
      note: paymentNote,
      date: new Date().toLocaleDateString('az-AZ')
    });
    setPaymentAmount('');
    setPaymentNote('');
    alert("Ödəniş qeydə alındı!");
  };

  // ADMIN: İşçi Silmək
  const handleDeleteWorker = async (workerId, name) => {
    if (window.confirm(`${name} usta siyahıdan silinsin?`)) {
      await deleteDoc(doc(db, "users", workerId));
    }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' };

  // 1. SEÇİM EKRANI
  if (role === 'select') {
    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#38bdf8', marginBottom: '5px' }}>NeVeRa Mebel</h1>
        <p style={{ color: '#94a3b8', marginBottom: '25px' }}>Sistemə daxil olmaq üçün rejim seçin:</p>
        <button onClick={() => selectRole('worker')} style={{ width: '100%', maxWidth: '320px', padding: '16px', marginBottom: '15px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          🔨 Usta Girişi / Qeydiyyatı
        </button>
        <button onClick={() => selectRole('admin')} style={{ width: '100%', maxWidth: '320px', padding: '16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          👑 Admin Girişi
        </button>
      </div>
    );
  }

  // 2. USTA EKRANI
  if (role === 'worker') {

    if (!activeWorker) {
      return (
        <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#f59e0b', fontSize: '20px' }}>
                {isRegistering ? '📝 Usta Qeydiyyatı' : '🔐 Usta Girişi'}
              </h2>
              <button type="button" onClick={() => selectRole('select')} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Geri</button>
            </div>

            {isRegistering ? (
              <form onSubmit={handleRegister}>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Adınız Və Soyadınız:</label>
                <input type="text" placeholder="Məs: Əli Məmmədov" value={regName} onChange={e => setRegName(e.target.value)} style={inputStyle} required />

                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telefon Nömrəniz:</label>
                <input type="tel" placeholder="Məs: 0501234567" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={inputStyle} required />

                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Özünüzə Şifrə Təyin Edin (PIN):</label>
                <input type="password" placeholder="Məs: 1234" value={regPin} onChange={e => setRegPin(e.target.value)} style={inputStyle} required />

                <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                  Qeydiyyatı Tamamla
                </button>

                <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '15px' }}>
                  Artıq hesabınız var? <span onClick={() => setIsRegistering(false)} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>Giriş edin</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleWorkerLogin}>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telefon Nömrəniz:</label>
                <input type="tel" placeholder="Məs: 0501234567" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} style={inputStyle} required />

                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Şifrəniz (PIN):</label>
                <input type="password" placeholder="Şifrənizi daxil edin" value={loginPin} onChange={e => setLoginPin(e.target.value)} style={inputStyle} required />

                <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                  Hesaba Daxil Ol
                </button>

                <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '15px' }}>
                  Hesabınız yoxdur? <span onClick={() => setIsRegistering(true)} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>Qeydiyyatdan keçin</span>
                </p>
              </form>
            )}
          </div>
        </div>
      );
    }

    const workerPayments = payments.filter(p => p.workerId === activeWorker.id);
    const totalPaid = workerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const currentWorkerData = workers.find(w => w.id === activeWorker.id) || activeWorker;
    const totalEarned = Number(currentWorkerData?.totalEarned) || 0;
    const remaining = totalEarned - totalPaid;
    const myJobsAndRequests = extraJobs.filter(j => j.workerId === activeWorker.id);

    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f59e0b', fontSize: '18px' }}>🔨 {currentWorkerData.fullname || currentWorkerData.name}</h2>
            <small style={{ color: '#94a3b8' }}>Tel: {currentWorkerData.phone}</small>
          </div>
          <button onClick={() => setActiveWorker(null)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Çıxış Et</button>
        </div>

        <form onSubmit={handleSendRequest} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
          <h3>📝 Görülən İş Barədə Sorğu Göndər</h3>
          <input type="number" placeholder="Görülən işin məbləği (AZN)" value={reqAmount} onChange={e => setReqAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="İşin təsviri (Məs: Mətbəx mebeli yığıldı)" value={reqDesc} onChange={e => setReqDesc(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            📤 Sorğunu Adminə Göndər
          </button>
        </form>

        <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0 }}>📊 Şəxsi Hesabım</h3>
          
          <div style={{ display: 'grid', gap: '8px', borderBottom: '1px dashed #334155', paddingBottom: '12px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Qazanılan ümumi məbləğ:</span>
              <strong style={{ color: '#38bdf8' }}>{totalEarned} AZN</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Sizə ödənilən:</span>
              <strong style={{ color: '#4ade80' }}>{totalPaid} AZN</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <span>Qalan Alacağınız:</span>
              <strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80' }}>{remaining} AZN</strong>
            </div>
          </div>

          <h4>💳 Sizə edilən Ödəniş Tarixçəsi</h4>
          <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
            {workerPayments.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b' }}>Hələ ödəniş edilməyib.</p> : (
              workerPayments.map(p => (
                <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{p.amount} AZN</span>
                  <small style={{ color: '#94a3b8' }}>{p.date} {p.note ? `(${p.note})` : ''}</small>
                </div>
              ))
            )}
          </div>

          <h4>📋 Mənə Tapşırılan İşlər və Sorğular</h4>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {myJobsAndRequests.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b' }}>Hələ tapşırılan iş və ya sorğu yoxdur.</p> : (
              myJobsAndRequests.map(r => (
                <div key={r.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', marginBottom: '8px', borderLeft: r.assignedByAdmin ? '3px solid #38bdf8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{r.description}</strong>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{r.amount} AZN</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Tarix: {r.date || 'Yoxdur'}</span>
                    <strong style={{ color: r.assignedByAdmin ? '#38bdf8' : r.status === 'approved' ? '#4ade80' : r.status === 'rejected' ? '#f43f5e' : '#f59e0b' }}>
                      {r.assignedByAdmin ? '👑 Admin Tapşırığı' : r.status === 'approved' ? '✓ Təsdiqləndi' : r.status === 'rejected' ? '✕ Rədd edildi' : '⏳ Gözləyir'}
                    </strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. ADMIN EKRANI
  if (role === 'admin') {

    if (!isAdminLoggedIn) {
      return (
        <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleAdminLogin} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '360px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '20px' }}>👑 Admin Girişi</h2>
              <button type="button" onClick={() => selectRole('select')} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Geri</button>
            </div>

            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Admin Şifrəsini Girin:</label>
            <input 
              type="password" 
              placeholder="Şifrə" 
              value={adminPinInput} 
              onChange={e => setAdminPinInput(e.target.value)} 
              style={inputStyle} 
              required 
            />

            <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              Panələ Daxil Ol
            </button>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>* İlkin admin şifrəsi: 9999</p>
          </form>
        </div>
      );
    }

    const pendingRequests = extraJobs.filter(j => j.status === 'pending');

    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>👑 Admin Paneli</h2>
          <button onClick={() => selectRole('select')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Çıxış</button>
        </div>

        {/* ADMIN: USTAYA İŞ VƏ MƏBLƏĞ TƏYİN ETMƏK */}
        <div style={{ marginTop: '20px' }}>
          <form onSubmit={handleAssignJob} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #0284c7' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '16px' }}>➕ Ustaya İş Tapşır (İş və Qiymət Təyin Et)</h3>
            <select value={assignWorkerId} onChange={e => setAssignWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- Ustanı Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>
            <input type="text" placeholder="İşin Adı / Təsviri (Məs: Mətbəx mebeli yığılması)" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="Təyin olunan Qiymət (AZN)" value={assignAmount} onChange={e => setAssignAmount(e.target.value)} style={inputStyle} required />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              📌 İşi Tapşır Və Balansa Əlavə Et
            </button>
          </form>
        </div>

        {/* GƏLƏN SORĞULAR */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#f59e0b' }}>📥 Ustaların Göndərdiyi Sorğular ({pendingRequests.length})</h3>
          {pendingRequests.length === 0 ? <p style={{ color: '#64748b', fontSize: '14px' }}>Gözləyən yeni sorğu yoxdur.</p> : (
            pendingRequests.map(req => (
              <div key={req.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#38bdf8' }}>{req.workerName}</strong>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{req.amount} AZN</span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>{req.description}</p>
                <small style={{ color: '#64748b' }}>Tarix: {req.date}</small>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => handleApprove(req)} style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Təsdiqlə</button>
                  <button onClick={() => handleReject(req.id)} style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Rədd et</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* İŞÇİLƏRİN HESABI VƏ TARİXÇƏYƏ BAXIŞ */}
        <div style={{ marginTop: '25px' }}>
          <h3>👷 Ustalar və Balanslar</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>💡 Ustanın ödəniş və iş tarixçəsini görmək üçün adının üstünə klikləyin:</p>
          
          {workers.map(w => {
            const wPayments = payments.filter(p => p.workerId === w.id);
            const paid = wPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const earned = Number(w.totalEarned) || 0;
            const remaining = earned - paid;

            return (
              <div 
                key={w.id} 
                onClick={() => setSelectedWorkerForHistory(w)}
                style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', border: '1px solid #334155' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{w.fullname || w.name}</strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tel: {w.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
                  <span>Qazanc: <strong style={{ color: '#38bdf8' }}>{earned} AZN</strong></span>
                  <span>Ödənilib: <strong style={{ color: '#4ade80' }}>{paid} AZN</strong></span>
                  <span>Qalan: <strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80' }}>{remaining} AZN</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ÖDƏNİŞ ET FORMU */}
        <div style={{ marginTop: '25px' }}>
          <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>💳 Ustaya Ödəniş Et (Verilən Maaş / Avans)</h3>
            <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- İşçini Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>
            <input type="number" placeholder="Ödənilən Məbləğ (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
            <input type="text" placeholder="Qeyd (Örn: Avans, Maaş)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Ödənişi Qeyd Et</button>
          </form>
        </div>

        {/* ADMIN ÜÇÜN TARİXÇƏ MODAL PƏNCƏRƏSİ */}
        {selectedWorkerForHistory && (
          <div onClick={() => setSelectedWorkerForHistory(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '450px', borderRadius: '12px', padding: '20px', border: '1px solid #334155', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#38bdf8' }}>{selectedWorkerForHistory.fullname || selectedWorkerForHistory.name}</h3>
                  <small style={{ color: '#94a3b8' }}>Tel: {selectedWorkerForHistory.phone}</small>
                </div>
                <button onClick={() => setSelectedWorkerForHistory(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b' }}>Ödəniş Tarixçəsi və Hesabat:</p>
              
              <div style={{ display: 'grid', gap: '8px' }}>
                {payments.filter(p => p.workerId === selectedWorkerForHistory.id).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '10px 0' }}>Hələ ki bu ustaya ödəniş edilməyib.</p>
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

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={() => { handleDeleteWorker(selectedWorkerForHistory.id, selectedWorkerForHistory.fullname); setSelectedWorkerForHistory(null); }} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ustanı Sil</button>
                <button onClick={() => setSelectedWorkerForHistory(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Bağla</button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }
}
