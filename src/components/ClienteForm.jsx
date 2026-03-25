import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ADMIN_USER_ID,
  FORCED_BYPASS_USER_ID,
  getStoredSupabaseUserId,
  HISTORIAL_INTERACCIONES_TABLE,
  PROFILES_TABLE,
  supabase,
} from '../services/supabaseClient';
import {
  CLIENTE_FORM_DRAFT_VERSION,
  getClienteFormDraftStorageKey,
  removeClienteFormDraftStorage,
} from '../services/clienteFormDraftStorage';
import { jsPDF } from 'jspdf';

const FREE_PLAN_LIMIT_MESSAGE =
  'Límite de plan gratuito alcanzado. ¡Pasate a PRO para uso ilimitado! 🚀';

async function registrarHistorialInteraccion(fila) {
  const tabla = (HISTORIAL_INTERACCIONES_TABLE || '').trim();
  if (!tabla) return;
  const { error } = await supabase.from(tabla).insert(fila);
  if (error) {
    console.warn('[historial_interacciones]', error.message);
  }
}

function normalizarWebsiteUrl(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function obtenerNombreMarca(datosPerfil) {
  return (
    datosPerfil?.inmobiliaria?.trim() ||
    datosPerfil?.nombre_agente?.trim() ||
    'Agente Advance'
  );
}

function obtenerFormatoImagen(dataUrl) {
  if (!dataUrl) return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

function getDocumentLimitStorageKey(userId) {
  return `agente_advance_docs_total_${userId || 'anon'}`;
}

async function convertirImagenUrlABase64(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen (${response.status})`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function ClienteForm({
  onSave,
  edicion,
  onCancel,
  setEdicion,
  userId,
  datosPerfil,
  totalClientesActuales,
  onUpgradePlan,
}) {
const [nombre, setNombre] = useState('');
const [telefono, setTelefono] = useState('');
const [motivoConsulta, setMotivoConsulta] = useState('');
const [rol, setRol] = useState('vendedor');
const [metros, setMetros] = useState(['', '', '']);
const [precioTasacion, setPrecioTasacion] = useState('');
const [fichaColega, setFichaColega] = useState({ link: '', tel: '' });
const [compradorImagen, setCompradorImagen] = useState('');
const [perfilAgente, setPerfilAgente] = useState({ nombre: '', email: '', telefono: '' });
const [promedioReal, setPromedioReal] = useState(0);
const [motivoAlerta, setMotivoAlerta] = useState('');
const [comentarioSeguimiento, setComentarioSeguimiento] = useState('');
const [ultimoContacto, setUltimoContacto] = useState('');

// --- NUEVOS ESTADOS PARA LA ENCUESTA (SOLO COMPRADOR) ---
const [encuestaVisible, setEncuestaVisible] = useState(false);
const [pasoEncuesta, setPasoEncuesta] = useState(1);
const [ratingExteriores, setRatingExteriores] = useState(0);
const [ratingAmenities, setRatingAmenities] = useState(0);
const [ratingEstadoGeneral, setRatingEstadoGeneral] = useState(0);
const [precioRazonable, setPrecioRazonable] = useState(null);
const [clienteNombre, setClienteNombre] = useState('');
const [clienteTelefonoEncuesta, setClienteTelefonoEncuesta] = useState('');
const [opinionMejor, setOpinionMejor] = useState('');
const [opinionPeor, setOpinionPeor] = useState('');
const [vistaFichas, setVistaFichas] = useState(null); // o 'formulario'
const [fichasCompartidas, setFichasCompartidas] = useState([]);
const [fichaEnEdicion, setFichaEnEdicion] = useState(null);
const [clienteActivoId, setClienteActivoId] = useState(edicion?.id || null);
const [mostrarExito, setMostrarExito] = useState(false);
const [pdfLoading, setPdfLoading] = useState(false);
const [fechaFicha, setFechaFicha] = useState(new Date().toISOString().split('T')[0]);
const [vistazoFicha, setVistazoFicha] = useState(null);
const [fechaIngreso, setFechaIngreso] = useState('');
const [fechaVisita, setFechaVisita] = useState('');
const [fechaAgenda, setFechaAgenda] = useState('');
const [fichaVisualizar, setFichaVisualizar] = useState(null);
const [mostrarToastBloqueo, setMostrarToastBloqueo] = useState(false);
const bloqueoToastTimeoutRef = useRef(null);
const [guardandoAgenda, setGuardandoAgenda] = useState(false);
const [contactEditEnabled, setContactEditEnabled] = useState(false);
const [documentosGeneradosTotales, setDocumentosGeneradosTotales] = useState(() => {
  const storageCount = Number(
    globalThis?.localStorage?.getItem(getDocumentLimitStorageKey(userId)) || 0,
  );
  return Math.max(Number(datosPerfil?.documentos_generados_totales || 0), storageCount);
});
// --- Ficha comprador: siempre inicio vacío (no localStorage global: mezclaba clientes A/B en producción) ---
const [compradorTitulo, setCompradorTitulo] = useState('');
const [compradorPrecio, setCompradorPrecio] = useState('');
const [compradorDesc, setCompradorDesc] = useState('');

const [precios, setPrecios] = useState(['', '', '']);

const [links, setLinks] = useState(['', '', '']);

const [fichaGuardadaVersion, setFichaGuardadaVersion] = useState(0);

const draftUserId = userId || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID || 'anon';
const skipDraftWriteUntilRef = useRef(0);
const latestDraftSnapshotRef = useRef(null);
const edicionIdRef = useRef(edicion?.id ?? null);

useEffect(() => {
  edicionIdRef.current = edicion?.id ?? null;
}, [edicion?.id]);

const clearDraftAfterSuccessfulSave = useCallback(
  (explicitClienteId) => {
    skipDraftWriteUntilRef.current = Date.now() + 1000;
    const resolved =
      explicitClienteId !== undefined ? explicitClienteId : edicionIdRef.current ?? null;
    removeClienteFormDraftStorage(draftUserId, resolved ?? null);
    removeClienteFormDraftStorage(draftUserId, null);
  },
  [draftUserId],
);

const resetFormularioFichaCompartida = useCallback(() => {
  setCompradorTitulo('');
  setCompradorPrecio('');
  setCompradorDesc('');
  setCompradorImagen('');
  setLinks(['', '', '']);
  setFichaColega({ link: '', tel: '' });
  setFechaFicha(new Date().toISOString().split('T')[0]);
  setFechaVisita('');
  setFichaEnEdicion(null);
  setFichaVisualizar(null);
  setVistaFichas('listado');
}, []);

useEffect(() => {
  if (fichaGuardadaVersion === 0) return;
  resetFormularioFichaCompartida();
}, [fichaGuardadaVersion, resetFormularioFichaCompartida]);

// ESTO CALCULA EL PROMEDIO AL VUELO
const calcularTasacionFinal = () => {

  if (!precios || precios.length === 0) return "";

  const pnumeros = precios.map(valor => {
    if (!valor) return 0;

    const limpio = String(valor)
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/USD/g, "")
      .trim();

    return parseFloat(limpio) || 0;
  });

  const validos = pnumeros.filter(n => n > 0);

  if (validos.length === 0) return "";

  const suma = validos.reduce((a,b)=>a+b,0);
  const promedio = suma / validos.length;

  return `USD ${Math.round(promedio).toLocaleString('es-AR')}`;

};

useEffect(() => {
  // Solo calculamos si no hay una tasación manual ya puesta o si es nuevo
  const resultado = calcularTasacionFinal();
  if (resultado) {
    setPrecioTasacion(resultado);
  }
}, [precios]);

useLayoutEffect(() => {
  const uid = userId || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID || 'anon';
  const eid = edicion?.id ?? null;
  const key = getClienteFormDraftStorageKey(uid, eid);

  try {
    const raw = globalThis?.localStorage?.getItem(key);
    if (raw) {
      const d = JSON.parse(raw);
      const sameUser = String(d.uid) === String(uid);
      const sameCliente = (d.eid ?? null) === (eid ?? null);
      if (d.v === CLIENTE_FORM_DRAFT_VERSION && sameUser && sameCliente) {
        setNombre(d.nombre ?? '');
        setTelefono(d.telefono ?? '');
        setMotivoConsulta(d.motivoConsulta ?? '');
        setRol(d.rol || 'comprador');
        setMetros(
          Array.isArray(d.metros) && d.metros.length === 3 ? d.metros : ['', '', ''],
        );
        setPrecioTasacion(d.precioTasacion ?? '');
        setFichaColega(
          d.fichaColega && typeof d.fichaColega === 'object'
            ? { link: d.fichaColega.link || '', tel: d.fichaColega.tel || '' }
            : { link: '', tel: '' },
        );
        setCompradorImagen(d.compradorImagen ?? '');
        setCompradorTitulo(d.compradorTitulo ?? '');
        setCompradorPrecio(d.compradorPrecio ?? '');
        setCompradorDesc(d.compradorDesc ?? '');
        setLinks(Array.isArray(d.links) && d.links.length === 3 ? d.links : ['', '', '']);
        setPrecios(Array.isArray(d.precios) && d.precios.length === 3 ? d.precios : ['', '', '']);
        setFechaIngreso(d.fechaIngreso ?? '');
        setFechaAgenda(d.fechaAgenda ?? '');
        setFechaVisita(d.fechaVisita ?? '');
        setMotivoAlerta(d.motivoAlerta ?? '');
        setComentarioSeguimiento(d.comentarioSeguimiento ?? '');
        setFechaFicha(d.fechaFicha || new Date().toISOString().split('T')[0]);
        setVistaFichas(d.vistaFichas !== undefined ? d.vistaFichas : null);
        setFichaEnEdicion(d.fichaEnEdicion ?? null);
        setFichaVisualizar(null);
        setContactEditEnabled(Boolean(d.contactEditEnabled));
        setClienteActivoId(d.clienteActivoId || eid || null);
        return;
      }
    }
  } catch {
    /* continuar con datos del servidor */
  }

  if (!edicion) {
    setContactEditEnabled(true);

    setNombre('');
    setTelefono('');
    setMotivoConsulta('');
    setRol('comprador');

    setFechaIngreso('');
    setFechaAgenda('');
    setFechaVisita('');

    setLinks(['', '', '']);
    setPrecios(['', '', '']);
    setMetros(['', '', '']);
    setPrecioTasacion('');

    setCompradorTitulo('');
    setCompradorPrecio('');
    setCompradorDesc('');
    setCompradorImagen('');

    setMotivoAlerta('');
    setComentarioSeguimiento('');

    setFichaColega({ link: '', tel: '' });

    setFichaEnEdicion(null);
    setFichaVisualizar(null);
    setVistaFichas('listado');
    setFechaFicha(new Date().toISOString().split('T')[0]);
    setClienteActivoId(null);

    return;
  }

  setContactEditEnabled(false);

  setNombre(edicion.nombre || '');
  setTelefono(edicion.telefono || '');
  setMotivoConsulta(edicion.motivo_consulta || '');

  const rolCliente = edicion.rol || 'comprador';
  setRol(rolCliente);

  setFechaIngreso(
    edicion.fecha_ingreso ? edicion.fecha_ingreso.substring(0, 10) : '',
  );

  setFechaAgenda(
    edicion.fecha_agenda ? edicion.fecha_agenda.substring(0, 10) : '',
  );

  setFechaVisita(
    edicion.proxima_visita ? edicion.proxima_visita.substring(0, 10) : '',
  );

  setMotivoAlerta(edicion.motivo_alerta || '');
  setComentarioSeguimiento(edicion.comentario || '');

  const esComprador = rolCliente === 'comprador';

  if (esComprador) {
    setLinks(['', '', '']);
    setPrecios(['', '', '']);
    setMetros(['', '', '']);
    setPrecioTasacion(edicion.precio_tasacion || '');
    setCompradorTitulo('');
    setCompradorPrecio('');
    setCompradorDesc('');
    setCompradorImagen('');
    setFichaColega({ link: '', tel: '' });
    setFichaEnEdicion(null);
    setFichaVisualizar(null);
    setVistaFichas('listado');
    setFechaFicha(new Date().toISOString().split('T')[0]);
    setClienteActivoId(edicion.id || null);
    return;
  }

  setLinks([edicion.link1 || '', edicion.link2 || '', edicion.link3 || '']);

  setPrecios([
    edicion.precio1 || '',
    edicion.precio2 || '',
    edicion.precio3 || '',
  ]);

  setMetros([edicion.m2_1 || '', edicion.m2_2 || '', edicion.m2_3 || '']);

  setPrecioTasacion(edicion.precio_tasacion || '');

  setCompradorTitulo('');
  setCompradorPrecio('');
  setCompradorDesc('');
  setCompradorImagen('');
  setFichaColega({ link: '', tel: '' });
  setClienteActivoId(edicion.id || null);
}, [edicion?.id, userId]);

const persistDraftSnapshotNow = useCallback((snapshot) => {
  if (!snapshot || Date.now() < skipDraftWriteUntilRef.current) return;
  const key = getClienteFormDraftStorageKey(snapshot.uid, snapshot.eid);
  try {
    globalThis?.localStorage?.setItem(key, JSON.stringify(snapshot));
  } catch {
    try {
      globalThis?.localStorage?.setItem(
        key,
        JSON.stringify({ ...snapshot, compradorImagen: '' }),
      );
    } catch {
      /* ignore */
    }
  }
}, []);

useLayoutEffect(() => {
  if (Date.now() < skipDraftWriteUntilRef.current) return;
  const eid = edicion?.id ?? null;
  latestDraftSnapshotRef.current = {
    v: CLIENTE_FORM_DRAFT_VERSION,
    uid: draftUserId,
    eid,
    nombre,
    telefono,
    motivoConsulta,
    rol,
    metros,
    precioTasacion,
    fichaColega,
    compradorImagen:
      compradorImagen && String(compradorImagen).length < 350000 ? compradorImagen : '',
    compradorTitulo,
    compradorPrecio,
    compradorDesc,
    links,
    precios,
    fechaIngreso,
    fechaAgenda,
    fechaVisita,
    motivoAlerta,
    comentarioSeguimiento,
    fechaFicha,
    vistaFichas,
    fichaEnEdicion,
    contactEditEnabled,
    clienteActivoId: clienteActivoId || eid || null,
  };
}, [
  draftUserId,
  edicion?.id,
  nombre,
  telefono,
  motivoConsulta,
  rol,
  metros,
  precioTasacion,
  fichaColega,
  compradorImagen,
  compradorTitulo,
  compradorPrecio,
  compradorDesc,
  links,
  precios,
  fechaIngreso,
  fechaAgenda,
  fechaVisita,
  motivoAlerta,
  comentarioSeguimiento,
  fechaFicha,
  vistaFichas,
  fichaEnEdicion,
  contactEditEnabled,
  clienteActivoId,
]);

useEffect(() => {
  const flush = () => persistDraftSnapshotNow(latestDraftSnapshotRef.current);

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('beforeunload', flush);
    document.removeEventListener('visibilitychange', onVisibility);
    flush();
  };
}, [persistDraftSnapshotNow]);

useEffect(() => {
  const t = window.setTimeout(() => {
    persistDraftSnapshotNow(latestDraftSnapshotRef.current);
  }, 480);
  return () => window.clearTimeout(t);
}, [
  draftUserId,
  edicion?.id,
  nombre,
  telefono,
  motivoConsulta,
  rol,
  metros,
  precioTasacion,
  fichaColega,
  compradorImagen,
  compradorTitulo,
  compradorPrecio,
  compradorDesc,
  links,
  precios,
  fechaIngreso,
  fechaAgenda,
  fechaVisita,
  motivoAlerta,
  comentarioSeguimiento,
  fechaFicha,
  vistaFichas,
  fichaEnEdicion,
  contactEditEnabled,
  clienteActivoId,
]);
  
  const cargarFichasCompartidas = async (clienteIdOverride = null) => {
    const clienteId = clienteIdOverride || clienteActivoId || edicion?.id;

    // 🛡️ Si no hay cliente o no es comprador, limpiamos y salimos
    if (!clienteId || rol !== 'comprador') {
      setFichasCompartidas([]);
      return;
    }
        try {
          const { data, error } = await supabase
            .from('fichas_compartidas')
            .select(
              'id,cliente_id,titulo,precio,descripcion,foto,link_propiedad,inmobiliaria_nombre,inmobiliaria_tel,fecha_compartida,proxima_visita',
            )
            .eq('cliente_id', clienteId)
            .order('fecha_compartida', { ascending: false });

          if (error) throw error;
          setFichasCompartidas(Array.isArray(data) ? data : []);
        } catch {
          setFichasCompartidas([]);
        }
      };

  const manejarSubidaFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompradorImagen(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const enviarFeedbackWhatsApp = () => {
    if (!clienteNombre || !clienteTelefonoEncuesta) {
      alert("Completar nombre y celular"); return;
    }
    const estrellas = (r) => "⭐".repeat(r) || "0⭐";
    const mensaje = `Nuevo feedback de visita:\nPropiedad: ${compradorTitulo}\nInteresado: ${clienteNombre}\nCel: ${clienteTelefonoEncuesta}\n\nExteriores: ${estrellas(ratingExteriores)}\nAmenities: ${estrellas(ratingAmenities)}\nEstado: ${estrellas(ratingEstadoGeneral)}\nPrecio razonable: ${precioRazonable}\n\nLo mejor: ${opinionMejor}\nA mejorar: ${opinionPeor}`;

    let nroAgente = telefono.replace(/\D/g, '');
    if (nroAgente && !nroAgente.startsWith('54')) nroAgente = '54' + nroAgente;
    window.open(`https://wa.me/${nroAgente}?text=${encodeURIComponent(mensaje)}`, '_blank');
    setEncuestaVisible(false); setPasoEncuesta(1);
  };

  // --- CARGA AUTOMÁTICA DE FICHAS AL ENTRAR AL CLIENTE ---
useEffect(() => {
  if ((clienteActivoId || edicion?.id) && rol === 'comprador') {
    cargarFichasCompartidas(clienteActivoId || edicion?.id);
  }
}, [clienteActivoId, edicion?.id, rol]);

useEffect(() => {
  const storageCount = Number(
    globalThis?.localStorage?.getItem(getDocumentLimitStorageKey(userId)) || 0,
  );
  setDocumentosGeneradosTotales(
    Math.max(Number(datosPerfil?.documentos_generados_totales || 0), storageCount),
  );
}, [datosPerfil?.documentos_generados_totales, userId]);

const generarPDF = async () => {
  if (limiteDocumentosAlcanzado) {
    mostrarToastPlanPro();
    if (typeof onUpgradePlan === 'function') {
      onUpgradePlan(FREE_PLAN_LIMIT_MESSAGE);
    }
    return;
  }

  setPdfLoading(true);

  try {
    const doc = new jsPDF();
    const azulMarino = [0, 31, 63];
    const grisSuave = [100, 100, 100];
    const verdeWA = [37, 211, 102];
    const grisNeutral = [71, 85, 105];
    const websiteUrl = normalizarWebsiteUrl(datosPerfil?.website_url || '');
    const nombreMarca = obtenerNombreMarca(datosPerfil);
    const logoDataUrl = await convertirImagenUrlABase64(datosPerfil?.logo_url);

    doc.setFontSize(11);
    doc.setTextColor(...grisNeutral);
    doc.setFont('helvetica', 'bold');
    doc.text(datosPerfil?.nombre_agente || 'Agente Inmobiliario', 20, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (datosPerfil?.inmobiliaria) {
      doc.text(datosPerfil.inmobiliaria, 20, 25);
    }

    if (datosPerfil?.email) {
      doc.text(datosPerfil.email, 20, 30);
    }

    if (datosPerfil?.telefono) {
      doc.text(`Tel: ${datosPerfil.telefono}`, 20, 35);
    }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, obtenerFormatoImagen(logoDataUrl), 145, 12, 42, 16);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...azulMarino);
      doc.text(nombreMarca, 188, 20, { align: 'right' });
    }

    doc.setDrawColor(...grisSuave);
    doc.line(20, 40, 190, 40);

    if (rol === 'comprador') {
      doc.setTextColor(...azulMarino);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(compradorTitulo || 'Ficha de Propiedad', 20, 55);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);

      if (compradorPrecio) {
        doc.text(`Valor: USD ${compradorPrecio}`, 20, 65);
      }

      if (compradorImagen) {
        doc.addImage(compradorImagen, 'JPEG', 20, 75, 170, 100);
      }

      const inicioTextoY = compradorImagen ? 185 : 75;
      const textoLimpio = (compradorDesc || 'Sin descripción disponible.').substring(0, 850);
      const descSplit = doc.splitTextToSize(textoLimpio, 170);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(descSplit, 20, inicioTextoY, {
        align: 'left',
        lineHeightFactor: 1.15,
      });

      const alturaTexto = descSplit.length * 5.8;
      let puntoYActual = inicioTextoY + alturaTexto + 10;

      if (puntoYActual > 260) {
        doc.addPage();
        puntoYActual = 30;
      }

      if (puntoYActual > 250) {
        doc.addPage();
        puntoYActual = 30;
      }

      if (telefono) {
        let nroLimpio = telefono.replace(/\D/g, '');
        if (!nroLimpio.startsWith('54')) {
          nroLimpio = `54${nroLimpio}`;
        }

        doc.setFillColor(...verdeWA);
        doc.roundedRect(20, puntoYActual, 55, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('SOLICITAR VISITA', 25, puntoYActual + 6.5);
        doc.link(20, puntoYActual, 55, 10, {
          url: `https://wa.me/${nroLimpio}`,
        });

        doc.setFillColor(...grisNeutral);
        doc.roundedRect(80, puntoYActual, 85, 10, 2, 2, 'F');
        doc.text('YA VISITÓ? DEJA TU OPINIÓN', 85, puntoYActual + 6.5);

        const mensajeEncuesta = encodeURIComponent(
          `Hola! Quería dejar mi opinión sobre la propiedad que visité.\n\n` +
            `Estado general (1 a 5):\n` +
            `¿El precio te pareció razonable? (Sí / No):\n` +
            `Lo que más me gustó:\n` +
            `Algo a mejorar:\n` +
            `¿Te gustaría avanzar con esta propiedad? (Sí / No / Tal vez)\n\n` +
            `Gracias!`,
        );

        doc.link(80, puntoYActual, 85, 10, {
          url: `https://wa.me/${nroLimpio}?text=${mensajeEncuesta}`,
        });

        puntoYActual += 20;
      }

      puntoYActual += 10;

      if (puntoYActual > 260) {
        doc.addPage();
        puntoYActual = 30;
      }

      doc.setTextColor(...grisSuave);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');

      const disclaimerLargo =
        'Aviso importante: La siguiente información se proporciona con fines orientativos para personas en búsqueda de inmuebles. Las descripciones, imágenes y datos aquí presentados provienen de terceros y podrían corresponder a una propiedad comercializada por otra inmobiliaria. Se recomienda confirmar todos los detalles con la inmobiliaria responsable de la operación. La disponibilidad de la unidad está sujeta a cambios sin previo aviso, al igual que su precio. Las superficies, medidas, expensas y servicios mencionados son aproximados y pueden sufrir modificaciones. Las fotografías y videos tienen carácter ilustrativo y no contractual.';

      const disclaimerSplit = doc.splitTextToSize(disclaimerLargo, 170);
      doc.text(disclaimerSplit, 20, puntoYActual);
    } else {
      doc.setTextColor(...azulMarino);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Análisis Comparativo de Mercado', 20, 55);

      doc.setFontSize(10);
      doc.text('Ref', 20, 70);
      doc.text('Link / Ubicación', 45, 70);
      doc.text('Precio', 135, 70);
      doc.text('USD/m2', 170, 70);
      doc.line(20, 72, 190, 72);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      links.forEach((link, i) => {
        const y = 80 + i * 12;
        const valPrecio =
          typeof precios[i] === 'string'
            ? parseFloat(precios[i].replace(/[^0-9.]/g, ''))
            : parseFloat(precios[i]);
        const valMetros =
          typeof metros[i] === 'string'
            ? parseFloat(metros[i].replace(/[^0-9.]/g, ''))
            : parseFloat(metros[i]);

        const precioTxt = !isNaN(valPrecio) ? `USD ${valPrecio.toLocaleString('es-AR')}` : '-';
        const metroTxt =
          !isNaN(valPrecio) && !isNaN(valMetros) && valMetros > 0
            ? `USD ${(valPrecio / valMetros).toFixed(0)}`
            : '-';

        doc.text(`Ref ${i + 1}`, 20, y);
        const linkLimpio = link ? link.split('?')[0].substring(0, 45) : 'Ver propiedad';
        doc.text(linkLimpio, 45, y);
        doc.text(precioTxt, 135, y);
        doc.text(metroTxt, 170, y);
      });

      const finalY = 80 + links.length * 12 + 20;
      doc.setDrawColor(...azulMarino);
      doc.line(20, finalY - 5, 190, finalY - 5);

      doc.setFontSize(14);
      doc.setTextColor(...azulMarino);
      doc.setFont('helvetica', 'bold');

      const preciosNumericos = precios
        .map((p) => parseFloat(String(p).replace(/[^0-9.]/g, '')) || 0)
        .filter((p) => p > 0);
      const promedioCalculado =
        preciosNumericos.length > 0
          ? Math.round(
              preciosNumericos.reduce((acumulado, valor) => acumulado + valor, 0) /
                preciosNumericos.length,
            ).toLocaleString('es-AR')
          : '0';

      const valorParaElPdf = edicion ? precioTasacion : promedioCalculado;
      doc.text(`VALOR DE TASACIÓN SUGERIDO: USD ${valorParaElPdf}`, 20, finalY + 10);

      doc.setTextColor(...grisSuave);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');

      const avisoLegal = doc.splitTextToSize(
        'Aviso importante: La información es orientativa. Las medidas y superficies son aproximadas. La tasación está sujeta a inspección física del inmueble.',
        170,
      );
      doc.text(avisoLegal, 20, 275);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text(`Documento generado por ${nombreMarca}`, 105, websiteUrl ? 282 : 285, {
      align: 'center',
    });

    if (websiteUrl) {
      doc.setTextColor(...grisNeutral);
      doc.text(websiteUrl, 105, 287, { align: 'center' });
      doc.link(60, 283, 90, 6, { url: websiteUrl });
    }

    if (!esPlanPro) {
      const idParaDocumento = userId || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID;

      if (!idParaDocumento) {
        throw new Error('No se pudo identificar al usuario para registrar el documento.');
      }

      const siguienteTotalDocumentos = documentosGeneradosTotales + 1;
      const storageKey = getDocumentLimitStorageKey(idParaDocumento);
      const { error: perfilDocError } = await supabase.from(PROFILES_TABLE).upsert(
        {
          id: idParaDocumento,
          documentos_generados_totales: siguienteTotalDocumentos,
        },
        { onConflict: 'id' },
      );
      if (perfilDocError) throw perfilDocError;

      globalThis?.localStorage?.setItem(storageKey, String(siguienteTotalDocumentos));
      setDocumentosGeneradosTotales(siguienteTotalDocumentos);
    }

    const nombreArchivo = nombre ? nombre.replace(/\s+/g, '_') : 'Sin_Nombre';
    doc.save(`${rol === 'comprador' ? 'Ficha' : 'Tasacion'}_${nombreArchivo}.pdf`);
  } catch (err) {
    alert(`Error al generar PDF: ${err.message || 'Desconocido'}`);
  } finally {
    setPdfLoading(false);
  }
};

const guardarAgenda = async () => {
  setGuardandoAgenda(true);

  try {
    const { cliente } = await asegurarRegistroCliente();
    const idCliente = cliente?.id || edicion?.id;

    if (!idCliente) {
      throw new Error('No se pudo obtener el ID del cliente para guardar la agenda.');
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(construirPayloadAgenda())
      .eq('id', idCliente)
      .select()
      .single();

    if (error) throw error;
    sincronizarClienteGuardado(data);
    clearDraftAfterSuccessfulSave(data?.id);
    mostrarModalExito();
  } catch (err) {
    alert(`Hubo un error al guardar la agenda: ${err.message}`);
  } finally {
    setGuardandoAgenda(false);
  }
};

  const obtenerUserIdActivo = async () => {
    return userId || getStoredSupabaseUserId() || FORCED_BYPASS_USER_ID || '';
  };

  const normalizarNumero = (valor) => {
    const num = parseFloat(valor);
    return Number.isNaN(num) ? null : num;
  };

  const toIsoDate = (fecha) => {
    if (!fecha) {
      return new Date().toISOString();
    }

    return new Date(`${fecha}T12:00:00`).toISOString();
  };

  const sincronizarClienteGuardado = (clienteGuardado) => {
    if (!clienteGuardado) {
      return;
    }

    setClienteActivoId(clienteGuardado.id || null);
    setNombre(clienteGuardado.nombre || '');
    setTelefono(clienteGuardado.telefono || '');
    setMotivoConsulta(clienteGuardado.motivo_consulta || '');
    setRol(clienteGuardado.rol || 'comprador');
    setFechaIngreso(clienteGuardado.fecha_ingreso ? clienteGuardado.fecha_ingreso.substring(0, 10) : '');
    setFechaAgenda(clienteGuardado.fecha_agenda ? clienteGuardado.fecha_agenda.substring(0, 10) : '');
    setMotivoAlerta(clienteGuardado.motivo_alerta || '');
    setComentarioSeguimiento(clienteGuardado.comentario || '');
    setFechaVisita(
      clienteGuardado.proxima_visita ? clienteGuardado.proxima_visita.substring(0, 10) : fechaVisita,
    );
    setLinks([
      clienteGuardado.link1 || '',
      clienteGuardado.link2 || '',
      clienteGuardado.link3 || '',
    ]);
    setPrecios([
      clienteGuardado.precio1 || '',
      clienteGuardado.precio2 || '',
      clienteGuardado.precio3 || '',
    ]);
    setMetros([
      clienteGuardado.m2_1 || '',
      clienteGuardado.m2_2 || '',
      clienteGuardado.m2_3 || '',
    ]);
    setPrecioTasacion(clienteGuardado.precio_tasacion || '');

    if (typeof setEdicion === 'function') {
      setEdicion(clienteGuardado);
    }
  };

  const guardarPayloadCliente = async (payload, { crearSiNoExiste = true } = {}) => {
    const idActivo = await obtenerUserIdActivo();

    if (!idActivo) {
      throw new Error('No se pudo identificar al usuario de Agente Advance. Reintenta loguearte.');
    }

    const idAEditar = edicion?.id;

    if (!idAEditar && !crearSiNoExiste) {
      return {
        cliente: null,
        userId: idActivo,
      };
    }

    const datos = {
      user_id: idActivo,
      ...payload,
    };

    let clienteGuardado = null;

    if (idAEditar) {
      const { data, error } = await supabase
        .from('clientes')
        .update(datos)
        .eq('id', idAEditar)
        .select()
        .single();
      if (error) throw error;
      clienteGuardado = data;
    } else {
      const { data, error } = await supabase.from('clientes').insert(datos).select().single();
      if (error) throw error;
      clienteGuardado = data;

      const siguienteTotal = totalCreados + 1;
      const { error: perfilError } = await supabase.from(PROFILES_TABLE).upsert(
        {
          id: idActivo,
          clientes_creados_totales: siguienteTotal,
        },
        { onConflict: 'id' },
      );
      if (perfilError) throw perfilError;

      if (clienteGuardado?.id) {
        await registrarHistorialInteraccion({
          user_id: idActivo,
          cliente_id: clienteGuardado.id,
          tipo: 'alta_cliente',
          descripcion: String(payload.nombre || 'Nuevo cliente').slice(0, 1000),
        });
      }
    }

    sincronizarClienteGuardado(clienteGuardado);

    return {
      cliente: clienteGuardado,
      userId: idActivo,
    };
  };

  const construirPayloadRegistro = () => ({
    nombre: camposContactoBloqueados ? edicion?.nombre || nombre || '' : nombre || '',
    telefono: camposContactoBloqueados ? edicion?.telefono || telefono || '' : telefono || '',
    motivo_consulta: motivoConsulta || '',
    fecha_ingreso: edicion?.fecha_ingreso || new Date().toISOString(),
    rol: rol || 'comprador',
  });

  const construirPayloadAgenda = () => ({
    fecha_agenda: fechaAgenda || null,
    motivo_alerta: motivoAlerta || '',
    comentario: comentarioSeguimiento || '',
  });

  const construirPayloadAcm = () => ({
    link1: links[0] || '',
    precio1: normalizarNumero(precios[0]),
    m2_1: normalizarNumero(metros[0]),
    link2: links[1] || '',
    precio2: normalizarNumero(precios[1]),
    m2_2: normalizarNumero(metros[1]),
    link3: links[2] || '',
    precio3: normalizarNumero(precios[2]),
    m2_3: normalizarNumero(metros[2]),
    precio_tasacion: normalizarNumero(precioTasacion || calcularTasacionFinal()),
  });

  const asegurarRegistroCliente = async () => {
    if (edicion?.id) {
      const idActivo = await obtenerUserIdActivo();
      return {
        cliente: edicion,
        userId: idActivo,
      };
    }

    return guardarPayloadCliente(construirPayloadRegistro());
  };

  const mostrarModalExito = (debeRefrescarPadre = true) => {
    setMostrarExito(true);

    window.setTimeout(() => {
      setMostrarExito(false);
      if (debeRefrescarPadre && typeof onSave === 'function') {
        onSave();
      }
    }, 2000);
  };

  const guardarCliente = async (e) => {
    if (e) e.preventDefault();

    if (limiteAlcanzado) {
      mostrarToastPlanPro();
      if (typeof onUpgradePlan === 'function') {
        onUpgradePlan(FREE_PLAN_LIMIT_MESSAGE);
      }
      return;
    }

    try {
      const { cliente: clienteGuardado } = await guardarPayloadCliente(construirPayloadRegistro());
      clearDraftAfterSuccessfulSave(clienteGuardado?.id);
      mostrarModalExito();
    } catch (err) {
      alert("Hubo un error al guardar: " + err.message);
    }
  };
  const prepararEdicion = (cliente) => {
    // Guardamos el objeto completo en 'edicion' para tener el ID
    setEdicion(cliente);
  
    // Llenamos los campos con lo que ya existe en la base de datos
    setNombre(cliente.nombre || '');
    setTelefono(cliente.telefono || '');
    setMotivoConsulta(cliente.motivo_consulta || '');
    setRol(cliente.rol || 'comprador');
    
    // Fechas (con el recorte de seguridad)
    setFechaAgenda(cliente.fecha_agenda ? cliente.fecha_agenda.split('T')[0] : '');
    setFechaVisita(cliente.proxima_visita ? cliente.proxima_visita.split('T')[0] : '');
    
    // Agenda
    setMotivoAlerta(cliente.motivo_alerta || '');
    setComentarioSeguimiento(cliente.comentario || '');
  
    // Desplazamos la pantalla hacia el formulario para que el usuario lo vea
    window.scrollTo({ top: document.querySelector('form').offsetTop, behavior: 'smooth' });
  };

  const eliminarCliente = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar este cliente?")) {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        if (typeof onSave === 'function') onSave();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  const guardarFichaCompartida = async (idManual = null) => {
    try {
      const { cliente, userId: idActivo } = await asegurarRegistroCliente();
      const idReal = idManual || cliente?.id || edicion?.id;

      if (!idReal) {
        throw new Error('No se pudo obtener el ID del cliente para guardar la ficha.');
      }

      if (rol !== 'comprador') {
        throw new Error('La ficha compartida solo aplica a clientes compradores.');
      }

      const ficha = {
        user_id: idActivo,
        cliente_id: idReal,
        titulo: compradorTitulo || '',
        precio: compradorPrecio || '',
        descripcion: compradorDesc || '',
        foto: compradorImagen || '',
        link_propiedad: links[0] || '',
        inmobiliaria_nombre: fichaColega.link || '',
        inmobiliaria_tel: fichaColega.tel || '',
        fecha_compartida: toIsoDate(fechaFicha),
        proxima_visita: fechaVisita || null,
      };

      if (fichaEnEdicion) {
        const { error: fichaError } = await supabase
          .from('fichas_compartidas')
          .update(ficha)
          .eq('id', fichaEnEdicion);
        if (fichaError) throw fichaError;
      } else {
        const { error: fichaError } = await supabase.from('fichas_compartidas').insert(ficha);
        if (fichaError) throw fichaError;
      }

      await registrarHistorialInteraccion({
        user_id: idActivo,
        cliente_id: idReal,
        tipo: fichaEnEdicion ? 'ficha_actualizada' : 'ficha_compartida',
        descripcion: [compradorTitulo, compradorPrecio].filter(Boolean).join(' · ').slice(0, 1000),
      });

      const { data: clienteActualizado, error: clienteError } = await supabase
        .from('clientes')
        .update({ proxima_visita: fechaVisita || null })
        .eq('id', idReal)
        .select()
        .single();
      if (clienteError) throw clienteError;

      sincronizarClienteGuardado(clienteActualizado);

      setClienteActivoId(idReal);
      await cargarFichasCompartidas(idReal);

      setFichaEnEdicion(null);
      setFichaVisualizar(null);
      setVistaFichas('listado');

      window.alert('Ficha Guardada con éxito');
      clearDraftAfterSuccessfulSave(idReal);
      resetFormularioFichaCompartida();
      setFichaGuardadaVersion((v) => v + 1);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const guardarAcm = async () => {
    try {
      const { cliente } = await asegurarRegistroCliente();
      const idCliente = cliente?.id || edicion?.id;

      if (!idCliente) {
        throw new Error('No se pudo obtener el ID del cliente para guardar el ACM.');
      }

      const { data, error } = await supabase
        .from('clientes')
        .update(construirPayloadAcm())
        .eq('id', idCliente)
        .select()
        .single();

      if (error) throw error;
      sincronizarClienteGuardado(data);
      clearDraftAfterSuccessfulSave(data?.id);
      mostrarModalExito();
    } catch (err) {
      alert("Hubo un error al guardar el ACM: " + err.message);
    }
  };

  const abrirFicha = (ficha) => {
    if (!ficha) return;
  
    setCompradorTitulo(ficha.titulo || '');
    setCompradorPrecio(ficha.precio || '');
    setCompradorDesc(ficha.descripcion || '');
    setCompradorImagen(ficha.foto || '');
  
    setLinks([ficha.link_propiedad || '', '', '']);
  
    setFichaColega({
      link: ficha.inmobiliaria_nombre || '',
      tel: ficha.inmobiliaria_tel || ''
    });
  
    setFechaVisita(ficha.proxima_visita || '');
  setFechaFicha(ficha.fecha_compartida ? ficha.fecha_compartida.substring(0, 10) : new Date().toISOString().split('T')[0]);
  
    setFichaEnEdicion(ficha.id);
  
    // vuelve al formulario
    setVistaFichas(null);
  };
  
  // --- CÁLCULO DINÁMICO (Sin loops) ---
  const valorSugeridoCalculado = (() => {
    if (rol !== 'vendedor') return "0";
    const pLimpios = precios.map(p => parseFloat(String(p).replace(/[^0-9.]/g, "")) || 0);
    const soloConPrecio = pLimpios.filter(p => p > 0);
    if (soloConPrecio.length === 0) return "0";
    const promedio = soloConPrecio.reduce((a, b) => a + b, 0) / soloConPrecio.length;
    return Math.round(promedio).toString();
  })();  

// Lógica de seguridad
// --- LÓGICA DE BLOQUEO BASADA EN TUS PROPS ---
const planPerfil = String(datosPerfil?.plan || '').toLowerCase();
const esAdmin = planPerfil === 'admin' || (ADMIN_USER_ID && userId === ADMIN_USER_ID);
const esPlanPro = esAdmin || planPerfil === 'pro';
const totalCreados = Math.max(
  Number(datosPerfil?.clientes_creados_totales || 0),
  Number(totalClientesActuales || 0),
);
const bloqueoFreeContactos = !esPlanPro && Boolean(edicion);
const camposContactoBloqueados = bloqueoFreeContactos || (Boolean(edicion) && !contactEditEnabled);
const mostrarBloqueoContactos = bloqueoFreeContactos;
// El botón final se deshabilita si llegó al límite O si no aceptó los términos
const limiteAlcanzado = !esPlanPro && totalCreados >= 5 && !edicion;
const limiteDocumentosAlcanzado = !esPlanPro && documentosGeneradosTotales >= 3;

const mostrarToastPlanPro = () => {
  setMostrarToastBloqueo(true);

  if (bloqueoToastTimeoutRef.current) {
    clearTimeout(bloqueoToastTimeoutRef.current);
  }

  bloqueoToastTimeoutRef.current = window.setTimeout(() => {
    setMostrarToastBloqueo(false);
    bloqueoToastTimeoutRef.current = null;
  }, 4000);
};

const handleBlockedContactInteraction = () => {
  if (bloqueoFreeContactos) {
    mostrarToastPlanPro();
    if (typeof onUpgradePlan === 'function') {
      onUpgradePlan(FREE_PLAN_LIMIT_MESSAGE);
    }
  }
};

const handleContactEditToggle = () => {
  if (!edicion) {
    return;
  }

  if (!esPlanPro) {
    handleBlockedContactInteraction();
    return;
  }

  setContactEditEnabled((current) => !current);
};

useEffect(() => () => {
  if (bloqueoToastTimeoutRef.current) {
    clearTimeout(bloqueoToastTimeoutRef.current);
    bloqueoToastTimeoutRef.current = null;
  }
}, []);

return (
  <div className="mt-4 w-full overflow-x-hidden">

  <form onSubmit={guardarCliente}>
    <h2 className="text-xl font-black text-[#4B2C82] mb-4 text-center">
      REGISTRO
    </h2>

      {/* 1. DATOS PERSONALES */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Datos Personales
          </p>

          {edicion ? (
            <div className="relative group">
              <button
                type="button"
                onClick={handleContactEditToggle}
                className={`rounded-lg border px-2 py-1 text-[10px] font-black shadow-sm transition-colors ${
                  esPlanPro
                    ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                ✏️
              </button>

              {mostrarBloqueoContactos && (
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-amber-200 bg-white/95 px-3 py-2 text-center text-[10px] font-black uppercase text-amber-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Esta función es exclusiva para el Plan PRO 🚀
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="relative group">
          <div className={`${mostrarBloqueoContactos ? 'opacity-70' : ''} space-y-3 rounded-2xl`}>
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              readOnly={camposContactoBloqueados}
              aria-readonly={camposContactoBloqueados}
              onClick={handleBlockedContactInteraction}
              onFocus={handleBlockedContactInteraction}
            />
            <input
              type="text"
              placeholder="Teléfono de contacto"
              className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              readOnly={camposContactoBloqueados}
              aria-readonly={camposContactoBloqueados}
              onClick={handleBlockedContactInteraction}
              onFocus={handleBlockedContactInteraction}
            />
          </div>

          {mostrarBloqueoContactos && (
            <>
              <button
                type="button"
                onClick={handleBlockedContactInteraction}
                className="absolute inset-0 rounded-2xl bg-slate-300/25 border border-white/20"
                aria-label="Desbloquear edición con plan PRO"
              />
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-amber-200 bg-white/95 px-3 py-2 text-center text-[10px] font-black uppercase text-amber-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Esta función es exclusiva para el Plan PRO 🚀
              </div>
            </>
          )}
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">
            Propiedad / Motivo de consulta
          </label>
          <input
            type="text"
            placeholder="Ingresa el domicilio o motivo de la consulta..."
            className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold"
            value={motivoConsulta}
            onChange={e => setMotivoConsulta(e.target.value)}
          />
        </div>

        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-[9px] font-black text-[#4B2C82] uppercase tracking-widest">Fecha de Ingreso</p>
          <p className="font-bold text-[#4B2C82]">
            {edicion?.fecha_ingreso
              ? new Date(edicion.fecha_ingreso).toLocaleDateString('es-AR')
              : new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setRol('vendedor')} className={`flex-1 p-3 rounded-xl font-black text-xs ${rol === 'vendedor' ? 'bg-[#001f3f] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>VENDEDOR</button>
          <button type="button" onClick={() => setRol('comprador')} className={`flex-1 p-3 rounded-xl font-black text-xs ${rol === 'comprador' ? 'bg-[#001f3f] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>COMPRADOR</button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-xl bg-[#4B2C82] px-4 py-2 text-[10px] font-black uppercase text-white shadow-md transition hover:bg-[#3b2367]"
          >
            Guardar Registro
          </button>
        </div>
      </div>

      {/* 2. AGENDA UNIFICADA Y SEMÁFORO */}
      <div className="space-y-3 mb-6 p-4 bg-orange-50 rounded-2xl border-2 border-orange-100">
        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest text-center">
          📅 AGENDA DE SEGUIMIENTO ✏️
        </p>
        <input type="date" className="w-full p-3 bg-white rounded-xl border-none font-bold text-orange-900 shadow-sm" value={fechaAgenda} onChange={e => setFechaAgenda(e.target.value)} />
        <input type="text" placeholder="motivo (ej: Llamar por propiedad X)" className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm" value={motivoAlerta} onChange={e => setMotivoAlerta(e.target.value)} />
        <textarea placeholder="Comentario o notas de la agenda..." className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm h-20" value={comentarioSeguimiento} onChange={e => setComentarioSeguimiento(e.target.value)} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={guardarAgenda}
            disabled={guardandoAgenda}
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-[10px] font-black uppercase text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardandoAgenda ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <hr className="my-8 border-slate-100" />

      {/* SECCIÓN VENDEDOR: ACM + PDF */}
{rol === 'vendedor' && (
  <div className="space-y-6">

    <h3 className="text-2xl font-black text-[#4B2C82] text-center uppercase tracking-tighter">
      Análisis de Mercado (ACM)
    </h3>

    <div className="bg-blue-50 p-6 rounded-[30px] border border-blue-100">

      <p className="text-sm font-black text-[#4B2C82] mb-4 italic">
        Comparables seleccionados:
      </p>

      {[0,1,2].map((i)=>(
        <div key={i} className="mb-4 p-3 bg-white rounded-2xl shadow-sm border border-blue-100">

          <input
            type="text"
            placeholder="Link o Dirección del comparable"
            className="w-full p-2 text-sm border-b mb-2 outline-none text-gray-600 font-medium"
            value={links[i] || ""}
            onChange={(e)=>{
              const n=[...links];
              n[i]=e.target.value;
              setLinks(n);
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="w-full sm:w-1/2">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
                USD Total
              </label>

              <input
                type="number"
                className="w-full p-2 text-sm border rounded-xl bg-slate-50 font-bold"
                value={precios[i] || ""}
                onChange={(e)=>{
                  const n=[...precios];
                  n[i]=e.target.value;
                  setPrecios(n);
                }}
              />
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
                Metros m²
              </label>

              <input
                type="number"
                className="w-full p-2 text-sm border rounded-xl bg-slate-50 font-bold"
                value={metros[i] || ""}
                onChange={(e)=>{
                  const n=[...metros];
                  n[i]=e.target.value;
                  setMetros(n);
                }}
              />
            </div>

          </div>
        </div>
      ))}

      {/* TASACIÓN */}

      <div className="mt-6 pt-4 border-t border-blue-200">

        <label className="block text-[11px] font-black text-[#4B2C82] mb-2 uppercase tracking-widest text-center">
          Valor de Tasación Sugerido
        </label>

        <input
          type="text"
          className={`w-full p-4 border-2 rounded-2xl font-black text-2xl text-center shadow-xl transition-all ${
            edicion
            ? "border-orange-400 text-orange-700 bg-orange-50"
            : "border-[#4B2C82] text-[#4B2C82] bg-white"
          }`}
          value={precioTasacion || (rol === 'vendedor' ? calcularTasacionFinal() : '')}
          onChange={(e)=>setPrecioTasacion(e.target.value)}
          readOnly={!edicion}
          placeholder="Calculando..."
        />

      </div>

      {/* BOTÓN PDF */}

      <button
        type="button"
        onClick={generarPDF}
        disabled={pdfLoading}
        className="w-full mt-6 bg-red-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pdfLoading ? 'Generando PDF...' : '📄 Descargar Informe ACM'}
      </button>

    </div>

  </div>
)}
      {/* --- SECCIÓN COMPRADOR: 100% MANUAL --- */}
      {rol === 'comprador' && (
        <div className="mt-8 space-y-6">
          <h3 className="text-2xl font-black text-[#4B2C82] text-center uppercase tracking-tighter">
            Fichas Compartidas
          </h3>
          <div className="bg-green-50 p-6 rounded-[30px] border border-green-100 space-y-4">
            <p className="text-sm font-black text-green-800 mb-2 italic text-center">🏠 Datos de la Propiedad</p>
            <div className="space-y-3">
              <input type="text" placeholder="Título (Ej: Departamento 3 Ambientes Recoleta)" className="w-full p-3 bg-white rounded-xl border-none shadow-sm font-bold uppercase" value={compradorTitulo} onChange={e => setCompradorTitulo(e.target.value)} />
              <input type="text" placeholder="Precio USD" className="w-full p-3 bg-white rounded-xl border-none shadow-sm font-bold text-green-700" value={compradorPrecio} onChange={e => setCompradorPrecio(e.target.value)} />
              <textarea placeholder="Descripción de la propiedad..." className="w-full p-3 bg-white rounded-xl border-none shadow-sm font-medium h-24" value={compradorDesc} onChange={e => setCompradorDesc(e.target.value)} />
              <div className="p-3 border-2 border-dashed border-green-200 rounded-2xl bg-white text-center">
                <label className="text-[10px] font-black text-green-400 uppercase tracking-widest block mb-2">Subir foto desde dispositivo</label>
                <input type="file" accept="image/*" onChange={manejarSubidaFoto} className="text-[10px]" />
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-dashed border-green-300 space-y-3">
                <p className="text-[10px] font-black text-green-700 uppercase italic">🔒 Control Interno (No sale en PDF)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input type="text" placeholder="Inmobiliaria / Colega" className="p-2 text-[11px] border rounded-xl bg-white font-bold" value={fichaColega.link} onChange={e => setFichaColega({ ...fichaColega, link: e.target.value })} />
                  <input type="tel" placeholder="Teléfono Colega" className="p-2 text-[11px] border rounded-xl bg-white font-bold" value={fichaColega.tel} onChange={e => setFichaColega({ ...fichaColega, tel: e.target.value })} />
                </div>
                <input type="text" placeholder="🔗 Pegar Link Ficha Original" className="w-full p-2 text-[11px] border rounded-xl bg-white font-semibold outline-none" value={links[0]} onChange={e => { const n = [...links]; n[0] = e.target.value; setLinks(n); }} />
                <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-2">
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase">Fecha Ficha</label>
                    <input type="date" className="w-full p-2 text-[10px] border rounded-xl bg-white font-bold" value={fechaFicha} onChange={e => setFechaFicha(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-[#4B2C82] uppercase">🚨 Próxima Visita</label>
                    <input type="date" className="w-full p-2 text-[10px] border-2 border-blue-400 rounded-xl bg-blue-50 font-bold" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                <button type="button" onClick={() => guardarFichaCompartida(clienteActivoId || edicion?.id)} className="bg-green-600 text-white p-3 rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-green-700 transition-all">
                  {fichaEnEdicion ? "✏️ Actualizar Ficha" : "💾 Guardar Ficha"}
                </button>
                <button type="button" onClick={async () => { setVistaFichas('listado'); await cargarFichasCompartidas(clienteActivoId || edicion?.id); }} className="bg-blue-600 text-white p-3 rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-blue-700 transition-all">
                  📂 Fichas Compartidas
                </button>
              </div>
              <button
                type="button"
                onClick={generarPDF}
                disabled={pdfLoading}
                className="w-full bg-red-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfLoading ? 'Generando PDF...' : '📄 Descargar Ficha PDF'}
              </button>
  <button 
    type="button"
    onClick={() => {
      setVistaFichas('listado');
      setFichaVisualizar(null);
    }}
    className="text-[10px] font-bold uppercase tracking-tight text-slate-400 hover:text-slate-600 px-2 py-1 border border-slate-200 rounded-lg transition-colors"
  >
    ← Volver al listado
  </button>
            </div>
          </div>
        </div>
      )}

{vistaFichas === 'listado' && (
  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3 mt-3">
    {/* CABECERA DEL HISTORIAL */}
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <button 
        type="button" 
        onClick={() => { setVistaFichas(null); setFichaVisualizar(null); }}
        className="text-[9px] font-black uppercase tracking-widest text-slate-500"
      >
        ← Volver
      </button>
      <span className="text-[10px] font-black text-[#4B2C82] uppercase">Historial de Propiedades</span>
    </div>

    <div className="space-y-4">
      {Array.isArray(fichasCompartidas) && fichasCompartidas.length > 0 ? (
        fichasCompartidas.map((ficha) => (
          <div key={ficha.id || Math.random()} className="space-y-2">
            
            {/* BARRA DE CADA PROPIEDAD EN EL LISTADO */}
            <div className="bg-white p-3 rounded-xl border shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase text-slate-700">{ficha.titulo || 'Sin título'}</p>
                <p className="text-[10px] text-green-600 font-bold">USD {ficha.precio || '0'}</p>
              </div>
              <div className="flex flex-wrap gap-2 self-end sm:self-auto">
                <button 
                  type="button" 
                  onClick={() => setFichaVisualizar(fichaVisualizar?.id === ficha.id ? null : ficha)} 
                  className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100"
                >
                  {fichaVisualizar?.id === ficha.id ? "❌" : "👁️"}
                </button>
                <button type="button" onClick={() => abrirFicha(ficha)} className="p-2 bg-yellow-100 rounded-lg">✏️</button>
                <button 
                  type="button" 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm("¿Seguro que quieres borrar esta ficha?")) {
                      try {
                        const { error: delErr } = await supabase
                          .from('fichas_compartidas')
                          .delete()
                          .eq('id', ficha.id);
                        if (delErr) throw delErr;
                        await cargarFichasCompartidas(clienteActivoId || edicion?.id);
                      } catch (error) {
                        alert("Error: " + error.message);
                      }
                    }
                  }} 
                  className="p-2 bg-red-50 text-red-500 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* DETALLE EXPANDIDO (ESTO ES LO QUE SE VE EN TU CAPTURA 98) */}
            {fichaVisualizar?.id === ficha.id && (
              <div className="bg-white border-2 border-blue-400 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200 mt-2">
                {ficha.foto && <img src={ficha.foto} alt="Propiedad" className="w-full h-48 object-cover" />}
                
                <div className="p-4 space-y-3">
                  <h4 className="text-lg font-black text-[#4B2C82] uppercase leading-tight">{ficha.titulo}</h4>
                  <p className="text-xl font-black text-green-600">USD {ficha.precio}</p>
                  
                  <div className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-700">🏢 Inmobiliaria: <span className="font-normal">{ficha.inmobiliaria_nombre || "No especificado"}</span></p>
                    <p className="font-bold text-slate-700">📞 Teléfono: <span className="font-normal">{ficha.inmobiliaria_tel || "Sin teléfono"}</span></p>
                  </div>
                  
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed border-t pt-2 italic">{ficha.descripcion}</p>
                  
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <button
                      onClick={generarPDF}
                      disabled={pdfLoading}
                      className="flex-1 bg-red-500 text-white text-[10px] font-black py-2 rounded-lg uppercase disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pdfLoading ? 'Generando...' : 'PDF'}
                    </button>
                    {ficha.link_propiedad && (
                      <a
                      href={ficha.link_propiedad} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-800 text-white text-[10px] font-black py-2 rounded-lg uppercase text-center">Link Original</a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-center text-[10px] text-slate-400 uppercase font-bold py-4">No hay fichas guardadas</p>
      )}
    </div>
  </div>
)}

<div className="mt-10 mb-6 border-t pt-8 px-2"></div>

      {encuestaVisible && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative">
            <h3 className="text-lg font-black text-center mb-4 italic">¿Qué te pareció la propiedad?</h3>
            <button type="button" onClick={() => setEncuestaVisible(false)} className="w-full mt-3 text-[10px] text-gray-400 font-bold uppercase">Cerrar</button>
          </div>
        </div>
      )}
    </form>

    {mostrarExito && (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-green-600 text-white px-10 py-6 rounded-3xl font-black shadow-2xl border-4 border-white animate-bounce flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-4xl">✅</span>
        <span className="text-center uppercase tracking-widest">¡Guardado con éxito!</span>
      </div>
    )}
    {mostrarToastBloqueo && (
      <div className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[1001] pointer-events-none sm:left-auto sm:right-4">
        <div className="rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-sm font-black text-amber-600 shadow-xl backdrop-blur-sm">
          {FREE_PLAN_LIMIT_MESSAGE}
        </div>
      </div>
    )}
     </div> 
);
}

export default ClienteForm;