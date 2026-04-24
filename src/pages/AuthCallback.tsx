import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('auth_token', token);
      navigate('/dashboard', { replace: true });
    } else if (localStorage.getItem('auth_token')) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4" />
        <p className="text-gray-500 text-sm">Autenticando...</p>
      </div>
    </div>
  );
}
