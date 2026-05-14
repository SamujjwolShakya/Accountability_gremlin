import React, { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  
  useEffect(() => {
    const onMouseMove = (e) => {
      if (cursorRef.current) {
        // Just directly follow the mouse exactly, no physics, no recoil
        cursorRef.current.style.transform = `translate3d(${e.clientX - 10}px, ${e.clientY - 10}px, 0)`;
      }
    };
    
    // Add the listener
    window.addEventListener('mousemove', onMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div 
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-primary)',
        boxShadow: '0 0 15px var(--accent-glow), 0 0 5px var(--accent-primary)',
        pointerEvents: 'none',
        zIndex: 99999 // Highest possible z-index
      }}
    />
  );
}
