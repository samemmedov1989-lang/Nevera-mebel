import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

export default function App() {
  const [workers, setWorkers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extraJobs, setExtraJobs] = useState([]);
  
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleDeleteRequest = async (requestId) => {
    if (window.confirm("Bu rədd edilmiş sorğunu silmək istədiyinizə əminsiniz?")) {
      try {
        await deleteDoc(doc(db, "extraJobs", requestId));
        alert("Sorğu uğurla silindi!");
      } catch (err) {
        console.error("Silinərkən xəta baş verdi:", err);
        alert("Xəta baş verdi, yenidən cəhd edin.");
      }
    }
  };

  const handleEditRequest = async (request) => {
    const newAmount = prompt("Yeni məbləği daxil edin (AZN):", request.amount);
    if (newAmount === null) return;
    
    const newDesc = prompt("Yeni iş təsvirini daxil edin:", request.description || "");
    if (newDesc === null) return;

    if (newAmount && newDesc) {
      try {
        await updateDoc(doc(db, "extraJobs", request.id), {
          amount: Number(newAmount),
          description: newDesc,
          status: "pending"
        });
        alert("Sorğu düzəldildi və yenidən gözləmə rejiminə keçirildi!");
      } catch (err) {
        console.error("Düzəliş edilərkən xəta:", err);
        alert("Xəta baş verdi.");
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '15px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #334155' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#38bdf8' }}>NeVeRa Mebel</h1>
          <small style={{ color: '#94a3b8' }}>👑 Administrator Paneli</small>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'overview' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer' }}
        >
          Ümumi Nəzarət
        </button>
        <button 
          onClick={() => setActiveTab('workers')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'workers' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer' }}
        >
          İşçilər ({workers.length})
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'requests' ? '#2563eb' : '#1e293b', color: '#fff', cursor: 'pointer' }}
        >
          Əlavə İş Sorğuları ({extraJobs.filter(j => j.status === 'pending').length})
        </button>
      </div>

      {(activeTab === 'overview' || activeTab === 'workers') && (
        <div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
            💡 Ödəniş tarixçəsini görmək üçün ustanın kartına toxunun.
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
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '10px',
                    padding: '15px',
                    border: '1px solid #334155',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>{worker.fullname || worker.name || "Usta"}</h3>
                    <span style={{ backgroundColor: '#334155', color: '#94a3b8', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}>
                      {worker.role || 'Usta'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0 10px 0' }}>Tel: {worker.phone || 'Göstərilməyib'}</p>

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

      {(activeTab === 'overview' || activeTab === 'requests') && (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ color: '#ef4444', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Rədd Edilmiş Sorğular</h3>
          
          {extraJobs.filter(j => j.status === 'rejected').length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Rədd edilmiş sorğu yoxdur.</p>
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
                    <button 
                      onClick={() => handleEditRequest(req)}
                      style={{ flex: 1, padding: '6px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✏️ Düzəliş et
                    </button>
                    <button 
                      onClick={() => handleDeleteRequest(req.id)}
                      style={{ flex: 1, padding: '6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedWorkerForHistory && (
        <div 
          onClick={() => setSelectedWorkerForHistory(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b', width: '100%', maxWidth: '420px', borderRadius: '12px',
              padding: '20px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>
                {selectedWorkerForHistory.fullname || selectedWorkerForHistory.name}
              </h3>
              <button 
                onClick={() => setSelectedWorkerForHistory(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>Ödəniş Tarixçəsi:</p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '8px', paddingRight: '5px' }}>
              {payments.filter(p => p.workerId === selectedWorkerForHistory.id).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                  Bu ustaya hələ ödəniş edilməyib.
                </p>
              ) : (
                payments
                  .filter(p => p.workerId === selectedWorkerForHistory.id)
                  .map((p) => (
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

            <button 
              onClick={() => setSelectedWorkerForHistory(null)}
              style={{
                width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#334155',
                color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Bağla
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
