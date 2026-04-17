import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useViewport } from '../../hooks/useViewport';
import logoWhite from '../../assets/images/logo/logo-white.webp';
import logoMini from '../../assets/images/logo/logo-mini.svg';



function NavBtn({ onClick, children, forceHover = false, style = {} }) {
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
        ...style
      }}
    >
      <span style={{
        background: 'linear-gradient(to right, #00AEEF 0%, #EC008C 16.5%, #FFF200 33%, #fff 50%, #fff 100%)',
        backgroundSize: '200% 100%',
        backgroundPosition: (hovered || forceHover) ? '0% 0%' : '100% 0%',
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

function DropdownRecursosDesktop({ navigate, user }) {
  const [open, setOpen] = useState(false);

  const ITEMS = [
    { label: 'Guías', path: '/guias' },
    { label: 'Plantillas', path: '/plantillas' },
    { label: 'Tablas de Color', path: '/paletas' },
    { label: 'Lista de Precios', path: '/portal/precios', requiresAuth: true },
  ];

  return (
    <div 
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, height: '100%' }} 
      className="cursor-pointer"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <NavBtn onClick={(e) => e.preventDefault()} forceHover={open}>
        Recursos
      </NavBtn>
      <svg className="transition-transform duration-300 text-white opacity-80" style={{ transform: open ? 'rotate(-180deg)' : 'none', marginTop: 1, marginLeft: -2 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      
      <div 
        style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          paddingTop: 8,
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none',
          transition: 'all 0.3s ease', zIndex: 50
        }}
      >
        <div style={{
          background: 'rgba(17,17,17,0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 8,
          minWidth: 180,
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {ITEMS.map(item => (
            <a
              key={item.label}
              href={item.path || '#'}
              onClick={e => {
                e.preventDefault();
                if (!item.path) return;
                if (item.requiresAuth && !user) {
                  setOpen(false);
                  navigate(`/login?redirect=${item.path}`);
                } else {
                  setOpen(false);
                  navigate(item.path);
                }
              }}
              style={{
                color: item.path ? (item.requiresAuth ? '#F5C842' : 'rgba(255,255,255,0.85)') : 'rgba(255,255,255,0.4)',
                fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 10,
                textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
                cursor: item.path ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (item.path) { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = item.requiresAuth ? '#F5C842' : '#fff'; } }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = item.path ? (item.requiresAuth ? '#F5C842' : 'rgba(255,255,255,0.85)') : 'rgba(255,255,255,0.4)'; }}
            >
              {item.label}
              {!item.path && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.4 }}>Próx.</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const PORTAL_ITEMS = [
  { label: 'Mi Perfil', path: '/portal/profile' },
  { label: 'Servicios', path: '/portal' },
  { label: 'Retiro de Pedidos', path: '/portal/pickup' },
  { label: 'Pagos Pendientes', path: '/portal/payments' },
  { label: 'Historial', path: '/portal/history' },
];

function DropdownPortalDesktop({ navigate, user, sessionLabel, handleSessionBtn }) {
  return <NavBtn onClick={handleSessionBtn}>{sessionLabel}</NavBtn>;
}

export default function LandingNavbar({ onOpenLoginModal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMobile } = useViewport();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPortalPage = pathname.startsWith('/portal');

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
      navigate('/portal/profile');
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
        position: isAuthPage ? 'absolute' : 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 20px' : '0 48px',
        height: '70px',
        background: (!isMobile && isPortalPage) ? 'rgba(24,24,27,0.75)' : (isPortalPage || menuOpen || scrolled) ? 'rgba(13,13,13,0.98)' : 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: ((isPortalPage || scrolled) && !menuOpen && isMobile) ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={isMobile ? logoMini : logoWhite} alt="Logo" style={{ height: isMobile ? 32 : 48, display: 'block' }} />
          {isPortalPage && (
            <>
              <div style={{ width: '1px', height: isMobile ? '28px' : '36px', background: 'rgba(255,255,255,0.2)' }}></div>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: isMobile ? '15px' : '17px', color: '#fff', letterSpacing: '0.04em' }}>AUTOGESTIÓN</span>
            </>
          )}
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <NavBtn onClick={() => {
              if (sessionType) {
                navigate('/portal/pickup');
              } else if (onOpenLoginModal) {
                onOpenLoginModal('/portal/pickup');
              } else {
                navigate('/login?redirect=/portal/pickup');
              }
            }}>Retirá aquí</NavBtn>

            {/* Desktop Dropdown Recursos */}
            <DropdownRecursosDesktop navigate={navigate} user={user} />

            {/* Autenticación o Mi Portal dependiendo del estado */}
            {sessionType ? (
              <NavBtn onClick={handleSessionBtn}>{sessionLabel}</NavBtn>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <NavBtn onClick={handleSessionBtn} style={{ padding: '0px 10px', fontSize: 13 }}>{sessionLabel}</NavBtn>
                <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '1px 0' }} />
                <NavBtn onClick={() => navigate('/register')} style={{ padding: '0px 10px', fontSize: 13 }}>Registrarse</NavBtn>
              </div>
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
          position: isAuthPage ? 'absolute' : 'fixed', top: 70, left: 0, right: 0, bottom: 0, zIndex: 9998,
          overflowY: 'auto',
          pointerEvents: menuOpen ? 'auto' : 'none',
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>
          <div style={{
            background: 'rgba(13,13,13,0.98)', backdropFilter: 'none', WebkitBackdropFilter: 'none',
            padding: '24px 24px 32px',
            display: 'flex', flexDirection: 'column', gap: 20,
            minHeight: '100%',
          }}>
            {!sessionType && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate('/login?redirect=/portal'); }} style={{
                  color: '#00AEEF', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                  padding: '12px 10px', borderRadius: 12, textAlign: 'center',
                  border: '1px solid rgba(0,174,239,0.3)', background: 'rgba(0,174,239,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>Hace tu pedido</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate(sessionType ? '/portal/pickup' : '/login?redirect=/portal/pickup'); }} style={{
                  color: '#00AEEF', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                  padding: '12px 10px', borderRadius: 12, textAlign: 'center',
                  border: '1px solid rgba(0,174,239,0.3)', background: 'rgba(0,174,239,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>Retirá aquí</a>
              </div>
            )}

            {!sessionType && <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button onClick={() => { setMenuOpen(false); handleSessionBtn(); }} style={{
                width: '85%', padding: '14px', border: '1px solid rgba(0, 174, 239, 0.3)',
                borderRadius: 12, background: 'rgba(0, 174, 239, 0.08)', color: '#00AEEF',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>{sessionLabel}</button>

              {/* Portal links debajo del botón Mi Portal */}
              {sessionType && (
                <div style={{ width: '85%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {PORTAL_ITEMS.filter(i => i.label !== 'Mi Perfil').map(item => (
                    <a key={item.label} href={item.path} onClick={e => {
                      e.preventDefault();
                      setMenuOpen(false);
                      navigate(item.path);
                    }} style={{
                      color: '#00AEEF',
                      fontSize: 13, fontWeight: 700, textDecoration: 'none',
                      padding: '12px 10px', borderRadius: 12, textAlign: 'center',
                      border: '1px solid rgba(0,174,239,0.3)',
                      background: 'rgba(0,174,239,0.06)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}

              {!sessionType && (
                <button
                  onClick={() => { setMenuOpen(false); navigate('/register'); }}
                  style={{
                    width: '85%', padding: '14px',
                    border: '1px solid #3f3f46',
                    borderRadius: 12, background: '#111', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  }}
                >Crear Cuenta</button>
              )}
              {sessionType && (
                <button onClick={() => { setMenuOpen(false); logout(); }} style={{
                  width: '85%', padding: '14px', border: '1px solid rgba(236,0,140,0.3)',
                  borderRadius: 12, background: 'rgba(236,0,140,0.06)', color: '#EC008C',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>Cerrar Sesión</button>
              )}
            </div>

            {/* Recursos — al final, separado */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recursos</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Guías', path: '/guias' },
                  { label: 'Plantillas', path: '/plantillas' },
                  { label: 'Tablas de Color', path: '/paletas' },
                  { label: 'Lista de Precios', path: '/portal/precios', requiresAuth: true },
                ].map(item => (
                  <a key={item.label} href={item.path || '#'} onClick={e => {
                    e.preventDefault();
                    if (!item.path) return;
                    setMenuOpen(false);
                    if (item.requiresAuth && !user) {
                      navigate(`/login?redirect=${item.path}`);
                    } else {
                      navigate(item.path);
                    }
                  }} style={{
                    color: item.requiresAuth ? '#F5C842' : '#EC008C',
                    fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    padding: '12px 10px', borderRadius: 12, textAlign: 'center',
                    border: `1px solid ${item.requiresAuth ? 'rgba(245,200,66,0.3)' : 'rgba(236,0,140,0.3)'}`,
                    background: item.requiresAuth ? 'rgba(245,200,66,0.06)' : 'rgba(236,0,140,0.06)',
                    cursor: item.path ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button onClick={() => { setMenuOpen(false); navigate('/contacto'); }} style={{
                width: '85%', padding: '14px', border: 'none', borderRadius: 12,
                background: 'transparent', color: '#a1a1aa', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>Contacto</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
