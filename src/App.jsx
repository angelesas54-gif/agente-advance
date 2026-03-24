import { useEffect, useState } from 'react';
import { PROFILES_TABLE, supabase } from './services/supabaseClient';
import ClienteForm from "./components/ClienteForm";
import Auth from "./components/Auth";
import PerfilForm from "./components/PerfilForm";
import Dashboard from './components/dashboard/Dashboard';
import OnboardingLegal from './components/OnboardingLegal';
import EmailConfirmationNotice from './components/EmailConfirmationNotice';
import PricingPage from './components/PricingPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import StripeSuccess from './components/StripeSuccess';

export default function App() {
  void ClienteForm;
  void PerfilForm;
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [legalLoading, setLegalLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const fetchLegalStatus = async (currentSession) => {
    if (!currentSession?.user?.id) {
      setHasAcceptedTerms(false);
      setLegalLoading(false);
      return;
    }

    setLegalLoading(true);

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('acepta_terminos')
      .eq('id', currentSession.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error al verificar aceptación legal:', error);
      setHasAcceptedTerms(false);
      setLegalLoading(false);
      return;
    }

    setHasAcceptedTerms(Boolean(data?.acepta_terminos));
    setLegalLoading(false);
  };

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
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) {
        return;
      }

      setSession(currentSession ?? null);
      fetchLegalStatus(currentSession ?? null);
      setLoading(false);
    });

    inicializarSesion();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    setSession(null);
    setHasAcceptedTerms(false);
    setLegalLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[#4B2C82] animate-pulse uppercase italic text-2xl">
        Agente Advance...
      </div>
    );
  }

  if (pathname === '/pricing') {
    return <PricingPage session={session} />;
  }

  if (pathname === '/terminos-y-condiciones' || pathname === '/terms') {
    return <TermsPage />;
  }

  if (pathname === '/privacidad' || pathname === '/privacy') {
    return <PrivacyPage />;
  }

  if (pathname === '/success') {
    return <StripeSuccess session={session} />;
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
