export interface Cultivo {
  id: number;
  usuario_id: number;
  nombre: string;
  ubicacion: string | null;
  hectareas: number | null;
  creado_en: string;
}

export interface ResultadoIA {
  conteo_maduros: number;
  conteo_inmaduros: number;
  tiempo_procesamiento_seg: number | null;
}

export interface Procesamiento {
  id: number;
  cultivo_id: number;
  estado: "pendiente" | "procesando" | "completado" | "error";
  video_original_url: string;
  video_anotado_url: string | null;
  fecha_grabacion: string;
  creado_en: string;
  resultado_ia: ResultadoIA | null;
}
