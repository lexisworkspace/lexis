"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Layers,
  ListTodo,
  FileText,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  Calendar,
  Clock,
  Archive,
  ChevronRight,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Project, ProjectStatus } from "@/types";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const PROJECT_COLORS = [
  "#71717a", "#a1a1aa", "#d4d4d8", "#6366f1",
  "#8b5cf6", "#a855f7", "#3b82f6", "#06b6d4",
  "#22c55e", "#eab308", "#f97316", "#ef4444",
];

export default function ProjectsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState(PROJECT_COLORS[0]);
  const [formStatus, setFormStatus] = useState<ProjectStatus>("active");
  const [formDeadline, setFormDeadline] = useState("");

  const refresh = () => setData({ ...storage.getData() });
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  const projects = data.projects
    .filter((p) => p.status !== "archived")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const openCreate = () => {
    setEditingProject(null);
    setFormName("");
    setFormDesc("");
    setFormColor(PROJECT_COLORS[0]);
    setFormStatus("active");
    setFormDeadline("");
    setShowForm(true);
  };

  const openEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormName(project.name);
    setFormDesc(project.description);
    setFormColor(project.color);
    setFormStatus(project.status);
    setFormDeadline(project.deadline || "");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingProject) {
      storage.updateProject(editingProject.id, {
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
        status: formStatus,
        deadline: formDeadline || null,
      });
    } else {
      storage.createProject({
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
        icon: "layers",
        status: formStatus,
        deadline: formDeadline || null,
      });
    }
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.deleteProject(id);
    refresh();
  };

  const handleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.updateProject(id, { status: "archived" });
    refresh();
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("projects.projects")}</h1>
          <p className="mt-1 text-sm text-muted-foreground/60 font-body">{t("projects.organize_tasks_files_and_ai_into_project")}</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("projects.new_project")}</span>
        </button>
      </motion.div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-muted-foreground/60">{t("projects.no_projects_yet")}</h3>
          <p className="mt-2 text-sm text-muted-foreground/40 font-body max-w-sm">
            Create a project to get a dedicated workspace with tasks, files, and AI context.
          </p>
          <button
            onClick={openCreate}
            className="mt-6 btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />{t("projects.create_your_first_project")}</button>
        </motion.div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => {
            const taskCount = data.tasks.filter((t) => project.taskIds.includes(t.id)).length;
            const doneTasks = data.tasks.filter(
              (t) => project.taskIds.includes(t.id) && t.status === "done"
            ).length;
            const noteCount = data.notes.filter((n) => project.noteIds.includes(n.id)).length;
            const progress = taskCount > 0 ? Math.round((doneTasks / taskCount) * 100) : 0;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group relative border border-border/50 rounded-2xl p-5 cursor-pointer hover:border-border transition-all"
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openEdit(project, e)}
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleArchive(project.id, e)}
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Color dot + Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold tracking-tight truncate">{project.name}</h3>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        project.status === "active" && "text-green-500",
                        project.status === "on_hold" && "text-yellow-500",
                        project.status === "completed" && "text-blue-500"
                      )}
                    >
                      {project.status === "on_hold" ? "On Hold" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-muted-foreground/50 font-body line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground/40">
                  <span className="flex items-center gap-1">
                    <ListTodo className="h-3 w-3" />
                    {taskCount} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {noteCount} notes
                  </span>
                </div>

                {/* Progress */}
                {taskCount > 0 && (
                  <div className="mt-3">
                    <div className="h-1 bg-muted-foreground/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: project.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Deadline */}
                {project.deadline && (
                  <div className="mt-3 flex max-w-full items-center gap-1.5 overflow-hidden pr-8 text-[11px] text-muted-foreground/40">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">Due {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Arrow */}
                <ChevronRight className="absolute bottom-5 right-5 h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all group-hover:translate-x-0.5" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background border border-border rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">
                  {editingProject ? "Edit Project" : "New Project"}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground/60 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground/60 mb-1.5 block">{t("projects.name")}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("projects.project_name")}
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-border"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground/60 mb-1.5 block">{t("deck.description")}</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder={t("projects.optional_description")}
                    rows={2}
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-border resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground/60 mb-1.5 block">{t("projects.color")}</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={cn(
                          "h-7 w-7 rounded-xl transition-all",
                          formColor === color && "ring-2 ring-offset-2 ring-offset-background"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground/60 mb-1.5 block">{t("projects.status")}</label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormStatus(opt.value)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-xl border transition-all",
                          formStatus === opt.value
                            ? "border-foreground/20 bg-foreground/5"
                            : "border-border/50 text-muted-foreground/60 hover:border-border"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground/60 mb-1.5 block">{t("projects.deadline")}</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-border"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!formName.trim()}
                  className="w-full btn-primary py-2.5 disabled:opacity-30"
                >
                  {editingProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
