import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🔧 Fix Leaflet default icon issue globally
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function MapView({ center, markers = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const providerMarkersRef = useRef([]);

  const hasValidCenter = Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1]);
  const [centerLat, centerLng] = hasValidCenter ? center : [0, 0];

  // Initialize map and handle location updates
  useEffect(() => {
    if (!mapRef.current) return;

    if (!hasValidCenter) return;

    // Create map only once
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([centerLat, centerLng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      console.log("✅ Map initialized at:", centerLat, centerLng);
    }

    const map = mapInstanceRef.current;

    // Update or add user marker
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    userMarkerRef.current = L.marker([centerLat, centerLng], {
      icon: L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        shadowSize: [41, 41],
      })
    })
      .addTo(map)
      .bindPopup("📍 Your Location");

    // Pan and zoom to center
    map.setView([centerLat, centerLng], 13);

    // Cleanup provider markers
    providerMarkersRef.current.forEach(m => {
      try {
        map.removeLayer(m);
      } catch (e) {
        console.warn("Error removing provider marker:", e);
      }
    });
    providerMarkersRef.current = [];

    // Add provider markers
    markers.forEach(provider => {
      if (provider.lat && provider.lng && Number.isFinite(provider.lat) && Number.isFinite(provider.lng)) {
        const marker = L.marker([provider.lat, provider.lng], {
          icon: L.icon({
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            shadowSize: [41, 41],
          })
        })
          .addTo(map)
          .bindPopup(`<strong>${provider.name}</strong><br/>${provider.distanceKm} km away`);
        
        providerMarkersRef.current.push(marker);
      }
    });

  }, [centerLat, centerLng, markers]);

    // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
        providerMarkersRef.current = [];
      }
    };
  }, []);

  if (!hasValidCenter) return null;

  return (
    <div
      ref={mapRef}
      style={{
        height: "300px",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    />
  );
}
