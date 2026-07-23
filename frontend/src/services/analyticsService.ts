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
};
