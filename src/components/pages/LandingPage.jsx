import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import Footer from '../Footer';
import { useViewport } from '../../hooks/useViewport';
import heroImg from '../../assets/images/hero_printing.png';
import imgSublimacion from '../../assets/images/service_sublimacion.png';
import imgDtf from '../../assets/images/service_dtf.png';
import imgGranFormato from '../../assets/images/service_gran_formato.png';
import imgTpu from '../../assets/images/service_tpu.png';

const SERVICES = [
  {
    title: 'Sublimación',
    desc: 'Transferencia de tinta por calor al tejido sintético. Colores vibrantes, lavados infinitos.',
    img: imgSublimacion,
    accent: '#06b6d4',       // cyan
    gradFrom: 'rgba(6,182,212,0.18)',
    gradTo: 'rgba(6,182,212,0)',
  },
  {
    title: 'DTF',
    desc: 'Impresión directa sobre film y transferencia universal a cualquier tela o algodón.',
    img: imgDtf,
    accent: '#e879f9',       // magenta
    gradFrom: 'rgba(232,121,249,0.18)',
    gradTo: 'rgba(232,121,249,0)',
  },
  {
    title: 'Gran Formato',
    desc: 'Gigantografías, banners y vinilos de hasta 3,2 m de ancho con colores impactantes.',
    img: imgGranFormato,
    accent: '#eab308',       // yellow
    gradFrom: 'rgba(234,179,8,0.18)',
    gradTo: 'rgba(234,179,8,0)',
  },
  {
    title: 'TPU',
    desc: 'Láminas termoplásticas de alta resistencia para protección y personalización premium.',
    img: imgTpu,
    accent: '#f472b6',       // pink
    gradFrom: 'rgba(244,114,182,0.18)',
    gradTo: 'rgba(244,114,182,0)',
  },
];

const NAV_LINKS = ['Servicios', 'Quienes Somos'];

