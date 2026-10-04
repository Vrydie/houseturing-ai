# Ficha de producto — base de conocimiento del agente

> **Llena este archivo tú.** Todo su contenido se inyecta en el system prompt y es la **única fuente de verdad** del agente: lo que no esté aquí, el agente no lo dirá (escalará).
> Escribe como le hablarías a un cliente, con frases cortas. Borra los textos de ejemplo entre `< >`.
> Si cambias precios u ofertas aquí, cámbialos **también** en la tabla `ofertas` de Postgres; la BD es la que cobra.

---

## 1. El producto
- **Nombre comercial:** Combo Taladro Percutor Inalámbrico con Maletín Completo
- **Qué es, en una frase:** Un kit de herramientas portátil y potente que te permite taladrar, atornillar y reparar en casa sin depender de cables.
- **Para quién es:** Personas que hacen arreglos en el hogar, proyectos de bricolaje (DIY) y necesitan una herramienta versátil lista para usar.
- **Problema que resuelve:** Evita tener que llamar a un técnico para arreglos menores y soluciona la falta de herramientas organizadas en casa.
- **Para quién NO es:** No es para uso industrial pesado ni trabajo continuo en construcción profesional.

## 2. Beneficios principales (3-5, del más al menos importante)
1. Inalámbrico y portátil — Trae 2 baterías recargables para que trabajes sin buscar enchufes.
2. Todo en uno — Incluye un maletín de alto impacto con múltiples accesorios (brocas, copas, destornilladores).
3. Tres modos de uso — Funciona como taladro, percutor (para pared) y atornillador.
4. Luz LED integrada — Permite trabajar en espacios oscuros o debajo de muebles.

## 3. Especificaciones
- Medidas / peso: Maletín fácil de transportar, peso aproximado 2 kg.
- Material: Plástico de alto impacto y metal.
- Colores / variantes disponibles: Negro con detalles amarillos.
- Qué incluye la caja: Taladro, 2 baterías de 24v, cargador, maletín con múltiples accesorios (brocas, copas, cinta métrica, bisturí, segueta, alicate).
- Requisitos (batería, carga, compatibilidad): Se conecta a corriente estándar de 110V para cargar.

## 4. Cómo se usa
1. Carga una de las baterías al 100% antes de usarlo.
2. Inserta la batería en la base del taladro y selecciona la broca o punta que necesites.
3. Ajusta el torque y el modo (taladro, percutor o atornillador) según el material.

## 5. Ofertas y precios
| oferta_id | Qué incluye | Precio total | Mensaje clave |
|---|---|---|---|
| x1 | 1 Combo Completo | $219.900 | El kit ideal para tener en casa. |
| x2 | 2 Combos Completos | $399.900 | Aprovecha el descuento llevando dos. |

- Oferta que el agente debe **recomendar por defecto:** x1
- ¿El envío está incluido? Envío gratis a todo el país.
- Descuentos adicionales permitidos: **ninguno**

## 6. Envío y entrega
- Cobertura: Todo Colombia, salvo zonas rojas de difícil acceso.
- Tiempos: ciudades principales 2 a 5 días hábiles; resto del país 3 a 7 días hábiles.
- Transportadoras: Servientrega, Inter Rapidísimo o Envía.
- Horario de entrega: Lunes a sábado, 8 AM a 6 PM.
- Si el cliente no está al momento de la entrega: La transportadora hace hasta 2 reintentos.
- ¿Se puede abrir el paquete antes de pagar? No, por políticas de las transportadoras se debe pagar primero.

## 7. Formas de pago
- **Contra entrega:** Paga en efectivo al mensajero al recibir el producto.
- **Pago en línea (link):** Transferencia PSE o Nequi vía link de pago.

## 8. Garantía, cambios y devoluciones
- Garantía: 30 días por defectos de fábrica (el motor no enciende o baterías no cargan).
- Cómo se reclama: Contactando a soporte técnico; el agente escala a humano.
- Cambios / retracto: Hasta 5 días hábiles después de recibirlo, asumiendo fletes si es por retracto.
- Qué NO cubre: Daños por mal uso, caídas, humedad o sobrecarga del motor.

