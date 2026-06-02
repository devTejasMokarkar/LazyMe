import type { ResumeWordedTemplateProps } from './index';

export function ResumeWordedTemplate({ data }: ResumeWordedTemplateProps) {
  const hasSkills = Object.values(data.skills).some(arr => arr.length > 0);
  const skillCategories: Array<{ label: string; items: string[] }> = [
    { label: 'Technical Skills', items: data.skills.technicalSkills },
    { label: 'Frameworks', items: data.skills.frameworks },
    { label: 'Databases', items: data.skills.databases },
    { label: 'Cloud & DevOps', items: data.skills.cloudDevOps },
    { label: 'Industry Knowledge', items: data.skills.industryKnowledge },
  ];

  return (
    <div style={{
      backgroundColor: '#ffffff',
      color: '#222222',
      fontFamily: "'Inter', 'Calibri', 'Arial', sans-serif",
      padding: '30px 32px',
      minHeight: '1123px',
      height: 'auto',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: '#111111',
          lineHeight: 1.2,
        }}>
          {data.name || 'Your Name'}
        </h1>
        <p style={{
          fontSize: 13,
          margin: '4px 0 0',
          color: '#444444',
          fontWeight: 500,
        }}>
          {data.title || 'Professional Title'}
        </p>
        <div style={{
          fontSize: 10.5,
          marginTop: 8,
          color: '#666666',
          lineHeight: 1.4,
        }}>
          {[
            data.contact.location,
            data.contact.phone,
            data.contact.email,
            data.contact.linkedin,
          ].filter(Boolean).join('  |  ')}
        </div>
      </div>

      {/* WORK EXPERIENCE */}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#333333',
            borderBottom: '1px solid #cccccc',
            paddingBottom: 4,
            marginBottom: 12,
          }}>
            Work Experience
          </div>
          {data.experience.map((exp, i) => (
            <div key={i} style={{
              marginBottom: i < data.experience.length - 1 ? 14 : 0,
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111111',
                }}>
                  {exp.company}
                </span>
                <span style={{
                  fontSize: 10.5,
                  color: '#666666',
                  whiteSpace: 'nowrap',
                  marginLeft: 8,
                }}>
                  {exp.dates}
                </span>
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#333333',
                marginTop: 1,
              }}>
                {exp.title}
              </div>
              {exp.companyDescription && (
                <div style={{
                  fontSize: 10.5,
                  fontStyle: 'italic',
                  color: '#777777',
                  marginTop: 1,
                }}>
                  {exp.companyDescription}
                </div>
              )}
              <ul style={{
                margin: '4px 0 0',
                paddingLeft: 16,
                fontSize: 10.5,
                lineHeight: 1.45,
                color: '#333333',
                listStyle: 'disc',
              }}>
                {(exp.bullets || []).map((b, j) => (
                  <li key={j} style={{ marginBottom: 1 }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* EDUCATION */}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#333333',
            borderBottom: '1px solid #cccccc',
            paddingBottom: 4,
            marginBottom: 10,
          }}>
            Education
          </div>
          {data.education.map((edu, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 4,
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}>
              <div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#111111',
                }}>
                  {edu.institution}
                </span>
                <span style={{
                  fontSize: 11,
                  color: '#555555',
                  marginLeft: 4,
                }}>
                  — {edu.degree}
                </span>
              </div>
              <span style={{
                fontSize: 10.5,
                color: '#666666',
                whiteSpace: 'nowrap',
                marginLeft: 8,
              }}>
                {edu.graduationDate}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* SKILLS */}
      {hasSkills && (
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#333333',
            borderBottom: '1px solid #cccccc',
            paddingBottom: 4,
            marginBottom: 10,
          }}>
            Skills
          </div>
          {skillCategories.filter(cat => cat.items.length > 0).map((cat, i) => (
            <div key={i} style={{
              display: 'flex',
              marginBottom: 3,
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: '#333333',
                minWidth: 130,
                flexShrink: 0,
              }}>
                {cat.label}:
              </span>
              <span style={{
                fontSize: 10.5,
                color: '#444444',
                lineHeight: 1.4,
              }}>
                {cat.items.join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
