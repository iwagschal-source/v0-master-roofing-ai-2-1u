/**
 * API Module - Main Export
 * Single import point for all API functionality
 */

export { apiClient, APIError } from './endpoints';
export { api, API_CONFIG } from './client';

// For convenience, also export the main client as default
export { apiClient as default } from './endpoints';