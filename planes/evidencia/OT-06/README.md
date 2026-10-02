# Evidencia OT-06 — Prueba Shopify → Dropi (1-oct-2026, hora Colombia)

Datos personales enmascarados. Las capturas del panel de Dropi quedaron en la conversación con Claude
y no se versionan porque muestran la dirección y el celular reales.

## Línea de tiempo
| Hora | Qué pasó | Fuente |
|---|---|---|
| — | Intento 1 rechazado por Shopify antes de crear nada: `OrderCreateUpsertCustomerAttributesInput requires at least one of id, email` (INVALID_FIELD_ARGUMENTS). Se quitó `customer.toUpsert` del script | salida de `--aplicar` |
| 23:37 | Pedido **#1001** creado en Shopify (`gid://shopify/Order/6942264328310`), `userErrors: []` | salida de `--aplicar` |
| 23:40 | Aparece en Dropi como **#91654164**, estado PENDIENTE CONFIRMACION (~3 min) | historial de estados de Dropi |
| 23:40 | Dropi valida la dirección automáticamente: "Validación exitosa" | historial de validación de direcciones |
| 23:42 | El dueño lo **cancela en Dropi**: CANCELADO. Nunca se despachó | historial de estados de Dropi |
| 23:45 | Cancelado en Shopify (`orderCancel`, `restock:false`, sin notificar); pago `VOIDED` | API de Shopify |

## Verificación en Dropi (paso 4)
| Campo | Esperado | En Dropi | ¿Correcto? |
|---|---|---|---|
| Producto / SKU | CM-135, 1 unidad | `1870930 - CM-135`, cant. 1 | Sí |
| Valor a recaudar | $219.900 | Total orden $219.900 | Sí |
| Modalidad | Contraentrega | Tipo de envío: CON RECAUDO | Sí |
| Nombre y celular | Los de P3 | Joseph C. / 314*****349 (sin +57) | Sí |
| Dirección y barrio | Los de P3 | Calle 12 #**-** + barrio | Sí |
| Ciudad y departamento | Los de P3 | CALI - VALLE | Sí |
| Transportadora asignada | (anotar) | VELOCES | — |
| Minutos hasta aparecer | (anotar) | ~3 | — |

Tienda en Dropi: `SHOPIFY-HOUSETURING`. Nota visible en Dropi: "PEDIDO DE PRUEBA OT-06 - NO DESPACHAR".

## Desglose económico que mostró Dropi (por unidad entregada)
| Concepto | Valor |
|---|---|
| Precio de venta | $219.900 |
| Costo del envío (Veloces, Cali→Cali) | −$17.647 |
| Comisión de la plataforma | −$10.112,68 |
| Precio del proveedor | −$159.900 |
| **Monto a ganar cuando esté entregado** | **$32.241** |

## Efecto en Shopify
- Tags finales del #1001: `TEST`, `canal:whatsapp`, `wa:57*****5349` y **`Order sent to dropi`**, que añadió Dropify.
- Inventario de CM-135: 0 antes y después; el pedido no descontó stock.

## Idempotencia
- Antes de crear: "Idempotencia: no hay pedidos TEST ot-06 activos".
- Segunda simulación de la cancelación: "El pedido #1001 ya está cancelado." Sin cambios.
