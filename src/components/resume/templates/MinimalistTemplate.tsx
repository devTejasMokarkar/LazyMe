import type { TemplateProps } from './index';

export function MinimalistTemplate({ data, color, theme }: TemplateProps) {
  const isDark = theme === 'dark';
  const c = isDark ? '#e2e8f0' : '#1a1a1a';
  const subtle = isDark ? '#94a3b8' : '#595959';
  const muted = isDark ? '#64748b' : '#8c8c8c';
  const divider = isDark ? '#2a2b2f' : '#ebebeb';
  const bg = isDark ? '#18181b' : '#fafafa';

  return (
    <div style={{ backgroundColor: bg, color: c, fontFamily: "'Inter', 'SF Pro Text', -apple-system, sans-serif", padding: '32px 34px', minHeight: '1123px', height: 'auto' }}>
      {/* Header — Right-aligned for minimalist character */}
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <h1 style={{ fontSize: 25, fontWeight: 250, letterSpacing: 1.2, textTransform: 'uppercase', margin: 0, color: color === '#000000' ? (isDark ? '#f1f5f9' : '#1a1a1a') : color }}>
          {data.name || 'Your Name'}
        </h1>
        <p style={{ fontSize: 13, margin: '6px 0 0', color: subtle, fontWeight: 400, letterSpacing: 1 }}>
          {data.title || 'Your Title'}
        </p>
        <div style={{ fontSize: 10, marginTop: 6, color: muted, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          {[data.email, data.phone, data.location].filter(Boolean).map((item, i, arr) => (
            <span key={i}>{item}{i < arr.length - 1 ? '  /' : ''}</span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 14, paddingTop: 10, borderTop: `1px solid ${divider}`, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: 11, lineHeight: '1.35', margin: 0, color: subtle, fontWeight: 300 }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* Skills — inline minimal */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 14, paddingTop: 10, borderTop: `1px solid ${divider}`, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: 11, lineHeight: '1.35', margin: 0, color: subtle, fontWeight: 300 }}>
            {data.skills.map((s, i) => (
              <span key={i}>
                <span style={{ fontWeight: i % 2 === 0 ? 400 : 300 }}>{s}</span>
                {i < data.skills.length - 1 && <span style={{ color: muted, margin: '0 4px' }}>—</span>}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 14, paddingTop: 10, borderTop: `1px solid ${divider}` }}>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: i < data.experience.length - 1 ? 12 : 0, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>{exp.role}</span>
                <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{exp.duration}</span>
              </div>
              <p style={{ fontSize: 11, color: muted, margin: 0, fontWeight: 400 }}>{exp.company}</p>
              <ul style={{ margin: '4px 0 0', paddingLeft: 12, fontSize: 10.5, lineHeight: '1.35', color: subtle, fontWeight: 300, listStyle: 'none' }}>
                {(exp.bullets || []).map((b, j) => (
                  <li key={j} style={{ marginBottom: 1 }}>
                    <span style={{ color: muted, marginRight: 6 }}>—</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div style={{ paddingTop: 10, borderTop: `1px solid ${divider}` }}>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: i < data.education.length - 1 ? 6 : 0, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{edu.degree}</span>
                  <span style={{ fontSize: 11, color: muted }}> — {edu.school}</span>
                </div>
                <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{edu.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div style={{ paddingTop: 10, borderTop: `1px solid ${divider}` }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3, color: muted, margin: '0 0 10px' }}>Projects</p>
          {data.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: i < data.projects!.length - 1 ? 8 : 0, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{proj.name}</span>
                {proj.date && <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{proj.date}</span>}
              </div>
              {proj.bullets && proj.bullets.length > 0 && (
                <ul style={{ margin: '3px 0 0', paddingLeft: 14, fontSize: 11, lineHeight: '1.35', color: muted, listStyle: 'disc' }}>
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
