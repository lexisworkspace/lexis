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
import { Task, TaskPriority, TaskStatus, RecurringType, ViewMode, PRIORITY_CONFIG, STATUS_CONFIG } from "@/types";

export default function TasksPage() {
  const [data, setData] = useState(storage.getData());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");

  const refresh = () => setData({ ...storage.getData() });

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

  const getPriorityIcon = (p: TaskPriority) => {
    switch (p) {
      case "urgent": return <AlertCircle className="h-4 w-4 text-zinc-400" />;
      case "high": return <ArrowUp className="h-4 w-4 text-zinc-400" />;
      case "medium": return <Minus className="h-4 w-4 text-zinc-400" />;
      case "low": return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {overdueTasks.length > 0
              ? `${overdueTasks.length} overdue — time to focus!`
              : `${tasks.filter((t) => t.status !== "done").length} pending tasks`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-border p-1">
            {[
              { mode: "list" as ViewMode, icon: List },
              { mode: "kanban" as ViewMode, icon: Columns },
              { mode: "calendar" as ViewMode, icon: CalendarIcon },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-lg p-1.5 transition-all",
                  viewMode === mode ? "bg-primary-500 text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {["all", "todo", "in_progress", "done"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as any)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                filterStatus === s ? "bg-primary-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s as TaskStatus]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                filterPriority === p ? "bg-primary-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue ({overdueTasks.length})
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
              Today
            </h3>
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-3 px-4">No tasks due today</p>
            )}
          </div>

          {/* Upcoming */}
          {upcomingTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Upcoming
              </h3>
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
                ))}
              </div>
            </div>
          )}

          {/* Remaining (no due date) */}
          {tasks.filter((t) => !t.dueDate && t.status !== "done").length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                Other
              </h3>
              <div className="space-y-2">
                {tasks.filter((t) => !t.dueDate && t.status !== "done").map((task) => (
                  <TaskCard key={task.id} task={task} onRefresh={refresh} />
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
                  Completed ({tasks.filter((t) => t.status === "done").length})
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
                    <h3 className="font-medium text-sm">{STATUS_CONFIG[status].label}</h3>
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
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {task.dueDate && (
                        <p className={cn("text-xs mt-2",                          task.dueDate < getToday() && task.status !== "done" ? "text-zinc-400" : "text-muted-foreground")}>
                          {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                      Drop tasks here
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
      )}

      {/* Empty State */}
      {tasks.length === 0 && viewMode === "list" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ListTodo className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first task to get started!</p>
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
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

function TaskCard({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
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
      >
        <div className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
          task.status === "done"
            ? "border-zinc-500 bg-zinc-500"
            : "border-muted-foreground/30 hover:border-primary-500"
        )}>
          {task.status === "done" && <CheckCircle2 className="h-4 w-4 text-white" />}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {task.priority === "urgent" && (
            <span className="tag bg-zinc-500/10 text-zinc-400 text-[10px]">Urgent</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {task.dueDate && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              task.dueDate < today && task.status !== "done" ? "text-zinc-400" : "text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.recurring !== "none" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {task.recurring}
            </span>
          )}
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            task.priority === "urgent" ? "bg-zinc-500/10 text-zinc-400" :
            task.priority === "high" ? "bg-zinc-500/10 text-zinc-400" :
            task.priority === "medium" ? "bg-zinc-500/10 text-zinc-400" :
            "bg-muted text-muted-foreground"
          )}>
            {task.priority}
          </span>
        </div>
      </div>              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); storage.deleteTask(task.id); onRefresh(); }} className="btn-ghost p-1 text-zinc-400 hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
    </motion.div>
  );
}

function CalendarView({ tasks, onRefresh }: { tasks: Task[]; onRefresh: () => void }) {
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
            Today
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
                "bg-card p-1.5 min-h-[80px] transition-colors hover:bg-muted/50",
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
                      task.priority === "urgent" ? "bg-zinc-500/10 text-zinc-400" :
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
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [dueTime, setDueTime] = useState(task?.dueTime || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [recurring, setRecurring] = useState<RecurringType>(task?.recurring || "none");
  const [listId, setListId] = useState(task?.listId || "");

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
          <h2 className="text-lg font-bold">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input-field">
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input-field">
                <option value="todo">📋 To Do</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="done">✅ Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Time</label>
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
              <label className="text-sm font-medium mb-1.5 block">Recurring</label>
              <select value={recurring} onChange={(e) => setRecurring(e.target.value as RecurringType)} className="input-field">
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">List</label>
              <select value={listId} onChange={(e) => setListId(e.target.value)} className="input-field">
                <option value="">None</option>
                {taskLists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
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
              {task ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
