# Logística Transporte Jouve

Aplicación de gestión financiera interna (cuentas, categorías, períodos mensuales, flujo de caja y resultados).

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Bot de WhatsApp para registrar gastos

Se agregó un webhook para recibir mensajes de WhatsApp (vía Twilio) y crear gastos automáticamente en la app.

### Endpoint

- `POST /api/whatsapp/webhook`

Twilio debe enviar mensajes entrantes a esa URL.

### Variables de entorno

Además de las variables actuales de Supabase, necesitás:

- `SUPABASE_SERVICE_ROLE_KEY`: clave service role para insertar registros desde el webhook.
- `TWILIO_AUTH_TOKEN` (recomendado): para validar la firma `X-Twilio-Signature`.
- `WHATSAPP_DEFAULT_ACCOUNT_NAME` (opcional): cuenta por defecto (si no se envía en el mensaje).

### Formato del mensaje

```text
gasto <monto> | <categoria> | <descripcion> | <cuenta opcional> | <fecha opcional YYYY-MM-DD>
```

Ejemplo:

```text
gasto 18500 | Combustibles | Carga de gasoil | Galicia | 2026-02-18
```

### Comportamiento

- Si no enviás fecha, usa la fecha actual.
- Si no enviás cuenta, usa `WHATSAPP_DEFAULT_ACCOUNT_NAME`; si no existe, usa `Caja`.
- Si el mes actual no existe, lo crea automáticamente.
- El gasto se guarda como `expense` y el monto se registra negativo en `transaction_amounts`.
- La descripción queda prefijada con el número de origen de WhatsApp para trazabilidad.

### Respuestas rápidas

- Enviá `ayuda` para recibir el formato esperado.
- Si la categoría o la cuenta no existen, el bot responde con el error para corregir el mensaje.
