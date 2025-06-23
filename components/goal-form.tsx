"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Sparkles } from "lucide-react"

interface Goal {
  id: number
  userId: number
  title: string
  description: string
  targetDate: string
  createdAt: string
}

interface GoalFormProps {
  goal?: Goal | null
  onSave: () => void
  onCancel: () => void
}

export default function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetDate: "",
  })
  const [loading, setLoading] = useState(false)
  const [generatingTasks, setGeneratingTasks] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate,
      })
    }
  }, [goal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const url = goal ? `/api/goals/${goal.id}` : "/api/goals"
      const method = goal ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Generate AI tasks if it's a new goal
        if (!goal) {
          await generateAITasks(data.id)
        }
        onSave()
      } else {
        setError(data.error || "Failed to save goal")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const generateAITasks = async (goalId: number) => {
    setGeneratingTasks(true)
    try {
      await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          goalTitle: formData.title,
          goalDescription: formData.description,
        }),
      })
    } catch (error) {
      console.error("Failed to generate AI tasks:", error)
    } finally {
      setGeneratingTasks(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>{goal ? "Edit Goal" : "Create New Goal"}</span>
          {!goal && <Sparkles className="h-5 w-5 text-purple-500" />}
        </CardTitle>
        <CardDescription>
          {goal
            ? "Update your goal details and target date"
            : "Set a clear goal with a target date. AI will suggest tasks to help you achieve it!"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Lose 10kg, Learn Spanish, Run a Marathon"
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal in detail. What do you want to achieve and why?"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              min={getMinDate()}
              required
              className="h-11"
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {generatingTasks && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800 flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating AI-powered tasks for your goal...</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading || generatingTasks}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {goal ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {goal ? "Update Goal" : "Create Goal"}
                  {!goal && <Sparkles className="h-4 w-4 ml-2" />}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading || generatingTasks}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
