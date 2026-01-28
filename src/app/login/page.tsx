'use client'

import { createClient } from '@/lib/supabaseClient'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setMessage('Error: Email o contraseña incorrectos.')
        } else {
          setMessage('Error: ' + error.message)
        }
      } else {
        setMessage('Sesión iniciada correctamente.')
        router.push('/')
        router.refresh()
      }
    } else {
      // Validate username
      if (!username.trim()) {
        setMessage('Error: Debes elegir un apodo.')
        setLoading(false)
        return
      }

      // Validate password match
      if (password !== confirmPassword) {
        setMessage('Error: Las contraseñas no coinciden.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: {
            username: username.trim()
          }
        },
      })

      if (error) {
        setMessage('Error al registrar: ' + error.message)
      } else {
        if (data.user) {
          // Update profile with username immediately
          await supabase
            .from('profiles')
            .update({ username: username.trim() })
            .eq('id', data.user.id)
        }
        
        if (data.user && data.session) {
          setMessage('¡Registro completado! Ya puedes entrar.')
          router.push('/')
        } else {
          setMessage('¡Cuenta creada! Revisa tu correo para confirmar tu registro.')
        }
      }
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Introduce tu email arriba para resetear la contraseña.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      if (error.message.includes('security purposes') || error.message.includes('after 30 seconds') || error.status === 429) {
        setMessage('Por seguridad, debes esperar unos 30 segundos antes de volver a solicitarlo.')
      } else {
        setMessage('Error: ' + error.message)
      }
    } else {
      setMessage('Se ha enviado un correo para resetear/crear tu contraseña.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '2.5rem',
        border: '1px solid var(--color-gold)',
        background: 'linear-gradient(180deg, #1e1e1e 0%, #111 100%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Commander Party</h1>
          <p style={{ color: '#888', fontSize: '1rem' }}>Acceso exclusivo para jugadores</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setMode('login')}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none',
              background: mode === 'login' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'login' ? 'black' : '#888',
              fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            ENTRAR
          </button>
          <button 
            onClick={() => setMode('signup')}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none',
              background: mode === 'signup' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'signup' ? 'black' : '#888',
              fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            REGISTRARSE
          </button>
        </div>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #333',
                background: '#000', color: 'white', fontSize: '1rem'
              }}
              required
            />
          </div>
          
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Apodo / Nombre de Jugador</label>
              <input 
                type="text" 
                placeholder="Tu apodo en la liga..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ 
                  width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #333',
                  background: '#000', color: 'white', fontSize: '1rem'
                }}
                required
                minLength={3}
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', padding: '1rem', paddingRight: '3rem', borderRadius: '12px', border: '1px solid #333',
                  background: '#000', color: 'white', fontSize: '1rem'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Repetir Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ 
                    width: '100%', padding: '1rem', paddingRight: '3rem', borderRadius: '12px', border: '1px solid #333',
                    background: '#000', color: 'white', fontSize: '1rem'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          
          <button className="btn btn-gold" style={{ height: '3.5rem', fontSize: '1.2rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Procesando...' : mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
          </button>
          
          {mode === 'login' && (
            <button 
              type="button" 
              onClick={handleResetPassword} 
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', marginTop: '0.5rem' }}
              disabled={loading}
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}
        </form>

        {message && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            borderRadius: '12px', 
            background: message.startsWith('Error') ? 'rgba(221,51,51,0.1)' : 'rgba(0,170,68,0.1)',
            color: message.startsWith('Error') ? 'var(--color-red)' : 'var(--color-green)',
            fontSize: '0.9rem',
            border: `1px solid ${message.startsWith('Error') ? 'rgba(221,51,51,0.2)' : 'rgba(0,170,68,0.2)'}`,
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
