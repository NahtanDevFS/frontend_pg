export interface Cultivo {
  id: number;
  usuario_id: number;
  nombre: string;
  ubicacion: string | null;
  hectareas: number | null;
  activo: boolean;
  creado_en: string;
}

export interface ResultadoCalibre {
  id: number;
  calibre_id: number;
  porcentaje_muestreo: number;
  cantidad_calculada: number;
}

export interface Resultado {
  id: number;
  conteo_ia: number;
  conteo_final_ajustado: number | null;
  observaciones_ajuste: string | null;
  tiempo_procesamiento_seg: number | null;
  calibres?: ResultadoCalibre[];
}

export interface Procesamiento {
  id: number;
  cultivo_id: number;
  variedad_id: number;
  estado: "pendiente" | "procesando" | "completado" | "error";
  video_original_url: string;
  video_anotado_url: string | null;
  fecha_grabacion: string;
  creado_en: string;
  resultado: Resultado | null;
}
