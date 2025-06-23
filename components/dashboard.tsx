"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Trophy, Plus, Calendar, CheckCircle2, Zap, Settings, LogOut, Star } from "lucide-react"
import GoalForm from "@/components/goal-form"
import TaskList from "@/components/task-list"
import ProfileSettings from "@/components/profile-settings"
import GoalCard from "@/components/goal-card"

interface User {
  id: number
  username: string
  grokApiId?: string
}

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
}

interface DashboardProps {
  user: User
  onLogout: () => void
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [goalsRes, tasksRes, pointsRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/tasks"),
        fetch("/api/points"),
      ])

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        setGoals(goalsData)
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }

      if (pointsRes.ok) {
        const pointsData = await pointsRes.json()
        setTotalPoints(pointsData.total)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoalSaved = () => {
    setShowGoalForm(false)
    setEditingGoal(null)
    loadData()
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowGoalForm(true)
  }

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm("Are you sure you want to delete this goal? This will also delete all associated tasks.")) {
      return
    }

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to delete goal:", error)
    }
  }

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const getTodaysTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => task.date === today)
  }

  const getCompletedTasksToday = () => {
    return getTodaysTasks().filter((task) => task.completed)
  }

  const getPointsToday = () => {
    return getCompletedTasksToday().reduce((sum, task) => sum + task.points, 0)
  }

  const getStreakData = () => {
    // Simple streak calculation - days with at least one completed task
    const dates = [...new Set(tasks.filter((t) => t.completed).map((t) => t.date))].sort()
    let streak = 0
    const today = new Date()

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = checkDate.toISOString().split("T")[0]

      if (dates.includes(dateStr)) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MyGoalTracker</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.username}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-yellow-800">{totalPoints} pts</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("settings")}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span className="text-2xl font-bold">{totalPoints}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Today's Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span className="text-2xl font-bold">{getPointsToday()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Active Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span className="text-2xl font-bold">{goals.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span className="text-2xl font-bold">{getStreakData()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Today's Tasks</span>
                  <Badge variant="secondary">
                    {getCompletedTasksToday().length}/{getTodaysTasks().length}
                  </Badge>
                </CardTitle>
                <CardDescription>Complete your daily tasks to earn points and build momentum</CardDescription>
              </CardHeader>
              <CardContent>
                {getTodaysTasks().length > 0 ? (
                  <TaskList
                    tasks={getTodaysTasks()}
                    goals={goals}
                    onTaskToggle={handleTaskToggle}
                    showActions={false}
                    compact={false}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No tasks for today</p>
                    <p className="text-sm">Create goals and generate tasks to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals Overview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Goals</h3>
                <Button
                  onClick={() => setActiveTab("goals")}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  View All Goals
                </Button>
              </div>

              {goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goals.slice(0, 4).map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      tasks={tasks}
                      onEditGoal={handleEditGoal}
                      onDeleteGoal={handleDeleteGoal}
                      onTaskToggle={handleTaskToggle}
                      onTaskUpdate={loadData}
                      showTasks={false}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
                    <p className="text-gray-500 mb-6">Create your first goal to start tracking your progress</p>
                    <Button
                      onClick={() => setActiveTab("goals")}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Your Goals</h2>
              <Button
                onClick={() => setShowGoalForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>

            {showGoalForm && (
              <GoalForm
                goal={editingGoal}
                onSave={handleGoalSaved}
                onCancel={() => {
                  setShowGoalForm(false)
                  setEditingGoal(null)
                }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  tasks={tasks}
                  onEditGoal={handleEditGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onTaskToggle={handleTaskToggle}
                  onTaskUpdate={loadData}
                  showTasks={true}
                />
              ))}
            </div>

            {goals.length === 0 && !showGoalForm && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
                  <p className="text-gray-500 mb-6">Create your first goal to start tracking your progress</p>
                  <Button
                    onClick={() => setShowGoalForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <ProfileSettings user={user} onUpdate={loadData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
