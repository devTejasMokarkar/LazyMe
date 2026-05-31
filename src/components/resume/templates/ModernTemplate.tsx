import type { TemplateProps } from './index';

export function ModernTemplate({ data, color, theme }: TemplateProps) {
  const isDark = theme === 'dark';
  const c = isDark ? '#e2e8f0' : '#1e1e2e';
  const subtle = isDark ? '#94a3b8' : '#525252';
  const muted = isDark ? '#64748b' : '#737373';
  const border = isDark ? '#334155' : '#e5e5e5';
  const bg = isDark ? '#1a1b1f' : '#ffffff';

  return (
    <div style={{ backgroundColor: bg, color: c, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: '40px 36px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: color === '#000000' ? (isDark ? '#f1f5f9' : '#1e1e2e') : color }}>
          {data.name || 'Your Name'}
        </h1>
        <p style={{ fontSize: 14, margin: '4px 0 0', color: color === '#000000' ? subtle : color, fontWeight: 500 }}>
          {data.title || 'Your Title'}
        </p>
        <div style={{ fontSize: 11, marginTop: 8, color: muted, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? muted : color }}>
            Summary
          </h2>
          <p style={{ fontSize: 12, lineHeight: '1.65', margin: 0, color: subtle }}>{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? muted : color }}>
            Skills
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.skills.map((s, i) => (
              <span key={i} style={{
                fontSize: 11,
                padding: '3px 10px',
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
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? muted : color }}>
            Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < data.experience.length - 1 ? `1px solid ${border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{exp.role}</span>
                  <span style={{ fontSize: 12, color: muted }}> — {exp.company}</span>
                </div>
                <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{exp.duration}</span>
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, lineHeight: '1.65', color: subtle, listStyle: 'disc' }}>
                {exp.bullets.slice(0, 4).map((b, j) => (
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
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, paddingBottom: 6, borderBottom: i < data.education.length - 1 ? `1px solid ${border}` : 'none' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{edu.degree}</span>
                <span style={{ fontSize: 12, color: muted }}> — {edu.school}</span>
              </div>
              <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{edu.year}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
