import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Conteo, Cultivo, ProcesamientoVideo, MuestreoResponse } from "@/types";

// paleta de colores del reporte
const VERDE = [45, 106, 79] as [number, number, number];
const VERDE_OS = [27, 67, 50] as [number, number, number];
const VERDE_CL = [216, 243, 220] as [number, number, number];
const GRIS = [26, 46, 37] as [number, number, number];
const GRIS_M = [90, 122, 106] as [number, number, number];
const GRIS_B = [221, 232, 226] as [number, number, number];
const BLANCO = [255, 255, 255] as [number, number, number];

const COLORES_CALIBRE: [number, number, number][] = [
  [45, 106, 79],
  [82, 183, 136],
  [116, 198, 157],
  [149, 213, 178],
  [183, 228, 199],
];

// validamos la fecha pa que no reviente con un "Invalid Date"
function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";
  try {
    // si viene solo fecha (YYYY-MM-DD) le pegamos T00:00:00 pa que no se desfase por la zona horaria
    const d = /T|\s\d{2}:/.test(fecha)
      ? new Date(fecha)
      : new Date(fecha + "T00:00:00");
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("es-GT");
}

// grafica de barras hecha a mano (jsPDF no trae graficas)
function dibujarGraficaBarras(
  doc: jsPDF,
  clasificaciones: MuestreoResponse["clasificaciones"],
  x: number,
  y: number,
  ancho: number,
  alto: number,
) {
  if (!clasificaciones || !clasificaciones.length) return;

  const max = Math.max(...clasificaciones.map((c) => c.cantidad_extrapolada));
  const n = clasificaciones.length;
  const anchoBar = (ancho / n) * 0.55;
  const espaciado = ancho / n;
  const baseY = y + alto;

  clasificaciones.forEach((c, i) => {
    const altBarra = max > 0 ? (c.cantidad_extrapolada / max) * alto : 0;
    const bx = x + i * espaciado + (espaciado - anchoBar) / 2;
    const by = baseY - altBarra;
    const color = COLORES_CALIBRE[i % COLORES_CALIBRE.length];

    doc.setFillColor(...color);
    doc.roundedRect(bx, by, anchoBar, altBarra, 1.5, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(formatNum(c.cantidad_extrapolada), bx + anchoBar / 2, by - 2, {
      align: "center",
    });

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text(c.nombre_calibre, bx + anchoBar / 2, baseY + 8, {
      align: "center",
    });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_M);
    doc.text(`${c.porcentaje.toFixed(1)}%`, bx + anchoBar / 2, baseY + 14, {
      align: "center",
    });
  });

  doc.setDrawColor(...GRIS_B);
  doc.setLineWidth(0.4);
  doc.line(x, baseY, x + ancho, baseY);
}