## 9. Objeciones frecuentes (mínimo 15)
Formato: **Objeción** → respuesta (validar → responder → preguntar).

1. **"Está muy caro"** → Entiendo que cuides tu presupuesto. Ten en cuenta que te estás llevando múltiples accesorios y dos baterías, lo que es un gran valor. ¿Te gustaría pedir el tuyo?
2. **"¿Es original / de buena calidad?"** → Sí, es una herramienta genérica importada de excelente calidad para uso en el hogar. ¿Te lo envío a tu casa?
3. **"¿Y si no me funciona?"** → Estás protegido. Tienes 30 días de garantía directa por defectos de fábrica. ¿A qué ciudad sería el envío?
4. **"¿Es confiable? ¿No es estafa?"** → Comprendo tu desconfianza. Por eso pagas SOLO cuando recibas la caja en tus manos. No pides nada por adelantado. ¿Me regalas tus datos para el envío?
5. **"Lo vi más barato en otra parte"** → Es posible encontrar productos parecidos, pero nosotros te aseguramos el maletín completo con múltiples accesorios y garantía de 30 días. ¿Te animas con nosotros?
6. **"Lo voy a pensar"** → Claro que sí, tómate tu tiempo. Solo recuerda que El envío es gratis. ¿Tienes alguna duda en la que pueda ayudarte?
7. **"¿Cuánto se demora?"** → Suele tardar de 2 a 5 días hábiles en ciudades principales. ¿En qué ciudad te encuentras para confirmarte?
8. **"¿Tienen tienda física?"** → Somos una tienda 100% online, lo que nos permite darte el envío gratis hasta la puerta de tu casa. ¿Quieres que te envíe uno?
9. **"Tengo que consultarlo con mi pareja/familia"** → Perfecto, es una excelente decisión para el hogar. Consúltalo y me avisas.
10. **"¿Sirve para concreto o pared?"** → Sí, cuenta con la función de percutor, ideal para taladrar mampostería y pared de ladrillo. ¿Qué proyecto tienes en mente?
11. **"¿Hacen envío a <ciudad pequeña>?"** → Déjame consultar la cobertura. (usar `consultar_cobertura`).
12. **"¿Puedo pagar con tarjeta?"** → Claro, te puedo generar un enlace de pago seguro para Nequi o PSE. ¿Prefieres ese método o pago en efectivo al recibir?
13. **"¿Qué pasa si llega dañado?"** → Tienes 30 días de garantía directa por defectos de fábrica (el motor no enciende o baterías no cargan). Escalaré tu caso con soporte técnico. ¿Te tomo el pedido?
14. **"Ahora no tengo el dinero"** → Entiendo. Recuerda que no pagas hoy, sino el día que te lo entreguen (en unos 3 a 5 días). ¿Te serviría así?
15. **"¿Por qué debo darles mis datos?"** → Solo los necesitamos para que la transportadora sepa a dónde llevar tu paquete y contactarte cuando estén cerca. Son totalmente confidenciales.

## 10. Preguntas frecuentes
- ¿Qué voltaje tienen las baterías? → Son de 24V.
- ¿Trae brocas para madera? → Sí, el maletín incluye brocas estándar para madera y pared.
- ¿Cuánto dura la batería? → Depende del uso, pero para trabajos caseros dura lo suficiente para completar tus proyectos del hogar. ¡Y trae 2 baterías!

## 11. Lo que el agente NUNCA debe decir
- No afirmar que es marca "DeWALT" ni "Bosch" original (son genéricos).
- No prometer uso industrial o trabajo continuo de 8 horas diarias.
- No prometer fechas u horas exactas de entrega.
- NUNCA decir que el taladro es de 48V reales (el voltaje real es 24V).

## 12. Datos de la empresa
- Marca: HouseTuring
- Instagram / TikTok: <pendiente>
- Horario de atención humana: Lunes a Sábado de 8:00 AM a 6:00 PM.
- Política de privacidad: <pendiente>
