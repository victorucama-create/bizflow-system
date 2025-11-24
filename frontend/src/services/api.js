import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const api = {
  // Auth
  login: (credentials) => axios.post(`${API_BASE_URL}/api/auth/login`, credentials),
  register: (userData) => axios.post(`${API_BASE_URL}/api/auth/register`, userData),

  // Products
  getProducts: () => axios.get(`${API_BASE_URL}/api/products`),
  createProduct: (productData) => axios.post(`${API_BASE_URL}/api/products`, productData),
  updateProduct: (id, productData) => axios.put(`${API_BASE_URL}/api/products/${id}`, productData),
  deleteProduct: (id) => axios.delete(`${API_BASE_URL}/api/products/${id}`),

  // Sales
  getSales: () => axios.get(`${API_BASE_URL}/api/sales`),
  createSale: (saleData) => axios.post(`${API_BASE_URL}/api/sales`, saleData),

  // Customers
  getCustomers: () => axios.get(`${API_BASE_URL}/api/customers`),
  createCustomer: (customerData) => axios.post(`${API_BASE_URL}/api/customers`, customerData),

  // Dashboard
  getDashboardData: () => axios.get(`${API_BASE_URL}/api/dashboard`)
};

export default api;
