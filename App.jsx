import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

export default function App() {
  // Role & Authentication State
  const [role, setRole] = useState(() => localStorage.getItem('app_role') || 'worker');
  const [selectedWorkerId, setSelectedWorkerId] = useState(() => localStorage.getItem('selected_worker_id') || '');
  
  // Data States
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cuttingServices, setCuttingServices] = useState([]);

  // Form States (Existing)
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignJobTitle, setAssignJobTitle] = useState('');
  const [assignAmount, setAssignAmount] = useState('');

  // Suppliers & Payments Form
  const [supplierName, setSupplierName] = useState('');
  const [supplierAmount, setSupplierAmount] = useState('');
  const [paySupplierId, setPaySupplierId] = useState('');
  const [paySupplierAmount, setPaySupplierAmount] = useState('');

  // YENİ QAİMƏ / İNVOYS STATE-LƏRİ (Yalnız bu hissə yeniləndi)
  const [invoiceTargetId, setInvoiceTargetId] = useState('');
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [currentRow, setCurrentRow] = useState({
    id: null,
    name: '',
    unit: 'ədəd',
    quantity: '',
    price: ''
  });

  // Modal States
  const [deleteWorkerModal, setDeleteWorkerModal] = useState({ show: false, workerId: null });
  const [pinInput, setPinInput] = useState('');
  const [payWorkerModal, setPayWorkerModal] = useState({ show: false, worker: null });
  const [payAmountInput, setPayAmountInput] = useState('');

  const ADMIN_PIN = "9999";

  // Role Persistence
  useEffect(() => {
    localStorage.setItem('app_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('selected_worker_id', selectedWorkerId);
  }, [selectedWorkerId]);

  // Firestore Realtime Listeners
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubJobs = onSnapshot(collection(db, "extraJobs"), (snap) => {
      setExtraJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCutting = onSnapshot(collection(db, "cuttingServices"), (snap) => {
      setCuttingServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubPayments();
      unsubJobs();
      unsubSuppliers();
      unsubCutting();
    };
  }, []);

  // Handler Functions
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName) return alert("Ustanın adını daxil edin!");
    try {
      await addDoc(collection(db, "users"), {
        name: newWorkerName,
        phone: newWorkerPhone,
        totalEarned: 0,
        totalPaid: 0,
        createdAt: new Date().toISOString()
      });
      setNewWorkerName('');
      setNewWorkerPhone('');
      alert("Usta əlavə edildi!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteWorker = async () => {
    if (pinInput !== ADMIN_PIN) {
      alert("Şifrə yanlışdır!");
      return;
    }
    try {
      await deleteDoc(doc(db, "users", deleteWorkerModal.workerId));
      setDeleteWorkerModal({ show: false, workerId: null });
      setPinInput('');
      alert("Usta silindi!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignJob = async (e) => {
    e.preventDefault();
    if (!assignWorkerId || !assignJobTitle || !assignAmount) return alert("Bütün xanaları doldurun!");
    try {
      await addDoc(collection(db, "extraJobs"), {
        workerId: assignWorkerId,
        title: assignJobTitle,
        amount: Number(assignAmount),
        status: 'pending',
        date: new Date().toLocaleDateString('az-AZ'),
        createdAt: new Date().toISOString()
      });
      setAssignJobTitle('');
      setAssignAmount('');
      alert("İş tapşırıldı!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveJob = async (job) => {
    try {
      await updateDoc(doc(db, "extraJobs", job.id), { status: 'approved' });
      const worker = users.find(u => u.id === job.workerId);
      if (worker) {
        const currentEarned = Number(worker.totalEarned) || 0;
        await updateDoc(doc(db, "users", job.workerId), {
          totalEarned: currentEarned + Number(job.amount)
        });
      }
      alert("İş təsdiqləndi və balansa yazıldı!");
    } catch (err) {
      console.error(err);
    }
  };

  // YENİ QAİMƏ / SƏTİR İDARƏETMƏ FUNKSİYALARI
  const handleConfirmInvoiceRow = () => {
    if (!currentRow.name || !currentRow.quantity || !currentRow.price) {
      alert("Lütfən sətirdəki adı, sayı və qiyməti doldurun!");
      return;
    }
    const qty = Number(currentRow.quantity);
    const prc = Number(currentRow.price);
    const total = qty * prc;

    if (currentRow.id !== null) {
      // Mövcud sətirə DÜZƏLİŞ et
      setInvoiceRows(invoiceRows.map(row => row.id === currentRow.id ? { ...currentRow, total } : row));
    } else {
      // YENİ sətir əlavə et
      setInvoiceRows([...invoiceRows, { ...currentRow, id: Date.now(), total }]);
    }

    // Sıfırla
    setCurrentRow({ id: null, name: '', unit: 'ədəd', quantity: '', price: '' });
  };

  const handleEditInvoiceRow = (row) => {
    setCurrentRow(row);
  };

  const handleDeleteInvoiceRow = (id) => {
    setInvoiceRows(invoiceRows.filter(row => row.id !== id));
  };

  const invoiceGrandTotal = invoiceRows.reduce((acc, curr) => acc + curr.total, 0);

  const handleSaveInvoiceAndPDF = async () => {
    if (!invoiceTargetId) return alert("Lütfən Usta/Müştəri seçin!");
    if (invoiceRows.length === 0) return alert("Qaiməyə ən azı 1 sətir əlavə edin!");

    try {
      const selectedWorker = users.find(u => u.id === invoiceTargetId);
      const targetName = selectedWorker ? selectedWorker.name : invoiceTargetId;

      await addDoc(collection(db, "cuttingServices"), {
        workerId: invoiceTargetId,
        workerName: targetName,
        items: invoiceRows,
        totalAmount: invoiceGrandTotal,
        date: new Date().toLocaleDateString('az-AZ'),
        createdAt: new Date().toISOString()
      });

      alert("Qaimə bazaya yazıldı! İndi PDF yaratmaq üçün çap pəncərəsi açılır.");
      window.print();

      // Sıfırla
      setInvoiceRows([]);
      setInvoiceTargetId('');
    } catch (err) {
      console.error(err);
    }
  };

  // Suppliers logic
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierName || !supplierAmount) return alert("Xanaları doldurun!");
    try {
      await addDoc(collection(db, "suppliers"), {
        name: supplierName,
        totalDebt: Number(supplierAmount),
        paidDebt: 0,
        createdAt: new Date().toISOString()
      });
      setSupplierName('');
      setSupplierAmount('');
      alert("Təchizatçı əlavə edildi!");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaySupplier = async (e) => {
    e.preventDefault();
    if (!paySupplierId || !paySupplierAmount) return alert("Xanaları doldurun!");
    try {
      const sup = suppliers.find(s => s.id === paySupplierId);
      if (sup) {
        const newPaid = (Number(sup.paidDebt) || 0) + Number(paySupplierAmount);
        await updateDoc(doc(db, "suppliers", paySupplierId), { paidDebt: newPaid });
        alert("Ödəniş edildi!");
        setPaySupplierAmount('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayWorkerSubmit = async () => {
    if (!payAmountInput || Number(payAmountInput) <= 0) return alert("Məbləğ daxil edin!");
    try {
      const worker = payWorkerModal.worker;
      await addDoc(collection(db, "payments"), {
        workerId: worker.id,
        amount: Number(payAmountInput),
        date: new Date().toLocaleDateString('az-AZ'),
        createdAt: new Date().toISOString()
      });

      const currentPaid = Number(worker.totalPaid) || 0;
      await updateDoc(doc(db, "users", worker.id), {
        totalPaid: currentPaid + Number(payAmountInput)
      });

      alert("Ödəniş edildi!");
      setPayWorkerModal({ show: false, worker: null });
      setPayAmountInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const activeWorker = users.find(u => u.id === selectedWorkerId);
  const activeWorkerJobs = extraJobs.filter(j => j.workerId === selectedWorkerId);
  const activeWorkerPayments = payments.filter(p => p.workerId === selectedWorkerId);

  return (
    <div style={{ background: '#0b0914', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header & Role Switcher */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#131122', padding: '15px', borderRadius: '10px' }}>
        <h2>🪚 NeVeRa Mebel İdarəetmə Sistemi</h2>
        <div>
          <button 
            onClick={() => setRole('worker')} 
            style={{ padding: '8px 15px', marginRight: '10px', background: role === 'worker' ? '#7209b7' : '#221f3b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Usta Paneli
          </button>
          <button 
            onClick={() => setRole('admin')} 
            style={{ padding: '8px 15px', background: role === 'admin' ? '#7209b7' : '#221f3b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Admin Paneli
          </button>
        </div>
      </header>

      {/* USTA PANELİ */}
      {role === 'worker' && (
        <div>
          <h3>👨‍🔧 Usta Hesabı</h3>
          <div style={{ marginBottom: '15px' }}>
            <label>Ustanı Seçin: </label>
            <select 
              value={selectedWorkerId} 
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', background: '#221f3b', color: '#fff', border: '1px solid #444', marginLeft: '10px' }}
            >
              <option value="">-- Seçin --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {activeWorker ? (
            <div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', flex: 1 }}>
                  <h4>Ümumi Qazanc</h4>
                  <p style={{ fontSize: '20px', color: '#00f5d4' }}>{(Number(activeWorker.totalEarned) || 0).toFixed(2)} AZN</p>
                </div>
                <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', flex: 1 }}>
                  <h4>Ödənilən</h4>
                  <p style={{ fontSize: '20px', color: '#ffb703' }}>{(Number(activeWorker.totalPaid) || 0).toFixed(2)} AZN</p>
                </div>
                <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', flex: 1 }}>
                  <h4>Qalan Borc</h4>
                  <p style={{ fontSize: '20px', color: '#ff0055' }}>
                    {((Number(activeWorker.totalEarned) || 0) - (Number(activeWorker.totalPaid) || 0)).toFixed(2)} AZN
                  </p>
                </div>
              </div>

              <h4>Görülən İşlər</h4>
              <ul>
                {activeWorkerJobs.map(j => (
                  <li key={j.id}>{j.title} - {j.amount} AZN [{j.status === 'approved' ? 'Təsdiqləndi' : 'Gözləmədə'}]</li>
                ))}
              </ul>

              <h4>Ödəniş Tarixçəsi</h4>
              <ul>
                {activeWorkerPayments.map(p => (
                  <li key={p.id}>{p.date}: {p.amount} AZN</li>
                ))}
              </ul>
            </div>
          ) : <p>Lütfən usta seçin.</p>}
        </div>
      )}

      {/* ADMİN PANELİ */}
      {role === 'admin' && (
        <div>
          <h3>👑 Admin Paneli</h3>

          {/* Yeni Usta Əlavə Et */}
          <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4>➕ Yeni Usta Əlavə Et</h4>
            <form onSubmit={handleAddWorker} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Usta Adı" 
                value={newWorkerName} 
                onChange={e => setNewWorkerName(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
              />
              <input 
                type="text" 
                placeholder="Telefon" 
                value={newWorkerPhone} 
                onChange={e => setNewWorkerPhone(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
              />
              <button type="submit" style={{ background: '#28a745', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '6px' }}>Əlavə Et</button>
            </form>
          </div>

          {/* DİNAMİK QAİMƏ / İNVOYS BÖLMƏSİ (Şəkildəki Bənövşəyi Hissənin Yerində) */}
          <div style={{ background: '#211d38', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #3d3763' }}>
            <h3 style={{ color: '#e0aaff', margin: '0 0 15px 0' }}>📄 Ustaya / Müştəriyə Qaimə Yaz (İnvoys)</h3>

            {/* Usta/Müştəri Seçimi */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Usta və ya Müştərini Seçin:</label>
              <select 
                value={invoiceTargetId} 
                onChange={(e) => setInvoiceTargetId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#131122', color: '#fff', border: '1px solid #48436c' }}
              >
                <option value="">-- Seçin --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Sətir Daxiletmə Formu */}
            <div style={{ background: '#171427', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <h4 style={{ color: '#ffb703', margin: '0 0 10px 0' }}>
                {currentRow.id ? "✏️ Sətirə Düzəliş Et" : "➕ Sətir Parametrləri"}
              </h4>

              <input 
                type="text" 
                placeholder="Materialın adı və ya xidmət (Örn: Laminat AĞ, Sex Kəsimi)" 
                value={currentRow.name} 
                onChange={(e) => setCurrentRow({ ...currentRow, name: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444', marginBottom: '10px', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Ölçü Vahidi:</label>
                  <select 
                    value={currentRow.unit} 
                    onChange={(e) => setCurrentRow({ ...currentRow, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
                  >
                    <option value="ədəd">Ədəd</option>
                    <option value="m²">m² (Kvadrat)</option>
                    <option value="p/m">Paqon Metr (p/m)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Miqdar / Say:</label>
                  <input 
                    type="number" 
                    placeholder="Say/Metr" 
                    value={currentRow.quantity} 
                    onChange={(e) => setCurrentRow({ ...currentRow, quantity: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>1 Vahid Qiyməti (AZN):</label>
                  <input 
                    type="number" 
                    placeholder="Qiymət" 
                    value={currentRow.price} 
                    onChange={(e) => setCurrentRow({ ...currentRow, price: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px', color: '#00b4d8' }}>
                Sətir Hesabı: <strong>{(Number(currentRow.quantity || 0) * Number(currentRow.price || 0)).toFixed(2)} AZN</strong>
              </div>

              <button 
                type="button"
                onClick={handleConfirmInvoiceRow} 
                style={{ background: '#28a745', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {currentRow.id ? "✓ Düzəlişi Təsdiqlə" : "✓ Təsdiqlə və Sətiri Əlavə Et"}
              </button>
            </div>

            {/* Təsdiqlənmiş Sətirlərin Siyahısı */}
            <div>
              <h4 style={{ margin: '10px 0' }}>📋 Əlavə Olunmuş Sətirlər ({invoiceRows.length})</h4>
              {invoiceRows.length === 0 ? <p style={{ color: '#888' }}>Hələ sətir əlavə olunmayıb.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#131122', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#2b2648', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>№</th>
                      <th style={{ padding: '8px' }}>Adı / Xidmət</th>
                      <th style={{ padding: '8px' }}>Miqdar</th>
                      <th style={{ padding: '8px' }}>Qiymət</th>
                      <th style={{ padding: '8px' }}>Cəm</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #282442' }}>
                        <td style={{ padding: '8px' }}>{i + 1}</td>
                        <td style={{ padding: '8px' }}>{r.name}</td>
                        <td style={{ padding: '8px' }}>{r.quantity} {r.unit}</td>
                        <td style={{ padding: '8px' }}>{r.price} AZN</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.total.toFixed(2)} AZN</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => handleEditInvoiceRow(r)} style={{ background: '#ffb703', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer' }}>✏️ Düzəliş et</button>
                          <button onClick={() => handleDeleteInvoiceRow(r.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>🗑️ Sil</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Yekun və PDF */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #444', paddingTop: '15px' }}>
              <div style={{ fontSize: '18px' }}>
                Yekun Cəm: <strong style={{ color: '#00f5d4' }}>{invoiceGrandTotal.toFixed(2)} AZN</strong>
              </div>
              <button 
                type="button"
                onClick={handleSaveAndPDF} 
                style={{ background: '#7209b7', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📄 Qaiməni Tamamla və PDF Yarat
              </button>
            </div>
          </div>

          {/* Mebel Yığımı İş Tapşır */}
          <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4>🔨 Ustaya Mebel Yığımı İş Tapşır</h4>
            <form onSubmit={handleAssignJob} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <select 
                value={assignWorkerId} 
                onChange={e => setAssignWorkerId(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
              >
                <option value="">-- Ustanı Seçin --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="İşin Adı (Örn: Mətbəx mebeli yığımı)" 
                value={assignJobTitle} 
                onChange={e => setAssignJobTitle(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
              />
              <input 
                type="number" 
                placeholder="Məbləğ (AZN)" 
                value={assignAmount} 
                onChange={e => setAssignAmount(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
              />
              <button type="submit" style={{ background: '#007bff', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px' }}>İşi Tapşır</button>
            </form>
          </div>

          {/* Ustaların Siyahısı Və Ödəniş Modal Tetikləyici */}
          <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4>👥 Ustalar və Balans</h4>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '10px 0' }}>
                <div>
                  <strong>{u.name}</strong> ({u.phone})
                  <div>Qazanc: {u.totalEarned || 0} AZN | Ödənilib: {u.totalPaid || 0} AZN</div>
                </div>
                <div>
                  <button onClick={() => setPayWorkerModal({ show: true, worker: u })} style={{ background: '#ffb703', border: 'none', padding: '6px 12px', borderRadius: '4px', marginRight: '5px' }}>Ödəniş Et</button>
                  <button onClick={() => setDeleteWorkerModal({ show: true, workerId: u.id })} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Sil</button>
                </div>
              </div>
            ))}
          </div>

          {/* Təchizatçılar Və Borclar */}
          <div style={{ background: '#1c192e', padding: '15px', borderRadius: '8px' }}>
            <h4>🚚 Material Təchizatçıları (Borclar)</h4>
            <form onSubmit={handleAddSupplier} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" placeholder="Təchizatçı Adı" value={supplierName} onChange={e => setSupplierName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }} />
              <input type="number" placeholder="Borc Məbləği" value={supplierAmount} onChange={e => setSupplierAmount(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#0b0914', color: '#fff', border: '1px solid #444' }} />
              <button type="submit" style={{ background: '#28a745', color: '#fff', padding: '8px', border: 'none', borderRadius: '6px' }}>Əlavə Et</button>
            </form>

            {suppliers.map(s => (
              <div key={s.id} style={{ marginBottom: '8px' }}>
                {s.name}: Borc {s.totalDebt} AZN | Ödənilib: {s.paidDebt || 0} AZN
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Usta Sil Şifrə Tələbi */}
      {deleteWorkerModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1c192e', padding: '20px', borderRadius: '8px', width: '300px' }}>
            <h4>Ustanı Silmək Üçün Admin PIN Girin</h4>
            <input 
              type="password" 
              placeholder="PIN Şifrə" 
              value={pinInput} 
              onChange={e => setPinInput(e.target.value)} 
              style={{ width: '100%', padding: '8px', marginBottom: '10px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
            />
            <button onClick={handleConfirmDeleteWorker} style={{ background: '#dc3545', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px', marginRight: '5px' }}>Sil</button>
            <button onClick={() => setDeleteWorkerModal({ show: false, workerId: null })} style={{ background: '#6c757d', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px' }}>İptal</button>
          </div>
        </div>
      )}

      {/* MODAL: Ustaya Ödəniş Et */}
      {payWorkerModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1c192e', padding: '20px', borderRadius: '8px', width: '300px' }}>
            <h4>Ödəniş Et: {payWorkerModal.worker?.name}</h4>
            <input 
              type="number" 
              placeholder="Məbləğ (AZN)" 
              value={payAmountInput} 
              onChange={e => setPayAmountInput(e.target.value)} 
              style={{ width: '100%', padding: '8px', marginBottom: '10px', background: '#0b0914', color: '#fff', border: '1px solid #444' }}
            />
            <button onClick={handlePayWorkerSubmit} style={{ background: '#28a745', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px', marginRight: '5px' }}>Ödə</button>
            <button onClick={() => setPayWorkerModal({ show: false, worker: null })} style={{ background: '#6c757d', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px' }}>İptal</button>
          </div>
        </div>
      )}

    </div>
  );
}
