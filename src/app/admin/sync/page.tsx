'use client';

import { useState, useEffect } from 'react';

export default function SyncPage() {
  const [mounted, setMounted] = useState(false);
  const [newPrecon, setNewPrecon] = useState({ name: '', url: '', series: '', commander: '', year: new Date().getFullYear() });
  const [precons, setPrecons] = useState<any[]>([]);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [copied, setCopied] = useState(false);

  // Define utility functions at the top to ensure availability
  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 100));
  };

  useEffect(() => {
    setMounted(true);
    fetch('/api/admin/precons')
      .then(res => res.json())
      .then(data => setPrecons(data));
  }, []);

  if (!mounted) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('⏳ Procesando archivo...');
    try {
      const text = await file.text();
      const moxfieldData = JSON.parse(text);
      const entries = Object.entries(moxfieldData);
      
      setUploadStatus(`📦 Guardando ${entries.length} mazos...`);
      
      for (const [name, data] of entries) {
        const cards: any[] = [];
        const deck: any = data;
        
        const processCard = (item: any, isCommander: boolean) => {
          // Use scryfall_id to construct a reliable image URL
          const scryfallId = item.card.scryfall_id;
          const imageUrl = scryfallId 
            ? `https://api.scryfall.com/cards/${scryfallId}?format=image&version=normal`
            : item.card.images?.normal;

          return {
            name: item.card.name,
            quantity: item.quantity || 1,
            is_commander: isCommander,
            type_line: item.card.type_line,
            mana_cost: item.card.mana_cost,
            image_url: imageUrl,
            oracle_text: item.card.oracle_text
          };
        };

        // Process commander
        if (deck.commanders) {
          Object.values(deck.commanders).forEach((item: any) => {
            cards.push(processCard(item, true));
          });
        }

        // Process mainboard
        if (deck.mainboard) {
          Object.values(deck.mainboard).forEach((item: any) => {
            cards.push(processCard(item, false));
          });
        }

        await fetch('/api/admin/save-precon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preconName: name, cards })
        });
      }
      
      setUploadStatus('✅ ¡Sincronización completada con éxito!');
      addLog('✨ Importación masiva finalizada');
    } catch (err: any) {
      setUploadStatus(`❌ Error: ${err.message}`);
    }
  };

  const deleteCache = async (preconName: string) => {
    if (!confirm(`¿Estás seguro de borrar el caché de "${preconName}"?`)) return;
    try {
      await fetch('/api/admin/save-precon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preconName, cards: [] }) // Empty cards array to clear cache
      });
      addLog(`🗑️ Caché borrado: ${preconName}`);
      setStatus(prev => ({ ...prev, [preconName]: 'CLEARED' }));
    } catch (e: any) {
      addLog(`❌ Error borrando caché: ${e.message}`);
    }
  };

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
        addLog(`✨ Mazo añadido: ${newPrecon.name}`);
        setNewPrecon({ name: '', url: '', series: '', commander: '', year: new Date().getFullYear() });
        // Reload precons list
        const data = await fetch('/api/admin/precons').then(r => r.json());
        setPrecons(data);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
  };

  // We use string parts to avoid complex template literal nesting issues
  const scriptPrefix = `(async () => {
  // Datos embebidos para evitar bloqueos CORS/HTTPS
  const precons = ${JSON.stringify(precons.filter(p => p.url.includes('moxfield.com')).map(p => ({ name: p.name, url: p.url })), null, 2)};
  const results = {};
  console.log('🚀 Preparando sincronización de ${precons.length} mazos...');
  
  for (const p of precons) {
    const parts = p.url.split('decks/');
    if (parts.length < 2) continue;
    const id = parts[1].split('?')[0].split('/')[0];
    try {
      console.log('📦 Fetching ' + p.name + '...');
      const data = await fetch('https://api.moxfield.com/v2/decks/all/' + id).then(r => r.json());
      results[p.name] = data;
      console.log('✅ ' + p.name + ' OK');
    } catch (e) {
      console.error('❌ Error en ' + p.name + ':', e);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  
  const blob = new Blob([JSON.stringify(results)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moxfield_all.json';
  document.body.appendChild(a);
  a.click();
  console.log('✅ ¡TERMINADO! Ahora sube el archivo moxfield_all.json a la web.');
  alert('Proceso terminado. Se ha descargado el archivo moxfield_all.json.');
})();`;

  const codeSnippet = scriptPrefix;

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syncAll = async () => {
    setIsSyncing(true);
    addLog('🚀 Starting bulk synchronization...');

    for (const precon of precons) {
      if (!precon.url.includes('moxfield.com')) {
        setStatus(prev => ({ ...prev, [precon.name]: 'skipped' }));
        continue;
      }

      setStatus(prev => ({ ...prev, [precon.name]: 'syncing' }));
      addLog(`📦 Fetching ${precon.name}...`);

      try {
        const deckId = precon.url.match(/decks\/([^/\?]+)/)?.[1];
        if (!deckId) throw new Error('Invalid Moxfield URL');

        // We use the browser's fetch directly to bypass bot detection
        const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`);
        if (!response.ok) throw new Error(`Moxfield error: ${response.status}`);

        const data = await response.json();
        const cards: any[] = [];

        // Commanders
        if (data.commanders) {
          Object.values(data.commanders).forEach((item: any) => {
            cards.push({
              name: item.card.name,
              quantity: item.quantity || 1,
              is_commander: true,
              type_line: item.card.type_line,
              mana_cost: item.card.mana_cost,
              image_url: item.card.images?.normal,
              oracle_text: item.card.oracle_text
            });
          });
        }

        // Mainboard
        if (data.mainboard) {
          Object.values(data.mainboard).forEach((item: any) => {
            cards.push({
              name: item.card.name,
              quantity: item.quantity,
              is_commander: false,
              type_line: item.card.type_line,
              mana_cost: item.card.mana_cost,
              image_url: item.card.images?.normal,
              oracle_text: item.card.oracle_text
            });
          });
        }

        // Save to our local cache via API
        const saveRes = await fetch('/api/admin/save-precon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preconName: precon.name, cards })
        });

        if (!saveRes.ok) throw new Error('Failed to save to cache');

        setStatus(prev => ({ ...prev, [precon.name]: 'success' }));
        addLog(`✅ Saved ${precon.name} (${cards.length} cards)`);
      } catch (e: any) {
        setStatus(prev => ({ ...prev, [precon.name]: 'error' }));
        addLog(`❌ Error ${precon.name}: ${e.message}`);
      }

      // Small delay to be polite
      await new Promise(r => setTimeout(r, 500));
    }

    setIsSyncing(false);
    addLog('✨ Synchronization complete!');
  };

  return (
    <div style={{ padding: '2rem', background: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Admin Sync Tool</h1>
      <p>This tool uses your browser to fetch Moxfield data and save it to the project cache.</p>
      
      <button 
        onClick={syncAll} 
        disabled={isSyncing}
        style={{ 
          padding: '1rem 2rem', 
          fontSize: '1.2rem', 
          background: isSyncing ? '#444' : '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {isSyncing ? 'Syncing...' : `Start Full Sync (${precons.length} Decks)`}
      </button>

      <div style={{ marginBottom: '3rem', padding: '1.5rem', background: '#1e3a8a', borderRadius: '12px', border: '2px dashed #3b82f6' }}>
        <h3 style={{ marginTop: 0 }}>⚙️ Opción 2: Importar Archivo (Corregido con fotos)</h3>
        <p>1. Ejecuta el script de abajo en Moxfield.com.</p>
        <p>2. Sube aquí el archivo <code>moxfield_all.json</code> que se descargará.</p>
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileUpload}
          style={{ 
            padding: '0.5rem', 
            background: '#fff', 
            color: '#000', 
            borderRadius: '4px',
            width: '100%' 
          }}
        />
        {uploadStatus && <div style={{ marginTop: '1rem', fontWeight: 'bold' }}>{uploadStatus}</div>}
      </div>

      <div style={{ marginBottom: '3rem', padding: '1.5rem', background: '#064e3b', borderRadius: '12px', border: '1px solid #10b981' }}>
        <h3 style={{ marginTop: 0, color: '#10b981' }}>➕ Añadir Nuevo Mazo Precon</h3>
        <form onSubmit={handleAddPrecon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>Nombre del Mazo</label>
            <input 
              value={newPrecon.name} 
              onChange={e => setNewPrecon({...newPrecon, name: e.target.value})}
              placeholder="Ej: Masters of Evil" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>URL de Moxfield</label>
            <input 
              value={newPrecon.url} 
              onChange={e => setNewPrecon({...newPrecon, url: e.target.value})}
              placeholder="https://moxfield.com/decks/..." 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>Comandante Principal</label>
            <input 
              value={newPrecon.commander} 
              onChange={e => setNewPrecon({...newPrecon, commander: e.target.value})}
              placeholder="Ej: Ashling, the Limitless" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>Serie / Edición</label>
            <input 
              value={newPrecon.series} 
              onChange={e => setNewPrecon({...newPrecon, series: e.target.value})}
              placeholder="Ej: Doctor Who" 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8 }}>Año</label>
            <input 
              type="number"
              value={newPrecon.year} 
              onChange={e => setNewPrecon({...newPrecon, year: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #333' }} 
            />
          </div>
          <button type="submit" style={{ gridColumn: 'span 2', padding: '0.8rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Añadir a la Base de Datos
          </button>
        </form>
      </div>


      <div style={{ marginTop: '3rem', borderTop: '1px solid #333', paddingTop: '2rem' }}>
        <h3>Fallback: Bypassing Cloudflare (CORS)</h3>
        <p>If the button above fails, follow these steps to bypass Moxfield's 403 error:</p>
        <ol>
          <li>Entra en <a href="https://www.moxfield.com" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>Moxfield.com</a>.</li>
          <li>Abre la Consola (F12 o Cmd+Opt+I).</li>
          <li>Copia y pega este código y pulsa Enter:</li>
        </ol>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={copyCode}
            style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '10px',
              padding: '0.5rem 1rem',
              background: copied ? '#059669' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              zIndex: 10,
              fontSize: '0.8rem',
              fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
          >
            {copied ? '✅ ¡Copiado!' : '📋 Copiar Código'}
          </button>
          <pre style={{ 
            background: '#000', 
            padding: '1.5rem', 
            borderRadius: '8px', 
            overflowX: 'auto',
            fontSize: '0.85rem',
            color: '#4ade80',
            border: '1px solid #333',
            lineHeight: '1.4',
            maxHeight: '300px'
          }}>
            {codeSnippet}
          </pre>
        </div>


      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <h2>Deck List</h2>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#1a1a1a', padding: '1rem', borderRadius: '8px' }}>
            {precons.map(p => (
              <div key={p.id} style={{ 
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
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.series} ({p.year})</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem',
                      background: status[p.name] === 'DONE' ? '#065f46' : status[p.name] === 'CLEARED' ? '#7c2d12' : '#333'
                    }}>
                      {status[p.name] || 'PENDING'}
                    </span>
                    <button 
                      onClick={() => deleteCache(p.name)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                      title="Clear Cache"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>
        <div>
          <h2>Logs</h2>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '0.2rem' }}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


