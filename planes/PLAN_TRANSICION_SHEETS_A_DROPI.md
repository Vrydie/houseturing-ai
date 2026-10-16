# Plan de Transición: De Google Sheets (Fase Lean) a Dropi Automatizado

> **Propósito:** Documento de memoria técnica y arquitectura para migrar de la operación manual asistida por Google Sheets + Telegram a la creación automática de órdenes en Dropi sin fricción, pérdida de pedidos ni riesgo de saldo.

---

## 1. Estado Actual vs. Estado Objetivo

```
ESTADO ACTUAL (Fase Lean - Activa y Probada):
WhatsApp ──► DS-01 ──► DS-02 (IA) ──► DS-T2 ──┬──► PostgreSQL (pedidos SIM-X)
                                              ├──► Telegram (alerta inmediata con botones)
                                              └──► Google Sheets (fila A1:K con datos de envío)
                                                          │
                                                          ▼
                                             Operador copia y despacha en Dropi

ESTADO OBJETIVO (Fase Automática con Dropi):
WhatsApp ──► DS-01 ──► DS-02 (IA) ──► DS-T2 ──┬──► PostgreSQL (pedidos con dropi_order_id)
                                              ├──► Telegram (alerta con botón "Confirmar en Dropi")
                                              ├──► Google Sheets (respaldo histórico de auditoría)
                                              └──► Dropi API / Dropify (orden creada automáticamente)
                                                          │
                                                          ▼
                                            Dropi asigna guía ──► Transportadora
```

---

## 2. Los Dos Caminos de Integración con Dropi

Existen dos métodos para enviar pedidos a Dropi. Ambos están contemplados en la arquitectura de `DS-T2`:

### Opción A: Vía Dropify (Recomendada para arrancar con Shopify)
* **Cómo funciona:** 
  1. En `config` de PostgreSQL se cambia `modo_pedidos = 'real'`.
  2. `DS-T2` invoca la mutación `orderCreate` de la API GraphQL de Shopify con los datos del cliente (`shippingAddress`, variante, precio contraentrega y tags).
  3. La aplicación oficial **Dropify** (instalada en Shopify) lee el nuevo pedido cada 5 a 10 minutos y lo genera en Dropi en estado `PENDIENTE CONFIRMACION`.
* **Ventajas:** No requiere credenciales especiales de la API privada de Dropi; Shopify almacena los pedidos con su factura oficial.
* **Requisitos:**
  - App Dropify conectada con el token de integración de Dropi (*Dropi &rarr; Mis Integraciones*).
  - El SKU en Shopify debe coincidir exactamente con el SKU del proveedor en Dropi (ej: `CM-135` o `1917934`).

### Opción B: Vía API Directa de Dropi (Mayor velocidad y control)
* **Cómo funciona:**
  1. `DS-T2` ejecuta una petición HTTP POST directa a la API de Dropi:
     `POST https://api.dropi.co/api/orders`
  2. Dropi responde inmediatamente con el `order_id` y el número de radicado.
* **Requisitos:**
  - Token de API de Dropi (`dropi-integration-key`) solicitado a soporte de Dropi.
  - Saldo en la billetera de Dropi para cubrir el costo de flete en caso de devolución.

---

## 3. Mapeo de Datos: Google Sheets &rarr; Payload de Dropi

El nodo `Armar Filas Sheets` de `DS-T2` ya extrae todos los campos requeridos por Dropi. La conversión es directa:

| Campo en Google Sheets / DB | Parámetro en Dropi API | Formato requerido |
| :--- | :--- | :--- |
| `Cliente` (`env.nombre + apellido`) | `customer_name` | String (mínimo 3 caracteres) |
| `Celular` (`env.celular`) | `customer_phone` | 10 dígitos (ej. `3154899983`) |
| `Ciudad` (`db.ciudad_oficial`) | `city_id` / `city_name` | Nombre normalizado en mayúsculas / ID DANE |
| `Departamento` | `state_id` / `state_name` | Código ISO o nombre del departamento |
| `Direccion` + `Barrio` | `shipping_address` | Dirección completa + barrio + complementos |
| `Producto` / `oferta.sku` | `items[0].product_id` | ID numérico del producto en Dropi |
| `Cantidad` | `items[0].quantity` | Entero (1, 2, 3...) |
| `Total_COP` | `total_amount` | Número entero (ej. `219900`) |
| `Metodo_Pago` | `payment_method` | `"CASH_ON_DELIVERY"` (Contra entrega) |
| `ID_Pedido` (`SIM-X` o `Shopify`) | `external_order_id` | String de auditoría |

---

## 4. Interruptor de Configuración en PostgreSQL (`config`)

No se necesita reprogramar flujos para cambiar de modo. La tabla `config` en Neon DB controla el comportamiento de `DS-T2`:

```sql
-- Modo actual (Lean / Google Sheets + Telegram):
UPDATE config SET valor = 'simulado' WHERE clave = 'modo_pedidos';

-- Modo automático (Shopify Real -> Dropify -> Dropi):
UPDATE config SET valor = 'real' WHERE clave = 'modo_pedidos';

-- Si se usa Dropi directo vía API:
INSERT INTO config (clave, valor) VALUES 
  ('dropi_api_token', 'TU_TOKEN_DE_DROPI'),
  ('dropi_auto_confirmar', 'false')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
```

> **⚠️ Regla de Oro de Dropi:**  
> Mantener `dropi_auto_confirmar = 'false'`. Todo pedido debe entrar en estado `PENDIENTE CONFIRMACION`. El operador humano o el botón de Telegram (*"Confirmar en Dropi"*) debe ser quien libere el despacho para evitar cobros de fletes por pedidos cancelados a último minuto.

---

## 5. Checklist de Activación (Paso a Paso para el día del cambio)

Cuando decidan conectar Dropi automáticamente, sigan estos 5 pasos:

1. **Verificar Saldo en Dropi:**
   - Cargar al menos **$100.000 COP** en la billetera de Dropi para que la plataforma permita emitir guías.
2. **Revisar Bodega y Stock del Proveedor:**
   - Asegurarse de que el proveedor tenga stock suficiente (>50 unidades) y garantía activa en Dropi.
3. **Verificar SKU en Shopify:**
   - El producto en Shopify debe tener en el campo SKU el mismo código del producto en Dropi.
4. **Cambiar el interruptor en la Base de Datos:**
   ```sql
   UPDATE config SET valor = 'real' WHERE clave = 'modo_pedidos';
   ```
5. **Realizar un pedido de prueba real:**
   - Hacer un pedido desde WhatsApp con tu celular personal.
   - Verificar que en Dropi aparezca en **Órdenes &rarr; Pendiente de confirmación**.
   - Cancelarlo en el panel de Dropi antes de que la bodega lo empiece a empacar.

---

## 6. Monitoreo y Fallback de Emergencia

Si la sincronización automática de Dropi llega a fallar (por falta de saldo, error en Dropify o caída de red):
- **Google Sheets y Telegram siguen recibiendo el pedido:** El pedido **nunca se pierde** porque `DS-T2` tiene los nodos encadenados de forma desacoplada con `onError: continueRegularOutput`.
- **Vuelta inmediata a Sheets:** Con solo ejecutar `UPDATE config SET valor = 'simulado' WHERE clave = 'modo_pedidos';`, el sistema vuelve al modo manual en menos de 1 segundo.
