import api from './api';

export interface ParsingStats {
  total_resumes: number;
  successfully_parsed: number;
  failed_parsing: number;
  success_rate: number;
  average_parsing_time: number;
  average_confidence_score: number;
}

export interface SkillDistribution {
  skill_name: string;
  count: number;
}

export interface AccuracyOverview {
  correction_count: number;
  field_accuracy_percentage: number;
  common_error_patterns: string[];
}

export interface Metrics {
  total_candidates: number;
  parsed_candidates: number;
  validated_candidates: number;
  reviewed_candidates: number;
  matched_candidates: number;
  shortlisted_candidates: number;
}

export interface UploadTrend {
  date: string;
  count: number;
  success_count: number;
  failure_count: number;
}

export interface RecruiterActivity {
  resumes_reviewed: number;
  candidates_shortlisted: number;
  candidates_rejected: number;
  pending_reviews: number;
}

export const analyticsService = {
  // Get parsing statistics
  async getParsingStats(): Promise<ParsingStats> {
    const response = await api.get('/analytics/parsing-stats');
    return response.data;
  },

  // Get skill distribution
  async getSkillDistribution(): Promise<SkillDistribution[]> {
    const response = await api.get('/analytics/skill-distribution');
    return response.data;
  },

  // Get accuracy overview
  async getAccuracyOverview(): Promise<AccuracyOverview> {
    const response = await api.get('/accuracy/overview');
    return response.data;
  },

  // Get metrics
  async getMetrics(): Promise<Metrics> {
    const response = await api.get('/analytics/metrics');
    return response.data;
  },

  // Get upload trends with date range
  async getUploadTrends(dateRange: string = '30'): Promise<UploadTrend[]> {
    const response = await api.get(`/analytics/upload-trends?range=${dateRange}`);
    return response.data;
  },

  // Get recruiter activity
  async getRecruiterActivity(): Promise<RecruiterActivity> {
    const response = await api.get('/analytics/recruiter-activity');
    return response.data;
  },

  // Get client performance analytics
  async getClientPerformance(from?: string, to?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get(`/analytics/client-performance?${params.toString()}`);
    return response.data;
  },

  // Get placements analytics
  async getPlacements(from?: string, to?: string, clientId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (clientId) params.append('clientId', clientId);
    const response = await api.get(`/analytics/placements?${params.toString()}`);
    return response.data;
  },

  // Get revenue analytics
  async getRevenue(from?: string, to?: string, groupBy?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (groupBy) params.append('groupBy', groupBy);
    const response = await api.get(`/analytics/revenue?${params.toString()}`);
    return response.data;
  },

  // Export analytics as CSV
  async exportAnalyticsCSV(dateRange: string): Promise<Blob> {
    const response = await api.get(`/analytics/export/csv?range=${dateRange}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Export analytics as PDF
  async exportAnalyticsPDF(dateRange: string): Promise<Blob> {
    const response = await api.get(`/analytics/export/pdf?range=${dateRange}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get team closures analytics
  async getTeamClosures(from?: string, to?: string, teamLeadId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (teamLeadId) params.append('teamLeadId', teamLeadId);
    const response = await api.get(`/analytics/team-closures?${params.toString()}`);
    return response.data;
  },

  // Get submission success rate analytics
  async getSubmissionSuccessRate(from?: string, to?: string, teamLeadId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (teamLeadId) params.append('teamLeadId', teamLeadId);
    const response = await api.get(`/analytics/submission-success-rate?${params.toString()}`);
    return response.data;
  },

  // Get new clients acquired analytics (BDM pipeline)
  async getNewClientsAcquired(from?: string, to?: string, bdmId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (bdmId) params.append('bdmId', bdmId);
    const response = await api.get(`/analytics/new-clients-acquired?${params.toString()}`);
    return response.data;
  },

  // Get revenue generated analytics (BDM pipeline)
  async getRevenueGenerated(from?: string, to?: string, bdmId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (bdmId) params.append('bdmId', bdmId);
    const response = await api.get(`/analytics/revenue-generated?${params.toString()}`);
    return response.data;
  },

  // Get open opportunities analytics (BDM pipeline funnel)
  async getOpenOpportunities(from?: string, to?: string, bdmId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (bdmId) params.append('bdmId', bdmId);
    const response = await api.get(`/analytics/open-opportunities?${params.toString()}`);
    return response.data;
  },
};
