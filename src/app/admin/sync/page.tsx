'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SyncPage() {
  const [mounted, setMounted] = useState(false);
  const [newPrecon, setNewPrecon] = useState({ name: '', url: '', series: '', commander: '', year: new Date().getFullYear() });
  const [precons, setPrecons] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };

  useEffect(() => {
    if (authLoading) return;

    if (user?.email !== 'aitoor91@gmail.com') {
      router.push('/');
      return;
    }
    setMounted(true);
    fetchPrecons();
  }, [router, user, authLoading]);

  const fetchPrecons = () => {
    fetch('/api/admin/precons')
      .then(res => res.json())
      .then(data => setPrecons(data))
      .catch(err => addLog(`❌ Error cargando precons: ${err.message}`));
  };

  if (!mounted) return null;

  const handleAddPrecon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrecon.name || !newPrecon.url || !newPrecon.commander) return;

    try {
      const res = await fetch('/api/admin/add-precon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrecon)
      });
      
      if (res.ok) {
        addLog(`✨ Mazo añadido a la base de datos: ${newPrecon.name}`);
        setNewPrecon({ name: '', url: '', series: '', commander: '', year: new Date().getFullYear() });
        fetchPrecons();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
  };

  const [filterQuery, setFilterQuery] = useState('');
  const [syncingName, setSyncingName] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [pricingName, setPricingName] = useState<string | null>(null);
  const [pricesCache, setPricesCache] = useState<Record<string, { eur: number; usd: number }>>({});

  const syncPreconCards = async (precon: any) => {
    setSyncingName(precon.name);
    addLog(`🔄 Sincronizando cartas para "${precon.name}"...`);
    try {
      const res = await fetch('/api/admin/sync-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: precon.name, url: precon.url, commander: precon.commander })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`✅ Sincronizado con éxito: ${precon.name} (${data.totalCards} cartas)`);
        fetchPrecons();
      } else {
        throw new Error(data.error || 'Error al sincronizar cartas');
      }
    } catch (e: any) {
      addLog(`❌ Error en sincronización: ${e.message}`);
    } finally {
      setSyncingName(null);
    }
  };

  const syncAllPending = async () => {
    const pending = precons.filter(p => !p.totalCards || p.totalCards !== 100);
    if (pending.length === 0) {
      alert('¡Todos los mazos ya están perfectamente sincronizados con 100 cartas!');
      return;
    }

    if (!confirm(`Hay ${pending.length} mazo(s) pendientes o con conteo distinto a 100. ¿Deseas sincronizarlos en lote ahora?`)) {
      return;
    }

    setIsBatchSyncing(true);
    addLog(`🚀 Iniciando sincronización masiva de ${pending.length} mazos...`);

    for (let i = 0; i < pending.length; i++) {
      const p = pending[i];
      setBatchProgress({ current: i + 1, total: pending.length, name: p.name });
      addLog(`[${i + 1}/${pending.length}] Sincronizando: ${p.name}...`);

      try {
        const res = await fetch('/api/admin/sync-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: p.name, url: p.url, commander: p.commander })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          addLog(`  ✅ ${p.name}: ${data.totalCards} cartas`);
        } else {
          addLog(`  ❌ Error en ${p.name}: ${data.error}`);
        }
      } catch (err: any) {
        addLog(`  ❌ Error de red en ${p.name}: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 600)); // safety interval
    }

    setIsBatchSyncing(false);
    setBatchProgress(null);
    addLog(`✨ Sincronización masiva completada.`);
    fetchPrecons();
  };

  const estimatePrice = async (preconName: string) => {
    setPricingName(preconName);
    addLog(`💰 Estimando precio en Scryfall para "${preconName}"...`);
    try {
      const res = await fetch('/api/admin/price-precon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preconName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPricesCache(prev => ({ ...prev, [preconName]: data.prices }));
        addLog(`💶 Precio estimado de ${preconName}: ${data.prices.eur} € ($${data.prices.usd})`);
      } else {
        throw new Error(data.error || 'Error al calcular precio');
      }
    } catch (e: any) {
      addLog(`❌ Error estimando precio: ${e.message}`);
    } finally {
      setPricingName(null);
    }
  };

  const deleteCache = async (preconName: string) => {
    if (!confirm(`¿Estás seguro de borrar el caché de "${preconName}"?`)) return;
    try {
      const res = await fetch('/api/admin/save-precon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preconName, cards: [] })
      });
      if (res.ok) {
        addLog(`🗑️ Caché borrado: ${preconName}`);
        fetchPrecons();
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (e: any) {
      addLog(`❌ Error borrando caché: ${e.message}`);
    }
  };

  const filteredPrecons = precons.filter(p => {
    const q = filterQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || 
           (p.commander && p.commander.toLowerCase().includes(q)) ||
           (p.series && p.series.toLowerCase().includes(q));
  });

  return (
    <div style={{ padding: '2rem', background: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: 'var(--color-gold)' }}>Panel de Administración - Gestión de Precons</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
        Añade y gestiona mazos preconstruidos. Las cartas se descargan automáticamente y se pueden sincronizar individualmente en tiempo real.
      </p>

      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💾 Respaldos y Exportación de la Liga
        </h3>
        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          Descarga en cualquier momento una copia física con todos los mazos, jugadores y el historial completo de mejoras registradas en la liga.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a 
            href="/api/admin/export-league?format=csv" 
            download 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', background: '#107c41', color: '#fff', 
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(16, 124, 65, 0.3)'
            }}
          >
            📊 Descargar Historial de Mejoras (CSV / Excel)
          </a>
          <a 
            href="/api/admin/export-league?format=json" 
            download 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', background: '#2563eb', color: '#fff', 
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            📦 Descargar Respaldo Completo (JSON)
          </a>
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
            (También ejecutable en terminal con: <code>npm run backup:league</code>)
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '3rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-gold)' }}>➕ Añadir Nuevo Mazo Precon (Descarga Automática de Cartas)</h3>
        <form onSubmit={handleAddPrecon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>Nombre del Mazo</label>
            <input 
              value={newPrecon.name} 
              onChange={e => setNewPrecon({...newPrecon, name: e.target.value})}
              placeholder="Ej: Masters of Evil" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>URL de Archidekt o Moxfield</label>
            <input 
              value={newPrecon.url} 
              onChange={e => setNewPrecon({...newPrecon, url: e.target.value})}
              placeholder="https://www.archidekt.com/decks/..." 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>Comandante Principal</label>
            <input 
              value={newPrecon.commander} 
              onChange={e => setNewPrecon({...newPrecon, commander: e.target.value})}
              placeholder="Ej: Ashling, the Limitless" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>Serie / Edición</label>
            <input 
              value={newPrecon.series} 
              onChange={e => setNewPrecon({...newPrecon, series: e.target.value})}
              placeholder="Ej: Doctor Who" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>Año</label>
            <input 
              type="number"
              value={newPrecon.year} 
              onChange={e => setNewPrecon({...newPrecon, year: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <button type="submit" style={{ gridColumn: 'span 2', padding: '1rem', background: 'var(--color-gold)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
            Añadir y Sincronizar Cartas Automáticamente
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Lista de Mazos Registrados ({precons.length})</h2>
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                100 cartas: {precons.filter(p => p.totalCards === 100).length} / {precons.length}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={syncAllPending}
                disabled={isBatchSyncing}
                style={{
                  background: isBatchSyncing ? '#555' : 'var(--color-gold)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: isBatchSyncing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isBatchSyncing 
                  ? `⚡ Sincronizando (${batchProgress?.current}/${batchProgress?.total})...`
                  : '⚡ Sincronizar Incompletos / Pendientes'}
              </button>
              <input 
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="🔍 Buscar mazo, comandante..."
                style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', background: '#111', color: '#fff', border: '1px solid #444', fontSize: '0.85rem', width: '220px' }}
              />
            </div>
          </div>

          {isBatchSyncing && batchProgress && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span>Procesando: <strong>{batchProgress.name}</strong></span>
                <span>{batchProgress.current} de {batchProgress.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, height: '100%', background: 'var(--color-gold)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#1a1a1a', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
            {filteredPrecons.map(p => {
              const isSyncing = syncingName === p.name;
              const isPricing = pricingName === p.name;
              const hasCards = p.totalCards > 0;
              const isPerfect100 = p.totalCards === 100;
              const price = pricesCache[p.name];

              return (
                <div key={p.id || p.name} style={{ 
                  padding: '1rem', 
                  background: '#111', 
                  borderRadius: '8px', 
                  border: '1px solid #222',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  gap: '0.75rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{p.name}</span>
                      {hasCards ? (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          background: isPerfect100 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: isPerfect100 ? '#4ade80' : '#facc15',
                          border: `1px solid ${isPerfect100 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                        }}>
                          {isPerfect100 ? `✅ ${p.totalCards} cartas` : `⚠️ ${p.totalCards} cartas`}
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          ❌ Sin cartas
                        </span>
                      )}

                      {price && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '12px', 
                          fontWeight: 'bold',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          💰 ~{price.eur} € (${price.usd})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.series} ({p.year}) • {p.commander}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => estimatePrice(p.name)}
                      disabled={isPricing || !hasCards}
                      style={{ 
                        background: '#1e293b', 
                        border: '1px solid #334155', 
                        color: '#94a3b8', 
                        cursor: isPricing || !hasCards ? 'not-allowed' : 'pointer', 
                        padding: '0.4rem 0.7rem', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        opacity: isPricing ? 0.5 : 1
                      }}
                      title="Estimar precio actual de las cartas en Scryfall"
                    >
                      {isPricing ? '⏳ ...' : '💶 Valor'}
                    </button>
                    <button 
                      onClick={() => syncPreconCards(p)}
                      disabled={isSyncing || isBatchSyncing}
                      style={{ 
                        background: '#1d4ed8', 
                        border: '1px solid #2563eb', 
                        color: '#fff', 
                        cursor: isSyncing || isBatchSyncing ? 'not-allowed' : 'pointer', 
                        padding: '0.4rem 0.7rem', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        opacity: isSyncing ? 0.5 : 1
                      }}
                      title="Descargar o sincronizar las cartas de este precon"
                    >
                      {isSyncing ? '⏳ ...' : '🔄 Sinc'}
                    </button>
                    <button 
                      onClick={() => deleteCache(p.name)}
                      style={{ background: '#331111', border: '1px solid #552222', color: '#ef4444', cursor: 'pointer', padding: '0.4rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem' }}
                      title="Borrar caché de cartas"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2>Actividad Reciente</h2>
          <div style={{ 
            height: '60vh', 
            overflowY: 'auto', 
            background: '#000', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            fontFamily: 'monospace',
            border: '1px solid #333',
            color: '#4ade80'
          }}>
            {logs.length === 0 && <div style={{ color: '#555' }}>Esperando actividad...</div>}
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '0.5rem', borderLeft: '2px solid #222', paddingLeft: '0.8rem' }}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
