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
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (e: any) {
      addLog(`❌ Error borrando caché: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: 'var(--color-gold)' }}>Panel de Administración - Gestión de Precons</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
        Añade nuevos metadatos de mazos preconstruidos. Para sincronizar las cartas masivamente, usa el script local <code>generate-all-precons.ts</code>.
      </p>

      <div style={{ marginBottom: '3rem', padding: '1.5rem', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-gold)' }}>➕ Añadir Nuevo Mazo Precon</h3>
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
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.3rem' }}>URL de Archidekt</label>
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
            Añadir a la Base de Datos
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
        <div>
          <h2>Lista de Mazos Registrados ({precons.length})</h2>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#1a1a1a', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
            {precons.map(p => (
              <div key={p.id || p.name} style={{ 
                padding: '1rem', 
                background: '#111', 
                borderRadius: '8px', 
                border: '1px solid #222',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.series} ({p.year}) • {p.commander}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => deleteCache(p.name)}
                    style={{ background: '#331111', border: '1px solid #552222', color: '#ef4444', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.7rem' }}
                  >
                    🗑️ Borrar Caché
                  </button>
                </div>
              </div>
            ))}
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
