# Workflows de n8n (Frente B)

- Un archivo JSON por workflow, exportado desde la instancia del proyecto:
  `docker compose exec n8n n8n export:workflow --all --separate --output=/workflows`
- **Nombre:** `DS-XX_<nombre>.json`, igual que el inventario del ROADMAP.
- **Sin credenciales ni tokens:** n8n no exporta las credenciales, pero revisa que ningún nodo tenga un token escrito a mano. `/entregar` lo verifica.
- **Sin datos de prueba fijados** (pin data) con información de clientes reales.
- **Importar** en otra instancia: `n8n import:workflow --separate --input=/workflows` y luego asignar las credenciales en la interfaz.
- Solo el Frente B importa workflows al n8n del servidor.
