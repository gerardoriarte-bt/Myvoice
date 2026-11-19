# Dependencias entre módulos (generado)

Generado el 2026-11-19 desde el commit `184994b` con `bash scripts/mapa/actualizar.sh`. **No se edita a mano**: se corrige `scripts/mapa/modulos.json` y se vuelve a generar.

Cada fila es un archivo que usa algo de otro archivo de **otro módulo** (importa, llama o referencia un tipo). Módulos según la decisión 12; reglas en [spec-plataforma.md](./spec-plataforma.md) § 2.

## Resumen: pares de archivos que cruzan

| Desde \ Hacia | Plataforma | Parte común | My Voice | Producción | CDM | Compartido |
|---|---|---|---|---|---|---|
| **Plataforma** | · | 22 | 20 | 6 | 4 | 28 |
| **Parte común** | · | · | · | · | · | 46 |
| **My Voice** | · | 37 | · | · | · | 119 |
| **Producción** | · | 11 | 2 | · | · | 25 |
| **CDM** | · | 6 | · | · | · | 14 |
| **Compartido** | · | · | · | · | · | · |

- **Hay que invertir**: 0 · **pasan por el contrato**: 56 · **permitidas**: 284

## Hay que invertir (0)

Rompen la regla: la parte común o la infraestructura dependen de un módulo, o un módulo depende de otro. Antes de partir las carpetas, cada una se resuelve moviendo el archivo de módulo, moviendo el tipo a `contrato/`, o invirtiendo la llamada (el módulo se registra en la parte común en vez de que la parte común lo importe).

Ninguna.

## Pasan por el contrato (56)

Un módulo lee la parte común. Está bien, pero solo por `contrato/`: esta lista es lo que `contrato/` tiene que exponer.

