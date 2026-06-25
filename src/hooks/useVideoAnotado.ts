import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Descarga el video anotado a través del endpoint autenticado
 * (/procesamientos/{id}/video-anotado) como blob y devuelve un object URL
 * usable en un tag <video>. Un <video src> normal no puede enviar el header
 * Authorization, por eso se descarga con axios y se crea el object URL.
 *
 * Solo descarga cuando `activo` es true (p. ej. cuando el usuario expande
 * el reproductor), para no traer el archivo al cargar la página.
 */
export function useVideoAnotado(
  procesamientoId: number | null,
  activo: boolean,
) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cargandoVideo, setCargandoVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState(false);

  useEffect(() => {
    if (!procesamientoId || !activo) return;

    let objectUrl: string | null = null;
    setCargandoVideo(true);
    setErrorVideo(false);

    api
      .get(`/procesamientos/admin/${procesamientoId}/video-anotado`, {
        responseType: "blob",
      })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setVideoUrl(objectUrl);
      })
      .catch(() => setErrorVideo(true))
      .finally(() => setCargandoVideo(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setVideoUrl(null);
    };
  }, [procesamientoId, activo]);

  return { videoUrl, cargandoVideo, errorVideo };
}
