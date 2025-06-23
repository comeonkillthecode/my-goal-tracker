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

export async function DELETE(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId, taskId } = await request.json()

    const goals = readGoals()
    const tasks = readTasks()

    // Verify goal belongs to user
    const goal = goals.find((g: any) => g.id === goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Find the task to get its description for matching
    const taskToDelete = tasks.find((t: any) => t.id === taskId)
    if (!taskToDelete) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Delete all tasks for this goal that have the same description and type
    // This ensures we delete all daily instances of the same task
    const filteredTasks = tasks.filter((task: any) => {
      return !(
        task.goalId === goalId &&
        task.description === taskToDelete.description &&
        task.type === taskToDelete.type
      )
    })

    writeTasks(filteredTasks)
    return NextResponse.json({ message: "All task instances deleted successfully" })
  } catch (error) {
    console.error("Task deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
