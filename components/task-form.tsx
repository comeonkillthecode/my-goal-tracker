"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Minus, Target } from "lucide-react"

interface Task {
  id: number
  goalId: number
  type: "positive" | "negative"
  description: string
  points: number
  completed: boolean
  date: string
}

interface Goal {
  id: number
  title: string
}

interface TaskFormProps {
  task?: Task | null
  goals: Goal[]
  onSave: () => void
  onCancel: () => void
  preselectedGoalId?: number
}

export default function TaskForm({ task, goals, onSave, onCancel, preselectedGoalId }: TaskFormProps) {
  const [formData, setFormData] = useState({
    goalId: preselectedGoalId?.toString() || "",
    type: "positive" as "positive" | "negative",
    description: "",
    points: 20,
    date: new Date().toISOString().split("T")[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (task) {
      setFormData({
        goalId: task.goalId.toString(),
        type: task.type,
        description: task.description,
        points: Math.abs(task.points), // Always show positive number in form
        date: task.date,
      })
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Calculate actual points (negative for negative tasks)
      const actualPoints = formData.type === "negative" ? -Math.abs(formData.points) : Math.abs(formData.points)

      const taskData = {
        goalId: Number.parseInt(formData.goalId),
        type: formData.type,
        description: formData.description,
        points: actualPoints,
        date: formData.date,
        completed: task?.completed || false,
      }

      const url = task ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = task ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const data = await response.json()

      if (response.ok) {
        onSave()
      } else {
        setError(data.error || "Failed to save task")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getPointsColor = () => {
    return formData.type === "positive" ? "text-green-600" : "text-red-600"
  }

  const getPointsIcon = () => {
    return formData.type === "positive" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />
  }

  const showGoalSelector = goals.length > 1 || !preselectedGoalId

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-purple-500" />
          <span>{task ? "Edit Task" : "Create Custom Task"}</span>
        </CardTitle>
        <CardDescription>
          {task
            ? "Update your task details, points, and settings"
            : "Create a custom task with your own description and point value"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {showGoalSelector && (
            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Select
                value={formData.goalId}
                onValueChange={(value) => setFormData({ ...formData, goalId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal for this task" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id.toString()}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "positive" | "negative") => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    <span>Positive Task (Earn Points)</span>
                  </div>
                </SelectItem>
                <SelectItem value="negative">
                  <div className="flex items-center space-x-2">
                    <Minus className="h-4 w-4 text-red-600" />
                    <span>Negative Task (Lose Points)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Positive tasks help you achieve your goal. Negative tasks are habits you want to avoid.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Task Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Exercise for 30 minutes, Read 10 pages, Skip junk food"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points" className="flex items-center space-x-2">
                <span>Points</span>
                <div className={`flex items-center space-x-1 ${getPointsColor()}`}>
                  {getPointsIcon()}
                  <span className="text-sm font-medium">{formData.points}</span>
                </div>
              </Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Number.parseInt(e.target.value) || 1 })}
                required
                className="h-11"
              />
              <p className="text-xs text-gray-500">
                {formData.type === "positive"
                  ? "Points you'll earn when completing this task"
                  : "Points you'll lose if you do this negative behavior"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="h-11"
              />
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {task ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {task ? "Update Task" : "Create Task"}
                  {getPointsIcon()}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
