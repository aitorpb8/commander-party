
import React from 'react';

export function renderSymbols(text: string | null) {
  if (!text) return null;
  const symbolRegex = /\{([^}]+)\}/g;
  const parts = text.split(symbolRegex);
  
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const symbol = part.replace(/\//g, '');
      return (
        <img 
          key={i}
          src={`https://svgs.scryfall.io/card-symbols/${symbol.toUpperCase()}.svg`}
          alt={part}
          style={{ height: '1.1em', width: 'auto', verticalAlign: 'middle', display: 'inline-block', margin: '0 2px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
        />
      );
    }
    return part;
  });
}

export default function ManaSymbols({ text }: { text: string }) {
  return <>{renderSymbols(text)}</>;
}
