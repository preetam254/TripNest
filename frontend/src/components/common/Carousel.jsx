import React, { useState } from 'react';

const Carousel = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
        No Images Available
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="carousel-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <img
        src={images[currentIndex]}
        alt={`Property Slide ${currentIndex}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.5s ease-in-out' }}
      />

      {images.length > 1 && (
        <>
          {/* Controls */}
          <button
            onClick={handlePrev}
            style={{
              position: 'absolute',
              top: '50%',
              left: '12px',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              zIndex: 5,
            }}
            className="carousel-control-btn"
          >
            ❮
          </button>
          <button
            onClick={handleNext}
            style={{
              position: 'absolute',
              top: '50%',
              right: '12px',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              zIndex: 5,
            }}
            className="carousel-control-btn"
          >
            ❯
          </button>

          {/* Dots Indicator */}
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 5 }}>
            {images.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: idx === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .carousel-control-btn {
          opacity: 0.7;
          transition: opacity 0.2s, transform 0.2s;
        }
        .carousel-control-btn:hover {
          opacity: 1;
          transform: translateY(-50%) scale(1.05);
        }
        body.dark .carousel-control-btn {
          background: rgba(15, 23, 42, 0.9);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default Carousel;
