import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";

function VendorCard({ vendor, onBook }) {
  const reviewList = vendor.reviewList || [];
  const avgRating = Math.round((vendor.rating || 0) * 10) / 10;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{vendor.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.round(avgRating) ? "text-yellow-400" : "text-gray-300"}>
                    ⭐
                  </span>
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-700">{avgRating}/5 ({vendor.reviews} reviews)</span>
            </div>
          </div>
        </div>
        {vendor.description && (
          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{vendor.description}</p>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {vendor.priceEstimateMin !== null && vendor.priceEstimateMax !== null && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs font-semibold text-blue-600 uppercase">Price Range</p>
            <p className="text-lg font-bold text-blue-900 mt-1">
              ₹{vendor.priceEstimateMin} - ₹{vendor.priceEstimateMax}
            </p>
          </div>
        )}

        {/* Recent Reviews */}
        {reviewList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Recent reviews</p>
            <div className="space-y-2">
              {reviewList.map((review, idx) => (
                <div key={idx} className="bg-slate-50 rounded p-2 border border-slate-200 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-yellow-400 text-xs">
                      {[...Array(review.rating)].map((_, i) => <span key={i}>⭐</span>)}
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs italic">"{review.review}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {vendor.categories && vendor.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vendor.categories.map((cat) => (
              <span key={cat._id} className="text-xs bg-slate-200 text-slate-800 px-2 py-1 rounded-full">
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-2">
        <button
          onClick={() => onBook(vendor)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition"
        >
          📞 Contact & Book
        </button>
        <button className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition">
          📍 View Location
        </button>
      </div>
    </div>
  );
}

export default function VendorsForCategory() {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, _setCategoryName] = useState(location.state?.categoryName || "");
  const [sortBy, setSortBy] = useState("rating"); // rating, reviews, price

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/providers/category/${categoryId}`);
        const vendorsList = data.results || [];
        setVendors(vendorsList);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchVendors();
    }
  }, [categoryId]);

  const sortedVendors = [...vendors].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortBy === "reviews") {
      return (b.reviews || 0) - (a.reviews || 0);
    } else if (sortBy === "price") {
      return (a.priceEstimateMin || 0) - (b.priceEstimateMin || 0);
    }
    return 0;
  });

  const handleBooking = (vendor) => {
    // Navigate to booking page with vendor details
    navigate("/booking", { state: { vendor, categoryId } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-slate-600 hover:text-slate-900 font-medium">
            ← Back Home
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            All {categoryName ? categoryName : "Service"} Providers
          </h1>
          <div className="w-24"></div>
        </div>
      </header>

      {/* Filter & Sort Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-600">
            <p className="font-semibold">
              🏢 <span className="text-slate-900">{vendors.length}</span> registered providers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">⭐ Highest Rated</option>
              <option value="reviews">📝 Most Reviewed</option>
              <option value="price">💰 Lowest Price First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-4">Loading providers...</p>
          </div>
        ) : sortedVendors.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200">
            <p className="text-xl text-slate-500 mb-2">No vendors found</p>
            <p className="text-slate-400">
              We're currently expanding our network for {categoryName}. Check back soon!
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Other Services
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onBook={handleBooking}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer CTA */}
      {sortedVendors.length > 0 && (
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-3">Still choosing?</h2>
            <p className="text-lg opacity-90 mb-6">
              Compare ratings, prices, and customer reviews to find the perfect provider for your needs.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition"
            >
              Browse All Services
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
