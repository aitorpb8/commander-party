'use client'

import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ players: 0, decks: 0 });
  const [playerList, setPlayerList] = useState<any[]>([]);
  const [showPlayers, setShowPlayers] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    const fetchData = async () => {
      const { count: pCount, data: pData } = await supabase.from('profiles').select('*', { count: 'exact' });
      const { count: dCount } = await supabase.from('decks').select('*', { count: 'exact', head: true });
      setStats({ players: pCount || 0, decks: dCount || 0 });
      setPlayerList(pData || []);
    };
    
    checkUser();
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh(); 
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.refresh();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content-wrapper">
          <div className="navbar-left">
            <Link href="/" className="logo" onClick={() => setIsMenuOpen(false)}>
              Commander Party
            </Link>
            <div className="stats-badge" style={{ 
              fontSize: 'var(--stats-font, 0.85rem)', 
              background: 'rgba(255,184,0,0.1)', 
              border: '1px solid var(--color-gold)', 
              padding: 'var(--stats-padding, 4px 12px)', 
              borderRadius: '12px',
              color: 'var(--color-gold)',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              {stats.players} JUGADORES | {stats.decks} MAZOS
            </div>
          </div>

          {/* Hamburger Menu Icon */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--color-gold)',
              fontSize: '1.8rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <div 
          className={`nav-links ${isMenuOpen ? 'is-open' : ''}`} 
        >
          <Link href="/decks" className="nav-link" onClick={() => setIsMenuOpen(false)}>Decks</Link>
          <Link href="/ranking" className="nav-link" onClick={() => setIsMenuOpen(false)}>Ranking</Link>
          <Link href="/matches" className="nav-link" onClick={() => setIsMenuOpen(false)}>Partidas</Link>
          <Link href="/tournaments" className="nav-link" onClick={() => setIsMenuOpen(false)}>Torneos</Link>
          <Link href="/meta" className="nav-link" onClick={() => setIsMenuOpen(false)}>Meta</Link>
          
          <div 
            className="participants-nav"
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowPlayers(true)}
            onMouseLeave={() => setShowPlayers(false)}
          >
            <Link 
              href="/participants" 
              className="nav-link" 
              onClick={() => setIsMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              Participantes ▼
            </Link>
            {showPlayers && playerList.length > 0 && (
              <div className="dropdown-menu" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '0.5rem',
                minWidth: '200px',
                zIndex: 1000,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {playerList.map(p => (
                  <Link 
                    key={p.id} 
                    href={`/decks?user=${p.id}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      padding: '0.5rem',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      borderRadius: '4px'
                    }}
                    className="dropdown-item"
                    onClick={() => {
                       setIsMenuOpen(false);
                       setShowPlayers(false);
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#444', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.6rem' }}>
                      {p.username?.charAt(0) || '?'}
                    </div>
                    {p.username}
                  </Link>
                ))}
              </div>
            )}
          </div>
 
          <Link href="/rules" className="nav-link" onClick={() => setIsMenuOpen(false)}>Reglas</Link>
          
          {user ? (
            <div className="nav-auth-section" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <button 
                 onClick={() => {
                   router.push('/ranking?add=true');
                   setIsMenuOpen(false);
                 }}
                 className="btn btn-gold plus-match-btn" 
                 style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
               >
                 + Partida
               </button>
               <Link href="/profile" className="nav-profile-link" style={{ fontSize: '0.8rem', color: '#888', textDecoration: 'none' }} onClick={() => setIsMenuOpen(false)}>
                 {playerList.find(p => p.id === user.id)?.username || user.email?.split('@')[0]}
               </Link>
               <button onClick={handleLogout} className="btn logout-btn" style={{ background: '#333', fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}>
                 Salir
               </button>
            </div>
          ) : (
             <Link href="/login" onClick={() => setIsMenuOpen(false)}>
               <button className="btn btn-gold login-btn">Login</button>
             </Link>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .navbar-content-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        
        .navbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        @media (max-width: 992px) {
          .navbar-content-wrapper {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          
          .navbar-left {
            order: 2;
            justify-content: center;
          }
          
          .mobile-menu-toggle {
            display: block !important;
            order: 1;
            align-self: flex-end;
          }
          
          .nav-links {
            position: fixed;
            top: 70px;
            right: 0;
            width: 100%;
            height: calc(100vh - 70px);
            background: rgba(18, 18, 18, 0.98);
            backdrop-filter: blur(10px);
            flex-direction: column;
            padding: 2rem;
            transform: none;
            clip-path: inset(0 0 0 100%);
            transition: clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex !important;
            align-items: center;
            justify-content: flex-start;
            z-index: 99;
            overflow-y: auto;
            visibility: visible;
            pointer-events: auto;
          }
          
          .nav-links.is-open {
            clip-path: inset(0 0 0 0);
          }
          
          .nav-link {
            font-size: 1.5rem;
            width: 100%;
            text-align: center;
            padding: 1rem;
          }

          .participants-nav {
            width: 100%;
            text-align: center;
          }

          .dropdown-menu {
            position: static !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            margin-top: 0 !important;
          }

          .nav-auth-section {
            flex-direction: column;
            width: 100%;
            margin-top: 2rem;
            gap: 1.5rem !important;
          }

          .plus-match-btn, .login-btn, .logout-btn {
            width: 100%;
            height: 3.5rem;
            font-size: 1.1rem !important;
          }
        }

        @media (max-width: 480px) {
          .stats-badge {
            display: none !important;
          }
          
          .navbar-content-wrapper {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 0 !important;
          }
          
          .navbar-left {
            order: 0 !important;
            justify-content: flex-start !important;
          }
          
          .mobile-menu-toggle {
            order: 0 !important;
            align-self: center !important;
          }
        }
      `}</style>
    </nav>
  );
}
