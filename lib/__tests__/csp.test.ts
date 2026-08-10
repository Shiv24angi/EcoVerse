/**
 * @jest-environment node
 */

import { getContentSecurityPolicy, getReportingEndpoints } from '../csp';

const OriginalReportUri = process.env.CSP_REPORT_URI;

describe('lib/csp (#457 — CSP report-uri directive)', () => {
  afterEach(() => {
    if (OriginalReportUri === undefined) {
      delete process.env.CSP_REPORT_URI;
    } else {
      process.env.CSP_REPORT_URI = OriginalReportUri;
    }
  });

  it('emits the base policy with all existing directives', () => {
    delete process.env.CSP_REPORT_URI;
    const csp = getContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('does NOT include report-uri/report-to when no collector is configured', () => {
    delete process.env.CSP_REPORT_URI;
    const csp = getContentSecurityPolicy();
    expect(csp).not.toContain('report-uri');
    expect(csp).not.toContain('report-to');
    expect(getReportingEndpoints()).toBeNull();
  });

  it('adds report-uri and report-to directives when CSP_REPORT_URI is set', () => {
    process.env.CSP_REPORT_URI = 'https://csp.example.com/report';
    const csp = getContentSecurityPolicy();
    expect(csp).toContain('report-to csp-endpoint');
    expect(csp).toContain('report-uri https://csp.example.com/report');
  });

  it('exposes the matching Reporting-Endpoints header value', () => {
    process.env.CSP_REPORT_URI = 'https://csp.example.com/report';
    expect(getReportingEndpoints()).toBe(
      'csp-endpoint="https://csp.example.com/report"'
    );
  });

  it('keeps the base directives intact when reporting is enabled', () => {
    process.env.CSP_REPORT_URI = 'https://csp.example.com/report';
    const csp = getContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });
});
