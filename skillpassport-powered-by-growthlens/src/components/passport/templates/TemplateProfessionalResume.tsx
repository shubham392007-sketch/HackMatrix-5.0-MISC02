"use client";

import React from "react";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  BookOpen,
  Mail,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  AlertCircle,
  FileText,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";

export default function TemplateProfessionalResume({
  projection,
  onSelectSkill,
  onInspectEvidence,
  onOpenContact,
  isPreview,
}: TemplateProps) {
  const profile = projection.candidateProfile;
  const verifiedSkills = projection.verifiedSkills || [];
  const customSkills = projection.customSkills || [];
  const experiences = projection.workExperience || [];
  const education = projection.education || [];
  const projects = projection.projects || [];
  const certifications = projection.certifications || [];
  const publications = projection.publications || [];
  const achievements = projection.achievements || [];
  const customSections = projection.customSections || [];

  return (
    <div className="max-w-4xl mx-auto bg-white text-[#1C1C1C] p-8 sm:p-12 rounded-2xl border-[1.5px] border-[#1C1C1C]/20 shadow-sm space-y-7 font-sans print:border-none print:shadow-none print:p-0">
      {/* 1. Resume Header */}
      <div className="border-b-[2px] border-[#1C1C1C] pb-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1C1C]">
              {profile.displayName || "Candidate Resume"}
            </h1>
            {profile.headline && (
              <p className="text-base font-semibold text-[#1C1C1C]/80">
                {profile.headline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Verified Competencies Attached
            </span>

            {projection.allowRecruiterMessaging && onOpenContact && (
              <button
                onClick={onOpenContact}
                className="px-4 py-1.5 rounded bg-[#1C1C1C] hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer print:hidden transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Contact</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact Strip */}
        {(profile.contactEmail || profile.contactLinkedIn) && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#1C1C1C]/75 pt-1">
            {profile.contactEmail && (
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                {profile.contactEmail}
              </span>
            )}
            {profile.contactLinkedIn && (
              <a
                href={
                  profile.contactLinkedIn.startsWith("http")
                    ? profile.contactLinkedIn
                    : `https://${profile.contactLinkedIn}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-800 hover:underline font-medium"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Professional Summary */}
        {profile.summary && (
          <p className="text-xs text-[#1C1C1C]/85 leading-relaxed pt-2 border-t border-stone-200">
            {profile.summary}
          </p>
        )}
      </div>

      {/* 2. Chronological Work Experience */}
      {experiences.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <Briefcase className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Professional Experience
            </h2>
          </div>

          <div className="space-y-5">
            {experiences.map((exp) => (
              <div key={exp.id} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1C]">{exp.jobTitle}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#1C1C1C]/80 font-medium">
                      <span className="font-semibold text-emerald-900">{exp.organization}</span>
                      {exp.location && <span>· {exp.location}</span>}
                      {exp.employmentType && <span>· {exp.employmentType}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#1C1C1C]/60 shrink-0 font-medium">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>

                <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">{exp.description}</p>

                {/* Achievements Bullets */}
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs text-[#1C1C1C]/80 pl-1">
                    {exp.achievements.map((ach, i) => (
                      <li key={i} className="leading-relaxed">
                        {ach}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tech Stack */}
                {exp.techStack && exp.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {exp.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Verified Competencies & Skills */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#1C1C1C]/20 pb-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Verified Competencies ({verifiedSkills.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-800">
            Backed by Authoritative Evidence
          </span>
        </div>

        {verifiedSkills.length === 0 ? (
          <p className="text-xs text-[#1C1C1C]/60 italic">
            No verified competencies authorized for display.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-3.5 rounded-lg border border-stone-300 hover:border-[#1C1C1C] hover:bg-stone-50/80 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1C1C]">{skill.canonicalName}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    {skill.verifiedProficiency}
                  </span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/70 line-clamp-2">{skill.description}</p>
                <div className="flex items-center justify-between text-[10px] text-[#1C1C1C]/50 pt-1 border-t border-stone-200 font-mono">
                  <span>{skill.category}</span>
                  <span className="text-emerald-800 font-medium">
                    {skill.evidenceCount} verified artifacts &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Self-Declared Skills (Clearly Labeled) */}
      {customSkills.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                Additional Skills
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Self-Declared · Not independently verified
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {customSkills.map((skill) => (
              <span
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50/70 border border-amber-300 text-xs font-medium text-[#1C1C1C] hover:bg-amber-100 cursor-pointer transition-colors"
              >
                <span>{skill.title}</span>
                <span className="text-[10px] text-amber-800 font-mono">
                  ({skill.selfAssessedLevel})
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 5. Key Projects */}
      {projects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <FolderGit2 className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Technical Projects & Portfolios
            </h2>
          </div>

          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.id} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#1C1C1C]">{proj.title}</h3>
                    {proj.role && (
                      <span className="text-stone-500 font-medium">({proj.role})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {proj.repoUrl && (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-800 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        Code <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {proj.liveDemoUrl && (
                      <a
                        href={proj.liveDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-800 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        Demo <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-stone-700 leading-relaxed">{proj.description}</p>

                {proj.outcomes && proj.outcomes.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-stone-700 pl-1">
                    {proj.outcomes.map((out, i) => (
                      <li key={i}>{out}</li>
                    ))}
                  </ul>
                )}

                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {proj.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Education */}
      {education.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Education & Academics
            </h2>
          </div>

          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id} className="space-y-1 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-[#1C1C1C]">
                      {edu.degree} in {edu.fieldOfStudy}
                    </h3>
                    <p className="text-emerald-900 font-medium">{edu.institution}</p>
                  </div>
                  {(edu.startYear || edu.endYear) && (
                    <span className="font-mono text-stone-500">
                      {edu.startYear} – {edu.endYear || "Present"}
                    </span>
                  )}
                </div>
                {edu.coursework && edu.coursework.length > 0 && (
                  <p className="text-stone-600 text-[11px]">
                    <strong className="text-stone-800">Relevant Coursework:</strong>{" "}
                    {edu.coursework.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Certifications & Credentials */}
      {certifications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <Award className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Certifications & Credentials
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {certifications.map((c) => (
              <div key={c.id} className="p-3 rounded border border-stone-200 space-y-1">
                <div className="font-bold text-[#1C1C1C]">{c.name}</div>
                <div className="text-stone-600 flex items-center justify-between text-[11px]">
                  <span>{c.issuer}</span>
                  {c.issueDate && <span className="font-mono">{c.issueDate}</span>}
                </div>
                {c.credentialUrl && (
                  <a
                    href={c.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-emerald-800 hover:underline flex items-center gap-1 pt-0.5"
                  >
                    <span>View Credential</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Publications & Writing */}
      {publications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Publications & Writing
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {publications.map((pub) => (
              <div key={pub.id} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-[#1C1C1C]">{pub.title}</h3>
                  {pub.date && <span className="font-mono text-stone-500">{pub.date}</span>}
                </div>
                {pub.venue && <p className="italic text-stone-600 text-[11px]">{pub.venue}</p>}
                {pub.summary && <p className="text-stone-700 text-[11px]">{pub.summary}</p>}
                {pub.url && (
                  <a
                    href={pub.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-800 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    <span>Read Publication</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Honors & Achievements */}
      {achievements.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1.5">
            <Award className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Honors & Achievements
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {achievements.map((ach) => (
              <div key={ach.id} className="p-3 rounded border border-stone-200 space-y-1">
                <div className="font-bold text-[#1C1C1C] flex items-center justify-between">
                  <span>{ach.title}</span>
                  {ach.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono">
                      {ach.category}
                    </span>
                  )}
                </div>
                {ach.organization && <p className="text-stone-600 text-[11px] font-medium">{ach.organization}</p>}
                {ach.date && <p className="text-stone-500 text-[10px] font-mono">{ach.date}</p>}
                {ach.description && <p className="text-stone-700 text-[11px] leading-relaxed">{ach.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. Custom Sections (if enabled) */}
      {customSections.filter((cs) => cs.enabled !== false).map((cs) => (
        <section key={cs.id} className="space-y-3">
          <div className="border-b border-[#1C1C1C]/20 pb-1.5">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              {cs.title}
            </h2>
          </div>
          {cs.content && <p className="text-xs text-stone-700 leading-relaxed">{cs.content}</p>}
        </section>
      ))}
    </div>
  );
}
