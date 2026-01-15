/**
 * @typedef {'pdf'|'chart'|'hubspot'|'email'|'document'} SourceType
 * @typedef {'Vertex AI'|'HubSpot'|'Google Drive'|'Local File'} SourceBadge
 *
 * @typedef {Object} HistoryItem
 * @property {string} id
 * @property {SourceType} type
 * @property {string} label
 * @property {SourceBadge} source
 * @property {string} content
 * @property {string|Date} timestamp
 * @property {string} [preview]
 *
 * @typedef {Object} MessageSource
 * @property {string} itemId
 * @property {string} label
 */

// This file contains JSDoc typedefs converted from the original TypeScript types.
// No runtime exports are necessary.
export const __TYPES__ = true
