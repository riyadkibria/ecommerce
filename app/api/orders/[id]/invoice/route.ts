import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Money = number | string | null | undefined;

type Order = {
  id: number;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  address_line: string | null;
  courier_slug: string | null;
  subtotal: number | string;
  shipping_cost: number | string;
  tax: number | string;
  total: number | string;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string | null;
};

type OrderItem = {
  id: number;
  product_title: string | null;
  quantity: number;
  price: number | string;
};

type Shipment = {
  tracking_number: string | null;
  status: string | null;
};

type StoreInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type InvoiceData = {
  order: Order;
  items: OrderItem[];
  shipment: Shipment | null;
};

type RenderContext = InvoiceData & {
  doc: PDFKit.PDFDocument;
  store: StoreInfo;
  invoiceNumber: string;
  isPaid: boolean;
};

type TextAlign = "left" | "right" | "center";

class InvoiceError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "InvoiceError";
  }
}

/* -------------------------------------------------------------------------- */
/*  Design tokens & layout                                                    */
/* -------------------------------------------------------------------------- */

const COLORS = {
  ink: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  soft: "#94a3b8",
  line: "#e2e8f0",
  hairline: "#eef2f7",
  band: "#f8fafc",
  accent: "#2563eb",
  accentSoft: "#93c5fd",
  headerText: "#cbd5e1",
  white: "#ffffff",
  success: "#047857",
  danger: "#b91c1c",
  warning: "#b45309",
} as const;

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 40,
  /** Max Y for body content before a page break is required. */
  contentLimit: 735,
  footerY: 800,
} as const;

const LEFT = PAGE.margin;
const RIGHT = PAGE.width - PAGE.margin;
const CONTENT_W = RIGHT - LEFT;

/** Items table column geometry. */
const COLUMNS = {
  index: { x: LEFT + 10, w: 20 },
  description: { x: LEFT + 34, w: 250 },
  quantity: { x: RIGHT - 225, w: 40 },
  unitPrice: { x: RIGHT - 177, w: 80 },
  amount: { x: RIGHT - 91, w: 81 },
} as const;

const TOTALS = {
  x: 355,
  w: RIGHT - 355,
} as const;

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

