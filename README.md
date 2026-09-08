# 🫁 EspirometriApp

Aplicación de escritorio para la visualización, análisis e interacción con curvas de exámenes respiratorios (espirometría). Desarrollada con un enfoque en alto rendimiento y seguridad de tipos.

## 🛠 Stack Tecnológico

- **Frontend:** React + TypeScript (Vite)
- **Backend / Sistema:** Rust
- **Framework de Escritorio:** Tauri 2.x
- **Gráficos:** Recharts / Echarts (por definir)

## ⚙️ Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

1.  **Node.js & npm:** [Descargar aquí](https://nodejs.org/)
2.  **Rust & Cargo:** [Instrucciones de instalación](https://rustup.rs/)

### Dependencias de Sistema (Linux / WSL)

Si estás ejecutando esto en WSL (Ubuntu 24.04/Noble) o Linux, necesitas las librerías de desarrollo de WebKit y GTK:

```bash
sudo apt update
sudo apt install \
    build-essential \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    pkg-config
```

````

## 🚀 Comandos Principales

### 1\. Instalación de Dependencias

Instala las librerías de Node.js (React, TypeScript, utilidades):

```bash
npm install
```

_(Nota: Las dependencias de Rust se descargan automáticamente al compilar por primera vez)._

### 2\. Modo Desarrollo (Dev)

Este es el comando que usarás el 90% del tiempo. Inicia la aplicación con recarga en caliente (Hot Reload):

```bash
npm run tauri dev
```

- **Frontend:** Se sirve en `http://localhost:1420`
- **Backend:** Se recompila incrementalmente si cambias archivos `.rs`.

### 3\. Compilación para Producción (Build)

Genera el ejecutable final optimizado (sin consola de depuración y minificado):

```bash
npm run tauri build
```

- El ejecutable se guardará en: `src-tauri/target/release/`
- En Windows generará un `.exe` y un instalador `.msi` (si está configurado).
- En Linux generará un binario y un `.deb` / `.AppImage`.

## 📂 Estructura del Proyecto

- `/src`: Código fuente del **Frontend** (React + TypeScript). Aquí van tus componentes, gráficos y estilos.
- `/src-tauri`: Código fuente del **Backend** (Rust).
  - `src/lib.rs` (o `main.rs`): Punto de entrada de Rust y definición de Comandos.
  - `tauri.conf.json`: Configuración de la ventana, permisos y nombre de la app.

## 🔧 Solución de Problemas Comunes

**Error: `pkg-config` not found o `gdk-3.0` not found**
Faltan las librerías del sistema en Linux/WSL. Ejecuta el comando mencionado en la sección de "Requisitos Previos".

**La ventana no abre en WSL**
Asegúrate de estar usando **WSL 2** y de tener soporte para **WSLg** (Windows 10 actualizado o Windows 11). Puedes probar ejecutando `xeyes` en la terminal para verificar si tienes soporte gráfico.

````

---

### 💡 Un consejo extra de Ingeniería

Acostúmbrate a usar un archivo **`.gitignore`** para no subir archivos basura a tu repositorio (si usas Git). Tauri ya te debió haber creado uno, pero verifica que incluya estas líneas para no subir los binarios pesados:

```text
node_modules
target/
src-tauri/target/
dist/
.DS_Store
```
