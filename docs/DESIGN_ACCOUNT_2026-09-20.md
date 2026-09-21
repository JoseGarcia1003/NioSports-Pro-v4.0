# Cuenta e inicio de sesión — rediseño visual

## Motivo

El propietario rechazó la entrega anterior por verse genérica, plana y sin identidad. La corrección desarrolla Cuenta y el inicio de sesión como una experiencia deportiva propia, con fotografía decorativa, composición editorial, verde profundo, tonos marfil, contraste y una jerarquía de texto deliberada.

## Cambios concretos

- Cuenta: portada deportiva original, acceso principal a pronósticos, centro de control con acceso a bankroll, tarjetas de estadísticas/resultados/validación, accesos NBA/tenis y panel de acceso. Sin cifras inventadas para llenar estados vacíos.
- El esquema de capital es una ilustración explicativa, no el saldo ni la distribución real de una cuenta. No lee ni modifica movimientos.
- Preferencia claro/oscuro visible en Cuenta, persistente con el store ya existente. Guía de primeros pasos desplegable.
- Inicio de sesión: composición dividida con la misma portada, formulario nativo, acceso/registro/recuperación, mostrar u ocultar contraseña, validación del navegador, errores legibles y bloqueo de duplicados mientras se procesa.
- Se elimina la petición de nombre del registro anterior: ese campo nunca se enviaba a Firebase. No se pide información que no se guarda.
- Navegación y marca armonizadas con el verde del producto. Se mantiene la geometría del logo.
- Recurso fotográfico original local de 175 KB compartido por ambas páginas; sin rastreadores ni servicios externos nuevos.

## Verificación

Pendiente de completar con la vista previa final. `npm run check` ya pasó con 0 errores y 0 advertencias. Pruebas de comportamiento del formulario en ejecución. Revisar 360/390/768/1440 px, ambos temas, rutas, foco, ayuda y formulario, sin enviar correos ni crear cuentas reales.

## Límites

Entrega de Cuenta, acceso y navegación. No implica que todas las páginas estén rediseñadas ni que la autenticación externa, las suscripciones o el motor predictivo estén comercialmente validados. Se conservan los permisos y contratos de servidor existentes. El diseño no cambia el plan de un usuario ni añade datos deportivos.
