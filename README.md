# JUEGUE · callao

Catálogo mobile-first de juegos, detalles y planes recreativos para una salida entre personas adultas. Cada reserva corresponde a un solo producto. El inicio muestra productos de ejemplo solo mientras falta Supabase; esos ejemplos no se pueden pagar ni reservar.

## Ejecutar

Requiere Node.js 20 o superior.

1. Copia .env.example a .env.local.
2. Ejecuta npm install.
3. Ejecuta npm run dev y abre http://localhost:3000.

Sin credenciales, la portada funciona en modo de vista previa. Checkout, administración, IA y cobros reales permanecen cerrados.

## Base de datos y acceso de tienda

1. Crea un proyecto de Supabase y ejecuta supabase/migrations/001_juegue.sql en el SQL Editor.
2. Configura NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY. La clave de servicio se usa solo en el servidor. No la pongas en variables NEXT_PUBLIC_.
3. Invita al equipo desde Supabase Auth. Después habilita cada cuenta autorizada insertando su UUID en public.admin_users desde el SQL Editor:

   insert into public.admin_users (user_id)
   select id from auth.users where email = 'correo-del-equipo@example.com'
   on conflict (user_id) do nothing;

4. El panel de /admin requiere sesión y pertenencia a admin_users. Las políticas RLS también exigen ese rol para editar catálogo, promociones, fotos y leer reservas.
5. El bucket público product-images se crea en la migración. Las cuentas anónimas solo pueden leer fotos; solo el equipo autorizado puede subir, cambiar o borrar imágenes.

## Abonos y comisión RAMNCO

Valores iniciales:

- Abono: 10% del precio total.
- Comisión RAMNCO: 3% del precio total, descontada del abono.
- La tienda recibe el saldo del abono después de RAMNCO, antes de las tarifas que cobre el proveedor de pagos.
- Saldo pendiente: precio total menos el abono.

Por ejemplo, en un producto de $10.000, hoy se abonan $1.000; $300 corresponden a RAMNCO y $700 a la tienda, antes de cargos del proveedor. Cambia RAMNCO_FEE_BASE=deposit_amount si el 3% debe calcularse sobre el abono en lugar del precio total. Mantén sincronizados los valores NEXT_PUBLIC_* y los valores de servidor.

## Mercado Pago y avisos

La app crea una preferencia real de Checkout Pro por el monto del abono y envía marketplace_fee con la parte RAMNCO. Mercado Pago requiere que cada vendedor autorice la integración por OAuth; configura su access token como MERCADOPAGO_SELLER_ACCESS_TOKEN en el entorno de ejecución. Configura también MERCADOPAGO_WEBHOOK_SECRET en el panel del proveedor y una URL HTTPS pública en NEXT_PUBLIC_SITE_URL antes de habilitar producción.

/api/payments/webhook valida x-signature y x-request-id, consulta el pago en Mercado Pago y comprueba estado, monto, moneda y reserva. La URL de retorno del checkout muestra “verificando”: nunca confirma un pago. Solo el webhook válido cambia la reserva a pagada y añade un aviso a la bandeja privada. Si se configura SHOP_NOTIFICATION_WEBHOOK_URL, la app envía a ese sistema el aviso de tienda después de la confirmación; el aviso externo incluye una clave de idempotencia. Si no se configura, el equipo ve las reservas pagadas en el panel.

No se guardan datos de tarjeta. El checkout permanece deshabilitado hasta que las variables necesarias estén presentes. Para dividir dinero entre RAMNCO y la tienda, la cuenta de Mercado Pago y el vendedor deben estar correctamente vinculados mediante el flujo Marketplace/OAuth.

## Asistente y voz

El asistente de /admin crea borradores de productos a partir de una descripción y fotos, o textos para promociones. Requiere OPENAI_API_KEY y opcionalmente OPENAI_MODEL. Las fotos adjuntas se envían para analizar el borrador; las fotos de catálogo se suben a Supabase cuando el equipo guarda el producto. La IA no publica cambios ni inventa un precio cuando no se proporcionó una referencia.

El dictado usa el reconocimiento de voz del navegador cuando está disponible. Si no lo está, la descripción se puede escribir normalmente.

## Variables de entorno

Consulta .env.example. No guardes claves reales en Git, navegador, capturas ni textos de retorno del checkout. Usa el almacén de secretos de la plataforma de despliegue.

## Validación local

    npm run typecheck
    npm run build

La app no contiene credenciales de producción. Un pago, una carga persistente, el inicio de sesión, la llamada a la IA y el aviso externo solo se pueden validar después de configurar las cuentas y secretos correspondientes.
