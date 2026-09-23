"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ListTodo,
  Calendar as CalendarIcon,
  Columns,
  List,
  Trash2,
  Edit3,
  X,
  Clock,
  Flag,
  Repeat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  AlertCircle,
  ArrowUp,
  Minus,
  ArrowDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn, getToday, formatDate, generateId } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Task, TaskPriority, TaskStatus, RecurringType, ViewMode, PRIORITY_CONFIG, STATUS_CONFIG, DAYS_OF_WEEK } from "@/types";

export default function TasksPage() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [quickAdd, setQuickAdd] = useState("");
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  const refresh = () => setData({ ...storage.getData() });
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  const tasks = data.tasks
    .filter((t) => t.status !== "archived")
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority)
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.order - b.order;
    });

  const today = getToday();
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== "done");
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const upcomingTasks = tasks.filter((t) => t.dueDate && t.dueDate > today);

  const kanbanColumns: TaskStatus[] = ["todo", "in_progress", "done"];

  // Manual order only applies to undated tasks (the "Other" group).
  const otherTasks = tasks
    .filter((t) => !t.dueDate && t.status !== "done")
    .sort((a, b) => a.order - b.order);

  const moveTask = (id: string, dir: -1 | 1) => {
    const idx = otherTasks.findIndex((t) => t.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= otherTasks.length) return;
    const a = otherTasks[idx];
    const b = otherTasks[swap];
    storage.updateTask(a.id, { order: b.order });
    storage.updateTask(b.id, { order: a.order });
    refresh();
  };

  const getPriorityIcon = (p: TaskPriority) => {
    switch (p) {
      case "urgent": return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case "high": return <ArrowUp className="h-4 w-4 text-muted-foreground" />;
      case "medium": return <Minus className="h-4 w-4 text-muted-foreground" />;
      case "low": return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative space-y-6 md:space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-wrap items-start justify-between gap-3 relative"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">Tasks</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
            {overdueTasks.length > 0
              ? `${overdueTasks.length} ${t("tasks.overdue")}`
              : `${tasks.filter((t) => t.status !== "done").length} ${t("tasks.pending")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggle - desktop-only (list is the mobile view; kanban &
              calendar need a wide screen) */}
          <div className="hidden md:flex items-center rounded-md border border-border p-0.5">
            {[
              { mode: "list" as ViewMode, icon: List },
              { mode: "kanban" as ViewMode, icon: Columns },
              { mode: "calendar" as ViewMode, icon: CalendarIcon },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded px-1.5 py-1 transition-all text-xs",
                  viewMode === mode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tasks.addTask")}</span>
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {["all", "todo", "in_progress", "done"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s as any)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-all",
                  filterStatus === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? t("tasks.all") : t(s === "todo" ? "tasks.toDo" : s === "in_progress" ? "tasks.inProgress" : "tasks.done")}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-all",
                  filterPriority === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p === "all" ? t("tasks.all") : t("tasks." + p)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Add */}
      {viewMode === "list" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const title = quickAdd.trim();
            if (!title) return;
            storage.createTask({
              title,
              description: "",
              status: "todo",
              priority: "medium",
              dueDate: null,
              dueTime: null,
              tags: [],
              listId: null,
              recurring: "none",
              recurringEndDate: null,
              estimatedMinutes: null,
              completedAt: null,
            });
            setQuickAdd("");
            refresh();
          }}
          className="flex gap-2"
        >
          <input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder={t("tasks.quickAdd")}
            className="input-field"
          />
          <button
            type="submit"
            disabled={!quickAdd.trim()}
            className="btn-primary shrink-0 px-4"
            title={t("tasks.addTask")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("tasks.overdue")} ({overdueTasks.length})
              </h3>
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary-500" />
              {t("tasks.today")}
            </h3>
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3 px-4">{t("tasks.noTasksDueToday")}</p>
            )}
          </div>

          {/* Upcoming */}
          {upcomingTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("tasks.upcoming")}
              </h3>
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
                ))}
              </div>
            </div>
          )}

          {/* Remaining (no due date) - manually ordered */}
          {otherTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                {t("tasks.other")}
              </h3>
              <div className="space-y-2">
                {otherTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRefresh={refresh}
                    onMoveUp={() => moveTask(task.id, -1)}
                    onMoveDown={() => moveTask(task.id, 1)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {tasks.filter((t) => t.status === "done").length > 0 && (
            <div>
              <details className="group">
                <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer py-2">
                  <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                  {t("tasks.completed")} ({tasks.filter((t) => t.status === "done").length})
                </summary>
                <div className="space-y-2 mt-2">
                  {tasks.filter((t) => t.status === "done").map((task) => (
                    <TaskCard key={task.id} task={task} onRefresh={refresh} />
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG[status].color }} />
                    <h3 className="font-medium text-sm">{t(status === "todo" ? "tasks.toDo" : status === "in_progress" ? "tasks.inProgress" : "tasks.done")}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="card p-3 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => {
                        storage.updateTask(task.id, {
                          status: status === "todo" ? "in_progress" as TaskStatus : status === "in_progress" ? "done" as TaskStatus : "todo" as TaskStatus,
                        });
                        refresh();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getPriorityIcon(task.priority)}
                            <p className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
                              {task.title}
                            </p>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); storage.deleteTask(task.id); refresh(); }}
                          className="touch-reveal text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {task.dueDate && (
                        <p className={cn("text-xs mt-2",                          task.dueDate < getToday() && task.status !== "done" ? "text-muted-foreground" : "text-muted-foreground")}>
                          {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                      {t("tasks.dropHere")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarView tasks={tasks} onRefresh={refresh} />
      )}        {/* Empty State */}
      {tasks.length === 0 && viewMode === "list" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
            <ListTodo className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold tracking-tight mb-1">{t("tasks.noTasksYet")}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xs">{t("tasks.createFirst")}</p>
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </motion.div>
      )}

      {/* Task Form Modal */}
      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editingTask}
            taskLists={data.taskLists}
            onSave={(taskData) => {
              if (editingTask) {
                storage.updateTask(editingTask.id, taskData);
              } else {
                storage.createTask(taskData as any);
              }
              refresh();
              setShowForm(false);
            }}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, onRefresh, onMoveUp, onMoveDown }: { task: Task; onRefresh: () => void; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const { t } = useI18n();
  const today = getToday();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "card p-3 flex items-center gap-3 group transition-all",
        task.status === "done" && "opacity-60"
      )}
    >
      <button
        onClick={() => { storage.toggleTask(task.id); onRefresh(); }}
        className="shrink-0"
        aria-label={task.status === "done" ? t("tasks.markUndone") : t("tasks.markDone")}
      >
        <motion.div
          key={task.completedAt || "open"}
          initial={task.status === "done" ? { scale: 0.4 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            task.status === "done"
              ? "border-zinc-500 bg-zinc-500"
              : "border-muted-foreground/30 hover:border-primary-500"
          )}
        >
          {task.status === "done" && <CheckCircle2 className="h-4 w-4 text-white" />}
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {task.priority === "urgent" && (
            <span className="tag bg-muted text-muted-foreground text-[10px]">{t("tasks.urgent")}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {task.dueDate && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              task.dueDate < today && task.status !== "done" ? "text-muted-foreground" : "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.recurring !== "none" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {task.recurring === "weekly" && task.recurringDays?.length
                ? `${t("tasks.weeklyOn")} ${task.recurringDays.map((d) => DAYS_OF_WEEK[d]).join(", ")}`
                : task.recurring === "daily" ? t("tasks.daily") : task.recurring === "weekly" ? t("tasks.weeklyPick") : t("tasks.monthly")}
            </span>
          )}
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            task.priority === "urgent" ? "bg-muted text-muted-foreground" :
            task.priority === "high" ? "bg-muted text-muted-foreground" :
            task.priority === "medium" ? "bg-muted text-muted-foreground" :
            "bg-muted text-muted-foreground"
          )}>
            {t("tasks." + task.priority)}
          </span>
        </div>
      </div>              <div className="touch-reveal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onMoveUp && (
                  <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="btn-ghost p-1 text-muted-foreground hover:text-foreground" title={t("tasks.moveUp")}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                )}
                {onMoveDown && (
                  <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="btn-ghost p-1 text-muted-foreground hover:text-foreground" title={t("tasks.moveDown")}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); storage.deleteTask(task.id); onRefresh(); }} className="btn-ghost p-1 text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
    </motion.div>
  );
}

function CalendarView({ tasks, onRefresh }: { tasks: Task[]; onRefresh: () => void }) {
  const { t } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const today = getToday();

  const getTasksForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {new Date(currentYear, currentMonth).toLocaleString("default", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
              else setCurrentMonth(currentMonth - 1);
            }}
            className="btn-ghost text-sm px-3"
          >
            ←
          </button>
          <button
            onClick={() => {
              setCurrentMonth(new Date().getMonth());
              setCurrentYear(new Date().getFullYear());
            }}
            className="btn-ghost text-sm"
          >
            {t("common.today")}
          </button>
          <button
            onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
              else setCurrentMonth(currentMonth + 1);
            }}
            className="btn-ghost text-sm px-3"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-muted rounded-xl overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = getTasksForDay(day);
          const isToday = dateStr === today;

          return (
            <div
              key={day}
              className={cn(
                "bg-card p-1 md:p-1.5 md:min-h-[80px] transition-colors hover:bg-muted/50",
                isToday && "ring-1 ring-primary-500"
              )}
            >
              <span className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                isToday && "bg-primary-500 text-white font-bold"
              )}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                      task.status === "done" ? "line-through text-muted-foreground bg-muted" :
                      task.priority === "urgent" ? "bg-muted text-muted-foreground" :
                      "bg-primary-500/10 text-primary-500"
                    )}
                    onClick={() => { storage.toggleTask(task.id); onRefresh(); }}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskForm({
  task,
  taskLists,
  onSave,
  onClose,
}: {
  task: Task | null;
  taskLists: { id: string; name: string }[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [dueTime, setDueTime] = useState(task?.dueTime || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [recurring, setRecurring] = useState<RecurringType>(task?.recurring || "none");
  const [recurringDays, setRecurringDays] = useState<number[]>(task?.recurringDays || []);
  const [listId, setListId] = useState(task?.listId || "");

  const toggleDay = (day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{task ? t("tasks.editTask") : t("tasks.newTask")}</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("tasks.titleField")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tasks.titleField")}
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("tasks.descOptional")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tasks.descOptional")}
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.priority")}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input-field">
                <option value="urgent">🔴 {t("tasks.urgent")}</option>
                <option value="high">🟠 {t("tasks.high")}</option>
                <option value="medium">🔵 {t("tasks.medium")}</option>
                <option value="low">⚪ {t("tasks.low")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.status")}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input-field">
                <option value="todo">📋 {t("tasks.toDo")}</option>
                <option value="in_progress">🔄 {t("tasks.inProgress")}</option>
                <option value="done">✅ {t("tasks.done")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.dueDate")}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.dueTime")}</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.recurring")}</label>
              <select value={recurring} onChange={(e) => { setRecurring(e.target.value as RecurringType); setRecurringDays([]); }} className="input-field">
                <option value="none">{t("tasks.never")}</option>
                <option value="daily">{t("tasks.daily")}</option>
                <option value="weekly">{t("tasks.weeklyPick")}</option>
                <option value="monthly">{t("tasks.monthly")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.list")}</label>
              <select value={listId} onChange={(e) => setListId(e.target.value)} className="input-field">
                <option value="">{t("common.none")}</option>
                {taskLists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {recurring === "weekly" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("tasks.repeatOn")}</label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all",
                      recurringDays.includes(idx)
                        ? "bg-primary-500 text-white ring-2 ring-primary-500/30 scale-110"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">{t("common.cancel")}</button>
            <button
              onClick={() => {
                if (!title.trim()) return;
                onSave({
                  title,
                  description,
                  priority,
                  status,
                  dueDate: dueDate || null,
                  dueTime: dueTime || null,
                  recurring,
                  recurringDays: recurring === "weekly" ? recurringDays : [],
                  listId: listId || null,
                  tags: [],
                  recurringEndDate: null,
                  estimatedMinutes: null,
                  completedAt: status === "done" ? new Date().toISOString() : null,
                });
              }}
              disabled={!title.trim()}
              className="btn-primary flex-1"
            >
              {task ? t("tasks.saveChanges") : t("tasks.addTask")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
