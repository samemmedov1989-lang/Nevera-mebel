import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function App() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'select');
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cuttingServices, setCuttingServices] = useState([]);

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

  // Usta & Admin Ay/İl Filtri
  const [workerMonthFilter, setWorkerMonthFilter] = useState('ALL');
  const [workerYearFilter, setWorkerYearFilter] = useState('ALL');
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');

  // Form State-ləri
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

  // KƏSİM VƏ MATERIAL FORM STATE-LƏRİ
  const [cutWorkerId, setCutWorkerId] = useState('');
  const [cutMatType, setCutMatType] = useState('Laminat/DVP');
  const [cutMatColor, setCutMatColor] = useState('');
  const [cutMatCount, setCutMatCount] = useState('');
  const [cutMatPrice, setCutMatPrice] = useState('');
  const [cutPvcMeters, setCutPvcMeters] = useState('');
  const [cutPvcPrice, setCutPvcPrice] = useState('0.90');
  const [cutTransferFee, setCutTransferFee] = useState('');

  // USTANIN QAİMƏYƏ ÖDƏNİŞ ETMƏSİ MODALI
  const [selectedCuttingDoc, setSelectedCuttingDoc] = useState(null);
  const [payCuttingInput, setPayCuttingInput] = useState('');

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
    const unsubCutting = onSnapshot(collection(db, 'cuttingServices'), (snapshot) => {
      setCuttingServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubWorkers(); unsubPayments(); unsubExtra(); unsubSuppliers(); unsubCutting(); };
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
      setReqAmount(''); setReqDesc('');
      alert("Sorğunuz göndərildi!");
    } catch (err) { alert("Xəta baş verdi."); }
  };

  // ADMIN: USTAYA İŞ TAPŞIRMAQ
  const handleAssignJob = async (e) => {
    e.preventDefault();
    if (!assignWorkerId || !assignAmount || !assignTitle) return alert("Bütün xanaları doldurun!");
    try {
      const targetWorker = workers.find(w => w.id === assignWorkerId);
      const currentEarned = Number(targetWorker?.totalEarned) || 0;
      const today = new Date();

      await updateDoc(doc(db, "users", assignWorkerId), { totalEarned: currentEarned + Number(assignAmount) });
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

  // KƏSİM VƏ MATERIAL ƏLAVƏ ETMƏK (ADMIN)
  const handleAddCuttingService = async (e) => {
    e.preventDefault();
    if (!cutWorkerId) return alert("Ustanı seçin!");

    const matTotal = (Number(cutMatCount) || 0) * (Number(cutMatPrice) || 0);
    const pvcTotal = (Number(cutPvcMeters) || 0) * (Number(cutPvcPrice) || 0);
    const transTotal = Number(cutTransferFee) || 0;
    const grandTotal = matTotal + pvcTotal + transTotal;

    if (grandTotal <= 0) return alert("Ən azı bir məbləğ hesablanmalıdır!");

    const targetWorker = workers.find(w => w.id === cutWorkerId);
    const today = new Date();

    try {
      await addDoc(collection(db, "cuttingServices"), {
        workerId: cutWorkerId,
        workerName: targetWorker?.fullname || targetWorker?.name || 'Usta',
        materialType: cutMatType,
        color: cutMatColor,
        matCount: Number(cutMatCount) || 0,
        matPrice: Number(cutMatPrice) || 0,
        matTotal: matTotal,
        pvcMeters: Number(cutPvcMeters) || 0,
        pvcPrice: Number(cutPvcPrice) || 0,
        pvcTotal: pvcTotal,
        transferFee: transTotal,
        totalAmount: grandTotal,
        paidAmount: 0,
        paymentsHistory: [],
        date: today.toLocaleDateString('az-AZ'),
        isoDate: today.toISOString()
      });

      setCutWorkerId(''); setCutMatColor(''); setCutMatCount(''); setCutMatPrice('');
      setCutPvcMeters(''); setCutPvcPrice('0.90'); setCutTransferFee('');
      alert("Kəsim və material qaiməsi yaradıldı!");
    } catch (err) { alert("Xəta baş verdi!"); }
  };

  // USTANIN QAİMƏYƏ ÖDƏNİŞ ETMƏSİ
  const handlePayCuttingDoc = async (isFullPay = false) => {
    if (!selectedCuttingDoc) return;
    const currentPaid = Number(selectedCuttingDoc.paidAmount) || 0;
    const total = Number(selectedCuttingDoc.totalAmount) || 0;
    const currentRemaining = total - currentPaid;

    let amountToPay = 0;
    if (isFullPay) {
      amountToPay = currentRemaining;
    } else {
      amountToPay = Number(payCuttingInput);
      if (!amountToPay || amountToPay <= 0) return alert("Düzgün məbləğ daxil edin!");
      if (amountToPay > currentRemaining) return alert(`Məbləğ qalıq borcdan (${currentRemaining} AZN) çox ola bilməz!`);
    }

    try {
      const today = new Date();
      const newPaid = currentPaid + amountToPay;
      const history = selectedCuttingDoc.paymentsHistory || [];
      const updatedHistory = [
        ...history,
        { amount: amountToPay, date: today.toLocaleDateString('az-AZ'), isoDate: today.toISOString() }
      ];

      await updateDoc(doc(db, "cuttingServices", selectedCuttingDoc.id), {
        paidAmount: newPaid,
        paymentsHistory: updatedHistory
      });

      alert("Ödəniş uğurla qeydə alındı!");
      setSelectedCuttingDoc(null);
      setPayCuttingInput('');
    } catch (err) { alert("Xəta baş verdi!"); }
  };

  const handleApprove = async (req) => {
    try {
      const worker = workers.find(w => w.id === req.workerId);
      const currentEarned = Number(worker?.totalEarned) || 0;
      await updateDoc(doc(db, "users", req.workerId), { totalEarned: currentEarned + Number(req.amount) });
      await updateDoc(doc(db, "extraJobs", req.id), { status: "approved" });
      alert("Sorğu təsdiqləndi!");
    } catch (err) { alert("Xəta baş verdi!"); }
  };

  const handleReject = async (id) => {
    await updateDoc(doc(db, "extraJobs", id), { status: "rejected" });
  };

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
    alert("Təchizatçı qeydə alındı!");
  };

  const handleDeleteWorker = async (workerId, name) => {
    const enteredPin = prompt(`⚠️ DIQQƏT: "${name}" usta və onun BÜTÜN hesabatı silinəcək!\n\nTəsdiqləmək üçün Admin PIN şifrəsini girin:`);
    if (enteredPin === null) return; 
    if (enteredPin === ADMIN_PIN) {
      await deleteDoc(doc(db, "users", workerId));
      alert(`${name} uğurla silindi.`);
      setSelectedWorkerForHistory(null);
    } else {
      alert("❌ Yanlış Admin şifrəsi!");
    }
  };

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' };

  // XÜLASƏ HESABLAMALARI
  const totalEarnedAllWorkers = workers.reduce((s, w) => s + (Number(w.totalEarned) || 0), 0);
  const totalPaidAllWorkers = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalWorkerRemaining = totalEarnedAllWorkers - totalPaidAllWorkers;

  const totalSupplierAmount = suppliers.reduce((s, sup) => s + (Number(sup.totalAmount) || 0), 0);
  const totalSupplierPaid = suppliers.reduce((s, sup) => s + (Number(sup.paidAmount) || 0), 0);
  const totalSupplierRemaining = totalSupplierAmount - totalSupplierPaid;

  const totalCuttingAllTime = cuttingServices.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
  const totalCuttingPaidAllTime = cuttingServices.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
  const totalCuttingRemainingAllTime = totalCuttingAllTime - totalCuttingPaidAllTime;

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
                <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Qeydiyyatı Tamamla</button>
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
                <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Hesaba Daxil Ol</button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '15px' }}>
                  Hesabınız yoxdur? <span onClick={() => setIsRegistering(true)} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>Qeydiyyatdan keçin</span>
                </p>
              </form>
            )}
          </div>
        </div>
      );
    }

    const currentWorkerData = workers.find(w => w.id === activeWorker.id) || activeWorker;
    const allWorkerPayments = payments.filter(p => p.workerId === activeWorker.id || p.userId === activeWorker.id);
    const allWorkerJobsAndRequests = extraJobs.filter(j => j.workerId === activeWorker.id);
    const allWorkerCutting = cuttingServices.filter(c => c.workerId === activeWorker.id);

    const dateMatches = (dStr) => {
      if (!dStr) return true;
      if (workerMonthFilter === 'ALL' && workerYearFilter === 'ALL') return true;
      
      const parts = dStr.split('.');
      if (parts.length < 3) return true;
      const m = parts[1];
      const y = parts[2];
      const mOk = workerMonthFilter === 'ALL' || m === workerMonthFilter;
      const yOk = workerYearFilter === 'ALL' || y === workerYearFilter;
      return mOk && yOk;
    };

    const filteredWorkerJobs = allWorkerJobsAndRequests.filter(j => dateMatches(j.date));
    const filteredWorkerPayments = allWorkerPayments.filter(p => dateMatches(p.date));
    const filteredWorkerCutting = allWorkerCutting.filter(c => dateMatches(c.date));

    const totalEarnedAllTime = Number(currentWorkerData?.totalEarned) || 0;
    const totalPaidAllTime = allWorkerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const remainingAllTime = totalEarnedAllTime - totalPaidAllTime;

    const totalCuttingFiltered = filteredWorkerCutting.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
    const totalCuttingPaidFiltered = filteredWorkerCutting.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
    const totalCuttingRemainingFiltered = totalCuttingFiltered - totalCuttingPaidFiltered;

    return (
      <div style={{ backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f59e0b', fontSize: '18px' }}>🔨 {currentWorkerData.fullname || currentWorkerData.name}</h2>
            <small style={{ color: '#94a3b8' }}>Tel: {currentWorkerData.phone}</small>
          </div>
          <button onClick={() => setActiveWorker(null)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Çıxış Et</button>
        </div>

        {/* AY VƏ İL FİLTRİ */}
        <div style={{ marginTop: '15px', backgroundColor: '#1e293b', padding: '12px', borderRadius: '10px', border: '1px solid #38bdf8' }}>
          <label style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>📅 Aylıq Və İllik Hesabat Filtri:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select value={workerMonthFilter} onChange={e => setWorkerMonthFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
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
            <select value={workerYearFilter} onChange={e => setWorkerYearFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option value="ALL">Bütün İllər</option>
              <option value="2026">2026 İli</option>
              <option value="2025">2025 İli</option>
              <option value="2027">2027 İli</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSendRequest} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📝 Görülən İş Barədə Sorğu Göndər</h3>
          <input type="number" placeholder="Görülən işin məbləği (AZN)" value={reqAmount} onChange={e => setReqAmount(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="İşin təsviri (Məs: Mətbəx mebeli yığıldı)" value={reqDesc} onChange={e => setReqDesc(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📤 Sorğunu Adminə Göndər</button>
        </form>

        {/* XÜSUSİ KƏSİM VƏ MATERIAL XİDMƏTLƏRİ */}
        <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#c084fc', margin: 0 }}>🪚 Sexdə Kəsim Və Material Qaimələrim</h3>
            <span style={{ fontSize: '12px', color: '#e9d5ff', fontWeight: 'bold', backgroundColor: '#581c87', padding: '4px 8px', borderRadius: '6px' }}>
              Qalıq Borc: {totalCuttingRemainingFiltered} AZN
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 12px 0' }}>* Cəm: {totalCuttingFiltered} AZN | Ödənilib: {totalCuttingPaidFiltered} AZN</p>

          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredWorkerCutting.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b' }}>Kəsim xidməti qeydi yoxdur.</p> : (
              filteredWorkerCutting.map(c => {
                const total = Number(c.totalAmount) || 0;
                const paid = Number(c.paidAmount) || 0;
                const rem = total - paid;

                return (
                  <div key={c.id} style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #c084fc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#e9d5ff' }}>
                      <span>{c.materialType} {c.color ? `(${c.color})` : ''}</span>
                      <span style={{ color: '#a855f7' }}>Cəm: {total} AZN</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {c.matCount > 0 && <div>• Material: {c.matCount} ədəd x {c.matPrice} AZN = {c.matTotal} AZN</div>}
                      {c.pvcMeters > 0 && <div>• PVC: {c.pvcMeters} metr x {c.pvcPrice} AZN = {c.pvcTotal} AZN</div>}
                      {c.transferFee > 0 && <div>• Transfer/Daşınma: {c.transferFee} AZN</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', padding: '6px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                      <span style={{ color: '#4ade80' }}>Ödənilib: {paid} AZN</span>
                      <span style={{ color: rem > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold' }}>Qalıq Borc: {rem} AZN</span>
                    </div>

                    {rem > 0 ? (
                      <button onClick={() => setSelectedCuttingDoc(c)} style={{ width: '100%', marginTop: '8px', padding: '8px', backgroundColor: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                        💳 Ödəniş Et (Hissəli / Tam)
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '12px', color: '#4ade80', fontWeight: 'bold' }}>✓ Tam Ödənilib (Sıfırlandı)</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* NORMAL MAAŞ / İŞ HESABATI VƏ ÖDƏNİŞLƏR */}
        <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0 }}>📊 Normal Mebel İşləri Və Maaş Hesabım</h3>
          <div style={{ display: 'grid', gap: '8px', borderBottom: '1px dashed #334155', paddingBottom: '12px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Ümumi Qazanılan:</span>
              <strong style={{ color: '#38bdf8' }}>{totalEarnedAllTime} AZN</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Ödənilən Maaş:</span>
              <strong style={{ color: '#4ade80' }}>{totalPaidAllTime} AZN</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <span>Qalan Alacaq:</span>
              <strong style={{ color: remainingAllTime > 0 ? '#f43f5e' : '#4ade80' }}>{remainingAllTime} AZN</strong>
            </div>
          </div>

          <h4>💳 Bütün Ödəniş Tarixçəsi ({filteredWorkerPayments.length})</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px' }}>
            {filteredWorkerPayments.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b' }}>Ödəniş qeydə alınmayıb.</p> : (
              filteredWorkerPayments.map(p => (
                <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '15px' }}>+{p.amount} AZN</span>
                    {p.note && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Qeyd: {p.note}</div>}
                  </div>
                  <small style={{ color: '#64748b' }}>{p.date}</small>
                </div>
              ))
            )}
          </div>

          <h4>📋 Görülən İşlər Və Sorğular</h4>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filteredWorkerJobs.map(r => (
              <div key={r.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{r.description}</strong>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{r.amount} AZN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Tarix: {r.date}</span>
                  <strong style={{ color: r.assignedByAdmin ? '#38bdf8' : r.status === 'approved' ? '#4ade80' : '#f59e0b' }}>
                    {r.assignedByAdmin ? '👑 Admin Tapşırığı' : r.status === 'approved' ? '✓ Təsdiqləndi' : '⏳ Gözləyir'}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QAİMƏ ÖDƏNİŞ MODALI */}
        {selectedCuttingDoc && (() => {
          const total = Number(selectedCuttingDoc.totalAmount) || 0;
          const paid = Number(selectedCuttingDoc.paidAmount) || 0;
          const rem = total - paid;

          return (
            <div onClick={() => setSelectedCuttingDoc(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
              <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '380px', borderRadius: '12px', padding: '20px', border: '1px solid #c084fc' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#c084fc', fontSize: '18px' }}>💳 Qaimə üzrə Ödəniş</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
                  Sifariş: <strong>{selectedCuttingDoc.materialType} {selectedCuttingDoc.color}</strong>
                </p>
                <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
                  <div>Ümumi Dəyər: <strong>{total} AZN</strong></div>
                  <div>Əvvəlki Ödəniş: <strong style={{ color: '#4ade80' }}>{paid} AZN</strong></div>
                  <div>Qalıq Borc: <strong style={{ color: '#f43f5e' }}>{rem} AZN</strong></div>
                </div>

                <label style={{ fontSize: '12px', color: '#94a3b8' }}>Hissəli Ödəniş Məbləği (AZN):</label>
                <input type="number" placeholder="Məs: 100" value={payCuttingInput} onChange={e => setPayCuttingInput(e.target.value)} style={inputStyle} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => handlePayCuttingDoc(false)} style={{ padding: '10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                     Hissəli Ödə
                  </button>
                  <button onClick={() => handlePayCuttingDoc(true)} style={{ padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✓ Tam Ödə ({rem} AZN)
                  </button>
                </div>
                <button onClick={() => setSelectedCuttingDoc(null)} style={{ width: '100%', marginTop: '10px', padding: '8px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ləğv Et</button>
              </div>
            </div>
          );
        })()}

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

        {/* MALIYYƏ HESABATI VƏ BORCLAR */}
        <div style={{ marginTop: '15px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #38bdf8' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '16px' }}>🌐 Ümumi Maliyyə Hesabatı Və Dövriyyə</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>🔨 Ustaların Toplam Maaşı:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{totalEarnedAllWorkers} AZN</div>
              <small style={{ color: '#64748b' }}>Ödənilib: {totalPaidAllWorkers} AZN</small>
              <div style={{ marginTop: '4px', color: totalWorkerRemaining > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold', fontSize: '12px' }}>
                Qalan Borc: {totalWorkerRemaining} AZN
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #a855f7' }}>
              <span style={{ fontSize: '12px', color: '#e9d5ff' }}>🪚 Sex Kəsim/Material Qaimələri:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c084fc' }}>{totalCuttingAllTime} AZN</div>
              <small style={{ color: '#4ade80' }}>Ödənilib: {totalCuttingPaidAllTime} AZN</small>
              <div style={{ marginTop: '4px', color: totalCuttingRemainingAllTime > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold', fontSize: '12px' }}>
                Qalan Qaimə Borcu: {totalCuttingRemainingAllTime} AZN
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>📦 Təchizatçılara Borc:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{totalSupplierAmount} AZN</div>
              <small style={{ color: '#64748b' }}>Ödənilib: {totalSupplierPaid} AZN</small>
              <div style={{ marginTop: '4px', color: totalSupplierRemaining > 0 ? '#f43f5e' : '#4ade80', fontWeight: 'bold', fontSize: '12px' }}>
                Qalan Borc: {totalSupplierRemaining} AZN
              </div>
            </div>
          </div>
        </div>

        {/* XÜSUSİ KƏSİM VƏ MATERIAL ƏLAVƏ ETMƏK FORMU (ADMIN) */}
        <div style={{ marginTop: '20px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #a855f7' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#c084fc', fontSize: '16px' }}>🪚 Ustaya Sex Kəsim Və Material Xidməti Yaz (Qaimə)</h3>
          <form onSubmit={handleAddCuttingService}>
            <select value={cutWorkerId} onChange={e => setCutWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- Ustanı Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Material Növü:</label>
                <select value={cutMatType} onChange={e => setCutMatType(e.target.value)} style={inputStyle}>
                  <option value="Laminat/DVP">Laminat / DVP</option>
                  <option value="AGT Panel">AGT Panel</option>
                  <option value="Arxalıq">Arxalıq</option>
                  <option value="Xüsusi Kəsim">Diğər Kəsim</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Material Rəngi / Kodu:</label>
                <input type="text" placeholder="Örn: Ağ, Qoz 102" value={cutMatColor} onChange={e => setCutMatColor(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Material Sayı (Ədəd):</label>
                <input type="number" placeholder="Sayı" value={cutMatCount} onChange={e => setCutMatCount(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>1 Ədədin Qiyməti (AZN):</label>
                <input type="number" placeholder="Qiymət" value={cutMatPrice} onChange={e => setCutMatPrice(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>PVC Metrajı (Metr):</label>
                <input type="number" placeholder="Məs: 50 metr" value={cutPvcMeters} onChange={e => setCutPvcMeters(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>1 Metr PVC (AZN):</label>
                <input type="number" step="0.01" placeholder="0.90" value={cutPvcPrice} onChange={e => setCutPvcPrice(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <label style={{ fontSize: '11px', color: '#94a3b8' }}>Transfer / Daşınma Xərci (AZN):</label>
            <input type="number" placeholder="Məs: 15 AZN" value={cutTransferFee} onChange={e => setCutTransferFee(e.target.value)} style={inputStyle} />

            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', textAlign: 'right', color: '#c084fc', fontWeight: 'bold' }}>
              Avtomatik Toplam: {((Number(cutMatCount)||0)*(Number(cutMatPrice)||0)) + ((Number(cutPvcMeters)||0)*(Number(cutPvcPrice)||0)) + (Number(cutTransferFee)||0)} AZN
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#9333ea', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              💾 Qaimə Yarad Və Usta Hesabına Yaz
            </button>
          </form>
        </div>

        {/* USTAYA İŞ TAPŞIRMAQ */}
        <div style={{ marginTop: '20px' }}>
          <form onSubmit={handleAssignJob} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #0284c7' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '16px' }}>➕ Ustaya Mebel Yığımı İş Tapşır</h3>
            <select value={assignWorkerId} onChange={e => setAssignWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- Ustanı Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>
            <input type="text" placeholder="İşin Adı (Məs: Mətbəx mebeli)" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="Təyin olunan Maaş (AZN)" value={assignAmount} onChange={e => setAssignAmount(e.target.value)} style={inputStyle} required />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📌 İşi Tapşır</button>
          </form>
        </div>

        {/* GƏLƏN SORĞULAR */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#f59e0b' }}>📥 Ustaların Sorğuları ({pendingRequests.length})</h3>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#38bdf8' }}>{req.workerName}</strong>
                <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{req.amount} AZN</span>
              </div>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>{req.description}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => handleApprove(req)} style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✓ Təsdiqlə</button>
                <button onClick={() => handleReject(req.id)} style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Rədd et</button>
              </div>
            </div>
          ))}
        </div>

        {/* USTALAR VƏ BALANSLAR */}
        <div style={{ marginTop: '25px' }}>
          <h3>👷 Ustalar Və Hesabatları ({workers.length})</h3>
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {workers.map(w => {
              const wPayments = payments.filter(p => p.workerId === w.id || p.userId === w.id);
              const paid = wPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
              const earned = Number(w.totalEarned) || 0;
              const remaining = earned - paid;

              const wCutting = cuttingServices.filter(c => c.workerId === w.id);
              const totalCut = wCutting.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
              const totalCutPaid = wCutting.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
              const totalCutRem = totalCut - totalCutPaid;

              return (
                <div key={w.id} onClick={() => setSelectedWorkerForHistory(w)} style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{w.fullname || w.name}</strong>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tel: {w.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                    <span>Maaş Alacaq: <strong style={{ color: remaining > 0 ? '#f43f5e' : '#4ade80' }}>{remaining} AZN</strong></span>
                    <span>Qaimə Borcu: <strong style={{ color: totalCutRem > 0 ? '#f43f5e' : '#4ade80' }}>{totalCutRem} AZN</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ÖDƏNİŞ ET FORMU */}
        <div style={{ marginTop: '25px' }}>
          <form onSubmit={handleAddPayment} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>💳 Ustaya Maaş / Avans Ödə</h3>
            <select value={paymentWorkerId} onChange={e => setPaymentWorkerId(e.target.value)} style={inputStyle} required>
              <option value="">-- İşçini Seçin --</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.fullname || w.name} ({w.phone})</option>)}
            </select>
            <input type="number" placeholder="Ödənilən Məbləğ (AZN)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} required />
            <input type="text" placeholder="Qeyd (Örn: Avans, Maaş)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Maaş Ödənişini Qeyd Et</button>
          </form>
        </div>

        {/* TƏCHİZATÇILAR BÖLMƏSİ */}
        <div style={{ marginTop: '25px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#f59e0b', fontSize: '16px' }}>📦 Təchizatçılar (Mal Alışı Və Borclar)</h3>
          <form onSubmit={handleAddSupplier} style={{ marginBottom: '15px' }}>
            <input type="text" placeholder="Təchizatçının Adı / Mağaza" value={supName} onChange={e => setSupName(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="Alınan Malın Toplam Dəyəri (AZN)" value={supAmount} onChange={e => setSupAmount(e.target.value)} style={inputStyle} required />
            <input type="number" placeholder="İlkin Ödənilən Məbləğ (AZN)" value={supPaid} onChange={e => setSupPaid(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Qeyd" value={supNote} onChange={e => setSupNote(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Borcu Əlavə Et</button>
          </form>

          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
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

        {/* ADMIN MODAL - USTANIN ƏTRAFLI TARİXÇƏSİ VƏ QAİMƏLƏRİ */}
        {selectedWorkerForHistory && (() => {
          const currentW = workers.find(w => w.id === selectedWorkerForHistory.id) || selectedWorkerForHistory;
          
          const wPayments = payments.filter(p => p.workerId === currentW.id || p.userId === currentW.id);
          const wJobs = extraJobs.filter(j => j.workerId === currentW.id);
          const wCutting = cuttingServices.filter(c => c.workerId === currentW.id);

          const dateMatches = (dStr) => {
            if (!dStr) return true;
            if (selectedMonthFilter === 'ALL' && selectedYearFilter === 'ALL') return true;

            const parts = dStr.split('.');
            if (parts.length < 3) return true;
            const m = parts[1];
            const y = parts[2];
            const mOk = selectedMonthFilter === 'ALL' || m === selectedMonthFilter;
            const yOk = selectedYearFilter === 'ALL' || y === selectedYearFilter;
            return mOk && yOk;
          };

          const filteredWJobs = wJobs.filter(j => dateMatches(j.date));
          const filteredWCutting = wCutting.filter(c => dateMatches(c.date));
          const filteredWPayments = wPayments.filter(p => dateMatches(p.date));

          // Ustanın Ümumi Qazancı, Ödənilən Və Qalıq Hesablaması
          const totalEarnedWorker = Number(currentW?.totalEarned) || 0;
          const totalPaidWorker = wPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const totalRemainingWorker = totalEarnedWorker - totalPaidWorker;

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

                {/* AY VƏ İL SEÇİMİ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                  <select value={selectedMonthFilter} onChange={e => setSelectedMonthFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                    <option value="ALL">Bütün Aylar</option>
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
                  <select value={selectedYearFilter} onChange={e => setSelectedYearFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                    <option value="ALL">Bütün İllər</option>
                    <option value="2026">2026 İli</option>
                    <option value="2025">2025 İli</option>
                    <option value="2027">2027 İli</option>
                  </select>
                </div>

                {/* USTA KABİNETİNDƏKİ KİMİ ÜMUMİ QAZANC, ÖDƏNİLƏN MAAŞ VƏ QALAN HESABAT BLOKU */}
                <div style={{ backgroundColor: '#0f172a', padding: '12px 15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📊 Normal Mebel İşləri Və Maaş Hesabı
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Ümumi Qazanılan:</span>
                      <strong style={{ color: '#38bdf8' }}>{totalEarnedWorker} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#94a3b8' }}>Ödənilən Maaş:</span>
                      <strong style={{ color: '#4ade80' }}>{totalPaidWorker} AZN</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                      <span>Qalan Alacaq:</span>
                      <strong style={{ color: totalRemainingWorker > 0 ? '#f43f5e' : '#4ade80' }}>{totalRemainingWorker} AZN</strong>
                    </div>
                  </div>
                </div>

                {/* ÖDƏNİLƏN MAAŞLAR HESABATI */}
                <h4 style={{ color: '#4ade80', margin: '10px 0 8px 0', borderBottom: '1px dashed #334155', paddingBottom: '4px' }}>💳 Ustaya Ödənilən Maaşlar ({filteredWPayments.length})</h4>
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gap: '6px', marginBottom: '15px' }}>
                  {filteredWPayments.length === 0 ? <p style={{ color: '#64748b', fontSize: '13px' }}>Maaş ödənişi yoxdur.</p> : (
                    filteredWPayments.map(p => (
                      <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{p.amount} AZN</span>
                          {p.note && <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>({p.note})</span>}
                        </div>
                        <small style={{ color: '#64748b' }}>{p.date}</small>
                      </div>
                    ))
                  )}
                </div>

                {/* QAİMƏ VƏ KƏSİM XİDMƏTLƏRİ VƏ BURA ƏLAVƏ EDİLƏN ÖDƏNİŞLƏR */}
                <h4 style={{ color: '#c084fc', margin: '10px 0 8px 0', borderBottom: '1px dashed #334155', paddingBottom: '4px' }}>🪚 Sexdə Kəsim Və Material Qaimələri</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'grid', gap: '8px', marginBottom: '15px' }}>
                  {filteredWCutting.length === 0 ? <p style={{ color: '#64748b', fontSize: '13px' }}>Kəsim qeydi yoxdur.</p> : (
                    filteredWCutting.map(c => {
                      const total = Number(c.totalAmount) || 0;
                      const paid = Number(c.paidAmount) || 0;
                      const rem = total - paid;

                      return (
                        <div key={c.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #c084fc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <strong>{c.materialType} {c.color ? `(${c.color})` : ''}</strong>
                            <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{total} AZN</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {c.matCount > 0 && <span>Material: {c.matCount}x{c.matPrice}AZN | </span>}
                            {c.pvcMeters > 0 && <span>PVC: {c.pvcMeters}m x {c.pvcPrice}AZN | </span>}
                            {c.transferFee > 0 && <span>Transfer: {c.transferFee}AZN</span>}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#e2e8f0', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px' }}>
                            <span style={{ color: '#4ade80' }}>Ödənilib: {paid} AZN</span>
                            <span style={{ color: rem > 0 ? '#f43f5e' : '#4ade80' }}>Qalıq Borc: {rem} AZN</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* MAAŞ / MƏBLƏĞ İŞLƏRİ */}
                <h4 style={{ color: '#38bdf8', margin: '10px 0 8px 0', borderBottom: '1px dashed #334155', paddingBottom: '4px' }}>🛠️ Mebel Yığım İşləri (Maaş)</h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '8px', marginBottom: '15px' }}>
                  {filteredWJobs.map((j) => (
                    <div key={j.id} style={{ backgroundColor: '#0f172a', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <strong>{j.description}</strong>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{j.amount} AZN</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleDeleteWorker(currentW.id, currentW.fullname)} style={{ width: '100%', padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '10px' }}>
                  🔒 Ustanı Sil (Admin Şifrəsi ilə)
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    );
  }
}
