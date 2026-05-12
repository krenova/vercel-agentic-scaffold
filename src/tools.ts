import { tool } from 'ai';
import { z } from 'zod';

const PROPERTIES: Record<string, { name: string; price: number; bedrooms: number; location: string; type: string }> = {
  P001: { name: 'Sunrise Condo', price: 1_200_000, bedrooms: 3, location: 'Bukit Timah', type: 'Condo' },
  P002: { name: 'Greenview HDB', price: 580_000, bedrooms: 4, location: 'Tampines', type: 'HDB' },
  P003: { name: 'The Pinnacle', price: 2_800_000, bedrooms: 3, location: 'Orchard', type: 'Condo' },
  P004: { name: 'Lakeside Terrace', price: 3_500_000, bedrooms: 5, location: 'Jurong West', type: 'Landed' },
};

// Mock availability — in a real system this would hit a calendar/CRM
const UNAVAILABLE_SLOTS: Record<string, string[]> = {
  P001: ['2026-05-17', '2026-05-18'],
  P003: ['2026-05-15'],
};

export const lookupProperty = tool({
  description: 'Look up details for a property by its ID (e.g. P001). Returns name, price, bedrooms, location, and property type.',
  parameters: z.object({
    id: z.string().describe('The property ID, e.g. P001'),
  }),
  execute: async ({ id }) => {
    const property = PROPERTIES[id.toUpperCase()];
    if (!property) {
      return { found: false, message: `No property found with ID ${id}.` };
    }
    return {
      found: true,
      id: id.toUpperCase(),
      ...property,
      priceFormatted: `SGD $${property.price.toLocaleString()}`,
    };
  },
});

export const checkAvailability = tool({
  description: 'Check if a property is available for viewing on a given date.',
  parameters: z.object({
    id: z.string().describe('The property ID, e.g. P001'),
    date: z.string().describe('The date to check in YYYY-MM-DD format'),
  }),
  execute: async ({ id, date }) => {
    const property = PROPERTIES[id.toUpperCase()];
    if (!property) {
      return { found: false, message: `No property found with ID ${id}.` };
    }
    const blocked = UNAVAILABLE_SLOTS[id.toUpperCase()] ?? [];
    const available = !blocked.includes(date);
    return {
      found: true,
      id: id.toUpperCase(),
      propertyName: property.name,
      date,
      available,
      message: available
        ? `${property.name} is available for viewing on ${date}.`
        : `${property.name} is not available on ${date}. Please suggest another date.`,
    };
  },
});
