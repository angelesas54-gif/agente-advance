-- Ejecutar en Supabase → SQL Editor (una vez).
-- Marca tareas de agenda/visita como hechas desde el semáforo.
--
-- Si tenés RLS en `clientes`, la política de UPDATE debe permitir al usuario
-- actualizar sus filas (p. ej. user_id = auth.uid()) incluyendo esta columna.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS seguimiento_completado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes.seguimiento_completado IS 'Si true, el cliente no aparece en las columnas del semáforo hasta nueva acción (futuro: reset al cambiar fechas).';

CREATE INDEX IF NOT EXISTS idx_clientes_seguimiento_completado
  ON public.clientes (user_id, seguimiento_completado);
