import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { sql } from "@/lib/db"

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

    const updatedGoal = await sql`
      UPDATE goals 
      SET title = ${title}, description = ${description}, target_date = ${targetDate}
      WHERE id = ${goalId} AND user_id = ${user.userId}
      RETURNING id, user_id, title, description, target_date, created_at
    `

    if (updatedGoal.length === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const goal = updatedGoal[0]

    return NextResponse.json({
      id: goal.id,
      userId: goal.user_id,
      title: goal.title,
      description: goal.description,
      targetDate: goal.target_date,
      createdAt: goal.created_at,
    })
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

    // Delete goal (tasks will be deleted automatically due to CASCADE)
    const deletedGoal = await sql`
      DELETE FROM goals 
      WHERE id = ${goalId} AND user_id = ${user.userId}
      RETURNING id
    `

    if (deletedGoal.length === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Goal deleted successfully" })
  } catch (error) {
    console.error("Goal deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