| Desde | Archivo | Hacia | Archivo | Qué usa |
|---|---|---|---|---|
| CDM | `server/src/cdm/biblioteca/bibliotecaController.ts` | Parte común | `server/src/comun/permisos.ts` | exigirPlanning(), permisos.ts |
| CDM | `server/src/cdm/biblioteca/bibliotecaController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| CDM | `server/src/cdm/planning/planningController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), tenancy.ts |
| CDM | `server/src/cdm/planning/planningController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| CDM | `server/src/cdm/planning/planningService.ts` | Parte común | `server/src/comun/permisos.ts` | exigirPaso(), permisos.ts, puedeActuar() |
| CDM | `server/src/cdm/planning/planningService.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, assertProjectInWorkspace(), tenancy.ts |
| My Voice | `components/ParameterForm.tsx` | Parte común | `marcas.ts` | marcas.ts, nombreConMadre() |
| My Voice | `components/ResultadosPorPieza.tsx` | Parte común | `components/QuienAprueba.tsx` | PersonaQueAprueba, QuienAprueba(), QuienAprueba.tsx |
| My Voice | `components/SavedManager.tsx` | Parte común | `components/QuienAprueba.tsx` | QuienAprueba(), QuienAprueba.tsx |
| My Voice | `server/src/channels/promptBuilder.ts` | Parte común | `server/src/comun/adn/estilo.ts` | estilo.ts, reglasDeAdnEnPalabras() |
| My Voice | `server/src/channels/promptBuilder.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | reglaDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/channels/promptBuilder.ts` | Parte común | `server/src/services/voiceFingerprintService.ts` | renderFingerprintForPrompt(), voiceFingerprintService.ts |
| My Voice | `server/src/channels/types.ts` | Parte común | `server/src/comun/adn/estilo.ts` | ReglasDeAdn, estilo.ts |
| My Voice | `server/src/channels/types.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, tratamiento.ts |
| My Voice | `server/src/channels/validators.ts` | Parte común | `server/src/comun/adn/estilo.ts` | ReglasDeAdn, estilo.ts, faltasDeAdn() |
| My Voice | `server/src/channels/validators.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, faltasDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/controllers/analyticsController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/analyticsController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/comun/permisos.ts` | assertPuedeActuar(), permisos.ts |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, assertDnaProfileInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/presetController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), assertPresetInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/presetController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/savedController.ts` | Parte común | `server/src/comun/permisos.ts` | assertPuedeActuar(), permisos.ts |
| My Voice | `server/src/controllers/savedController.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantError, assertClientInWorkspace(), assertMemberOfWorkspace(), assertProjectInWorkspace() |
| My Voice | `server/src/controllers/savedController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/services/aprobacion.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, assertDnaProfileInWorkspace(), assertProjectInWorkspace() |
| My Voice | `server/src/services/criticService.ts` | Parte común | `server/src/comun/adn/estilo.ts` | estilo.ts, reglasDeAdnEnPalabras() |
| My Voice | `server/src/services/criticService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | tratamiento.ts, verificacionDeTratamiento() |
| My Voice | `server/src/services/directorService.ts` | Parte común | `server/src/comun/adn/estilo.ts` | estilo.ts, reglasDeAdnEnPalabras() |
| My Voice | `server/src/services/directorService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | esTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/fixerService.ts` | Parte común | `server/src/comun/adn/estilo.ts` | estilo.ts, reglasDeAdnEnPalabras() |
| My Voice | `server/src/services/fixerService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | tablaDeConversion(), tratamiento.ts |
| My Voice | `server/src/services/localeRules.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, reglaDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/openaiService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | esTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/parametrosDeGeneracion.ts` | Parte común | `server/src/comun/adn/resolverAdn.ts` | resolverAdn(), resolverAdn.ts |
| My Voice | `server/src/services/parametrosDeGeneracion.ts` | Parte común | `server/src/comun/adn/secciones.ts` | AudienciaGuardada, elementosDe(), secciones.ts |
| My Voice | `server/src/services/usageService.ts` | Parte común | `server/src/lib/planLimits.ts` | planLimits.ts, resolvePlanLimits() |
| My Voice | `server/src/services/usageService.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, tenancy.ts |
| Producción | `components/produccion/AccionesPieza.tsx` | Parte común | `components/QuienAprueba.tsx` | QuienAprueba(), QuienAprueba.tsx |
| Producción | `components/produccion/TableroProduccion.tsx` | Parte común | `components/Bandeja.tsx` | Bandeja.tsx, DestinoAviso |
| Producción | `components/produccion/TableroProduccion.tsx` | Parte común | `marcas.ts` | marcas.ts, nombreConMadre() |
| Producción | `server/src/controllers/piezaController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), assertPiezaInWorkspace(), tenancy.ts |
| Producción | `server/src/controllers/piezaController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| Producción | `server/src/services/auditoriaService.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| Producción | `server/src/services/permisosPieza.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, canManage(), tenancy.ts |
| Producción | `server/src/services/piezaArchivo.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantError, tenancy.ts |
| Producción | `server/src/services/piezaService.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, tenancy.ts |
| Producción | `server/src/services/piezaService.ts` | Parte común | `server/src/services/notificacionService.ts` | AvisoEscrito, EventoNotificable, destinatariosDe(), enviarEnSegundoPlano() |
| Producción | `server/src/services/revisionDePiezas.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, canManage(), tenancy.ts |
| Producción | `server/src/services/auditoriaService.ts` | My Voice | `server/src/channels/registry.ts` | registry.ts, zonaDe() |
| Producción | `server/src/services/piezaService.ts` | My Voice | `server/src/channels/registry.ts` | esFormatoValido(), esSlotDeInstruccion(), formatoPorDefecto(), getChannelSpec() |

## Permitidas (284)

El arranque importa de todos, y todos usan la infraestructura compartida.

| Desde | Hacia | Pares |
|---|---|---|
| CDM | Compartido | 14 |
| Parte común | Compartido | 46 |
| My Voice | Compartido | 119 |
| Plataforma | CDM | 4 |
| Plataforma | Compartido | 28 |
| Plataforma | Parte común | 22 |
| Plataforma | My Voice | 20 |
| Plataforma | Producción | 6 |
| Producción | Compartido | 25 |
