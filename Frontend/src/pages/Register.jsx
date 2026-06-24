import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Registration Page (User / Vendor)
 * - User: sends JSON
 * - Vendor: sends multipart/form-data with certification file
 */
export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState("user"); // "user" or "vendor"

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  // Vendor-specific fields
  const [mobile, setMobile] = useState("");
  const [adhar, setAdhar] = useState("");
  const [experience, setExperience] = useState("");
  const [address, setAddress] = useState("");
  const [workingArea, setWorkingArea] = useState("");
  const [category, setCategory] = useState("Plumber");
  const [otherCategory, setOtherCategory] = useState("");
  const [certificationFile, setCertificationFile] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setCertificationFile(f || null);
  }

  function onAvatarChange(e) {
    const f = e.target.files && e.target.files[0];
    setAvatarFile(f || null);
  }

  function validateCommon() {
    if (!name?.trim() || !email?.trim() || !password) {
      alert("Name, email and password are required");
      return false;
    }
    if (role === "user" && !phone?.trim()) {
      alert("Phone number is required");
      return false;
    }
    if (role === "user" && phone?.trim()) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        alert("Phone number must be exactly 10 digits");
        return false;
      }
    }
    return true;
  }

  function validateVendorFields() {
    if (!mobile?.trim()) {
      alert("Mobile number is required for vendor registration");
      return false;
    }
    const mobileDigits = mobile.replace(/\D/g, '');
    if (mobileDigits.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      return false;
    }
    if (!workingArea?.trim()) {
      alert("Working area is required for vendor registration");
      return false;
    }
    if (adhar?.trim()) {
      const adharDigits = adhar.replace(/\D/g, '');
      if (adharDigits.length !== 12) {
        alert("Aadhar number must be exactly 12 digits");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateCommon()) return;

    const url = `${API_BASE}/api/auth/register`;

    try {
      if (role === "vendor") {
        if (!validateVendorFields()) return;

        const fd = new FormData();
        fd.append("name", name.trim());
        fd.append("email", email.trim());
        fd.append("password", password);
        fd.append("role", "vendor");
        if (avatarFile) fd.append("avatar", avatarFile);

        const finalCategory =
          category === "Other" ? otherCategory.trim() || "Other" : category;
        fd.append("category", finalCategory);

        fd.append("mobile", mobile.trim());
        fd.append("adhar", adhar.trim());
        fd.append("experience", experience.toString());
        fd.append("address", address.trim());
        fd.append("workingArea", workingArea.trim());

        if (certificationFile) {
          fd.append("certification", certificationFile);
        }

        console.log(
          "FormData entries:",
          [...fd.entries()].map(([k, v]) =>
            v instanceof File ? `${k}: File(${v.name})` : `${k}: ${v}`
          )
        );

        const res = await fetch(url, {
          method: "POST",
          body: fd,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Server responded:", data || res.statusText);
          alert(data?.msg || `Registration failed (${res.status})`);
          return;
        }

        // Auto-login with the returned token and user data
        if (data.token && data.user) {
          login(data.token, data.user);
          alert("Vendor registered successfully! Redirecting to dashboard...");
          // Redirect to vendor dashboard
          navigate("/provider");
        } else {
          alert("Vendor registered successfully. Please log in.");
          navigate("/login");
        }
      } else {
        // user registration as multipart (supports avatar)
        const fd = new FormData();
        fd.append("name", name.trim());
        fd.append("email", email.trim());
        fd.append("phone", phone.trim());
        fd.append("password", password);
        fd.append("role", "user");
        if (avatarFile) fd.append("avatar", avatarFile);

        const res = await fetch(url, {
          method: "POST",
          body: fd,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Server responded:", data || res.statusText);
          alert(data?.msg || `Registration failed (${res.status})`);
          return;
        }

        // Auto-login with the returned token and user data
        if (data.token && data.user) {
          login(data.token, data.user);
          alert("Registration successful! Redirecting to dashboard...");
          // Redirect to user profile
          navigate("/user/profile");
        } else {
          alert("Registered successfully — please log in");
          navigate("/login");
        }
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error. Check server and try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-3">
        {/* Left column: selection */}
        <div className="col-span-1 bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700 p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Register</h3>
          <p className="text-indigo-100 mb-6">Choose an account type</p>

          <div className="space-y-4">
            <button
              onClick={() => setRole("user")}
              type="button"
              className={`w-full text-left p-4 rounded-xl transition-all ${
                role === "user"
                  ? "bg-white/20 shadow-lg"
                  : "hover:bg-white/10 bg-white/5"
              }`}
            >
              <div className="font-semibold">User</div>
              <div className="text-sm text-indigo-100">
                Quick signup for customers
              </div>
            </button>

            <button
              onClick={() => setRole("vendor")}
              type="button"
              className={`w-full text-left p-4 rounded-xl transition-all ${
                role === "vendor"
                  ? "bg-white/20 shadow-lg"
                  : "hover:bg-white/10 bg-white/5"
              }`}
            >
              <div className="font-semibold">Vendor</div>
              <div className="text-sm text-indigo-100">
                Register as a service provider
              </div>
            </button>
          </div>

          <p className="mt-8 text-sm text-indigo-200">
            Admins do not register here — admin login is available at{" "}
            <a href="/admin" className="underline font-semibold">
              /admin
            </a>
            .
          </p>
        </div>

        {/* Right column: form */}
        <div className="col-span-2 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {role === "vendor" ? "Vendor Registration" : "Create Account"}
          </h2>
          <p className="text-gray-500 mb-6">
            {role === "vendor"
              ? "Provide details so customers can discover your services."
              : "Join Smart Connect today."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name + Email (User) or Name + Mobile (Vendor) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {role === "user" ? (
                <input
                  className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Phone number (10 digits)"
                  type="tel"
                  maxLength="10"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setPhone(digits.slice(0, 10));
                  }}
                />
              ) : (
                <input
                  className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Mobile number (10 digits)"
                  type="tel"
                  maxLength="10"
                  value={mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setMobile(digits.slice(0, 10));
                  }}
                />
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Profile photo (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="w-full text-sm text-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Upload a square image for best results.
              </p>
            </div>

            {/* Vendor-specific form */}
            {role === "vendor" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Aadhar number (12 digits)"
                    type="tel"
                    maxLength="12"
                    value={adhar}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setAdhar(digits.slice(0, 12));
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Category
                    </label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>Plumber</option>
                      <option>Electrician</option>
                      <option>Painter</option>
                      <option>Carpenter</option>
                      <option>Cleaner</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Enter category (if Other)
                    </label>
                    <input
                      className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Type category if 'Other'"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Certification / License (upload)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={onFileChange}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {certificationFile
                        ? `Selected: ${certificationFile.name}`
                        : "Optional - upload if available"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Work Experience (years)
                    </label>
                    <input
                      className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder="Work experience (years)"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Working Area (city / ZIP / region)"
                    value={workingArea}
                    onChange={(e) => setWorkingArea(e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Address
                  </label>
                  <textarea
                    className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    rows={4}
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </>
            ) : (
              // User form
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-3 rounded-lg shadow hover:shadow-lg font-semibold transition"
              >
                Register
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                className="text-indigo-600 underline"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
