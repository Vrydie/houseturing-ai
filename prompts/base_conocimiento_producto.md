# Ficha de producto — base de conocimiento del agente

> **Llena este archivo tú.** Todo su contenido se inyecta en el system prompt y es la **única fuente de verdad** del agente: lo que no esté aquí, el agente no lo dirá (escalará).
> Escribe como le hablarías a un cliente, con frases cortas. Borra los textos de ejemplo entre `< >`.
> Si cambias precios u ofertas aquí, cámbialos **también** en la tabla `ofertas` de Postgres; la BD es la que cobra.

---

## 1. El producto
- **Nombre comercial:** <Producto Estrella>
- **Qué es, en una frase:** <Un … que te permite … sin …>
- **Para quién es:** <perfil del cliente ideal>
- **Problema que resuelve:** <el dolor principal, en palabras del cliente>
- **Para quién NO es:** <casos en que no sirve; genera confianza y evita devoluciones>

## 2. Beneficios principales (3-5, del más al menos importante)
1. <Beneficio> — <prueba o dato concreto>
2. <Beneficio> — <prueba>
3. <Beneficio> — <prueba>

## 3. Especificaciones
- Medidas / peso: <…>
- Material: <…>
- Colores / variantes disponibles: <…>
- Qué incluye la caja: <…>
- Requisitos (batería, carga, compatibilidad): <…>

## 4. Cómo se usa
1. <paso>
2. <paso>
3. <paso>

## 5. Ofertas y precios
| oferta_id | Qué incluye | Precio total | Mensaje clave |
|---|---|---|---|
| x1 | 1 unidad | $<…> | <…> |
| x2 | 2 unidades | $<…> | <"la más elegida", ahorro de $…> |
| x3 | 3 unidades | $<…> | <…> |

- Oferta que el agente debe **recomendar por defecto:** <x2>
- ¿El envío está incluido? <sí / no, cuesta $…>
- Descuentos adicionales permitidos: **ninguno** <o describe exactamente cuáles y cuándo>

## 6. Envío y entrega
- Cobertura: <todo Colombia con Dropi, salvo …>
- Tiempos: ciudades principales <…> días hábiles; resto del país <…> días hábiles.
- Transportadoras: <…>
- Horario de entrega: <…>
- Si el cliente no está al momento de la entrega: <la transportadora reintenta / deja aviso / llama>
- ¿Se puede abrir el paquete antes de pagar? <sí / no — confírmalo con Dropi y la transportadora>

## 7. Formas de pago
- **Contra entrega:** paga en efectivo al mensajero al recibir <¿aceptan transferencia al mensajero?>.
- **Pago en línea (link):** <tarjeta, PSE, Nequi… según la pasarela>.

## 8. Garantía, cambios y devoluciones
- Garantía: <… días por defectos de fábrica>
- Cómo se reclama: <el agente escala a humano>
- Cambios / retracto: <condiciones>
- Qué NO cubre: <…>

## 9. Objeciones frecuentes (mínimo 15)
Formato: **Objeción** → respuesta (validar → responder → preguntar).

1. **"Está muy caro"** → <…>
2. **"¿Es original / de buena calidad?"** → <…>
3. **"¿Y si no me funciona?"** → <…>
4. **"¿Es confiable? ¿No es estafa?"** → <pagas al recibir, no pagas nada por adelantado…>
5. **"Lo vi más barato en otra parte"** → <…>
6. **"Lo voy a pensar"** → <…>
7. **"¿Cuánto se demora?"** → <…>
8. **"¿Tienen tienda física?"** → <…>
9. **"Tengo que consultarlo con mi pareja/familia"** → <…>
10. **"¿Sirve para <caso específico>?"** → <…>
11. **"¿Hacen envío a <ciudad pequeña>?"** → usar `consultar_cobertura`.
12. **"¿Puedo pagar con tarjeta?"** → <…>
13. **"¿Qué pasa si llega dañado?"** → <…>
14. **"Ahora no tengo el dinero"** → <…>
15. **"¿Por qué debo darles mis datos?"** → <solo para el envío…>

## 10. Preguntas frecuentes
- <Pregunta> → <respuesta>
- <Pregunta> → <respuesta>

## 11. Lo que el agente NUNCA debe decir
- <Afirmaciones médicas, de salud o de resultados garantizados que no puedes demostrar>
- <Comparaciones con marcas registradas de la competencia>
- <Promesas de fechas exactas>

## 12. Datos de la empresa
- Marca: <…>
- Instagram / TikTok: <…>
- Horario de atención humana: <lun-sáb 8:00-18:00>
- Política de privacidad: <URL>
