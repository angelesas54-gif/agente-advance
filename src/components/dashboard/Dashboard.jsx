import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClienteForm from '../ClienteForm';
import {
  ADMIN_USER_ID,
  FORCED_BYPASS_USER_ID,
  getStoredSupabaseUserId,
  PROFILES_TABLE,
  supabase,
} from '../../services/supabaseClient';
import {
  clearAllClienteFormDraftsForUser,
  removeClienteFormDraftStorage,
} from '../../services/clienteFormDraftStorage';
import PerfilForm from '../PerfilForm';
import CustomerTable from './CustomerTable';
import StatsGrid from './StatsGrid';
import {
  openPaddleCheckout,
  PADDLE_CHECKOUT_COMPLETED_EVENT,
  PADDLE_PENDING_PRO_REFRESH_KEY,
  PADDLE_PRICE_IDS,
} from '../../services/paddleClient';

const CUSTOMER_DRAFT_KEYS = [
  'temp_titulo',
  'temp_precio',
  'temp_desc',
  'temp_precios',
  'temp_links',
  'temp_compradorImagen',
  'temp_fechaVisita',
  'temp_fichaColega',
  'borrador_agente_advance',
];
const LAST_PLAN_STORAGE_KEY = 'agente_advance_last_plan';
const FREE_PLAN_LIMIT_MESSAGE =
  'Límite de plan gratuito alcanzado. ¡Pasate a PRO para uso ilimitado! 🚀';
const SUPPORT_EMAIL = 'info@agenteadvance.com';
const LOCAL_BYPASS_PROFILE = {
  nombre_agente: 'Vista local',
  email: 'preview@local.dev',
  plan: 'admin',
  clientes_creados_totales: 0,
};

