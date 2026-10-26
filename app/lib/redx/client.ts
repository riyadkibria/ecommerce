
import "server-only";

const REDX_BASE_URL = process.env.REDX_BASE_URL;
const REDX_ACCESS_TOKEN = process.env.REDX_ACCESS_TOKEN;

export async function redxFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!REDX_BASE_URL || !REDX_ACCESS_TOKEN) {
    throw new Error("Missing REDX_BASE_URL or REDX_ACCESS_TOKEN.");
  }

  const token = REDX_ACCESS_TOKEN.startsWith("Bearer ")
    ? REDX_ACCESS_TOKEN
    : `Bearer ${REDX_ACCESS_TOKEN}`;

  const response = await fetch(
    `${REDX_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "API-ACCESS-TOKEN": token,
        ...options.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `REDX HTTP ${response.status}: ${body.slice(0, 500)}`
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("REDX returned an invalid JSON response.");
  }
}
