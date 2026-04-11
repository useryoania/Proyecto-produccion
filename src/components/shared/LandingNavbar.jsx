import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useViewport } from '../../hooks/useViewport';
import logoWhite from '../../assets/images/logo-white.png';

const NAV_LINKS = ['Servicios', 'Quienes Somos'];

function NavBtn({ onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', padding: '8px 4px',
        border: 'none', background: 'transparent',
        fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', cursor: 'pointer',
      }}
    >
      <span style={{
        background: 'linear-gradient(to right, #00AEEF 0%, #EC008C 16.5%, #FFF200 33%, #fff 50%, #fff 100%)',
        backgroundSize: '200% 100%',
        backgroundPosition: hovered ? '0% 0%' : '100% 0%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        transition: 'background-position 0.4s ease-out',
        whiteSpace: 'nowrap'
      }}>
        {children}
      </span>
    </button>
  );
}

export default function LandingNavbar({ onOpenLoginModal }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useViewport();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/register');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isClient = user?.userType === 'CLIENT' || user?.role === 'WEB_CLIENT';
  let sessionType = null;
  if (user && isClient) sessionType = 'client';
  else if (user && !isClient) sessionType = 'production';
  else {
    try {
      const authToken = localStorage.getItem('auth_token');
      const sessionStr = localStorage.getItem('user_session');
      if (authToken && sessionStr) {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) sessionType = 'client';
      }
    } catch { }
  }

  const sessionLabel = sessionType === 'production' ? 'Producción' : sessionType === 'client' ? 'Mi Portal' : 'Iniciar sesión';
  
  const handleSessionBtn = () => {
    if (sessionType === 'production') {
      navigate('/retiros');
    } else if (sessionType === 'client') {
      navigate('/portal');
    } else {
      if (onOpenLoginModal && !isMobile) {
        onOpenLoginModal();
      } else {
        navigate('/login');
      }
    }
  };

  return (
    <>
      <nav style={{
        position: isAuthPage ? 'absolute' : 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 20px' : '0 48px',
        height: '70px',
        background: (scrolled || menuOpen) ? 'rgba(13,13,13,0.97)' : 'transparent',
        backdropFilter: (scrolled || menuOpen) ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', lineHeight: 0 }}>
          <img src={logoWhite} alt="Logo" style={{ height: isMobile ? 36 : 48, display: 'block' }} />
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {NAV_LINKS.map(link => (
              <NavBtn key={link} onClick={() => navigate('/')}>{link}</NavBtn>
            ))}

            {!sessionType ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <NavBtn onClick={handleSessionBtn}>{sessionLabel}</NavBtn>
                <span style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.2)', display: 'block', margin: '-4px 0' }} />
                <NavBtn onClick={() => navigate('/register')}>Registrarse</NavBtn>
              </div>
            ) : (
              <NavBtn onClick={handleSessionBtn}>{sessionLabel}</NavBtn>
            )}

            <NavBtn onClick={() => navigate('/contacto')}>Contacto</NavBtn>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 8, display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', width: 24, height: 2, background: '#fff',
                borderRadius: 2, transition: 'all 0.3s',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(5px,5px)'
                    : i === 2 ? 'rotate(-45deg) translate(5px,-5px)'
                      : 'scaleX(0)'
                  : 'none',
              }} />
            ))}
          </button>
        )}
      </nav>

      {/* Mobile drawer */}
      {isMobile && (
        <div style={{
          position: isAuthPage ? 'absolute' : 'fixed', top: 70, left: 0, right: 0, zIndex: 99,
          overflow: 'hidden',
          maxHeight: menuOpen ? 400 : 0,
          transition: 'max-height 0.35s cubic-bezier(.4,0,.2,1)',
        }}>
          <div style={{
            background: 'rgba(13,13,13,0.97)', backdropFilter: 'blur(12px)',
            padding: '24px 24px 32px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', gap: 20,
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
            {NAV_LINKS.map(link => (
              <a key={link} href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate('/'); }} style={{
                color: '#fff', textDecoration: 'none', fontSize: 18,
                fontWeight: 700, letterSpacing: '0.04em',
              }}>{link}</a>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => { setMenuOpen(false); handleSessionBtn(); }} style={{
                flex: 1, padding: '12px', border: 'none',
                borderRadius: 999, background: sessionType ? 'rgba(255,255,255,0.08)' : 'transparent', color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>{sessionLabel}</button>
              {!sessionType && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/register'); }}
                  style={{
                    flex: 1, padding: '12px',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    borderRadius: 999, background: 'transparent', color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >Registrate</button>
              )}
              <button onClick={() => { setMenuOpen(false); navigate('/contacto'); }} style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: 999,
                background: '#f4f4f5', color: '#111', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Contacto</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
