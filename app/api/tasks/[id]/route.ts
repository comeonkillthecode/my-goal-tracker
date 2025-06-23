import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const TASKS_FILE = join(DATA_DIR, "tasks.json")
const GOALS_FILE = join(DATA_DIR, "goals.json")

function readTasks() {
  if (!existsSync(TASKS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(TASKS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeTasks(tasks: any[]) {
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

function readGoals() {
  if (!existsSync(GOALS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(GOALS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)
    const { completed } = await request.json()

    const tasks = readTasks()
    const goals = readGoals()

    const taskIndex = tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Verify task belongs to user's goal
    const task = tasks[taskIndex]
    const goal = goals.find((g: any) => g.id === task.goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      completed,
    }

    writeTasks(tasks)
    return NextResponse.json(tasks[taskIndex])
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)
    const { goalId, type, description, points, date, completed } = await request.json()

    if (!goalId || !type || !description || points === undefined || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const tasks = readTasks()
    const goals = readGoals()

    const taskIndex = tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Verify both old and new goals belong to user
    const oldTask = tasks[taskIndex]
    const oldGoal = goals.find((g: any) => g.id === oldTask.goalId && g.userId === user.userId)
    const newGoal = goals.find((g: any) => g.id === goalId && g.userId === user.userId)

    if (!oldGoal || !newGoal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      goalId,
      type,
      description,
      points,
      date,
      completed,
      updatedAt: new Date().toISOString(),
    }

    writeTasks(tasks)
    return NextResponse.json(tasks[taskIndex])
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)

    const tasks = readTasks()
    const goals = readGoals()

    const taskIndex = tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Verify task belongs to user's goal
    const task = tasks[taskIndex]
    const goal = goals.find((g: any) => g.id === task.goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    tasks.splice(taskIndex, 1)
    writeTasks(tasks)

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Task deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
