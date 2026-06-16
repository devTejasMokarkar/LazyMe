import type { TemplateProps } from './index';

export function ModernTemplate({ data, color, theme }: TemplateProps) {
  const isDark = theme === 'dark';
  const c = isDark ? '#e2e8f0' : '#1e1e2e';
  const subtle = isDark ? '#94a3b8' : '#525252';
  const muted = isDark ? '#64748b' : '#737373';
  const border = isDark ? '#334155' : '#e5e5e5';
  const bg = isDark ? '#1a1b1f' : '#ffffff';

  return (
    <div style={{ backgroundColor: bg, color: c, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: '28px 30px', minHeight: '1123px', height: 'auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 14, paddingBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: color === '#000000' ? (isDark ? '#f1f5f9' : '#1e1e2e') : color }}>
          {data.name || 'Your Name'}
        </h1>
        <p style={{ fontSize: 12, margin: '3px 0 0', color: color === '#000000' ? subtle : color, fontWeight: 500 }}>
          {data.title || 'Your Title'}
        </p>
        <div style={{ fontSize: 10, marginTop: 6, color: muted, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 14, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? muted : color }}>
            Summary
          </h2>
          <p style={{ fontSize: 11, lineHeight: '1.42', margin: 0, color: subtle }}>{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? muted : color }}>
            Skills
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.skills.map((s, i) => (
              <span key={i} style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 4,
                backgroundColor: color === '#000000'
                  ? (isDark ? '#2a2b2f' : '#f5f5f5')
                  : `${color}15`,
                color: color === '#000000' ? c : color,
                fontWeight: 500,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? muted : color }}>
            Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: i < data.experience.length - 1 ? `1px solid ${border}` : 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{exp.role}</span>
                  <span style={{ fontSize: 11, color: muted }}> — {exp.company}</span>
                </div>
                <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{exp.duration}</span>
              </div>
              <ul style={{ margin: '3px 0 0', paddingLeft: 14, fontSize: 11, lineHeight: '1.35', color: subtle, listStyle: 'disc' }}>
                {(exp.bullets || []).map((b, j) => (
                  <li key={j} style={{ marginBottom: 1 }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? muted : color }}>
            Education
          </h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, paddingBottom: 5, borderBottom: i < data.education.length - 1 ? `1px solid ${border}` : 'none', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{edu.degree}</span>
                <span style={{ fontSize: 12, color: muted }}> — {edu.school}</span>
              </div>
              <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{edu.year}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? muted : color }}>
            Projects
          </h2>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 10, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{proj.name}</span>
                {proj.date && <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{proj.date}</span>}
              </div>
              {proj.bullets && proj.bullets.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 11, lineHeight: '1.4', color: muted, listStyle: 'disc' }}>
                  {proj.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: 1 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
