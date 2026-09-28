# Infraestructura Local

## Iniciar los servicios
`docker compose up -d`

## Detener los servicios
`docker compose down`

## Backups
`pg_dump -h 127.0.0.1 -p 5433 -U dropship dropship > backup.sql`
