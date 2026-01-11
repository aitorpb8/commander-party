
export default function RulesPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '2rem', textAlign: 'center' }}>Reglas de la Liga</h1>
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.6' }}>
        
        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>1. El Presupuesto y Costes</h2>
          <p>Cada mes se dispone de un presupuesto máximo de **10.00€** para mejorar el mazo preconstruido original.</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              El coste de cada carta se calcula usando el precio **Trend de Cardmarket (EUR)** proporcionado por Scryfall en el momento de añadirla.
            </li>
            <li>
              **Versiones Estándar**: Para evitar costes inflados artificialmente, la web prioriza automáticamente la versión **normal** (sin marcos extendidos ni arte alternativo) al buscar cartas.
            </li>
            <li>
              Si una carta solo existe en versión especial (Promo, Secret Lair), se usará ese precio.
            </li>
            <li>
              Si un mes no se gasta el presupuesto completo, el remanente **NO se acumula** para el mes siguiente (salvo acuerdo del grupo).
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>2. Registro de Cambios</h2>
          <p>Todo cambio en el mazo debe quedar registrado en el **Log de Mejoras** de la web antes de la primera partida del mes.</p>
          <p>Es obligatorio indicar la carta que sale y la carta que entra para mantener la coherencia del mazo.</p>
        </section>

        <section>
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>3. Puntuación</h2>
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
          <h2 style={{ color: 'var(--color-mythic)', marginBottom: '1rem' }}>4. Spirit of the League</h2>
          <p>Esta es una liga casual. El objetivo es divertirse y explorar cartas poco comunes debido a la restricción de precio. No se permite el uso de proxies salvo que el grupo lo autorice individualmente.</p>
        </section>

      </div>
    </div>
  );
}
