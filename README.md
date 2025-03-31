# Library Database Seeder

## 📖 Descripción
Este es un script de Node.js para poblar una base de datos PostgreSQL con datos de prueba para un sistema de biblioteca. Genera autores, editoriales, libros, usuarios, estudiantes, préstamos y pagos.

## 🛠 Requisitos
- PostgreSQL instalado y en ejecución
- Node.js (v14 o superior)
- Archivo `books.json` con datos de libros

## ⚙️ Configuración

1. **Configura tus credenciales** en el archivo `.env`:

```env
DB_NAME=library
DB_PORT=5432
DB_HOST=127.0.0.1
DB_USR=postgres
DB_PSW=12345
```

2. **Asegúrate** de tener creadas las tablas necesarias en tu base de datos PostgreSQL.

## 🚀 Instalación y Ejecución

1. Instala las dependencias:
```bash
npm install
```

2. Ejecuta el seeder:
```bash
node index.js
```

## 📂 Estructura de Archivos

```
library-seeder/
├── books.json              # Datos de libros a importar
├── generated_ids.json      # IDs generados para referencia
├── index.js                # Script principal
├── node_modules/           # Dependencias
├── package.json            # Configuración del proyecto
├── package-lock.json       # Versiones exactas de dependencias
└── README.md               # Este archivo
```

## 📊 Datos Generados
El script generará:
- 20 autores
- 20 editoriales
- Libros basados en `books.json` (270)
- 50 usuarios
- 50 estudiantes
- 500 préstamos con sus respectivos pagos

## 📄 Archivos de Salida
- `generated_ids.json`: Contiene los IDs de todos los registros creados para referencia futura

## ⚠️ Notas
- Asegúrate de que PostgreSQL esté en ejecución antes de correr el script
- El script borrará cualquier dato existente en las tablas afectadas
- Modifica las cantidades en `index.js` si necesitas más/menos datos de prueba