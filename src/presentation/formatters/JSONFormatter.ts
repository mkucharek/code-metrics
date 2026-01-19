/**
 * JSON Report Formatter
 * Pure functions to format metrics data as JSON
 */

import type {
  OrganizationMetrics,
  EngineerMetrics,
  EngineerDetailReport,
} from '../../domain/models';

/**
 * Format organization metrics as JSON string
 */
export function formatOrganizationJSON(metrics: OrganizationMetrics): string {
  return JSON.stringify(metrics, null, 2);
}

/**
 * Format engineer metrics as JSON string
 */
export function formatEngineerJSON(engineer: EngineerMetrics): string {
  return JSON.stringify(engineer, null, 2);
}

/**
 * Format multiple engineers as JSON array
 */
export function formatEngineersJSON(engineers: EngineerMetrics[]): string {
  return JSON.stringify(engineers, null, 2);
}

/**
 * Format engineer detail report as JSON string
 */
export function formatEngineerDetailJSON(report: EngineerDetailReport): string {
  return JSON.stringify(report, null, 2);
}
