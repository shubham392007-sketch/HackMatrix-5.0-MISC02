"use client";

import React from "react";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  BookOpen,
  Trophy,
  ExternalLink,
  Layers,
  Calendar,
  MapPin,
  Building2,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { ShareProjection } from "@/types/sharing";
import { getEvidencePlatform } from "../SkillInspectionModal";

interface PassportOptionalSectionsProps {
  projection: ShareProjection;
  theme?: "classic" | "executive" | "technical" | "dark" | "engineering" | "academic";
  onInspectEvidence?: (evidenceId: string) => void;
  excludeSections?: string[];
}

export default function PassportOptionalSections({
  projection,
  theme = "classic",
  onInspectEvidence,
  excludeSections = [],
}: PassportOptionalSectionsProps) {
  const experiences = projection.workExperience || [];
  const education = projection.education || [];
  const projects = projection.projects || [];
  const certifications = projection.certifications || [];
  const publications = projection.publications || [];
  const achievements = projection.achievements || [];
  const customSections = projection.customSections || [];
  const evidenceList = projection.authorizedEvidence || [];

  const isSectionEnabled = (secKey: string) => {
    if (excludeSections.includes(secKey)) return false;
    if (secKey === "portfolio_projects" && (excludeSections.includes("projects") || excludeSections.includes("portfolio_projects"))) return false;
    if (secKey === "projects" && (excludeSections.includes("projects") || excludeSections.includes("portfolio_projects"))) return false;
    if (secKey === "work_experience" && (excludeSections.includes("work_experience") || excludeSections.includes("experience"))) return false;

    // Check permissions
    const rawPerms: any = (projection as any).permissions || {};
    const secPerms = rawPerms.sections || (projection as any).sections || {};
    if (secKey in secPerms && secPerms[secKey] === false) return false;
    if (secKey === "portfolio_projects" && secPerms["projects"] === false) return false;
    if (secKey === "projects" && secPerms["portfolio_projects"] === false) return false;

    // Check sectionsConfig if available
    if (projection.sectionsConfig) {
      const cfg = projection.sectionsConfig.find(
        (s) =>
          s.id === secKey ||
          (secKey === "portfolio_projects" && s.id === "projects") ||
          (secKey === "projects" && s.id === "portfolio_projects") ||
          (secKey === "work_experience" && s.id === "experience")
      );
      if (cfg && cfg.enabled === false) return false;
    }
    return true;
  };

  const isDark = theme === "dark" || theme === "technical";

  // Section Styles according to theme
  const cardBg = isDark
    ? "bg-[#1C1C1C] text-[#FBF6DF] border-[#FBF6DF]/20 shadow-[3px_3px_0_0_#DFE968]"
    : theme === "executive"
    ? "bg-white text-[#1C1C1C] border-[#1C1C1C]/15 shadow-sm"
    : "bg-white text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C]";

  const headerColor = isDark ? "text-white" : "text-[#1C1C1C]";
  const subtextColor = isDark ? "text-[#FBF6DF]/70" : "text-[#1C1C1C]/70";
  const pillBg = isDark
    ? "bg-white/10 text-[#DFE968] border border-white/15"
    : "bg-stone-100 text-[#1C1C1C] border border-[#1C1C1C]/20";

  return (
    <div className="space-y-8">
      {/* 1. Work Experience Section */}
      {experiences.length > 0 && isSectionEnabled("work_experience") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <span>Work Experience ({experiences.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Demonstrated career history
            </span>
          </div>

          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id} className={`p-5 rounded-xl ${cardBg} space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h3 className={`text-base font-black ${headerColor} leading-tight`}>
                      {exp.jobTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Building2 className="w-3.5 h-3.5" />
                        {exp.organization}
                      </span>
                      {exp.employmentType && (
                        <span className="text-xs opacity-60">· {exp.employmentType}</span>
                      )}
                      {exp.location && (
                        <span className="flex items-center gap-0.5 opacity-60">
                          · <MapPin className="w-3 h-3" /> {exp.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold opacity-75 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                    </span>
                  </div>
                </div>

                {exp.description && (
                  <p className={`text-xs leading-relaxed ${subtextColor}`}>
                    {exp.description}
                  </p>
                )}

                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className="space-y-1.5 pt-1 text-xs">
                    {exp.achievements.map((ach, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">▸</span>
                        <span className={subtextColor}>{ach}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {exp.techStack && exp.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {exp.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${pillBg}`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {exp.attachedEvidenceIds && exp.attachedEvidenceIds.length > 0 && onInspectEvidence && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1C1C1C]/10 text-xs">
                    <span className="text-[11px] font-bold opacity-60">Attached Proof:</span>
                    {exp.attachedEvidenceIds.map((evId) => (
                      <button
                        key={evId}
                        onClick={() => onInspectEvidence(evId)}
                        className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-[10px] font-black hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>Inspect Evidence</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Portfolio Projects Section */}
      {projects.length > 0 && isSectionEnabled("portfolio_projects") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <FolderGit2 className="w-5 h-5 text-indigo-600" />
              <span>Portfolio & Technical Projects ({projects.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Open-source & production implementations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div key={proj.id} className={`p-5 rounded-xl ${cardBg} space-y-3 flex flex-col justify-between`}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-black ${headerColor}`}>{proj.title}</h3>
                    {proj.role && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-900">
                        {proj.role}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs leading-relaxed ${subtextColor}`}>
                    {proj.description}
                  </p>

                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <ul className="space-y-1 text-xs pt-1">
                      {proj.outcomes.map((out, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span className={subtextColor}>{out}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-[#1C1C1C]/10">
                  {proj.techStack && proj.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proj.techStack.map((tech, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold ${pillBg}`}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 text-xs">
                    {proj.repoUrl && (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Source Code</span>
                      </a>
                    )}
                    {proj.liveDemoUrl && (
                      <a
                        href={proj.liveDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Live Demo</span>
                      </a>
                    )}
                    {proj.attachedEvidenceIds && proj.attachedEvidenceIds.length > 0 && onInspectEvidence && (
                      <button
                        onClick={() => onInspectEvidence(proj.attachedEvidenceIds![0])}
                        className="ml-auto inline-flex items-center gap-1 font-black text-emerald-700 hover:underline text-[11px] cursor-pointer"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Proof</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Certifications & Credentials */}
      {certifications.length > 0 && isSectionEnabled("certifications") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <Award className="w-5 h-5 text-amber-600" />
              <span>Certifications & Formal Credentials ({certifications.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Independently verified certifications
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certifications.map((cert) => (
              <div key={cert.id} className={`p-4 rounded-xl ${cardBg} space-y-1.5`}>
                <div className="flex items-start justify-between gap-1">
                  <h4 className={`text-xs font-black ${headerColor}`}>{cert.name}</h4>
                  <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                </div>
                <p className="text-[11px] font-bold text-amber-800">{cert.issuer}</p>
                {cert.issueDate && (
                  <p className="text-[10px] font-mono opacity-60">Issued: {cert.issueDate}</p>
                )}
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline pt-1"
                  >
                    <span>Verify Credential</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Education & Degrees */}
      {education.length > 0 && isSectionEnabled("education") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>Education & Academic Background ({education.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Degrees & formal academic curriculum
            </span>
          </div>

          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id} className={`p-5 rounded-xl ${cardBg} space-y-2`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                  <div>
                    <h3 className={`text-sm font-black ${headerColor}`}>
                      {edu.degree} in {edu.fieldOfStudy}
                    </h3>
                    <p className="text-xs font-bold text-blue-700">{edu.institution}</p>
                  </div>
                  {(edu.startYear || edu.endYear) && (
                    <span className="text-xs font-mono font-bold opacity-60">
                      {edu.startYear} – {edu.endYear || "Present"}
                    </span>
                  )}
                </div>

                {edu.grade && <p className="text-xs opacity-75">Grade: {edu.grade}</p>}
                {edu.activities && <p className="text-xs opacity-75">{edu.activities}</p>}

                {edu.coursework && edu.coursework.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-bold opacity-60 block pb-1">
                      Relevant Coursework:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {edu.coursework.map((course, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold ${pillBg}`}>
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Publications & Research */}
      {publications.length > 0 && isSectionEnabled("publications") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Publications & Research ({publications.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Peer-reviewed papers & technical publications
            </span>
          </div>

          <div className="space-y-3">
            {publications.map((pub) => (
              <div key={pub.id} className={`p-4 rounded-xl ${cardBg} space-y-2`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-xs font-black ${headerColor}`}>{pub.title}</h3>
                  {pub.url && (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold opacity-75">
                  {pub.venue && <span>Venue: {pub.venue}</span>}
                  {pub.date && <span>· {pub.date}</span>}
                  {pub.authors && <span>· Authors: {pub.authors}</span>}
                </div>
                {pub.summary && (
                  <p className={`text-xs leading-relaxed ${subtextColor}`}>{pub.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Honors & Achievements */}
      {achievements.length > 0 && isSectionEnabled("achievements") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Honors & Achievements ({achievements.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Recognitions, patents & competitive awards
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((ach) => (
              <div key={ach.id} className={`p-4 rounded-xl ${cardBg} space-y-1.5`}>
                <div className="flex items-start justify-between gap-1">
                  <h4 className={`text-xs font-black ${headerColor}`}>{ach.title}</h4>
                  {ach.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {ach.category}
                    </span>
                  )}
                </div>
                {ach.organization && (
                  <p className="text-[11px] font-bold opacity-80">{ach.organization}</p>
                )}
                {ach.date && <p className="text-[10px] font-mono opacity-60">{ach.date}</p>}
                {ach.description && (
                  <p className={`text-xs leading-relaxed ${subtextColor}`}>{ach.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Custom Sections */}
      {customSections.length > 0 && isSectionEnabled("custom_sections") && (
        <div className="space-y-6 pt-4 border-t border-[#1C1C1C]/15">
          {customSections.map((sec) => (
            <div key={sec.id} className="space-y-3">
              <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>{sec.title}</span>
              </h2>

              {sec.content && (
                <p className={`text-xs leading-relaxed ${subtextColor} whitespace-pre-line`}>
                  {sec.content}
                </p>
              )}

              {sec.items && sec.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.items.map((item) => (
                    <div key={item.id} className={`p-4 rounded-xl ${cardBg} space-y-1`}>
                      <h4 className={`text-xs font-black ${headerColor}`}>{item.title}</h4>
                      {item.subtitle && (
                        <p className="text-[11px] font-bold opacity-75">{item.subtitle}</p>
                      )}
                      {item.date && (
                        <p className="text-[10px] font-mono opacity-60">{item.date}</p>
                      )}
                      {item.description && (
                        <p className={`text-xs leading-relaxed ${subtextColor}`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {sec.links && sec.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {sec.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-bold text-stone-900"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    
      {/* 8. Authorized Workplace Proof & Evidence Vault */}
      {evidenceList.length > 0 && isSectionEnabled("evidence_vault") && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-black ${headerColor} flex items-center gap-2`}>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Authorized Workplace Proof & Evidence Vault ({evidenceList.length})</span>
            </h2>
            <span className={`text-xs ${subtextColor} font-semibold`}>
              Cryptographically verified candidate deliverables
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidenceList.map((ev) => {
              const plat = getEvidencePlatform(ev);
              return (
                <div
                  key={ev.id}
                  className={`p-5 rounded-xl ${cardBg} space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 max-w-[70%]">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase inline-block mb-1 ${plat.badgeColor}`}>
                          {plat.badgeText}
                        </span>
                        <h3 className={`text-sm font-black ${headerColor} leading-snug`}>
                          {ev.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold shrink-0">
                        Verified
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${subtextColor} line-clamp-3`}>
                      {ev.shortSummary}
                    </p>

                    {ev.relatedSkillName && (
                      <div className="text-[11px] font-medium opacity-75">
                        Corroborates: <strong className={headerColor}>{ev.relatedSkillName}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1C1C1C]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] font-medium opacity-60">
                      {ev.date ? ev.date.split("T")[0] : ev.project}
                    </span>

                    <div className="flex items-center gap-2">
                      {onInspectEvidence && (
                        <button
                          onClick={() => onInspectEvidence(ev.id)}
                          className="px-2.5 py-1 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#1C1C1C]/90 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="w-3 h-3 text-[#DFE968]" />
                          <span>Inspect</span>
                        </button>
                      )}

                      {plat.targetUrl && (
                        <a
                          href={plat.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-full bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] text-[10px] font-bold uppercase tracking-wider hover:bg-[#d4df55] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span>{plat.actionText}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
