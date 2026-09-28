import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function App() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'select');
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Admin Giriş State-ləri
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
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');

  // Usta Və Admin Form State-ləri
  const [reqAmount, setReqAmount] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  
  const [paymentWorkerId, setPaymentWorkerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignAmount, setAssignAmount] = useState('');
  const [assignTitle, setAssignTitle] = useState('');

  // Təchizatçı Form State-ləri
  const [supName, setSupName] = useState('');
  const [supAmount, setSupAmount] = useState('');
  const [supPaid, setSupPaid] = useState('');
  const [supNote, setSupNote] = useState('');

  // Rapor / Hesabat Filtr State-ləri
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportMonth, setReportMonth] = useState('ALL');

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
    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubWorkers(); unsubPayments(); unsubExtra(); unsubSuppliers(); };
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
    if (exist) return alert("Bu telefon nömrəsi ilə artıq usta qeydiyyatdan keçib!");

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
    } catch (err) { alert("Qeydiyyat zamanı xəta baş verdi."); }
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
      const today = new Date();
      await addDoc(collection(db, "extraJobs"), {
        workerId: activeWorker.id,
        workerName: activeWorker.fullname || activeWorker.name || 'Usta',
        amount: Number(reqAmount),
        description: reqDesc,
        status: "pending",
        assignedByAdmin: false,
        date: today.toLocaleDateString('az-AZ'),
        isoDate: today.toISOString()
      });
      setReqAmount('');
      setReqDesc('');
      alert("Sorğunuz göndərildi! Admin təsdiqlədikdən sonra balansınıza əlavə olunacaq.");
    } catch (err) { alert("Xəta baş verdi."); }
  };

  // ADMIN: USTAYA İŞ TAPŞIRMAQ VƏ QİYMƏT TƏYİN ETMƏK
  const handleAssignJob = async (e) => {
    e.preventDefault();
    if (!assignWorkerId || !assignAmount || !assignTitle) return alert("Bütün xanaları doldurun!");
    
    try {
      const targetWorker = workers.find(w => w.id === assignWorkerId);
      const currentEarned = Number(targetWorker?.totalEarned) || 0;
      const today = new Date();

      await updateDoc(doc(db, "users", assignWorkerId), {
        totalEarned: currentEarned + Number(assignAmount)
      });

      await addDoc(collection(db, "extraJobs"), {
        workerId: assignWorkerId,
        workerName: targetWorker.fullname || targetWorker.name || 'Usta',
        amount: Number(assignAmount),
        description: assignTitle,
        status: "approved",
        assignedByAdmin: true,
        date: today.toLocaleDateString('az-AZ'),
        isoDate: today.toISOString()
      });

      setAssignWorkerId(''); setAssignAmount(''); setAssignTitle('');
      alert("İş tapşırıldı və qiymət ustanın hesabına əlavə olundu!");
    } catch (err) { alert("Xəta baş verdi!"); }
  };

  // ADMIN: Sorğunu Təsdiqləmək
  const handleApprove = async (req) => {
    try {
      const worker = workers.find(w => w.id === req.workerId);
      const currentEarned = Number(worker?.totalEarned) || 0;
      await updateDoc(doc(db, "users", req.workerId), { totalEarned: currentEarned + Number(req.amount) });
      await updateDoc(doc(db, "extraJobs", req.id), { status: "approved" });
      alert("Sorğu təsdiqləndi və məbləğ ustanın qazancına əlavə olunub!");
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
    const today = new Date();
    await addDoc(collection(db, "payments"), {
      workerId: paymentWorkerId,
      amount: Number(paymentAmount),
      note: paymentNote,
      date: today.toLocaleDateString('az-AZ'),
      isoDate: today.toISOString()
    });
    setPaymentAmount(''); setPaymentNote('');
    alert("Ödəniş qeydə alındı!");
  };

  // ADMIN: Təchizatçı Qeydi
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supName || !supAmount) return alert("Ad və Ümumi Alış məbləğini daxil edin!");
    const today = new Date();
    await addDoc(collection(db, "suppliers"), {
      name: supName,
      totalAmount: Number(supAmount),
      paidAmount: Number(supPaid || 0),
      note: supNote,
      date: today.toLocaleDateString('az-AZ'),
      isoDate: today.toISOString()
    });
    setSupName(''); setSupAmount(''); setSupPaid(''); setSupNote('');
    alert("Təchizatçı borcu/alışı qeydə alındı!");
  };

  // 6. ƏN ƏSAS: Ustanı Silməkdə Admin Parolu Tələbi
  const handleDeleteWorker = async (workerId, name) => {
    const enteredPin = prompt(`⚠️ DIQQƏT: "${name}" usta və onun BÜTÜN hesabatı silinəcək!\n\nTəsdiqləmək üçün Admin PIN şifrəsini girin:`);
    if (enteredPin === null) return; // İptal edildi
    if (enteredPin === ADMIN_PIN) {
      await deleteDoc(doc(db, "users", workerId));
      alert(`${name} uğurla silindi.`);
      setSelectedWorkerForHistory(null);
    } else {
      alert("❌ Yanlış Admin şifrəsi! Silmə əməliyyatı ləğv edildi.");
    }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' };

  // XÜLASƏ / HESABAT HESABLAMALARI
  const totalEarnedAllWorkers = workers.reduce((s, w) => s + (Number(w.totalEarned) || 0), 0);
  const totalPaidAllWorkers = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalWorkerRemaining = totalEarnedAllWorkers - totalPaidAllWorkers;

  const totalSupplierAmount = suppliers.reduce((s, sup) => s + (Number(sup.totalAmount) || 0), 0);
  const totalSupplierPaid = suppliers.reduce((s, sup) => s + (Number(sup.paidAmount) || 0), 0);
  const totalSupplierRemaining = totalSupplierAmount - totalSupplierPaid;

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
            <input type="password" placeholder="Şifrə" value={adminPinInput} onChange={e => setAdminPinInput(e.target.value)} style={inputStyle} required />
            <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Panələ Daxil Ol</button>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>* İlkin admin şifrəsi: 9999</p>
          </form>
        </div>
      );
    }

    const pendingRequests = extraJobs.filter(j => j.status === 'pending');

    // FILTRLI RAPOR HESABLAMASI
    const filteredJobs = extraJobs.filter(j => {
      if (!j.date) return true;
      const parts = j.date.split('.'); // dd.mm.yyyy
      if (parts.length < 3) return true;
      const month = parts[1];
      const year = parts[2];
      const matchYear = reportYear === 'ALL' || year === reportYear;
      const matchMonth = reportMonth === 'ALL' || month === reportMonth;
      return matchYear && matchMonth;
    });

    const filteredPayments = payments.filter(p => {
      if (!p.date) return true;
      const parts = p.date.split('.');
      if (parts.length < 3) return true;
      const month = parts[1];
      const year = parts[2];
      const matchYear = reportYear === 'ALL' || year === reportYear;
      const matchMonth = reportMonth === 'ALL' || month === reportMonth;
      return matchYear && matchMonth;
    });

    const reportJobsTotal = filteredJobs.filter(j => j.status === 'approved' || j.assignedByAdmin).reduce((s, j) => s + (Number(j.amount) || 0), 0);
    const reportPaymentsTotal = filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>👑 Admin Paneli</h2>
          <button onClick={() => selectRole('select')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Çıxış</button>
        </div>

        {/* 2 & 4. USTA VƏ TƏCHİZATÇILARIN ÜMUMİ VERƏCƏKLƏRİ & QALIQLARI (ÜMUMİ HESABAT) */}
        <div style={{ marginTop: '15px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #38bdf8' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '16px' }}>🌐 Ümumi Maliyyə Hesabatı və Borclar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>🔨 Ustaların Toplam Qazancı:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{totalEarnedAllWorkers} AZN</div>
              <small style={{ color: '#64748b' }}>Ödənilib: {totalPaidAllWorkers} AZN</small>
              <div style={{ marginTop: '4px', color: totalWorkerRemaining > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>
                Qalan Borc: {totalWorkerRemaining} AZN
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>📦 Təchizatçılara Toplam Borc:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{totalSupplierAmount} AZN</div>
              <small style={{ color: '#64748b' }}>Ödənilib: {totalSupplierPaid} AZN</small>
              <div style={{ marginTop: '4px', color: totalSupplierRemaining > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>
                Qalan Borc: {totalSupplierRemaining} AZN
              </div>
            </div>
          </div>
        </div>

        {/* 3. İLLİK VƏ AYLIN FİLTRLİ RAPOR BÖLMƏSİ */}
        <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '16px' }}>📅 Dövrü Hesabat Raporu (Filtr)</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <select value={reportYear} onChange={e => setReportYear(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }}>
              <option value="ALL">Bütün İllər</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }}>
              <option value="ALL">Bütün Aylar</option>
              <option value="01">Yanvar (01)</option>
              <option value="02">Fevral (02)</option>
              <option value="03">Mart (03)</option>
              <option value="04">Aprel (04)</option>
              <option value="05">May (05)</option>
              <option value="06">İyun (06)</option>
              <option value="07">İyul (07)</option>
              <option value="08">Avqust (08)</option>
              <option value="09">Sentyabr (09)</option>
              <option value="10">Oktyabr (10)</option>
              <option value="11">Noyabr (11)</option>
              <option value="12">Dekabr (12)</option>
            </select>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-around', fontSize: '13px' }}>
            <div>Seçilən Dövrdə Görülən İşlər: <strong style={{ color: '#38bdf8' }}>{reportJobsTotal} AZN</strong></div>
            <div>Seçilən Dövrdə Verilən Ödəniş: <strong style={{ color: '#4ade80' }}>{reportPaymentsTotal} AZN</strong></div>
          </div>
        </div>

        {/* ADMIN: USTAYA İŞ VƏ MƏBLƏĞ TƏYİN ETMƏK (1. 100 İŞÇİ DƏSTƏYİ) */}
        <div style={{ marginTop: '20px' }}>
          <form onSubmit={handleAssignJob} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #0284c7' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '16px' }}>➕ Ustaya İş Tapşır (İş və Qiymət Təyin Et)</h3>
            <select value={assignWorkerId} onChange={e => setAssignWorkerId(e.target.value)} style={{ ...inputStyle, maxHeight: '150px' }} required>
              <option value="">-- Ustanı Seçin ({workers.length} Usta) --</option>
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

        {/* 1. İŞÇİLƏRİN HESABI VƏ TARİXÇƏSİ (100 İŞÇİ ÜÇÜN YUXARI-AŞAĞI SKROLL SİYAHI) */}
        <div style={{ marginTop: '25px' }}>
          <h3>👷 Ustalar və Balanslar ({workers.length})</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>💡 Ustanın aylıq hesabatını görmək üçün adının üstünə klikləyin:</p>
          
          <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '5px' }}>
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
        </div>

        {/* ÖDƏNİŞ ET FORMU */}
        <div style={{ marginTop: '25px' }}>
          <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>💳 Ustaya Ödəniş Et (Maaş / Avans)</h3>
            <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- İşçini Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>
            <input type="number" placeholder="Ödənilən Məbləğ (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
            <input type="text" placeholder="Qeyd (Örn: Avans, Maaş)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Ödənişi Qeyd Et</button>
          </form>
        </div>

        {/* 2. TƏCHİZATÇILAR / POSTAVŞİKLƏR BÖLMƏSİ */}
        <div style={{ marginTop: '25px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#f59e0b', fontSize: '16px' }}>📦 Təchizatçılar (Mal Alışı Və Ödənişlər)</h3>
          <form onSubmit={handleAddSupplier} style={{ marginBottom: '15px' }}>
            <input type="text" placeholder="Təchizatçının Adı / Mağaza" value={supName} onChange={e => setSupName(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="Alınan Malın Toplam Dəyəri (AZN)" value={supAmount} onChange={e => setSupAmount(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="İlkin Ödənilən Məbləğ (AZN)" value={supPaid} onChange={e => setSupPaid(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Qeyd (Məs: Laminat, Dəstəklər)" value={supNote} onChange={e => setSupNote(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Təchizatçı Borcunu Əlavə Et</button>
          </form>

          <h4>Siyahı:</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {suppliers.map(s => (
              <div key={s.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{s.name}</strong>
                  <span style={{ color: '#f59e0b' }}>{s.totalAmount} AZN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
                  <span style={{ color: '#4ade80' }}>Ödənilib: {s.paidAmount} AZN</span>
                  <span style={{ color: '#f43f5e' }}>Qalan Borc: {s.totalAmount - s.paidAmount} AZN</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 & 6. ADMIN ÜÇÜN AYLARA BÖLÜNMÜŞ HESABAT VƏ SİLMƏ PAROLİ MODALİ */}
        {selectedWorkerForHistory && (() => {
          const wPayments = payments.filter(p => p.workerId === selectedWorkerForHistory.id);
          const wJobs = extraJobs.filter(j => j.workerId === selectedWorkerForHistory.id);
          const paid = wPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const currentW = workers.find(w => w.id === selectedWorkerForHistory.id) || selectedWorkerForHistory;
          const earned = Number(currentW.totalEarned) || 0;
          const remaining = earned - paid;

          // AYLARA BÖLMƏ MƏNTİQİ (Oktyabr, Noyabr və s.)
          const filteredWJobs = wJobs.filter(j => {
            if (selectedMonthFilter === 'ALL') return true;
            if (!j.date) return true;
            const parts = j.date.split('.');
            return parts.length >= 2 && parts[1] === selectedMonthFilter;
          });

          return (
            <div onClick={() => setSelectedWorkerForHistory(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
              <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '480px', borderRadius: '12px', padding: '20px', border: '1px solid #334155', maxHeight: '85vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#38bdf8' }}>👷 {currentW.fullname || currentW.name}</h3>
                    <small style={{ color: '#94a3b8' }}>Tel: {currentW.phone}</small>
                  </div>
                  <button onClick={() => setSelectedWorkerForHistory(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div>Qazanc: <br/><strong style={{ color: '#38bdf8', fontSize: '15px' }}>{earned} AZN</strong></div>
                  <div>Ödənilib: <br/><strong style={{ color: '#4ade80', fontSize: '15px' }}>{paid} AZN</strong></div>
                  <div>Qalan Borc: <br/><strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80', fontSize: '15px' }}>{remaining} AZN</strong></div>
                </div>

                {/* AY SEÇİMİ (5-ci istək) */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>📆 Görülən işləri aya görə filtrlə:</label>
                  <select value={selectedMonthFilter} onChange={e => setSelectedMonthFilter(e.target.value)} style={inputStyle}>
                    <option value="ALL">Bütün Aylar (Arxiv)</option>
                    <option value="01">Yanvar</option>
                    <option value="02">Fevral</option>
                    <option value="03">Mart</option>
                    <option value="04">Aprel</option>
                    <option value="05">May</option>
                    <option value="06">İyun</option>
                    <option value="07">İyul</option>
                    <option value="08">Avqust</option>
                    <option value="09">Sentyabr</option>
                    <option value="10">Oktyabr</option>
                    <option value="11">Noyabr</option>
                    <option value="12">Dekabr</option>
                  </select>
                </div>

                {/* 1. İŞLƏR SİYAHISI (SKROLLİ) */}
                <h4 style={{ color: '#f59e0b', margin: '10px 0 8px 0', borderBottom: '1px dashed #334155', paddingBottom: '4px' }}>🛠️ Görülən Və Tapşırılan İşlər</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'grid', gap: '8px', marginBottom: '15px', paddingRight: '4px' }}>
                  {filteredWJobs.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '5px 0' }}>Seçilən ayda iş qeydə alınmayıb.</p>
                  ) : (
                    filteredWJobs.map((j) => (
                      <div key={j.id} style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '6px', borderLeft: j.assignedByAdmin ? '3px solid #38bdf8' : '3px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '14px' }}>{j.description}</strong>
                          <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{j.amount} AZN</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                          <span style={{ color: '#64748b' }}>Tarix: {j.date || 'Yoxdur'}</span>
                          <strong style={{ color: j.assignedByAdmin ? '#38bdf8' : j.status === 'approved' ? '#4ade80' : j.status === 'rejected' ? '#f43f5e' : '#f59e0b' }}>
                            {j.assignedByAdmin ? '👑 Admin Tapşırığı' : j.status === 'approved' ? '✓ Təsdiqlənib' : j.status === 'rejected' ? '✕ Rədd edilib' : '⏳ Gözləyir'}
                          </strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. ÖDƏNİŞ TARIXÇƏSİ */}
                <h4 style={{ color: '#4ade80', margin: '10px 0 8px 0', borderBottom: '1px dashed #334155', paddingBottom: '4px' }}>💳 Edilən Ödənişlər Tarixçəsi</h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '8px', paddingRight: '4px' }}>
                  {wPayments.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '5px 0' }}>Hələ bu ustaya ödəniş edilməyib.</p>
                  ) : (
                    wPayments.map((p) => (
                      <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#4ade80', fontSize: '14px' }}>+{p.amount} AZN</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Tarix: {p.date || 'Yoxdur'}</div>
                        </div>
                        {p.note && <span style={{ color: '#94a3b8', fontSize: '12px', backgroundColor: '#1e293b', padding: '3px 8px', borderRadius: '4px' }}>{p.note}</span>}
                      </div>
                    ))
                  )}
                </div>

                {/* 6-CI İSTƏK: ADMIN PAROLU İLƏ SİLMƏ DÜYMƏSİ */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleDeleteWorker(currentW.id, currentW.fullname)} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    🔒 Ustanı Sil (Admin Şifrəsi ilə)
                  </button>
                  <button onClick={() => setSelectedWorkerForHistory(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Bağla</button>
                </div>

              </div>
            </div>
          );
        })()}

      </div>
    );
  }
}
