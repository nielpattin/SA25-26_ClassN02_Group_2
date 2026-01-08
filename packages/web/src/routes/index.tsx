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
          <div className="hero-logo">KYTE</div>
          <h1>Organize your work, simply.</h1>
          <p className="hero-subtitle">
            A clean, minimalist Kanban board for personal and team productivity.
          </p>
          <div className="cta-group">
            <Link to="/dashboard" className="btn-primary">
              <span>Start Free</span>
            </Link>
            <a href="https://github.com" className="btn-secondary">
              <span>View Source</span>
            </a>
          </div>
        </div>
      </main>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <h3>Team Stays in Sync</h3>
            <p>Everyone sees updates the moment they happen. No refresh, no conflicts.</p>
          </div>
          <div className="feature-card">
            <h3>Minimalist by Design</h3>
            <p>A clean interface that gets out of your way. Focus on work, not the tool.</p>
          </div>
          <div className="feature-card">
            <h3>Instant Everything</h3>
            <p>Drag, drop, edit — every action feels immediate.</p>
          </div>
        </div>
      </section>

      <section className="tech-section">
        <p className="tech-label">BUILT WITH</p>
        <div className="tech-grid">
          <span className="tech-badge">Bun</span>
          <span className="tech-badge">Elysia</span>
          <span className="tech-badge">React</span>
          <span className="tech-badge">PostgreSQL</span>
          <span className="tech-badge">Drizzle</span>
        </div>
      </section>

      <footer className="footer-badge">
        <span className="accent">v0.1.0</span>
        <span className="footer-divider">•</span>
        <a href="https://github.com/nielpattin/SA25-26_ClassN02_Group_2" className="footer-link">Star on GitHub</a>
      </footer>
    </div>
  )
}
