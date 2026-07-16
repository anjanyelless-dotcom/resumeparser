import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

interface Communication {
  id: string;
  client_id: string;
  contact_id?: string;
  communication_type: string;
  subject: string;
  notes: string;
  follow_up_date?: string;
  logged_by: string;
  created_at: string;
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  logged_by_name?: string;
  logged_by_last_name?: string;
}

interface CommunicationState {
  communications: Communication[];
  followUps: Communication[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface CommunicationActions {
  createCommunication: (data: {
    client_id: string;
    contact_id?: string;
    communication_type: string;
    subject: string;
    notes: string;
    follow_up_date?: string;
  }) => Promise<Communication>;
  getCommunications: (clientId?: string, from?: string, to?: string) => Promise<void>;
  getFollowUpsDue: () => Promise<void>;
  clearError: () => void;
}

export const useCommunicationStore = create<CommunicationState & CommunicationActions>(
  (set, get) => ({
    // Initial state
    communications: [],
    followUps: [],
    isLoading: false,
    isSubmitting: false,
    error: null,

    // Actions
    createCommunication: async (data) => {
      set({ isSubmitting: true, error: null });
      try {
        const response = await api.post('/api/communications', data);
        const communication = response.data.communication;
        
        set({ isSubmitting: false });
        toast.success('Communication logged successfully!');
        
        // Refresh communications
        await get().getCommunications(data.client_id);
        
        return communication;
      } catch (error: any) {
        set({ isSubmitting: false });
        toast.error(error.response?.data?.message || 'Failed to log communication');
        throw error;
      }
    },

    getCommunications: async (clientId?: string, from?: string, to?: string) => {
      set({ isLoading: true, error: null });
      try {
        const params: any = {};
        if (clientId) params.clientId = clientId;
        if (from) params.from = from;
        if (to) params.to = to;

        const response = await api.get('/api/communications', { params });
        
        set({
          communications: response.data.communications || [],
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch communications' });
        toast.error(error.response?.data?.message || 'Failed to fetch communications');
      }
    },

    getFollowUpsDue: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/api/communications/follow-ups-due');
        
        set({
          followUps: response.data.followUps || [],
          isLoading: false
        });
      } catch (error: any) {
        set({ isLoading: false, error: 'Failed to fetch follow-ups' });
        toast.error(error.response?.data?.message || 'Failed to fetch follow-ups');
      }
    },

    clearError: () => {
      set({ error: null });
    },
  })
);