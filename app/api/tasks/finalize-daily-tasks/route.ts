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

function getNextTaskId() {
  const tasks = readTasks()
  return tasks.length > 0 ? Math.max(...tasks.map((t: any) => t.id)) + 1 : 1
}

// Generate all daily instances of tasks from today until goal deadline
function generateDailyTaskInstances(taskTemplates: any[], goalDeadline: string) {
  const tasks = []
  const today = new Date()
  const deadline = new Date(goalDeadline)

  // Generate tasks for each day from today until deadline
  for (let date = new Date(today); date <= deadline; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split("T")[0]

    taskTemplates.forEach((template) => {
      tasks.push({
        ...template,
        date: dateStr,
        completed: false,
        isTemplate: false, // Remove template flag
      })
    })
  }

  return tasks
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

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId } = await request.json()

    // Get goal details
    const goals = readGoals()
    const goal = goals.find((g: any) => g.id === goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const tasks = readTasks()

    // Find template tasks for this goal
    const templateTasks = tasks.filter((t: any) => t.goalId === goalId && t.isTemplate === true)

    if (templateTasks.length === 0) {
      return NextResponse.json({ error: "No template tasks found" }, { status: 404 })
    }

    // Remove template tasks from storage
    const nonTemplateTasks = tasks.filter((t: any) => !(t.goalId === goalId && t.isTemplate === true))

    // Generate daily task instances from today until goal deadline
    const dailyTasks = generateDailyTaskInstances(templateTasks, goal.targetDate)

    let nextTaskId = getNextTaskId()

    // Create new task instances with proper IDs
    const newTasks = dailyTasks.map((task: any) => ({
      ...task,
      id: nextTaskId++,
      createdAt: new Date().toISOString(),
    }))

    // Save all tasks
    const allTasks = [...nonTemplateTasks, ...newTasks]
    writeTasks(allTasks)

    // Calculate statistics
    const daysGenerated =
      Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      message: "Daily tasks finalized successfully",
      totalTasksGenerated: newTasks.length,
      daysGenerated,
      tasksPerDay: templateTasks.length,
    })
  } catch (error) {
    console.error("Task finalization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
