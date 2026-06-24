import { apiFetch } from '../lib/api';

export const searchService = {
  searchProviders: async ({ service, lat, lng, radius = 5 }) => {
    const params = new URLSearchParams({
      service,
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
    });
    return apiFetch(`/api/providers/search?${params.toString()}`);
  },
};
