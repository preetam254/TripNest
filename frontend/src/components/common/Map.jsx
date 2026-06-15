import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Override Leaflet's default icon URLs to prevent broken images in Vite build
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Map = ({ lat = 20, lng = 77, zoom = 5, properties = [], height = '400px' }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], zoom);

    // Add OpenStreetMap tiles layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    // Add markers for properties
    const markerGroup = L.featureGroup();

    properties.forEach((p) => {
      if (p.latitude && p.longitude) {
        const popupContent = `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
            <strong style="color: var(--text-primary); font-size: 0.9rem;">${p.title}</strong>
            <p style="color: var(--brand); font-weight: 700; margin: 4px 0 0 0;">INR ${p.pricePerNight.toLocaleString()}/night</p>
            <a href="/property/${p._id}" style="color: var(--text-secondary); text-decoration: underline; font-size: 0.75rem; display: inline-block; margin-top: 6px;">View details</a>
          </div>
        `;

        const marker = L.marker([p.latitude, p.longitude])
          .bindPopup(popupContent)
          .addTo(markerGroup);
      }
    });

    // If properties are provided, fit map boundaries
    if (properties.length > 0) {
      markerGroup.addTo(mapRef.current);
      mapRef.current.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
    } else {
      // Add single marker for single property coordinates
      L.marker([lat, lng]).addTo(mapRef.current);
    }

    // Cleanup function: remove map instance on component unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, zoom, properties]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--border-color)',
        zIndex: 1,
        boxShadow: 'var(--shadow-sm)',
      }}
    />
  );
};

export default Map;