function toNumber(value: Money): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: Money): string {
  return `BDT ${toNumber(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(date);
}

function formatTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-BD", { timeStyle: "short" }).format(date);
}

function pretty(value: string | null | undefined, fallback = "Pending"): string {
  if (!value) return fallback;
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusColor(status: string | null | undefined): string {
  const s = (status || "").toLowerCase();

  if (s.includes("paid") || s.includes("success") || s.includes("complete")) {
    return COLORS.success;
  }
  if (s.includes("fail") || s.includes("cancel") || s.includes("refund")) {
    return COLORS.danger;
  }
  return COLORS.warning;
}

function getStoreInfo(): StoreInfo {
  return {
    name: process.env.STORE_NAME || "Your Store",
    email: process.env.STORE_EMAIL || "",
    phone: process.env.STORE_PHONE || "",
    address: process.env.STORE_ADDRESS || "",
  };
}

function buildInvoiceNumber(order: Order): string {
  const year = (parseDate(order.created_at) ?? new Date()).getFullYear();
  return `INV-${year}-${String(order.id).padStart(6, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*  Low-level drawing primitives                                              */
/* -------------------------------------------------------------------------- */

function drawLabel(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width = 200,
  align: TextAlign = "left",
  color: string = COLORS.soft
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(color)
    .text(text.toUpperCase(), x, y, {
      width,
      align,
      characterSpacing: 0.8,
    });
}

function drawHLine(
  doc: PDFKit.PDFDocument,
  y: number,
  x1 = LEFT,
  x2 = RIGHT,
  color: string = COLORS.line,
  width = 0.75
) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
}

/** Draws a "key ........ value" row. Returns the Y position for the next row. */
function drawKeyValue(
  doc: PDFKit.PDFDocument,
  key: string,
  value: string,
  x: number,
  y: number,
  width: number,
  valueColor: string = COLORS.ink
): number {
  const keyW = 54;
  const gap = 2;
  const valueW = width - keyW - gap;

  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted);
  doc.text(key, x, y + 0.5, { width: keyW });

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(valueColor);
  const h = doc.heightOfString(value, { width: valueW });
  doc.text(value, x + keyW + gap, y, { width: valueW, align: "right" });

  return y + Math.max(14, h + 5);
}

/* -------------------------------------------------------------------------- */
/*  Section renderers                                                         */
/* -------------------------------------------------------------------------- */

/** Store details (left), invoice title / number / payment badge (right). */
function drawHeader(ctx: RenderContext): number {
  const { doc, store, order, invoiceNumber } = ctx;

  // Store block
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.ink)
    .text(store.name, LEFT, 30, { width: 300 });

  doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted);

  let storeY = doc.y + 2;

  if (store.address) {
    doc.text(store.address, LEFT, storeY, { width: 300 });
    storeY = doc.y + 1;
  }

  const contactLine = [store.phone, store.email].filter(Boolean).join("   |   ");

  if (contactLine) {
    doc.text(contactLine, LEFT, storeY, { width: 300 });
    storeY = doc.y;
  }

  // Invoice title block
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(COLORS.ink)
    .text("INVOICE", TOTALS.x, 30, {
      width: TOTALS.w,
      align: "right",
      characterSpacing: 2,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(invoiceNumber, TOTALS.x, 55, { width: TOTALS.w, align: "right" });

  // Payment status badge
  const badgeColor = statusColor(order.payment_status);
  const badgeText = pretty(order.payment_status).toUpperCase();
  const badgeW = 72;
  const badgeH = 16;
  const badgeX = RIGHT - badgeW;
  const badgeY = 72;

  doc
    .roundedRect(badgeX, badgeY, badgeW, badgeH, 8)
    .lineWidth(0.75)
    .strokeColor(badgeColor)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(badgeColor)
    .text(badgeText, badgeX, badgeY + 5, {
      width: badgeW,
      align: "center",
      characterSpacing: 0.8,
      lineBreak: false,
    });

  const headerBottom = Math.max(storeY, badgeY + badgeH) + 12;
  drawHLine(doc, headerBottom);

  return headerBottom;
}

/** Three-column box: billed to / order details / payment & shipping. */
function drawInfoGrid(ctx: RenderContext, top: number): number {
  const { doc, order, shipment } = ctx;

  const colW = [175, 170, CONTENT_W - 175 - 170];
  const colX = [LEFT, LEFT + colW[0], LEFT + colW[0] + colW[1]];
  const pad = 12;

  const addressText =
    [order.address_line, order.city].filter(Boolean).join(", ") ||
    "Address not provided";
  const trackingText = shipment?.tracking_number || "Not available";

  // Measure dynamic content so the box always fits it
  doc.font("Helvetica").fontSize(8.5);
  const addrH = doc.heightOfString(addressText, { width: colW[0] - pad * 2 });

  doc.font("Helvetica-Bold").fontSize(8.5);
  const trackH = doc.heightOfString(trackingText, {
    width: colW[2] - pad * 2 - 56,
  });

  const extraTrack = Math.max(0, trackH + 5 - 14);
  const gridH = Math.max(94 + extraTrack, 56 + addrH + 14);

  // Border + column dividers
  doc
    .roundedRect(LEFT, top, CONTENT_W, gridH, 6)
    .lineWidth(0.75)
    .strokeColor(COLORS.line)
    .stroke();

  [colX[1], colX[2]].forEach((x) => {
    doc
      .moveTo(x, top + 12)
      .lineTo(x, top + gridH - 12)
      .lineWidth(0.75)
      .strokeColor(COLORS.line)
      .stroke();
  });

  // Column 1 — Billed to
  const c1x = colX[0] + pad;
  const c1w = colW[0] - pad * 2;

  drawLabel(doc, "Billed to", c1x, top + 12, c1w);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLORS.ink)
    .text(order.full_name || "Customer", c1x, top + 26, { width: c1w });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`Phone: ${order.phone || "N/A"}`, c1x, top + 42, { width: c1w })
    .text(addressText, c1x, top + 55, { width: c1w });

  // Column 2 — Order details
  const c2x = colX[1] + pad;
  const c2w = colW[1] - pad * 2;

  drawLabel(doc, "Order details", c2x, top + 12, c2w);

  let y2 = top + 27;
  y2 = drawKeyValue(doc, "Order No", `#${order.id}`, c2x, y2, c2w);
  y2 = drawKeyValue(doc, "Date", formatDate(order.created_at), c2x, y2, c2w);
  y2 = drawKeyValue(doc, "Time", formatTime(order.created_at), c2x, y2, c2w);
  drawKeyValue(doc, "Status", pretty(order.status), c2x, y2, c2w);

  // Column 3 — Payment & shipping
  const c3x = colX[2] + pad;
  const c3w = colW[2] - pad * 2;

  drawLabel(doc, "Payment & shipping", c3x, top + 12, c3w);

  let y3 = top + 27;
  y3 = drawKeyValue(doc, "Method", pretty(order.payment_method), c3x, y3, c3w);
  y3 = drawKeyValue(
    doc,
    "Payment",
    pretty(order.payment_status),
    c3x,
    y3,
    c3w,
    statusColor(order.payment_status)
  );
  y3 = drawKeyValue(
    doc,
    "Courier",
    pretty(order.courier_slug, "Not assigned"),
    c3x,
    y3,
    c3w
  );
  drawKeyValue(doc, "Tracking", trackingText, c3x, y3, c3w);

  return top + gridH;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  const height = 22;

  doc.rect(LEFT, y, CONTENT_W, height).fill(COLORS.ink);

  const ty = y + 8;
  const c = COLUMNS;
  const color = COLORS.headerText;

  drawLabel(doc, "#", c.index.x, ty, c.index.w, "left", color);
  drawLabel(doc, "Description", c.description.x, ty, c.description.w, "left", color);
  drawLabel(doc, "Qty", c.quantity.x, ty, c.quantity.w, "right", color);
  drawLabel(doc, "Unit price", c.unitPrice.x, ty, c.unitPrice.w, "right", color);
  drawLabel(doc, "Amount", c.amount.x, ty, c.amount.w, "right", color);

  return y + height;
}

