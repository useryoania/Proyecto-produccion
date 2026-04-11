import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import logoWhite from '../../assets/images/logo-white.png';
import { LoginFormBox } from './LoginPage';
import LandingNavbar from '../shared/LandingNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../Footer';
import { useViewport } from '../../hooks/useViewport';
import heroVideo from '../../assets/videos/hero.mp4';
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

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, isTablet } = useViewport();
  const videoRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionDropdown, setSessionDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    } catch { }
  }

  const sessionLabel = sessionType === 'production' ? 'Producción' : sessionType === 'client' ? 'Mi Portal' : 'Iniciar sesión';
  const handleSessionBtn = () => {
    if (sessionType === 'production') navigate('/retiros');
    else if (sessionType === 'client') navigate('/portal');
    else {
      if (isMobile) navigate('/login');
      else setShowLoginModal(true);
    }
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
      <LandingNavbar onOpenLoginModal={() => setShowLoginModal(true)} />

      {/* ══════════ HERO ══════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: (isMobile || isTablet) ? 'center' : 'flex-start',
        paddingTop: '70px', /* Compensación para la Navbar */
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setHeroLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'right center',
            opacity: heroLoaded ? 0.55 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Left gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(13,13,13,0.85) 0%, rgba(13,13,13,0.4) 50%, transparent 90%)',
        }} />
        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 200,
          background: 'linear-gradient(to top, #0d0d0d, transparent)',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: isMobile ? '0 24px' : isTablet ? '0 48px' : '0 80px',
          maxWidth: isMobile ? '100%' : 680,
          margin: (isMobile || isTablet) ? '0 auto' : '0',
          textAlign: (isMobile || isTablet) ? 'center' : 'left',
          display: 'flex', flexDirection: 'column',
          alignItems: (isMobile || isTablet) ? 'center' : 'flex-start',
        }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(26px, 7.5vw, 38px)' : 'clamp(32px, 3.8vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
            textTransform: 'uppercase',
          }}>
            Industrializamos<br /><span style={{ whiteSpace: 'nowrap' }}>tu producción</span>
          </h1>

          <div style={{ margin: '0 0 32px', minHeight: isMobile ? 24 : 28 }}>
            <VideoTypewriter videoRef={videoRef} isMobile={isMobile} />
          </div>

          {/* CTA buttons */}
          <div style={{
            display: 'flex', 
            gap: 16, 
            flexDirection: 'column',
            alignItems: (isMobile || isTablet) ? 'center' : 'flex-start',
            justifyContent: (isMobile || isTablet) ? 'center' : 'flex-start'
          }}>
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
              onClick={handleSessionBtn}
            >Hacé tu pedido aquí →</button>

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
              onClick={() => navigate('/contacto')}
            >Solicitar cotización →</button>
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

      {/* Login Modal Overlay para Desktop (Framer Motion) */}
      <AnimatePresence>
        {showLoginModal && !isMobile && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Backdrop con Framer Motion puro (sin blur para evitar matar los FPS) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[#000000e6]"
              style={{ willChange: 'opacity' }}
              onClick={() => setShowLoginModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8
              }}
              style={{ willChange: 'transform, opacity' }}
              className="relative w-full max-w-sm rounded-3xl z-10 p-[2px] bg-gradient-to-br from-[#00AEEF] via-[#EC008C] to-[#FFF200] shadow-2xl shadow-black/50"
            >

              {/* Close button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 z-50 text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-2"
                aria-label="Cerrar modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              {/* Inyectamos el form puramente dentro de un contenedor oscuro */}
              <div className="bg-custom-dark rounded-[22px] overflow-hidden">
                <LoginFormBox
                  onRequireReset={(result) => {
                    window.location.href = '/login?reset=true';
                  }}
                  onLoginSuccess={(result) => {
                    setShowLoginModal(false);
                    if (result.userType === 'CLIENT') navigate('/portal');
                    else navigate('/');
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

const VIDEO_TEXTS = [
  { time: 0, text: 'ECOSISTEMA INTEGRAL' },
  { time: 1.567, text: 'IMPRESIÓN' },
  { time: 3.600, text: 'SUBLIMACIÓN' },
  { time: 5.566, text: 'CORTE LÁSER' },
  { time: 7.767, text: 'BORDADO' },
  { time: 9.933, text: 'ESTAMPADO' },
  { time: 12.766, text: 'DTF UV' },
  { time: 14.001, text: 'ECO UV' },
  { time: 16.200, text: 'DTF TEXTIL' },
  { time: 19.166, text: 'COSTURA' },
  { time: 21.967, text: 'TPU' },
  { time: 24.033, text: 'IMPORTADORES DIRECTOS' },
  { time: 9999, text: '' }
];

function VideoTypewriter({ videoRef, isMobile }) {
  const [displayText, setDisplayText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Titilado del cursor
  useEffect(() => {
    const int = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    let reqId;

    const loop = () => {
      const ct = vid.currentTime;

      const currentIndex = VIDEO_TEXTS.findIndex((item, i, arr) => {
        const next = arr[i + 1];
        return ct >= item.time && (!next || ct < next.time);
      });

      if (currentIndex !== -1) {
        const currentItem = VIDEO_TEXTS[currentIndex];
        const nextItem = VIDEO_TEXTS[currentIndex + 1];

        const targetText = currentItem.text;
        const timeInState = Math.max(0, ct - currentItem.time);

        const duration = (nextItem && nextItem.time < 999) ? (nextItem.time - currentItem.time) : 3.0;
        
        // Fase de escritura: toma el 35% del tiempo total
        const typePhaseTime = duration * 0.35;
        const typeSpeed = typePhaseTime / Math.max(targetText.length, 1);

        if (nextItem && nextItem.time < 999) {
          // Fase de borrado: toma el 25% del tiempo total
          const erasePhaseTime = duration * 0.25;
          const eraseSpeed = erasePhaseTime / Math.max(targetText.length, 1);
          
          // Debe terminar de borrar exactamente 50ms (0.05s) antes del siguiente
          const startEraseTime = duration - 0.05 - erasePhaseTime;

          if (timeInState > startEraseTime) {
            const eraseProgress = timeInState - startEraseTime;
            const charsLeft = Math.max(0, targetText.length - Math.floor(eraseProgress / eraseSpeed));
            setDisplayText(targetText.substring(0, charsLeft));
          } else {
            const charsTyped = Math.floor(timeInState / typeSpeed);
            setDisplayText(targetText.substring(0, Math.min(charsTyped, targetText.length)));
          }
        } else {
          const charsTyped = Math.floor(timeInState / typeSpeed);
          setDisplayText(targetText.substring(0, Math.min(charsTyped, targetText.length)));
        }
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    vid.addEventListener('timeupdate', loop);
    return () => {
      cancelAnimationFrame(reqId);
      vid.removeEventListener('timeupdate', loop);
    };
  }, [videoRef]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'inherit',
      fontSize: isMobile ? 'clamp(20px, 8vw, 36px)' : 44, 
      fontWeight: 600,
      color: '#fff',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ color: '#00AEEF', fontWeight: 800 }}>{'>'}</span>
      <span style={{ marginLeft: 8 }}>{displayText}</span>
      <span style={{
        opacity: cursorVisible ? 1 : 0,
        transition: 'opacity 0.1s',
        marginLeft: 6,
        width: 5, // Aumentado para compensar el tamaño
        height: isMobile ? 40 : 48, // Duplicado
        background: '#00AEEF',
        display: 'inline-block'
      }} />
    </div>
  );
}
