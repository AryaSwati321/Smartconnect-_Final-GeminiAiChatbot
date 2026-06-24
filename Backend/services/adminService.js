import api from './api'; // your axios instance

export const adminService = {
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get all providers
  getAllProviders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/admin/providers?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching providers:', error);
      throw error;
    }
  },

  // Update provider status
  updateProviderStatus: async (providerId, status) => {
    try {
      const response = await api.put(`/admin/providers/${providerId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating provider status:', error);
      throw error;
    }
  },

  // Get provider by ID
  getProviderById: async (providerId) => {
    try {
      const response = await api.get(`/admin/providers/${providerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching provider:', error);
      throw error;
    }
  }
};