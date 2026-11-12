-- 23: uso justo diario de Plus y Elite (decisión 2 de docs/modelo-de-negocio.md,
-- aplicada por indicación de Mauri el 11 nov 2026). Baja de 30 análisis y 15 outfits
-- al día a 10 y 8. El peor caso de IA por usuario pasa de ~$257 a ~$99 MXN al mes;
-- el uso normal no lo nota. El plan gratis no cambia.
update public.limites_plan
  set analisis_dia = 10,
      outfits_dia = 8
  where plan in ('plus', 'elite');
