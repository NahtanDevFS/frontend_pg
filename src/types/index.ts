export interface Rol {
  id: number;
  nombre: string;
}

export interface Variedad {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface Calibre {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  rol_id: number;
  activo: boolean;
  created_at: string;
}

export interface Cultivo {
  id: number;
  usuario_id: number;
  nombre: string;
  ubicacion: string | null;
  hectareas: number | null;
  total_surcos: number;
  activo: boolean;
  created_at: string;
}

export interface ClasificacionCalibre {
  id: number;
  calibre_id: number;
  porcentaje: number;
  cantidad_melones: number;
}

export interface ResultadoIa {
  id: number;
  conteo_ia: number;
  conteo_ajustado: number | null;
  observaciones_ajuste: string | null;
  tiempo_procesamiento_seg: number | null;
  clasificaciones: ClasificacionCalibre[];
}

export interface ProcesamientoVideo {
  id: number;
  sesion_id: number;
  usuario_id: number;
  estado_id: number;
  surco_inicio: number;
  surco_fin: number;
  video_original_url: string;
  video_anotado_url: string | null;
  fecha_grabacion: string;
  created_at: string;
  resultado: ResultadoIa | null;
}

export interface SesionConteo {
  id: number;
  cultivo_id: number;
  variedad_id: number;
  estado_id: number;
  fecha_sesion: string;
  conteo_total_acumulado: number;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
}
