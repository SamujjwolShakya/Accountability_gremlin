import React, { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  
  // State for the physics simulation
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const target = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const vel = useRef({ x: 0, y: 0 });
  
  // Physics constants
  const TENSION = 0.15;  // How strongly it pulls toward the mouse
  const FRICTION = 0.7;  // Dampening (lower = more bouncy/recoil)
  
  useEffect(() => {
    const onMouseMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    
    window.addEventListener('mousemove', onMouseMove);
    
    let animationFrameId;
    
    const update = () => {
      const dx = target.current.x - pos.current.x;
      const dy = target.current.y - pos.current.y;
      
      const ax = dx * TENSION;
      const ay = dy * TENSION;
      
      vel.current.x += ax;
      vel.current.y += ay;
      
      vel.current.x *= FRICTION;
      vel.current.y *= FRICTION;
      
      pos.current.x += vel.current.x;
      pos.current.y += vel.current.y;
      
      if (cursorRef.current) {
        // Center the ball on the cursor by subtracting half its width/height (10px)
        cursorRef.current.style.transform = `translate3d(${pos.current.x - 10}px, ${pos.current.y - 10}px, 0)`;
      }
      
      animationFrameId = requestAnimationFrame(update);
    };
    
    update();
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
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
        zIndex: 9999
      }}
    />
  );
}
