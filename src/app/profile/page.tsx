'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { calculateAchievements, Badge } from '@/lib/achievements';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [collectionUrl, setCollectionUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: decksData } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id);

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*');

      const { data: upgradesData } = await supabase
        .from('deck_upgrades')
        .select('*');

      setProfile(profileData);
      setUsername(profileData?.username || '');
      setBio(profileData?.bio || ''); 
      setCollectionUrl(profileData?.collection_url || '');
      setDecks(decksData || []);
      setMatches(matchesData || []);
      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('¡Perfil actualizado con éxito!');
    }
    setSaving(false);
  };

  const handleSyncCollection = async () => {
    if (!collectionUrl) return;
    setSyncing(true);
    setSyncMessage('');

    try {
      const res = await fetch('/api/import/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: collectionUrl })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setSyncMessage(`✅ ${data.message}`);
      setProfile({ ...profile, collection_last_synced: new Date().toISOString() });
    } catch (err: any) {
      setSyncMessage(`❌ Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Cargando perfil...</div>;

  const userWins = matches.filter(m => m.winner_id === user.id).length;
  const userPlayed = matches.filter(m => m.players.includes(user.id)).length;
  const winRate = userPlayed > 0 ? (userWins / userPlayed) * 100 : 0;

  const badges = calculateAchievements({
    decks: [], // Logic already handles filtering by userId if passed correctly
    upgrades: [],
    matches: matches,
    userId: user.id
  });

  return (
    <div className="container" style={{ paddingTop: '1rem', maxWidth: '800px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-gold)' }}>Mi Perfil</h1>
        <p style={{ color: '#888' }}>Gestiona tus datos y consulta tus estadísticas de la liga.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        
        {/* Left Column: Stats & Badges */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--color-gold)', 
              color: '#111', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              margin: '0 auto 1rem'
            }}>
              {username.charAt(0).toUpperCase() || '?'}
            </div>
            <h3>{username || 'Sin nombre'}</h3>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>{user.email}</p>
          </div>

          <div className="card">
             <h4 style={{ marginBottom: '1rem', color: 'var(--color-gold)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Estadísticas Reales</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#888' }}>Partidas:</span>
                   <span style={{ fontWeight: 'bold' }}>{userPlayed}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#888' }}>Victorias:</span>
                   <span style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>{userWins}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#888' }}>Winrate:</span>
                   <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{winRate.toFixed(1)}%</span>
                </div>
             </div>
          </div>

          <div className="card">
             <h4 style={{ marginBottom: '1rem', color: 'var(--color-gold)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Logros Desbloqueados</h4>
             {badges.length > 0 ? (
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {badges.map(badge => (
                   <div 
                     key={badge.id} 
                     title={`${badge.name}: ${badge.description}`}
                     style={{ 
                       fontSize: '1.5rem', 
                       cursor: 'help',
                       background: 'rgba(255,255,255,0.05)',
                       padding: '8px',
                       borderRadius: '8px',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       border: '1px solid #333'
                     }}
                   >
                     {badge.icon}
                   </div>
                 ))}
               </div>
             ) : (
               <p style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>Aún no has desbloqueado ningún logro. ¡Sigue jugando!</p>
             )}
          </div>
        </aside>

        {/* Right Column: Profile Edit */}
        <main>
          <div className="card">
            <h3>Editar Información</h3>
            <form onSubmit={handleSave} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Nombre de Usuario (Apodo)</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="card"
                  style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: 'white' }}
                  placeholder="Tu apodo en la liga..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Biografía / Presentación</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: 'white', minHeight: '100px', fontFamily: 'inherit' }}
                  placeholder="Cuéntanos un poco sobre tu estilo de juego o tus comandantes favoritos..."
                />
              </div>

              <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid #333' }}>
                <h4 style={{ color: 'var(--color-gold)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Colección Personal</h4>
                <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                  Conecta tu colección de Moxfield o Archidekt (mazo de tipo colección) para marcar automáticamente las cartas que ya tienes como coste 0€.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    value={collectionUrl} 
                    onChange={(e) => setCollectionUrl(e.target.value)}
                    className="card"
                    style={{ flex: 1, padding: '0.75rem', background: '#111', border: '1px solid #333' }}
                    placeholder="URL de Moxfield o Archidekt..."
                  />
                  <button 
                    type="button" 
                    onClick={handleSyncCollection}
                    className="btn btn-gold"
                    style={{ whiteSpace: 'nowrap' }}
                    disabled={syncing || !collectionUrl}
                  >
                    {syncing ? 'Sincronizando...' : '🔄 Sincronizar'}
                  </button>
                </div>
                {syncMessage && (
                   <div style={{ fontSize: '0.8rem', color: syncMessage.includes('❌') ? 'var(--color-red)' : 'var(--color-green)', marginBottom: '0.5rem' }}>
                     {syncMessage}
                   </div>
                )}
                {profile?.collection_last_synced && (
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    Última sincronización: {new Date(profile.collection_last_synced).toLocaleString()}
                  </div>
                )}
              </div>

              {message && (
                <div style={{ 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  background: message.startsWith('Error') ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)',
                  color: message.startsWith('Error') ? 'var(--color-red)' : 'var(--color-green)',
                  fontSize: '0.9rem'
                }}>
                  {message}
                </div>
              )}

              <button className="btn btn-gold" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
