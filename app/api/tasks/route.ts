import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const TASKS_FILE = join(DATA_DIR, "tasks.json")
const GOALS_FILE = join(DATA_DIR, "goals.json")

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  require("fs").mkdirSync(DATA_DIR, { recursive: true })
}

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

function getNextTaskId() {
  const tasks = readTasks()
  return tasks.length > 0 ? Math.max(...tasks.map((t: any) => t.id)) + 1 : 1
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

export async function GET(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const goals = readGoals()
  const tasks = readTasks()

  // Get user's goals to filter tasks
  const userGoals = goals.filter((g: any) => g.userId === user.userId)
  const userGoalIds = userGoals.map((g: any) => g.id)
  const userTasks = tasks.filter((t: any) => userGoalIds.includes(t.goalId))

  return NextResponse.json(userTasks)
}

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId, type, description, points, date, completed, isTemplate } = await request.json()

    if (!goalId || !type || !description || points === undefined || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const goals = readGoals()
    const tasks = readTasks()

    // Verify goal belongs to user
    const goal = goals.find((g: any) => g.id === goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 })
    }

    const newTask = {
      id: getNextTaskId(),
      goalId,
      type,
      description,
      points,
      completed: completed || false,
      date,
      isTemplate: isTemplate || false, // Add template flag support
      createdAt: new Date().toISOString(),
    }

    tasks.push(newTask)
    writeTasks(tasks)

    return NextResponse.json(newTask)
  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
