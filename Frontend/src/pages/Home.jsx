import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import logoImg from "../assets/logo.png";
import image from "../assets/images.png"
const heroGallery = [
  "https://images.unsplash.com/photo-1523419400524-cf96eebd1cc5?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
];

const serviceCards = [
  {
    title: "Emergency Plumbing",
    desc: "24/7 leak repairs, clog clearing, and pipe fixes.",
    img: "https://images.unsplash.com/photo-1581579188871-45ea61f2a0c8?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Certified Electricians",
    desc: "Safe wiring, panel upgrades, and appliance installs.",
    img: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "AC & Cooling",
    desc: "Speedy AC service, gas refills, and filter cleaning.",
    img: "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Home Cleaning",
    desc: "Deep cleans, move-in refresh, and sanitization crews.",
    img: "https://images.unsplash.com/photo-1581579188871-bfd08e2b2cfe?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Appliance Repair",
    desc: "Fridge, washer, and oven repairs with genuine parts.",
    img: "https://images.unsplash.com/photo-1582719478183-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Painting & Decor",
    desc: "Accent walls, waterproofing, and perfect finishes.",
    img: "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=900&q=80",
  },
];

const promoBanners = [
  {
    title: "Flash Deal",
    text: "AC servicing @ flat 20% off this week",
    color: "sunset",
    img: "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Festival Glow",
    text: "Book painters & deep cleaning combo",
    color: "purple",
    img: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "Pro Guarantee",
    text: "Background-verified experts with insurance",
    color: "mint",
    img: "https://images.unsplash.com/photo-1582719478248-48cd14102ab3?auto=format&fit=crop&w=600&q=80",
  },
];

const quickActions = [
  { label: "Cleaning", icon: "🧹", color: "teal" },
  { label: "Plumber", icon: "🚰", color: "indigo" },
  { label: "Electrician", icon: "💡", color: "amber" },
  { label: "Painter", icon: "🎨", color: "pink" },
  { label: "Pest Control", icon: "🐜", color: "red" },
  { label: "Shifting", icon: "📦", color: "cyan" },
  { label: "Carpentry", icon: "🛠️", color: "green" },
  { label: "Salon @Home", icon: "💅", color: "violet" },
  { label: "Appliances", icon: "🧊", color: "blue" },
  { label: "AC Repair", icon: "❄️", color: "sky" },
  { label: "Gardening", icon: "🌿", color: "emerald" },
  { label: "Laundry", icon: "🧺", color: "orange" },
  { label: "Maid Service", icon: "👩‍🔧", color: "rose" },
  { label: "Cook", icon: "👨‍🍳", color: "lime" },
];

const exploreTiles = [
  {
    title: "Makeup @ Home",
    tag: "Salon",
    img: "https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Event Decor",
    tag: "Decor",
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Workstation Setup",
    tag: "Furniture",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Roof Waterproofing",
    tag: "Repair",
    img: "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Mini Renovation",
    tag: "Remodel",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Corporate Cleaning",
    tag: "Office",
    img: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80",
  },
];

const steps = [
  { title: "Describe your need", text: "Share location, urgency, and budget in under a minute.", emoji: "📝" },
  { title: "Match with pros", text: "We notify nearby verified vendors instantly.", emoji: "⚡" },
  { title: "Track live", text: "Follow arrival ETA, progress, and updates in-app.", emoji: "📍" },
  { title: "Rate & relax", text: "Pay securely and review your experience.", emoji: "🌟" },
];

const stats = [
  { value: "12k+", label: "Bookings completed" },
  { value: "4.9/5", label: "Average rating" },
  { value: "650+", label: "Verified vendors" },
  { value: "18min", label: "Avg. response time" },
];

const defaultServices = ["Plumber", "Electrician", "AC Repair"];

