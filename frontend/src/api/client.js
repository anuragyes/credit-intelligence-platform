import { useAuthStore } from '../store/authStore.js';

const BASE_URL = '/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    const message = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  signup: (name, email, password) => request('/auth/signup', { method: 'POST', body: { name, email, password }, auth: false }),
  listCompanies: () => request('/companies'),
  searchCompanies: (query) => request(`/companies/search?q=${encodeURIComponent(query)}`),
  createCompany: (payload) => request('/companies', { method: 'POST', body: payload }),
  getCompany: (id) => request(`/companies/${id}`),
  deleteCompany: (id) => request(`/companies/${id}`, { method: 'DELETE' }),
  getPipelineStatus: (id) => request(`/companies/${id}/pipeline-status`),
  refreshCompany: (id, loanAmount) => request(`/companies/${id}/refresh`, { method: 'POST', body: { loanAmount } }),
  simulateRecommendation: (id, loanAmount) => request(`/companies/${id}/recommendation/simulate`, { method: 'POST', body: { loanAmount } }),
  getFinancials: (id) => request(`/companies/${id}/financials`),
  getMetrics: (id) => request(`/companies/${id}/metrics`),
  getSignals: (id) => request(`/companies/${id}/signals`),
  getDiscrepancies: (id) => request(`/companies/${id}/discrepancies`),
  resolveDiscrepancy: (discrepancyId, payload) => request(`/discrepancies/${discrepancyId}/resolve`, { method: 'PATCH', body: payload }),
  getRecommendation: (id, version) => request(`/companies/${id}/recommendation${version ? `?version=${version}` : ''}`),
  getRecommendationVersions: (id) => request(`/companies/${id}/recommendation/versions`),
  getEvidence: (type, id) => request(`/evidence/${type}/${id}/source`),
  getAgentRuns: (companyId) => request(`/agent-runs/${companyId}`),
};
