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

export async function GET(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const goals = await sql`
      SELECT 
        id, 
        user_id, 
        title, 
        description, 
        target_date::text as target_date, 
        created_at::text as created_at
      FROM goals 
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(
      goals.map((goal) => ({
        id: goal.id,
        userId: goal.user_id,
        title: goal.title,
        description: goal.description,
        targetDate: goal.target_date,
        createdAt: goal.created_at,
      })),
    )
  } catch (error) {
    console.error("Goals fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { title, description, targetDate } = await request.json()

    if (!title || !description || !targetDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const newGoal = await sql`
      INSERT INTO goals (user_id, title, description, target_date)
      VALUES (${user.userId}, ${title}, ${description}, ${targetDate})
      RETURNING 
        id, 
        user_id, 
        title, 
        description, 
        target_date::text as target_date, 
        created_at::text as created_at
    `

    const goal = newGoal[0]

    return NextResponse.json({
      id: goal.id,
      userId: goal.user_id,
      title: goal.title,
      description: goal.description,
      targetDate: goal.target_date,
      createdAt: goal.created_at,
    })
  } catch (error) {
    console.error("Goal creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
