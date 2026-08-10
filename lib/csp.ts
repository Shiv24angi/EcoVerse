/**
 * Centralized Content-Security-Policy builder.
 *
 * `middleware.ts` and `next.config.ts` both emit a CSP header, so the policy
 * is defined once here to keep them in sync. A reporting endpoint is added
 * only when CSP_REPORT_URI is configured (Issue #457) — without a configured
 * collector, emitting an empty/placeholder report-uri would only create noise.
 *
 * @returns the CSP header value as a string.
 */
export function getContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const reportUri = process.env.CSP_REPORT_URI;
  if (reportUri) {
    // Modern browsers use report-to (named endpoint group); report-uri is the
    // legacy fallback. Both point at the same configured collector.
    directives.push('report-to csp-endpoint');
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join('; ');
}

/**
 * The Reporting-Endpoints header value defining the `csp-endpoint` group
 * referenced by getContentSecurityPolicy() when CSP_REPORT_URI is set.
 * Returns null when no collector is configured.
 */
export function getReportingEndpoints(): string | null {
  const reportUri = process.env.CSP_REPORT_URI;
  if (!reportUri) return null;
  return `csp-endpoint="${reportUri}"`;
}
