// src/pages/service/userService.js
import { apiFetch } from '../../lib/api'; // Important: named import

export const userService = {
  // Get current logged-in user profile
  getMe: async () => {
    return await apiFetch('/user/me');
  },

  // Update user profile details
  updateMe: async (payload) => {
    return await apiFetch('/user/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
};
