import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, existsSync } from "fs"
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

  // Calculate total points from completed tasks
  const totalPoints = userTasks
    .filter((task: any) => task.completed)
    .reduce((sum: number, task: any) => sum + task.points, 0)

  return NextResponse.json({ total: totalPoints })
}
