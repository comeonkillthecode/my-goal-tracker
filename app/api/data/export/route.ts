import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")
const GOALS_FILE = join(DATA_DIR, "goals.json")
const TASKS_FILE = join(DATA_DIR, "tasks.json")

function readUsers() {
  if (!existsSync(USERS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(USERS_FILE, "utf8")
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

  try {
    const users = readUsers()
    const goals = readGoals()
    const tasks = readTasks()

    // Get user data (without password)
    const userData = users.find((u: any) => u.id === user.userId)
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Filter user's goals and tasks
    const userGoals = goals.filter((g: any) => g.userId === user.userId)
    const userGoalIds = userGoals.map((g: any) => g.id)
    const userTasks = tasks.filter((t: any) => userGoalIds.includes(t.goalId))

    // Create export data
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      user: {
        id: userData.id,
        username: userData.username,
        grokApiId: userData.grokApiId,
        createdAt: userData.createdAt,
      },
      goals: userGoals,
      tasks: userTasks,
      statistics: {
        totalGoals: userGoals.length,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter((t: any) => t.completed).length,
        totalPoints: userTasks.filter((t: any) => t.completed).reduce((sum: number, task: any) => sum + task.points, 0),
      },
    }

    // Return as downloadable JSON
    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mygoaltracker-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })

    return response
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