function drawContinuationHeader(ctx: RenderContext) {
  const { doc, store, invoiceNumber } = ctx;

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.ink)
    .text(store.name, LEFT, 22, { width: 300, lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`${invoiceNumber}  (continued)`, TOTALS.x, 22, {
      width: TOTALS.w,
      align: "right",
      lineBreak: false,
    });
}

/** Items table with zebra rows and automatic page breaks. Returns final Y. */
function drawItemsTable(ctx: RenderContext, top: number): number {
  const { doc, items } = ctx;
  const c = COLUMNS;

  let y = drawTableHeader(doc, top);

  items.forEach((item, index) => {
    const title = item.product_title || "Product";
    const quantity = toNumber(item.quantity);
    const price = toNumber(item.price);
    const amount = quantity * price;

    doc.font("Helvetica").fontSize(8.5);
    const titleH = doc.heightOfString(title, { width: c.description.w });
    const rowH = Math.max(24, titleH + 14);

    if (y + rowH > PAGE.contentLimit) {
      doc.addPage();
      drawContinuationHeader(ctx);
      y = drawTableHeader(doc, 46);
    }

    if (index % 2 === 1) {
      doc.rect(LEFT, y, CONTENT_W, rowH).fill(COLORS.band);
    }

    const textY = y + 8;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.soft)
      .text(String(index + 1).padStart(2, "0"), c.index.x, textY + 0.5, {
        width: c.index.w,
      });

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.ink)
      .text(title, c.description.x, textY, { width: c.description.w });

    doc
      .fillColor(COLORS.text)
      .text(String(quantity), c.quantity.x, textY, {
        width: c.quantity.w,
        align: "right",
      });

    doc
      .fillColor(COLORS.muted)
      .text(formatMoney(price), c.unitPrice.x, textY, {
        width: c.unitPrice.w,
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .fillColor(COLORS.ink)
      .text(formatMoney(amount), c.amount.x, textY, {
        width: c.amount.w,
        align: "right",
      });

    y += rowH;
    drawHLine(doc, y, LEFT, RIGHT, COLORS.hairline, 0.5);
  });

  return y;
}

