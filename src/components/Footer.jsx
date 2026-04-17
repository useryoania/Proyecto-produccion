import { Logo } from './Logo';
import { useViewport } from '../hooks/useViewport';
import fbIcon from "../assets/images/social/facebook.svg";
import igIcon from "../assets/images/social/instagram.svg";
import ttIcon from "../assets/images/social/tiktok.svg";
import ShowroomMap from './ShowroomMap';
import Social from './icons/SocialIcons';


const SOCIALS = [
  { label: 'Instagram User', href: 'https://www.instagram.com/user.uruguay/',                                       icon: 'ig' },
  { label: 'Facebook User',  href: 'https://www.facebook.com/profile.php?viewas=100000686899395&id=61572025574993', icon: 'fb' },
  { label: 'Tiktok User',    href: 'https://www.tiktok.com/@user.sublimacion.dtf.uy',                               icon: 'tt' },
];

const ICON = {
  fb: <img src={fbIcon} alt="FB" style={{ width: '100%', height: 'auto', display: 'block' }} />,
  ig: <img src={igIcon} alt="IG" style={{ width: '100%', height: 'auto', display: 'block' }} />,
  tt: <img src={ttIcon} alt="TikTok" style={{ width: '100%', height: 'auto', display: 'block' }} />
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
      backdropFilter: isAuthPage && !isMobile ? 'blur(8px)' : 'none'
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
          <h4 className="text-[12px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 text-center">
            SEGUINOS EN
          </h4>
          {isMobile ? (
            <div style={{ display: 'flex', gap: 32, flexDirection: 'row' }}>
              {SOCIALS.map(s => (
                <a 
                  key={s.icon} 
                  href={s.href} 
                  target="_blank" 
                  rel="noreferrer"
                  aria-label={s.label}
                  style={{ 
                    display: 'block', 
                    width: 54, 
                    height: 'auto',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {ICON[s.icon]}
                </a>
              ))}
            </div>
          ) : (
            <Social
              instagramUrl={SOCIALS.find(s => s.icon === 'ig').href}
              facebookUrl={SOCIALS.find(s => s.icon === 'fb').href}
              tiktokUrl={SOCIALS.find(s => s.icon === 'tt').href}
              direction="column"
            />
          )}
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

          <h4 className="text-[12px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 text-center">
            VISITÁ NUESTRO SHOWROOM
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#eb008b"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Arenal Grande 2667, Montevideo
          </p>
          {/* Mapa interactivo Leaflet */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            <ShowroomMap />
          </div>
        </div>

        {/* COL 3 — Recursos + TyC */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', order: isMobile ? 2 : 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: isMobile ? '100%' : 'auto' }}>

            {!isMobile && (
              <>
                {/* Links de Recursos como botones */}
                {[
                  { label: 'Guías de Preparación', href: '/guias' },
                  { label: 'Plantillas',            href: '/plantillas' },
                  { label: 'Tablas de Color',       href: '/paletas' },
                  { label: 'Lista de Precios',      href: '/portal/precios' },
                ].map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{
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
                      textDecoration: 'none',
                      display: 'block',
                      textAlign: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  >
                    {item.label}
                  </a>
                ))}

                {/* Separador */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '4px 0' }} />
              </>
            )}

            <button style={{
              width: '100%',
              padding: '12px 18px',
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
              onClick={() => window.location.href = '/trabaja-con-nosotros'}
            >
              Trabaja con Nosotros
            </button>
          </div>
        </div>

      </div>

      {/* ── COPYRIGHT BAR ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: isMobile ? '20px 24px' : '20px 80px',
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 16 : 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo style={{ height: 20, color: 'white', opacity: 0.4 }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, fontWeight: 500, letterSpacing: '0.02em' }}>
            &copy; {new Date().getFullYear()} USER. Todos los derechos reservados.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="/terminos"
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            Términos y Condiciones
          </a>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <a
            href="/privacidad"
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            Privacidad
          </a>
        </div>
      </div>

    </footer>
  );
}
