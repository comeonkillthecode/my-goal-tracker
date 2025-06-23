"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
// Add import for Edit and Trash icons:
import { CheckCircle2, XCircle, Plus, Minus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Task {
  id: number
  goalId: number
  type: "positive" | "negative"
  description: string
  points: number
  completed: boolean
  date: string
}

interface Goal {
  id: number
  title: string
}

// Add new props to TaskListProps interface:
interface TaskListProps {
  tasks: Task[]
  goals: Goal[]
  onTaskToggle: (taskId: number, completed: boolean) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: number) => void
  showActions?: boolean
  compact?: boolean
}

// Update the component signature:
export default function TaskList({
  tasks,
  goals,
  onTaskToggle,
  onEditTask,
  onDeleteTask,
  showActions = false,
  compact = false,
}: TaskListProps) {
  const getGoalTitle = (goalId: number) => {
    const goal = goals.find((g) => g.id === goalId)
    return goal?.title || "Unknown Goal"
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`transition-all duration-200 ${
              task.completed
                ? "bg-gray-50 border-gray-200"
                : task.type === "positive"
                  ? "bg-green-50 border-green-200 hover:bg-green-100"
                  : "bg-red-50 border-red-200 hover:bg-red-100"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onTaskToggle(task.id, checked as boolean)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}
                  >
                    {task.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {task.type === "positive" ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-medium">{task.points}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <Minus className="h-4 w-4" />
                      <span className="text-sm font-medium">{Math.abs(task.points)}</span>
                    </div>
                  )}

                  {task.completed &&
                    (task.type === "positive" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ))}

                  {showActions && onEditTask && onDeleteTask && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTask(task.id)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      const goalTitle = getGoalTitle(task.goalId)
      if (!acc[goalTitle]) {
        acc[goalTitle] = []
      }
      acc[goalTitle].push(task)
      return acc
    },
    {} as Record<string, Task[]>,
  )

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([goalTitle, goalTasks]) => (
        <div key={goalTitle} className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <span>{goalTitle}</span>
            <Badge variant="secondary" className="text-xs">
              {goalTasks.filter((t) => t.completed).length}/{goalTasks.length}
            </Badge>
          </h4>

          <div className="space-y-2">
            {goalTasks.map((task) => (
              <Card
                key={task.id}
                className={`transition-all duration-200 ${
                  task.completed
                    ? "bg-gray-50 border-gray-200"
                    : task.type === "positive"
                      ? "bg-green-50 border-green-200 hover:bg-green-100"
                      : "bg-red-50 border-red-200 hover:bg-red-100"
                }`}
              >
                {/* Update the task card content to include action buttons: */}
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => onTaskToggle(task.id, checked as boolean)}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          task.completed ? "line-through text-gray-500" : "text-gray-900"
                        }`}
                      >
                        {task.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {task.type === "positive" ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm font-medium">{task.points}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <Minus className="h-4 w-4" />
                          <span className="text-sm font-medium">{Math.abs(task.points)}</span>
                        </div>
                      )}

                      {task.completed &&
                        (task.type === "positive" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ))}

                      {showActions && onEditTask && onDeleteTask && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTask(task)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTask(task.id)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
