import type { TemplateProps } from './index';

export function ClassicTemplate({ data, color, theme }: TemplateProps) {
  const isDark = theme === 'dark';
  const c = isDark ? '#e2e8f0' : '#1e1e2e';
  const subtle = isDark ? '#94a3b8' : '#525252';
  const muted = isDark ? '#64748b' : '#737373';
  const border = isDark ? '#334155' : '#d4d4d4';
  const bg = isDark ? '#1a1b1f' : '#ffffff';

  return (
    <div style={{ backgroundColor: bg, color: c, fontFamily: "'Times New Roman', 'Georgia', serif", padding: '48px 40px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, borderBottom: `2px solid ${border}`, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', margin: 0, color: color === '#000000' ? (isDark ? '#f1f5f9' : '#1e1e2e') : color }}>
          {data.name || 'Your Name'}
        </h1>
        <p style={{ fontSize: 13, margin: '6px 0 0', color: subtle, fontWeight: 600, fontStyle: 'italic' }}>
          {data.title || 'Your Title'}
        </p>
        <div style={{ fontSize: 11, marginTop: 10, color: muted, letterSpacing: 0.5 }}>
          {[data.email, data.phone, data.location].filter(Boolean).join('  |  ')}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? c : color, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
            Professional Summary
          </h2>
          <p style={{ fontSize: 12, lineHeight: '1.6', margin: 0, color: subtle }}>{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px', color: color === '#000000' ? c : color, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
            Core Competencies
          </h2>
          <p style={{ fontSize: 12, lineHeight: 1.8, margin: 0, color: subtle }}>
            {data.skills.join('  ·  ')}
          </p>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? c : color, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
            Professional Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{exp.role}</span>
                  <span style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}> — {exp.company}</span>
                </div>
                <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{exp.duration}</span>
              </div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: '1.6', color: subtle, listStyle: 'disc' }}>
                {exp.bullets.slice(0, 4).map((b, j) => (
                  <li key={j} style={{ marginBottom: 2 }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px', color: color === '#000000' ? c : color, borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
            Education
          </h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{edu.degree}</span>
                  <span style={{ fontSize: 12, color: muted }}> — {edu.school}</span>
                </div>
                <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{edu.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
