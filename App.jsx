import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where 
} from 'firebase/firestore';
import { 
  Users, FileText, Plus, ShieldCheck, LogOut, CheckCircle, XCircle, CreditCard, 
  Upload, Eye, Clock, Wallet, DollarSign, Wrench, ChevronRight, UserCheck, Lock
} from 'lucide-react';

// Firebase Konfiqurasiyası
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
  // Sistem istifadəçi statusu
  const [currentUser, setCurrentUser] = useState(null); // { id, name, phone, role: 'admin'|'worker', status }
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'

  // Forma məlumatları - Giriş / Qeydiyyat
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('Usta');

  // Bazadan gələn məlumatlar
  const [usersList, setUsersList] = useState([]);
  const [jobsList, setJobsList] = useState([]);
  const [extraJobsList, setExtraJobsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);

  // Naviqasiya (Admin/İşçi üçün)
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'workers', 'jobs', 'extras', 'payments', 'my_account'

  // Modallar
  const [modalType, setModalType] = useState(null); // 'add_job', 'add_extra', 'add_payment', 'view_receipt', 'card_edit'
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState('');

  // Form State-ləri
  const [targetWorkerId, setTargetWorkerId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobAmount, setJobAmount] = useState('');
  
  const [extraTitle, setExtraTitle] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payReceiptBase64, setPayReceiptBase64] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Real-time Firebase Dinləyiciləri
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubJobs = onSnapshot(collection(db, "jobs"), (snap) => {
      setJobsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubExtras = onSnapshot(collection(db, "extra_jobs"), (snap) => {
      setExtraJobsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPaymentsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubJobs();
      unsubExtras();
      unsubPayments();
    };
  }, []);

  // Giriş əməliyyatı
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPhone === 'admin' && loginPass === 'admin123') {
      setCurrentUser({ id: 'admin', name: 'Administrator', role: 'admin', phone: 'admin' });
      return;
    }

    const found = usersList.find(u => u.phone === loginPhone && u.password === loginPass);
    if (!found) {
      alert("Telefon nömrəsi və ya şifrə yanlışdır!");
      return;
    }

    if (found.status === 'pending') {
      alert("Hesabınız hələ administrator tərəfindən təsdiqlənməyib!");
      return;
    }

    setCurrentUser(found);
  };

  // Qeydiyyat əməliyyatı
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone || !regPass) return;

    const exists = usersList.some(u => u.phone === regPhone);
    if (exists) {
      alert("Bu telefon nömrəsi ilə artıq qeydiyyat var!");
      return;
    }

    await addDoc(collection(db, "users"), {
      name: regName,
      phone: regPhone,
      password: regPass,
      role: regRole,
      status: 'pending', // Admin təsdiqi lazımdır
      cardNumber: '',
      cardHolder: '',
      createdAt: new Date().toISOString().split('T')[0]
    });

    alert("Qeydiyyat sorğusu göndərildi! Administrator təsdiqlədikdən sonra daxil ola bilərsiniz.");
    setRegName(''); setRegPhone(''); setRegPass('');
    setAuthTab('login');
  };

  // Şəkil yükləmə (Bank Çeki)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPayReceiptBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Əsas İş Əlavə Et (Admin)
  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!targetWorkerId || !jobTitle || !jobAmount) return;

    await addDoc(collection(db, "jobs"), {
      workerId: targetWorkerId,
      title: jobTitle,
      amount: parseFloat(jobAmount),
      date: new Date().toISOString().split('T')[0]
    });

    setJobTitle(''); setJobAmount(''); setModalType(null);
  };

  // Əlavə İş Sorğusu Göndər (İşçi)
  const handleAddExtra = async (e) => {
    e.preventDefault();
    if (!extraTitle || !extraAmount) return;

    await addDoc(collection(db, "extra_jobs"), {
      workerId: currentUser.id,
      workerName: currentUser.name,
      title: extraTitle,
      description: extraDesc,
      amount: parseFloat(extraAmount),
      status: 'pending', // pending, approved, rejected
      date: new Date().toISOString().split('T')[0]
    });

    setExtraTitle(''); setExtraDesc(''); setExtraAmount(''); setModalType(null);
    alert("Əlavə iş sorğusu rəhbərliyə göndərildi!");
  };

  // Əlavə İşi Təsdiqlə / Rədd Et (Admin)
  const handleExtraStatus = async (id, newStatus, customAmt = null) => {
    const ref = doc(db, "extra_jobs", id);
    const updateData = { status: newStatus };
    if (customAmt !== null) updateData.amount = parseFloat(customAmt);
    await updateDoc(ref, updateData);
  };

  // Ödəniş Əlavə Et (Admin)
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!targetWorkerId || !payAmount) return;

    await addDoc(collection(db, "payments"), {
      workerId: targetWorkerId,
      amount: parseFloat(payAmount),
      note: payNote,
      receiptUrl: payReceiptBase64,
      date: new Date().toISOString().split('T')[0]
    });

    setPayAmount(''); setPayNote(''); setPayReceiptBase64(''); setModalType(null);
  };

  // Kart Məlumatını Yenilə (İşçi)
  const handleUpdateCard = async (e) => {
    e.preventDefault();
    const ref = doc(db, "users", currentUser.id);
    await updateDoc(ref, {
      cardNumber: cardNumber,
      cardHolder: cardHolder
    });
    setCurrentUser(prev => ({ ...prev, cardNumber, cardHolder }));
    setModalType(null);
  };

  // İşçini Təsdiqlə / Sil (Admin)
  const handleUserStatus = async (id, status) => {
    if (status === 'delete') {
      await deleteDoc(doc(db, "users", id));
    } else {
      await updateDoc(doc(db, "users", id), { status });
    }
  };

  // Hesablama Funksiyası
  const calculateWorkerStats = (wId) => {
    const mainEarn = jobsList.filter(j => j.workerId === wId).reduce((sum, j) => sum + j.amount, 0);
    const extraEarn = extraJobsList.filter(e => e.workerId === wId && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = paymentsList.filter(p => p.workerId === wId).reduce((sum, p) => sum + p.amount, 0);
    
    const totalEarn = mainEarn + extraEarn;
    const balance = totalEarn - totalPaid;

    return { totalEarn, mainEarn, extraEarn, totalPaid, balance };
  };

  // ---------------- GİRİŞ / QEYDİYYAT EKRANI ----------------
  if (!currentUser) {
    return (
      <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', color: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8', fontWeight: 'bold' }}>NeVeRa Mebel</h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Ustaların İdarəetmə və Haqq-Hesab Sistemi</p>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px' }}>
            <button onClick={() => setAuthTab('login')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authTab === 'login' ? '#38bdf8' : '#64748b', borderBottom: authTab === 'login' ? '2px solid #38bdf8' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>Giriş</button>
            <button onClick={() => setAuthTab('register')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authTab === 'register' ? '#38bdf8' : '#64748b', borderBottom: authTab === 'register' ? '2px solid #38bdf8' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>Qeydiyyat</button>
          </div>

          {authTab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telefon Nömrəsi (və ya admin)</label>
                <input type="text" placeholder="0501234567" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Şifrə</label>
                <input type="password" placeholder="******" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sistemə Daxil Ol</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Ad və Soyad</label>
                <input type="text" placeholder="Məs: Elnur Məmmədov" value={regName} onChange={e=>setRegName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telefon Nömrəsi</label>
                <input type="text" placeholder="0501234567" value={regPhone} onChange={e=>setRegPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Şifrə Yaradın</label>
                <input type="password" placeholder="******" value={regPass} onChange={e=>setRegPass(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Vəzifə</label>
                <select value={regRole} onChange={e=>setRegRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}>
                  <option value="Usta">Mebel Ustası</option>
                  <option value="Köməkçi">Köməkçi</option>
                  <option value="Rəngsaz">Rəngsaz</option>
                  <option value="Yığma Ustası">Yığma Ustası</option>
                </select>
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Qeydiyyatdan Keç</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---------------- ƏSAS İDARƏETMƏ PANELSİ ----------------
  const isAdmin = currentUser.role === 'admin';
  const myStats = calculateWorkerStats(currentUser.id);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>NeVeRa Mebel</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {isAdmin ? '👑 Administrator Paneli' : `👷 ${currentUser.name} (${currentUser.role})`}
          </p>
        </div>
        <button onClick={() => setCurrentUser(null)} style={{ background: '#334155', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <LogOut size={16} /> Çıxış
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>

        {/* ---------------- İŞÇİ NƏZARƏT PANELİ (HAQQ-HESAB) ---------------- */}
        {!isAdmin && (
          <div>
            {/* Balans Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ümumi Qazanc</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#38bdf8', fontSize: '20px' }}>{myStats.totalEarn} AZN</h3>
              </div>
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Aldığı Ödənişlər</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#10b981', fontSize: '20px' }}>{myStats.totalPaid} AZN</h3>
              </div>
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #059669', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e293b, #064e3b)' }}>
                <span style={{ fontSize: '12px', color: '#a7f3d0' }}>Qalan Alacaq</span>
                <h3 style={{ margin: '6px 0 0 0', color: '#34d399', fontSize: '22px', fontWeight: 'bold' }}>{myStats.balance} AZN</h3>
              </div>
            </div>

            {/* DÜYMƏLƏR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setModalType('add_extra')} style={{ flex: 1, minWidth: '180px', padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                <Plus size={20} /> + Əlavə İş Əlavə Et
              </button>
              <button onClick={() => { setCardNumber(currentUser.cardNumber || ''); setCardHolder(currentUser.cardHolder || ''); setModalType('card_edit'); }} style={{ padding: '14px 20px', backgroundColor: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} /> Bank Kartım
              </button>
            </div>

            {/* FƏALİYYƏT TARİXÇƏSİ */}
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#cbd5e1' }}>Mənim Haqq-Hesab Tarixçəm</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Ödənişlər */}
              {paymentsList.filter(p => p.workerId === currentUser.id).map(p => (
                <div key={p.id} style={{ backgroundColor: '#1e293b', border: '1px solid #059669', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#34d399' }}>Ödəniş Qəbul Edildi: -{p.amount} AZN</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{p.date} {p.note && `• ${p.note}`}</div>
                  </div>
                  {p.receiptUrl && (
                    <button onClick={() => { setSelectedReceiptUrl(p.receiptUrl); setModalType('view_receipt'); }} style={{ background: '#064e3b', color: '#a7f3d0', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={14} /> Çek
                    </button>
                  )}
                </div>
              ))}

              {/* Əsas İşlər */}
              {jobsList.filter(j => j.workerId === currentUser.id).map(j => (
                <div key={j.id} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{j.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Əsas İş • {j.date}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>+{j.amount} AZN</div>
                </div>
              ))}

              {/* Əlavə İşlər */}
              {extraJobsList.filter(e => e.workerId === currentUser.id).map(e => (
                <div key={e.id} style={{ backgroundColor: '#1e293b', border: `1px solid ${e.status === 'approved' ? '#059669' : e.status === 'rejected' ? '#dc2626' : '#d97706'}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>
                      {e.title} 
                      <span style={{ fontSize: '11px', marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: e.status === 'approved' ? '#064e3b' : e.status === 'rejected' ? '#7f1d1d' : '#78350f', color: '#fff' }}>
                        {e.status === 'approved' ? 'Təsdiqləndi' : e.status === 'rejected' ? 'Rədd edildi' : 'Gözləmədə'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{e.description} • {e.date}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: e.status === 'approved' ? '#34d399' : '#94a3b8' }}>+{e.amount} AZN</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- ADMIN PANELSİ ---------------- */}
        {isAdmin && (
          <div>
            {/* Menyu Tabları */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              <button onClick={() => setActiveTab('overview')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'overview' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ümumi Nəzarət</button>
              <button onClick={() => setActiveTab('workers')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'workers' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>İşçilər ({usersList.length})</button>
              <button onClick={() => setActiveTab('extras')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'extras' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Əlavə İş Sorğuları ({extraJobsList.filter(e => e.status === 'pending').length})
              </button>
            </div>

            {/* TAB 1: Ümumi Nəzarət / Bütün İşçilərin Balansı */}
            {activeTab === 'overview' && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button onClick={() => setModalType('add_job')} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                    <Plus size={18} /> Əsas İş Daxil Et
                  </button>
                  <button onClick={() => setModalType('add_payment')} style={{ flex: 1, padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={18} /> Ödəniş Et
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {usersList.filter(u => u.status === 'approved').map(w => {
                    const st = calculateWorkerStats(w.id);
                    return (
                      <div key={w.id} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>{w.name}</h4>
                          <span style={{ fontSize: '11px', background: '#334155', padding: '2px 8px', borderRadius: '4px', color: '#38bdf8' }}>{w.role}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>Tel: {w.phone}</div>
                        
                        {w.cardNumber && (
                          <div style={{ background: '#0f172a', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#a7f3d0', marginBottom: '12px' }}>
                            💳 Kart: {w.cardNumber} ({w.cardHolder})
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#94a3b8' }}>Ümumi Qazanc:</span>
                          <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{st.totalEarn} AZN</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Ödənilib:</span>
                          <span style={{ fontWeight: 'bold', color: '#10b981' }}>{st.totalPaid} AZN</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #334155' }}>
                          <span style={{ fontWeight: 'bold', color: '#fff' }}>Qalan Alacaq:</span>
                          <span style={{ fontWeight: 'bold', color: '#34d399' }}>{st.balance} AZN</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: İşçilərin Siyahısı & Qeydiyyat Təsdiqi */}
            {activeTab === 'workers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Qeydiyyat Gözləyən İşçilər</h3>
                {usersList.filter(u => u.status === 'pending').length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Gözləyən yeni qeydiyyat yoxdur.</p>
                ) : (
                  usersList.filter(u => u.status === 'pending').map(u => (
                    <div key={u.id} style={{ backgroundColor: '#1e293b', border: '1px solid #d97706', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{u.name}</strong> ({u.role}) - <span style={{ color: '#94a3b8' }}>{u.phone}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUserStatus(u.id, 'approved')} style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Təsdiqlə</button>
                        <button onClick={() => handleUserStatus(u.id, 'delete')} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Sil</button>
                      </div>
                    </div>
                  ))
                )}

                <h3 style={{ margin: '16px 0 8px 0', fontSize: '16px' }}>Təsdiqlənmiş İşçilər</h3>
                {usersList.filter(u => u.status === 'approved').map(u => (
                  <div key={u.id} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{u.name}</strong> ({u.role}) • <span style={{ color: '#94a3b8' }}>{u.phone}</span>
                    </div>
                    <button onClick={() => handleUserStatus(u.id, 'delete')} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Sistemdən Sil</button>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Əlavə İş Sorğuları */}
            {activeTab === 'extras' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {extraJobsList.filter(e => e.status === 'pending').length === 0 ? (
                  <p style={{ color: '#64748b' }}>Gözləyən əlavə iş sorğusu yoxdur.</p>
                ) : (
                  extraJobsList.filter(e => e.status === 'pending').map(e => (
                    <div key={e.id} style={{ backgroundColor: '#1e293b', border: '1px solid #d97706', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '16px', color: '#f8fafc' }}>{e.workerName}</strong>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{e.amount} AZN</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#cbd5e1' }}>İş: {e.title}</div>
                      {e.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Açıqlama: {e.description}</div>}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Tarix: {e.date}</div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => handleExtraStatus(e.id, 'approved')} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Təsdiqlə (+{e.amount} AZN)</button>
                        <button onClick={() => handleExtraStatus(e.id, 'rejected')} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Rədd Et</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ---------------- MODALLAR ---------------- */}

      {/* MODAL: Əsas İş Əlavə Et */}
      {modalType === 'add_job' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 1000 }}>
          <form onSubmit={handleAddJob} style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Əsas İş Daxil Et</h3>
            
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>İşçini Seçin</label>
            <select value={targetWorkerId} onChange={e=>setTargetWorkerId(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} required>
              <option value="">-- Seçin --</option>
              {usersList.filter(u=>u.status==='approved').map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Görülən İşin Adı / Məhsul</label>
            <input type="text" placeholder="Məs: Mətbəx mebeli yığılması" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Qazanc Məbləği (AZN)</label>
            <input type="number" placeholder="250" value={jobAmount} onChange={e=>setJobAmount(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 20px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={()=>setModalType(null)} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Ləğv Et</button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>Təsdiqlə</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Əlavə İş Əlavə Et (İşçi) */}
      {modalType === 'add_extra' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 1000 }}>
          <form onSubmit={handleAddExtra} style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>+ Əlavə İş Əlavə Et</h3>
            
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Əlavə İşin Adı</label>
            <input type="text" placeholder="Məs: Mebelin 4-cü mərtəbəyə qaldırılması" value={extraTitle} onChange={e=>setExtraTitle(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Ətraflı İzahı (İstəyə bağlı)</label>
            <textarea placeholder="Lift yox idi, pilləkənlə qaldırıldı..." value={extraDesc} onChange={e=>setExtraDesc(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', height: '60px', boxSizing: 'border-box' }} />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Tələb Edilən Məbləğ (AZN)</label>
            <input type="number" placeholder="20" value={extraAmount} onChange={e=>setExtraAmount(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 20px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={()=>setModalType(null)} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Ləğv Et</button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>Sorğunu Göndər</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Ödəniş Daxil Et + Bank Çeki */}
      {modalType === 'add_payment' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 1000 }}>
          <form onSubmit={handleAddPayment} style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Ödəniş Qeydi & Çek Yükləmə</h3>
            
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>İşçini Seçin</label>
            <select value={targetWorkerId} onChange={e=>setTargetWorkerId(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} required>
              <option value="">-- Seçin --</option>
              {usersList.filter(u=>u.status==='approved').map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Ödənilən Məbləğ (AZN)</label>
            <input type="number" placeholder="100" value={payAmount} onChange={e=>setPayAmount(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Qeyd (Kapital Bank, Leobank və s.)</label>
            <input type="text" placeholder="Kapital Bank ilə köçürüldü" value={payNote} onChange={e=>setPayNote(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Bank Çekinin Şəkli</label>
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ width: '100%', padding: '8px', margin: '6px 0 20px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={()=>setModalType(null)} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Ləğv Et</button>
              <button type="submit" style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px' }}>Ödənişi Yadda Saxla</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Çek Şəklinə Baxış */}
      {modalType === 'view_receipt' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', maxWidth: '90%', maxHeight: '90%', textAlignment: 'center' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Bank Çeki</h4>
            <img src={selectedReceiptUrl} alt="Bank Çeki" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }} />
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button onClick={()=>setModalType(null)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bank Kartını Yenilə */}
      {modalType === 'card_edit' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 1000 }}>
          <form onSubmit={handleUpdateCard} style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Ödəniş Üçün Bank Kartım</h3>
            
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Kart Nömrəsi (16 rəqəm)</label>
            <input type="text" placeholder="4169 **** **** 1234" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 12px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Kartın Üzərindəki Ad və Soyad</label>
            <input type="text" placeholder="ELNUR MAMMADOV" value={cardHolder} onChange={e=>setCardHolder(e.target.value)} style={{ width: '100%', padding: '10px', margin: '6px 0 20px 0', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} required />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={()=>setModalType(null)} style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Ləğv Et</button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>Yadda Saxla</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