function NavBtn({ onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', padding: '8px 4px',
        border: 'none', background: 'transparent', color: '#fff',
        fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', cursor: 'pointer',
        transition: 'color 0.2s',
      }}
    >
      {children}
      <span style={{
        position: 'absolute', bottom: 0, left: 0,
        height: '4px', borderRadius: '2px',
        background: 'linear-gradient(to right, #00AEEF 0% 20%, transparent 20% 27%, #EC008C 27% 47%, transparent 47% 53%, #FFF200 53% 73%, transparent 73% 80%, #fff 80% 100%)',
        width: hovered ? '100%' : '0%',
        transition: 'width 0.3s ease',
      }} />
    </button>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, isTablet } = useViewport();
  const [scrolled, setScrolled] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Detectar tipo de sesión — misma lógica que App.jsx
  const isClient = user?.userType === 'CLIENT' || user?.role === 'WEB_CLIENT';
  let sessionType = null;
  if (user && isClient) sessionType = 'client';
  else if (user && !isClient) sessionType = 'production';
  else {
    // Fallback: cliente logueado solo por portal (sin user en AuthContext principal)
    try {
      const authToken = localStorage.getItem('auth_token');
      const sessionStr = localStorage.getItem('user_session');
      if (authToken && sessionStr) {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) sessionType = 'client';
      }
    } catch {}
  }

  const sessionLabel = sessionType === 'production' ? 'Producción' : sessionType === 'client' ? 'Mi Portal' : 'Ingresar';
  const handleSessionBtn = () => {
    if (sessionType === 'production') navigate('/retiros');
    else if (sessionType === 'client') navigate('/portal');
    else navigate('/login');
  };

  // El index.css global tiene body { overflow: hidden } para el app interno.
  // Acá lo habilitamos solo mientras el landing está montado.
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div style={{ background: '#0d0d0d', color: '#fff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minHeight: '100vh' }}>

      {/* ── GOOGLE FONT ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />

      {/* ══════════ NAVBAR ══════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 20px' : '0 48px',
        height: '70px',
        background: (scrolled || menuOpen) ? 'rgba(13,13,13,0.97)' : 'transparent',
        backdropFilter: (scrolled || menuOpen) ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', lineHeight: 0, position: 'relative', top: '15px' }}>
          <Logo style={{ height: isMobile ? 48 : 64, color: 'white', display: 'block' }} />
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {NAV_LINKS.map(link => (
              <NavBtn key={link}>{link}</NavBtn>
            ))}
            <NavBtn onClick={handleSessionBtn}>{sessionLabel}</NavBtn>
            <NavBtn>Contacto</NavBtn>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 8, display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {[0,1,2].map(i => (
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
          position: 'fixed', top: 70, left: 0, right: 0, zIndex: 99,
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
              <a key={link} href="#" onClick={() => setMenuOpen(false)} style={{
                color: '#fff', textDecoration: 'none', fontSize: 18,
                fontWeight: 700, letterSpacing: '0.04em',
              }}>{link}</a>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={handleSessionBtn} style={{
                flex: 1, padding: '12px', border: 'none',
                borderRadius: 999, background: sessionType ? 'rgba(255,255,255,0.08)' : 'transparent', color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>{sessionLabel}</button>
              <button style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: 999,
                background: '#f4f4f5', color: '#111', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Contacto</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ HERO ══════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Hero background image */}
        <img
          src={heroImg}
          alt=""
          onLoad={() => setHeroLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'right center',
            opacity: heroLoaded ? 0.55 : 0,
            transition: 'opacity 1s ease',
          }}
        />
        {/* Left gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #0d0d0d 35%, rgba(13,13,13,0.7) 60%, transparent 100%)',
        }} />
        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 200,
          background: 'linear-gradient(to top, #0d0d0d, transparent)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? '0 24px' : isTablet ? '0 48px' : '0 80px', maxWidth: isMobile ? '100%' : 680 }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(26px, 7.5vw, 38px)' : 'clamp(42px, 5.5vw, 76px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
            textTransform: 'uppercase',
          }}>
            Industrializamos<br /><span style={{ whiteSpace: 'nowrap' }}>tu producción</span>
          </h1>

          <p style={{
            fontSize: isMobile ? 15 : 18,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            margin: '0 0 32px',
            maxWidth: isMobile ? '100%' : 480,
          }}>
            Ecosistema integral de producción gráfica,{!isMobile && <br />}
            {' '}textil y publicitaria B2B en Uruguay.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              border: 'none',
              borderRadius: 999,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(6,182,212,0.4)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(6,182,212,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,0.4)'; }}
            >Crear nueva orden B2B →</button>

            <button style={{
              padding: '14px 28px',
              background: 'transparent',
              border: 'none',
              borderRadius: 999,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
            >Solicitar cotización →</button>
          </div>

          {/* Scroll indicator dots */}
          <div style={{ display: 'flex', gap: 8, marginTop: 56 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: i === 0 ? 24 : 8, height: 8,
                borderRadius: 999,
                background: i === 0 ? '#06b6d4' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SERVICES ══════════ */}
      <section style={{ padding: isMobile ? '48px 20px 60px' : isTablet ? '64px 40px 80px' : '80px 80px 100px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 16 : 20,
        }}>
          {SERVICES.map(svc => (
            <ServiceCard key={svc.title} {...svc} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ServiceCard({ title, desc, img, accent, gradFrom, gradTo }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        border: `1.5px solid ${hovered ? accent : 'rgba(255,255,255,0.1)'}`,
        background: '#111',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-6px)' : 'none',
        boxShadow: hovered ? `0 20px 50px ${accent}33` : '0 4px 20px rgba(0,0,0,0.4)',
        minHeight: 260,
      }}
    >
      {/* Background image */}
      <img src={img} alt={title} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        opacity: hovered ? 0.35 : 0.18,
        transition: 'opacity 0.4s ease',
      }} />

      {/* Color gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }} />

      {/* Accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 9,
        background: accent,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.3s',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: 28 }}>
        {/* Icon circle */}
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: `${accent}22`,
          border: `1px solid ${accent}55`,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: accent, opacity: 0.9 }} />
        </div>

        <h3 style={{
          fontSize: 22,
          fontWeight: 800,
          margin: '0 0 10px',
          letterSpacing: '-0.01em',
        }}>{title}</h3>

        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
          margin: 0,
        }}>{desc}</p>

        {/* Arrow on hover */}
        <div style={{
          marginTop: 24,
          fontSize: 13,
          fontWeight: 700,
          color: accent,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
          transition: 'all 0.3s',
          letterSpacing: '0.04em',
        }}>
          Ver más →
        </div>
      </div>
    </div>
  );
}
