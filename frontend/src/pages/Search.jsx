import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';
import Map from '../components/common/Map.jsx';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [wishlistIds, setWishlistIds] = useState([]);
  const { isAuthenticated } = useAuth();

  // Local state for filters (initialized from URL params)
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [rating, setRating] = useState(searchParams.get('rating') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [guests, setGuests] = useState(searchParams.get('guests') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  // Available amenities for filtering
  const availableAmenities = ['Wifi', 'Kitchen', 'Air Conditioning', 'Pool', 'Hot Tub', 'Fireplace', 'Free Parking'];
  const [selectedAmenities, setSelectedAmenities] = useState(() => {
    const fromUrl = searchParams.get('amenities');
    return fromUrl ? fromUrl.split(',') : [];
  });

  const categories = ['Beachfront', 'Cabin', 'Modern', 'Villa', 'Castle', 'Treehouse', 'Countryside', 'Lakefront'];

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchVal) params.search = searchVal;
      if (category) params.category = category;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (rating) params.rating = rating;
      if (bedrooms) params.bedrooms = bedrooms;
      if (guests) params.guests = guests;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (sort) params.sort = sort;
      if (selectedAmenities.length > 0) params.amenities = selectedAmenities.join(',');
      params.page = page;
      params.limit = 6; // Compact list size for split screen

      const { data } = await api.get('/properties', { params });
      if (data.success) {
        setProperties(data.properties);
        setTotalCount(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error searching stays:', err.message);
    } finally {
      setLoading(false);
    }
  }, [searchVal, category, minPrice, maxPrice, rating, bedrooms, guests, startDate, endDate, sort, selectedAmenities, page]);

  useEffect(() => {
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

    fetchProperties();
    fetchWishlist();
  }, [fetchProperties, isAuthenticated]);

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    setPage(1);

    const updatedParams = {};
    if (searchVal) updatedParams.search = searchVal;
    if (category) updatedParams.category = category;
    if (minPrice) updatedParams.minPrice = minPrice;
    if (maxPrice) updatedParams.maxPrice = maxPrice;
    if (rating) updatedParams.rating = rating;
    if (bedrooms) updatedParams.bedrooms = bedrooms;
    if (guests) updatedParams.guests = guests;
    if (startDate) updatedParams.startDate = startDate;
    if (endDate) updatedParams.endDate = endDate;
    if (sort) updatedParams.sort = sort;
    if (selectedAmenities.length > 0) updatedParams.amenities = selectedAmenities.join(',');
    updatedParams.page = 1;

    setSearchParams(updatedParams);
  };

  const handleAmenityChange = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleResetFilters = () => {
    setSearchVal('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setBedrooms('');
    setGuests('');
    setStartDate('');
    setEndDate('');
    setSort('');
    setSelectedAmenities([]);
    setPage(1);
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const updatedParams = Object.fromEntries(searchParams.entries());
    updatedParams.page = newPage;
    setSearchParams(updatedParams);
  };

  return (
    <div style={{ padding: '20px 4%', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)' }}>
      {/* 1. Filter Panel */}
      <form onSubmit={handleApplyFilters} style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        padding: '20px',
        marginBottom: '20px',
        alignItems: 'flex-end',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Keywords */}
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label">Destination</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search city, country..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        {/* Category */}
        <div style={{ flex: '1 1 140px' }}>
          <label className="form-label">Category</label>
          <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Price limits */}
        <div style={{ flex: '1 1 160px', display: 'flex', gap: '8px' }}>
          <div style={{ width: '50%' }}>
            <label className="form-label">Min Price</label>
            <input
              type="number"
              className="form-control"
              placeholder="INR"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div style={{ width: '50%' }}>
            <label className="form-label">Max Price</label>
            <input
              type="number"
              className="form-control"
              placeholder="INR"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Check availability dates */}
        <div style={{ flex: '1 1 240px', display: 'flex', gap: '8px' }}>
          <div style={{ width: '50%' }}>
            <label className="form-label">Check-In</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ width: '50%' }}>
            <label className="form-label">Check-Out</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Sorting option */}
        <div style={{ flex: '1 1 140px' }}>
          <label className="form-label">Sort By</label>
          <select className="form-control" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Default</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="ratingDesc">Highest Rated</option>
            <option value="popularity">Most Popular</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" className="btn btn-brand" style={{ padding: '12px 20px' }}>Apply</button>
          <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ padding: '12px 16px' }}>Reset</button>
        </div>

        {/* Advanced Filters Expand (Amenities, Bedrooms, Guests) */}
        <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginTop: '15px', paddingTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          {/* Guests count */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Guests:</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '60px', padding: '6px 8px' }}
                value={guests}
                min="1"
                onChange={(e) => setGuests(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bedrooms:</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '60px', padding: '6px 8px' }}
                value={bedrooms}
                min="1"
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Min Stars:</span>
              <select
                className="form-control"
                style={{ width: '90px', padding: '6px 8px' }}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="">Any</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
                <option value="5">5 ⭐</option>
              </select>
            </div>
          </div>

          {/* Amenities selection checkboxes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Amenities:</span>
            {availableAmenities.map((amenity) => (
              <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(amenity)}
                  onChange={() => handleAmenityChange(amenity)}
                  style={{ accentColor: 'var(--brand)' }}
                />
                {amenity}
              </label>
            ))}
          </div>
        </div>
      </form>

      {/* 2. Main content block - Grid and Map split screen */}
      <div style={{ display: 'flex', gap: '24px', flexGrow: 1, position: 'relative' }} className="split-view">
        {/* Left Column: Properties listings */}
        <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {totalCount} Stays Available {category && `in ${category}`}
            </h3>
          </div>

          {loading ? (
            <div className="grid-layout">
              {Array(4).fill(0).map((_, idx) => (
                <div key={idx} style={{ height: '320px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '2.5rem' }}>🔍</span>
              <h4 style={{ fontWeight: 700, fontSize: '1.2rem', marginTop: '16px', marginBottom: '8px' }}>No properties found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Try adjusting your filters, location keywords or dates.</p>
              <button onClick={handleResetFilters} className="btn btn-brand" style={{ marginTop: '16px' }}>Reset All Filters</button>
            </div>
          ) : (
            <>
              <div className="grid-layout">
                {properties.map((item) => (
                  <PropertyCard
                    key={item._id}
                    property={item}
                    initialIsWishlisted={wishlistIds.includes(item._id)}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: 'auto', padding: '20px 0' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px' }}
                  >
                    ❮ Prev
                  </button>
                  <span style={{ alignSelf: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px' }}
                  >
                    Next ❯
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Sticky Leaflet Map */}
        <div className="map-sidebar" style={{ flex: '1 1 45%', position: 'sticky', top: '100px', height: 'calc(100vh - 140px)', zIndex: 5 }}>
          {!loading && properties.length > 0 && (
            <Map properties={properties} height="100%" />
          )}
        </div>
      </div>

      <style>{`
        @media(max-width: 992px) {
          .split-view {
            flex-direction: column !important;
          }
          .map-sidebar {
            width: 100% !important;
            height: 350px !important;
            position: relative !important;
            top: 0 !important;
            margin-top: 20px;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Search;
