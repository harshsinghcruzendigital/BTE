import { startTransition, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  Droplets,
  Eye,
  Facebook,
  Globe2,
  Instagram,
  Leaf,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Recycle,
  Twitter,
  Youtube,
  Send,
  Sun,
  Target,
  TreePine,
  X,
  Zap,
  Sparkles,
  Wrench,
  PackageCheck,
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  Flame,
  Users,
  Trash2,
  Factory,
  Settings,
  CircleGauge,
  Sprout,
  Users2,
  ShieldCheck,
  Handshake,
  Database,
  History,
  Lock,
  LogOut,
  Save,
  Upload,
  Download,
  AlertTriangle,
  ChevronDown,
  Search,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Award,
  Sliders,
  Image,
  FileText,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Plus,
  Copy,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  contactDetails as defaultContactDetails,
  impacts as defaultImpacts,
  navItems,
  processSteps as defaultProcessSteps,
  projects as defaultProjects,
  solutions as defaultSolutions,
  stats as defaultStats,
  values as defaultValues,
} from './data';
import initialSiteData from '../data/site-content.json';
import './admin.css';

// API base URL. In production set VITE_API_BASE to your deployed backend's URL
// (e.g. https://bte-api.onrender.com). Falls back to the local dev backend.
const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8787` : '');

// Stable per-browser id used to count live/active visitors on the backend.
function getVisitorId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('bte_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('bte_visitor_id', id);
  }
  return id;
}

// Fire-and-forget beacon to the real-time traffic endpoints. Never throws.
function trackTraffic(kind = 'view') {
  try {
    fetch(`${API_BASE}/api/track/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), path: window.location.pathname }),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}
}

// Fires once when the element first scrolls into view — used to trigger
// on-demand animations like counting numbers up.
function useInView(options) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    // Geometry fallback: if the element is already within the viewport on mount
    // (e.g. above the fold, or the tab was backgrounded so the observer is
    // throttled), mark it in view straight away.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options || { threshold: 0.4 });
    observer.observe(el);

    // Scroll fallback so the reveal still fires if the observer is throttled.
    const onScroll = () => {
      const box = el.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.9 && box.bottom > 0) {
        setInView(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [inView]);
  return [ref, inView];
}

// Animated number that counts up from zero when scrolled into view, preserving
// any non-numeric suffix (e.g. "150K+", "85%", "8+").
function CountUp({ value, duration = 1500 }) {
  const raw = String(value);
  const match = raw.match(/^([\d.,]+)(.*)$/);
  const numeric = match ? parseFloat(match[1].replace(/,/g, '')) : null;
  const suffix = match ? match[2] : '';
  const decimals = match && match[1].includes('.') ? (match[1].split('.')[1] || '').length : 0;
  const [ref, inView] = useInView();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || numeric === null) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;

    const animate = () => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(numeric * eased);
        if (progress < 1) raf = requestAnimationFrame(tick);
        else setDisplay(numeric);
      };
      raf = requestAnimationFrame(tick);
    };

    // Snap straight to the final value when motion is reduced or the tab is
    // hidden (rAF is paused there, so animating would leave it stuck at 0).
    if (reduceMotion || document.hidden) {
      setDisplay(numeric);
      if (document.hidden && !reduceMotion) {
        const onVisible = () => {
          if (!document.hidden) {
            setDisplay(0);
            animate();
            document.removeEventListener('visibilitychange', onVisible);
          }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
      }
      return;
    }

    animate();
    return () => cancelAnimationFrame(raf);
  }, [inView, numeric, duration]);

  if (numeric === null) return <span ref={ref}>{raw}</span>;
  const shown = display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref}>{shown}{suffix}</span>;
}

