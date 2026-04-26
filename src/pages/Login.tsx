const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  return (
    <div className="min-h-screen relative bg-slate-50 flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-card-hover ring-1 ring-slate-200/60 p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MiCancha</h1>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">
              Panel de administración
            </p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-lg font-semibold text-slate-800">Bienvenido de vuelta</h2>
            <p className="text-sm text-slate-500 mt-1">
              Inicia sesión para gestionar reservas y canchas
            </p>
          </div>

          <a
            href={`${API_URL}/api/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white border border-slate-200 text-slate-800 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </a>

          <p className="text-center text-xs text-slate-400 mt-6">
            Al continuar, aceptas los términos de uso del panel.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} MiCancha · Panel de administración
        </p>
      </div>
    </div>
  );
}
