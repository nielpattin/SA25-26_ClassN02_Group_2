import { createFileRoute, Link } from '@tanstack/react-router'
import './index.css'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="home-container">
      <main className="hero-section">
        <div className="hero-content">
          <h1>Streamline Your Workflow with Kyte</h1>
          <p className="hero-subtitle">
            The minimalist kanban board for high-performance teams. 
            Real-time, type-safe, and built for speed.
          </p>
          <div className="cta-group">
            <Link to="/dashboard" className="btn-primary">
              <span>Get Started</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}