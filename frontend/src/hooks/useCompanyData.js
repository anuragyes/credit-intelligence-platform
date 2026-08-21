import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => api.listCompanies() });
}

export function useSearchCompanies(query) {
  return useQuery({ 
    queryKey: ['searchCompanies', query], 
    queryFn: () => api.searchCompanies(query),
    enabled: query.length > 2,
    staleTime: 60000 
  });
}

export function useCompany(id) {
  return useQuery({ queryKey: ['company', id], queryFn: () => api.getCompany(id), enabled: Boolean(id) });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function usePipelineStatus(id, { poll = false } = {}) {
  return useQuery({
    queryKey: ['pipeline-status', id],
    queryFn: () => api.getPipelineStatus(id),
    enabled: Boolean(id),
    refetchInterval: poll ? 2000 : false,
  });
}

export function useFinancials(id) {
  return useQuery({ queryKey: ['financials', id], queryFn: () => api.getFinancials(id), enabled: Boolean(id) });
}

export function useMetrics(id) {
  return useQuery({ queryKey: ['metrics', id], queryFn: () => api.getMetrics(id), enabled: Boolean(id) });
}

export function useSignals(id) {
  return useQuery({ queryKey: ['signals', id], queryFn: () => api.getSignals(id), enabled: Boolean(id) });
}

export function useDiscrepancies(id) {
  return useQuery({ queryKey: ['discrepancies', id], queryFn: () => api.getDiscrepancies(id), enabled: Boolean(id) });
}

export function useRecommendation(id, version) {
  return useQuery({
    queryKey: ['recommendation', id, version ?? 'latest'],
    queryFn: () => api.getRecommendation(id, version),
    enabled: Boolean(id),
  });
}

export function useRecommendationVersions(id) {
  return useQuery({ queryKey: ['recommendation-versions', id], queryFn: () => api.getRecommendationVersions(id), enabled: Boolean(id) });
}

export function useAgentRuns(id) {
  return useQuery({ queryKey: ['agent-runs', id], queryFn: () => api.getAgentRuns(id), enabled: Boolean(id) });
}

export function useSimulateRecommendation(companyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanAmount) => api.simulateRecommendation(companyId, loanAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation', companyId] });
      queryClient.invalidateQueries({ queryKey: ['recommendation-versions', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });
}

export function useRefreshCompany(companyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanAmount) => api.refreshCompany(companyId, loanAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['financials', companyId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', companyId] });
      queryClient.invalidateQueries({ queryKey: ['signals', companyId] });
      queryClient.invalidateQueries({ queryKey: ['discrepancies', companyId] });
      queryClient.invalidateQueries({ queryKey: ['recommendation', companyId] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs', companyId] });
    },
  });
}

export function useResolveDiscrepancy(companyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ discrepancyId, resolvedValue, resolutionStrategy, note }) =>
      api.resolveDiscrepancy(discrepancyId, { resolvedValue, resolutionStrategy, note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discrepancies', companyId] }),
  });
}
