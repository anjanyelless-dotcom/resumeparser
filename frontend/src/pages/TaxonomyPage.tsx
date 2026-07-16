import { useEffect, useMemo, useState } from "react";
import { Database, Plus, Tag } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import {
  fetchTaxonomyCertifications,
  fetchTaxonomyDegrees,
  fetchTaxonomySkills,
  fetchTaxonomyUniversities,
  type TaxonomyItem,
  type TaxonomySkill,
} from "../services/api/taxonomy";

export default function TaxonomyPage() {
  const [skills, setSkills] = useState<TaxonomySkill[]>([]);
  const [degrees, setDegrees] = useState<TaxonomyItem[]>([]);
  const [universities, setUniversities] = useState<TaxonomyItem[]>([]);
  const [certifications, setCertifications] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<
    "skill" | "degree" | "university" | "certification"
  >("skill");
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addSynonyms, setAddSynonyms] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [skillsData, degreeData, universityData, certificationData] =
          await Promise.all([
            fetchTaxonomySkills(),
            fetchTaxonomyDegrees(),
            fetchTaxonomyUniversities(),
            fetchTaxonomyCertifications(),
          ]);
        setSkills(skillsData);
        setDegrees(degreeData);
        setUniversities(universityData);
        setCertifications(certificationData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load taxonomy",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredSkills = useMemo(() => {
    if (!search) return skills;
    const term = search.toLowerCase();
    return skills.filter((skill) => {
      return (
        skill.name?.toLowerCase().includes(term) ||
        skill.category?.toLowerCase().includes(term) ||
        skill.synonyms?.toLowerCase().includes(term)
      );
    });
  }, [skills, search]);

  const handleAddEntry = () => {
    setAddOpen(true);
  };

  const handleSubmitAdd = () => {
    const name = addName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (addType === "skill") {
      setSkills((prev) => [
        {
          name,
          category: addCategory.trim() || null,
          synonyms: addSynonyms.trim() || null,
          group: null,
        },
        ...prev,
      ]);
    } else if (addType === "degree") {
      setDegrees((prev) => [{ name }, ...prev]);
    } else if (addType === "university") {
      setUniversities((prev) => [{ name }, ...prev]);
    } else {
      setCertifications((prev) => [{ name }, ...prev]);
    }

    setAddOpen(false);
    setAddName("");
    setAddCategory("");
    setAddSynonyms("");
    toast.success("Entry added");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Taxonomy manager
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage canonical skills, degrees, certifications, and universities.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleAddEntry}>
          Add entry
        </Button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add entry">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Type</label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              value={addType}
              onChange={(event) => setAddType(event.target.value as any)}
            >
              <option value="skill">Skill</option>
              <option value="degree">Degree</option>
              <option value="university">University</option>
              <option value="certification">Certification</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Name</label>
            <Input
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              placeholder="Name"
            />
          </div>

          {addType === "skill" && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">
                  Category
                </label>
                <Input
                  value={addCategory}
                  onChange={(event) => setAddCategory(event.target.value)}
                  placeholder="Category"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">
                  Synonyms
                </label>
                <Input
                  value={addSynonyms}
                  onChange={(event) => setAddSynonyms(event.target.value)}
                  placeholder="Comma-separated synonyms"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd}>Save</Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-brand-600" /> Skills taxonomy
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Tag className="h-4 w-4" />}
            >
              Import
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                <span>Skill</span>
                <span>Category</span>
                <span>Synonyms</span>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Loading...
                  </div>
                ) : error ? (
                  <div className="px-4 py-6 text-sm text-red-500">{error}</div>
                ) : filteredSkills.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No skills found.
                  </div>
                ) : (
                  filteredSkills.map((skill) => (
                    <div
                      key={`${skill.name}-${skill.category}`}
                      className="grid grid-cols-[1.2fr_0.8fr_1fr] gap-3 px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="font-medium text-slate-900">
                        {skill.name ?? "Unknown"}
                      </span>
                      <span>{skill.category ?? skill.group ?? "—"}</span>
                      <span className="text-slate-500">
                        {skill.synonyms ?? "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900">Degrees</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {(degrees.length ? degrees : [{ name: "Loading..." }]).map(
                (degree) => (
                  <div
                    key={degree.name}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="font-medium text-slate-900">{degree.name}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900">
              Universities
            </h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {(universities.length
                ? universities
                : [{ name: "Loading..." }]
              ).map((uni) => (
                <div
                  key={uni.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <span className="font-medium text-slate-900">{uni.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900">
              Certifications
            </h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {(certifications.length
                ? certifications
                : [{ name: "Loading..." }]
              ).map((cert) => (
                <div
                  key={cert.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <span className="font-medium text-slate-900">
                    {cert.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
