import { apiClient } from "./client";

export type TaxonomySkill = {
  name: string | null;
  category: string | null;
  synonyms: string | null;
  group?: string | null;
};

export type TaxonomyItem = {
  name: string;
};

export const fetchTaxonomySkills = async (limit = 200) => {
  const response = await apiClient.get<TaxonomySkill[]>(
    `/api/taxonomy/skills?limit=${limit}`,
  );
  return response.data;
};

export const fetchTaxonomyDegrees = async (limit = 200) => {
  const response = await apiClient.get<TaxonomyItem[]>(
    `/api/taxonomy/degrees?limit=${limit}`,
  );
  return response.data;
};

export const fetchTaxonomyUniversities = async (limit = 200) => {
  const response = await apiClient.get<TaxonomyItem[]>(
    `/api/taxonomy/universities?limit=${limit}`,
  );
  return response.data;
};

export const fetchTaxonomyCertifications = async (limit = 200) => {
  const response = await apiClient.get<TaxonomyItem[]>(
    `/api/taxonomy/certifications?limit=${limit}`,
  );
  return response.data;
};
