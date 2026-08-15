// CSP violation report collector.
// Browsers POST violation reports here when the Content-Security-Policy
// `report-uri` directive points at /api/csp-report. The endpoint accepts the
// report and returns 204 No Content; it does not expose any data.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Log violations server-side for review without dumping full bodies.
    const report = Array.isArray(body) && body.length > 0 ? body[0] : body;
    const blockedUri =
      (report as { 'blocked-uri'?: string } | null)?.['blocked-uri'] ??
      'unknown';
    const violatedDirective =
      (report as { 'violated-directive'?: string } | null)?.[
        'violated-directive'
      ] ?? 'unknown';
    console.warn('CSP violation:', { blockedUri, violatedDirective });
  } catch {
    // Malformed reports are ignored; still respond 204.
  }

  return new Response(null, { status: 204 });
}
