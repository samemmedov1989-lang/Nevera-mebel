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
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState(null);

  // Firestore-dan real vaxt rejimində məlumatların çəkilməsi
  useEffect(() => {
    const unsubWorkers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubExtra = onSnapshot(collection(db, 'extraJobs'), (snapshot) => {
      setExtraJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubWorkers();
      unsubPayments();
      unsubExtra();
    };
  }, []);

  // Rədd edilmiş sorğunu silmək (Təmizləmək)
  const handleDeleteRequest = async (requestId) => {
    if (window.confirm("Bu rədd edilmiş sorğunu silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "extraJobs", requestId));
        alert("Sorğu silindi!");
      } catch (err) {
        console.error("Xəta:", err);
      }
    }
  };

  // Rədd edilmiş sorğuya düzəliş edib yenidən gözləməyə (pending) qaytarmaq
  const handleEditRequest = async (request) => {
    const newAmount = prompt("Yeni məbləği daxil edin:", request.amount);
    const newDesc = prompt("Yeni təsviri daxil edin:", request.description);

    if (newAmount && newDesc) {
      try {
        await updateDoc(doc(db, "extraJobs", request.id), {
          amount: Number(newAmount),
          description: newDesc,
          status: "pending"
        });
        alert("Sorğu düzəldildi və yenidən baxılması üçün göndərildi!");
      } catch (err) {
        console.error("Xəta:", err);
      }
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh' }}>
      <h2>NeVeRa Mebel - Administrator Paneli</h2>

      {/* İŞÇİLƏR SİYAHISI (Adına kliklədikdə ödəniş tarixçəsi açılır) */}
      <div style={{ marginTop: '20px' }}>
        <h3>İşçilər (Ödəniş tarixçəsi üçün adına toxunun)</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {workers.map((worker) => {
            const workerPayments = payments.filter(p => p.workerId === worker.id);
            const totalPaid = workerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            return (
              <div 
                key={worker.id} 
                onClick={() => setSelectedWorkerForHistory(worker)}
                style={{ 
                  padding: '15px', 
                  backgroundColor: '#1e293b', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  border: '1px solid #334155'
                }}
              >
                <h4 style={{ margin: 0, color: '#38bdf8' }}>{worker.fullname || worker.name || "Usta"}</h4>
                <p style={{ margin: '5px 0' }}>Tel: {worker.phone || 'Qeyd olunmayıb'}</p>
                <p style={{ margin: 0, color: '#4ade80' }}>Ödənilib: {totalPaid} AZN</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RƏDD EDİLMİŞ ƏLAVƏ İŞ SORĞULARI */}
      <div style={{ marginTop: '30px' }}>
        <h3>Rədd Edilmiş Sorğular</h3>
        {extraJobs.filter(j => j.status === 'rejected').length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Rədd edilmiş sorğu yoxdur.</p>
        ) : (
          extraJobs.filter(j => j.status === 'rejected').map((req) => (
            <div key={req.id} style={{ padding: '10px', backgroundColor: '#334155', borderRadius: '6px', marginBottom: '10px' }}>
              <p style={{ margin: 0 }}><strong>{req.workerName}:</strong> {req.description} - {req.amount} AZN</p>
              <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleEditRequest(req)}
                  style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ✏️ Düzəliş Et
                </button>
                <button 
                  onClick={() => handleDeleteRequest(req.id)}
                  style={{ padding: '5px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ÖDƏNİŞ TARİXÇƏSİ MODALI */}
      {selectedWorkerForHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', maxWidth: '400px', width: '100%' }}>
            <h3>{selectedWorkerForHistory.fullname || selectedWorkerForHistory.name} - Ödəniş Tarixçəsi</h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto', margin: '15px 0' }}>
              {payments.filter(p => p.workerId === selectedWorkerForHistory.id).length === 0 ? (
                <p>Bu ustaya hələ ödəniş edilməyib.</p>
              ) : (
                payments.filter(p => p.workerId === selectedWorkerForHistory.id).map((p) => (
                  <div key={p.id} style={{ padding: '8px', borderBottom: '1px solid #334155' }}>
                    <strong>{p.amount} AZN</strong> - <small>{p.date || 'Tarix qeyd edilməyib'}</small>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => setSelectedWorkerForHistory(null)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
