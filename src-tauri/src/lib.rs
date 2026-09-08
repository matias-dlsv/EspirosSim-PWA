// IMPORTANTE: Le decimos a Rust que busque e incluya el archivo "read.rs"
pub mod read;
use chrono::Local;
use serde::{Deserialize, Serialize};

// 1. Estructura para recibir los datos básicos desde el formulario de React
#[derive(Deserialize)]
pub struct PacienteInput {
    pub nombre: String,
    pub edad: u32,
    pub talla: f64,
    pub sexo: String,
    pub raza: String,
}

// 2. Estructura para los parámetros de la espirometría
#[derive(Serialize)]
pub struct ParametrosEspirometria {
    pub fvc: read::ValoresMLS,
    pub fev1: read::ValoresMLS,
    pub fev1fvc: read::ValoresMLS,
}

// 3. Estructura final que agrupa todo para enviarlo a TypeScript
#[derive(Serialize)]
pub struct DatosEspirometria {
    pub parametros: ParametrosEspirometria,
    pub curva_generada: Vec<f64>,
    pub fecha: String,
}

// 4. Nuestro comando principal
#[tauri::command]
fn procesar_nuevo_paciente(
    datos: PacienteInput,
    app_handle: tauri::AppHandle,
) -> Result<DatosEspirometria, String> {
    let indices_calculados = read::leer_tabla_espirometria(
        datos.edad,
        datos.talla as f32,
        &datos.sexo,
        &datos.raza,
        &app_handle,
    )?; // El `?` propaga el error automáticamente

    // A. Establecemos los parámetros con los datos REALES extraídos del Excel
    let valores_base = ParametrosEspirometria {
        fvc: indices_calculados.fvc,
        fev1: indices_calculados.fev1,
        fev1fvc: indices_calculados.fev1fvc,
    };

    // B. Generamos la curva basándonos en esos parámetros reales
    let curva_mock = vec![
        0.0,
        valores_base.fev1.m * 1.5,
        valores_base.fev1.m * 0.8,
        valores_base.fvc.m * 0.5,
        0.0,
    ];

    // C. Empaquetamos todo y lo retornamos
    Ok(DatosEspirometria {
        parametros: valores_base,
        curva_generada: curva_mock,
        fecha: Local::now().format("%Y-%m-%d").to_string(),
    })
}

// 5. El arranque de la aplicación (Queda igual)
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![procesar_nuevo_paciente])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
