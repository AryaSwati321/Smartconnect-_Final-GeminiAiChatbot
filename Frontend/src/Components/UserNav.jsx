import { Link, useLocation } from 'react-router-dom';

export default function UserNav() {
  const { pathname } = useLocation();
  const active = (p) => pathname.startsWith(p) ? 'text-indigo-600 font-semibold' : 'text-gray-700';

  return (
    <nav className="flex items-center gap-4">
      <Link to="/dashboard" className={active('/dashboard')}>Dashboard</Link>
      <Link to="/user/profile" className={active('/user/profile')}>My Profile</Link>
      <Link to="/search" className={active('/search')}>Find Providers</Link>  {/* ← add this */}
    </nav>
  );
}
