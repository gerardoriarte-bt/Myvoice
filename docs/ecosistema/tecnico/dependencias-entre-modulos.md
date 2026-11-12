# Dependencias entre módulos (generado)

Generado el 2026-11-12 desde el commit `132bcab` con `bash scripts/mapa/actualizar.sh`. **No se edita a mano**: se corrige `scripts/mapa/modulos.json` y se vuelve a generar.

Cada fila es un archivo que usa algo de otro archivo de **otro módulo** (importa, llama o referencia un tipo). Módulos según la decisión 12; reglas en [spec-plataforma.md](./spec-plataforma.md) § 2.

## Resumen: pares de archivos que cruzan

| Desde \ Hacia | Plataforma | Parte común | My Voice | CDM | Compartido |
|---|---|---|---|---|---|
| **Plataforma** | · | 13 | 21 | · | 14 |
| **Parte común** | · | · | · | · | 44 |
| **My Voice** | · | 40 | · | · | 139 |
| **CDM** | · | · | · | · | · |
| **Compartido** | · | · | · | · | · |

- **Hay que invertir**: 0 · **pasan por el contrato**: 40 · **permitidas**: 231

## Hay que invertir (0)

Rompen la regla: la parte común o la infraestructura dependen de un módulo, o un módulo depende de otro. Antes de partir las carpetas, cada una se resuelve moviendo el archivo de módulo, moviendo el tipo a `contrato/`, o invirtiendo la llamada (el módulo se registra en la parte común en vez de que la parte común lo importe).

Ninguna.

## Pasan por el contrato (40)

Un módulo lee la parte común. Está bien, pero solo por `contrato/`: esta lista es lo que `contrato/` tiene que exponer.

| Desde | Archivo | Hacia | Archivo | Qué usa |
|---|---|---|---|---|
| My Voice | `components/ParameterForm.tsx` | Parte común | `marcas.ts` | marcas.ts, nombreConMadre() |
| My Voice | `components/produccion/TableroProduccion.tsx` | Parte común | `components/Bandeja.tsx` | Bandeja.tsx, DestinoAviso |
| My Voice | `components/produccion/TableroProduccion.tsx` | Parte común | `marcas.ts` | marcas.ts, nombreConMadre() |
| My Voice | `server/src/channels/promptBuilder.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | reglaDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/channels/promptBuilder.ts` | Parte común | `server/src/services/voiceFingerprintService.ts` | renderFingerprintForPrompt(), voiceFingerprintService.ts |
| My Voice | `server/src/channels/types.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, tratamiento.ts |
| My Voice | `server/src/channels/validators.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, faltasDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/controllers/analyticsController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/analyticsController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, assertDnaProfileInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| My Voice | `server/src/controllers/generateController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/piezaController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), assertPiezaInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/piezaController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/presetController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), assertPresetInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/presetController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/lib/tenancy.ts` | assertClientInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| My Voice | `server/src/controllers/refineController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/reviewController.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantError, filterVariationsInWorkspace(), tenancy.ts |
| My Voice | `server/src/controllers/reviewController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/controllers/reviewController.ts` | Parte común | `server/src/services/notificacionService.ts` | AvisoEscrito, enviarEnSegundoPlano(), notificacionService.ts, notificar() |
| My Voice | `server/src/controllers/reviewController.ts` | Parte común | `server/src/services/notificationService.ts` | notificationService.ts, notifyReviewCompleted() |
| My Voice | `server/src/controllers/savedController.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantError, assertClientInWorkspace(), assertMemberOfWorkspace(), assertProjectInWorkspace() |
| My Voice | `server/src/controllers/savedController.ts` | Parte común | `server/src/middleware/auth.ts` | AuthRequest, auth.ts, handleTenantError() |
| My Voice | `server/src/services/aprobacion.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, assertDnaProfileInWorkspace(), assertProjectInWorkspace() |
| My Voice | `server/src/services/auditoriaService.ts` | Parte común | `server/src/lib/workspaceSecret.ts` | decryptWorkspaceApiKey(), workspaceSecret.ts |
| My Voice | `server/src/services/criticService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | tratamiento.ts, verificacionDeTratamiento() |
| My Voice | `server/src/services/directorService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | esTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/fixerService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | tablaDeConversion(), tratamiento.ts |
| My Voice | `server/src/services/localeRules.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | Tratamiento, reglaDeTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/openaiService.ts` | Parte común | `server/src/comun/adn/tratamiento.ts` | esTratamiento(), tratamiento.ts |
| My Voice | `server/src/services/parametrosDeGeneracion.ts` | Parte común | `server/src/comun/adn/resolverAdn.ts` | resolverAdn(), resolverAdn.ts |
| My Voice | `server/src/services/permisosPieza.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, canManage(), tenancy.ts |
| My Voice | `server/src/services/piezaArchivo.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantError, tenancy.ts |
| My Voice | `server/src/services/piezaService.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, tenancy.ts |
| My Voice | `server/src/services/piezaService.ts` | Parte común | `server/src/services/notificacionService.ts` | AvisoEscrito, EventoNotificable, destinatariosDe(), enviarEnSegundoPlano() |
| My Voice | `server/src/services/revisionDePiezas.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, canManage(), tenancy.ts |
| My Voice | `server/src/services/usageService.ts` | Parte común | `server/src/lib/planLimits.ts` | planLimits.ts, resolvePlanLimits() |
| My Voice | `server/src/services/usageService.ts` | Parte común | `server/src/lib/tenancy.ts` | TenantContext, TenantError, tenancy.ts |

## Permitidas (231)

El arranque importa de todos, y todos usan la infraestructura compartida.

| Desde | Hacia | Pares |
|---|---|---|
| Parte común | Compartido | 44 |
| My Voice | Compartido | 139 |
| Plataforma | Compartido | 14 |
| Plataforma | Parte común | 13 |
| Plataforma | My Voice | 21 |