export function Home() {
  const { isAuthenticated, user, token, logout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = isAuthenticated || Boolean(token);
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const profileImage =
    user?.avatar ||
    user?.profileImage ||
    user?.photo?.url ||
    user?.photo ||
    user?.image ||
    user?.profilePic;
  const profileSrc = profileImage
    ? profileImage.startsWith("http")
      ? profileImage
      : `${apiBase}/uploads/${profileImage}`
    : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80";

  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/categories");
        const payload = Array.isArray(res) ? res : res.categories || [];
        setCategories(payload);
      } catch {
        setError("Could not load categories.");
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const popular = useMemo(() => {
    if (!categories.length) return defaultServices;
    const names = categories.map((c) => c?.name).filter(Boolean);
    const preferred = ["plumber", "electrician", "ac repair"];
    const picks = preferred
      .map((word) => names.find((name) => name.toLowerCase().includes(word)))
      .filter(Boolean);
    return picks.length ? picks.slice(0, 3) : names.slice(0, 3);
  }, [categories]);

  const handleSearch = () => {
    const chosen = (selectedService || searchText).trim();
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    navigate(chosen ? `/search?service=${encodeURIComponent(chosen)}` : "/search");
  };

  const serviceNameToCategory = {
    "Emergency Plumbing": "Plumber",
    "Certified Electricians": "Electrician",
    "AC & Cooling": "AC Repair",
    "Home Cleaning": "Cleaning",
    "Appliance Repair": "Appliances",
    "Painting & Decor": "Painter",
    "Maid Service": "Maid Service",
    "Cook": "Cook"
  };

  const handleCategoryClick = async (serviceTitle) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    try {
      // Map service title to category name
      const categoryName = serviceNameToCategory[serviceTitle] || serviceTitle;
      
      // First, try to find category by name from loaded categories
      const foundCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (foundCategory) {
        navigate(`/vendors/${foundCategory._id}`, { state: { categoryName: foundCategory.name } });
        return;
      }
      
      // If not found locally, fetch from API
      const catData = await apiFetch(`/api/providers/search/category-by-name?name=${encodeURIComponent(categoryName)}`);
      if (catData?.id || catData?._id) {
        navigate(`/vendors/${catData._id}`, { state: { categoryName } });
      } else {
        alert(`Service "${categoryName}" not found`);
      }
    } catch (err) {
      console.error("Error fetching category", err);
      alert("Failed to load service. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="sc-shell">
      <div className="sc-bg-blur sc-bg-blur-a" />
      <div className="sc-bg-blur sc-bg-blur-b" />

      <header className="sc-topbar">
        <div className="sc-brand">
          <img className="sc-logo" src={logoImg} alt="Smart Connect logo" />
          <span>Smart Connect</span>
        </div>
        <nav className="sc-nav">
          <a href="#services">Services</a>
          <a href="#promos">Offers</a>
          <a href="#trending">Trending</a>
          <a href="#trusted">Why us</a>
        </nav>
        <div className="sc-auth">
          {isLoggedIn ? (
            <>
              <Link to="/orders" className="sc-btn sc-btn-ghost">
                Orders
              </Link>
              <Link to="/user/profile" className="sc-profile-chip" title="Open profile">
                <img
                  src={profileSrc}
                  alt={user?.name || "Profile"}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80";
                  }}
                />
                <span className="sc-profile-name">{user?.name || "Profile"}</span>
              </Link>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="sc-btn sc-btn-ghost">
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="sc-btn sc-btn-ghost">
                Login
              </Link>
              <Link to="/register" className="sc-btn sc-btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="sc-hero">
        <div className="sc-hero-copy">
          <div className="sc-breadcrumb">Home » Services</div>
          <h1>
            Search across <span>100+ services</span> in your city.
          </h1>
          <p className="sc-subtext">
            Pick a category, compare top-rated vendors, and book with live tracking and secure payments.
          </p>

          <div className="sc-search-banner single">
            <div className="sc-search-pill sc-search-main wide">
              <span className="sc-search-icon">🔍</span>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search services (plumber, AC repair, salon...)"
              />
            </div>
            <button type="button" className="sc-btn sc-btn-primary sc-search-btn" onClick={handleSearch}>
              Search
            </button>
          </div>

          <div className="sc-search-tags">
            {popular.map((item) => (
              <button key={item} onClick={() => setSelectedService(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="sc-badges">
            <span>✅ Vendor verified by admin</span>
          </div>
        </div>

        <div className="sc-hero-visual">
          <div className="sc-hero-stack">
            {heroGallery.map((src, idx) => (
              <div key={src} className={`sc-hero-card sc-hero-card-${idx + 1}`}>
                <img src={image} alt="Service preview" loading="lazy" />
              </div>
            ))}
          </div>
          <div className="sc-hero-floating">
            <div className="sc-float-pill">Live ETA • Updated every 10s</div>
            <div className="sc-float-card">
              <p>“Arrived in 20 minutes and fixed the leak perfectly.”</p>
              <span>— Priya, Mumbai</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sc-strip">
        <div>⭐ 4.9/5 user rating</div>
        <div>🧭 Live tracking</div>
      </section>

      <section className="sc-icon-grid">
        {quickActions.map((action) => (
          <button key={action.label} onClick={() => handleCategoryClick(action.label)} className={`sc-icon-card ${action.color}`}>
            <span className="sc-icon">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </section>

      <section id="promos" className="sc-banner-grid">
        {promoBanners.map((banner) => (
          <article 
            key={banner.title} 
            className={`sc-banner ${banner.color}`}
            onClick={() => handleCategoryClick(banner.text.split('&')[0].trim())}
            style={{ cursor: 'pointer' }}
          >
            <div>
              <p className="sc-kicker">{banner.title}</p>
              <h3>{banner.text}</h3>
              <button type="button" className="sc-btn sc-btn-light" onClick={(e) => {
                e.stopPropagation();
                handleCategoryClick(banner.text.split('&')[0].trim());
              }}>
                Book now
              </button>
            </div>
            <img 
              src={banner.img} 
              alt={banner.title} 
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80";
              }}
            />
          </article>
        ))}
      </section>

      <section className="sc-carousel">
        {promoBanners.concat(promoBanners).map((banner, idx) => (
          <div 
            key={banner.title + idx} 
            className="sc-carousel-card"
            onClick={() => handleCategoryClick(banner.text.split('&')[0].trim())}
            style={{ cursor: 'pointer' }}
          >
            <div className="sc-carousel-text">
              <span>{banner.title}</span>
              <h4>{banner.text}</h4>
            </div>
            <img 
              src={banner.img} 
              alt={banner.title} 
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80";
              }}
            />
          </div>
        ))}
      </section>

      <section id="services" className="sc-section">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">Top categories</p>
            <h2>Handpicked services with stunning outcomes</h2>
            <p className="sc-muted">Browse popular picks or search anything from 120+ categories.</p>
          </div>
          <Link to="/search" className="sc-btn sc-btn-ghost">
            Explore all
          </Link>
        </div>

        <div className="sc-service-grid">
          {serviceCards.map((card) => (
            <article 
              key={card.title} 
              className="sc-service-card"
              onClick={() => handleCategoryClick(card.title)}
              style={{ cursor: 'pointer' }}
            >
              <div className="sc-service-img">
                <img
                  src={card.img}
                  alt={card.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80";
                  }}
                />
              </div>
              <div className="sc-service-body">
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryClick(card.title);
                  }} 
                  className="sc-pill"
                >
                  Pick {card.title}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">Service preview</p>
            <h2>See what you get before you book</h2>
            <p className="sc-muted">Quick visual previews of popular services to set expectations.</p>
          </div>
        </div>
        <div className="sc-preview-hero">
          <img
            src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80"
            alt="Technician repairing appliance"
            loading="lazy"
          />
          <div className="sc-preview-hero-overlay">
            <div>
              <p className="sc-kicker">Live before-and-after</p>
              <h3>Transparent visuals of the services we deliver.</h3>
              <p>From appliances to interiors, know the quality you can expect.</p>
            </div>
            <button type="button" className="sc-btn sc-btn-primary" onClick={() => setSelectedService("Appliance Repair")}>
              View providers
            </button>
          </div>
        </div>
        <div className="sc-preview-row">
          {serviceCards.map((card) => (
            <article key={`preview-${card.title}`} className="sc-preview-card">
              <img src={card.img} alt={card.title} loading="lazy" />
              <div className="sc-preview-overlay">
                <span>{card.title}</span>
                <p>{card.desc}</p>
                <button type="button" className="sc-btn sc-btn-light" onClick={() => handleCategoryClick(card.title)}>
                  Preview & book
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">Explore more</p>
            <h2>Popular picks this week</h2>
            <p className="sc-muted">A lively mix of services people are discovering right now.</p>
          </div>
        </div>
        <div className="sc-tile-grid">
          {exploreTiles.map((tile) => (
            <div key={tile.title} className="sc-tile">
              <img src={tile.img} alt={tile.title} loading="lazy" />
              <div className="sc-tile-overlay">
                <span>{tile.tag}</span>
                <p>{tile.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="trending" className="sc-section sc-section-contrast">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">Trending now</p>
            <h2>Customers are booking these today</h2>
            <p className="sc-muted">Fresh demand from your city, updated hourly.</p>
          </div>
        </div>
        <div className="sc-steps sc-trending-pills">
          {popular.concat(["Full home clean", "RO service", "Office sanitization"]).map((item, idx) => (
            <div key={item + idx} className="sc-trend-pill" onClick={() => setSelectedService(item)}>
              <span>🔥</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="sc-section">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">How it works</p>
            <h2>From tap to task done</h2>
            <p className="sc-muted">A guided experience for users, vendors, and providers alike.</p>
          </div>
        </div>
        <div className="sc-steps">
          {steps.map((step, idx) => (
            <div key={step.title} className="sc-step">
              <div className="sc-step-index">{idx + 1}</div>
              <div className="sc-step-emoji">{step.emoji}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="trusted" className="sc-section sc-trust">
        <div className="sc-section-head">
          <div>
            <p className="sc-kicker">Why people trust us</p>
            <h2>Built for reliability and delight</h2>
            <p className="sc-muted">Data-backed quality controls and human support when you need it.</p>
          </div>
        </div>
        <div className="sc-stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="sc-stat-card">
              <span>{item.value}</span>
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="sc-section sc-cta">
        <div className="sc-cta-copy">
          <p className="sc-kicker">Ready when you are</p>
          <h2>Spin up your next service in seconds.</h2>
          <p className="sc-muted">
            Create an account, choose a service, and track every step with live updates and transparent pricing.
          </p>
          <div className="sc-cta-actions">
            <Link to="/register" className="sc-btn sc-btn-primary">
              Create account
            </Link>
            <Link to="/login" className="sc-btn sc-btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
        <div className="sc-cta-art">
          <img
            src="https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1100&q=80"
            alt="Happy customer"
            loading="lazy"
          />
          <div className="sc-cta-badge">Live support 7 days a week</div>
        </div>
      </section>

      <footer className="sc-footer">
        <div className="sc-brand">
          <span className="sc-dot" />
          Smart Connect
        </div>
        <div className="sc-footer-links">
          <a href="#services">Services</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
        </div>
        <p className="sc-muted">© 2026 Smart Connect. Crafted for seamless local services.</p>
      </footer>
    </main>
  );
}
