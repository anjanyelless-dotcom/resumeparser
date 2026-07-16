import { create } from "zustand";
import { api } from "../services/api";
import toast from "react-hot-toast";

export interface Client {
  id: string;
  company_name: string;
  industry?: string;
  address?: string;
  city?: string;
  country?: string;
  owner_user_id?: string;
  pipeline_stage?: string;
  source?: string;
  expected_deal_value?: number;
  is_archived: boolean;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
}

interface ClientContact {
  id: string;
  client_id: string;
  contact_name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
}

interface ClientState {
  clients: Client[];
  currentClient: Client | null;
  contacts: ClientContact[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
}

interface ClientActions {
  fetchClients: (params?: { page?: number; limit?: number; search?: string; industry?: string; city?: string; country?: string; is_archived?: boolean }) => Promise<void>;
  fetchClient: (id: string) => Promise<void>;
  createClient: (clientData: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<Client>;
  archiveClient: (id: string) => Promise<void>;
  fetchClientContacts: (clientId: string) => Promise<void>;
  createContact: (clientId: string, contactData: Partial<ClientContact>) => Promise<ClientContact>;
  updateContact: (id: string, contactData: Partial<ClientContact>) => Promise<ClientContact>;
  deleteContact: (id: string) => Promise<void>;
  setCurrentClient: (client: Client | null) => void;
  clearError: () => void;
}

export const useClientStore = create<ClientState & ClientActions>((set) => ({
  // Initial state
  clients: [],
  currentClient: null,
  contacts: [],
  isLoading: false,
  error: null,
  pagination: null,

  // Actions
  fetchClients: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.industry) queryParams.append('industry', params.industry);
      if (params.city) queryParams.append('city', params.city);
      if (params.country) queryParams.append('country', params.country);
      if (params.is_archived !== undefined) queryParams.append('is_archived', params.is_archived.toString());

      const response = await api.get(`/clients?${queryParams.toString()}`);
      set({ 
        clients: response.data.clients || [], 
        pagination: response.data.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch clients";
      set({ error: errorMessage, isLoading: false, clients: [] });
      toast.error(errorMessage);
    }
  },

  fetchClient: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/clients/${id}`);
      set({ currentClient: response.data.client, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch client";
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
    }
  },

  createClient: async (clientData: Partial<Client>) => {
    try {
      const response = await api.post("/api/clients", clientData);
      const newClient = response.data.client;

      set((state) => ({
        clients: [...state.clients, newClient],
        currentClient: newClient,
      }));

      toast.success("Client created successfully");
      return newClient;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to create client";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateClient: async (id: string, clientData: Partial<Client>) => {
    try {
      const response = await api.put(`/clients/${id}`, clientData);
      const updatedClient = response.data.client;

      set((state) => ({
        clients: state.clients.map((client) => (client.id === id ? updatedClient : client)),
        currentClient: updatedClient,
      }));

      toast.success("Client updated successfully");
      return updatedClient;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update client";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  archiveClient: async (id: string) => {
    try {
      const response = await api.patch(`/clients/${id}/archive`);
      const archivedClient = response.data.client;

      set((state) => ({
        clients: state.clients.map((client) => (client.id === id ? archivedClient : client)),
        currentClient: state.currentClient?.id === id ? archivedClient : state.currentClient,
      }));

      toast.success("Client archived successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to archive client";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchClientContacts: async (clientId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/clients/${clientId}/contacts`);
      set({ contacts: response.data.contacts || [], isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to fetch contacts";
      set({ error: errorMessage, isLoading: false, contacts: [] });
      toast.error(errorMessage);
    }
  },

  createContact: async (clientId: string, contactData: Partial<ClientContact>) => {
    try {
      const response = await api.post(`/clients/${clientId}/contacts`, contactData);
      const newContact = response.data.contact;

      set((state) => ({
        contacts: [...state.contacts, newContact],
      }));

      toast.success("Contact created successfully");
      return newContact;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to create contact";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateContact: async (id: string, contactData: Partial<ClientContact>) => {
    try {
      const response = await api.put(`/contacts/${id}`, contactData);
      const updatedContact = response.data.contact;

      set((state) => ({
        contacts: state.contacts.map((contact) => (contact.id === id ? updatedContact : contact)),
      }));

      toast.success("Contact updated successfully");
      return updatedContact;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update contact";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteContact: async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);

      set((state) => ({
        contacts: state.contacts.filter((contact) => contact.id !== id),
      }));

      toast.success("Contact deleted successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to delete contact";
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  setCurrentClient: (client: Client | null) => {
    set({ currentClient: client });
  },

  clearError: () => {
    set({ error: null });
  },
}));