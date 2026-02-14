import { MONTHLY_ALLOWANCE } from '@/lib/constants';

export default function RulesPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '2rem', textAlign: 'center' }}>Reglas de la Liga</h1>
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.6' }}>
        
        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>1. El Mazo Inicial</h2>
          <p>Cada jugador comienza con un **mazo preconstruido** de Magic: The Gathering.</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              **Las cartas del mazo original NO tienen coste** alguno. Solo cuentan para el presupuesto las cartas nuevas que se añaden mes a mes.
            </li>
            <li>
              Puedes ver el mazo de cualquier jugador, pero **solo puedes editar tu propio mazo**. Los demás decks son de solo lectura.
            </li>
            <li>
              El mazo inicial debe registrarse en la web antes de empezar la liga para tener un punto de partida claro.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>2. El Presupuesto y Costes</h2>
          <p>Cada mes se dispone de un presupuesto de **{MONTHLY_ALLOWANCE}.00€** que se añade a tu saldo acumulado disponible.</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              **Sistema Acumulativo**: El presupuesto se calcula desde el **inicio de la liga (Enero 2026)**. Esto significa que si te unes más tarde, tendrás disponible el presupuesto acumulado de los meses anteriores para ponerte al día. El límite actual es de **(meses desde Enero '26 + 1) × {MONTHLY_ALLOWANCE}€**.
            </li>
            <li>
              **Precios en Tiempo Real (🔥)**: Para el **mes en curso** y la **Wishlist**, la web muestra el precio de mercado actual (Trend) en tiempo real. Esto significa que el coste de tus últimas mejoras puede oscilar ligeramente según el mercado hasta que termine el mes.
            </li>
            <li>
              **Consolidación de Precios**: Una vez que un mes finaliza, los precios de las mejoras de ese mes se **congelan**. Esto asegura que tu historial de gastos sea estable y no cambie retroactivamente.
            </li>
            <li>
              **Cálculo de Coste**: El coste se basa en el **precio Tendencia (Trend)** de Cardmarket proporcionado por Scryfall. Priorizamos automáticamente la versión **normal** (barata) de la carta.
            </li>
            <li>
              **Sobregasto**: Si te pasas del límite acumulado, el exceso se resta de futuros meses automáticamente.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>3. Wishlist y Planificación</h2>
          <p>Cada jugador tiene acceso a una **Wishlist** (Lista de Deseos) personal para planificar futuras mejoras del mazo.</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              La Wishlist te permite guardar cartas que te interesan para meses futuros, facilitando la planificación a largo plazo.
            </li>
            <li>
              Las cartas de la Wishlist **no afectan al presupuesto** hasta que se añaden formalmente al mazo a través del Log de Mejoras.
            </li>
            <li>
              Puedes marcar cartas como prioritarias, añadir notas personales, y organizarlas por precio para optimizar tus mejoras mensuales.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>4. Registro de Cambios</h2>
          <p>Todo cambio en el mazo debe quedar registrado en el **Log de Mejoras** de la web antes de la primera partida del mes.</p>
          <p>Es obligatorio indicar la carta que sale y la carta que entra para mantener la coherencia del mazo.</p>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>5. Puntuación</h2>
          <p>El sistema de clasificación (Ranking) utiliza la siguiente puntuación:</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '0.5rem 0' }}>**Victoria**</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-gold)' }}>3 Puntos</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '0.5rem 0' }}>**Participación**</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>1 Punto</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>6. Spirit of the League</h2>
          <p>Esta es una liga casual. El objetivo es divertirse y explorar cartas poco comunes debido a la restricción de precio. No se permite el uso de proxies salvo que el grupo lo autorice individualmente.</p>
        </section>

        <section style={{ borderTop: '2px solid var(--color-gold)', paddingTop: '2rem', marginTop: '2rem' }}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>📋 Actualizaciones Recientes</h2>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Última actualización: Enero 2026</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-gold)' }}>🎴 Selección de Versiones de Cartas</h3>
              <p style={{ fontSize: '0.9rem' }}>Ahora puedes elegir versiones específicas de cartas (diferentes ediciones) en el Editor Visual, Upgrade Log y Wishlist. Cada carta mantiene su versión seleccionada y se refleja correctamente en el mazo.</p>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-gold)' }}>💰 Sincronización de Presupuesto</h3>
              <p style={{ fontSize: '0.9rem' }}>Las barras de presupuesto ahora se sincronizan automáticamente en todas las páginas (Home, Lista de Mazos, Detalle del Mazo) mostrando siempre los valores actualizados con precios en tendencia.</p>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-gold)' }}>🎨 Mejoras de Interfaz</h3>
              <ul style={{ fontSize: '0.9rem', listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Diálogos de confirmación premium con diseño moderno</li>
                <li>Nuevo layout de cards en Wishlist (imagen arriba, controles a la derecha)</li>
                <li>Botón "Añadir todo al mazo" para el mes actual en Wishlist</li>
                <li>Código de colores mejorado: Verde (dentro presupuesto), Naranja (10-11€), Rojo (&gt;11€)</li>
                <li>Espaciado optimizado en modales de selección de versiones</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.05)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-gold)' }}>🔧 Correcciones Técnicas</h3>
              <ul style={{ fontSize: '0.9rem', listStyle: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Acumulación correcta de cartas duplicadas (ej: tierras básicas)</li>
                <li>Limpieza automática de duplicados al cargar mazos</li>
                <li>Formato de fechas mejorado en Wishlist</li>
                <li>Corrección de desbordamiento en componentes de texto largo</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
