# SIA node server

Permite registrar eventos de AJAX Security Systems y otros tipos de eventos SIA-DC-09 en una base de datos MSSQL.

## Instalacion

```bash
git clone https://github.com/noBotHereDude/sia.git
cd sia
npm i
node server.js --help
```

## Configuracion de ejemplo

```yaml
server:
  port: 65000
  diff:
    negative: -20
    positive: 40
dispatcher:
  -
    type: 'mssql'
    format: 'human'
    user: 'user'
    password: '$3cr3t'
    database: 'sia-events'
    server: '127.0.0.1'
    port: 1433
```

## Ejecucion

```bash
# configuracion por defecto
node server.js

# especificar puerto de servicio
node server.js --port 65000

# depurar mensajes a consola
node server.js --debug
```
