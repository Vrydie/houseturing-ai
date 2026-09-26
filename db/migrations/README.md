# Migraciones de base de datos (Frente B)

- `db/schema.sql` es la **foto completa** del esquema actual. Sirve para crear una base desde cero (OT-01).
- **Cada cambio** (tabla, columna, índice, fila de `config`) va en un archivo nuevo:
  `db/migrations/NNN_descripcion.sql`, numerado en orden (`001_…`, `002_…`).
- **En el mismo PR** se actualiza `db/schema.sql`, para que siga siendo la foto completa.
- Las migraciones solo agregan o modifican: nunca se edita una migración ya unida a `main`.
- **Aplicar en una base existente** (dentro de la carpeta `infra/`):
  `docker compose exec -T postgres psql -U <usuario> -d dropship -f /migrations/NNN_descripcion.sql`
  (montar `db/migrations` en `/migrations`, de solo lectura).
- Si la migración cambia algo que usa el Frente A (por ejemplo, `productos` u `ofertas`), el PR lo dice y el dueño lo aprueba.
