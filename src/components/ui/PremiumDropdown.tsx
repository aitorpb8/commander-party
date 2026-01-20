import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface PremiumDropdownProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  width?: string;
}

export default function PremiumDropdown({ label, value, options, onChange, width = '160px' }: PremiumDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <div 
         onClick={() => setIsOpen(!isOpen)}
         style={{
           display: 'flex',
           alignItems: 'center',
           gap: '8px',
           background: 'rgba(25, 25, 25, 0.8)',
           border: '1px solid #333',
           borderRadius: '8px',
           padding: '6px 12px',
           cursor: 'pointer',
           fontSize: '0.85rem',
           color: '#ccc',
           transition: 'all 0.2s',
           userSelect: 'none',
           borderColor: isOpen ? '#666' : '#333'
         }}
      >
        {label && <span style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase', marginRight: '4px' }}>{label}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeOption?.icon && <span>{activeOption.icon}</span>}
            <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>{activeOption?.label}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#666', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: 'auto' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          width: width,
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '4px',
          zIndex: 50,
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          animation: 'fadeIn 0.1s ease-out'
        }}>
          {options.map((opt) => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className="dropdown-item"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                color: value === opt.value ? '#000' : '#ccc',
                background: value === opt.value ? 'var(--color-gold)' : 'transparent',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.icon && <span>{opt.icon}</span>}
                  <span>{opt.label}</span>
              </div>
              {value === opt.value && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .dropdown-item:hover {
          background: ${value === 'dummy' ? 'inherit' : 'rgba(255,255,255,0.1)'};
        }
        /* Override specifically if not selected */
        .dropdown-item:not([style*="var(--color-gold)"]):hover {
             background: rgba(255, 255, 255, 0.1) !important;
             color: #fff !important;
        }
      `}</style>
    </div>
  );
}
