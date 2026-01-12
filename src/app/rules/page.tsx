
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
          <p>Cada mes se dispone de un presupuesto de **10.00€** que se añade a tu saldo acumulado disponible.</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              **Sistema Acumulativo**: El presupuesto total disponible es de **(meses desde creación del mazo + 1) × 10€**. Si un mes no gastas nada, ese dinero se acumula para el siguiente.
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

      </div>
    </div>
  );
}