// funcion principal: arma el PDF de un conteo
export function generarReportePDF(params: {
  conteo: Conteo;
  cultivo: Cultivo;
  nombreVariedad: string;
  procesamientos: ProcesamientoVideo[];
  muestreo: MuestreoResponse | null;
}) {
  const { conteo, cultivo, nombreVariedad, procesamientos, muestreo } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 20; // margen izquierdo
  const MR = 20; // margen derecho
  const ANCHO = W - ML - MR;
  let y = 20;

  // encabezado
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 28, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text("MelonCount", ML, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Conteo Pre-cosecha · Amadeo Export S.A.", ML, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte de Conteo #${conteo.id}`, ML, 24);

  doc.setTextColor(...BLANCO);
  doc.setFontSize(8);
  doc.text(formatFecha(conteo.fecha_conteo), W - MR, 24, { align: "right" });

  y = 36;

  // info del cultivo
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Información del cultivo", ML, y);
  y += 4;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + ANCHO, y);
  y += 5;

  const cap = (t?: string | null) =>
    t ? t.replace(/\b\w/g, (m) => m.toUpperCase()) : "—";

  const infoLeft = [
    ["Cultivo", cultivo.nombre],
    ["Variedad", nombreVariedad],
    [
      "Municipio",
      cultivo.municipio_nombre
        ? `${cap(cultivo.municipio_nombre)}, ${cap(cultivo.departamento_nombre)}`
        : "—",
    ],
    ["Dirección", cultivo.ubicacion || "—"],
  ];

  const infoRight = [
    ["Hectáreas", cultivo.hectareas ? `${cultivo.hectareas} ha` : "—"],
    ["Total surcos", String(cultivo.total_surcos)],
    [
      "Estado",
      conteo.estado_nombre === "completado" ? "Completado" : "En progreso",
    ],
    ["", ""], //igualar los 4 elementos de infoLeft
  ];

  infoLeft.forEach(([label, valor], i) => {
    const yRow = y + i * 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS_M);
    doc.text(label, ML, yRow);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS);
    doc.text(valor, ML + 30, yRow);

    const [label2, valor2] = infoRight[i] || ["", ""];

    if (label2) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRIS_M);
      doc.text(label2, ML + ANCHO / 2, yRow);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRIS);
      doc.text(valor2, ML + ANCHO / 2 + 30, yRow);
    }
  });

  y += infoLeft.length * 6 + 8;

  // total acumulado
  doc.setFillColor(...VERDE_CL);
  doc.roundedRect(ML, y, ANCHO, 22, 3, 3, "F");
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, ANCHO, 22, 3, 3, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Total acumulado", ML + 6, y + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_M);
  doc.text("Suma acumulada de todos los videos del conteo", ML + 6, y + 14);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text(formatNum(conteo.conteo_total_acumulado), W - MR - 4, y + 15, {
    align: "right",
  });

  y += 28; // Bajamos el puntero para colocar el texto de confianza

  // datos de confianza de la IA
  const nivelConfiabilidad = (conteo as any).nivel_confiabilidad;
  if (nivelConfiabilidad) {
    const capNivel =
      nivelConfiabilidad.charAt(0).toUpperCase() + nivelConfiabilidad.slice(1);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE_OS);
    doc.text(`Nivel de confianza IA: ${capNivel}`, ML, y);

    if (conteo.porcentaje_baja_confianza_sesion != null) {
      const pctBaja = Math.round(conteo.porcentaje_baja_confianza_sesion * 100);
      const pctAlta = Math.round(
        (1 - conteo.porcentaje_baja_confianza_sesion) * 100,
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GRIS_M);
      doc.text(
        `${pctAlta}% de detecciones con alta confianza, ${pctBaja}% con baja confianza.`,
        ML,
        y + 5,
      );
      y += 5;
    }
    y += 8; // Espacio posterior al bloque de confianza
  } else {
    y += 4; // Si no hay confianza, dejamos un margen menor
  }

  if (conteo.observaciones) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_M);
    doc.text(`Observaciones: ${conteo.observaciones}`, ML, y);
    y += 6;
  }

  y += 4;

  // videos procesados
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Videos procesados por surco", ML, y);
  y += 4;
  doc.setDrawColor(...VERDE);
  doc.line(ML, y, ML + ANCHO, y);
  y += 3;

  // por si acaso viene undefined, lo dejamos en array vacio
  const procesamientosSeguros = procesamientos || [];

  const videosRows = procesamientosSeguros.map((p) => {
    const ia = p.resultado?.conteo_ia;
    const ajustado = p.resultado?.conteo_ajustado;
    const efectivo = ajustado ?? ia;
    return [
      `S${p.surco_inicio}–${p.surco_fin}`,
      formatFecha(p.fecha_grabacion),
      formatNum(ia),
      ajustado != null ? formatNum(ajustado) : "—",
      formatNum(efectivo),
    ];
  });

  const totalEfectivo = procesamientosSeguros.reduce((acc, p) => {
    return acc + (p.resultado?.conteo_ajustado ?? p.resultado?.conteo_ia ?? 0);
  }, 0);

  videosRows.push(["TOTAL", "", "", "", formatNum(totalEfectivo)]);

  autoTable(doc, {
    startY: y,
    head: [["Surcos", "Fecha grabación", "Conteo IA", "Ajustado", "Efectivo"]],
    body: videosRows,
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 3, textColor: GRIS },
    headStyles: { fillColor: VERDE_CL, textColor: VERDE, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // la fila del total va resaltada
      if (data.row.index === videosRows.length - 1) {
        data.cell.styles.fillColor = VERDE_CL;
        data.cell.styles.textColor = VERDE;
        data.cell.styles.fontStyle = "bold";
      }
      // filas alternas con fondo gris clarito
      if (
        data.row.index % 2 === 1 &&
        data.row.index !== videosRows.length - 1
      ) {
        data.cell.styles.fillColor = [249, 251, 250];
      }
    },
    tableLineColor: GRIS_B,
    tableLineWidth: 0.3,
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // segmentacion por calibre
  if (muestreo && muestreo.clasificaciones?.length > 0) {
    // metemos pagina nueva si ya no cabe
    if (y > H - 100) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE);
    doc.text("Segmentación por calibre", ML, y);
    y += 4;
    doc.setDrawColor(...VERDE);
    doc.line(ML, y, ML + ANCHO, y);
    y += 3;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_M);
    doc.text(
      `Basada en muestreo manual de ${formatNum(muestreo.total_muestreo)} melones, extrapolada al total del conteo.`,
      ML,
      y,
    );
    y += 8;

    const ALTO_GRAF = 45;
    dibujarGraficaBarras(
      doc,
      muestreo.clasificaciones,
      ML,
      y,
      ANCHO,
      ALTO_GRAF,
    );
    y += ALTO_GRAF + 22;

    const calRows = muestreo.clasificaciones.map((c) => [
      c.nombre_calibre,
      `${c.cantidad_muestreo} / ${c.total_muestreo}`,
      `${c.porcentaje.toFixed(1)}%`,
      formatNum(c.cantidad_extrapolada),
    ]);

    const totalExtrap = muestreo.clasificaciones.reduce(
      (acc, c) => acc + c.cantidad_extrapolada,
      0,
    );
    calRows.push(["TOTAL", "", "100%", formatNum(totalExtrap)]);

    autoTable(doc, {
      startY: y,
      head: [["Calibre", "Muestreo", "Porcentaje", "Extrapolado"]],
      body: calRows,
      margin: { left: ML, right: MR },
      styles: { fontSize: 8, cellPadding: 3, textColor: GRIS },
      headStyles: { fillColor: VERDE_CL, textColor: VERDE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.row.index === calRows.length - 1) {
          data.cell.styles.fillColor = VERDE_CL;
          data.cell.styles.textColor = VERDE;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index % 2 === 1 && data.row.index !== calRows.length - 1) {
          data.cell.styles.fillColor = [249, 251, 250];
        }
      },
      tableLineColor: GRIS_B,
      tableLineWidth: 0.3,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    if (y > H - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_M);
    doc.text(
      "No se ha registrado un muestreo por calibre para este conteo.",
      ML,
      y,
    );
    y += 8;
  }

  // pie de pagina en todas las hojas
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    const py = H - 10;
    doc.setDrawColor(...GRIS_B);
    doc.setLineWidth(0.3);
    doc.line(ML, py - 4, W - MR, py - 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_M);
    doc.text(
      `MelonCount — Amadeo Export S.A. · Reporte de Conteo #${conteo.id}`,
      ML,
      py,
    );
    doc.text(`Página ${i} de ${totalPaginas}`, W - MR, py, { align: "right" });
  }

  doc.save(`conteo_${conteo.id}_reporte.pdf`);
}

