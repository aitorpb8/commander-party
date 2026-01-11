'use client'

import { createClient } from '@/lib/supabaseClient'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('¡Contraseña actualizada con éxito! Redirigiendo...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Nueva Contraseña</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#888' }}>
          Introduce tu nueva contraseña a continuación.
        </p>
        
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="password" 
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              padding: '0.75rem', 
              borderRadius: '8px', 
              border: '1px solid #444',
              background: '#222',
              color: 'white'
            }}
            required
            minLength={6}
          />
          <button className="btn btn-gold" disabled={loading}>
            {loading ? 'Actualizando...' : 'Establecer Contraseña'}
          </button>
        </form>
        {message && (
          <p style={{ 
            marginTop: '1.5rem', 
            color: 'var(--color-gold)', 
            fontSize: '0.9rem',
            padding: '0.5rem',
            background: 'rgba(255,184,0,0.1)',
            borderRadius: '4px'
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
