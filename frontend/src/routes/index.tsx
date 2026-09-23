import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, FileText, FolderOpen, Inbox } from "lucide-react"
import { fetchTasks } from "@/api/tasks"
import { useCounts } from "@/hooks/useCounts"

export const Route = createFileRoute("/")({ component: TodayPage })

function TodayPage() {
  const now = new Date()
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const { data: counts } = useCounts()
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["today", "tasks"],
    queryFn: () => fetchTasks({ limit: 100 }),
  })
  const nextTasks = (tasks?.items ?? [])
    .filter((task) => task.status !== "done")
    .sort((first, second) => {
      const firstDeadline = first.deadline?.slice(0, 10) ?? "9999-12-31"
      const secondDeadline = second.deadline?.slice(0, 10) ?? "9999-12-31"
      return firstDeadline.localeCompare(secondDeadline)
    })
    .slice(0, 5)

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="home-date">{dateLabel}</p>
          <h1 id="home-title">Today.</h1>
          <p>A clear place to decide what comes next.</p>
        </div>
        <div className="home-daymark" aria-hidden="true">{String(now.getDate()).padStart(2, "0")}</div>
      </section>

      <section className="home-section" aria-labelledby="next-up-title">
        <div className="home-section-head">
          <h2 id="next-up-title">Next up</h2>
          <Link to="/tasks">All tasks <ArrowUpRight size={14} /></Link>
        </div>
        {isLoading ? (
          <div className="home-empty"><p>Loading your tasks…</p></div>
        ) : nextTasks.length > 0 ? (
          <div>
            {nextTasks.map((task) => (
              <Link key={task.id} to="/tasks/$taskId" params={{ taskId: String(task.id) }} className="home-task">
                <span className="home-task-dot" aria-hidden="true" />
                <span className="home-task-title">{task.title}</span>
                <span className="home-task-meta">
                  {task.deadline ? task.deadline.slice(0, 10) === today ? "Due today" : `Due ${task.deadline.slice(0, 10)}` : task.status === "backlog" ? "No deadline" : task.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <strong>No open tasks right now.</strong>
            <p>Use Tasks to add the next thing that needs doing.</p>
          </div>
        )}
      </section>

      <nav className="home-spaces" aria-label="Your spaces">
        <Link to="/inbox" className="home-space">
          <Inbox size={20} strokeWidth={1.7} aria-hidden="true" />
          <strong>Inbox</strong>
          <span>{counts?.inbox ?? 0} captured items</span>
        </Link>
        <Link to="/notes" className="home-space">
          <FileText size={20} strokeWidth={1.7} aria-hidden="true" />
          <strong>Notes</strong>
          <span>{counts?.notes ?? 0} saved notes</span>
        </Link>
        <Link to="/projects" className="home-space">
          <FolderOpen size={20} strokeWidth={1.7} aria-hidden="true" />
          <strong>Projects</strong>
          <span>{counts?.projects ?? 0} projects</span>
        </Link>
      </nav>
    </div>
  )
}
