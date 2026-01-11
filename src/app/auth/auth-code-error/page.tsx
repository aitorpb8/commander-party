'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthErrorPage() {
  const [errorDesc, setErrorDesc] = useState<string | null>(null)

  useEffect(() => {
    // Supabase redirects with error details in the hash #
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      setErrorDesc(params.get('error_description') || 'Hubo un error al verificar el enlace.')
    }
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-red)', marginBottom: '1rem' }}>¡Ups! Problema de acceso</h2>
        <p style={{ color: '#AAA', marginBottom: '1.5rem' }}>
          {errorDesc || 'El enlace ha expirado o ya ha sido utilizado.'}
        </p>
        <p style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
          A veces los gestores de correo (como Gmail o Outlook) "abren" el link antes que tú para comprobar si es seguro, lo que lo hace caducar.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login">
            <button className="btn">Reintentar Log-in</button>
          </Link>
          <Link href="/">
            <button className="btn" style={{ background: '#333' }}>Volver al Inicio</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
