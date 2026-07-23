import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClientStore } from "../store/useClientStore";
import { useCommunicationStore } from "../store/useCommunicationStore";
import { useAuthStore } from "../store/useAuthStore";
import { usePermissionStore } from "../store/usePermissionStore";
import toast from "react-hot-toast";
import { Building2, ArrowLeft, Phone, Mail, Users, Plus, Trash2, Edit2, Archive, MessageSquare, Calendar } from "lucide-react";
import EditableField from "../components/candidate-detail/EditableField";
import PermissionGuard from "../components/common/PermissionGuard";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission } = usePermissionStore();
  const { currentClient, contacts, isLoading, fetchClient, fetchClientContacts, updateClient, createContact, updateContact, deleteContact, archiveClient } = useClientStore();
  const { communications, createCommunication, getCommunications } = useCommunicationStore();
  
  const [activeTab, setActiveTab] = useState<"details" | "contacts" | "communications">("details");
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [showCommunicationForm, setShowCommunicationForm] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    contact_name: "",
    designation: "",
    email: "",
    phone: "",
    is_primary: false,
  });

  // Communication form state
  const [communicationForm, setCommunicationForm] = useState({
    contact_id: "",
    communication_type: "call",
    subject: "",
    notes: "",
    follow_up_date: "",
  });

  useEffect(() => {
    if (id) {
      fetchClient(id).then(() => {
        // Check ownership after fetching
        const canViewAll = hasPermission("clients", "view");
        if (currentClient && !canViewAll && currentClient.owner_user_id !== user?.id) {
          toast.error("You can only view your own clients");
          navigate("/");
        }
      });
      fetchClientContacts(id);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (id && activeTab === "communications") {
      getCommunications(id);
    }
  }, [id, activeTab]);

  const handleArchive = async () => {
    if (!currentClient) return;
    if (!confirm(`Are you sure you want to archive ${currentClient.company_name}?`)) return;

    try {
      await archiveClient(currentClient.id);
      toast.success("Client archived successfully");
      navigate("/admin/clients");
    } catch (error) {
      // Error already handled by store
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingContact) {
        await updateContact(editingContact, contactForm);
        toast.success("Contact updated successfully");
      } else {
        await createContact(id, contactForm);
        toast.success("Contact created successfully");
      }
      setShowContactForm(false);
      setEditingContact(null);
      setContactForm({ contact_name: "", designation: "", email: "", phone: "", is_primary: false });
      fetchClientContacts(id);
    } catch (error) {
      // Error already handled by store
    }
  };

  const handleContactEdit = (contact: any) => {
    setEditingContact(contact.id);
    setContactForm({
      contact_name: contact.contact_name,
      designation: contact.designation || "",
      email: contact.email || "",
      phone: contact.phone || "",
      is_primary: contact.is_primary,
    });
    setShowContactForm(true);
  };

  const handleContactDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact(contactId);
      toast.success("Contact deleted successfully");
      if (id) fetchClientContacts(id);
    } catch (error) {
      // Error already handled by store
    }
  };

  const handleCommunicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await createCommunication({
        client_id: id,
        contact_id: communicationForm.contact_id || undefined,
        communication_type: communicationForm.communication_type,
        subject: communicationForm.subject,
        notes: communicationForm.notes,
        follow_up_date: communicationForm.follow_up_date || undefined,
      });
      setShowCommunicationForm(false);
      setCommunicationForm({
        contact_id: "",
        communication_type: "call",
        subject: "",
        notes: "",
        follow_up_date: "",
      });
      if (id) getCommunications(id);
    } catch (error) {
      // Error already handled by store
    }
  };

  if (isLoading || !currentClient) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/admin/clients")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </button>
          <PermissionGuard module="clients" action="delete" mode="hide">
            <button
              onClick={handleArchive}
              disabled={currentClient.is_archived}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="w-4 h-4" />
              {currentClient.is_archived ? "Archived" : "Archive Client"}
            </button>
          </PermissionGuard>
        </div>

        {/* Client Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{currentClient.company_name}</h1>
                {currentClient.is_archived && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    Archived
                  </span>
                )}
              </div>
              {currentClient.industry && (
                <p className="text-gray-600 mt-1">{currentClient.industry}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "details"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "contacts"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setActiveTab("communications")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "communications"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Communications ({communications.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "details" && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Client Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EditableField
                label="Company Name"
                value={currentClient.company_name}
                onSave={(value) => updateClient(currentClient.id, { company_name: value })}
              />
              <EditableField
                label="Industry"
                value={currentClient.industry || ""}
                onSave={(value) => updateClient(currentClient.id, { industry: value })}
              />
              <EditableField
                label="Address"
                value={currentClient.address || ""}
                onSave={(value) => updateClient(currentClient.id, { address: value })}
              />
              <EditableField
                label="City"
                value={currentClient.city || ""}
                onSave={(value) => updateClient(currentClient.id, { city: value })}
              />
              <EditableField
                label="Country"
                value={currentClient.country || ""}
                onSave={(value) => updateClient(currentClient.id, { country: value })}
              />
            </div>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Contacts</h2>
              <PermissionGuard module="clients" action="edit" mode="hide">
                <button
                  onClick={() => {
                    setEditingContact(null);
                    setContactForm({ contact_name: "", designation: "", email: "", phone: "", is_primary: false });
                    setShowContactForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </PermissionGuard>
            </div>

            {/* Contact Form */}
            {showContactForm && (
              <form onSubmit={handleContactSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.contact_name}
                      onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={contactForm.designation}
                      onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={contactForm.is_primary}
                      onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_primary" className="text-sm text-gray-700">Primary Contact</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactForm(false);
                      setEditingContact(null);
                      setContactForm({ contact_name: "", designation: "", email: "", phone: "", is_primary: false });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingContact ? "Update Contact" : "Add Contact"}
                  </button>
                </div>
              </form>
            )}

            {/* Contacts List */}
            {contacts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
                <p className="text-gray-600 mb-4">Add contacts to this client to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{contact.contact_name}</h4>
                          {contact.is_primary && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.designation && (
                          <p className="text-sm text-gray-600">{contact.designation}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          {contact.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionGuard module="clients" action="edit" mode="hide">
                        <>
                          <button
                            onClick={() => handleContactEdit(contact)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleContactDelete(contact.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      </PermissionGuard>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "communications" && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Communications</h2>
              <PermissionGuard module="communications" action="create" mode="hide">
                <button
                  onClick={() => {
                    setCommunicationForm({
                      contact_id: "",
                      communication_type: "call",
                      subject: "",
                      notes: "",
                      follow_up_date: "",
                    });
                    setShowCommunicationForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </PermissionGuard>
            </div>

            {/* Communication Form */}
            {showCommunicationForm && (
              <form onSubmit={handleCommunicationSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact (Optional)</label>
                    <select
                      value={communicationForm.contact_id}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, contact_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a contact</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.contact_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      required
                      value={communicationForm.communication_type}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, communication_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={communicationForm.subject}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes *</label>
                    <textarea
                      required
                      rows={3}
                      value={communicationForm.notes}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date (Optional)</label>
                    <input
                      type="date"
                      value={communicationForm.follow_up_date}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, follow_up_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommunicationForm(false);
                      setCommunicationForm({
                        contact_id: "",
                        communication_type: "call",
                        subject: "",
                        notes: "",
                        follow_up_date: "",
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Log Communication
                  </button>
                </div>
              </form>
            )}

            {/* Communications Timeline */}
            {communications.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No communications yet</h3>
                <p className="text-gray-600 mb-4">Log your first communication with this client</p>
              </div>
            ) : (
              <div className="space-y-4">
                {communications.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        comm.communication_type === 'call' ? 'bg-blue-100' :
                        comm.communication_type === 'email' ? 'bg-green-100' :
                        comm.communication_type === 'meeting' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {comm.communication_type === 'call' ? <Phone className="w-5 h-5 text-blue-600" /> :
                         comm.communication_type === 'email' ? <Mail className="w-5 h-5 text-green-600" /> :
                         comm.communication_type === 'meeting' ? <Users className="w-5 h-5 text-purple-600" /> :
                         <MessageSquare className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="w-px bg-gray-300 flex-1 mt-2"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{comm.subject}</h4>
                          <p className="text-sm text-gray-600 mt-1">{comm.notes}</p>
                          {comm.contact_first_name && (
                            <p className="text-sm text-gray-500 mt-1">
                              Contact: {comm.contact_first_name} {comm.contact_last_name}
                            </p>
                          )}
                          {comm.follow_up_date && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-orange-600">
                              <Calendar className="w-3 h-3" />
                              Follow-up: {new Date(comm.follow_up_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(comm.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {comm.communication_type}
                          </p>
                          {comm.logged_by_name && (
                            <p className="text-xs text-gray-400">
                              by {comm.logged_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}