//reporte anual resume varios conteos agrupados por año

interface GrupoAnual {
  anio: number;
  conteos: Conteo[];
  total: number;
  cultivosUnicos: string[];
  variedadesUnicas: string[];
  operadoresUnicos: string[];
  todosCompletos: boolean;
  peorConfianza: string | null;
}

export function generarReporteAnualPDF(params: {
  grupos: GrupoAnual[];
  filtros: {
    cultivo?: string;
    operador?: string;
    fechaDesde: string | null;
    fechaHasta: string | null;
  };
}) {
  const { grupos, filtros } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 20,
    MR = 20;
  const ANCHO = W - ML - MR;
  let y = 20;

  // encabezado
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 28, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLANCO);
  doc.text("MelonCount", ML, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Conteo Pre-cosecha · Amadeo Export S.A.", ML, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen anual de conteos", ML, 24);

  const hoy = new Date().toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado el ${hoy}`, W - MR, 24, { align: "right" });

  y = 36;

  // filtros aplicados
  const filtrosTexto: string[] = [];
  if (filtros.cultivo) filtrosTexto.push(`Cultivo: ${filtros.cultivo}`);
  if (filtros.operador) filtrosTexto.push(`Operador: ${filtros.operador}`);
  if (filtros.fechaDesde)
    filtrosTexto.push(`Desde: ${formatFecha(filtros.fechaDesde)}`);
  if (filtros.fechaHasta)
    filtrosTexto.push(`Hasta: ${formatFecha(filtros.fechaHasta)}`);

  if (filtrosTexto.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_M);
    doc.text(`Filtros: ${filtrosTexto.join(" · ")}`, ML, y);
    y += 8;
  }

  // resumen global de todos los años
  const totalGlobal = grupos.reduce((s, g) => s + g.total, 0);
  const totalConteos = grupos.reduce((s, g) => s + g.conteos.length, 0);

  doc.setFillColor(...VERDE_CL);
  doc.roundedRect(ML, y, ANCHO, 18, 3, 3, "F");
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, ANCHO, 18, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text(
    `${grupos.length} año${grupos.length !== 1 ? "s" : ""} · ${totalConteos} conteo${totalConteos !== 1 ? "s" : ""}`,
    ML + 5,
    y + 7,
  );
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS_M);
  doc.text("Total global acumulado:", ML + 5, y + 13);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text(formatNum(totalGlobal), W - MR - 4, y + 13, { align: "right" });

  y += 24;

  // un bloque por cada año
  for (const g of grupos) {
    if (y > H - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...VERDE);
    doc.text(String(g.anio), ML, y);

    doc.setFontSize(13);
    doc.text(formatNum(g.total), W - MR, y, { align: "right" });

    y += 3;
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.4);
    doc.line(ML, y, W - MR, y);
    y += 4;

    // metadatos del año (cuantos conteos, cultivos, variedades, etc)
    const meta: string[] = [
      `${g.conteos.length} conteo${g.conteos.length !== 1 ? "s" : ""}`,
    ];
    if (g.cultivosUnicos.length === 1) meta.push(g.cultivosUnicos[0]);
    else if (g.cultivosUnicos.length > 1)
      meta.push(`${g.cultivosUnicos.length} cultivos`);
    if (g.variedadesUnicas.length === 1) meta.push(g.variedadesUnicas[0]);
    else if (g.variedadesUnicas.length > 1)
      meta.push(`${g.variedadesUnicas.length} variedades`);
    if (!g.todosCompletos) meta.push("Incluye conteos en progreso");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_M);
    doc.text(meta.join(" · "), ML, y);
    y += 6;

    const filas = g.conteos
      .slice()
      .sort(
        (a, b) =>
          new Date(a.fecha_conteo).getTime() -
          new Date(b.fecha_conteo).getTime(),
      )
      .map((c) => [
        `#${c.id}`,
        c.cultivo_nombre ?? "—",
        c.operador_nombre ?? "—",
        new Date(c.fecha_conteo + "T00:00:00").toLocaleDateString("es-GT", {
          day: "2-digit",
          month: "short",
        }),
        formatNum(
          c.conteo_total_acumulado > 0 ? c.conteo_total_acumulado : null,
        ),
        c.estado_nombre === "completado" ? "Completado" : "En progreso",
      ]);

    const totalAnio = g.conteos.reduce(
      (s, c) => s + c.conteo_total_acumulado,
      0,
    );
    filas.push(["TOTAL", "", "", "", formatNum(totalAnio), ""]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Cultivo", "Operador", "Fecha", "Total", "Estado"]],
      body: filas,
      margin: { left: ML, right: MR },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: GRIS },
      headStyles: { fillColor: VERDE_CL, textColor: VERDE, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { halign: "right", fontStyle: "bold" },
        5: { cellWidth: 24 },
      },
      didParseCell: (data) => {
        if (data.row.index === filas.length - 1) {
          data.cell.styles.fillColor = VERDE_CL;
          data.cell.styles.textColor = VERDE;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index % 2 === 1 && data.row.index !== filas.length - 1) {
          data.cell.styles.fillColor = [249, 251, 250];
        }
      },
      tableLineColor: GRIS_B,
      tableLineWidth: 0.3,
    });

    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // pie de pagina
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    const py = H - 10;
    doc.setDrawColor(...GRIS_B);
    doc.setLineWidth(0.3);
    doc.line(ML, py - 4, W - MR, py - 4);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_M);
    doc.text(
      "MelonCount — Amadeo Export S.A. · Resumen anual de conteos",
      ML,
      py,
    );
    doc.text(`Página ${i} de ${totalPaginas}`, W - MR, py, { align: "right" });
  }

  const sufijo = filtros.cultivo
    ? `_${filtros.cultivo.replace(/\s+/g, "_")}`
    : "";
  doc.save(`resumen_anual${sufijo}.pdf`);
}
