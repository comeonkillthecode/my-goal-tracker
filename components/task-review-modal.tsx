"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Plus, Minus, Edit, Trash2, Check, X, Calendar, Clock, AlertTriangle } from "lucide-react"

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

interface TaskReviewModalProps {
  goalId: number
  goalTitle: string
  goalDeadline: string
  onClose: () => void
  onTasksUpdated: () => void
}

export default function TaskReviewModal({
  goalId,
  goalTitle,
  goalDeadline,
  onClose,
  onTasksUpdated,
}: TaskReviewModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    description: "",
    points: 20,
    type: "positive" as "positive" | "negative",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const [showAddTaskForm, setShowAddTaskForm] = useState(false)
  const [newTaskForm, setNewTaskForm] = useState({
    description: "",
    points: 20,
    type: "positive" as "positive" | "negative",
  })

  useEffect(() => {
    loadTasks()
  }, [goalId])

  const loadTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const allTasks = await response.json()
        // Get template tasks for this goal
        const templateTasks = allTasks.filter((t: Task) => t.goalId === goalId && t.isTemplate === true)
        setTasks(templateTasks)
      }
    } catch (error) {
      console.error("Failed to load tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id)
    setEditForm({
      description: task.description,
      points: Math.abs(task.points),
      type: task.type,
    })
  }

  const handleSaveEdit = async (taskId: number) => {
    setSaving(true)
    try {
      const actualPoints = editForm.type === "negative" ? -Math.abs(editForm.points) : Math.abs(editForm.points)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          type: editForm.type,
          description: editForm.description,
          points: actualPoints,
          date: new Date().toISOString().split("T")[0],
          completed: false,
          isTemplate: true,
        }),
      })

      if (response.ok) {
        setEditingTaskId(null)
        loadTasks()
      }
    } catch (error) {
      console.error("Failed to update task:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadTasks()
      }
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      const response = await fetch("/api/tasks/finalize-daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      })

      if (response.ok) {
        onTasksUpdated()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to finalize tasks")
      }
    } catch (error) {
      console.error("Failed to finalize tasks:", error)
      alert("Failed to finalize tasks. Please try again.")
    } finally {
      setFinalizing(false)
    }
  }

  const handleCancel = async () => {
    // Delete template tasks when canceling
    try {
      await fetch(`/api/tasks/delete-templates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      })
    } catch (error) {
      console.error("Failed to clean up template tasks:", error)
    }
    onClose()
  }

  const getDaysUntilDeadline = () => {
    const today = new Date()
    const deadline = new Date(goalDeadline)
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const getPositiveTasks = () => tasks.filter((t) => t.type === "positive")
  const getNegativeTasks = () => tasks.filter((t) => t.type === "negative")

  const handleAddNewTask = async () => {
    if (!newTaskForm.description.trim()) return

    setSaving(true)
    try {
      const actualPoints =
        newTaskForm.type === "negative" ? -Math.abs(newTaskForm.points) : Math.abs(newTaskForm.points)

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          type: newTaskForm.type,
          description: newTaskForm.description,
          points: actualPoints,
          date: new Date().toISOString().split("T")[0],
          completed: false,
          isTemplate: true,
        }),
      })

      if (response.ok) {
        setShowAddTaskForm(false)
        setNewTaskForm({ description: "", points: 20, type: "positive" })
        loadTasks()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to add task")
      }
    } catch (error) {
      console.error("Failed to add task:", error)
      alert("Failed to add task. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span>Review & Confirm Daily Tasks</span>
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddTaskForm(true)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add New Task
            </Button>
          </div>
          <DialogDescription>
            Review the generated tasks for "{goalTitle}". Once confirmed, these tasks will appear every day until your
            goal deadline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tasks.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="font-medium">Daily Tasks</div>
                    <div className="text-sm">{tasks.length} tasks per day</div>
                  </AlertDescription>
                </Alert>

                <Alert className="border-green-200 bg-green-50">
                  <Clock className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="font-medium">Duration</div>
                    <div className="text-sm">{getDaysUntilDeadline()} days total</div>
                  </AlertDescription>
                </Alert>

                <Alert className="border-purple-200 bg-purple-50">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">
                    <div className="font-medium">Total Tasks</div>
                    <div className="text-sm">{tasks.length * getDaysUntilDeadline()} tasks will be created</div>
                  </AlertDescription>
                </Alert>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Important:</strong> Once confirmed, these tasks will be created for every day from today until
                  your goal deadline ({new Date(goalDeadline).toLocaleDateString()}).
                  <br />
                  <strong>Progress tracking:</strong> Only positive tasks count toward your goal progress. Negative
                  tasks are habits to avoid and affect your points but not progress percentage.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Positive Tasks Section */}
                {getPositiveTasks().length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-green-700">Positive Tasks (Count toward goal progress)</h4>
                      <Badge className="bg-green-100 text-green-800">{getPositiveTasks().length} tasks</Badge>
                    </div>
                    <div className="grid gap-3">
                      {getPositiveTasks().map((task) => (
                        <Card key={task.id} className="border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            {editingTaskId === task.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Task Type</Label>
                                    <Select
                                      value={editForm.type}
                                      onValueChange={(value: "positive" | "negative") =>
                                        setEditForm({ ...editForm, type: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="positive">
                                          <div className="flex items-center space-x-2">
                                            <Plus className="h-4 w-4 text-green-600" />
                                            <span>Positive (Counts toward progress)</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="negative">
                                          <div className="flex items-center space-x-2">
                                            <Minus className="h-4 w-4 text-red-600" />
                                            <span>Negative (Habit to avoid)</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Points</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={editForm.points}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, points: Number.parseInt(e.target.value) || 1 })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Daily task description"
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(task.id)}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTaskId(null)}
                                    disabled={saving}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <Plus className="h-4 w-4" />
                                      <span className="font-medium">{task.points}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{task.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditTask(task)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Negative Tasks Section */}
                {getNegativeTasks().length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-red-700">Negative Tasks (Habits to avoid)</h4>
                      <Badge className="bg-red-100 text-red-800">{getNegativeTasks().length} tasks</Badge>
                    </div>
                    <div className="grid gap-3">
                      {getNegativeTasks().map((task) => (
                        <Card key={task.id} className="border-red-200 bg-red-50">
                          <CardContent className="p-4">
                            {editingTaskId === task.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Task Type</Label>
                                    <Select
                                      value={editForm.type}
                                      onValueChange={(value: "positive" | "negative") =>
                                        setEditForm({ ...editForm, type: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="positive">
                                          <div className="flex items-center space-x-2">
                                            <Plus className="h-4 w-4 text-green-600" />
                                            <span>Positive (Counts toward progress)</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="negative">
                                          <div className="flex items-center space-x-2">
                                            <Minus className="h-4 w-4 text-red-600" />
                                            <span>Negative (Habit to avoid)</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Points</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={editForm.points}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, points: Number.parseInt(e.target.value) || 1 })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Daily task description"
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(task.id)}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTaskId(null)}
                                    disabled={saving}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1 text-red-600">
                                      <Minus className="h-4 w-4" />
                                      <span className="font-medium">{Math.abs(task.points)}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{task.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditTask(task)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add New Task Form */}
              {showAddTaskForm && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-blue-700">Add New Task</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddTaskForm(false)}
                          className="text-gray-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Task Type</Label>
                          <Select
                            value={newTaskForm.type}
                            onValueChange={(value: "positive" | "negative") =>
                              setNewTaskForm({ ...newTaskForm, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="positive">
                                <div className="flex items-center space-x-2">
                                  <Plus className="h-4 w-4 text-green-600" />
                                  <span>Positive (Counts toward progress)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="negative">
                                <div className="flex items-center space-x-2">
                                  <Minus className="h-4 w-4 text-red-600" />
                                  <span>Negative (Habit to avoid)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={newTaskForm.points}
                            onChange={(e) =>
                              setNewTaskForm({ ...newTaskForm, points: Number.parseInt(e.target.value) || 1 })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={newTaskForm.description}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                          placeholder="Enter daily task description"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleAddNewTask}
                          disabled={!newTaskForm.description.trim() || saving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Task
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddTaskForm(false)
                            setNewTaskForm({ description: "", points: 20, type: "positive" })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel} disabled={finalizing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {finalizing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Daily Tasks...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm & Create Daily Tasks
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No tasks were generated. Try again or create custom tasks.</p>
              <Button variant="outline" onClick={handleCancel} className="mt-4">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
