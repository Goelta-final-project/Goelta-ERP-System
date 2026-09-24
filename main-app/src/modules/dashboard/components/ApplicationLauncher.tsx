import { Link } from "react-router-dom";
import { Icon } from "../../../shared/ui/Icon";
import { applications } from "../data/applications";

export function ApplicationLauncher() {
  return (
    <section
      aria-labelledby="applications-heading"
      className="application-section"
    >
      <div className="dashboard-section-heading">
        <h2 id="applications-heading">Your applications</h2>
        <span>
          {applications.filter((app) => app.href).length} connected workspaces
        </span>
      </div>
      <div className="application-grid">
        {applications.map((app) => {
          const content = (
            <>
              <span className={`module-icon tone-${app.tone}`}>
                <Icon name={app.icon} size={28} />
              </span>
              <strong>{app.name}</strong>
              <span className="module-description">{app.description}</span>
              <span className="module-status">
                {app.href ? (
                  <>
                    Open workspace <Icon name="arrow" size={13} />
                  </>
                ) : (
                  "Not available yet"
                )}
              </span>
            </>
          );
          return app.href ? (
            <Link key={app.id} className="application-card" to={app.href}>
              {content}
            </Link>
          ) : (
            <div
              key={app.id}
              className="application-card unavailable"
              aria-disabled="true"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
