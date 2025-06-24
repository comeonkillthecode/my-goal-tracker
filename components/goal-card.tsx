"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle2, Edit, Trash2, Plus, Settings, Sparkles, RefreshCw } from "lucide-react"
import TaskList from "@/components/task-list"
import TaskForm from "@/components/task-form"
import TaskReviewModal from "@/components/task-review-modal"

interface Goal {
  id: number
  userId: number
  title: string
  description: string
  targetDate: string
  createdAt: string
}

interface Task {
  id: number
  goalId: number
  type: "positive" | "negative"
  description: string
  points: number
  completed: boolean
  date: string
  isTemplate?: boolean
}

interface GoalCardProps {
  goal: Goal
  tasks: Task[]
  onEditGoal: (goal: Goal) => void
  onDeleteGoal: (goalId: number) => void
  onTaskToggle: (taskId: number, completed: boolean) => void
  onTaskUpdate: () => void
  showTasks?: boolean
}

export default function GoalCard({
  goal,
  tasks,
  onEditGoal,
  onDeleteGoal,
  onTaskToggle,
  onTaskUpdate,
  showTasks = false,
}: GoalCardProps) {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showTasksExpanded, setShowTasksExpanded] = useState(showTasks)
  const [showTaskReview, setShowTaskReview] = useState(false)
  const [generatingTasks, setGeneratingTasks] = useState(false)

  const goalTasks = tasks.filter((t) => t.goalId === goal.id)
  const positiveTasks = goalTasks.filter((t) => t.type === "positive")
  const completedPositiveTasks = positiveTasks.filter((t) => t.completed)
  const progress = positiveTasks.length > 0 ? (completedPositiveTasks.length / positiveTasks.length) * 100 : 0
  const daysUntilTarget = Math.ceil(
    (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )

  const handleGenerateTasks = async () => {
    setGeneratingTasks(true)
    try {
      const response = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          goalTitle: goal.title,
          goalDescription: goal.description,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Force update tasks first
        onTaskUpdate()
        // Small delay to ensure tasks are loaded
        setTimeout(() => {
          setShowTaskReview(true)
        }, 100)
      } else {
        alert(data.error || "Failed to generate tasks")
      }
    } catch (error) {
      console.error("Failed to generate tasks:", error)
      alert("Failed to generate tasks. Please try again.")
    } finally {
      setGeneratingTasks(false)
    }
  }

  const handleRegenerateTasks = async () => {
    if (!confirm("This will delete all existing tasks for this goal and generate new ones. Are you sure?")) {
      return
    }

    try {
      // First delete all existing tasks for this goal
      const response = await fetch(`/api/tasks/delete-all-for-goal`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id }),
      })

      if (response.ok) {
        // Then generate new tasks
        handleGenerateTasks()
      }
    } catch (error) {
      console.error("Failed to regenerate tasks:", error)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleTaskSaved = () => {
    setShowTaskForm(false)
    setEditingTask(null)
    onTaskUpdate()
  }

  const getTodaysTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return goalTasks.filter((task) => task.date === today && !task.isTemplate)
  }

  const hasAnyTasks = () => {
    return goalTasks.filter((t) => !t.isTemplate).length > 0
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">{goal.description}</CardDescription>
            </div>
            <div className="flex items-center space-x-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTasksExpanded(!showTasksExpanded)}
                className="text-gray-500 hover:text-blue-600"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{daysUntilTarget > 0 ? `${daysUntilTarget} days left` : "Overdue"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {completedPositiveTasks.length}/{positiveTasks.length} positive tasks
              </span>
            </div>
          </div>

          {/* Today's Tasks Preview */}
          {getTodaysTasks().length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Today's Tasks</span>
                <Badge variant="secondary" className="text-xs">
                  {getTodaysTasks().filter((t) => t.completed).length}/{getTodaysTasks().length}
                </Badge>
              </div>
              <div className="space-y-1">
                {getTodaysTasks()
                  .slice(0, 2)
                  .map((task) => (
                    <div key={task.id} className="text-xs text-gray-600 flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          task.completed ? "bg-green-500" : task.type === "positive" ? "bg-green-200" : "bg-red-200"
                        }`}
                      />
                      <span className={task.completed ? "line-through" : ""}>{task.description}</span>
                    </div>
                  ))}
                {getTodaysTasks().length > 2 && (
                  <div className="text-xs text-gray-500">+{getTodaysTasks().length - 2} more tasks</div>
                )}
              </div>
            </div>
          )}

          {/* Expanded Task Management */}
          {showTasksExpanded && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 sm:px-0">
                <h4 className="font-medium text-gray-900 text-base sm:text-lg">Task Management</h4>
                <div className="flex space-x-2">
                  {!hasAnyTasks() ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateTasks}
                      disabled={generatingTasks}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {generatingTasks ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate Daily Tasks
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerateTasks}
                      disabled={generatingTasks}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {generatingTasks ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTaskForm(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Custom
                  </Button>
                </div>
              </div>

              {getTodaysTasks().length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Today's Tasks</span>
                    <Badge variant="secondary" className="text-xs">
                      Daily recurring until {new Date(goal.targetDate).toLocaleDateString()}
                    </Badge>
                  </div>
                  <TaskList
                    tasks={getTodaysTasks()}
                    goals={[goal]}
                    onTaskToggle={onTaskToggle}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    showActions={true}
                    compact={true}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No daily tasks yet for this goal</p>
                  <p className="text-xs">Generate AI tasks or create custom ones</p>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => onEditGoal(goal)} className="flex-1">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteGoal(goal.id)}
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          goals={[goal]}
          onSave={handleTaskSaved}
          onCancel={() => {
            setShowTaskForm(false)
            setEditingTask(null)
          }}
          preselectedGoalId={goal.id}
        />
      )}

      {/* Task Review Modal */}
      {showTaskReview && (
        <TaskReviewModal
          goalId={goal.id}
          goalTitle={goal.title}
          goalDeadline={goal.targetDate}
          onClose={() => setShowTaskReview(false)}
          onTasksUpdated={onTaskUpdate}
        />
      )}
    </>
  )
}