// Thin reading-progress bar plus a scroll-to-top control that fades in once the
// visitor has scrolled down. Mounted once at the app root.
function ScrollUtilities() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? (scrollTop / height) * 100 : 0);
      setShowTop(scrollTop > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <>
      <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} aria-hidden="true" />
      <button
        type="button"
        className={`back-to-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ArrowUpRight size={18} style={{ transform: 'rotate(-45deg)' }} />
      </button>
    </>
  );
}

// Curated library of Google Fonts available across the site + admin typography
// picker. Grouped so the <select> can show sans / serif / display sections.
const SYSTEM_FONTS = new Set([
  'System UI', 'Arial', 'Helvetica', 'Helvetica Neue', 'Segoe UI',
  'San Francisco', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Geneva',
  'Century Gothic', 'Lucida Grande', 'Times New Roman', 'Georgia',
  'Garamond', 'Palatino Linotype', 'Bookman Old Style', 'Baskerville',
  'Consolas', 'Courier New', 'Lucida Console', 'Monaco'
]);

const FONT_LIBRARY = {
  "System & OS Default": [
    'System UI', 'Arial', 'Helvetica', 'Helvetica Neue', 'Segoe UI',
    'San Francisco', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Geneva',
    'Century Gothic', 'Lucida Grande'
  ],
  "Classic Web Serifs": [
    'Times New Roman', 'Georgia', 'Garamond', 'Palatino Linotype',
    'Bookman Old Style', 'Baskerville'
  ],
  "Monospace & Code": [
    'Consolas', 'Courier New', 'Lucida Console', 'Monaco',
    'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Roboto Mono',
    'Space Mono', 'Inconsolata', 'Ubuntu Mono'
  ],
  "Modern Sans-Serif": [
    'Outfit', 'Plus Jakarta Sans', 'Poppins', 'Inter', 'Space Grotesk', 'Sora',
    'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'DM Sans', 'Nunito', 'Raleway',
    'Work Sans', 'Manrope', 'Rubik', 'Karla', 'Barlow', 'Urbanist', 'Figtree',
    'Epilogue', 'Lexend', 'Quicksand', 'Mulish', 'Cabin', 'IBM Plex Sans',
    'Titillium Web', 'Nunito Sans', 'Red Hat Display', 'Instrument Sans', 'Jost',
    'Public Sans', 'Chivo', 'Heebo', 'Assistant'
  ],
  "Editorial & Serif": [
    'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Source Serif Pro',
    'Crimson Text', 'Libre Baskerville', 'Bitter', 'Cormorant Garamond',
    'IBM Plex Serif', 'Fraunces', 'Cinzel', 'Newsreader', 'EB Garamond',
    'Prata', 'Zilla Slab', 'Arvo', 'Roboto Slab'
  ],
  "Display & Decorative": [
    'Abril Fatface', 'Bebas Neue', 'Oswald', 'Anton', 'Archivo', 'Syne',
    'Josefin Sans', 'Righteous', 'Russo One', 'Orbitron', 'Press Start 2P',
    'Comfortaa', 'Pacifico', 'Lobster', 'Great Vibes', 'Sacramento'
  ]
};
const ALL_FONT_NAMES = Object.values(FONT_LIBRARY).flat();

function googleFontsHref(families = ALL_FONT_NAMES) {
  const query = families
    .filter((name) => !SYSTEM_FONTS.has(name))
    .map((name) => `family=${name.replace(/ /g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

// Settings historically stored fontFamily as a full CSS stack string like
// `"Poppins", system-ui, sans-serif`. Extract just the bare family name so it
// can be matched against <option> values and re-wrapped safely.
function extractFontName(value) {
  if (!value) return 'Outfit';
  const match = String(value).match(/^"?([^",]+)"?/);
  return match ? match[1].trim() : String(value).trim();
}

// --- Color ramp generation -------------------------------------------------
// The whole site (nav, buttons, badges, borders, hover states) references a
// small ramp of CSS variables (--green-950 ... --green-50). Rather than
// asking the admin to pick 7+ individual shades, we derive the full ramp
// from a single chosen brand color (any hue — not just green) so "pick blue"
// really does recolor the entire site consistently.
function hexToHsl(hex) {
  let h = String(hex || '#1c6b3e').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) h = '1c6b3e';
  const num = parseInt(h, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue, sat;
  const light = (max + min) / 2;
  if (max === min) {
    hue = 0; sat = 0;
  } else {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return { h: hue * 360, s: sat * 100, l: light * 100 };
}

function hslToHex(h, s, l) {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function generateShadeRamp(baseHex) {
  const { h, s } = hexToHsl(baseHex);
  const sat = Math.max(s, 38);
  const mutedSat = Math.max(sat - 22, 22);
  const glowSat = Math.min(sat + 20, 92);
  return {
    950: hslToHex(h, sat, 15),
    900: hslToHex(h, sat, 20),
    800: hslToHex(h, sat, 27),
    700: hslToHex(h, sat, 34),
    600: hslToHex(h, sat, 43),
    500: hslToHex(h, sat, 52),
    200: hslToHex(h, mutedSat, 85),
    100: hslToHex(h, mutedSat, 92),
    50: hslToHex(h, mutedSat, 96),
    // Bright, high-lightness/high-saturation tones for glowing accents
    // on dark hero/video backgrounds (badge dots, glass-pill borders, etc.)
    glow: hslToHex(h, glowSat, 68),
    glowSoft: hslToHex(h, glowSat, 78)
  };
}

// SVG Icon Map for Dynamic Rendering
const IconMap = {
  Leaf, Zap, PackageCheck, Users, Flame, Trash2, Factory, Recycle, Zap, 
  PackageCheck, Sparkles, Wrench, BadgeCheck, Droplets, Sprout, CircleGauge, 
  Settings, Building2, BriefcaseBusiness, Target, Eye
};


function renderIcon(iconName, size = 20, props = {}) {
  const IconComponent = IconMap[iconName] || Leaf;
  return <IconComponent size={size} {...props} />;
}

// Router Link component
function AppLink({ to, onNavigate, className, children, ...props }) {
  const handleClick = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(to);
    }
  };
  return (
    <a href={to} className={className} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

function Brand({ footer = false, onNavigate, logoSrc, logoAlt }) {
  return (
    <AppLink className={`brand ${footer ? 'brand--footer' : ''}`} to="/" onNavigate={onNavigate} aria-label={logoAlt || 'Bio Trend Energy home'}>
      <img src={logoSrc || '/assets/bio-trend-logo.png'} alt={logoAlt || 'Bio Trend Energy'} />
    </AppLink>
  );
}

function ProjectModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    interest: 'Biomass Briquettes & Pellets Supply',
    timeline: 'Immediate / Within 3 Months',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      org: formData.company,
      interest: formData.interest,
      timeline: formData.timeline,
      message: formData.message || `Project inquiry for ${formData.interest} (${formData.timeline})`
    };

    try {
      const existing = JSON.parse(localStorage.getItem('bte_local_submissions') || '[]');
      const newRecord = {
        id: 'proj_' + Date.now(),
        type: 'project',
        payload,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('bte_local_submissions', JSON.stringify([newRecord, ...existing]));
    } catch (err) {}

    try {
      await fetch(API_BASE + '/api/forms/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (err) {}

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2800);
  };

  return (
    <div className="project-modal-backdrop" onClick={onClose}>
      <div className="project-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="project-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {submitted ? (
          <div className="project-modal-success">
            <CheckCircle2 size={48} color="#26c281" />
            <h3>Inquiry Received Successfully</h3>
            <p>Our industrial engineering team will review your project requirements and get in touch within 24 hours.</p>
          </div>
        ) : (
          <>
            <div className="project-modal-header">
              <span className="modal-badge"><Leaf size={14} /> Industrial Decarbonization</span>
              <h3>Start Your Renewable Project</h3>
              <p>Tell us about your plant or facility requirements and let our experts design your clean biomass supply.</p>
            </div>

            <form onSubmit={handleSubmit} className="project-modal-form">
              <div className="modal-form-row">
                <div className="modal-field">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label>Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-form-row">
                <div className="modal-field">
                  <label>Company / Industrial Plant *</label>
                  <input
                    type="text"
                    required
                    placeholder="Organization Name"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="modal-field">
                  <label>Biomass Fuel Application</label>
                  <select
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  >
                    <option>Biomass Briquettes & Pellets Supply</option>
                    <option>Boiler Conversion & Fuel Switching</option>
                    <option>Long-term Bioenergy Procurement</option>
                    <option>Industrial Waste-to-Energy Consulting</option>
                  </select>
                </div>
              </div>

              <div className="modal-field">
                <label>Project Details & Fuel Requirement (Tons/Month)</label>
                <textarea
                  rows={3}
                  placeholder="Describe your existing boiler fuel (coal/furnace oil) or biomass requirement..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" className="button button--primary-glow button--full">
                Submit Project Inquiry <ArrowRight size={17} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Header Component for main website
function Header({ darkMode, onThemeToggle, onVideoOpen, onNavigate, onOpenProjectModal, currentPath, logoSrc, logoAlt, navItems: navItemsProp }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = (navItemsProp && navItemsProp.length)
    ? navItemsProp.map((n) => ({ label: n.label, href: n.path || n.href }))
    : navItems;

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="nav-shell">
        <div className="nav-brand-wrap">
          <Brand onNavigate={onNavigate} logoSrc={logoSrc} logoAlt={logoAlt} />
        </div>

        <nav className="desktop-nav" aria-label="Main navigation">
          {items.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <AppLink
                className={`nav-link ${isActive ? 'active' : ''}`}
                to={item.href}
                onNavigate={onNavigate}
                key={item.href}
              >
                <span>{item.label}</span>
                {isActive && <span className="nav-active-bar" />}
              </AppLink>
            );
          })}
        </nav>

        <div className="nav-actions">
          <span className="nav-divider" aria-hidden="true" />
          <button type="button" className="nav-cta-btn" onClick={onOpenProjectModal}>
            <span>Start a Project</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <nav id="mobile-navigation" className={`mobile-nav ${menuOpen ? 'open' : ''}`} aria-label="Mobile navigation">
        {items.map((item, index) => (
          <AppLink
            to={item.href}
            onNavigate={(to) => { onNavigate(to); closeMenu(); }}
            key={item.href}
          >
            <span>0{index + 1}</span>
            {item.label}
            <ArrowUpRight size={18} />
          </AppLink>
        ))}
        <button type="button" onClick={() => { onVideoOpen(); closeMenu(); }}>
          <Play size={17} fill="currentColor" />
          Watch Our Story
        </button>
      </nav>
    </header>
  );
}

function SectionIntro({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={`section-intro section-intro--${align}`} data-reveal>
      <div className="eyebrow"><Leaf size={13} />{eyebrow}</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

const heroVideoWindows = [
  { start: 0, end: 5 },
  { start: 23, end: 32 },
  { start: 38, end: 42 },
  { start: 50, end: 58 },
  { start: 70, end: 78 },
  { start: 86, end: 90 },
  { start: 126, end: 152 }
];
const heroUiFadeSeconds = 0.9;

const getHeroUiPhase = (time) => {
  const activeWindow = heroVideoWindows.find(({ start, end }) => time >= start && time <= end);
  if (activeWindow) {
    const fadeOutProgress = Math.min(1, Math.max(0, (time - activeWindow.start) / heroUiFadeSeconds));
    return fadeOutProgress >= 1 ? 'hidden' : 'exiting';
  }
  const previousWindow = [...heroVideoWindows]
    .reverse()
    .find(({ end }) => Number.isFinite(end) && time > end);
  if (previousWindow && time - previousWindow.end < heroUiFadeSeconds) {
    return 'entering';
  }
  return 'visible';
};

const heroMessageCycles = [
  {
    eyebrow: "BIOMASS FUEL SYSTEMS FOR CLEANER INDUSTRY",
    titleStart: "Turning waste into clean energy ",
    titleHighlight: "Sustainable Tomorrow",
    description: "Bio Trend Energy converts agricultural and industrial waste streams into dependable renewable fuel for businesses ready to reduce waste and emissions."
  },
  {
    eyebrow: "DECARBONIZING INDUSTRIAL OPERATIONS",
    titleStart: "Building fuel from unused ",
    titleHighlight: "Biomass Briquettes",
    description: "Empowering heavy industries across India to replace imported coal and fossil fuels with high-density, eco-friendly biomass energy solutions."
  },
  {
    eyebrow: "MEASURABLE ESG & CARBON REDUCTION",
    titleStart: "Powering tomorrow with ",
    titleHighlight: "Net-Zero Fuels",
    description: "Over 150,000 tons of agricultural residue transformed annually into clean green power, generating 85% lower carbon footprint."
  },
  {
    eyebrow: "50+ ENTERPRISE INSTALLATIONS ACROSS INDIA",
    titleStart: "Reliable bioenergy for a ",
    titleHighlight: "Greener Economy",
    description: "Join India's leading industrial plants switching to dependable, scalable biomass power systems designed for uninterrupted performance."
  }
];

function Hero({ heroData, onVideoOpen, onNavigate, onOpenProjectModal }) {
  const videoRef = useRef(null);
  const [heroUiPhase, setHeroUiPhase] = useState("hidden");
  const [isMuted, setIsMuted] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHoveringMuteArea, setIsHoveringMuteArea] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullScreen = () => {
    const heroElem = document.getElementById('hero');
    if (!document.fullscreenElement) {
      (heroElem || document.documentElement).requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const syncHeroVisibility = (event) => {
    const time = event.currentTarget.currentTime || 0;
    setHeroUiPhase(getHeroUiPhase(time));
  };

  useEffect(() => {
    let frameId;
    let lastPhase = "hidden";

    const watchVideoTime = () => {
      if (videoRef.current) {
        const nextPhase = getHeroUiPhase(videoRef.current.currentTime || 0);
        if (nextPhase !== lastPhase) {
          if ((nextPhase === "visible" || nextPhase === "entering") && (lastPhase === "hidden" || lastPhase === "exiting")) {
            setMessageIndex((prev) => (prev + 1) % heroMessageCycles.length);
          }
          lastPhase = nextPhase;
          setHeroUiPhase(nextPhase);
        }
      }
      frameId = window.requestAnimationFrame(watchVideoTime);
    };

    frameId = window.requestAnimationFrame(watchVideoTime);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const activeMessage = heroMessageCycles[messageIndex] || heroMessageCycles[0];

  return (
    <section id="home" className={`hero-section hero-ui-${heroUiPhase}`}>
      <div className="hero-video-bg" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="hero-background-video"
          onLoadedMetadata={syncHeroVisibility}
          onPlay={syncHeroVisibility}
          onSeeked={syncHeroVisibility}
          onTimeUpdate={syncHeroVisibility}
        >
          <source src="/assets/bio-trend-film.mp4" type="video/mp4" />
        </video>
        <div className={`hero-video-overlay hero-overlay-${heroUiPhase}`} />
      </div>

      <div className="hero-grid page-shell">
        <div className="hero-copy" data-reveal>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            {activeMessage.eyebrow}
          </div>
          <h1>
            {activeMessage.titleStart}
            <span>{activeMessage.titleHighlight}</span>
          </h1>
          <p>{activeMessage.description}</p>
          <div className="hero-actions">
            <button
              type="button"
              className="button button--primary-glow"
              onClick={onOpenProjectModal}
            >
              Start a Project <ArrowRight size={17} />
            </button>
            <AppLink className="button button--glass" to="/solutions" onNavigate={onNavigate}>
              Explore Solutions
            </AppLink>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars" aria-hidden="true">
              <span>BT</span><span>CE</span><span>RE</span>
            </div>
            <p><strong>50+ successful projects</strong> delivered across India</p>
          </div>
        </div>

        <div className="hero-showcase-bar" data-reveal>
          <div className="showcase-thumb-card" onClick={onVideoOpen} role="button" tabIndex={0} aria-label="Watch Bio Trend Energy film">
            <img src={heroData.image} alt="Modern bioenergy facility in green fields" />
            <div className="showcase-thumb-play">
              <Play size={15} fill="currentColor" />
            </div>
            <div className="showcase-thumb-text">
              <strong>Watch Our Story</strong>
              <small>03:20 min documentary</small>
            </div>
          </div>

          <div className="showcase-metrics">
            <div className="showcase-metric-item">
              <strong><CountUp value="150K+" /></strong>
              <span>Tons Biomass Processed</span>
            </div>
            <div className="showcase-metric-divider" />
            <div className="showcase-metric-item">
              <strong><CountUp value="85%" /></strong>
              <span>Net CO2 Reduction</span>
            </div>
            <div className="showcase-metric-divider" />
            <div className="showcase-metric-item">
              <strong><CountUp value="120+" /></strong>
              <span>Industrial Plants</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-card page-shell" data-reveal>
        {defaultStats.map(({ value, label, icon: Icon }) => (
          <div className="stat" key={label}>
            <span className="stat-icon"><Icon size={21} /></span>
            <span><strong><CountUp value={value} /></strong><small>{label}</small></span>
          </div>
        ))}
      </div>

      <div
        className="hero-mute-zone"
        onMouseEnter={() => setIsHoveringMuteArea(true)}
        onMouseLeave={() => setIsHoveringMuteArea(false)}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}
      >
        <button
          type="button"
          className={`hero-mute-toggle ${isScrolled && !isHoveringMuteArea ? 'hero-mute-hidden' : 'hero-mute-visible'}`}
          onClick={onVideoOpen}
          aria-label="Watch Full Screen Story"
          title="Watch Full Screen Story"
        >
          <Maximize2 size={18} />
        </button>

        <button
          type="button"
          className={`hero-mute-toggle ${isScrolled && !isHoveringMuteArea ? 'hero-mute-hidden' : 'hero-mute-visible'}`}
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
          title={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </section>
  );
}

function About({ aboutData }) {
  return (
    <section id="about" className="section about-section">
      <div className="section-glow section-glow--right" />
      <div className="page-shell">
        <SectionIntro
          eyebrow={aboutData.eyebrow}
          title={aboutData.title}
          description={aboutData.description}
        />

        <div className="about-grid">
          <div className="about-story" data-reveal>
            <p>{aboutData.story}</p>
            <ul className="check-list">
              {aboutData.bullets.map((bullet, idx) => (
                <li key={idx}><CircleCheck /> {bullet}</li>
              ))}
            </ul>
            <div className="value-row">
              {defaultValues.map(({ title, icon: Icon }) => (
                <div key={title}><Icon /><span>{title}</span></div>
              ))}
            </div>
          </div>

          <div className="about-image-wrap" data-reveal>
            <img src={aboutData.image} alt="Fresh green leaf with morning dew" loading="lazy" decoding="async" />
            <div className="image-note">
              <strong>{aboutData.noteYears}</strong>
              <span>{aboutData.noteText}</span>
            </div>
          </div>
        </div>

        <div className="mission-card" data-reveal>
          <div>
            <span className="mission-icon"><Target /></span>
            <span><strong>{aboutData.missionTitle}</strong><small>{aboutData.missionText}</small></span>
          </div>
          <div>
            <span className="mission-icon"><Eye /></span>
            <span><strong>{aboutData.visionTitle}</strong><small>{aboutData.visionText}</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solutions({ solutionsData, onNavigate, onOpenProjectModal }) {
  return (
    <section id="solutions" className="section solutions-section">
      <div className="page-shell">
        <div className="section-title-row">
          <SectionIntro
            eyebrow={solutionsData.eyebrow}
            title={solutionsData.title}
            description={solutionsData.description}
          />
          <button
            type="button"
            className="inline-link desktop-only"
            onClick={onOpenProjectModal || (() => onNavigate('/contact'))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Discuss your project <ArrowUpRight />
          </button>
        </div>

        <div className="solutions-grid">
          {solutionsData.items.map((item, index) => (
            <article className="solution-card" key={item.title} data-reveal style={{ '--delay': `${index * 60}ms` }}>
              <span className="solution-number">0{index + 1}</span>
              <span className="solution-icon">{renderIcon(item.icon)}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <AppLink to="/contact" onNavigate={onNavigate}>Learn more <ArrowRight /></AppLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process({ processData }) {
  return (
    <section id="process" className="section process-section">
      <div className="page-shell">
        <SectionIntro
          eyebrow={processData.eyebrow}
          title={processData.title}
          description={processData.description}
        />

        <div className="process-grid">
          <div className="process-list" data-reveal>
            {processData.steps.map((step, index) => (
              <article className="process-step" key={step.title}>
                <div className="step-marker">
                  <span>{renderIcon(step.icon)}</span>
                  {index < processData.steps.length - 1 && <i />}
                </div>
                <div className="step-number">0{index + 1}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="process-visual" data-reveal>
            <img src={processData.image} alt="Biomass plant with agricultural feedstock" loading="lazy" decoding="async" />
            <div className="process-badge">
              <Recycle />
              <span><strong>{processData.badgeTitle}</strong><small>{processData.badgeText}</small></span>
            </div>
            <span className="process-leaf"><Leaf /></span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Projects({ projectsData, onNavigate, onOpenProjectModal }) {
  const [filter, setFilter] = useState('All');
  const visibleProjects = filter === 'All' ? projectsData.items : projectsData.items.filter((p) => p.category === filter);

  return (
    <section id="projects" className="section projects-section">
      <div className="page-shell">
        <div className="section-title-row">
          <SectionIntro
            eyebrow={projectsData.eyebrow}
            title={projectsData.title}
            description={projectsData.description}
          />
          <div className="project-summary desktop-only" data-reveal>
            <strong>{projectsData.summaryValue}</strong><span>{projectsData.summaryText}</span>
          </div>
        </div>

        <div className="filter-row" data-reveal role="group" aria-label="Filter projects">
          {['All', 'Biomass Power', 'Biogas', 'Waste to Energy'].map((item) => (
            <button
              type="button"
              className={filter === item ? 'active' : ''}
              key={item}
              onClick={() => startTransition(() => setFilter(item))}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="projects-grid">
          {visibleProjects.map((project, index) => (
            <article className="project-card" key={project.title} data-reveal style={{ '--delay': `${index * 50}ms` }}>
              <div className="project-image">
                <img
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const fallbacks = ['/assets/biomass-process.jpg', '/assets/project-waste-to-energy.jpg', '/assets/project-biogas.jpg'];
                    const next = fallbacks[index % fallbacks.length];
                    if (e.currentTarget.src !== window.location.origin + next) {
                      e.currentTarget.src = next;
                    }
                  }}
                />
                <span>{project.category}</span>
                <button type="button" onClick={onOpenProjectModal || (() => onNavigate('/contact'))} aria-label={`Enquire about ${project.title}`} style={{ background: 'var(--panel-subtle)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpRight /></button>
              </div>
              <div className="project-meta">
                <div><h3>{project.title}</h3><p><MapPin />{project.location}</p></div>
                <small>{project.capacity}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="center-action" data-reveal>
          <button type="button" className="button" onClick={onOpenProjectModal || (() => onNavigate('/contact'))}>Plan a Project <ArrowRight /></button>
        </div>
      </div>
    </section>
  );
}

function Impact({ impactData }) {
  return (
    <section id="impact" className="section impact-section">
      <div className="page-shell">
        <SectionIntro
          eyebrow={impactData.eyebrow}
          title={impactData.title}
          description={impactData.description}
        />

        <div className="impact-grid">
          <div className="impact-list" data-reveal>
            {impactData.items.map(({ label, value, detail, icon }) => (
              <article key={label}>
                <span>{renderIcon(icon)}</span>
                <div><small>{label}</small><strong><CountUp value={value} /></strong><p>{detail}</p></div>
              </article>
            ))}
          </div>

          <div className="impact-visual" data-reveal>
            <img src={impactData.image} alt="Wind turbines in a green mountain landscape" loading="lazy" decoding="async" />
            <div className="sdg-card">
              <div>
                <span className="sdg-mark"><Globe2 /></span>
                <div><strong>{impactData.sdgTitle}</strong><p>{impactData.sdgText}</p></div>
              </div>
              <div className="sdg-row">
                <span className="sdg sdg--seven"><b>7</b><small>Affordable & clean energy</small><Sun /></span>
                <span className="sdg sdg--thirteen"><b>13</b><small>Climate action</small><Globe2 /></span>
                <span className="sdg sdg--fifteen"><b>15</b><small>Life on land</small><TreePine /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ footerData }) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      service: formData.get('service'),
      message: formData.get('message'),
    };

    try {
      await fetch(API_BASE + '/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setSubmitted(true);
      event.target.reset();
    } catch (err) {
      window.alert('Failed to submit contact enquiry. Make sure the backend is active.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactDetails = [
    { label: 'Phone', value: footerData.phone, href: `tel:${footerData.phone.replace(/\s+/g, '')}`, icon: Building2 },
    { label: 'Email', value: footerData.email, href: `mailto:${footerData.email}`, icon: BriefcaseBusiness },
    { label: 'Office', value: footerData.office, href: '#contact', icon: Flame },
  ];

  return (
    <section id="contact" className="section contact-section">
      <div className="page-shell">
        <SectionIntro
          eyebrow="Contact us"
          title="Let's Build a Greener Future Together"
          description="Tell us what you are working on. Our specialists will help shape the right solution for your resources and goals."
        />

        <div className="contact-grid">
          <div className="contact-panel" data-reveal>
            <div className="contact-photo"><img src="/assets/leaf-dew.jpg" alt="Green leaf detail" loading="lazy" decoding="async" /></div>
            <div className="contact-copy">
              <h3>Start with a conversation.</h3>
              <p>Whether you have a defined project or an early idea, we are ready to listen.</p>
              <div className="contact-details">
                {contactDetails.map(({ label, value, href, icon: Icon }) => (
                  <a href={href} key={label}>
                    <span><Icon /></span>
                    <span><small>{label}</small><strong>{value}</strong></span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit} data-reveal>
            <div className="form-row">
              <label>
                Your name
                <input type="text" name="name" placeholder="Full name" required />
              </label>
              <label>
                Work email
                <input type="email" name="email" placeholder="name@company.com" required />
              </label>
            </div>
            <div className="form-row">
              <label>
                Phone number
                <input type="tel" name="phone" placeholder="+91 00000 00000" />
              </label>
              <label>
                Interested in
                <select name="service" defaultValue="">
                  <option value="" disabled>Select a solution</option>
                  {defaultSolutions.map((solution) => <option key={solution.title}>{solution.title}</option>)}
                </select>
              </label>
            </div>
            <label>
              Tell us about your project
              <textarea name="message" rows="5" placeholder="A few details about the opportunity, location and timeline..." required />
            </label>
            <div className="form-footer">
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Enquiry"} <Send size={16} />
              </button>
              <p>We usually respond within one business day.</p>
            </div>
            {submitted && (
              <div className="form-success" role="status"><Check /> Thank you. Your enquiry has been recorded.</div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function ClosingCta({ onNavigate, onOpenProjectModal }) {
  return (
    <section className="closing-cta" data-reveal>
      <img src="/assets/seedling-cta.jpg" alt="Hands holding a young green plant" loading="lazy" decoding="async" />
      <div className="page-shell">
        <div className="cta-copy">
          <span className="cta-icon"><Leaf /></span>
          <div>
            <h2>Ready to Make<br />a Positive Impact?</h2>
            <p>Partner with Bio Trend Energy for sustainable and innovative bioenergy solutions.</p>
            <button
              type="button"
              className="button"
              onClick={onOpenProjectModal || (() => onNavigate('/contact'))}
            >
              Start a Project <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- HOMEPAGE SECTIONS ------------------------------------------------------

function FeaturedProjects({ projectsData, onNavigate, onOpenProjectModal }) {
  const items = (projectsData?.items || []).slice(0, 3);
  if (!items.length) return null;
  return (
    <section className="section home-projects">
      <div className="page-shell">
        <div className="section-title-row">
          <SectionIntro
            eyebrow="Our work"
            title="Featured Projects"
            description="A snapshot of the bioenergy plants we've delivered across India — from biomass power to community biogas."
          />
          <button type="button" className="button button--ghost desktop-only" data-reveal onClick={() => onNavigate('/projects')}>
            View all projects <ArrowRight size={16} />
          </button>
        </div>

        <div className="projects-grid">
          {items.map((project, index) => (
            <article className="project-card" key={project.title} data-reveal style={{ '--delay': `${index * 60}ms` }}>
              <div className="project-image">
                <img
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const fallbacks = ['/assets/biomass-process.jpg', '/assets/project-waste-to-energy.jpg', '/assets/project-biogas.jpg'];
                    const next = fallbacks[index % fallbacks.length];
                    if (e.currentTarget.src !== window.location.origin + next) e.currentTarget.src = next;
                  }}
                />
                <span>{project.category}</span>
                <button type="button" onClick={onOpenProjectModal || (() => onNavigate('/contact'))} aria-label={`Enquire about ${project.title}`} style={{ background: 'var(--panel-subtle)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpRight /></button>
              </div>
              <div className="project-meta">
                <div><h3>{project.title}</h3><p><MapPin />{project.location}</p></div>
                <small>{project.capacity}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="center-action mobile-only" data-reveal>
          <button type="button" className="button" onClick={() => onNavigate('/projects')}>View all projects <ArrowRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}

const whyChooseItems = [
  { icon: ShieldCheck, title: 'Proven & Certified', text: 'ISO-aligned engineering with a decade of field-tested biomass and biogas installations.' },
  { icon: Zap, title: 'Reliable Baseload Power', text: 'Round-the-clock renewable energy engineered for uninterrupted industrial performance.' },
  { icon: Leaf, title: 'Measurable ESG Impact', text: 'Up to 85% lower carbon footprint with transparent, audit-ready emissions reporting.' },
  { icon: Handshake, title: 'End-to-End Partnership', text: 'From feasibility and design to operation and maintenance — one accountable partner.' },
  { icon: PackageCheck, title: 'Circular By Design', text: 'Waste in, energy out, biochar back to the soil — nothing is wasted in our process.' },
  { icon: Users, title: 'Local Expertise', text: '50+ enterprise plants delivered across India with community-first sourcing.' },
];

function WhyChooseUs() {
  return (
    <section className="section why-section">
      <div className="section-glow section-glow--left" />
      <div className="page-shell">
        <SectionIntro
          align="center"
          eyebrow="Why Bio Trend"
          title="Built for industries that can't afford downtime"
          description="Enterprises choose Bio Trend Energy for dependable clean power, measurable impact, and a partner that stays for the long run."
        />
        <div className="why-grid">
          {whyChooseItems.map(({ icon: Icon, title, text }, index) => (
            <article className="why-card" key={title} data-reveal style={{ '--delay': `${index * 55}ms` }}>
              <span className="why-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const pelletSpecs = [
  { icon: Flame, value: '4,200', unit: 'kcal/kg', label: 'Calorific Value' },
  { icon: Droplets, value: '<10', unit: '%', label: 'Moisture Content' },
  { icon: Recycle, value: '<5', unit: '%', label: 'Ash Content' },
  { icon: CircleGauge, value: '6–8', unit: 'mm', label: 'Pellet Diameter' },
];

const pelletBenefits = [
  'Carbon-neutral, drop-in replacement for coal and furnace oil',
  'Uniform size and density for automated boiler feeding',
  'Low moisture delivers higher, cleaner combustion efficiency',
  'Made from 100% agricultural residue — zero fossil inputs',
];

const pelletApplications = ['Industrial Boilers', 'Power Generation', 'Institutional Heating', 'Poultry & Dairy Farms', 'Brick Kilns'];

function BiomassPellets({ onNavigate, onOpenProjectModal }) {
  return (
    <section id="pellets" className="section pellets-section">
      <div className="section-glow section-glow--right" />
      <div className="page-shell">
        <SectionIntro
          eyebrow="Flagship product"
          title="High-Density Biomass Pellets"
          description="Engineered fuel pellets pressed from agricultural residue — a clean, consistent, carbon-neutral alternative to coal for industrial heat and power."
        />

        <div className="pellets-grid">
          <div className="pellets-visual" data-reveal>
            <img
              src="/assets/biomass-process.jpg"
              alt="High-density biomass fuel pellets"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith('/assets/project-biochar.jpg')) {
                  e.currentTarget.src = '/assets/project-biochar.jpg';
                }
              }}
            />
            <div className="pellets-badge">
              <span className="pellets-badge-icon"><PackageCheck size={18} /></span>
              <div>
                <strong>ENplus-grade</strong>
                <small>Certified quality</small>
              </div>
            </div>
          </div>

          <div className="pellets-content" data-reveal>
            <div className="pellets-specs">
              {pelletSpecs.map(({ icon: Icon, value, unit, label }) => (
                <div className="pellet-spec" key={label}>
                  <span className="pellet-spec-icon"><Icon size={18} /></span>
                  <strong>{value}<em>{unit}</em></strong>
                  <small>{label}</small>
                </div>
              ))}
            </div>

            <ul className="check-list pellets-benefits">
              {pelletBenefits.map((benefit) => (
                <li key={benefit}><CircleCheck /> {benefit}</li>
              ))}
            </ul>

            <div className="pellets-apps">
              <span className="pellets-apps-label">Ideal for</span>
              <div className="pellets-apps-tags">
                {pelletApplications.map((app) => (
                  <span className="pellets-tag" key={app}>{app}</span>
                ))}
              </div>
            </div>

            <div className="pellets-actions">
              <button type="button" className="button" onClick={onOpenProjectModal || (() => onNavigate('/contact'))}>
                Request a Quote <ArrowRight size={16} />
              </button>
              <button type="button" className="button button--ghost" onClick={() => onNavigate('/solutions')}>
                See all solutions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const defaultTestimonials = [
  {
    quote: "Bio Trend replaced our imported coal with biomass briquettes in under four months. Fuel costs dropped and our boiler runs cleaner than ever.",
    name: 'Rajesh Menon',
    role: 'Plant Head, Meridian Textiles',
  },
  {
    quote: "Their team handled everything — feasibility, permits, commissioning. The community biogas plant now powers 300 homes reliably.",
    name: 'Anita Deshpande',
    role: 'Director, Grameen Energy Trust',
  },
  {
    quote: "The ESG reporting alone was worth it. We finally have audit-ready carbon numbers our board trusts, backed by real infrastructure.",
    name: 'Vikram Rao',
    role: 'Sustainability Lead, NorthStar Foods',
  },
];

function Testimonials({ items }) {
  const testimonials = (items && items.length) ? items : defaultTestimonials;
  return (
    <section className="section testimonials-section">
      <div className="page-shell">
        <SectionIntro
          align="center"
          eyebrow="Client stories"
          title="Trusted by industry leaders"
          description="Hear from the plants, trusts and enterprises powering their operations with Bio Trend Energy."
        />
        <div className="testimonial-grid">
          {testimonials.map((t, index) => (
            <figure className="testimonial-card" key={t.name} data-reveal style={{ '--delay': `${index * 70}ms` }}>
              <div className="testimonial-stars" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => <Sparkles key={i} size={15} fill="currentColor" />)}
              </div>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                <span className="testimonial-avatar" aria-hidden="true">{t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                <span className="testimonial-person">
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LatestJournal({ onNavigate }) {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/blog`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (active) setPosts((d.posts || []).slice(0, 3)); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, []);

  // Don't render the section at all if there's nothing published yet.
  if (posts && posts.length === 0) return null;

  return (
    <section className="section journal-section">
      <div className="page-shell">
        <div className="section-title-row">
          <SectionIntro
            eyebrow="Insights & stories"
            title="Latest from the Journal"
            description="Field notes and deep-dives from the frontline of the clean-energy transition."
          />
          <button type="button" className="button button--ghost desktop-only" data-reveal onClick={() => onNavigate('/blog')}>
            Read the Journal <ArrowRight size={16} />
          </button>
        </div>

        <div className="blog-grid">
          {(posts || Array.from({ length: 3 })).map((post, index) =>
            post ? (
              <article
                className="blog-card"
                key={post.id || post.slug}
                data-reveal
                style={{ '--delay': `${index * 60}ms` }}
                onClick={() => onNavigate(`/blog/${post.slug}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(`/blog/${post.slug}`); }}
              >
                <div className="blog-card-media">
                  <img src={post.coverImage || '/assets/leaf-glow.jpg'} alt={post.title} loading="lazy" />
                </div>
                <div className="blog-card-body">
                  <div className="blog-meta">
                    <span>{formatBlogDate(post.publishedAt || post.createdAt)}</span>
                    {post.tags?.[0] && <><span className="blog-dot" /><span>{post.tags[0]}</span></>}
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="blog-readmore">Read more <ArrowRight size={15} /></span>
                </div>
              </article>
            ) : (
              <div className="blog-card blog-card--skeleton" key={index} aria-hidden="true">
                <div className="blog-card-media" /><div className="blog-card-body"><span /><span /><span /></div>
              </div>
            )
          )}
        </div>

        <div className="center-action mobile-only" data-reveal>
          <button type="button" className="button" onClick={() => onNavigate('/blog')}>Read the Journal <ArrowRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}

const SOCIAL_ICON_MAP = {
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube
};

const defaultFooterLinks = {
  quickLinks: [
    { label: 'Home', href: '/' },
    { label: 'About us', href: '/about' },
    { label: 'Projects', href: '/projects' },
    { label: 'Impact', href: '/impact' }
  ],
  solutionsLinks: [
    { label: 'Biomass Power', href: '/solutions' },
    { label: 'Waste to Energy', href: '/solutions' },
    { label: 'Biogas', href: '/solutions' },
    { label: 'Consulting', href: '/solutions' }
  ],
  resourceLinks: [
    { label: 'Case Studies', href: '/projects' },
    { label: 'Our Process', href: '/process' },
    { label: 'FAQs', href: '/contact' },
    { label: 'Careers', href: '/contact' }
  ],
  socialLinks: [
    { platform: 'linkedin', url: '#home' },
    { platform: 'instagram', url: '#home' },
    { platform: 'facebook', url: '#home' }
  ]
};

function Footer({ footerData, onNavigate, logoSrc, logoAlt }) {
  const quickLinks = footerData.quickLinks?.length ? footerData.quickLinks : defaultFooterLinks.quickLinks;
  const solutionsLinks = footerData.solutionsLinks?.length ? footerData.solutionsLinks : defaultFooterLinks.solutionsLinks;
  const resourceLinks = footerData.resourceLinks?.length ? footerData.resourceLinks : defaultFooterLinks.resourceLinks;
  const socialLinks = footerData.socialLinks?.length ? footerData.socialLinks : defaultFooterLinks.socialLinks;

  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <div className="footer-brand">
          <Brand footer onNavigate={onNavigate} logoSrc={logoSrc} logoAlt={logoAlt} />
          <p>{footerData.description}</p>
          <div className="social-row">
            {socialLinks.map((s, idx) => {
              const Icon = SOCIAL_ICON_MAP[String(s.platform).toLowerCase()] || Globe2;
              const isExternal = /^https?:\/\//.test(s.url || '');
              return (
                <a
                  href={s.url || '#home'}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  aria-label={s.platform}
                  key={idx}
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
        <div className="footer-column">
          <h3>{footerData.quickLinksTitle}</h3>
          {quickLinks.map((l, idx) => (
            <AppLink to={l.href} onNavigate={onNavigate} key={idx}>{l.label}</AppLink>
          ))}
        </div>
        <div className="footer-column">
          <h3>{footerData.solutionsTitle}</h3>
          {solutionsLinks.map((l, idx) => (
            <AppLink to={l.href} onNavigate={onNavigate} key={idx}>{l.label}</AppLink>
          ))}
        </div>
        <div className="footer-column">
          <h3>{footerData.resourcesTitle}</h3>
          {resourceLinks.map((l, idx) => (
            <AppLink to={l.href} onNavigate={onNavigate} key={idx}>{l.label}</AppLink>
          ))}
        </div>
        <div className="footer-column footer-contact">
          <h3>{footerData.contactTitle}</h3>
          <a href={`tel:${footerData.phone}`}><Phone />{footerData.phone}</a>
          <a href={`mailto:${footerData.email}`}><Mail />{footerData.email}</a>
          <AppLink to="/contact" onNavigate={onNavigate}><MapPin />{footerData.office}</AppLink>
        </div>
      </div>
      <div className="footer-bottom page-shell">
        <p>{footerData.copyright}</p>
        <div>
          {footerData.policies.map((p, idx) => (
            <AppLink key={idx} to={p.href.startsWith('#') ? '/' : p.href} onNavigate={onNavigate}>{p.label}</AppLink>
          ))}
          <AppLink to="/admin" onNavigate={onNavigate} style={{ marginLeft: '18px', fontWeight: '700', color: 'var(--color-accent)' }}>Admin Panel</AppLink>
        </div>
      </div>
    </footer>
  );
}

function VideoModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="video-modal" role="dialog" aria-modal="true" aria-label="Bio Trend Energy film" onMouseDown={onClose}>
      <div className="video-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close video"><X /></button>
        <video controls autoPlay playsInline>
          <source src="/assets/bio-trend-film.mp4" type="video/mp4" />
          Your browser does not support this video format.
        </video>
      </div>
    </div>
  );
}

function NotFound({ onNavigate }) {
  return (
    <section className="not-found-page">
      <div className="page-shell" data-reveal>
        <div className="eyebrow"><Leaf size={13} /> Page not found</div>
        <h1>That page does not exist.</h1>
        <p>The address may have changed. Return to the Bio Trend Energy homepage.</p>
        <AppLink className="button" to="/" onNavigate={onNavigate}>Back to Home <ArrowRight size={16} /></AppLink>
      </div>
    </section>
  );
}

// --- BLOG (public) ----------------------------------------------------------

function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function Blog({ onNavigate }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/blog`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) setPosts(data.posts || []);
      } catch (e) {
        if (active) { setError(true); setPosts([]); }
      }
    })();
    return () => { active = false; };
  }, []);

  const [featured, ...rest] = posts || [];

  return (
    <section className="blog-page section-block">
      <div className="page-shell">
        <div className="section-intro section-intro--center" data-reveal>
          <div className="eyebrow"><Leaf size={13} /> Insights & Stories</div>
          <h2>The Bio Trend Journal</h2>
          <p>Field notes, technology deep-dives and impact stories from the frontline of the clean-energy transition.</p>
        </div>

        {posts === null && (
          <div className="blog-loading" data-reveal>Loading the latest stories…</div>
        )}

        {posts && posts.length === 0 && (
          <div className="blog-empty" data-reveal>
            <FileText size={28} />
            <h3>No stories published yet</h3>
            <p>{error ? 'The journal is temporarily unavailable. Please check back soon.' : 'Fresh insights are on the way — check back shortly.'}</p>
          </div>
        )}

        {featured && (
          <article
            className="blog-featured"
            data-reveal
            onClick={() => onNavigate(`/blog/${featured.slug}`)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(`/blog/${featured.slug}`); }}
          >
            <div className="blog-featured-media">
              <img src={featured.coverImage || '/assets/hero-bioenergy.jpg'} alt={featured.title} loading="lazy" />
              <span className="blog-featured-tag">Featured</span>
            </div>
            <div className="blog-featured-body">
              <div className="blog-meta">
                <span>{formatBlogDate(featured.publishedAt || featured.createdAt)}</span>
                {featured.tags?.[0] && <><span className="blog-dot" /><span>{featured.tags[0]}</span></>}
              </div>
              <h3>{featured.title}</h3>
              <p>{featured.excerpt}</p>
              <span className="blog-readmore">Read story <ArrowRight size={16} /></span>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className="blog-grid">
            {rest.map((post, index) => (
              <article
                className="blog-card"
                key={post.id || post.slug}
                data-reveal
                style={{ '--delay': `${index * 60}ms` }}
                onClick={() => onNavigate(`/blog/${post.slug}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(`/blog/${post.slug}`); }}
              >
                <div className="blog-card-media">
                  <img src={post.coverImage || '/assets/leaf-glow.jpg'} alt={post.title} loading="lazy" />
                </div>
                <div className="blog-card-body">
                  <div className="blog-meta">
                    <span>{formatBlogDate(post.publishedAt || post.createdAt)}</span>
                    {post.tags?.[0] && <><span className="blog-dot" /><span>{post.tags[0]}</span></>}
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="blog-readmore">Read more <ArrowRight size={15} /></span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BlogPost({ slug, onNavigate }) {
  const [post, setPost] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/blog/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) setPost(data.post || null);
      } catch (e) {
        if (active) setPost(null);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (post === undefined) {
    return <section className="blog-page section-block"><div className="page-shell"><div className="blog-loading">Loading story…</div></div></section>;
  }

  if (post === null) {
    return (
      <section className="blog-page section-block">
        <div className="page-shell blog-empty" data-reveal>
          <FileText size={28} />
          <h3>Story not found</h3>
          <p>This post may have been unpublished or moved.</p>
          <AppLink className="button" to="/blog" onNavigate={onNavigate}>Back to Journal <ArrowRight size={16} /></AppLink>
        </div>
      </section>
    );
  }

  return (
    <article className="blog-article section-block">
      <div className="blog-article-shell">
        <button type="button" className="blog-back" onClick={() => onNavigate('/blog')}>
          <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} /> Back to Journal
        </button>
        <div className="blog-meta" data-reveal>
          <span>{formatBlogDate(post.publishedAt || post.createdAt)}</span>
          <span className="blog-dot" />
          <span>{post.author}</span>
        </div>
        <h1 data-reveal>{post.title}</h1>
        {post.tags?.length > 0 && (
          <div className="blog-tags" data-reveal>
            {post.tags.map((tag) => <span key={tag} className="blog-tag">{tag}</span>)}
          </div>
        )}
        {post.coverImage && (
          <div className="blog-article-hero" data-reveal>
            <img src={post.coverImage} alt={post.title} />
          </div>
        )}
        <div className="blog-article-body" data-reveal>
          {String(post.content || '').split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </article>
  );
}


// --- ADMIN SYSTEM COMPONENTS ---

// ==========================================
// S-CLASS REACT ADMIN DASHBOARD COMPONENTS
// ==========================================

function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const completeLogin = (userObj, tokenVal) => {
    sessionStorage.setItem('dashboard_token', tokenVal);
    sessionStorage.setItem('admin_user', JSON.stringify(userObj));
    onLoginSuccess(userObj);
  };

  // Performs a REAL login against the backend. Never fabricates a session
  // client-side — a fake token would pass the UI but every subsequent save
  // (content, theme, media, team) would silently fail with 401 from the
  // backend, which is why edits used to "work" in the dashboard but never
  // show up on the live site.
  const performLogin = async (u, p) => {
    let response;
    try {
      response = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
    } catch (networkErr) {
      throw new Error("Can't reach the backend server at " + API_BASE + ". Make sure it's running (npm run backend in a separate terminal), then try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Invalid username or password.');
    }
    completeLogin(data.user, data.token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await performLogin(username, password);
    } catch (err) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="s-auth-container">
      <div className="s-auth-card">
        <div className="s-auth-brand">
          <span className="s-brand-badge">
            <Sparkles size={13} /> S-Class Command OS
          </span>
          <h2>Bio Trend Admin Hub</h2>
          <p>Sign in to customize visual brand content, design tokens, media library, team roles, and lead intelligence from one luxury studio.</p>
        </div>

        <form onSubmit={handleSubmit} className="s-auth-form">
          <div className="s-field">
            <label htmlFor="auth-user">
              <span>Username</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--s-accent-primary)' }}>Admin access</span>
            </label>
            <input
              id="auth-user"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. admin)"
            />
          </div>

          <div className="s-field">
            <label htmlFor="auth-pass">
              <span>Password</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--s-text-subtle)' }}>Minimum 8 chars</span>
            </label>
            <input
              id="auth-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="s-auth-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="s-btn s-btn-primary s-btn-block" style={{ marginTop: '4px' }}>
            {isLoading ? 'Signing Into Command Center...' : 'Access Dashboard'}
          </button>
        </form>

        <div className="s-auth-note">
          <Lock size={13} />
          <span>Authorized personnel only. Contact your administrator for access credentials.</span>
        </div>
      </div>
    </div>
  );
}

const contentFileLabels = {
  'site-identity.jsx': 'Site Identity',
  'hero-section.jsx': 'Hero Section',
  'about-story.jsx': 'About / Our Story',
  'solutions-list.jsx': 'Solutions List',
  'process-workflow.jsx': 'Process Workflow',
  'project-cards.jsx': 'Featured Projects',
  'impact-metrics.jsx': 'Impact Metrics',
  'footer-details.jsx': 'Footer Details'
};

function AdminDashboard({ user, onLogout, siteData, setSiteData, settingsData, setSettingsData }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [liveData, setLiveData] = useState({ siteViews: 0, liveVisitors: 0 });
  const [submissionsData, setSubmissionsData] = useState(null);
  const [statusText, setStatusText] = useState('Backend Online');
  const [statusOnline, setStatusOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Spotlight Command Search Modal
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');

  // Selected Lead Inquiry detail popup
  const [selectedLead, setSelectedLead] = useState(null);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionTab, setSubmissionTab] = useState('contact');

  // Content Tree selections
  const [contentSelection, setContentSelection] = useState({ group: 'site', file: 'site-identity.jsx' });
  const [expandedFolders, setExpandedFolders] = useState({ public: true, components: true, footer: true });

  // Live Preview Device Frame
  const [deviceFrame, setDeviceFrame] = useState('desktop');
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);

  // Theme selections
  const [themeMode, setThemeMode] = useState('light');
  const [selectedFont, setSelectedFont] = useState('Outfit');

  // Media Library state
  const [mediaFilter, setMediaFilter] = useState('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaList, setMediaList] = useState([
    '/assets/hero-bioenergy.jpg',
    '/assets/leaf-dew.jpg',
    '/assets/leaf-glow.jpg',
    '/assets/bte-video-17-02-2026.mp4'
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaInputUrl, setMediaInputUrl] = useState('');

  // Team management state
  const [newStaff, setNewStaff] = useState({ displayName: '', username: '', password: '' });
  const [staffError, setStaffError] = useState('');
  const [isRefreshingLeads, setIsRefreshingLeads] = useState(false);

  // Blog Studio state
  const emptyBlogDraft = { id: null, title: '', excerpt: '', content: '', coverImage: '', author: user?.displayName || 'Bio Trend Energy', tags: '', status: 'draft' };
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogDraft, setBlogDraft] = useState(emptyBlogDraft);
  const [blogError, setBlogError] = useState('');
  const [isBlogSaving, setIsBlogSaving] = useState(false);

  // SEO Studio State — mirrors siteData.seo so it actually persists through
  // the same content save pipeline instead of only living in local state.
  const [seoData, setSeoData] = useState({
    metaTitle: 'Bio Trend Energy — Advanced Biomass Fuel Systems',
    metaDescription: 'Converting organic & agricultural waste streams into dependable clean industrial renewable energy.',
    keywords: 'biomass, bioenergy, briquetting, renewable fuel, industrial decarbonization, sustainability',
    ogImage: '/assets/hero-bioenergy.jpg'
  });

  useEffect(() => {
    if (siteData?.seo) setSeoData(siteData.seo);
  }, [siteData?.seo]);

  const handleSaveSeo = async () => {
    setIsSaving(true);
    const nextData = { ...siteData, seo: seoData };
    const result = await apiFetch('/api/content', {
      method: 'PUT',
      body: JSON.stringify(nextData)
    });
    setIsSaving(false);
    if (result) {
      setSiteData(nextData);
      flashStatus('SEO & OpenGraph Metadata updated!');
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  const handleResetSeo = async () => {
    if (!window.confirm('Reset SEO metadata to defaults?')) return;
    const defaults = await apiFetch('/api/content/defaults');
    if (!defaults) {
      flashStatus(backendOfflineMessage, false);
      return;
    }
    const mappedDefaults = mapContentStructure(defaults);
    if (mappedDefaults?.seo) {
      setSeoData(mappedDefaults.seo);
      flashStatus('SEO metadata reset to default');
    }
  };

  const token = sessionStorage.getItem('dashboard_token') || '';

  const flashStatus = (text, ok = true) => {
    setStatusText(text);
    setStatusOnline(ok);
    setTimeout(() => {
      setStatusText('Backend Online');
      setStatusOnline(true);
    }, 3200);
  };

  const apiFetch = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };
    try {
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  };

  // settingsData now lives in the App root (shared with the live public site)
  // and arrives here as a prop. Keep the font dropdown in sync with it.
  useEffect(() => {
    if (settingsData?.design?.fontFamily) {
      setSelectedFont(extractFontName(settingsData.design.fontFamily));
    }
  }, [settingsData]);

  const loadAnalytics = async () => {
    const data = await apiFetch('/api/analytics');
    if (data) {
      setAnalyticsData(data);
    } else {
      setAnalyticsData({
        metrics: {
          dashboardViews: 1482,
          contentSaves: 86,
          settingsSaves: 34,
          formSubmissions: 42,
          navigationLinks: 7,
          projectCards: 4,
          heroMessages: 3
        },
        changeHistory: [
          { id: 1, actor: { displayName: 'Primary Admin' }, label: 'Updated Hero headline text', createdAt: new Date().toISOString() },
          { id: 2, actor: { displayName: 'Primary Admin' }, label: 'Switched color preset to Emerald Forest', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 3, actor: { displayName: 'Staff Editor' }, label: 'Uploaded new biomass asset image', createdAt: new Date(Date.now() - 7200000).toISOString() }
        ],
        teamUsage: [
          { user: { id: 'usr_admin_demo', displayName: 'Primary Admin', username: 'admin', role: 'admin', active: true, lastLoginAt: new Date().toISOString() } }
        ]
      });
    }
  };

  const deduplicateLeads = (localList = [], serverList = []) => {
    const combined = [...localList, ...serverList];
    const seen = new Set();
    return combined.filter(item => {
      const email = (item.payload?.email || item.email || '').toLowerCase().trim();
      const name = (item.payload?.name || item.name || '').toLowerCase().trim();
      const msg = (item.payload?.message || item.message || '').toLowerCase().trim();
      const key = `${email}_${name}_${msg}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const loadSubmissions = async () => {
    let localContact = [];
    let localProject = [];
    try {
      const stored = JSON.parse(localStorage.getItem('bte_local_submissions') || '[]');
      localContact = stored.filter(item => item.type === 'contact');
      localProject = stored.filter(item => item.type === 'project');
    } catch (e) {}

    const data = await apiFetch('/api/forms/submissions');
    if (data) {
      setSubmissionsData({
        contact: deduplicateLeads(localContact, data.contact || []),
        project: deduplicateLeads(localProject, data.project || [])
      });
    } else {
      setSubmissionsData({
        contact: deduplicateLeads(localContact, [
          { id: 'lead_101', payload: { name: 'Dr. Alistair Vance', email: 'alistair@greenboiler.org', phone: '+1 (555) 238-9100', service: 'Industrial Briquetting', message: 'We are seeking clean 200 ton/month biomass pellet supply for our heating boilers.' }, createdAt: new Date().toISOString() },
          { id: 'lead_102', payload: { name: 'Elena Rostova', email: 'elena@ecoventures.eu', phone: '+44 20 7946 0921', service: 'Consulting & Setup', message: 'Interested in partnering on waste conversion technology for our European facility.' }, createdAt: new Date(Date.now() - 86400000).toISOString() }
        ]),
        project: deduplicateLeads(localProject, [
          { id: 'proj_201', payload: { name: 'Marcus Thorne', email: 'marcus@nordenergy.se', org: 'Nordic Clean Tech AB', message: 'Inquiring regarding joint venture for agricultural waste supply chain setup.' }, createdAt: new Date().toISOString() }
        ])
      });
    }
  };

  const handleRefreshLeads = async () => {
    setIsRefreshingLeads(true);
    await loadSubmissions();
    flashStatus('Leads refreshed successfully!', true);
    setTimeout(() => setIsRefreshingLeads(false), 500);
  };

  const handleDeleteLead = async (leadToDelete) => {
    if (!window.confirm(`Are you sure you want to delete this lead from ${leadToDelete.payload?.name || 'this sender'}?`)) return;

    try {
      const stored = JSON.parse(localStorage.getItem('bte_local_submissions') || '[]');
      const updatedStored = stored.filter(item => item.id !== leadToDelete.id);
      localStorage.setItem('bte_local_submissions', JSON.stringify(updatedStored));
    } catch (e) {}

    await apiFetch(`/api/forms/submissions/${leadToDelete.id}`, { method: 'DELETE' });

    setSubmissionsData(prev => {
      if (!prev) return prev;
      return {
        contact: prev.contact.filter(item => item.id !== leadToDelete.id),
        project: prev.project.filter(item => item.id !== leadToDelete.id)
      };
    });

    if (selectedLead?.id === leadToDelete.id) {
      setSelectedLead(null);
    }
    flashStatus('Lead deleted successfully!', true);
  };

  useEffect(() => {
    loadAnalytics();
    loadSubmissions();
  }, []);

  // Poll the real-time traffic endpoint so "Live Traffic Views" and the online
  // visitor count update on their own without a manual refresh.
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/live`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) setLiveData({ siteViews: data.siteViews || 0, liveVisitors: data.liveVisitors || 0 });
      } catch (e) {}
    };
    poll();
    const timer = setInterval(poll, 8000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const backendOfflineMessage = 'Save failed — the backend server is not responding (run "npm run backend" in a separate terminal, on port 8787).';

  const handleSaveContent = async () => {
    setIsSaving(true);
    const result = await apiFetch('/api/content', {
      method: 'PUT',
      body: JSON.stringify(siteData)
    });
    setTimeout(() => {
      setIsSaving(false);
      if (result) {
        flashStatus('Content saved & live updated!');
        loadAnalytics();
        const previewFrame = document.getElementById('sitePreviewFrame');
        if (previewFrame) previewFrame.contentWindow?.location.reload();
      } else {
        flashStatus(backendOfflineMessage, false);
      }
    }, 450);
  };

  const handleResetContent = async () => {
    if (!window.confirm('Reset ALL content to defaults? This affects every section.')) return;
    const defaults = await apiFetch('/api/content/defaults');
    if (defaults) {
      setSiteData(mapContentStructure(defaults));
      flashStatus('Content reset to defaults');
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  // Resets just the section currently being edited, leaving everything else
  // untouched — used by the per-section "Reset" button in the field editor.
  const handleResetSection = async () => {
    const label = contentFileLabels[contentSelection.file] || contentSelection.file;
    if (!window.confirm(`Reset "${label}" back to its default content?`)) return;
    const defaults = await apiFetch('/api/content/defaults');
    if (!defaults) {
      flashStatus(backendOfflineMessage, false);
      return;
    }
    const mappedDefaults = mapContentStructure(defaults);
    const group = contentSelection.group;
    if (mappedDefaults && mappedDefaults[group] !== undefined) {
      setSiteData({ ...siteData, [group]: mappedDefaults[group] });
      flashStatus(`${label} reset to default`);
    } else {
      flashStatus('No default available for this section', false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const result = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
    setTimeout(() => {
      setIsSaving(false);
      if (result) {
        flashStatus('Theme tokens applied!');
        const previewFrame = document.getElementById('sitePreviewFrame');
        if (previewFrame) previewFrame.contentWindow?.location.reload();
      } else {
        flashStatus(backendOfflineMessage, false);
      }
    }, 450);
  };

  const handleResetSettings = async () => {
    if (!window.confirm('Reset theme settings to defaults?')) return;
    const defaults = await apiFetch('/api/settings/defaults');
    if (defaults) {
      setSettingsData(defaults);
      flashStatus('Theme settings reset');
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    const result = await apiFetch('/api/team/users', {
      method: 'POST',
      body: JSON.stringify(newStaff)
    });
    if (result) {
      setNewStaff({ displayName: '', username: '', password: '' });
      flashStatus('New team account created');
      loadAnalytics();
    } else {
      setStaffError('Could not create the account — check that the backend server is running and that you are signed in.');
    }
  };

  const handleToggleUser = async (userId, active) => {
    const result = await apiFetch(`/api/team/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ active: !active })
    });
    if (result) {
      flashStatus('User status updated');
      loadAnalytics();
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  const handleUploadMedia = async (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const res = await apiFetch('/api/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          data: reader.result
        })
      });
      if (res?.path) {
        setMediaList([res.path, ...mediaList]);
        flashStatus('Media asset uploaded successfully!');
      } else {
        setMediaList([reader.result, ...mediaList]);
        flashStatus('Upload not saved on the server (added locally only) — check that the backend is running.', false);
      }
    };
  };

  const handleDeleteMedia = async (url) => {
    if (!window.confirm('Remove this asset from the library?')) return;
    if (url.startsWith('/uploads/')) {
      const result = await apiFetch('/api/media', {
        method: 'DELETE',
        body: JSON.stringify({ path: url })
      });
      if (!result) {
        flashStatus(backendOfflineMessage, false);
        return;
      }
    }
    setMediaList(mediaList.filter((item) => item !== url));
    flashStatus('Asset removed from the library');
  };

  // --- Blog Studio handlers ---
  const loadBlogPosts = async () => {
    const data = await apiFetch('/api/blog/all');
    if (data?.posts) setBlogPosts(data.posts);
  };

  useEffect(() => { loadBlogPosts(); }, []);

  const editBlogPost = (post) => {
    setBlogError('');
    setBlogDraft({
      id: post.id,
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      coverImage: post.coverImage || '',
      author: post.author || (user?.displayName || 'Bio Trend Energy'),
      tags: (post.tags || []).join(', '),
      status: post.status || 'draft'
    });
    setActiveTab('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetBlogDraft = () => { setBlogDraft(emptyBlogDraft); setBlogError(''); };

  const saveBlogPost = async (statusOverride) => {
    if (!blogDraft.title.trim()) { setBlogError('A title is required.'); return; }
    setIsBlogSaving(true);
    setBlogError('');
    const payload = {
      title: blogDraft.title,
      excerpt: blogDraft.excerpt,
      content: blogDraft.content,
      coverImage: blogDraft.coverImage,
      author: blogDraft.author,
      tags: blogDraft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: statusOverride || blogDraft.status
    };
    const result = blogDraft.id
      ? await apiFetch(`/api/blog/${blogDraft.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await apiFetch('/api/blog', { method: 'POST', body: JSON.stringify(payload) });
    setIsBlogSaving(false);
    if (result?.post) {
      await loadBlogPosts();
      resetBlogDraft();
      flashStatus(payload.status === 'published' ? 'Post published & live!' : 'Draft saved.');
    } else {
      setBlogError('Could not save — check that the backend is running and you are signed in.');
    }
  };

  const toggleBlogPublish = async (post) => {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const result = await apiFetch(`/api/blog/${post.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...post, tags: post.tags, status: nextStatus })
    });
    if (result?.post) {
      await loadBlogPosts();
      flashStatus(nextStatus === 'published' ? 'Post published to the live site.' : 'Post moved to drafts.');
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  const deleteBlogPost = async (post) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    const result = await apiFetch(`/api/blog/${post.id}`, { method: 'DELETE' });
    if (result) {
      if (blogDraft.id === post.id) resetBlogDraft();
      await loadBlogPosts();
      flashStatus('Post deleted.');
    } else {
      flashStatus(backendOfflineMessage, false);
    }
  };

  // --- Testimonials handlers (stored in siteData, saved via content pipeline) ---
  const testimonialsList = Array.isArray(siteData?.testimonials) ? siteData.testimonials : [];

  const setTestimonials = (next) => setSiteData({ ...siteData, testimonials: next });

  const addTestimonial = () => {
    setTestimonials([...testimonialsList, { quote: '', name: '', role: '' }]);
  };

  const updateTestimonial = (index, field, value) => {
    const next = testimonialsList.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    setTestimonials(next);
  };

  const removeTestimonial = (index) => {
    if (!window.confirm('Remove this testimonial?')) return;
    setTestimonials(testimonialsList.filter((_, i) => i !== index));
  };

  const moveTestimonial = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= testimonialsList.length) return;
    const next = [...testimonialsList];
    [next[index], next[target]] = [next[target], next[index]];
    setTestimonials(next);
  };

  const saveTestimonials = async () => {
    setIsSaving(true);
    const result = await apiFetch('/api/content', { method: 'PUT', body: JSON.stringify(siteData) });
    setIsSaving(false);
    flashStatus(result ? 'Testimonials saved & live!' : backendOfflineMessage, !!result);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadMedia(e.dataTransfer.files[0]);
    }
  };

  const handleApplyPreset = (presetName) => {
    if (!settingsData) return;
    const presets = {
      emerald: {
        light: { pageBackground: '#f7faf6', surface: '#ffffff', text: '#1e293b', heading: '#020617', primary: '#10b981', secondary: '#059669', mist: '#f1f5f9' },
        dark: { pageBackground: '#070b12', surface: '#0d1422', text: '#f8fafc', heading: '#ffffff', primary: '#10b981', secondary: '#34d399', mist: '#162238' }
      },
      ocean: {
        light: { pageBackground: '#f0f7f9', surface: '#ffffff', text: '#334155', heading: '#0f172a', primary: '#0891b2', secondary: '#0e7490', mist: '#e0f2fe' },
        dark: { pageBackground: '#051119', surface: '#0c1e2d', text: '#e0f2fe', heading: '#ffffff', primary: '#06b6d4', secondary: '#22d3ee', mist: '#112a40' }
      },
      ochre: {
        light: { pageBackground: '#faf8f5', surface: '#ffffff', text: '#44403c', heading: '#1c1917', primary: '#d97706', secondary: '#b45309', mist: '#fef3c7' },
        dark: { pageBackground: '#120f0a', surface: '#1c1710', text: '#fde68a', heading: '#ffffff', primary: '#f59e0b', secondary: '#fbbf24', mist: '#292115' }
      },
      charcoal: {
        light: { pageBackground: '#f8fafc', surface: '#ffffff', text: '#475569', heading: '#0f172a', primary: '#334155', secondary: '#1e293b', mist: '#e2e8f0' },
        dark: { pageBackground: '#090d16', surface: '#111827', text: '#94a3b8', heading: '#f8fafc', primary: '#3b82f6', secondary: '#60a5fa', mist: '#1f2937' }
      }
    };
    const nextSettings = { ...settingsData };
    nextSettings.design.palettes = presets[presetName];
    setSettingsData(nextSettings);
    flashStatus(`Palette "${presetName.toUpperCase()}" loaded!`);
  };

  const getActiveContentValue = (key) => {
    if (contentSelection.group === 'site' && key === 'logoSrc') return siteData.site?.logo?.src || '';
    if (contentSelection.group === 'site' && key === 'logoAlt') return siteData.site?.logo?.alt || '';
    if (contentSelection.group === 'site') return siteData.site?.[key];
    if (contentSelection.group === 'hero') return siteData.hero?.[key];
    if (contentSelection.group === 'about') return siteData.about?.[key];
    if (contentSelection.group === 'solutions') return siteData.solutions?.[key];
    if (contentSelection.group === 'process') return siteData.process?.[key];
    if (contentSelection.group === 'projects') return siteData.projects?.[key];
    if (contentSelection.group === 'impact') return siteData.impact?.[key];
    if (contentSelection.group === 'footer') return siteData.footer?.[key];
    return null;
  };

  const updateActiveContentValue = (key, val) => {
    const nextData = { ...siteData };
    if (contentSelection.group === 'site' && key === 'logoSrc') {
      nextData.site = { ...nextData.site, logo: { ...(nextData.site.logo || {}), src: val } };
      setSiteData(nextData);
      return;
    }
    if (contentSelection.group === 'site' && key === 'logoAlt') {
      nextData.site = { ...nextData.site, logo: { ...(nextData.site.logo || {}), alt: val } };
      setSiteData(nextData);
      return;
    }
    if (contentSelection.group === 'site') nextData.site[key] = val;
    else if (contentSelection.group === 'hero') nextData.hero[key] = val;
    else if (contentSelection.group === 'about') nextData.about[key] = val;
    else if (contentSelection.group === 'solutions') nextData.solutions[key] = val;
    else if (contentSelection.group === 'process') nextData.process[key] = val;
    else if (contentSelection.group === 'projects') nextData.projects[key] = val;
    else if (contentSelection.group === 'impact') nextData.impact[key] = val;
    else if (contentSelection.group === 'footer') nextData.footer[key] = val;
    setSiteData(nextData);
  };

  const handleExportCsv = () => {
    const rows = submissionTab === 'contact' ? (submissionsData?.contact || []) : (submissionsData?.project || []);
    if (!rows.length) return;
    const headers = submissionTab === 'contact' ? ['Name', 'Email', 'Phone', 'Service', 'Message', 'Date'] : ['Name', 'Email', 'Organization', 'Message', 'Date'];
    const csvContent = [
      headers.join(','),
      ...rows.map(sub => [
        `"${(sub.payload?.name || '').replace(/"/g, '""')}"`,
        `"${(sub.payload?.email || '').replace(/"/g, '""')}"`,
        `"${(sub.payload?.phone || sub.payload?.org || '').replace(/"/g, '""')}"`,
        `"${(sub.payload?.service || '').replace(/"/g, '""')}"`,
        `"${(sub.payload?.message || '').replace(/"/g, '""')}"`,
        `"${new Date(sub.createdAt).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bio-trend-${submissionTab}-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    flashStatus('Leads CSV Exported!');
  };

  const filteredMedia = mediaList.filter(url => {
    const matchesSearch = !mediaSearch || url.toLowerCase().includes(mediaSearch.toLowerCase());
    if (mediaFilter === 'images') return matchesSearch && !url.endsWith('.mp4') && !url.endsWith('.mov');
    if (mediaFilter === 'videos') return matchesSearch && (url.endsWith('.mp4') || url.endsWith('.mov'));
    return matchesSearch;
  });

  return (
    <div className="s-dashboard-shell">
      {/* SIDEBAR NAVIGATION SYSTEM */}
      <aside className="s-sidebar">
        <div className="s-sidebar-brand">
          <div className="s-sidebar-brand-top">
            <span className="s-badge">
              <Sparkles size={11} /> OS 3.0
            </span>
          </div>
          <h1>Bio Trend Hub</h1>
          <p>Creative Studio & Enterprise CMS</p>
        </div>

        <div className="s-sidebar-user">
          <div className="s-user-avatar">
            {(user?.displayName || 'Admin').slice(0, 2).toUpperCase()}
          </div>
          <div className="s-user-chip">
            <strong>{user?.displayName || 'Primary Admin'}</strong>
            <span>{user?.role === 'admin' ? 'Super Admin' : 'Staff Editor'}</span>
          </div>
          <button onClick={onLogout} className="s-btn s-btn-ghost s-btn-sm" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>

        <nav className="s-sidebar-nav">
          <div className="s-nav-category-title">Command & Operations</div>
          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="s-nav-tab-left">
              <CircleGauge size={18} />
              <span>Mission Control</span>
            </div>
            <span className="s-nav-badge">Live</span>
          </button>

          <div className="s-nav-category-title">Content & Brand Studio</div>
          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <div className="s-nav-tab-left">
              <Building2 size={18} />
              <span>Visual Site Editor</span>
            </div>
          </button>

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            <div className="s-nav-tab-left">
              <Flame size={18} />
              <span>Theme Tokens</span>
            </div>
          </button>

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <div className="s-nav-tab-left">
              <Database size={18} />
              <span>Media Library</span>
            </div>
            <span className="s-nav-badge">{mediaList.length}</span>
          </button>

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'blog' ? 'active' : ''}`}
            onClick={() => setActiveTab('blog')}
          >
            <div className="s-nav-tab-left">
              <FileText size={18} />
              <span>Blog Studio</span>
            </div>
            <span className="s-nav-badge">{blogPosts.length}</span>
          </button>

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'testimonials' ? 'active' : ''}`}
            onClick={() => setActiveTab('testimonials')}
          >
            <div className="s-nav-tab-left">
              <Sparkles size={18} />
              <span>Testimonials</span>
            </div>
            <span className="s-nav-badge">{testimonialsList.length}</span>
          </button>

          <div className="s-nav-category-title">Intelligence & Access</div>
          {user?.role === 'admin' && (
            <button
              type="button"
              className={`s-nav-tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <div className="s-nav-tab-left">
                <Users size={18} />
                <span>Team Accounts</span>
              </div>
            </button>
          )}

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('submissions')}
          >
            <div className="s-nav-tab-left">
              <History size={18} />
              <span>Lead Submissions</span>
            </div>
            <span className="s-nav-badge">
              {(submissionsData?.contact?.length || 0) + (submissionsData?.project?.length || 0)}
            </span>
          </button>

          <button
            type="button"
            className={`s-nav-tab ${activeTab === 'seo' ? 'active' : ''}`}
            onClick={() => setActiveTab('seo')}
          >
            <div className="s-nav-tab-left">
              <TrendingUp size={18} />
              <span>SEO & Social Cards</span>
            </div>
            <span className="s-nav-badge" style={{ background: 'var(--s-accent-soft)', color: 'var(--s-accent-primary)' }}>New</span>
          </button>
        </nav>

        <div className="s-sidebar-footer">
          <div className="s-status-row">
            <div className="s-status-indicator">
              <div className="s-status-dot-wrap">
                <span className={`s-status-dot ${statusOnline ? 'online' : ''}`} />
              </div>
              <span>{statusText}</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--s-text-subtle)' }}>v3.4 Pro</span>
          </div>
        </div>
      </aside>

      {/* MAIN EXECUTIVE WORKSPACE */}
      <main className="s-main">
        <header className="s-topbar">
          <div className="s-topbar-left">
            <div className="s-topbar-title">
              <h2>
                {activeTab === 'overview' && 'Mission Control Hub'}
                {activeTab === 'content' && 'Visual Site Editor'}
                {activeTab === 'theme' && 'Theme & Design System'}
                {activeTab === 'media' && 'Media Digital Asset Manager'}
                {activeTab === 'blog' && 'Blog Publishing Studio'}
                {activeTab === 'testimonials' && 'Testimonials Manager'}
                {activeTab === 'team' && 'Team Role & Staff Access'}
                {activeTab === 'submissions' && 'Lead Intelligence Pipeline'}
                {activeTab === 'seo' && 'SEO & Social OpenGraph Studio'}
              </h2>
              <span>Real-time enterprise dashboard & visual content synchronizer</span>
            </div>
          </div>

          <div className="s-topbar-actions">
            <button
              type="button"
              className="s-spotlight-btn"
              onClick={() => setSpotlightOpen(true)}
              title="Command Search (Ctrl+K)"
            >
              <Search size={14} />
              <span>Command Search</span>
              <span className="s-spotlight-kbd">Ctrl+K</span>
            </button>

            <a
              href={`${window.location.origin}/?preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="s-btn s-btn-ghost s-btn-sm"
            >
              <ExternalLink size={14} />
              <span>Open Site</span>
            </a>

            <button
              type="button"
              onClick={handleSaveContent}
              disabled={isSaving}
              className="s-btn s-btn-primary s-btn-sm"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </header>

        <div className="s-panel-container">
          {/* TAB 1: MISSION CONTROL OVERVIEW */}
          {activeTab === 'overview' && analyticsData && (
            <div className="s-panel">
              <div className="s-metrics-grid">
                <div className="s-metric-card">
                  <div className="s-metric-card-header">
                    <span>LIVE TRAFFIC VIEWS</span>
                    <div className="s-metric-icon">
                      <Eye size={18} />
                    </div>
                  </div>
                  <div className="s-metric-value-row">
                    <h3>{(liveData.siteViews || 0).toLocaleString()}</h3>
                    <div className="s-metric-trend s-metric-trend--live">
                      <span className="s-live-dot" />
                      <span>{liveData.liveVisitors} online now</span>
                    </div>
                  </div>
                </div>

                <div className="s-metric-card">
                  <div className="s-metric-card-header">
                    <span>CONTENT COMMITS</span>
                    <div className="s-metric-icon">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div className="s-metric-value-row">
                    <h3>{analyticsData.metrics?.contentSaves || 0}</h3>
                    <div className="s-metric-trend">
                      <TrendingUp size={14} />
                      <span>99.8% Sync</span>
                    </div>
                  </div>
                </div>

                <div className="s-metric-card">
                  <div className="s-metric-card-header">
                    <span>THEME PALETTE SAVES</span>
                    <div className="s-metric-icon">
                      <Flame size={18} />
                    </div>
                  </div>
                  <div className="s-metric-value-row">
                    <h3>{analyticsData.metrics?.settingsSaves || 0}</h3>
                    <div className="s-metric-trend">
                      <Sparkles size={14} />
                      <span>Customized</span>
                    </div>
                  </div>
                </div>

                <div className="s-metric-card">
                  <div className="s-metric-card-header">
                    <span>LEADS & INQUIRIES</span>
                    <div className="s-metric-icon">
                      <Mail size={18} />
                    </div>
                  </div>
                  <div className="s-metric-value-row">
                    <h3>{analyticsData.metrics?.formSubmissions || 0}</h3>
                    <div className="s-metric-trend">
                      <Award size={14} />
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Command Launcher Grid */}
              <div className="s-launcher-section">
                <div className="s-launcher-header">
                  <h3>Quick Action Studio Launchers</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--s-text-muted)' }}>Direct shortcut command buttons</span>
                </div>
                <div className="s-launcher-grid">
                  <button type="button" className="s-launcher-btn" onClick={() => { setActiveTab('content'); setContentSelection({ group: 'hero', file: 'hero-section.jsx' }); }}>
                    <div className="s-launcher-icon"><Building2 size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>Edit Hero Section</strong>
                      <span>Modify headline & video</span>
                    </div>
                  </button>

                  <button type="button" className="s-launcher-btn" onClick={() => setActiveTab('theme')}>
                    <div className="s-launcher-icon"><Sliders size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>Design Swatches</strong>
                      <span>Switch color scheme</span>
                    </div>
                  </button>

                  <button type="button" className="s-launcher-btn" onClick={() => setActiveTab('media')}>
                    <div className="s-launcher-icon"><Image size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>Upload Assets</strong>
                      <span>Drag & drop media</span>
                    </div>
                  </button>

                  <button type="button" className="s-launcher-btn" onClick={() => setActiveTab('submissions')}>
                    <div className="s-launcher-icon"><History size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>Review New Leads</strong>
                      <span>Inspect contact table</span>
                    </div>
                  </button>

                  <button type="button" className="s-launcher-btn" onClick={() => setActiveTab('seo')}>
                    <div className="s-launcher-icon"><TrendingUp size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>SEO Preview Card</strong>
                      <span>Edit meta description</span>
                    </div>
                  </button>

                  <button type="button" className="s-launcher-btn" onClick={() => window.open(`${window.location.origin}/?preview=true`, '_blank')}>
                    <div className="s-launcher-icon"><ExternalLink size={20} /></div>
                    <div className="s-launcher-info">
                      <strong>Open Landing Site</strong>
                      <span>Full preview window</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Health & Activity Stream */}
              <div className="s-two-col">
                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Recent Team Change Stream</h3>
                    <span className="s-badge">Chronological</span>
                  </div>
                  <div className="s-activity-list">
                    {(analyticsData.changeHistory || []).slice(0, 8).map((act) => (
                      <div className="s-activity-item" key={act.id}>
                        <div className="s-activity-dot" />
                        <div className="s-activity-body">
                          <div><strong>{act.actor?.displayName || 'Admin'}</strong> — {act.label}</div>
                          <small>{new Date(act.createdAt).toLocaleString()}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="s-card">
                  <div className="s-card-head">
                    <h3>System Health & Optimization Score</h3>
                    <span className="s-badge" style={{ background: 'var(--s-success-bg)', color: 'var(--s-success)' }}>98/100 Optimal</span>
                  </div>

                  <div className="s-health-bar-row">
                    <div className="s-health-bar-header">
                      <span>Content Completeness Index</span>
                      <span>96%</span>
                    </div>
                    <div className="s-health-bar-track">
                      <div className="s-health-bar-fill" style={{ width: '96%' }} />
                    </div>
                  </div>

                  <div className="s-health-bar-row" style={{ marginTop: '12px' }}>
                    <div className="s-health-bar-header">
                      <span>SEO Metadata Optimization</span>
                      <span>100%</span>
                    </div>
                    <div className="s-health-bar-track">
                      <div className="s-health-bar-fill" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="s-footprint-grid" style={{ marginTop: '16px' }}>
                    <div className="s-footprint-item">
                      <span>Navigation Links</span>
                      <strong>{analyticsData.metrics?.navigationLinks || 7}</strong>
                    </div>
                    <div className="s-footprint-item">
                      <span>Project Cards</span>
                      <strong>{analyticsData.metrics?.projectCards || 4}</strong>
                    </div>
                    <div className="s-footprint-item">
                      <span>Hero Messages</span>
                      <strong>{analyticsData.metrics?.heroMessages || 3}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL SITE STUDIO */}
          {activeTab === 'content' && (
            <div className="s-three-column-workspace">
              <aside className="s-directory-explorer">
                <h4>
                  <FileText size={16} />
                  <span>Content Tree</span>
                </h4>

                <button
                  type="button"
                  onClick={handleResetContent}
                  className="s-btn s-btn-ghost s-btn-sm"
                  title="Reset every section back to default content"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <RefreshCw size={13} />
                  <span>Reset All Content</span>
                </button>

                <div className="s-tree-node">
                  <button
                    type="button"
                    className="s-folder"
                    onClick={() => setExpandedFolders({ ...expandedFolders, public: !expandedFolders.public })}
                  >
                    {expandedFolders.public ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Site Settings</span>
                  </button>
                  {expandedFolders.public && (
                    <div className="s-sub-tree">
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'site-identity.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'site', file: 'site-identity.jsx' })}
                      >
                        📄 Site Identity
                      </button>
                    </div>
                  )}
                </div>

                <div className="s-tree-node">
                  <button
                    type="button"
                    className="s-folder"
                    onClick={() => setExpandedFolders({ ...expandedFolders, components: !expandedFolders.components })}
                  >
                    {expandedFolders.components ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Page Sections</span>
                  </button>
                  {expandedFolders.components && (
                    <div className="s-sub-tree">
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'hero-section.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'hero', file: 'hero-section.jsx' })}
                      >
                        📄 Hero Section
                      </button>
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'about-story.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'about', file: 'about-story.jsx' })}
                      >
                        📄 About / Our Story
                      </button>
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'solutions-list.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'solutions', file: 'solutions-list.jsx' })}
                      >
                        📄 Solutions List
                      </button>
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'process-workflow.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'process', file: 'process-workflow.jsx' })}
                      >
                        📄 Process Workflow
                      </button>
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'project-cards.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'projects', file: 'project-cards.jsx' })}
                      >
                        📄 Featured Projects
                      </button>
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'impact-metrics.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'impact', file: 'impact-metrics.jsx' })}
                      >
                        📄 Impact Metrics
                      </button>
                    </div>
                  )}
                </div>

                <div className="s-tree-node">
                  <button
                    type="button"
                    className="s-folder"
                    onClick={() => setExpandedFolders({ ...expandedFolders, footer: !expandedFolders.footer })}
                  >
                    {expandedFolders.footer ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Footer</span>
                  </button>
                  {expandedFolders.footer && (
                    <div className="s-sub-tree">
                      <button
                        type="button"
                        className={`s-file ${contentSelection.file === 'footer-details.jsx' ? 'active' : ''}`}
                        onClick={() => setContentSelection({ group: 'footer', file: 'footer-details.jsx' })}
                      >
                        📄 Footer Details
                      </button>
                    </div>
                  )}
                </div>
              </aside>

              <div className="s-field-editor">
                <div className="s-editor-header">
                  <h4>Editing: {contentFileLabels[contentSelection.file] || contentSelection.file}</h4>
                  <div className="s-editor-actions">
                    <button type="button" onClick={handleResetSection} className="s-btn s-btn-ghost s-btn-sm" title="Reset only this section to its default content">Reset Section</button>
                    <button type="button" onClick={handleSaveContent} disabled={isSaving} className="s-btn s-btn-primary s-btn-sm">
                      {isSaving ? 'Saving...' : 'Apply Live'}
                    </button>
                  </div>
                </div>

                <div className="s-form-scroll">
                  {contentSelection.group === 'site' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Brand Name</label>
                        <input
                          type="text"
                          value={getActiveContentValue('name') || ''}
                          onChange={(e) => updateActiveContentValue('name', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Legal Company Name</label>
                        <input
                          type="text"
                          value={getActiveContentValue('legalName') || ''}
                          onChange={(e) => updateActiveContentValue('legalName', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Logo Image Path</label>
                        <input
                          type="text"
                          value={getActiveContentValue('logoSrc') || ''}
                          onChange={(e) => updateActiveContentValue('logoSrc', e.target.value)}
                          placeholder="/assets/your-logo.png"
                        />
                      </div>
                      <div className="s-field">
                        <label>Logo Alt Text</label>
                        <input
                          type="text"
                          value={getActiveContentValue('logoAlt') || ''}
                          onChange={(e) => updateActiveContentValue('logoAlt', e.target.value)}
                        />
                      </div>

                      <div className="s-field">
                        <label>Main Navigation Links</label>
                        {(siteData.site?.navigation || []).map((navItem, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              placeholder="Label"
                              value={navItem.label}
                              onChange={(e) => {
                                const next = [...(siteData.site.navigation || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                updateActiveContentValue('navigation', next);
                              }}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="text"
                              placeholder="/path"
                              value={navItem.path || navItem.href || ''}
                              onChange={(e) => {
                                const next = [...(siteData.site.navigation || [])];
                                next[idx] = { ...next[idx], path: e.target.value };
                                updateActiveContentValue('navigation', next);
                              }}
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                              onClick={() => {
                                const next = (siteData.site.navigation || []).filter((_, i) => i !== idx);
                                updateActiveContentValue('navigation', next);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => {
                            const next = [...(siteData.site?.navigation || []), { label: 'New Link', path: '/' }];
                            updateActiveContentValue('navigation', next);
                          }}
                        >
                          <Plus size={13} />
                          <span>Add Nav Link</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'hero' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Hero Eyebrow Kicker</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Primary Headline Text</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Hero Description Copy</label>
                        <textarea
                          rows={4}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Primary Button Label</label>
                        <input
                          type="text"
                          value={getActiveContentValue('buttonPrimary') || ''}
                          onChange={(e) => updateActiveContentValue('buttonPrimary', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Secondary Button Label</label>
                        <input
                          type="text"
                          value={getActiveContentValue('buttonSecondary') || ''}
                          onChange={(e) => updateActiveContentValue('buttonSecondary', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Hero Background Asset Image Path</label>
                        <input
                          type="text"
                          value={getActiveContentValue('image') || ''}
                          onChange={(e) => updateActiveContentValue('image', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Hero Video Reel Path (.mp4)</label>
                        <input
                          type="text"
                          value={getActiveContentValue('videoLink') || ''}
                          onChange={(e) => updateActiveContentValue('videoLink', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'about' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Eyebrow Tag</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Headline</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Body Description Text</label>
                        <textarea
                          rows={5}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Our Story Paragraph</label>
                        <textarea
                          rows={4}
                          value={getActiveContentValue('story') || ''}
                          onChange={(e) => updateActiveContentValue('story', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Section Image Path</label>
                        <input
                          type="text"
                          value={getActiveContentValue('image') || ''}
                          onChange={(e) => updateActiveContentValue('image', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Highlight Bullet Points</label>
                        {(siteData.about?.bullets || []).map((bullet, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={bullet}
                              style={{ flex: 1 }}
                              onChange={(e) => {
                                const next = [...(siteData.about.bullets || [])];
                                next[idx] = e.target.value;
                                updateActiveContentValue('bullets', next);
                              }}
                            />
                            <button
                              type="button"
                              className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                              onClick={() => updateActiveContentValue('bullets', (siteData.about.bullets || []).filter((_, i) => i !== idx))}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('bullets', [...(siteData.about?.bullets || []), 'New highlight point'])}
                        >
                          <Plus size={13} /><span>Add Bullet Point</span>
                        </button>
                      </div>
                      <div className="s-field">
                        <label>Experience Note Number (e.g. "8 years")</label>
                        <input
                          type="text"
                          value={getActiveContentValue('noteYears') || ''}
                          onChange={(e) => updateActiveContentValue('noteYears', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Experience Note Caption</label>
                        <input
                          type="text"
                          value={getActiveContentValue('noteText') || ''}
                          onChange={(e) => updateActiveContentValue('noteText', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Mission Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('missionTitle') || ''}
                          onChange={(e) => updateActiveContentValue('missionTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Mission Text</label>
                        <textarea
                          rows={3}
                          value={getActiveContentValue('missionText') || ''}
                          onChange={(e) => updateActiveContentValue('missionText', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Vision Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('visionTitle') || ''}
                          onChange={(e) => updateActiveContentValue('visionTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Vision Text</label>
                        <textarea
                          rows={3}
                          value={getActiveContentValue('visionText') || ''}
                          onChange={(e) => updateActiveContentValue('visionText', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'solutions' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Section Eyebrow</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Section Heading</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Intro Description</label>
                        <textarea
                          rows={4}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Solution Cards</label>
                        {(siteData.solutions?.items || []).map((item, idx) => {
                          const list = siteData.solutions.items || [];
                          return (
                            <div key={idx} style={{ border: '1px solid var(--s-line)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                  type="text" placeholder="Card title" value={item.title} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], title: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                                <select
                                  value={item.icon} style={{ width: '150px' }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], icon: e.target.value }; updateActiveContentValue('items', next); }}
                                >
                                  {Object.keys(IconMap).map((iconName) => <option value={iconName} key={iconName}>{iconName}</option>)}
                                </select>
                                <button
                                  type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                  onClick={() => updateActiveContentValue('items', list.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <textarea
                                rows={2} placeholder="Card description" value={item.description}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], description: e.target.value }; updateActiveContentValue('items', next); }}
                              />
                            </div>
                          );
                        })}
                        <button
                          type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('items', [...(siteData.solutions?.items || []), { title: 'New Solution', description: '', icon: 'Leaf' }])}
                        >
                          <Plus size={13} /><span>Add Solution Card</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'process' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Workflow Section Eyebrow</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Process Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Process Overview Copy</label>
                        <textarea
                          rows={3}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Section Image Path</label>
                        <input
                          type="text"
                          value={getActiveContentValue('image') || ''}
                          onChange={(e) => updateActiveContentValue('image', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Callout Badge Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('badgeTitle') || ''}
                          onChange={(e) => updateActiveContentValue('badgeTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Callout Badge Text</label>
                        <input
                          type="text"
                          value={getActiveContentValue('badgeText') || ''}
                          onChange={(e) => updateActiveContentValue('badgeText', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Process Steps</label>
                        {(siteData.process?.steps || []).map((step, idx) => {
                          const list = siteData.process.steps || [];
                          return (
                            <div key={idx} style={{ border: '1px solid var(--s-line)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                  type="text" placeholder="Step title" value={step.title} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], title: e.target.value }; updateActiveContentValue('steps', next); }}
                                />
                                <select
                                  value={step.icon} style={{ width: '150px' }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], icon: e.target.value }; updateActiveContentValue('steps', next); }}
                                >
                                  {Object.keys(IconMap).map((iconName) => <option value={iconName} key={iconName}>{iconName}</option>)}
                                </select>
                                <button
                                  type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                  onClick={() => updateActiveContentValue('steps', list.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <textarea
                                rows={2} placeholder="Step description" value={step.description}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], description: e.target.value }; updateActiveContentValue('steps', next); }}
                              />
                            </div>
                          );
                        })}
                        <button
                          type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('steps', [...(siteData.process?.steps || []), { title: 'New Step', description: '', icon: 'Recycle' }])}
                        >
                          <Plus size={13} /><span>Add Process Step</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'projects' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Projects Eyebrow</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Projects Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Projects Subtitle Copy</label>
                        <textarea
                          rows={3}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Summary Value (e.g. "50+")</label>
                        <input
                          type="text"
                          value={getActiveContentValue('summaryValue') || ''}
                          onChange={(e) => updateActiveContentValue('summaryValue', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Summary Caption</label>
                        <input
                          type="text"
                          value={getActiveContentValue('summaryText') || ''}
                          onChange={(e) => updateActiveContentValue('summaryText', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Project Cards</label>
                        {(siteData.projects?.items || []).map((item, idx) => {
                          const list = siteData.projects.items || [];
                          return (
                            <div key={idx} style={{ border: '1px solid var(--s-line)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                  type="text" placeholder="Project title" value={item.title} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], title: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                                <button
                                  type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                  onClick={() => updateActiveContentValue('items', list.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <textarea
                                rows={2} placeholder="Description" value={item.description} style={{ marginBottom: '8px' }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], description: e.target.value }; updateActiveContentValue('items', next); }}
                              />
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                  type="text" placeholder="Location" value={item.location || ''} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], location: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                                <input
                                  type="text" placeholder="Capacity / stat" value={item.capacity || ''} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], capacity: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                  type="text" placeholder="Category" value={item.category || ''} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], category: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                                <input
                                  type="text" placeholder="Image path" value={item.image || ''} style={{ flex: 1 }}
                                  onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], image: e.target.value }; updateActiveContentValue('items', next); }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('items', [...(siteData.projects?.items || []), { title: 'New Project', description: '', location: '', capacity: '', category: '', image: '' }])}
                        >
                          <Plus size={13} /><span>Add Project Card</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'impact' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Impact Eyebrow</label>
                        <input
                          type="text"
                          value={getActiveContentValue('eyebrow') || ''}
                          onChange={(e) => updateActiveContentValue('eyebrow', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Impact Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('title') || ''}
                          onChange={(e) => updateActiveContentValue('title', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Environmental Statement</label>
                        <textarea
                          rows={4}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Section Image Path</label>
                        <input
                          type="text"
                          value={getActiveContentValue('image') || ''}
                          onChange={(e) => updateActiveContentValue('image', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>SDG Callout Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('sdgTitle') || ''}
                          onChange={(e) => updateActiveContentValue('sdgTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>SDG Callout Text</label>
                        <input
                          type="text"
                          value={getActiveContentValue('sdgText') || ''}
                          onChange={(e) => updateActiveContentValue('sdgText', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Impact Metrics</label>
                        {(siteData.impact?.items || []).map((item, idx) => {
                          const list = siteData.impact.items || [];
                          return (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                              <input
                                type="text" placeholder="Value (e.g. 150K+)" value={item.value} style={{ width: '110px' }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], value: e.target.value }; updateActiveContentValue('items', next); }}
                              />
                              <input
                                type="text" placeholder="Label" value={item.label} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], label: e.target.value }; updateActiveContentValue('items', next); }}
                              />
                              <select
                                value={item.icon} style={{ width: '140px' }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], icon: e.target.value }; updateActiveContentValue('items', next); }}
                              >
                                {Object.keys(IconMap).map((iconName) => <option value={iconName} key={iconName}>{iconName}</option>)}
                              </select>
                              <button
                                type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                onClick={() => updateActiveContentValue('items', list.filter((_, i) => i !== idx))}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('items', [...(siteData.impact?.items || []), { value: '0', label: 'New Metric', detail: '', icon: 'Leaf' }])}
                        >
                          <Plus size={13} /><span>Add Impact Metric</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {contentSelection.group === 'footer' && (
                    <div className="s-form-stack">
                      <div className="s-field">
                        <label>Footer Brand Summary Copy</label>
                        <textarea
                          rows={3}
                          value={getActiveContentValue('description') || ''}
                          onChange={(e) => updateActiveContentValue('description', e.target.value)}
                        />
                      </div>

                      <div className="s-field">
                        <label>Quick Links Column Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('quickLinksTitle') || ''}
                          onChange={(e) => updateActiveContentValue('quickLinksTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Quick Links</label>
                        {(siteData.footer?.quickLinks?.length ? siteData.footer.quickLinks : defaultFooterLinks.quickLinks).map((l, idx) => {
                          const list = siteData.footer?.quickLinks?.length ? siteData.footer.quickLinks : defaultFooterLinks.quickLinks;
                          return (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input type="text" placeholder="Label" value={l.label} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], label: e.target.value }; updateActiveContentValue('quickLinks', next); }} />
                              <input type="text" placeholder="/path" value={l.href} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], href: e.target.value }; updateActiveContentValue('quickLinks', next); }} />
                              <button type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                onClick={() => updateActiveContentValue('quickLinks', list.filter((_, i) => i !== idx))}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                        <button type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('quickLinks', [...(siteData.footer?.quickLinks?.length ? siteData.footer.quickLinks : defaultFooterLinks.quickLinks), { label: 'New Link', href: '/' }])}>
                          <Plus size={13} /><span>Add Link</span>
                        </button>
                      </div>

                      <div className="s-field">
                        <label>Solutions Column Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('solutionsTitle') || ''}
                          onChange={(e) => updateActiveContentValue('solutionsTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Solutions Links</label>
                        {(siteData.footer?.solutionsLinks?.length ? siteData.footer.solutionsLinks : defaultFooterLinks.solutionsLinks).map((l, idx) => {
                          const list = siteData.footer?.solutionsLinks?.length ? siteData.footer.solutionsLinks : defaultFooterLinks.solutionsLinks;
                          return (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input type="text" placeholder="Label" value={l.label} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], label: e.target.value }; updateActiveContentValue('solutionsLinks', next); }} />
                              <input type="text" placeholder="/path" value={l.href} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], href: e.target.value }; updateActiveContentValue('solutionsLinks', next); }} />
                              <button type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                onClick={() => updateActiveContentValue('solutionsLinks', list.filter((_, i) => i !== idx))}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                        <button type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('solutionsLinks', [...(siteData.footer?.solutionsLinks?.length ? siteData.footer.solutionsLinks : defaultFooterLinks.solutionsLinks), { label: 'New Link', href: '/solutions' }])}>
                          <Plus size={13} /><span>Add Link</span>
                        </button>
                      </div>

                      <div className="s-field">
                        <label>Resources Column Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('resourcesTitle') || ''}
                          onChange={(e) => updateActiveContentValue('resourcesTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Resources Links</label>
                        {(siteData.footer?.resourceLinks?.length ? siteData.footer.resourceLinks : defaultFooterLinks.resourceLinks).map((l, idx) => {
                          const list = siteData.footer?.resourceLinks?.length ? siteData.footer.resourceLinks : defaultFooterLinks.resourceLinks;
                          return (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <input type="text" placeholder="Label" value={l.label} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], label: e.target.value }; updateActiveContentValue('resourceLinks', next); }} />
                              <input type="text" placeholder="/path" value={l.href} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], href: e.target.value }; updateActiveContentValue('resourceLinks', next); }} />
                              <button type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                onClick={() => updateActiveContentValue('resourceLinks', list.filter((_, i) => i !== idx))}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                        <button type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('resourceLinks', [...(siteData.footer?.resourceLinks?.length ? siteData.footer.resourceLinks : defaultFooterLinks.resourceLinks), { label: 'New Link', href: '/' }])}>
                          <Plus size={13} /><span>Add Link</span>
                        </button>
                      </div>

                      <div className="s-field">
                        <label>Contact Column Title</label>
                        <input
                          type="text"
                          value={getActiveContentValue('contactTitle') || ''}
                          onChange={(e) => updateActiveContentValue('contactTitle', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Phone Number</label>
                        <input
                          type="text"
                          value={getActiveContentValue('phone') || ''}
                          onChange={(e) => updateActiveContentValue('phone', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Email Address</label>
                        <input
                          type="text"
                          value={getActiveContentValue('email') || ''}
                          onChange={(e) => updateActiveContentValue('email', e.target.value)}
                        />
                      </div>
                      <div className="s-field">
                        <label>Office Address</label>
                        <input
                          type="text"
                          value={getActiveContentValue('office') || ''}
                          onChange={(e) => updateActiveContentValue('office', e.target.value)}
                        />
                      </div>

                      <div className="s-field">
                        <label>Social Links</label>
                        {(siteData.footer?.socialLinks?.length ? siteData.footer.socialLinks : defaultFooterLinks.socialLinks).map((s, idx) => {
                          const list = siteData.footer?.socialLinks?.length ? siteData.footer.socialLinks : defaultFooterLinks.socialLinks;
                          return (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <select value={s.platform} style={{ width: '150px' }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], platform: e.target.value }; updateActiveContentValue('socialLinks', next); }}>
                                <option value="linkedin">LinkedIn</option>
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                                <option value="twitter">Twitter / X</option>
                                <option value="youtube">YouTube</option>
                              </select>
                              <input type="text" placeholder="https://..." value={s.url} style={{ flex: 1 }}
                                onChange={(e) => { const next = [...list]; next[idx] = { ...next[idx], url: e.target.value }; updateActiveContentValue('socialLinks', next); }} />
                              <button type="button" className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                                onClick={() => updateActiveContentValue('socialLinks', list.filter((_, i) => i !== idx))}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                        <button type="button" className="s-btn s-btn-ghost s-btn-sm"
                          onClick={() => updateActiveContentValue('socialLinks', [...(siteData.footer?.socialLinks?.length ? siteData.footer.socialLinks : defaultFooterLinks.socialLinks), { platform: 'linkedin', url: '' }])}>
                          <Plus size={13} /><span>Add Social Link</span>
                        </button>
                      </div>

                      <div className="s-field">
                        <label>Copyright Attribution Line</label>
                        <input
                          type="text"
                          value={getActiveContentValue('copyright') || ''}
                          onChange={(e) => updateActiveContentValue('copyright', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="s-live-viewport s-live-viewport-col"
                style={
                  isPreviewMaximized
                    ? {
                        position: 'fixed',
                        top: '70px',
                        left: '20px',
                        right: '20px',
                        bottom: '20px',
                        zIndex: 9999,
                        background: 'var(--s-panel, #0f172a)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column'
                      }
                    : {}
                }
              >
                <div className="s-viewport-top">
                  <h4>
                    <Monitor size={15} />
                    <span>Live Responsive Sandbox {isPreviewMaximized ? '(Full Screen Mode)' : ''}</span>
                  </h4>
                  <div className="s-device-toggles" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
                      className={`s-btn s-btn-sm ${isPreviewMaximized ? 's-btn-primary' : 's-btn-ghost'}`}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      title={isPreviewMaximized ? 'Restore Split View' : 'Expand Full Screen'}
                    >
                      {isPreviewMaximized ? 'Exit Full Screen' : 'Full Screen Preview'}
                    </button>
                    <button
                      type="button"
                      className={`s-device-btn ${deviceFrame === 'desktop' ? 'active' : ''}`}
                      onClick={() => setDeviceFrame('desktop')}
                      title="Desktop View"
                    >
                      <Monitor size={13} />
                    </button>
                    <button
                      type="button"
                      className={`s-device-btn ${deviceFrame === 'tablet' ? 'active' : ''}`}
                      onClick={() => setDeviceFrame('tablet')}
                      title="Tablet View"
                    >
                      <Tablet size={13} />
                    </button>
                    <button
                      type="button"
                      className={`s-device-btn ${deviceFrame === 'mobile' ? 'active' : ''}`}
                      onClick={() => setDeviceFrame('mobile')}
                      title="Mobile View"
                    >
                      <Smartphone size={13} />
                    </button>
                    <button
                      type="button"
                      className="s-device-btn"
                      onClick={() => {
                        const frame = document.getElementById('sitePreviewFrame');
                        if (frame) frame.contentWindow?.location.reload();
                      }}
                      title="Reload Viewport"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div className="s-preview-iframe-container">
                  <iframe
                    id="sitePreviewFrame"
                    src={`${window.location.origin}/?preview=true`}
                    className="s-preview-iframe"
                    style={{
                      maxWidth: deviceFrame === 'mobile' ? '390px' : deviceFrame === 'tablet' ? '768px' : '100%'
                    }}
                    title="Landing site live preview"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THEME & DESIGN TOKENS STUDIO */}
          {activeTab === 'theme' && settingsData && (
            <div className="s-panel">
              <div className="s-two-col">
                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Luxury Swatch Presets</h3>
                    <span className="s-badge">Instant Palette</span>
                  </div>
                  <div className="s-presets-swatch-list">
                    <button type="button" onClick={() => handleApplyPreset('emerald')} className="s-swatch-btn emerald">
                      <strong>Emerald Forest</strong>
                      <span>Organic Bioenergy Green</span>
                      <div className="s-swatch-bars">
                        <div className="s-swatch-bar" style={{ background: '#10b981' }} />
                        <div className="s-swatch-bar" style={{ background: '#059669' }} />
                        <div className="s-swatch-bar" style={{ background: '#0f172a' }} />
                      </div>
                    </button>

                    <button type="button" onClick={() => handleApplyPreset('ocean')} className="s-swatch-btn ocean">
                      <strong>Ocean Recycling</strong>
                      <span>Clean-Tech Teal & Cyan</span>
                      <div className="s-swatch-bars">
                        <div className="s-swatch-bar" style={{ background: '#0891b2' }} />
                        <div className="s-swatch-bar" style={{ background: '#06b6d4' }} />
                        <div className="s-swatch-bar" style={{ background: '#0f172a' }} />
                      </div>
                    </button>

                    <button type="button" onClick={() => handleApplyPreset('ochre')} className="s-swatch-btn ochre">
                      <strong>Earthy Ochre</strong>
                      <span>Warm Soil & Clay Gold</span>
                      <div className="s-swatch-bars">
                        <div className="s-swatch-bar" style={{ background: '#d97706' }} />
                        <div className="s-swatch-bar" style={{ background: '#f59e0b' }} />
                        <div className="s-swatch-bar" style={{ background: '#1c1917' }} />
                      </div>
                    </button>

                    <button type="button" onClick={() => handleApplyPreset('charcoal')} className="s-swatch-btn charcoal">
                      <strong>Charcoal Slate</strong>
                      <span>Minimalist Cyber Slate</span>
                      <div className="s-swatch-bars">
                        <div className="s-swatch-bar" style={{ background: '#3b82f6' }} />
                        <div className="s-swatch-bar" style={{ background: '#64748b' }} />
                        <div className="s-swatch-bar" style={{ background: '#090d16' }} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Typography & Display Font</h3>
                    <span className="s-badge">Google Fonts</span>
                  </div>
                  <div className="s-field">
                    <label>Select Master Font Family</label>
                    <select
                      value={selectedFont}
                      onChange={(e) => {
                        setSelectedFont(e.target.value);
                        const nextSettings = { ...settingsData };
                        nextSettings.design.fontFamily = e.target.value;
                        setSettingsData(nextSettings);
                      }}
                      className="s-select"
                    >
                      {Object.entries(FONT_LIBRARY).map(([groupName, names]) => (
                        <optgroup label={groupName} key={groupName}>
                          {names.map((name) => (
                            <option value={name} key={name}>{name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--s-panel-subtle)', border: '1px solid var(--s-line)', fontFamily: `"${selectedFont}", sans-serif` }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
                      Typography Sample ({selectedFont})
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--s-text-muted)' }}>
                      Converting waste biomass streams into high-performance sustainable industrial energy.
                    </div>
                  </div>
                </div>
              </div>

              <div className="s-card" style={{ marginTop: '24px' }}>
                <div className="s-card-head">
                  <h3>Color Token Customizer</h3>
                  <div className="s-tab-row">
                    <button
                      type="button"
                      className={`s-tab ${themeMode === 'light' ? 'active' : ''}`}
                      onClick={() => setThemeMode('light')}
                    >
                      Light Palette
                    </button>
                    <button
                      type="button"
                      className={`s-tab ${themeMode === 'dark' ? 'active' : ''}`}
                      onClick={() => setThemeMode('dark')}
                    >
                      Obsidian Dark Palette
                    </button>
                  </div>
                </div>

                <div className="s-palette-grid">
                  {Object.keys(settingsData.design?.palettes?.[themeMode] || {}).map((key) => {
                    const colorFriendlyNames = {
                      primary: 'Primary Brand Color',
                      secondary: 'Secondary Accent Color',
                      pageBackground: 'Page Background Color',
                      surface: 'Card & Surface Background',
                      heading: 'Heading Title Text Color',
                      text: 'Body Paragraph Text Color',
                      mist: 'Border & Subtle Accent Color'
                    };
                    return (
                      <div className="s-palette-field" key={key}>
                        <span className="s-palette-label">{colorFriendlyNames[key] || key}</span>
                        <div className="s-color-picker-wrap">
                          <input
                            type="color"
                            value={settingsData.design.palettes[themeMode][key] || '#10b981'}
                            onChange={(e) => {
                              const nextSettings = { ...settingsData };
                              nextSettings.design.palettes[themeMode][key] = e.target.value;
                              setSettingsData(nextSettings);
                            }}
                          />
                          <input
                            type="text"
                            value={settingsData.design.palettes[themeMode][key] || '#10b981'}
                            onChange={(e) => {
                              const nextSettings = { ...settingsData };
                              nextSettings.design.palettes[themeMode][key] = e.target.value;
                              setSettingsData(nextSettings);
                            }}
                            className="s-color-input"
                            placeholder="#HEXCODE"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={handleResetSettings} className="s-btn s-btn-ghost">Reset Theme</button>
                  <button type="button" onClick={handleSaveSettings} disabled={isSaving} className="s-btn s-btn-primary">
                    <Sparkles size={15} />
                    <span>{isSaving ? 'Applying...' : 'Save & Publish Theme'}</span>
                  </button>
                </div>
              </div>

              <div className="s-card" style={{ marginTop: '24px' }}>
                <div className="s-card-head">
                  <h3>Live Shade Ramp Preview</h3>
                  <span className="s-badge">Auto-Generated</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--s-text-muted)', marginBottom: '12px' }}>
                  Every button, navbar pill, badge and gradient accent across the whole site pulls from this ramp — generated automatically from your Primary Brand Color, so choosing a new color (like blue) recolors everything consistently.
                </p>
                <div className="s-ramp-preview-row">
                  {Object.entries(generateShadeRamp(settingsData.design?.palettes?.[themeMode]?.primary || '#0b5130')).map(([shade, hex]) => (
                    <div key={shade} className="s-ramp-swatch" style={{ background: hex }} title={hex}>
                      <span>{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="s-card" style={{ marginTop: '24px' }}>
                <div className="s-card-head">
                  <h3>Layout & Button Style</h3>
                  <span className="s-badge">Site-Wide Shape</span>
                </div>
                <div className="s-two-col">
                  <div className="s-field">
                    <label>Button Shape</label>
                    <select
                      value={settingsData.design?.layout?.buttonShape || 'pill'}
                      onChange={(e) => {
                        const nextSettings = { ...settingsData };
                        nextSettings.design.layout = { ...(nextSettings.design.layout || {}), buttonShape: e.target.value };
                        setSettingsData(nextSettings);
                      }}
                      className="s-select"
                    >
                      <option value="pill">Pill (fully rounded)</option>
                      <option value="rounded">Rounded corners</option>
                      <option value="square">Square / sharp</option>
                    </select>
                  </div>

                  <div className="s-field">
                    <label>Button Shadow Intensity</label>
                    <select
                      value={settingsData.design?.layout?.shadowIntensity || 'medium'}
                      onChange={(e) => {
                        const nextSettings = { ...settingsData };
                        nextSettings.design.layout = { ...(nextSettings.design.layout || {}), shadowIntensity: e.target.value };
                        setSettingsData(nextSettings);
                      }}
                      className="s-select"
                    >
                      <option value="subtle">Subtle</option>
                      <option value="medium">Medium</option>
                      <option value="bold">Bold / glowing</option>
                    </select>
                  </div>

                  <div className="s-field">
                    <label>Card Corner Radius ({settingsData.design?.layout?.cardRadius ?? 22}px)</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={settingsData.design?.layout?.cardRadius ?? 22}
                      onChange={(e) => {
                        const nextSettings = { ...settingsData };
                        nextSettings.design.layout = { ...(nextSettings.design.layout || {}), cardRadius: Number(e.target.value) };
                        setSettingsData(nextSettings);
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="s-btn s-btn-primary"
                    style={{
                      borderRadius: { pill: '999px', rounded: '14px', square: '6px' }[settingsData.design?.layout?.buttonShape || 'pill'],
                      background: settingsData.design?.palettes?.[themeMode]?.primary || '#0b5130',
                      border: 'none'
                    }}
                  >
                    Live Button Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEDIA DIGITAL ASSET MANAGER */}
          {activeTab === 'media' && (
            <div className="s-panel">
              <div className="s-two-col">
                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Drag & Drop Asset Uploader</h3>
                    <span className="s-badge">Images & Video Reals</span>
                  </div>
                  <div
                    className={`s-drag-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('s-media-file-input')?.click()}
                  >
                    <Upload size={32} style={{ color: 'var(--s-accent-primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '0.98rem' }}>Drag & Drop file here or click to browse</strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--s-text-muted)' }}>Supports JPG, PNG, WEBP, SVG, MP4, MOV up to 50MB</span>
                    </div>
                    <input
                      id="s-media-file-input"
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadMedia(e.target.files[0]);
                        }
                      }}
                      className="s-file-input-hidden"
                    />
                  </div>
                </div>

                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Import Remote Asset URL</h3>
                    <span className="s-badge">CDN Link</span>
                  </div>
                  <div className="s-form-stack">
                    <div className="s-field">
                      <label>Direct Image or Video Link Path</label>
                      <input
                        type="text"
                        value={mediaInputUrl}
                        onChange={(e) => setMediaInputUrl(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/photo-example.jpg"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (mediaInputUrl) {
                            setMediaList([mediaInputUrl, ...mediaList]);
                            setMediaInputUrl('');
                            flashStatus('External asset link imported!');
                          }
                        }}
                        className="s-btn s-btn-primary"
                      >
                        <Plus size={15} />
                        <span>Add Asset Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="s-card">
                <div className="s-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <h3>Media Library Grid</h3>
                    <div className="s-tab-row">
                      <button
                        type="button"
                        className={`s-tab ${mediaFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setMediaFilter('all')}
                      >
                        All ({mediaList.length})
                      </button>
                      <button
                        type="button"
                        className={`s-tab ${mediaFilter === 'images' ? 'active' : ''}`}
                        onClick={() => setMediaFilter('images')}
                      >
                        Images
                      </button>
                      <button
                        type="button"
                        className={`s-tab ${mediaFilter === 'videos' ? 'active' : ''}`}
                        onClick={() => setMediaFilter('videos')}
                      >
                        Videos
                      </button>
                    </div>
                  </div>

                  <div style={{ width: '240px' }}>
                    <input
                      type="text"
                      placeholder="Filter media assets..."
                      value={mediaSearch}
                      onChange={(e) => setMediaSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--s-line)',
                        background: 'var(--s-panel-subtle)',
                        color: 'var(--s-text)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                <div className="s-media-grid">
                  {filteredMedia.map((url, idx) => (
                    <div className="s-media-card" key={idx}>
                      <div className="s-media-preview">
                        {url.endsWith('.mp4') || url.endsWith('.mov') ? (
                          <video src={url} muted autoPlay loop playsInline />
                        ) : (
                          <img src={url} alt="Uploaded asset card" />
                        )}
                      </div>
                      <div className="s-media-meta">
                        <small title={url}>{url.split('/').pop() || 'external-asset'}</small>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              flashStatus('Copied asset path to clipboard!');
                            }}
                            className="s-btn s-btn-ghost s-btn-sm"
                            title="Copy asset path"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(url)}
                            className="s-btn s-btn-ghost s-btn-sm s-btn-danger"
                            title="Delete asset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: BLOG PUBLISHING STUDIO */}
          {activeTab === 'blog' && (
            <div className="s-panel">
              <div className="s-blog-layout">
                {/* Editor */}
                <div className="s-card s-blog-editor">
                  <div className="s-card-header">
                    <div>
                      <h3>{blogDraft.id ? 'Edit Post' : 'Compose New Post'}</h3>
                      <span>{blogDraft.id ? 'Updating an existing article' : 'Draft, then publish to the live Journal'}</span>
                    </div>
                    {blogDraft.id && (
                      <button type="button" className="s-btn s-btn-ghost s-btn-sm" onClick={resetBlogDraft}>
                        <Plus size={14} /> New
                      </button>
                    )}
                  </div>

                  {blogError && (
                    <div className="s-auth-error" style={{ marginBottom: 12 }}>
                      <AlertTriangle size={16} /><span>{blogError}</span>
                    </div>
                  )}

                  <div className="s-field">
                    <label><span>Title</span></label>
                    <input type="text" value={blogDraft.title}
                      onChange={(e) => setBlogDraft({ ...blogDraft, title: e.target.value })}
                      placeholder="e.g. How biochar rebuilds tired soil" />
                  </div>

                  <div className="s-field">
                    <label><span>Excerpt</span><span style={{ fontSize: '0.72rem', color: 'var(--s-text-subtle)' }}>Shown on cards</span></label>
                    <textarea rows={2} value={blogDraft.excerpt}
                      onChange={(e) => setBlogDraft({ ...blogDraft, excerpt: e.target.value })}
                      placeholder="One or two sentences summarising the story." />
                  </div>

                  <div className="s-field">
                    <label><span>Body</span><span style={{ fontSize: '0.72rem', color: 'var(--s-text-subtle)' }}>Blank line = new paragraph</span></label>
                    <textarea rows={9} value={blogDraft.content}
                      onChange={(e) => setBlogDraft({ ...blogDraft, content: e.target.value })}
                      placeholder="Write the full article here…" />
                  </div>

                  <div className="s-field-row">
                    <div className="s-field">
                      <label><span>Cover image URL</span></label>
                      <input type="text" value={blogDraft.coverImage}
                        onChange={(e) => setBlogDraft({ ...blogDraft, coverImage: e.target.value })}
                        placeholder="/assets/biomass-process.jpg" />
                    </div>
                    <div className="s-field">
                      <label><span>Author</span></label>
                      <input type="text" value={blogDraft.author}
                        onChange={(e) => setBlogDraft({ ...blogDraft, author: e.target.value })} />
                    </div>
                  </div>

                  <div className="s-field">
                    <label><span>Tags</span><span style={{ fontSize: '0.72rem', color: 'var(--s-text-subtle)' }}>Comma separated</span></label>
                    <input type="text" value={blogDraft.tags}
                      onChange={(e) => setBlogDraft({ ...blogDraft, tags: e.target.value })}
                      placeholder="Biomass, Sustainability" />
                  </div>

                  <div className="s-blog-editor-actions">
                    <button type="button" className="s-btn s-btn-ghost s-btn-sm" disabled={isBlogSaving}
                      onClick={() => saveBlogPost('draft')}>
                      <Save size={14} /> Save Draft
                    </button>
                    <button type="button" className="s-btn s-btn-primary s-btn-sm" disabled={isBlogSaving}
                      onClick={() => saveBlogPost('published')}>
                      <Send size={14} /> {isBlogSaving ? 'Saving…' : 'Publish'}
                    </button>
                  </div>
                </div>

                {/* Post list */}
                <div className="s-card s-blog-list">
                  <div className="s-card-header">
                    <div>
                      <h3>All Posts</h3>
                      <span>{blogPosts.filter((p) => p.status === 'published').length} live · {blogPosts.filter((p) => p.status === 'draft').length} drafts</span>
                    </div>
                    <a href={`${window.location.origin}/blog`} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-ghost s-btn-sm">
                      <ExternalLink size={14} /> View Journal
                    </a>
                  </div>

                  {blogPosts.length === 0 && (
                    <div className="s-blog-empty">
                      <FileText size={22} />
                      <p>No posts yet. Compose your first story on the left.</p>
                    </div>
                  )}

                  <div className="s-blog-items">
                    {blogPosts.map((post) => (
                      <div className={`s-blog-item ${blogDraft.id === post.id ? 'editing' : ''}`} key={post.id}>
                        <div className="s-blog-item-thumb">
                          <img src={post.coverImage || '/assets/leaf-glow.jpg'} alt="" />
                        </div>
                        <div className="s-blog-item-main">
                          <div className="s-blog-item-top">
                            <span className={`s-blog-status s-blog-status--${post.status}`}>
                              {post.status === 'published' ? 'Live' : 'Draft'}
                            </span>
                            <span className="s-blog-item-date">{formatBlogDate(post.updatedAt || post.createdAt)}</span>
                          </div>
                          <h4>{post.title}</h4>
                          <p>{post.excerpt || 'No excerpt'}</p>
                        </div>
                        <div className="s-blog-item-actions">
                          <button type="button" title="Edit" onClick={() => editBlogPost(post)}><Sliders size={15} /></button>
                          <button type="button" title={post.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => toggleBlogPublish(post)}>
                            {post.status === 'published' ? <Minimize2 size={15} /> : <Send size={15} />}
                          </button>
                          <button type="button" title="Delete" className="danger" onClick={() => deleteBlogPost(post)}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TESTIMONIALS MANAGER */}
          {activeTab === 'testimonials' && (
            <div className="s-panel">
              <div className="s-card">
                <div className="s-card-header">
                  <div>
                    <h3>Homepage Testimonials</h3>
                    <span>Client quotes shown in the "Trusted by industry leaders" section</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="s-btn s-btn-ghost s-btn-sm" onClick={addTestimonial}>
                      <Plus size={14} /> Add
                    </button>
                    <button type="button" className="s-btn s-btn-primary s-btn-sm" disabled={isSaving} onClick={saveTestimonials}>
                      <Save size={14} /> {isSaving ? 'Saving…' : 'Save & Publish'}
                    </button>
                  </div>
                </div>

                {testimonialsList.length === 0 && (
                  <div className="s-blog-empty">
                    <Sparkles size={22} />
                    <p>No testimonials yet. Click “Add” to create the first one.</p>
                  </div>
                )}

                <div className="s-testimonial-list">
                  {testimonialsList.map((item, index) => (
                    <div className="s-testimonial-row" key={index}>
                      <div className="s-testimonial-order">
                        <button type="button" title="Move up" disabled={index === 0} onClick={() => moveTestimonial(index, -1)}><ChevronDown size={15} style={{ transform: 'rotate(180deg)' }} /></button>
                        <span>{index + 1}</span>
                        <button type="button" title="Move down" disabled={index === testimonialsList.length - 1} onClick={() => moveTestimonial(index, 1)}><ChevronDown size={15} /></button>
                      </div>
                      <div className="s-testimonial-fields">
                        <div className="s-field">
                          <label><span>Quote</span></label>
                          <textarea rows={2} value={item.quote || ''} onChange={(e) => updateTestimonial(index, 'quote', e.target.value)} placeholder="What the client said…" />
                        </div>
                        <div className="s-field-row">
                          <div className="s-field">
                            <label><span>Name</span></label>
                            <input type="text" value={item.name || ''} onChange={(e) => updateTestimonial(index, 'name', e.target.value)} placeholder="e.g. Rajesh Menon" />
                          </div>
                          <div className="s-field">
                            <label><span>Role / Company</span></label>
                            <input type="text" value={item.role || ''} onChange={(e) => updateTestimonial(index, 'role', e.target.value)} placeholder="e.g. Plant Head, Meridian Textiles" />
                          </div>
                        </div>
                      </div>
                      <button type="button" className="s-testimonial-remove danger" title="Remove" onClick={() => removeTestimonial(index)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TEAM CONTROLS & ACCOUNTS */}
          {activeTab === 'team' && (
            <div className="s-panel">
              <div className="s-two-col">
                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Create Staff Member Account</h3>
                    <span className="s-badge">RBAC Access</span>
                  </div>
                  <form onSubmit={handleAddStaff} className="s-form-stack">
                    <div className="s-field">
                      <label>Staff Full Name</label>
                      <input
                        type="text"
                        required
                        value={newStaff.displayName}
                        onChange={(e) => setNewStaff({ ...newStaff, displayName: e.target.value })}
                        placeholder="e.g. Ritik Kumar"
                      />
                    </div>
                    <div className="s-field">
                      <label>Account Username</label>
                      <input
                        type="text"
                        required
                        value={newStaff.username}
                        onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                        placeholder="e.g. ritik.k"
                      />
                    </div>
                    <div className="s-field">
                      <label>Secure Password</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newStaff.password}
                        onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                        placeholder="At least 8 characters"
                      />
                    </div>
                    {staffError && <div className="s-error-msg">{staffError}</div>}
                    <div>
                      <button type="submit" className="s-btn s-btn-primary">
                        <Plus size={15} />
                        <span>Create Account</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Active Team Directory</h3>
                    <span className="s-badge">{(analyticsData?.teamUsage || []).length} Members</span>
                  </div>
                  <div className="s-users-list">
                    {(analyticsData?.teamUsage || []).map((member) => (
                      <div className="s-user-item" key={member.user.id}>
                        <div className="s-user-meta">
                          <strong>{member.user.displayName}</strong>
                          <span>@{member.user.username} • {member.user.role.toUpperCase()}</span>
                          <small>Last active: {member.user.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleString() : 'Just now'}</small>
                        </div>
                        <div className="s-user-actions">
                          <button
                            type="button"
                            onClick={() => handleToggleUser(member.user.id, member.user.active)}
                            className={`s-btn s-btn-sm ${member.user.active ? 's-btn-ghost' : 's-btn-primary'}`}
                            disabled={member.user.id === user?.id}
                          >
                            {member.user.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LEAD INTELLIGENCE PIPELINE */}
          {activeTab === 'submissions' && submissionsData && (
            <div className="s-panel">
              <div className="s-card">
                <div className="s-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <h3>Lead Intelligence Submissions</h3>
                    <div className="s-tab-row">
                      <button
                        type="button"
                        className={`s-tab ${submissionTab === 'contact' ? 'active' : ''}`}
                        onClick={() => setSubmissionTab('contact')}
                      >
                        Contact Leads ({(submissionsData.contact || []).length})
                      </button>
                      <button
                        type="button"
                        className={`s-tab ${submissionTab === 'project' ? 'active' : ''}`}
                        onClick={() => setSubmissionTab('project')}
                      >
                        Project Inquiries ({(submissionsData.project || []).length})
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Search leads by name or email..."
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--s-line)',
                        background: 'var(--s-panel-subtle)',
                        color: 'var(--s-text)',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRefreshLeads}
                      disabled={isRefreshingLeads}
                      className="s-btn s-btn-ghost s-btn-sm"
                      title="Refresh submissions list from storage & backend"
                    >
                      <RefreshCw size={14} style={{ transform: isRefreshingLeads ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }} />
                      <span>{isRefreshingLeads ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="s-btn s-btn-ghost s-btn-sm"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {submissionTab === 'contact' ? (
                  <div className="s-table-wrap">
                    <table className="s-table">
                      <thead>
                        <tr>
                          <th>Lead Name</th>
                          <th>Email Address</th>
                          <th>Phone</th>
                          <th>Service Interest</th>
                          <th>Message Snippet</th>
                          <th>Received</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(submissionsData.contact || [])
                          .filter(sub => !submissionSearch || 
                            sub.payload?.name?.toLowerCase().includes(submissionSearch.toLowerCase()) || 
                            sub.payload?.email?.toLowerCase().includes(submissionSearch.toLowerCase()))
                          .map((sub) => (
                            <tr key={sub.id}>
                              <td><strong>{sub.payload?.name || '-'}</strong></td>
                              <td>{sub.payload?.email || '-'}</td>
                              <td>{sub.payload?.phone || '-'}</td>
                              <td>
                                <span className="s-badge">{sub.payload?.service || 'General Inquiry'}</span>
                              </td>
                              <td>{(sub.payload?.message || '').slice(0, 48)}...</td>
                              <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLead(sub)}
                                    className="s-btn s-btn-ghost s-btn-sm"
                                  >
                                    View Lead
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(sub)}
                                    className="s-btn s-btn-ghost s-btn-sm"
                                    style={{ color: '#ef4444' }}
                                    title="Delete Lead"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="s-table-wrap">
                    <table className="s-table">
                      <thead>
                        <tr>
                          <th>Representative</th>
                          <th>Email Address</th>
                          <th>Organization</th>
                          <th>Project Scope</th>
                          <th>Received</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(submissionsData.project || [])
                          .filter(sub => !submissionSearch || 
                            sub.payload?.name?.toLowerCase().includes(submissionSearch.toLowerCase()) || 
                            sub.payload?.org?.toLowerCase().includes(submissionSearch.toLowerCase()))
                          .map((sub) => (
                            <tr key={sub.id}>
                              <td><strong>{sub.payload?.name || '-'}</strong></td>
                              <td>{sub.payload?.email || '-'}</td>
                              <td><strong>{sub.payload?.org || '-'}</strong></td>
                              <td>{(sub.payload?.message || '').slice(0, 52)}...</td>
                              <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLead(sub)}
                                    className="s-btn s-btn-ghost s-btn-sm"
                                  >
                                    View Lead
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(sub)}
                                    className="s-btn s-btn-ghost s-btn-sm"
                                    style={{ color: '#ef4444' }}
                                    title="Delete Lead"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: SEO & SOCIAL OPENGRAPH STUDIO */}
          {activeTab === 'seo' && (
            <div className="s-panel">
              <div className="s-two-col">
                <div className="s-card">
                  <div className="s-card-head">
                    <h3>SEO Metadata Configuration</h3>
                    <span className="s-badge">Search Engine & OG</span>
                  </div>
                  <div className="s-form-stack">
                    <div className="s-field">
                      <label>SEO Title Tag (<span style={{ color: seoData.metaTitle.length > 60 ? 'var(--s-danger)' : 'var(--s-success)' }}>{seoData.metaTitle.length}/60 chars</span>)</label>
                      <input
                        type="text"
                        value={seoData.metaTitle}
                        onChange={(e) => setSeoData({ ...seoData, metaTitle: e.target.value })}
                      />
                    </div>
                    <div className="s-field">
                      <label>Meta Description (<span style={{ color: seoData.metaDescription.length > 160 ? 'var(--s-danger)' : 'var(--s-success)' }}>{seoData.metaDescription.length}/160 chars</span>)</label>
                      <textarea
                        rows={3}
                        value={seoData.metaDescription}
                        onChange={(e) => setSeoData({ ...seoData, metaDescription: e.target.value })}
                      />
                    </div>
                    <div className="s-field">
                      <label>Target Meta Keywords</label>
                      <input
                        type="text"
                        value={seoData.keywords}
                        onChange={(e) => setSeoData({ ...seoData, keywords: e.target.value })}
                      />
                    </div>
                    <div className="s-field">
                      <label>OpenGraph Share Image Path</label>
                      <input
                        type="text"
                        value={seoData.ogImage}
                        onChange={(e) => setSeoData({ ...seoData, ogImage: e.target.value })}
                        placeholder="/assets/hero-bioenergy.jpg"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" onClick={handleResetSeo} className="s-btn s-btn-ghost">Reset</button>
                      <button
                        type="button"
                        onClick={handleSaveSeo}
                        disabled={isSaving}
                        className="s-btn s-btn-primary"
                      >
                        <Save size={15} />
                        <span>{isSaving ? 'Saving...' : 'Save SEO Configuration'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="s-card">
                  <div className="s-card-head">
                    <h3>Live Google Search Result Preview</h3>
                    <span className="s-badge">SERP Simulator</span>
                  </div>
                  <div className="s-seo-serp-preview">
                    <div className="s-serp-url">https://biotrendenergy.com › industrial-solutions</div>
                    <div className="s-serp-title">{seoData.metaTitle || 'Bio Trend Energy'}</div>
                    <div className="s-serp-desc">{seoData.metaDescription}</div>
                  </div>

                  <div className="s-card-head" style={{ marginTop: '14px' }}>
                    <h3>OpenGraph Social Share Preview</h3>
                  </div>
                  <div style={{ borderRadius: '12px', border: '1px solid var(--s-line)', overflow: 'hidden', background: 'var(--s-panel-subtle)' }}>
                    <div style={{ height: '140px', background: '#1e293b', position: 'relative' }}>
                      <img
                        src={seoData.ogImage}
                        alt="OG Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--s-text-muted)' }}>BIOTRENDENERGY.COM</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 700, margin: '4px 0' }}>{seoData.metaTitle}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--s-text-muted)' }}>{seoData.metaDescription}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: COMMAND SPOTLIGHT SEARCH */}
      {spotlightOpen && (
        <div className="s-modal-backdrop" onClick={() => setSpotlightOpen(false)}>
          <div className="s-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} style={{ color: 'var(--s-accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Command Spotlight</h3>
              </div>
              <button
                type="button"
                onClick={() => setSpotlightOpen(false)}
                className="s-btn s-btn-ghost s-btn-sm"
              >
                <X size={15} />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Search actions, pages, or tools..."
              value={spotlightQuery}
              onChange={(e) => setSpotlightQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--s-accent-primary)',
                background: 'var(--s-panel-subtle)',
                color: 'var(--s-text)',
                fontSize: '0.95rem'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { title: 'Open Mission Control Overview', tab: 'overview', icon: <CircleGauge size={16} /> },
                { title: 'Visual Site Content Editor', tab: 'content', icon: <Building2 size={16} /> },
                { title: 'Customize Theme Color Palettes', tab: 'theme', icon: <Flame size={16} /> },
                { title: 'Manage Digital Media Library', tab: 'media', icon: <Database size={16} /> },
                { title: 'Review Lead Inquiries & Submissions', tab: 'submissions', icon: <History size={16} /> },
                { title: 'SEO & OpenGraph Share Cards', tab: 'seo', icon: <TrendingUp size={16} /> }
              ]
                .filter(cmd => !spotlightQuery || cmd.title.toLowerCase().includes(spotlightQuery.toLowerCase()))
                .map((cmd, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setActiveTab(cmd.tab);
                      setSpotlightOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--s-line)',
                      background: 'var(--s-panel)',
                      color: 'var(--s-text)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {cmd.icon}
                    <span>{cmd.title}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LEAD MESSAGE DETAIL MODAL */}
      {selectedLead && (
        <div className="s-modal-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="s-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '560px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="s-badge">Lead Inquiry Detail</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.2rem' }}>{selectedLead.payload?.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="s-btn s-btn-ghost s-btn-sm"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: 'var(--s-panel-subtle)', padding: '16px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--s-text-muted)' }}>Email Address</span>
                <div style={{ fontWeight: 600 }}>{selectedLead.payload?.email || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--s-text-muted)' }}>Phone / Organization</span>
                <div style={{ fontWeight: 600 }}>{selectedLead.payload?.phone || selectedLead.payload?.org || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--s-text-muted)' }}>Service Scope</span>
                <div style={{ fontWeight: 600 }}>{selectedLead.payload?.service || 'General Inquiry'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--s-text-muted)' }}>Submission Date</span>
                <div style={{ fontWeight: 600 }}>{new Date(selectedLead.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--s-text)' }}>Message Copy</span>
              <div style={{ marginTop: '6px', padding: '16px', borderRadius: '8px', background: 'var(--s-panel-subtle)', border: '1px solid var(--s-line)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                {selectedLead.payload?.message || 'No message provided.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleDeleteLead(selectedLead)}
                className="s-btn s-btn-ghost"
                style={{ color: '#ef4444' }}
                title="Permanently delete this lead"
              >
                <Trash2 size={15} />
                <span>Delete Lead</span>
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={`mailto:${selectedLead.payload?.email}`}
                  className="s-btn s-btn-primary"
                >
                  <Mail size={15} />
                  <span>Reply via Email</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="s-btn s-btn-ghost"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dynamically map and sanitize S-class database values to match website sections with safe fallbacks
function mapContentStructure(data) {
  if (!data) return null;
  const projectPage = data.pages?.projects || data.projects || {};
  const projectIntro = projectPage.intro || {};
  const projectItems = (projectPage.items || defaultProjects || []).map((project, index) => {
    const fallback = defaultProjects[index % defaultProjects.length];
    const missingMap = {
      '/assets/green-energy-field.jpg': '/assets/project-waste-to-energy.jpg',
      '/assets/nature.jpg': '/assets/project-biogas.jpg',
      '/assets/biomass-pellets.jpg': '/assets/project-biochar.jpg',
    };
    const rawImg = project.image || project.img || fallback.image;
    return {
      title: project.title || fallback.title,
      description: project.description || project.desc || '',
      location: project.location || fallback.location,
      capacity: project.capacity || project.stats || project.status || fallback.capacity,
      category: project.category || fallback.category,
      image: missingMap[rawImg] || rawImg,
      imagePosition: project.imagePosition || fallback.imagePosition || 'center',
      fallbackImage: fallback.image,
    };
  });

  return {
    ...data,
    // Hero mapping
    hero: {
      eyebrow: data.hero?.eyebrow || 'Biomass fuel systems for cleaner Industry',
      title: data.hero?.title || (data.hero?.messages ? data.hero.messages[0] : 'Innovative Bioenergy Solutions for a Sustainable Tomorrow'),
      description: data.hero?.description || data.hero?.copy || 'Bio Trend Energy converts agricultural and industrial waste streams into dependable renewable fuel.',
      buttonPrimary: data.hero?.buttonPrimary || data.hero?.primaryAction?.label || 'Explore Solutions',
      buttonSecondary: data.hero?.buttonSecondary || data.hero?.secondaryAction?.label || 'See Workflow',
      image: data.hero?.image || '/assets/hero-bioenergy.jpg',
      videoLink: data.hero?.videoSource || '/assets/bte-video-17-02-2026.mp4'
    },
    // About mapping
    about: data.about || {
      eyebrow: 'About us',
      title: 'Driving the Transition Towards a Cleaner, Greener Future',
      description: 'Bio Trend Energy is at the forefront of clean-energy innovation. We design, build and operate advanced bioenergy systems that convert biomass waste into renewable energy.',
      story: 'Our approach combines engineering excellence with local insight. Every project is developed around resource efficiency, measurable impact and long-term operational reliability.',
      bullets: ['Innovative, tailored solutions', 'Proven conversion technology', 'Environmental responsibility', 'Customer-centric delivery'],
      image: '/assets/leaf-dew.jpg',
      noteYears: '8 years',
      noteText: 'of purposeful growth',
      missionTitle: 'Our Mission',
      missionText: 'Deliver sustainable bioenergy solutions that empower communities, protect the environment and drive economic growth.',
      visionTitle: 'Our Vision',
      visionText: 'A world where waste is a resource and clean energy is accessible to all.'
    },
    // Solutions mapping
    solutions: {
      eyebrow: data.pages?.solutions?.eyebrow || 'What we do',
      title: data.pages?.solutions?.title || 'Our Solutions',
      description: data.pages?.solutions?.description || 'End-to-end bioenergy solutions built around your resources, requirements and long-term goals.',
      items: (data.pages?.solutions?.items || data.solutions?.items || defaultSolutions || []).map(s => ({
        title: s.title,
        description: s.description,
        icon: s.icon?.name || s.icon || 'Leaf'
      }))
    },
    // Process mapping
    process: {
      eyebrow: data.pages?.process?.eyebrow || 'How it works',
      title: data.pages?.process?.title || 'Our Process',
      description: data.pages?.process?.description || 'A proven process that converts waste into clean energy, built for consistent performance from source to supply.',
      badgeTitle: data.pages?.process?.badgeTitle || 'Zero waste mindset',
      badgeText: data.pages?.process?.badgeText || 'Maximum value from every resource',
      image: data.pages?.process?.image || '/assets/biomass-process.jpg',
      steps: (data.pages?.process?.steps || data.process?.steps || defaultProcessSteps || []).map(s => ({
        title: s.title,
        description: s.description,
        icon: s.icon?.name || s.icon || 'Recycle'
      }))
    },
    // Projects mapping
    projects: {
      eyebrow: projectPage.eyebrow || projectIntro.eyebrow || 'Our work',
      title: projectPage.title || projectIntro.title || 'Projects That Perform',
      description: projectPage.description || projectIntro.copy || 'Delivering successful bioenergy projects that create lasting environmental and economic value.',
      summaryValue: projectPage.summaryValue || '50+',
      summaryText: projectPage.summaryText || 'projects delivered across India',
      items: projectItems,
    },
    // Impact mapping
    impact: {
      eyebrow: data.pages?.impact?.eyebrow || 'Measurable change',
      title: data.pages?.impact?.title || 'Our Impact',
      description: data.pages?.impact?.description || 'Creating a positive impact on the environment, economy and society with every project we deliver.',
      image: data.pages?.impact?.image || '/assets/wind-impact.jpg',
      sdgTitle: data.pages?.impact?.sdgTitle || 'Sustainable Development Goals',
      sdgText: data.pages?.impact?.sdgText || 'Contributing to a cleaner environment and resilient communities.',
      items: (data.pages?.impact?.items || data.impact?.items || defaultImpacts || []).map(i => ({
        label: i.label,
        value: i.value,
        detail: i.detail,
        icon: i.icon?.name || i.icon || 'Leaf'
      }))
    },
    // Footer mapping
    footer: {
      description: data.footer?.description || 'Transforming biomass waste into clean energy for a healthier planet and a more resilient future.',
      quickLinksTitle: data.footer?.quickLinksTitle || 'Quick Links',
      solutionsTitle: data.footer?.solutionsTitle || 'Our Solutions',
      resourcesTitle: data.footer?.resourcesTitle || 'Resources',
      contactTitle: data.footer?.contactTitle || 'Contact Info',
      phone: data.footer?.phone || '+91 98765 43210',
      email: data.footer?.email || 'info@biotrendenergy.com',
      office: data.footer?.office || 'Gurugram, Haryana, India',
      copyright: data.footer?.copyright || 'Copyright 2026 Bio Trend Energy. All rights reserved.',
      policies: data.footer?.policies || [
        { label: 'Privacy Policy', href: '#home' },
        { label: 'Terms of Use', href: '#home' }
      ],
      quickLinks: data.footer?.quickLinks || [],
      solutionsLinks: data.footer?.solutionsLinks || [],
      resourceLinks: data.footer?.resourceLinks || [],
      socialLinks: data.footer?.socialLinks || []
    },
    // SEO / OpenGraph mapping
    seo: {
      metaTitle: data.seo?.metaTitle || 'Bio Trend Energy — Advanced Biomass Fuel Systems',
      metaDescription: data.seo?.metaDescription || 'Converting organic & agricultural waste streams into dependable clean industrial renewable energy.',
      keywords: data.seo?.keywords || 'biomass, bioenergy, briquetting, renewable fuel, industrial decarbonization, sustainability',
      ogImage: data.seo?.ogImage || '/assets/hero-bioenergy.jpg'
    },
    // Homepage testimonials (editable in the admin Testimonials tab)
    testimonials: Array.isArray(data.testimonials) && data.testimonials.length
      ? data.testimonials
      : defaultTestimonials
  };
}

// --- MAIN APP ENTRY ---
export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');
  const [siteData, setSiteData] = useState(() => mapContentStructure(initialSiteData));
  const [settingsData, setSettingsData] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    // Require BOTH a stored user and a session token — a user record without a
    // token can't authenticate any admin API call, so treat it as logged out.
    const savedUser = sessionStorage.getItem('admin_user');
    const savedToken = sessionStorage.getItem('dashboard_token');
    return savedUser && savedToken ? JSON.parse(savedUser) : null;
  });
  const [darkMode, setDarkMode] = useState(false);
  
  const [videoOpen, setVideoOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const openVideo = () => {
    setVideoOpen(true);
  };

  // Fetch customizable site content from Node server API
  const fetchContent = async () => {
    try {
      const response = await fetch(API_BASE + '/api/content');
      if (response.ok) {
        const data = await response.json();
        const mappedData = mapContentStructure(data);
        setSiteData(mappedData);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.warn("Connection to Node backend content API failed. Falling back to default static files.");
      // Fallback content data generated from local data.js
      const fallbackContent = {
        theme: {
          fontFamily: 'Poppins',
          colors: {
            primary: '#154E33',
            accent: '#2D8A4E',
            bgPage: '#F7FAF6',
            bgSurface: '#FFFFFF',
            textBody: '#58655F',
            textHeading: '#122018',
            border: '#E2EDE4',
            accentBg: '#EEF7F2',
            accentText: '#1C7430'
          }
        },
        hero: {
          eyebrow: 'Clean energy. Green future.',
          title: 'Innovative Bioenergy Solutions for a Sustainable Tomorrow',
          description: 'We transform biomass waste into clean energy and valuable resources, creating a positive impact on people and the planet.',
          buttonPrimary: 'Our Solutions',
          buttonSecondary: 'Get in Touch',
          proofText: '50+ successful projects delivered across India',
          image: '/assets/hero-bioenergy.jpg',
          videoLink: '/assets/bio-trend-film.mp4'
        },
        about: {
          eyebrow: 'About us',
          title: 'Driving the Transition Towards a Cleaner, Greener Future',
          description: 'Bio Trend Energy is at the forefront of clean-energy innovation. We design, build and operate advanced bioenergy systems that convert biomass waste into renewable energy and sustainable by-products.',
          story: 'Our approach combines engineering excellence with local insight. Every project is developed around resource efficiency, measurable impact and long-term operational reliability.',
          bullets: ['Innovative, tailored solutions', 'Proven conversion technology', 'Environmental responsibility', 'Customer-centric delivery'],
          image: '/assets/leaf-dew.jpg',
          noteYears: '8 years',
          noteText: 'of purposeful growth',
          missionTitle: 'Our Mission',
          missionText: 'Deliver sustainable bioenergy solutions that empower communities, protect the environment and drive economic growth.',
          visionTitle: 'Our Vision',
          visionText: 'A world where waste is a resource and clean energy is accessible to all.'
        },
        solutions: {
          eyebrow: 'What we do',
          title: 'Our Solutions',
          description: 'End-to-end bioenergy solutions built around your resources, requirements and long-term goals.',
          items: defaultSolutions.map(s => ({
            title: s.title,
            description: s.description,
            icon: s.icon.name || 'Leaf'
          }))
        },
        process: {
          eyebrow: 'How it works',
          title: 'Our Process',
          description: 'A proven process that converts waste into clean energy, built for consistent performance from source to supply.',
          badgeTitle: 'Zero waste mindset',
          badgeText: 'Maximum value from every resource',
          image: '/assets/biomass-process.jpg',
          steps: defaultProcessSteps.map(s => ({
            title: s.title,
            description: s.description,
            icon: s.icon.name || 'Recycle'
          }))
        },
        projects: {
          eyebrow: 'Our work',
          title: 'Projects That Perform',
          description: 'Delivering successful bioenergy projects that create lasting environmental and economic value.',
          summaryValue: '50+',
          summaryText: 'projects delivered across India',
          items: defaultProjects.map(p => ({
            title: p.title,
            location: p.location,
            capacity: p.capacity,
            category: p.category,
            image: p.image
          }))
        },
        impact: {
          eyebrow: 'Measurable change',
          title: 'Our Impact',
          description: 'Creating a positive impact on the environment, economy and society with every project we deliver.',
          image: '/assets/wind-impact.jpg',
          sdgTitle: 'Sustainable Development Goals',
          sdgText: 'Contributing to a cleaner environment and resilient communities.',
          items: defaultImpacts.map(i => ({
            label: i.label,
            value: i.value,
            detail: i.detail,
            icon: i.icon.name || 'Leaf'
          }))
        },
        footer: {
          description: 'Transforming biomass waste into clean energy for a healthier planet and a more resilient future.',
          quickLinksTitle: 'Quick Links',
          solutionsTitle: 'Our Solutions',
          resourcesTitle: 'Resources',
          contactTitle: 'Contact Info',
          phone: '+91 98765 43210',
          email: 'info@biotrendenergy.com',
          office: 'Gurugram, Haryana, India',
          copyright: 'Copyright 2026 Bio Trend Energy. All rights reserved.',
          policies: [
            { label: 'Privacy Policy', href: '#home' },
            { label: 'Terms of Use', href: '#home' }
          ]
        }
      };
      setSiteData(fallbackContent);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(API_BASE + '/api/settings');
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSettingsData(data);
    } catch (err) {
      console.warn('Connection to Node backend settings API failed. Falling back to default theme.');
      setSettingsData({
        design: {
          fontFamily: 'Outfit',
          typography: {
            navScale: 1, buttonScale: 1, eyebrowScale: 1, bodyScale: 1,
            heroTitleScale: 1, pageTitleScale: 1, sectionTitleScale: 1, cardTitleScale: 1
          },
          palettes: {
            light: { pageBackground: '#f8fafc', surface: '#ffffff', text: '#0f172a', heading: '#020617', primary: '#10b981', secondary: '#06b6d4', mist: '#f1f5f9' },
            dark: { pageBackground: '#070b12', surface: '#0d1422', text: '#f8fafc', heading: '#ffffff', primary: '#10b981', secondary: '#06b6d4', mist: '#162238' }
          }
        }
      });
    }
  };

  useEffect(() => {
    fetchContent();
    fetchSettings();
    // Load every font in the library once so any selection previews instantly.
    if (!document.getElementById('google-fonts-library')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-library';
      link.rel = 'stylesheet';
      link.href = googleFontsHref();
      document.head.appendChild(link);
    }
  }, []);

  // Sync sessionStorage for persistent admin login across reloads
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('admin_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('admin_user');
    }
  }, [currentUser]);

  // Apply custom CSS Theme variables from dashboard settings
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'light';

    const design = settingsData?.design || siteData?.theme;
    if (!design) return;

    const { palettes, colors, fontFamily, typography } = design;

    if (fontFamily) {
      const fontName = extractFontName(fontFamily);
      root.style.setProperty('--font-sans', `"${fontName}", "Poppins", sans-serif`);
      document.body.style.fontFamily = `"${fontName}", "Poppins", sans-serif`;
    }

    const palette = palettes?.light || null;
    const fallbackColor = colors?.light || (colors?.primary ? colors : null);

    if (palette || fallbackColor) {
      const pageBg = palette?.pageBackground || fallbackColor?.bgPage || '#fbfcfa';
      const surface = palette?.surface || fallbackColor?.bgSurface || '#ffffff';
      const ink = palette?.heading || fallbackColor?.textHeading || '#0b1d13';
      const inkSoft = palette?.text || fallbackColor?.textBody || '#546158';

      const primary = palette?.primary || fallbackColor?.primary || '#0b5130';
      const secondary = palette?.secondary || fallbackColor?.accent || '#267b3f';
      const mist = palette?.mist || fallbackColor?.mist || '#f3f8f1';
      const line = palette?.mist || fallbackColor?.border || '#e5ebe4';

      // Derive a full shade ramp from the single chosen brand color so
      // picking e.g. blue re-colors the navbar, every button, badges,
      // borders and hover states consistently — not just a couple of spots.
      const ramp = generateShadeRamp(primary);
      const secondaryRamp = generateShadeRamp(secondary);

      root.style.setProperty('--canvas', pageBg);
      root.style.setProperty('--paper', surface);
      root.style.setProperty('--ink', ink);
      root.style.setProperty('--ink-soft', inkSoft);
      root.style.setProperty('--line', line);

      root.style.setProperty('--green-950', ramp[950]);
      root.style.setProperty('--green-900', ramp[900]);
      root.style.setProperty('--green-800', ramp[800]);
      root.style.setProperty('--green-700', secondary || ramp[700]);
      root.style.setProperty('--green-600', secondaryRamp[600] || ramp[600]);
      root.style.setProperty('--green-500', ramp[500]);
      root.style.setProperty('--green-200', mist || ramp[200]);
      root.style.setProperty('--green-100', ramp[100]);
      root.style.setProperty('--green-50', pageBg || ramp[50]);

      // Semantic aliases used across the navbar, buttons, badges and gradient
      // accents so every one of those pulls from the same generated ramp.
      root.style.setProperty('--brand-primary', ramp[900]);
      root.style.setProperty('--brand-primary-dark', ramp[950]);
      root.style.setProperty('--brand-primary-darker', ramp[800]);
      root.style.setProperty('--brand-accent', secondary || ramp[700]);
      root.style.setProperty('--brand-accent-soft', secondaryRamp[200] || ramp[200]);
      root.style.setProperty('--brand-gradient-start', secondaryRamp[500] || ramp[500]);
      root.style.setProperty('--brand-gradient-end', ramp[700]);
      root.style.setProperty('--brand-tint', ramp[100]);
      root.style.setProperty('--brand-tint-strong', ramp[200]);
      root.style.setProperty('--brand-glow', ramp.glow);
      root.style.setProperty('--brand-glow-soft', ramp.glowSoft);
    }

    // Layout customizations — button shape and shadow intensity.
    const layout = design.layout || {};
    const radiusMap = { pill: '999px', rounded: '14px', square: '6px' };
    root.style.setProperty('--btn-radius', radiusMap[layout.buttonShape] || radiusMap.pill);
    const shadowMap = {
      subtle: '0 4px 15px rgba(13, 67, 43, 0.12)',
      medium: '0 10px 30px rgba(13, 67, 43, 0.2)',
      bold: '0 18px 45px rgba(13, 67, 43, 0.32)'
    };
    root.style.setProperty('--btn-shadow', shadowMap[layout.shadowIntensity] || shadowMap.medium);
    const cardRadiusPx = layout.cardRadius ?? 22;
    root.style.setProperty('--card-radius', `${cardRadiusPx}px`);
    // Tie the site's existing card-radius variables to the same control so
    // every card, panel and image frame across the site follows it.
    root.style.setProperty('--radius-lg', `${cardRadiusPx}px`);
    root.style.setProperty('--radius-md', `${Math.max(cardRadiusPx - 6, 6)}px`);
    root.style.setProperty('--radius-xl', `${cardRadiusPx + 12}px`);

    const typo = typography || {};
    const styleEl = document.getElementById('dynamic-typography-overrides') || document.createElement('style');
    styleEl.id = 'dynamic-typography-overrides';

    styleEl.innerHTML = `
      .hero-section h1 { font-size: calc(clamp(38px, 6vw, 68px) * ${typo.heroTitleScale || 1}) !important; }
      h2 { font-size: calc(clamp(35px, 4vw, 54px) * ${typo.sectionTitleScale || 1}) !important; }
      .solution-card h3, .project-card h3 { font-size: calc(20px * ${typo.cardTitleScale || 1}) !important; }
      p { font-size: calc(16px * ${typo.bodyScale || 1}) !important; }
      .eyebrow { font-size: calc(11px * ${typo.eyebrowScale || 1}) !important; }
      .desktop-nav a.nav-link { font-size: calc(15px * ${typo.navScale || 1}) !important; }
      .btn-pill, button { font-size: calc(14px * ${typo.buttonScale || 1}) !important; }
    `;
    if (!styleEl.parentNode) document.head.appendChild(styleEl);
  }, [settingsData, siteData, darkMode]);

  // Client path handler
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname.replace(/\/+$/, '') || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Real-time traffic: count a page view on each public route change and keep a
  // heartbeat going so the dashboard's live-visitor figure stays accurate.
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  useEffect(() => {
    if (isAdminRoute) return;
    trackTraffic('view');
    const beat = setInterval(() => trackTraffic('heartbeat'), 30000);
    return () => clearInterval(beat);
  }, [pathname, isAdminRoute]);

  useEffect(() => {
    const pageTitles = {
      '/': 'Bio Trend Energy | Turning Waste Into Clean Energy',
      '/about': 'About Us | Bio Trend Energy',
      '/solutions': 'Solutions | Bio Trend Energy',
      '/process': 'Our Process | Bio Trend Energy',
      '/impact': 'Our Impact | Bio Trend Energy',
      '/projects': 'Projects | Bio Trend Energy',
      '/blog': 'Journal | Bio Trend Energy',
      '/contact': 'Contact | Bio Trend Energy',
      '/admin': 'Admin Dashboard | Bio Trend Energy Studio'
    };
    if (pathname.startsWith('/admin')) {
      document.title = 'Admin Dashboard | Bio Trend Energy Studio';
    } else if (pathname.startsWith('/blog/')) {
      document.title = 'Journal | Bio Trend Energy';
    } else {
      document.title = pageTitles[pathname] || 'Page Not Found | Bio Trend Energy';
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  const navigateTo = (to) => {
    const nextPath = (to || '/').replace(/\/+$/, '') || '/';
    if (nextPath !== pathname) {
      window.history.pushState({}, '', nextPath);
      setPathname(nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!siteData) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontFamily: 'sans-serif' }}>Connecting to Server...</div>;
  }

  // Route decision maker
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    if (!currentUser) {
      return (
        <AdminLogin
          onLoginSuccess={(userObj) => {
            sessionStorage.setItem('admin_user', JSON.stringify(userObj));
            setCurrentUser(userObj);
          }}
        />
      );
    }
    return (
      <AdminDashboard
        user={currentUser}
        onLogout={() => {
          sessionStorage.removeItem('dashboard_token');
          sessionStorage.removeItem('admin_user');
          setCurrentUser(null);
        }}
        siteData={siteData}
        setSiteData={setSiteData}
        settingsData={settingsData}
        setSettingsData={setSettingsData}
      />
    );
  }

  let publicPage;
  const handleOpenModal = () => setProjectModalOpen(true);
  if (pathname === '/blog') {
    publicPage = <Blog onNavigate={navigateTo} />;
  } else if (pathname.startsWith('/blog/')) {
    publicPage = <BlogPost slug={pathname.slice('/blog/'.length)} onNavigate={navigateTo} />;
  } else
  switch (pathname) {
    case '/':
      publicPage = (
        <>
          <Hero heroData={siteData.hero} onVideoOpen={() => setVideoOpen(true)} onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />
          <About aboutData={siteData.about} onOpenProjectModal={handleOpenModal} />
          <Solutions solutionsData={siteData.solutions} onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />
          <BiomassPellets onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />
          <Process processData={siteData.process} onOpenProjectModal={handleOpenModal} />
          <Impact impactData={siteData.impact} onOpenProjectModal={handleOpenModal} />
          <FeaturedProjects projectsData={siteData.projects} onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />
          <WhyChooseUs />
          <Testimonials items={siteData.testimonials} />
          <LatestJournal onNavigate={navigateTo} />
        </>
      );
      break;
    case '/about':
      publicPage = <About aboutData={siteData.about} onOpenProjectModal={handleOpenModal} />;
      break;
    case '/solutions':
      publicPage = <Solutions solutionsData={siteData.solutions} onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />;
      break;
    case '/process':
      publicPage = <Process processData={siteData.process} onOpenProjectModal={handleOpenModal} />;
      break;
    case '/projects':
      publicPage = <Projects projectsData={siteData.projects} onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />;
      break;
    case '/impact':
      publicPage = <Impact impactData={siteData.impact} onOpenProjectModal={handleOpenModal} />;
      break;
    case '/contact':
      publicPage = <Contact footerData={siteData.footer} />;
      break;
    default:
      publicPage = <NotFound onNavigate={navigateTo} />;
  }

  return (
    <>
      <Header
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode((mode) => !mode)}
        onVideoOpen={openVideo}
        onNavigate={navigateTo}
        onOpenProjectModal={handleOpenModal}
        currentPath={pathname}
        logoSrc={siteData.site?.logo?.src}
        logoAlt={siteData.site?.logo?.alt}
        navItems={siteData.site?.navigation}
      />
      <main className="route-main" key={pathname}>
        {publicPage}
        {pathname !== '/contact' && <ClosingCta onNavigate={navigateTo} onOpenProjectModal={handleOpenModal} />}
      </main>
      <Footer
        footerData={siteData.footer}
        onNavigate={navigateTo}
        logoSrc={siteData.site?.logo?.src}
        logoAlt={siteData.site?.logo?.alt}
      />
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
      <ProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
      <ScrollUtilities />
    </>
  );
}