function clearCustomerDraft() {
  CUSTOMER_DRAFT_KEYS.forEach((key) => localStorage.removeItem(key));
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getCriticalDate(cliente) {
  const fechaAgenda = cliente.fecha_agenda ? cliente.fecha_agenda.substring(0, 10) : null;
  const fechaVisita = cliente.proxima_visita ? cliente.proxima_visita.substring(0, 10) : null;
  const fechas = [fechaAgenda, fechaVisita].filter(Boolean);

  if (fechas.length === 0) {
    return null;
  }

  return fechas.sort()[0];
}

export default function Dashboard({
  session,
  onSignOut,
  bypassLogin = false,
  openFormOnLoad = false,
}) {
  const [perfil, setPerfil] = useState(() => (bypassLogin ? LOCAL_BYPASS_PROFILE : null));
  const [vistaActiva, setVistaActiva] = useState(openFormOnLoad ? 'formulario' : 'principal');
  const [loading, setLoading] = useState(!bypassLogin);
  const [clientes, setClientes] = useState([]);
  const [totalClientesCreados, setTotalClientesCreados] = useState(0);
  const [clientesCargando, setClientesCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [clienteAEditar, setClienteAEditar] = useState(null);
  const [filtroAlertas, setFiltroAlertas] = useState(null);
  const [mostrarModalPro, setMostrarModalPro] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [mostrarFelicitacionPro, setMostrarFelicitacionPro] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState(FREE_PLAN_LIMIT_MESSAGE);
  const [mostrarToastSoporte, setMostrarToastSoporte] = useState(false);
  const proToastTimeoutRef = useRef(null);
  const soporteToastTimeoutRef = useRef(null);

  const hoyStr = getTodayString();

  const fetchPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null);
      return null;
    }

    try {
      setProfileError('');

      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const perfilNormalizado = data
        ? {
            ...data,
            plan:
              String(data.plan || '').toLowerCase() === 'admin'
                ? 'admin'
                : String(data.plan || '').toLowerCase() === 'pro'
                  ? 'pro'
                  : 'free',
            email: data.email || session?.user?.email || '',
          }
        : {
            plan: 'free',
            email: session?.user?.email || '',
          };

      setPerfil(perfilNormalizado);

      if (!perfilNormalizado?.nombre_agente) {
        setVistaActiva('perfil');
      }

      return perfilNormalizado;
    } catch {
      const perfilFallback = {
        nombre_agente: '',
        email: session?.user?.email || '',
      };

      setPerfil(perfilFallback);
      setProfileError(
        'No pudimos cargar tu perfil ahora mismo. Puedes seguir usando el panel y reintentar luego.',
      );
      return perfilFallback;
    }
  }, [session?.user?.email]);

  const obtenerClientes = useCallback(async () => {
    if (!session?.user?.id) {
      setClientes([]);
      return [];
    }

    setClientesCargando(true);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('nombre', { ascending: true });

      if (error) {
        throw error;
      }

      const customers = data || [];
      setClientes(customers);
      return customers;
    } catch {
      setClientes([]);
      return [];
    } finally {
      setClientesCargando(false);
    }
  }, [session?.user?.id]);

  const fetchPerfilRef = useRef(fetchPerfil);
  const obtenerClientesRef = useRef(obtenerClientes);
  fetchPerfilRef.current = fetchPerfil;
  obtenerClientesRef.current = obtenerClientes;

  const refreshProStatusAfterCheckout = useCallback(async () => {
    if (!session?.user?.id) {
      return false;
    }

    let attempts = 0;

    while (attempts < 8) {
      const perfilActualizado = await fetchPerfil(session?.user?.id);
      const nextPlan = String(perfilActualizado?.plan || '').toLowerCase();

      if (nextPlan === 'pro' || nextPlan === 'admin') {
        window.sessionStorage?.removeItem(PADDLE_PENDING_PRO_REFRESH_KEY);
        await obtenerClientes();
        return true;
      }

      attempts += 1;

      if (attempts < 8) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    }

    return false;
  }, [fetchPerfil, obtenerClientes, session?.user?.id]);

  useEffect(() => {
    if (bypassLogin) {
      setPerfil((currentProfile) => currentProfile ?? LOCAL_BYPASS_PROFILE);
      setClientes([]);
      setTotalClientesCreados(0);
      setProfileError('');
      setLoading(false);
      setVistaActiva((currentView) => (currentView && currentView !== 'login' ? currentView : 'formulario'));
      return;
    }

    if (!session?.user?.id) {
      setPerfil(null);
      setClientes([]);
      setTotalClientesCreados(0);
      setLoading(false);
      return;
    }

    const sessionUserId = session.user.id;
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      await Promise.all([
        fetchPerfilRef.current(sessionUserId),
        obtenerClientesRef.current(),
      ]);

      if (active) {
        setVistaActiva((currentView) =>
          currentView && currentView !== 'login' ? currentView : 'principal',
        );
        setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [bypassLogin, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || typeof window === 'undefined') {
      return undefined;
    }

    let active = true;
    let refreshing = false;

    const syncProPlan = async () => {
      if (!active || refreshing) {
        return;
      }

      refreshing = true;

      try {
        await refreshProStatusAfterCheckout();
      } finally {
        refreshing = false;
      }
    };

    if (window.sessionStorage?.getItem(PADDLE_PENDING_PRO_REFRESH_KEY) === '1') {
      void syncProPlan();
    }

    window.addEventListener(PADDLE_CHECKOUT_COMPLETED_EVENT, syncProPlan);

    return () => {
      active = false;
      window.removeEventListener(PADDLE_CHECKOUT_COMPLETED_EVENT, syncProPlan);
    };
  }, [refreshProStatusAfterCheckout, session?.user?.id]);

  const obtenerColorSemaforo = useCallback(
    (cliente) => {
      const fecha = getCriticalDate(cliente);

      if (!fecha) return 'bg-slate-300';
      if (fecha < hoyStr) return 'bg-red-500';
      if (fecha === hoyStr) return 'bg-green-500';

      return 'bg-blue-500';
    },
    [hoyStr],
  );

  const clientesAtrasados = useMemo(
    () => clientes.filter((cliente) => {
      const fecha = getCriticalDate(cliente);
      return fecha && fecha < hoyStr;
    }),
    [clientes, hoyStr],
  );

  const clientesHoy = useMemo(
    () => clientes.filter((cliente) => getCriticalDate(cliente) === hoyStr),
    [clientes, hoyStr],
  );

  const clientesProximos = useMemo(
    () => clientes.filter((cliente) => {
      const fecha = getCriticalDate(cliente);
      return fecha && fecha > hoyStr;
    }),
    [clientes, hoyStr],
  );

  const clientesFiltrados = useMemo(() => {
    const busquedaLower = busqueda.trim().toLowerCase();

    return clientes
      .filter((cliente) => {
        const cumpleBusqueda = (cliente.nombre || '').toLowerCase().includes(busquedaLower);

        if (vistaActiva !== 'lista_alertas') {
          return cumpleBusqueda;
        }

        const fecha = getCriticalDate(cliente);

        if (filtroAlertas === 'urgente') return cumpleBusqueda && fecha && fecha < hoyStr;
        if (filtroAlertas === 'hoy') return cumpleBusqueda && fecha === hoyStr;
        if (filtroAlertas === 'proximos') return cumpleBusqueda && fecha && fecha > hoyStr;

        return cumpleBusqueda;
      })
      .sort((firstCustomer, secondCustomer) => {
        const fechaA = getCriticalDate(firstCustomer) || '9999-12-31';
        const fechaB = getCriticalDate(secondCustomer) || '9999-12-31';
        return fechaA.localeCompare(fechaB);
      });
  }, [busqueda, clientes, filtroAlertas, hoyStr, vistaActiva]);

  const clientesEnAlerta =
    filtroAlertas === 'urgente'
      ? clientesAtrasados
      : filtroAlertas === 'hoy'
        ? clientesHoy
        : clientesProximos;

  const profilePlan = String(perfil?.plan || 'free').toLowerCase();
  const profileCreatedCustomers = Number(perfil?.clientes_creados_totales || 0);
  const isAdminUser =
    profilePlan === 'admin' || (ADMIN_USER_ID && session?.user?.id === ADMIN_USER_ID);
  const plan = isAdminUser ? 'admin' : profilePlan === 'pro' ? 'pro' : 'free';
  const isProPlan = plan === 'pro' || plan === 'admin';
  const freeCustomerLimitReached = !isProPlan && !isAdminUser && totalClientesCreados >= 5;

  useEffect(() => {
    setTotalClientesCreados((currentTotal) =>
      Math.max(currentTotal, profileCreatedCustomers, clientes?.length || 0),
    );
  }, [clientes?.length, profileCreatedCustomers]);

  useEffect(() => {
    if (
      !session?.user?.id ||
      isProPlan ||
      totalClientesCreados <= 0 ||
      totalClientesCreados <= profileCreatedCustomers
    ) {
      return;
    }

    let active = true;

    const syncCreatedCustomers = async () => {
      const { error } = await supabase.from(PROFILES_TABLE).upsert({
        id: session?.user?.id,
        clientes_creados_totales: totalClientesCreados,
      });

      if (error) {
        return;
      }

      if (active) {
        setPerfil((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                clientes_creados_totales: totalClientesCreados,
              }
            : currentProfile,
        );
      }
    };

    syncCreatedCustomers();

    return () => {
      active = false;
    };
  }, [
    isProPlan,
    profileCreatedCustomers,
    session?.user?.id,
    totalClientesCreados,
  ]);

  useEffect(() => {
    const storage = globalThis?.sessionStorage;
    const previousPlan = storage?.getItem(LAST_PLAN_STORAGE_KEY) || '';
    const shouldShowProToast =
      previousPlan && previousPlan !== 'pro' && previousPlan !== 'admin' && isProPlan;

    if (shouldShowProToast) {
      setMostrarFelicitacionPro(true);

      if (proToastTimeoutRef.current) {
        clearTimeout(proToastTimeoutRef.current);
      }

      proToastTimeoutRef.current = window.setTimeout(() => {
        setMostrarFelicitacionPro(false);
        proToastTimeoutRef.current = null;
      }, 4000);
    }

    storage?.setItem(LAST_PLAN_STORAGE_KEY, plan || 'free');

    return () => {
      if (proToastTimeoutRef.current) {
        clearTimeout(proToastTimeoutRef.current);
        proToastTimeoutRef.current = null;
      }
    };
  }, [isProPlan, plan]);

  const eliminarCliente = async (id) => {
    if (!window.confirm('¿Seguro que querés borrar este cliente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('user_id', session?.user?.id);

      if (error) {
        throw error;
      }

      await obtenerClientes();
    } catch (error) {
      console.log(error);
    }
  };

  const finalizarEdicion = useCallback(async () => {
    setClienteAEditar(null);
    setVistaActiva('principal');
    await Promise.all([obtenerClientes(), fetchPerfil(session?.user?.id)]);
  }, [fetchPerfil, obtenerClientes, session?.user?.id]);

  const openUpgradeModal = useCallback(
    (message = FREE_PLAN_LIMIT_MESSAGE) => {
      setUpgradeModalMessage(message || FREE_PLAN_LIMIT_MESSAGE);
      setMostrarModalPro(true);
    },
    [],
  );

  const handleAyudaSoporte = useCallback(() => {
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ayuda Agente Advance')}`;

    const copiarYMostrarCartel = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(SUPPORT_EMAIL);
        } else {
          const ta = document.createElement('textarea');
          ta.value = SUPPORT_EMAIL;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      } catch {
        /* el cartel igual muestra el mail */
      }

      setMostrarToastSoporte(true);
      if (soporteToastTimeoutRef.current) {
        window.clearTimeout(soporteToastTimeoutRef.current);
      }
      soporteToastTimeoutRef.current = window.setTimeout(() => {
        setMostrarToastSoporte(false);
        soporteToastTimeoutRef.current = null;
      }, 5000);
    };

    void copiarYMostrarCartel();

    try {
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      try {
        window.location.assign(mailtoUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (soporteToastTimeoutRef.current) {
        window.clearTimeout(soporteToastTimeoutRef.current);
      }
    };
  }, []);

  const handleNewCustomer = () => {
    if (freeCustomerLimitReached) {
      openUpgradeModal(FREE_PLAN_LIMIT_MESSAGE);
      return;
    }

    const uid = session?.user?.id || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID;
    if (uid) {
      removeClienteFormDraftStorage(uid, null);
    }

    setClienteAEditar(null);
    setVistaActiva('formulario');
  };

  const handleEditCustomer = (cliente) => {
    setClienteAEditar(cliente);
    setVistaActiva('formulario');
  };

  const handleCancelForm = () => {
    const uid = session?.user?.id || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID;
    if (uid) {
      removeClienteFormDraftStorage(uid, clienteAEditar?.id ?? null);
    }
    clearCustomerDraft();
    setClienteAEditar(null);
    setVistaActiva('principal');
  };

  const handleProfileComplete = async () => {
    await fetchPerfil(session?.user?.id);
    setVistaActiva('principal');
  };

  const handleStartCheckout = async (planType) => {
    try {
      setCheckoutLoading(planType);

      await openPaddleCheckout({
        priceId: PADDLE_PRICE_IDS[planType],
        email: session?.user?.email || '',
        userId: session?.user?.id || '',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setCheckoutLoading('');
    }
  };

  const handleSignOut = async () => {
    const uid = session?.user?.id || getStoredSupabaseUserId();
    if (uid) {
      clearAllClienteFormDraftsForUser(uid);
    }
    clearCustomerDraft();
    globalThis?.sessionStorage?.removeItem(LAST_PLAN_STORAGE_KEY);
    setPerfil(null);
    setClientes([]);
    setTotalClientesCreados(0);
    setVistaActiva('principal');

    if (typeof onSignOut === 'function') {
      await onSignOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[#4B2C82] animate-pulse uppercase italic text-2xl">
        Agente Advance...
      </div>
    );
  }

  if (!perfil?.nombre_agente && !profileError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-[#4B2C82] mb-4 uppercase italic">
          Configurá tu Perfil
        </h2>

        <PerfilForm
          session={session}
          perfilExistente={perfil}
          onProfileComplete={handleProfileComplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {vistaActiva === 'perfil' && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-white p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[960px]" style={{ margin: '0 auto' }}>
            <button
              type="button"
              onClick={() => setVistaActiva('principal')}
              className="mb-8 text-[#4B2C82] font-black text-[10px] uppercase bg-slate-100 px-4 py-2 rounded-full cursor-pointer"
            >
              ← Volver al Semáforo
            </button>

            <h2 className="text-2xl font-black text-[#4B2C82] mb-6 uppercase italic tracking-tighter text-center">
              Editar Mi Perfil
            </h2>

            <PerfilForm
              session={session}
              perfilExistente={perfil}
              onProfileComplete={handleProfileComplete}
            />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1280px]">
        <header className="mb-8 w-full">
          {profileError && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {profileError}
            </div>
          )}

          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src="/logo.png?v=3"
                alt="Logo Agente Advance"
                className="h-24 md:h-32 w-auto object-contain"
              />

              <div className="flex-shrink-0 self-center">
                <span
                  className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-sm border ${
                    isProPlan
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white shadow-md border-yellow-300'
                      : 'bg-slate-200 text-slate-500 border-slate-300'
                  }`}
                >
                  {isProPlan ? 'PRO PLAN' : 'FREE PLAN'}
                </span>
              </div>
            </div>

            <div className="relative z-[10050] flex flex-col items-end gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handleAyudaSoporte}
                aria-label={`Abrir correo a ${SUPPORT_EMAIL} y copiar la dirección`}
                className="text-[10px] font-black uppercase text-[#4B2C82] bg-violet-50 px-3 py-2 rounded-lg border border-violet-200 shadow-sm hover:bg-violet-100 transition-colors text-center cursor-pointer relative z-[10051]"
              >
                Ayuda
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setVistaActiva('perfil');
                }}
                className="text-[10px] font-black uppercase text-slate-700 bg-white p-3 rounded-lg border border-slate-200 shadow-md hover:bg-slate-50 transition-colors"
              >
                Mi Perfil
              </button>

              {!isProPlan && (
                <button
                  type="button"
                  onClick={() => openUpgradeModal('Desbloqueá clientes, documentos y edición ilimitada con PRO.')}
                  className="text-[10px] font-black uppercase text-[#4B2C82] bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Pasar a PRO ⭐
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
              Panel principal
            </p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 border-l-4 border-[#4B2C82] pl-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Agente: <span className="text-[#4B2C82]">{perfil?.nombre_agente}</span>
                </p>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                Gestiona clientes, fichas y reportes desde un solo lugar.
              </p>
            </div>
          </div>

          {mostrarFelicitacionPro ? (
            <div className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 pointer-events-none sm:left-auto sm:right-4">
              <div className="rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-center text-sm font-black text-emerald-600 shadow-xl backdrop-blur-sm">
                ¡Felicitaciones, ahora sos PRO! 🚀
              </div>
            </div>
          ) : null}

          {mostrarToastSoporte ? (
            <div
              className="fixed left-4 right-4 top-[max(4.5rem,env(safe-area-inset-top)+3rem)] z-[10100] pointer-events-none sm:left-auto sm:right-4 sm:max-w-md"
              role="status"
            >
              <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-center text-xs font-bold text-[#4B2C82] shadow-xl">
                Mail de soporte copiado: {SUPPORT_EMAIL}
              </div>
            </div>
          ) : null}
        </header>

        {vistaActiva === 'principal' && (
          <>
            <StatsGrid
              counts={{
                urgente: clientesAtrasados.length,
                hoy: clientesHoy.length,
                proximos: clientesProximos.length,
              }}
              onSelectFilter={(filter) => {
                setFiltroAlertas(filter);
                setVistaActiva('lista_alertas');
              }}
            />

            <CustomerTable
              busqueda={busqueda}
              clientes={clientesFiltrados}
              clientesCargando={clientesCargando}
              freeCustomerLimitReached={freeCustomerLimitReached}
              onBusquedaChange={setBusqueda}
              onDeleteCustomer={eliminarCliente}
              onEditCustomer={handleEditCustomer}
              onNewCustomer={handleNewCustomer}
              onUpgradePlan={openUpgradeModal}
              obtenerColorSemaforo={obtenerColorSemaforo}
              obtenerFechaCritica={getCriticalDate}
            />
          </>
        )}

        {vistaActiva === 'lista_alertas' && (
          <div className="space-y-4">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setVistaActiva('principal');
                }}
                className="text-[10px] font-black uppercase bg-slate-200 px-4 py-2 rounded-full text-slate-600 cursor-pointer relative z-[9999] hover:bg-slate-300 active:scale-95 transition-all"
                style={{ isolation: 'isolate' }}
              >
                ← Volver al Inicio
              </button>

              <h2 className="text-xl font-black text-slate-800 uppercase italic">
                {filtroAlertas === 'urgente'
                  ? '🔴 Atrasados'
                  : filtroAlertas === 'hoy'
                    ? '🟢 Hoy'
                    : '🔵 Próximos'}
              </h2>
            </div>

            <div className="grid gap-3">
              {clientesEnAlerta.map((cliente) => {
                const etiquetaSemaforoSinMotivo =
                  filtroAlertas === 'proximos' ? 'PRÓXIMA VISITA' : 'PENDIENTE';

                return (
                <div
                  key={cliente.id}
                  onClick={() => handleEditCustomer(cliente)}
                  className="bg-white p-5 rounded-[25px] shadow-sm border border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-lg">
                      {cliente.nombre || 'SIN NOMBRE'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                      {cliente.motivo_alerta || etiquetaSemaforoSinMotivo}
                    </p>
                  </div>

                  <div className={`w-4 h-4 rounded-full ${obtenerColorSemaforo(cliente)}`} />
                </div>
                );
              })}

              {clientesEnAlerta.length === 0 && (
                <p className="text-center text-slate-400 font-bold uppercase py-10">
                  No hay clientes en esta lista
                </p>
              )}
            </div>
          </div>
        )}

        {vistaActiva === 'formulario' && (
          <div className="mx-auto w-full max-w-4xl px-1 sm:px-4">
            <button
              type="button"
              onClick={handleCancelForm}
              className="mb-6 text-slate-500 font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
              style={{ zIndex: 9999, position: 'relative' }}
            >
              ← Volver
            </button>

            <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl border">
              <ClienteForm
                key={clienteAEditar?.id ?? 'nuevo'}
                edicion={clienteAEditar}
                setEdicion={setClienteAEditar}
                onSave={finalizarEdicion}
                onCancel={handleCancelForm}
                userId={session?.user?.id}
                datosPerfil={perfil}
                totalClientesActuales={totalClientesCreados}
                onUpgradePlan={openUpgradeModal}
              />
            </div>
          </div>
        )}

        <div className="mt-10 mb-10 flex justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 shadow-md transition hover:bg-red-50"
          >
            Cerrar Sesión
          </button>
        </div>
      </main>

      {mostrarModalPro && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <span className="text-4xl">🚀</span>
              <h2 className="text-2xl font-black text-slate-800 mt-4 tracking-tighter">
                {isProPlan ? 'Tu plan ya está activo' : '¡Tu negocio merece ser PRO!'}
              </h2>
              <p className="text-slate-500 font-medium mt-2 text-sm">
                {isProPlan
                  ? 'Ya tenés acceso PRO. No hace falta volver a comprar un plan.'
                  : upgradeModalMessage}
              </p>
            </div>

            {isProPlan ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
                  Estado actual
                </p>
                <p className="mt-3 text-2xl font-black text-emerald-700">Plan PRO Activo</p>
                <p className="mt-2 text-sm font-medium text-emerald-700/80">
                  Tus beneficios premium ya están habilitados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => handleStartCheckout('monthly')}
                  disabled={checkoutLoading === 'monthly'}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all text-left flex items-center justify-between gap-3 group bg-white"
                >
                  <div className="min-w-0">
                    <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                      Plan Mensual
                    </p>
                    <p className="text-2xl font-black text-slate-800 group-hover:text-[#4B2C82] transition-colors">
                      USD 9.90
                    </p>
                    {checkoutLoading === 'monthly' && (
                      <p className="text-[10px] text-slate-400 font-bold italic mt-1">
                        Abriendo checkout...
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white p-2 rounded-full transition-all">
                    →
                  </span>
                </button>

                <button
                  onClick={() => handleStartCheckout('annual')}
                  disabled={checkoutLoading === 'annual'}
                  className="w-full p-4 rounded-2xl border-2 border-[#001f3f] bg-slate-50 hover:bg-white transition-all text-left flex items-center justify-between gap-3 relative overflow-hidden group shadow-sm"
                >
                  <div className="absolute top-0 right-0 bg-[#001f3f] text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest">
                    Ahorrá 20%
                  </div>
                  <div className="min-w-0 pr-16">
                    <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                      Plan Anual
                    </p>
                    <p className="text-2xl font-black text-[#001f3f]">USD 79.00</p>
                    <p className="text-[10px] text-slate-400 font-bold italic">
                      Un solo pago al año
                    </p>
                    {checkoutLoading === 'annual' && (
                      <p className="text-[10px] text-slate-400 font-bold italic mt-1">
                        Abriendo checkout...
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 bg-[#001f3f] text-white p-2 rounded-full transition-transform group-hover:scale-110">
                    →
                  </span>
                </button>
              </div>
            )}

            <button
              onClick={() => setMostrarModalPro(false)}
              className="w-full mt-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
            >
              Quizás más tarde
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
