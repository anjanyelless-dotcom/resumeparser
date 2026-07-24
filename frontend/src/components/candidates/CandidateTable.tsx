import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreVertical, User, Eye, Edit, Download, Trash2, ArrowUpDown, Building, Briefcase, CheckSquare, Square } from 'lucide-react';
import { calculateTotalExperience } from '../../utils/experienceCalculator';
import { useCandidateStore } from '../../store/useCandidateStore';
import toast from 'react-hot-toast';
import PermissionGuard from '../common/PermissionGuard';

type FlexibleCandidate = {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  created_at: string;
  skills?: Array<{
    id: string;
    skill_name?: string;
    name?: string;
  }>;
  work_history?: Array<{
    id: string;
    job_title?: string;
    company_name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
  }>;
  work_experience?: Array<{
    id: string;
    job_title?: string;
    company_name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
  }>;
  parsing_status?: {
    confidence_score?: number;
  };
  total_experience_years?: number;
  total_years_exp?: any;
  years_experience?: number;
  status?: string;
};

type SortField = 'name' | 'score' | 'date';
type SortDirection = 'asc' | 'desc';

interface CandidateTableProps {
  candidates: FlexibleCandidate[];
  selectedCandidates?: Set<string>;
  onSelectCandidate?: (id: string) => void;
}

export default function CandidateTable({ candidates, selectedCandidates, onSelectCandidate }: CandidateTableProps) {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const { deleteCandidate } = useCandidateStore();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = (a.full_name || '').localeCompare(b.full_name || '');
        break;
      case 'score':
        const aScore = a.parsing_status?.confidence_score || 0;
        const bScore = b.parsing_status?.confidence_score || 0;
        comparison = aScore - bScore;
        break;
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getCurrentCompany = (candidate: FlexibleCandidate): string => {
    const workExperience = candidate.work_history || candidate.work_experience || [];
    return workExperience.find((e: any) => e.is_current)?.company_name || 'N/A';
  };

  const getCurrentJobTitle = (candidate: FlexibleCandidate): string => {
    const workExperience = candidate.work_history || candidate.work_experience || [];
    return workExperience.find((e: any) => e.is_current)?.job_title || 'N/A';
  };

  const getExperience = (candidate: FlexibleCandidate): number => {
    const workExperience = candidate.work_history || candidate.work_experience || [];
    const { total } = calculateTotalExperience(workExperience);
    const totalExp = total.total_records > 0 && total.formatted_string !== '0 Days'
      ? total.years
      : candidate.total_experience_years || candidate.years_experience || 0;
    return totalExp;
  };

  const getParseScore = (candidate: FlexibleCandidate): number => {
    return candidate.parsing_status?.confidence_score 
      ? Math.round(candidate.parsing_status.confidence_score * 100) 
      : 93;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (score >= 70) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getStatus = (candidate: FlexibleCandidate): string => {
    const score = getParseScore(candidate);
    if (candidate.status === 'rejected') return 'Rejected';
    if (candidate.status === 'shortlisted') return 'Shortlisted';
    return score >= 80 ? 'High Confidence' : 'Needs Review';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'High Confidence':
        return 'bg-emerald-100 text-emerald-700';
      case 'Needs Review':
        return 'bg-amber-100 text-amber-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      case 'Shortlisted':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              {onSelectCandidate && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[50px]">
                  <button
                    onClick={() => {
                      if (selectedCandidates?.size === candidates.length) {
                        // Deselect all
                        selectedCandidates.clear();
                      } else {
                        // Select all
                        candidates.forEach(c => selectedCandidates?.add(c.id));
                      }
                      // Force re-render by creating new Set
                      onSelectCandidate && candidates[0]?.id && onSelectCandidate('');
                    }}
                    className="flex items-center justify-center"
                  >
                    {selectedCandidates?.size === candidates.length ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
              )}
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[280px]"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Candidate
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">
                Skills
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]"
                onClick={() => handleSort('score')}
              >
                <div className="flex items-center gap-1">
                  Parse Score
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date Added
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedCandidates.map((candidate) => {
              const fullName = candidate.full_name || candidate.name || 'Unnamed';
              const initials = getInitials(fullName);
              const skills = candidate.skills || [];
              const displaySkills = skills.slice(0, 2);
              const remainingSkills = skills.length > 2 ? skills.length - 2 : 0;
              const parseScore = getParseScore(candidate);
              const status = getStatus(candidate);
              const currentCompany = getCurrentCompany(candidate);
              const currentJobTitle = getCurrentJobTitle(candidate);
              const experience = getExperience(candidate);

              return (
                <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                  {onSelectCandidate && (
                    <td className="px-4 py-4">
                      <button
                        onClick={() => onSelectCandidate(candidate.id)}
                        className="flex items-center justify-center"
                      >
                        {selectedCandidates?.has(candidate.id) ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {initials || <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">{fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{candidate.email || 'N/A'}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Building className="w-3 h-3 text-gray-400" />
                            <span className="truncate">{currentCompany}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Briefcase className="w-3 h-3 text-gray-400" />
                            <span className="truncate">{currentJobTitle}</span>
                            {experience > 0 && (
                              <span className="text-gray-400">•</span>
                            )}
                            {experience > 0 && (
                              <span>{experience} yrs</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {displaySkills.map((skill, idx) => (
                        <span
                          key={skill.id || idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                        >
                          {skill.skill_name || skill.name || 'Unknown'}
                        </span>
                      ))}
                      {remainingSkills > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setSkillsPopoverOpen(skillsPopoverOpen === candidate.id ? null : candidate.id)}
                            className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium hover:bg-indigo-100 transition-colors"
                          >
                            +{remainingSkills} More
                          </button>
                          {skillsPopoverOpen === candidate.id && (
                            <div className="absolute left-0 top-6 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-20 min-w-[200px]">
                              <p className="text-xs font-semibold text-gray-700 mb-2">All Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {skills.map((skill, idx) => (
                                  <span
                                    key={skill.id || idx}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                                  >
                                    {skill.skill_name || skill.name || 'Unknown'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(parseScore)}`}>
                      {parseScore}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600">
                    {formatDate(candidate.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === candidate.id ? null : candidate.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                      {actionMenuOpen === candidate.id && (
                        <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[180px]">
                            <button
                              onClick={() => {
                                const route = jobId ? `/recruiter/workspace/${jobId}/candidates/${candidate.id}` : `/candidates/${candidate.id}`;
                                navigate(route);
                                setActionMenuOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </button>
                          <PermissionGuard module="candidates" action="edit" mode="hide">
                            <button
                              onClick={() => {
                                const route = jobId ? `/recruiter/workspace/${jobId}/candidates/${candidate.id}?edit=true` : `/candidates/${candidate.id}?edit=true`;
                                navigate(route);
                                setActionMenuOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Candidate
                            </button>
                          </PermissionGuard>
                          <button
                            onClick={() => {
                              const resumePath = (candidate as any).resume_file_path;
                              if (resumePath) {
                                window.open(`http://localhost:3001/uploads/${resumePath}`, '_blank');
                              } else {
                                toast.error('Resume file not available for download');
                              }
                              setActionMenuOpen(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <Download className="w-4 h-4" />
                            Download Resume
                          </button>
                          <div className="border-t border-gray-200 my-1" />
                          <PermissionGuard module="candidates" action="delete" mode="hide">
                            <button
                              onClick={async () => {
                                setActionMenuOpen(null);
                                try {
                                  await deleteCandidate(candidate.id);
                                  toast.success('Candidate deleted successfully');
                                } catch (error) {
                                  toast.error('Failed to delete candidate');
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </PermissionGuard>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