/** Notes (left) and totals (right). Keeps the block together on one page. */
function drawTotals(ctx: RenderContext, top: number): number {
  const { doc, order, isPaid } = ctx;

  let y = top + 14;

  if (y + 130 > PAGE.contentLimit) {
    doc.addPage();
    y = 56;
  }

  const blockTop = y;

  // Notes
  drawLabel(doc, "Notes", LEFT, blockTop + 2);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      "Thank you for your business. Please keep this invoice for your records. " +
        "For questions about this order, contact our support team using the details above.",
      LEFT,
      blockTop + 14,
      { width: 255, lineGap: 2 }
    );

  // Totals rows
  const totalRow = (key: string, value: string) => {
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(key, TOTALS.x + 10, y + 6, { width: 100 });

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(COLORS.ink)
      .text(value, TOTALS.x, y + 6, { width: TOTALS.w - 10, align: "right" });

    y += 21;
    drawHLine(doc, y, TOTALS.x, RIGHT, COLORS.hairline, 0.5);
  };

  totalRow("Subtotal", formatMoney(order.subtotal));
  totalRow("Delivery charge", formatMoney(order.shipping_cost));

  if (toNumber(order.tax) !== 0) {
    totalRow("Tax", formatMoney(order.tax));
  }

  y += 8;

  // Grand total band
  const bandH = 32;

  doc.roundedRect(TOTALS.x, y, TOTALS.w, bandH, 5).fill(COLORS.ink);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLORS.accentSoft)
    .text(isPaid ? "TOTAL PAID" : "AMOUNT DUE", TOTALS.x + 12, y + 13, {
      width: 80,
      characterSpacing: 0.8,
      lineBreak: false,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(formatMoney(order.total), TOTALS.x, y + 10.5, {
      width: TOTALS.w - 12,
      align: "right",
      lineBreak: false,
    });

  return y + bandH;
}

/** Top accent bar, footer rule, disclaimer and page numbers on every page. */
function drawPageDecorations(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Prevent footer text from triggering an automatic new page
    doc.page.margins.bottom = 0;

    // Top bar
    doc.rect(0, 0, PAGE.width, 6).fill(COLORS.ink);
    doc.rect(0, 0, 120, 6).fill(COLORS.accent);

    // Footer
    drawHLine(doc, PAGE.footerY, LEFT, RIGHT, COLORS.line, 0.5);

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.soft)
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        LEFT,
        PAGE.footerY + 9,
        { width: 380, lineBreak: false }
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        `Page ${i - range.start + 1} of ${range.count}`,
        RIGHT - 100,
        PAGE.footerY + 9,
        { width: 100, align: "right", lineBreak: false }
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  PDF generation                                                            */
/* -------------------------------------------------------------------------- */

function generateInvoice(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const store = getStoreInfo();
    const { order } = data;

    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: {
        top: PAGE.margin,
        bottom: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      info: {
        Title: `Invoice INV-${order.id}`,
        Author: store.name,
        Subject: `Order invoice #${order.id}`,
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const ctx: RenderContext = {
        ...data,
        doc,
        store,
        invoiceNumber: buildInvoiceNumber(order),
        isPaid: (order.payment_status || "").toLowerCase().includes("paid"),
      };

      const headerBottom = drawHeader(ctx);
      const gridBottom = drawInfoGrid(ctx, headerBottom + 14);
      const tableBottom = drawItemsTable(ctx, gridBottom + 16);
      drawTotals(ctx, tableBottom);
      drawPageDecorations(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  Data access                                                               */
/* -------------------------------------------------------------------------- */

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function fetchInvoiceData(
  supabase: SupabaseClient,
  orderId: string,
  userId: string
): Promise<InvoiceData> {
  // Order (scoped to the authenticated user)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, user_id, full_name, phone, city, address_line, courier_slug, subtotal, shipping_cost, tax, total, payment_method, payment_status, status, created_at"
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle<Order>();

  if (orderError) {
    console.error("[INVOICE] Order query:", orderError);
    throw new InvoiceError(500, "Could not load order.");
  }

  if (!order) {
    throw new InvoiceError(404, "Order not found.");
  }

  // Items + shipment in parallel
  const [itemsResult, shipmentResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_title, quantity, price")
      .eq("order_id", order.id)
      .returns<OrderItem[]>(),

    supabase
      .from("shipments")
      .select("tracking_number, status")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle<Shipment>(),
  ]);

  if (itemsResult.error) {
    console.error("[INVOICE] Items query:", itemsResult.error);
    throw new InvoiceError(500, "Could not load invoice items.");
  }

  if (!itemsResult.data || itemsResult.data.length === 0) {
    throw new InvoiceError(404, "No order items found.");
  }

  // Shipment is optional: log the failure but don't block the invoice.
  if (shipmentResult.error) {
    console.error("[INVOICE] Shipment query:", shipmentResult.error);
  }

  return {
    order,
    items: itemsResult.data,
    shipment: shipmentResult.error ? null : shipmentResult.data,
  };
}

/* -------------------------------------------------------------------------- */
/*  Route handler                                                             */
/* -------------------------------------------------------------------------- */

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[1-9]\d*$/.test(id)) {
      return jsonError("Invalid order ID.", 400);
    }

    const supabase = await createClient();

    // Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Please sign in to download this invoice.", 401);
    }

    // Load data (ownership enforced in the query)
    const invoiceData = await fetchInvoiceData(supabase, id, user.id);

    // Render PDF
    const pdfBuffer = await generateInvoice(invoiceData);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceData.order.id}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof InvoiceError) {
      return jsonError(error.message, error.status);
    }

    console.error("[INVOICE] PDF generation:", error);

    return jsonError(
      "An unexpected error occurred while generating the invoice.",
      500
    );
  }
}