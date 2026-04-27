import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Conteo, Cultivo, ProcesamientoVideo, MuestreoResponse } from "@/types";

// ── Paleta ───────────────────────────────────────────────────
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

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("es-GT");
}

// ── Gráfica de barras manual ─────────────────────────────────
function dibujarGraficaBarras(
  doc: jsPDF,
  clasificaciones: MuestreoResponse["clasificaciones"],
  x: number,
  y: number,
  ancho: number,
  alto: number,
) {
  if (!clasificaciones.length) return;

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

    // Barra
    doc.setFillColor(...color);
    doc.roundedRect(bx, by, anchoBar, altBarra, 1.5, 1.5, "F");

    // Valor encima
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(formatNum(c.cantidad_extrapolada), bx + anchoBar / 2, by - 2, {
      align: "center",
    });

    // Nombre calibre
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS);
    doc.text(c.nombre_calibre, bx + anchoBar / 2, baseY + 8, {
      align: "center",
    });

    // Porcentaje
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_M);
    doc.text(`${c.porcentaje.toFixed(1)}%`, bx + anchoBar / 2, baseY + 14, {
      align: "center",
    });
  });

  // Línea base
  doc.setDrawColor(...GRIS_B);
  doc.setLineWidth(0.4);
  doc.line(x, baseY, x + ancho, baseY);
}

// ── Función principal ─────────────────────────────────────────
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

  // ── Encabezado ──────────────────────────────────────────────
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

  // ── Info del cultivo ────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Información del cultivo", ML, y);
  y += 4;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + ANCHO, y);
  y += 5;

  const infoLeft = [
    ["Cultivo", cultivo.nombre],
    ["Variedad", nombreVariedad],
    ["Ubicación", cultivo.ubicacion || "—"],
  ];
  const infoRight = [
    ["Hectáreas", cultivo.hectareas ? `${cultivo.hectareas} ha` : "—"],
    ["Total surcos", String(cultivo.total_surcos)],
    ["Estado", conteo.estado_id === 2 ? "Completado" : "En progreso"],
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

    const [label2, valor2] = infoRight[i];
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS_M);
    doc.text(label2, ML + ANCHO / 2, yRow);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS);
    doc.text(valor2, ML + ANCHO / 2 + 30, yRow);
  });

  y += infoLeft.length * 6 + 8;

  // ── Total acumulado ─────────────────────────────────────────
  doc.setFillColor(...VERDE_CL);
  doc.roundedRect(ML, y, ANCHO, 22, 3, 3, "F");
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, ANCHO, 22, 3, 3, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Total melones contados (IA)", ML + 6, y + 8);

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

  y += 30;

  if (conteo.observaciones) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRIS_M);
    doc.text(`Observaciones: ${conteo.observaciones}`, ML, y);
    y += 6;
  }

  // ── Videos procesados ───────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE);
  doc.text("Videos procesados por surco", ML, y);
  y += 4;
  doc.setDrawColor(...VERDE);
  doc.line(ML, y, ML + ANCHO, y);
  y += 3;

  const videosRows = procesamientos.map((p) => {
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

  const totalEfectivo = procesamientos.reduce((acc, p) => {
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
      // Fila TOTAL
      if (data.row.index === videosRows.length - 1) {
        data.cell.styles.fillColor = VERDE_CL;
        data.cell.styles.textColor = VERDE;
        data.cell.styles.fontStyle = "bold";
      }
      // Filas alternas
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

  // ── Segmentación por calibre ────────────────────────────────
  if (muestreo && muestreo.clasificaciones.length > 0) {
    // Nueva página si no hay espacio suficiente
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

    // Gráfica de barras
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

    // Tabla de calibres
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

  // ── Pie de página en todas las páginas ──────────────────────
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
