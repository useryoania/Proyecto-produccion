import { Logo } from './Logo';
import { useViewport } from '../hooks/useViewport';
import fbIcon from '../assets/images/facebook.svg';
import igIcon from '../assets/images/instagram.svg';
import ttIcon from '../assets/images/tiktok.svg';
import fbMobileIcon from '../assets/images/facebook_mobile.svg';
import igMobileIcon from '../assets/images/instagram_mobile.svg';
import ttMobileIcon from '../assets/images/tiktok_mobile.svg';
import ShowroomMap from './ShowroomMap';


const SOCIALS = [
  { label: 'Instagram User', href: 'https://www.instagram.com/user.uruguay/',                                       icon: 'ig' },
  { label: 'Facebook User',  href: 'https://www.facebook.com/profile.php?viewas=100000686899395&id=61572025574993', icon: 'fb' },
  { label: 'Tiktok User',    href: 'https://www.tiktok.com/@user.sublimacion.dtf.uy',                               icon: 'tt' },
];

const ICON = {
  fb: <img src={fbIcon} alt="FB" style={{ width: 450, height: 'auto', display: 'block', transform: 'translateY(6px)' }} />,
  ig: <img src={igIcon} alt="IG" style={{ width: 450, height: 'auto', display: 'block' }} />,
  tt: <img src={ttIcon} alt="TikTok" style={{ width: 450, height: 'auto', display: 'block' }} />
};

const ICON_MOBILE = {
  fb: <img src={fbMobileIcon} alt="FB" style={{ height: 48, width: 'auto', display: 'block', transform: 'translateY(3px)' }} />,
  ig: <img src={igMobileIcon} alt="IG" style={{ height: 48, width: 'auto', display: 'block' }} />,
  tt: <img src={ttMobileIcon} alt="TikTok" style={{ height: 48, width: 'auto', display: 'block' }} />
};

const sLink = {
  display: 'flex', alignItems: 'center', gap: 10,
  color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
  fontSize: 13, fontWeight: 500, transition: 'color 0.2s',
};

export default function Footer() {
  const { isMobile, isTablet } = useViewport();
  
  const isAuthPage = typeof window !== 'undefined' && 
    (window.location.pathname === '/login' || window.location.pathname === '/register');

  return (
    <footer style={{ 
      background: isAuthPage ? 'rgba(17, 17, 17, 0.25)' : '#111', 
      borderTop: '1px solid rgba(255,255,255,0.07)', 
      fontFamily: "'Inter', sans-serif",
      backdropFilter: isAuthPage ? 'blur(8px)' : 'none'
    }}>

      {/* ── MAIN FOOTER ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3, 1fr)',
        gap: isMobile ? 32 : 48,
        padding: isMobile ? '40px 24px 32px' : '28px 80px 48px',
        alignItems: 'stretch',
      }}>

        {/* COL 1 — Redes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', order: isMobile ? 1 : 0, ...(isMobile && { borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 28 }) }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 13, margin: '0 0 24px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: 0 }}>
            Seguinos en
          </p>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? 12 : 24,
            alignItems: 'center',
            justifyContent: isMobile ? 'space-evenly' : 'center',
            width: '100%',
            flexWrap: 'wrap',
            transform: isMobile ? 'none' : 'translateX(-15px)'
          }}>
            {SOCIALS.map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...sLink, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'transform 0.25s ease, opacity 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isMobile ? ICON_MOBILE[s.icon] : ICON[s.icon]}
              </a>
            ))}
          </div>
        </div>

        {/* COL 2 — Showroom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', order: isMobile ? 0 : 1, ...(isMobile && { borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 28 }) }}>
          
          {/* Divisores decorativos (Solo Desktop/Tablet) */}
          {!isMobile && (
            <>
              <div style={{ position: 'absolute', left: -24, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
              {!isTablet && (
                <div style={{ position: 'absolute', right: -24, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
              )}
            </>
          )}

          <div style={{
            display: 'inline-block',
            background: '#00AEEF',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '6px 14px',
            borderRadius: 6,
            marginBottom: 24,
          }}>
            ¡Visitá nuestro Showroom!
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#eb008b"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Arenal Grande 2667, Montevideo
          </p>
          {/* Mapa interactivo Leaflet */}
          <div style={{ width: '100%', maxWidth: 340, marginBottom: 14 }}>
            <ShowroomMap />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14.93V17a1 1 0 00-2 0v-.07A8 8 0 014.07 11H5a1 1 0 000-2h-.93A8 8 0 0111 4.07V5a1 1 0 002 0v-.93A8 8 0 0119.93 11H19a1 1 0 000 2h.93A8 8 0 0113 16.93z"/></svg>
            Lunes a Viernes — 9:00 a 17:00 hs
          </p>
        </div>

        {/* COL 3 — TyC */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', order: isMobile ? 2 : 2 }}>
          <button style={{
            padding: '10px 18px',
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: 999,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            Ver Términos y Condiciones + Guías
          </button>
        </div>

      </div>

      {/* ── COPYRIGHT BAR ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: isMobile ? '16px 24px' : '16px 80px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 8 : 16,
      }}>
        <Logo style={{ height: 20, color: 'white', opacity: 0.4 }} />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>
          Copyright © User Impresión &amp; Sublimación / DTF
        </p>
      </div>

    </footer>
  );
}
