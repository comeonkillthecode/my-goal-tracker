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

function getNextGoalId() {
  const goals = readGoals()
  return goals.length > 0 ? Math.max(...goals.map((g: any) => g.id)) + 1 : 1
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

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const importData = await request.json()

    // Validate import data structure
    if (
      !importData.goals ||
      !importData.tasks ||
      !Array.isArray(importData.goals) ||
      !Array.isArray(importData.tasks)
    ) {
      return NextResponse.json({ error: "Invalid import data format" }, { status: 400 })
    }

    const existingGoals = readGoals()
    const existingTasks = readTasks()

    // Create ID mapping for goals (old ID -> new ID)
    const goalIdMapping: Record<number, number> = {}
    let nextGoalId = getNextGoalId()
    let nextTaskId = getNextTaskId()

    // Import goals with new IDs and current user ID
    const importedGoals = importData.goals.map((goal: any) => {
      const oldId = goal.id
      const newId = nextGoalId++
      goalIdMapping[oldId] = newId

      return {
        ...goal,
        id: newId,
        userId: user.userId, // Assign to current user
        createdAt: goal.createdAt || new Date().toISOString(),
      }
    })

    // Import tasks with new IDs and mapped goal IDs
    const importedTasks = importData.tasks.map((task: any) => {
      const newGoalId = goalIdMapping[task.goalId]
      if (!newGoalId) {
        throw new Error(`Goal ID ${task.goalId} not found in mapping`)
      }

      return {
        ...task,
        id: nextTaskId++,
        goalId: newGoalId,
        createdAt: task.createdAt || new Date().toISOString(),
      }
    })

    // Merge with existing data
    const allGoals = [...existingGoals, ...importedGoals]
    const allTasks = [...existingTasks, ...importedTasks]

    // Save to files
    writeGoals(allGoals)
    writeTasks(allTasks)

    return NextResponse.json({
      message: "Data imported successfully",
      imported: {
        goals: importedGoals.length,
        tasks: importedTasks.length,
      },
      statistics: {
        totalGoals: allGoals.filter((g: any) => g.userId === user.userId).length,
        totalTasks: allTasks.filter((t: any) => {
          const goalIds = allGoals.filter((g: any) => g.userId === user.userId).map((g: any) => g.id)
          return goalIds.includes(t.goalId)
        }).length,
      },
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Import failed: " + (error as Error).message }, { status: 500 })
  }
}
