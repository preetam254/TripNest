import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistIds, setWishlistIds] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const categories = [
    { name: 'Beachfront', icon: '🏖️' },
    { name: 'Cabin', icon: '🪵' },
    { name: 'Modern', icon: '🏢' },
    { name: 'Villa', icon: '🏡' },
    { name: 'Castle', icon: '🏰' },
    { name: 'Treehouse', icon: '🌳' },
    { name: 'Countryside', icon: '🚜' },
    { name: 'Lakefront', icon: '🛶' },
  ];

  const popularDestinations = [
    { city: 'Bali', country: 'Indonesia', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400' },
    { city: 'Kyoto', country: 'Japan', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400' },
    { city: 'New York', country: 'United States', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400' },
    { city: 'Paris', country: 'France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400' },
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await api.get('/properties?limit=4');
        if (data.success) {
          setFeatured(data.properties);
        }
      } catch (err) {
        console.error('Error fetching properties:', err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchWishlist = async () => {
      if (!isAuthenticated) return;
      try {
        const { data } = await api.get('/wishlist');
        if (data.success) {
          setWishlistIds(data.wishlist.map(p => p._id));
        }
      } catch (err) {
        console.warn('Error reading user wishlist ids', err.message);
      }
    };

    fetchFeatured();
    fetchWishlist();
  }, [isAuthenticated]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleDestinationClick = (city) => {
    navigate(`/search?search=${encodeURIComponent(city)}`);
  };

  const handleCategoryClick = (catName) => {
    navigate(`/search?category=${encodeURIComponent(catName)}`);
  };

  return (
    <div className="home-page-container">
      {/* 1. Hero Banner Section */}
      <section style={{
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.75)), url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        padding: '0 24px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.4)', marginBottom: '16px', letterSpacing: '-1px' }}>
          Find Your Nest, Plan Your Flight
        </h1>
        <p style={{ fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginBottom: '36px', fontWeight: 500, opacity: 0.9 }}>
          Discover verified vacation homes with AI-guided trip plans and instant hosting.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{
          display: 'flex',
          width: '100%',
          maxWidth: '650px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '8px',
          borderRadius: 'var(--border-radius-full)',
          boxShadow: 'var(--shadow-lg)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '1.25rem', padding: '0 12px 0 16px', color: 'var(--text-secondary)' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by city, country, or stay name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flexGrow: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              padding: '8px 0'
            }}
          />
          <button type="submit" className="btn btn-brand" style={{ borderRadius: 'var(--border-radius-full)', padding: '12px 28px' }}>
            Search
          </button>
        </form>
      </section>

      {/* 2. Categories Scroll Bar */}
      <section className="container-pad" style={{ paddingBottom: '10px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>Browse by Category</h3>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '15px' }} className="cat-scroll">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: 'var(--border-radius-full)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="category-btn"
            >
              <span>{cat.icon}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured Listings Section */}
      <section className="container-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Featured Vacation Nests</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Handpicked verified rentals for your next stay.</p>
          </div>
          <Link to="/search" style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '0.95rem' }}>View All →</Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {Array(4).fill(0).map((_, idx) => (
              <div key={idx} style={{ height: '320px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            No listings loaded. Run the seeder to bootstrap details!
          </div>
        ) : (
          <div className="grid-layout">
            {featured.map((item) => (
              <PropertyCard
                key={item._id}
                property={item}
                initialIsWishlisted={wishlistIds.includes(item._id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Popular Destinations */}
      <section className="container-pad" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Popular Destinations</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '36px' }}>
          Explore properties and tourist spots in high-trending places worldwide.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {popularDestinations.map((dest) => (
            <div
              key={dest.city}
              onClick={() => handleDestinationClick(dest.city)}
              style={{
                borderRadius: 'var(--border-radius-md)',
                overflow: 'hidden',
                position: 'relative',
                height: '240px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
              className="dest-card"
            >
              <img
                src={dest.img}
                alt={dest.city}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(transparent, rgba(15,23,42,0.85))',
                color: 'white'
              }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{dest.city}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>{dest.country}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. AI trip planner Promotion */}
      <section className="container-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'center' }}>
        <div>
          <span style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)', padding: '6px 14px', borderRadius: 'var(--border-radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
            INTELLIGENT TRAVEL
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '16px', marginBottom: '16px', lineHeight: 1.2 }}>
            Plan Your Vacation Instantly with AI
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '24px' }}>
            Unsure of where to stay or what to do? Try our AI Trip Planner. Provide your dream destination, stay length, and budget parameters to generate a full day-by-day travel plan and matching rentals instantly.
          </p>
          <Link to="/ai-planner" className="btn btn-brand" style={{ padding: '12px 28px' }}>Try AI Planner Now</Link>
        </div>
        <div style={{ position: 'relative', height: '350px', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          <img
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800"
            alt="AI Planner"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="container-pad" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '36px' }}>What Travelers Say</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: 'var(--warning-color)', fontSize: '1.25rem', marginBottom: '12px' }}>⭐⭐⭐⭐⭐</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', italic: true, marginBottom: '20px' }}>
              "The AI Travel Planner is a total game changer. It matched our Kyoto budget perfectly and gave us a beautiful itinerary of temple visits near our bamboo villa!"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100" alt="Sarah" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sarah Miller</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Guest from Seattle</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: 'var(--warning-color)', fontSize: '1.25rem', marginBottom: '12px' }}>⭐⭐⭐⭐⭐</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', italic: true, marginBottom: '20px' }}>
              "Listing my cabin was incredibly smooth. Multiple image uploads loaded onto Cloudinary without a hitch, and real-time chat connects me instantly to guests."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" alt="Marcus" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Marcus Davis</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Host from Lake George</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .cat-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .cat-scroll::-webkit-scrollbar-thumb {
          background-color: var(--border-color);
        }
        .category-btn:hover {
          border-color: var(--brand) !important;
          transform: translateY(-1px);
        }
        .dest-card:hover img {
          transform: scale(1.06);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Home;
