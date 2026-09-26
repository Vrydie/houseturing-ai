# Prompt — Emparejador de mercado (DS-48)

Cómo usar este archivo:
- Una llamada por candidato **y por tienda**, con los 5 primeros resultados de la búsqueda.
- Usa un modelo económico **con visión** si puedes: comparar las fotos es lo que más acierta.
- Temperatura 0.
- La salida se guarda en `comparativo_mercado.coincidencia` y `.confianza`.

---

```
# Tarea
Decide si cada resultado de búsqueda de otra tienda es el MISMO producto que el candidato, uno SIMILAR (misma función y formato, pero con otro diseño, tamaño o calidad) o uno DISTINTO.

# Criterios
- igual: mismo producto (misma forma, función y características principales). La marca puede faltar o cambiar, porque en dropshipping el mismo producto se vende con otros nombres.
- similar: el cliente lo vería como una alternativa directa (misma función y uso) aunque no sea idéntico.
- distinto: otra función, un accesorio del producto, un repuesto, un paquete con otras cosas o una versión claramente superior o inferior.
- Fíjate en la cantidad: "pack x3" frente a una unidad. Si no es igual, indícalo en unidades_por_paquete para comparar el precio por unidad.
- confianza "alta" solo si las imágenes y el título lo dejan claro. Sin imagen, la confianza máxima es "media".

# Candidato (Dropi)
- Nombre: {{ $json.candidato.nombre }}
- Descripción: {{ $json.candidato.descripcion }}
- Imagen: adjunta

# Resultados de {{ $json.fuente }} para "{{ $json.keyword }}"
{{ $json.resultados.map((r, i) => (i+1) + '. ' + r.titulo + ' — $' + r.precio + ' — imagen ' + (i+1) + ' adjunta').join('\n') }}

# Salida (solo JSON)
{
  "resultados": [
    { "indice": 1, "coincidencia": "igual|similar|distinto", "confianza": "alta|media|baja", "unidades_por_paquete": 1, "razon": "máx. 15 palabras" }
  ]
}
```
