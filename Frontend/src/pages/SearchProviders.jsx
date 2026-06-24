import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MapView from "./MapView";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SearchProviders() {
  const SEARCH_RADIUS_KM = 5;
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryService = (searchParams.get("service") || "").trim();
  const canCreateBooking = user?.role === "user";

  const [categories, setCategories] = useState([]);
  const [service, setService] = useState(queryService || "");
  const [smartQuery, setSmartQuery] = useState(queryService || "");
  const [location, setLocation] = useState(null);
  const [providers, setProviders] = useState([]);
  const [activeVendor, setActiveVendor] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mappingInfo, setMappingInfo] = useState(null);
  const [error, setError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const res = await apiFetch("/api/categories");
        const payload = Array.isArray(res) ? res : res.categories || [];
        setCategories(payload);
      } catch {
        setError("Could not load categories.");
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!queryService || service) return;
    setService(queryService);
  }, [queryService, service]);

  const selectedCategory = useMemo(() => {
    const current = service.toLowerCase();
    return categories.find((cat) => (cat.name || "").toLowerCase() === current) || null;
  }, [categories, service]);

  const useCurrentLocation = () => {
    setError("");
    
    if (isGettingLocation) return; // Prevent double-click
    
    if (!navigator.geolocation) {
      setError("❌ Geolocation is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.");
      return;
    }

    setIsGettingLocation(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("✅ Location obtained:", newLocation);
        setLocation(newLocation);
        setError(""); // Clear any previous errors
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        console.error("❌ Geolocation Error Code:", error.code, "Message:", error.message);
        
        // Handle specific geolocation errors
        switch(error.code) {
          case 1: // PERMISSION_DENIED
            setError("❌ Location permission denied.\n\n1. Click the lock icon next to the URL\n2. Select 'Allow' for location access\n3. Refresh and try again\n\nOr manually set location in browser settings.");
            break;
          case 2: // POSITION_UNAVAILABLE
            setError("❌ Location information unavailable. Make sure:\n• Your GPS/location services are enabled\n• You're not in airplane mode\n• Location permission is granted");
            break;
          case 3: // TIMEOUT
            setError("❌ Location request timed out.\n\nMake sure:\n• You have internet connection\n• GPS has time to acquire signal\n• Try again in a few seconds");
            break;
          default:
            setError("❌ Unable to get location: " + error.message);
        }
      },
      options
    );
  };

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported in this browser."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0 // Don't use cached position
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (error) => {
          let message = "Unable to fetch your current location.";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message = "Location permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable. Please check your GPS and try again.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out. Please check your internet connection and try again.";
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });

  const searchProviders = async () => {
    if (!service) {
      setError("Please select a service.");
      return;
    }

    try {
      setError("");
      setBookingMessage("");
      setMappingInfo(null);
      setIsSearching(true);
      
      let activeLocation = location;
      if (!activeLocation) {
        console.log("Location not set, attempting to get current location...");
        activeLocation = await getCurrentLocation();
        setLocation(activeLocation);
        console.log("Location obtained during search:", activeLocation);
      }
      
      const res = await apiFetch(
        `/api/providers/search?service=${encodeURIComponent(service)}&lat=${activeLocation.lat}&lng=${activeLocation.lng}&radius=${SEARCH_RADIUS_KM}`
      );
      setProviders(res.results || []);
      
      if (!res.results || res.results.length === 0) {
        setError(`No vendors found for "${service}" within ${SEARCH_RADIUS_KM} km. Try a different category or location.`);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Failed to search providers.");
    } finally {
      setIsSearching(false);
    }
  };

  const runSmartSearch = async () => {
    if (!smartQuery.trim()) {
      setError("Please type your issue (example: AC not cooling).");
      return;
    }

    try {
      setError("");
      setBookingMessage("");
      setIsSearching(true);
      
      let activeLocation = location;
      if (!activeLocation) {
        console.log("Location not set, attempting to get current location...");
        activeLocation = await getCurrentLocation();
        setLocation(activeLocation);
        console.log("Location obtained during smart search:", activeLocation);
      }
      
      const geoPart = `&lat=${activeLocation.lat}&lng=${activeLocation.lng}&radius=${SEARCH_RADIUS_KM}`;
      const res = await apiFetch(
        `/api/search/smart?q=${encodeURIComponent(smartQuery.trim())}${geoPart}`
      );

      if (!res.mappedService) {
        setMappingInfo(null);
        setProviders([]);
        setError("No service mapping found. Try a more specific query.");
        return;
      }

      setService(res.mappedService.name);
      setMappingInfo(res.mappedService);
      setProviders(res.vendors || []);
      
      if (!res.vendors || res.vendors.length === 0) {
        setError(`No vendors available for "${res.mappedService.name}" within ${SEARCH_RADIUS_KM} km. Try a different query or check back later.`);
      }
    } catch (err) {
      console.error("Smart search error:", err);
      setError(err.message || "Smart search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedProvider || !selectedCategory || !location) return;
    if (!canCreateBooking) {
      setError("Only user accounts can create bookings. Please login as user.");
      setSelectedProvider(null);
      return;
    }

    try {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          categoryId: selectedCategory._id,
          vendorId: selectedProvider.id,
          serviceType: service || selectedCategory.name,
          lat: location.lat,
          lng: location.lng,
          address: "Requested from Smart Connect search page",
          bookingTime: new Date().toISOString(),
        }),
      });

      setSelectedProvider(null);
      setBookingMessage("Booking requested successfully.");
    } catch (err) {
      setError(err.message || "Booking request failed.");
    }
  };

  const formatAvailability = (availability) => {
    if (!availability) return "Availability not provided";
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const enabledDays = days
      .filter((day) => availability[day]?.enabled)
      .map((day) => day.toUpperCase());

    if (!enabledDays.length) return "Currently unavailable";
    const firstDay = days.find((day) => availability[day]?.enabled);
    const start = availability[firstDay]?.start || "10:00";
    const end = availability[firstDay]?.end || "18:00";
    return `${enabledDays.join(", ")} | ${start} - ${end}`;
  };

  const formatPriceEstimate = (vendor) => {
    const min = vendor?.priceEstimateMin;
    const max = vendor?.priceEstimateMax;
    if (min === null || min === undefined || max === null || max === undefined) {
      return "Price estimate available on request";
    }
    return `INR ${min} - INR ${max}`;
  };

  return (
    <main className="services-page">
      <section className="services-hero animate-fade-in">
        <p className="services-kicker">Services</p>
        <h1>Find verified professionals near you</h1>
        <p>
          Choose a service, share your location, and connect with top-rated providers
          within minutes.
        </p>
      </section>

      <section className="services-panel animate-slide-up">
        <div className="services-smart-search">
          <label htmlFor="smart-query">NLP Smart Search</label>
          <div className="services-smart-row">
            <input
              id="smart-query"
              value={smartQuery}
              onChange={(e) => setSmartQuery(e.target.value)}
              placeholder='Try: "Need plumber urgently", "AC not cooling", "Electric repair"'
            />
            <button type="button" className="services-btn services-btn-primary" onClick={runSmartSearch}>
              {isSearching ? "Analyzing..." : "Smart Search"}
            </button>
          </div>
          {mappingInfo ? (
            <p className="services-success">
              Query mapped to <strong>{mappingInfo.name}</strong> ({mappingInfo.confidence}% confidence)
            </p>
          ) : null}
        </div>

        <div className="services-grid">
          <div className="services-field">
            <label htmlFor="service">Service Category</label>
            <select
              id="service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              disabled={isLoadingCategories}
            >
              <option value="">Select service</option>
              {categories.map((category) => (
                <option key={category._id || category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="services-actions">
            <button type="button" className="services-btn services-btn-light" onClick={useCurrentLocation} disabled={isGettingLocation}>
              {isGettingLocation ? "📍 Getting Location..." : "📍 Use Current Location"}
            </button>
            <button type="button" className="services-btn services-btn-primary" onClick={searchProviders}>
              {isSearching ? "Searching..." : "Search Providers"}
            </button>
          </div>
        </div>

        <p className="services-meta">
          {location
            ? `✅ Location Set: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
            : "📍 Location not set. Click 'Use Current Location' to continue."}
        </p>
        <p className="services-meta">Search radius: {SEARCH_RADIUS_KM} km (fixed)</p>
        {error ? <p className="services-error" style={{whiteSpace: "pre-wrap"}}>{error}</p> : null}
        {bookingMessage ? <p className="services-success">{bookingMessage}</p> : null}
      </section>

      <section className="services-map-wrap animate-fade-in">
        {location ? (
          <MapView 
            center={[location.lat, location.lng]} 
            markers={providers.map(p => ({
              id: p.id,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              distanceKm: p.distanceKm
            }))}
          />
        ) : null}
      </section>

      <section className="services-results">
        <div className="services-results-head">
          <h2>Vendors within {SEARCH_RADIUS_KM} km</h2>
          <span>{providers.length} found</span>
        </div>

        {!providers.length ? (
          <div className="services-empty">
            <p>No providers yet. Try another category or increase radius.</p>
            <Link to="/" className="services-link">
              Back to landing page
            </Link>
          </div>
        ) : (
          <div className="services-cards">
            {providers.map((provider, index) => (
              <article
                key={provider.id}
                className="services-card animate-stagger"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div>
                  <h3>{provider.name}</h3>
                  <p>{provider.distanceKm ?? "--"} km away</p>
                </div>
                <div className="services-card-meta">
                  <span>Rating {Number(provider.rating || 0).toFixed(1)}</span>
                  <div className="services-card-actions">
                    <button
                      type="button"
                      className="services-btn services-btn-light"
                      onClick={() => setActiveVendor(provider)}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="services-btn services-btn-primary"
                      disabled={!canCreateBooking}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      {canCreateBooking ? "Book Service" : "User Booking Only"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activeVendor ? (
        <div className="services-modal-overlay">
          <div className="services-modal">
            <h3>{activeVendor.name}</h3>
            <div className="services-profile-grid">
              <div>
                <p className="services-label">Service Name</p>
                <p>{service || "Selected service"}</p>
              </div>
              <div>
                <p className="services-label">Rating</p>
                <p>
                  {Number(activeVendor.rating || 0).toFixed(1)} ({activeVendor.reviews || 0} reviews)
                </p>
              </div>
              <div>
                <p className="services-label">Distance</p>
                <p>{activeVendor.distanceKm ?? "--"} km</p>
              </div>
              <div>
                <p className="services-label">Availability</p>
                <p>{formatAvailability(activeVendor.availability)}</p>
              </div>
            </div>
            <div className="services-profile-block">
              <p className="services-label">Description</p>
              <p>{activeVendor.description || "Professional service provider near your location."}</p>
            </div>
            <div className="services-profile-block">
              <p className="services-label">Price Estimate</p>
              <p>{formatPriceEstimate(activeVendor)}</p>
            </div>
            <div className="services-profile-block">
              <p className="services-label">Recent Reviews</p>
              {(activeVendor.reviewList || []).length ? (
                <div className="services-review-list">
                  {activeVendor.reviewList.map((item, idx) => (
                    <div key={`${idx}-${item.createdAt || ""}`} className="services-review-item">
                      <p className="services-review-rating">Rating: {item.rating || "-"}</p>
                      <p>{item.review || "No review text"}</p>
                      {Array.isArray(item.photos) && item.photos.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.photos.map((photo, pIdx) => (
                            <img
                              key={`${photo}-${pIdx}`}
                              src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/uploads/${photo}`}
                              alt="Review"
                              className="h-12 w-12 rounded object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      ) : null}
                      <p className="services-review-date">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No reviews yet.</p>
              )}
            </div>
            <div className="services-modal-actions">
              <button
                type="button"
                className="services-btn services-btn-light"
                onClick={() => setActiveVendor(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="services-btn services-btn-primary"
                onClick={() => {
                  setSelectedProvider(activeVendor);
                  setActiveVendor(null);
                }}
              >
                Book Service
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedProvider ? (
        <div className="services-modal-overlay">
          <div className="services-modal">
            <h3>Confirm Booking</h3>
            <p>
              You are booking <strong>{selectedProvider.name}</strong> for{" "}
              <strong>{service || "selected service"}</strong>.
            </p>
            <div className="services-modal-actions">
              <button
                type="button"
                className="services-btn services-btn-light"
                onClick={() => setSelectedProvider(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="services-btn services-btn-primary"
                disabled={!canCreateBooking}
                onClick={confirmBooking}
              >
                {canCreateBooking ? "Confirm Booking" : "Only User Can Book"}
              </button>
            </div>
            {!canCreateBooking ? (
              <p className="services-error">Booking is disabled for {user?.role || "this"} account.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
