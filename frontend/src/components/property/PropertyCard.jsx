import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Carousel from '../common/Carousel.jsx';

const PropertyCard = ({ property, initialIsWishlisted = false, onWishlistToggle }) => {
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsWishlisted);
  const [liking, setLiking] = useState(false);
  const navigate = useNavigate();

  // Sync state if initial changes
  useEffect(() => {
    setIsLiked(initialIsWishlisted);
  }, [initialIsWishlisted]);

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLiking(true);
    try {
      const { data } = await api.post(`/wishlist/toggle/${property._id}`);
      if (data.success) {
        setIsLiked(data.isAdded);
        if (onWishlistToggle) {
          onWishlistToggle(property._id, data.isAdded);
        }
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err.message);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="property-card">
      {/* Photo Slider */}
      <div className="property-card-img-wrap">
        {property.isVerified && <div className="property-card-badge">Verified Stay</div>}
        <Carousel images={property.images} />
        
        {/* Heart Wishlist Trigger */}
        <button
          onClick={handleLikeClick}
          disabled={liking}
          className="property-card-wishlist-btn"
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <span style={{
            fontSize: '1.25rem',
            color: isLiked ? 'var(--brand)' : 'var(--text-muted)',
            transition: 'color 0.2s',
            lineHeight: 1
          }}>
            {isLiked ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* Card Body */}
      <Link to={`/property/${property._id}`} className="property-card-body">
        <span className="property-card-category">{property.category}</span>
        <h3 className="property-card-title">{property.title}</h3>
        <p className="property-card-location">
          📍 {property.city}, {property.country}
        </p>

        <div className="property-card-footer">
          <div className="property-card-price">
            INR {property.pricePerNight.toLocaleString()}<span>/night</span>
          </div>

          <div className="property-card-rating">
            ⭐ {property.rating > 0 ? property.rating.toFixed(1) : 'New'}
            {property.numReviews > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                ({property.numReviews})
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;
