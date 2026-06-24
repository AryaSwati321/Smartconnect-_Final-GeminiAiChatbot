// src/pages/CategoryList.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CategoryList(){
  const loc = useLocation();
  const nav = useNavigate();
  const suggested = loc.state?.suggested || [];
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem("token");
  const [cats, setCats] = useState(null);

  useEffect(()=> {
    let mounted = true;
    (async ()=>{
      try {
        const res = await apiFetch("/api/categories", {}, token);
        if (!mounted) return;
        if (Array.isArray(res)) setCats(res);
        else if (Array.isArray(res.categories)) setCats(res.categories);
        else setCats([]);
      } catch { setCats([]); }
    })();
    return ()=> mounted=false;
  }, [token]);

  if (cats === null) return <div className="p-6">Loading categories...</div>;

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl">Choose service category</h2>
          {suggested?.length ? <div className="text-sm text-gray-500">Suggested: {suggested.map(s=>s.name).join(", ")}</div> : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map(c => (
            <div key={c._id || c.id} className="bg-white p-4 rounded shadow flex flex-col justify-between">
              <div><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-gray-500">{c.description || c.desc}</p></div>
              <div className="mt-3 text-right"><button onClick={()=>nav("/providers", { state:{ category:c }})} className="px-3 py-2 bg-sky-600 text-white rounded">View providers</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

