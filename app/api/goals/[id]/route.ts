import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const GOALS_FILE = join(DATA_DIR, "goals.json")
const TASKS_FILE = join(DATA_DIR, "tasks.json")

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

function writeGoals(goals: any[]) {
  writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2))
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const goalId = Number.parseInt(params.id)
    const { title, description, targetDate } = await request.json()

    const goals = readGoals()
    const goalIndex = goals.findIndex((g: any) => g.id === goalId && g.userId === user.userId)

    if (goalIndex === -1) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    goals[goalIndex] = {
      ...goals[goalIndex],
      title,
      description,
      targetDate,
    }

    writeGoals(goals)
    return NextResponse.json(goals[goalIndex])
  } catch (error) {
    console.error("Goal update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const goalId = Number.parseInt(params.id)

    const goals = readGoals()
    const goalIndex = goals.findIndex((g: any) => g.id === goalId && g.userId === user.userId)

    if (goalIndex === -1) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Remove goal
    goals.splice(goalIndex, 1)
    writeGoals(goals)

    // Remove associated tasks
    const tasks = readTasks()
    const filteredTasks = tasks.filter((t: any) => t.goalId !== goalId)
    writeTasks(filteredTasks)

    return NextResponse.json({ message: "Goal deleted successfully" })
  } catch (error) {
    console.error("Goal deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
