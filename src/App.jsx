import { useEffect, useLayoutEffect, useState } from 'react';
import {
  FORCED_BYPASS_USER_ID,
  getStoredSupabaseUserId,
  PROFILES_TABLE,
  supabase,
} from './services/supabaseClient';
import Auth from "./components/Auth";
import Dashboard from './components/dashboard/Dashboard';
import OnboardingLegal from './components/OnboardingLegal';
import EmailConfirmationNotice from './components/EmailConfirmationNotice';
import PricingPage from './components/PricingPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';

/** Solo `VITE_TEMP_LOGIN_BYPASS=true` en .env para preview local sin login. */
const TEMP_LOGIN_BYPASS = import.meta.env.VITE_TEMP_LOGIN_BYPASS === 'true';

export default function App() {
  const [routePath, setRoutePath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!TEMP_LOGIN_BYPASS);
  const [legalLoading, setLegalLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const bypassUserId = getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID;
  const localBypassSession = {
    user: {
      id: bypassUserId || '',
      email: 'preview@local.dev',
      email_confirmed_at: '2099-01-01T00:00:00.000Z',
    },
  };
  const effectiveSession = TEMP_LOGIN_BYPASS ? session ?? localBypassSession : session;

  const fetchLegalStatus = async (currentSession, { blockUI = true } = {}) => {
    if (!currentSession?.user?.id) {
      setHasAcceptedTerms(false);
      setLegalLoading(false);
      return;
    }

    if (blockUI) {
      setLegalLoading(true);
    }

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('acepta_terminos')
      .eq('id', currentSession.user.id)
      .maybeSingle();

    if (error) {
      setHasAcceptedTerms(false);
      setLegalLoading(false);
      return;
    }

    setHasAcceptedTerms(Boolean(data?.acepta_terminos));
    setLegalLoading(false);
  };

  useEffect(() => {
    const onPopState = () => setRoutePath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const inicializarSesion = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(currentSession ?? null);
        await fetchLegalStatus(currentSession ?? null);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) {
        return;
      }

      setSession(currentSession ?? null);
      setLoading(false);

      /* TOKEN_REFRESHED al volver del fondo (móvil): no mostrar pantalla legal ni desmontar el dashboard */
      if (event === 'TOKEN_REFRESHED') {
        void fetchLegalStatus(currentSession ?? null, { blockUI: false });
        return;
      }

      void fetchLegalStatus(currentSession ?? null, { blockUI: true });
    });

    inicializarSesion();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /** Sesión activa en /login: sincronizar URL sin recargar (evita choque con onAuthStateChange / getSession). */
  useLayoutEffect(() => {
    if (routePath !== '/login' || !session?.user?.id) return;
    window.history.replaceState(null, '', '/');
    setRoutePath('/');
  }, [routePath, session]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      /* continuar igual: limpiar almacenamiento local */
    }
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    setSession(null);
    setHasAcceptedTerms(false);
    setLegalLoading(false);
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[#4B2C82] animate-pulse uppercase italic text-2xl">
        Agente Advance...
      </div>
    );
  }

  if (routePath === '/login') {
    if (session?.user?.id) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[#4B2C82] animate-pulse uppercase italic text-2xl">
          Entrando...
        </div>
      );
    }
    return <Auth />;
  }

  if (routePath === '/pricing') {
    return <PricingPage session={session} />;
  }

  if (routePath === '/terminos-y-condiciones' || routePath === '/terms') {
    return <TermsPage />;
  }

  if (routePath === '/privacidad' || routePath === '/privacy') {
    return <PrivacyPage />;
  }

  if (TEMP_LOGIN_BYPASS) {
    return (
      <Dashboard
        session={effectiveSession}
        onSignOut={handleSignOut}
        bypassLogin={!session}
        openFormOnLoad
      />
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!session.user?.email_confirmed_at) {
    return <EmailConfirmationNotice email={session.user?.email || ''} />;
  }

  if (legalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[#4B2C82] animate-pulse uppercase italic text-2xl">
        Preparando tu acceso...
      </div>
    );
  }

  if (!hasAcceptedTerms) {
    return (
      <OnboardingLegal
        session={session}
        onAccepted={async () => {
          await fetchLegalStatus(session);
        }}
      />
    );
  }

  return <Dashboard session={session} onSignOut={handleSignOut} />;
}
