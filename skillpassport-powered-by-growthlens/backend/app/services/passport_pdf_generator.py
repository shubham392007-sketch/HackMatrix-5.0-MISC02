"""
SkillPassport Powered by GrowthLens — Production Evidence-Linked PDF Generator
==============================================================================
Generates genuine, high-fidelity, vector PDF documents with selectable text,
clickable hyperlinks to evidence artifacts, multi-page pagination ("Page X of Y"),
and exact adherence to the user's saved Passport Content Builder customizations.

Compliant with ISO 32000 (PDF Standard).
Uses ReportLab Platypus engine for deterministic, fast, pure-vector generation.
"""

import os
import re
import io
import html
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger("skillpassport.pdf_generator")

# ---------------------------------------------------------------------------
# Font Registration (Yellowtail brand font + Helvetica fallbacks)
# ---------------------------------------------------------------------------
YELLOWTAIL_FONT_NAME = "Helvetica-Bold"
_font_path_candidates = [
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "fonts", "Yellowtail-Regular.ttf"),
    os.path.join(os.path.dirname(__file__), "..", "..", "public", "fonts", "Yellowtail-Regular.ttf"),
    r"d:\HackMatrix-MISC02\skillpassport-powered-by-growthlens\public\fonts\Yellowtail-Regular.ttf",
]
for fp in _font_path_candidates:
    abs_fp = os.path.abspath(fp)
    if os.path.exists(abs_fp):
        try:
            pdfmetrics.registerFont(TTFont("Yellowtail", abs_fp))
            YELLOWTAIL_FONT_NAME = "Yellowtail"
            logger.info(f"Registered Yellowtail brand font from {abs_fp}")
            break
        except Exception as exc:
            logger.warning(f"Could not register Yellowtail font: {exc}")

# ---------------------------------------------------------------------------
# GrowthLens & SkillPassport Design Tokens (Color Palette)
# ---------------------------------------------------------------------------
COLOR_INK = colors.HexColor("#1C1C1C")
COLOR_INK_LIGHT = colors.HexColor("#4B5563")
COLOR_INK_MUTED = colors.HexColor("#6B7280")
COLOR_SAND = colors.HexColor("#FAF8F5")
COLOR_WARM_CARD = colors.HexColor("#FDFCF7")
COLOR_PEACH = colors.HexColor("#FDE68A")
COLOR_LIME = colors.HexColor("#DFE968")
COLOR_AMBER = colors.HexColor("#D97706")
COLOR_AMBER_BG = colors.HexColor("#FEF3C7")
COLOR_EMERALD = colors.HexColor("#059669")
COLOR_EMERALD_BG = colors.HexColor("#ECFDF5")
COLOR_LINK = colors.HexColor("#0284C7")
COLOR_BORDER = colors.HexColor("#E5E7EB")
COLOR_BORDER_DARK = colors.HexColor("#1C1C1C")
COLOR_WHITE = colors.HexColor("#FFFFFF")
COLOR_CARD_BORDER = colors.HexColor("#D1D5DB")
COLOR_UNVERIFIED_BG = colors.HexColor("#F3F4F6")
COLOR_UNVERIFIED_TEXT = colors.HexColor("#4B5563")

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_HORIZONTAL = 36.0  # 0.5 in
MARGIN_VERTICAL = 36.0
USABLE_WIDTH = PAGE_WIDTH - (MARGIN_HORIZONTAL * 2)  # ~523.27 pt


# ---------------------------------------------------------------------------
# NumberedCanvas for Two-Pass Pagination & Running Headers/Footers
# ---------------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that determines the total page count dynamically
    and prints a professional running header (pages 2+) and running
    footer (all pages) with 'Page X of Y' and governance guarantees.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _draw_page_decorations(self, total_pages: int):
        self.saveState()
        page_num = self._pageNumber

        # Running Header on page 2 and subsequent pages
        if page_num > 1:
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.6)
            self.line(MARGIN_HORIZONTAL, PAGE_HEIGHT - 28, PAGE_WIDTH - MARGIN_HORIZONTAL, PAGE_HEIGHT - 28)

            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(COLOR_INK)
            self.drawString(MARGIN_HORIZONTAL, PAGE_HEIGHT - 22, "SkillPassport™")

            self.setFont("Helvetica", 7)
            self.setFillColor(COLOR_INK_MUTED)
            self.drawString(MARGIN_HORIZONTAL + 62, PAGE_HEIGHT - 22, "· Official Verified Competency Credential")

            self.setFont("Helvetica", 7)
            self.setFillColor(COLOR_INK_MUTED)
            self.drawRightString(PAGE_WIDTH - MARGIN_HORIZONTAL, PAGE_HEIGHT - 22, "Powered by GrowthLens")

        # Running Footer on all pages
        footer_y = 22.0
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(MARGIN_HORIZONTAL, footer_y + 10, PAGE_WIDTH - MARGIN_HORIZONTAL, footer_y + 10)

        # Left label: Governance Guarantee
        self.setFont("Helvetica", 6.8)
        self.setFillColor(COLOR_INK_MUTED)
        self.drawString(
            MARGIN_HORIZONTAL,
            footer_y,
            "SkillPassport Trust Protocol · PostgreSQL Audited Proof · Tamper-Evident Projection",
        )

        # Center: Page numbering
        self.setFont("Helvetica-Bold", 7.2)
        self.setFillColor(COLOR_INK)
        page_str = f"Page {page_num} of {total_pages}"
        self.drawCentredString(PAGE_WIDTH / 2.0, footer_y, page_str)

        # Right label: Verification status
        self.setFont("Helvetica", 6.8)
        self.setFillColor(COLOR_INK_MUTED)
        self.drawRightString(PAGE_WIDTH - MARGIN_HORIZONTAL, footer_y, "Authorized Credential Document")

        self.restoreState()


# ---------------------------------------------------------------------------
# Text & XML Sanitization / Link Formatting
# ---------------------------------------------------------------------------
def escape_xml(val: Any) -> str:
    """Escapes XML entities so ReportLab's markup parser does not crash."""
    if val is None:
        return ""
    s = str(val)
    return html.escape(s, quote=True)


def clean_url(url: Optional[str]) -> Optional[str]:
    """Ensures a URL is a valid web scheme (http/https)."""
    if not url:
        return None
    url = str(url).strip()
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return None


def format_hyperlink(text: str, url: Optional[str], fallback_label: Optional[str] = None) -> str:
    """
    Renders text as a clickable ReportLab <link> flowable markup.
    Survives PDF compilation into genuine PDF link annotations.
    """
    valid_url = clean_url(url)
    display_text = escape_xml(text or fallback_label or "View Artifact")
    if valid_url:
        escaped_url = escape_xml(valid_url)
        return f'<link href="{escaped_url}" color="#0284C7"><u><b>{display_text}</b></u></link> <font color="#6B7280" size="6.5">↗</font>'
    return f"<b>{display_text}</b>"


# ---------------------------------------------------------------------------
# Section Configuration & Ordering Resolver
# ---------------------------------------------------------------------------
DEFAULT_SECTIONS_ORDER = [
    "verified_skills",
    "role_alignment",
    "portfolio_projects",
    "work_experience",
    "education",
    "certifications",
    "publications",
    "achievements",
    "custom_sections",
]

SECTION_DISPLAY_TITLES = {
    "verified_skills": "Verified Competencies & Evidence",
    "skills": "Verified Competencies & Evidence",
    "role_alignment": "Target Role Alignment & Gap Analysis",
    "portfolio_projects": "Featured Portfolio & Engineering Projects",
    "projects": "Featured Portfolio & Engineering Projects",
    "work_experience": "Professional Experience",
    "experience": "Professional Experience",
    "education": "Education & Academic Background",
    "certifications": "Licenses & Verified Certifications",
    "publications": "Publications & Technical Writing",
    "achievements": "Honors & Key Accomplishments",
    "custom_sections": "Additional Credentials & Highlights",
}


def is_section_enabled(sec_key: str, sections_config: Any, permissions: Dict[str, Any]) -> bool:
    """
    Evaluates whether a section should be included in the PDF based on
    Passport Content Builder configuration and share permissions.
    """
    perms_sections = permissions.get("sections")
    if isinstance(perms_sections, dict):
        if sec_key in perms_sections:
            return bool(perms_sections[sec_key])
        if sec_key in ("portfolio_projects", "projects"):
            if "projects" in perms_sections:
                return bool(perms_sections["projects"])
            if "portfolio_projects" in perms_sections:
                return bool(perms_sections["portfolio_projects"])
        if sec_key in ("work_experience", "experience"):
            if "experience" in perms_sections:
                return bool(perms_sections["experience"])
            if "work_experience" in perms_sections:
                return bool(perms_sections["work_experience"])

    if isinstance(sections_config, dict):
        for candidate_key in [sec_key, sec_key.replace("portfolio_", ""), sec_key.replace("work_", "")]:
            if candidate_key in sections_config:
                val = sections_config[candidate_key]
                if isinstance(val, dict):
                    return bool(val.get("enabled", True))
                if isinstance(val, bool):
                    return val

    # Default to enabled for skills and projects, false for others unless explicitly present
    if sec_key in ("verified_skills", "skills"):
        return True
    return True


# ---------------------------------------------------------------------------
# Main PDF Generator Class
# ---------------------------------------------------------------------------
class PassportPdfGenerator:
    """
    Generates a production-grade, evidence-linked SkillPassport PDF
    reflecting real candidate data, saved Content Builder sections,
    and clickable PDF annotations for every supporting evidence item.
    """

    def __init__(self, projection: Dict[str, Any], config: Optional[Dict[str, Any]] = None, base_url: str = "http://localhost:3001"):
        self.projection = projection or {}
        self.config = config or {}
        self.base_url = (base_url or "http://localhost:3001").rstrip("/")
        self.styles = self._init_styles()

    def _init_styles(self) -> Dict[str, ParagraphStyle]:
        base_styles = getSampleStyleSheet()
        custom = {}

        custom["BrandScript"] = ParagraphStyle(
            "BrandScript",
            parent=base_styles["Normal"],
            fontName=YELLOWTAIL_FONT_NAME,
            fontSize=24,
            leading=27,
            textColor=COLOR_INK,
        )

        custom["BrandSubtitle"] = ParagraphStyle(
            "BrandSubtitle",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=COLOR_AMBER,
            textTransform="uppercase",
        )

        custom["BadgeText"] = ParagraphStyle(
            "BadgeText",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=COLOR_INK,
            alignment=1,  # Center
        )

        custom["CandidateName"] = ParagraphStyle(
            "CandidateName",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=COLOR_INK,
        )

        custom["CandidateHeadline"] = ParagraphStyle(
            "CandidateHeadline",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=COLOR_INK_LIGHT,
        )

        custom["CandidateSummary"] = ParagraphStyle(
            "CandidateSummary",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_INK,
        )

        custom["ContactInfo"] = ParagraphStyle(
            "ContactInfo",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=COLOR_INK_MUTED,
        )

        custom["SectionHeader"] = ParagraphStyle(
            "SectionHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=COLOR_INK,
            keepWithNext=True,
            spaceAfter=4,
        )

        custom["SkillTitle"] = ParagraphStyle(
            "SkillTitle",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=COLOR_INK,
        )

        custom["SkillCategory"] = ParagraphStyle(
            "SkillCategory",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=COLOR_INK_MUTED,
        )

        custom["SkillProficiency"] = ParagraphStyle(
            "SkillProficiency",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=COLOR_EMERALD,
        )

        custom["SkillDescription"] = ParagraphStyle(
            "SkillDescription",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10.5,
            textColor=COLOR_INK_LIGHT,
        )

        custom["EvidenceSectionHeader"] = ParagraphStyle(
            "EvidenceSectionHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=COLOR_INK_LIGHT,
            textTransform="uppercase",
            keepWithNext=True,
        )

        custom["EvidenceTitle"] = ParagraphStyle(
            "EvidenceTitle",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=11,
            textColor=COLOR_INK,
        )

        custom["EvidenceMeta"] = ParagraphStyle(
            "EvidenceMeta",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9.5,
            textColor=COLOR_INK_MUTED,
        )

        custom["EvidenceExcerpt"] = ParagraphStyle(
            "EvidenceExcerpt",
            parent=base_styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7.3,
            leading=10,
            textColor=COLOR_INK_LIGHT,
        )

        custom["BodyText"] = ParagraphStyle(
            "BodyText",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=11.5,
            textColor=COLOR_INK,
        )

        custom["SubHeader"] = ParagraphStyle(
            "SubHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.8,
            leading=12,
            textColor=COLOR_INK,
        )

        custom["DateMeta"] = ParagraphStyle(
            "DateMeta",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=COLOR_INK_MUTED,
            alignment=2,  # Right
        )

        custom["GuaranteeBox"] = ParagraphStyle(
            "GuaranteeBox",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=7.3,
            leading=10,
            textColor=COLOR_INK_LIGHT,
        )

        return custom

    def generate_pdf(self) -> bytes:
        """Compiles the complete document story into vector PDF bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN_HORIZONTAL,
            rightMargin=MARGIN_HORIZONTAL,
            topMargin=MARGIN_VERTICAL,
            bottomMargin=MARGIN_VERTICAL + 10,
            title=f"SkillPassport - {self.projection.get('candidateProfile', {}).get('displayName', 'Verified Candidate')}",
            author="SkillPassport Powered by GrowthLens",
            subject="Official Verified Competency Credential & Proof Projection",
            creator="GrowthLens Evidence Intelligence Engine",
        )

        story = []

        # 1. Header & Brand Bar
        story.extend(self._build_header_story())
        story.append(Spacer(1, 10))

        # 2. Candidate Profile Card
        story.extend(self._build_candidate_profile_story())
        story.append(Spacer(1, 12))

        # 3. Dynamic Sections according to Content Builder order & configuration
        story.extend(self._build_configured_sections_story())

        # 4. Verification & Cryptographic Guarantee Block
        story.append(Spacer(1, 14))
        story.extend(self._build_verification_guarantee_story())

        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # -----------------------------------------------------------------------
    # 1. Header & Brand Bar
    # -----------------------------------------------------------------------
    def _build_header_story(self) -> List[Any]:
        items = []
        share_id = self.projection.get("shareId", "SP-MASTER-EXPORT")
        token_short = share_id[-8:].upper() if len(share_id) >= 8 else share_id.upper()
        now_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
        template_id = self.projection.get("templateId", "verified-competency").replace("-", " ").title()

        # Left branding cell
        brand_flowables = [
            Paragraph("SkillPassport", self.styles["BrandScript"]),
            Paragraph("POWERED BY GROWTHLENS · OFFICIAL PROJECTION", self.styles["BrandSubtitle"]),
        ]

        # Right metadata cell
        meta_html = f"""
        <b>Credential ID:</b> #{escape_xml(token_short)}<br/>
        <b>Issued:</b> {escape_xml(now_str)}<br/>
        <b>Format:</b> {escape_xml(template_id)} View
        """
        meta_flowable = Paragraph(meta_html, self.styles["ContactInfo"])

        # Table layout for header
        header_table = Table(
            [[brand_flowables, meta_flowable]],
            colWidths=[USABLE_WIDTH * 0.65, USABLE_WIDTH * 0.35],
        )
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ])
        )
        items.append(header_table)
        items.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_INK, spaceBefore=4, spaceAfter=8))
        return items

    # -----------------------------------------------------------------------
    # 2. Candidate Profile Card
    # -----------------------------------------------------------------------
    def _build_candidate_profile_story(self) -> List[Any]:
        items = []
        cand = self.projection.get("candidateProfile", {})
        display_name = cand.get("displayName") or "Verified Candidate"
        headline = cand.get("headline") or "Software Engineering Professional"
        summary = cand.get("summary") or ""
        email = cand.get("contactEmail")
        linkedin = cand.get("contactLinkedIn")

        info_rows = []
        info_rows.append([Paragraph(escape_xml(display_name), self.styles["CandidateName"])])

        if headline:
            info_rows.append([Paragraph(escape_xml(headline), self.styles["CandidateHeadline"])])

        # Contact pills if authorized
        contact_parts = []
        if email:
            contact_parts.append(f"<b>Email:</b> {escape_xml(email)}")
        if linkedin:
            contact_parts.append(f"<b>LinkedIn:</b> {format_hyperlink(linkedin, linkedin)}")
        if contact_parts:
            info_rows.append([Paragraph(" · ".join(contact_parts), self.styles["ContactInfo"])])

        if summary:
            info_rows.append([Paragraph(escape_xml(summary), self.styles["CandidateSummary"])])

        # Container table with subtle background
        profile_table = Table(info_rows, colWidths=[USABLE_WIDTH])
        profile_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_SAND),
                ("BOX", (0, 0), (-1, -1), 1, COLOR_BORDER),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ])
        )
        items.append(profile_table)
        return items

    # -----------------------------------------------------------------------
    # 3. Dynamic Sections (Respecting Content Builder Order & Enabled States)
    # -----------------------------------------------------------------------
    def _build_configured_sections_story(self) -> List[Any]:
        items = []
        master_cfg = self.config or self.projection.get("masterPassport") or {}
        sections_config = (
            master_cfg.get("sectionsConfig")
            or master_cfg.get("sections_config")
            or self.projection.get("sectionsConfig")
            or {}
        )
        permissions = self.projection.get("permissions") or {}

        # Resolve section ordering
        sections_order = (
            master_cfg.get("sectionsOrder")
            or master_cfg.get("sections_order")
            or self.projection.get("sectionsOrder")
            or DEFAULT_SECTIONS_ORDER
        )

        rendered_sections = set()
        for sec_key in sections_order:
            clean_key = sec_key.lower().strip()
            if clean_key in rendered_sections:
                continue

            if not is_section_enabled(clean_key, sections_config, permissions):
                continue

            rendered_sections.add(clean_key)
            sec_story = self._render_section(clean_key)
            if sec_story:
                items.extend(sec_story)
                items.append(Spacer(1, 10))

        # Check any default sections not present in custom order
        for sec_key in DEFAULT_SECTIONS_ORDER:
            if sec_key not in rendered_sections:
                if is_section_enabled(sec_key, sections_config, permissions):
                    rendered_sections.add(sec_key)
                    sec_story = self._render_section(sec_key)
                    if sec_story:
                        items.extend(sec_story)
                        items.append(Spacer(1, 10))

        return items

    def _render_section(self, sec_key: str) -> List[Any]:
        """Dispatches to the appropriate section renderer."""
        if sec_key in ("verified_skills", "skills"):
            return self._build_skills_section_story()
        elif sec_key == "role_alignment":
            return self._build_role_alignment_story()
        elif sec_key in ("portfolio_projects", "projects"):
            return self._build_portfolio_projects_story()
        elif sec_key in ("work_experience", "experience"):
            return self._build_work_experience_story()
        elif sec_key == "education":
            return self._build_education_story()
        elif sec_key == "certifications":
            return self._build_certifications_story()
        elif sec_key == "publications":
            return self._build_publications_story()
        elif sec_key == "achievements":
            return self._build_achievements_story()
        elif sec_key == "custom_sections":
            return self._build_custom_sections_story()
        return []

    # -----------------------------------------------------------------------
    # Section: Verified Skills & Clickable Supporting Evidence
    # -----------------------------------------------------------------------
    def _build_skills_section_story(self) -> List[Any]:
        items = []
        verified_skills = self.projection.get("verifiedSkills") or []
        custom_skills = self.projection.get("customSkills") or []
        authorized_evidence = self.projection.get("authorizedEvidence") or []
        evidence_by_id = {str(ev.get("id")): ev for ev in authorized_evidence if ev.get("id")}

        # Section Header
        title = SECTION_DISPLAY_TITLES["verified_skills"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        if not verified_skills and not custom_skills:
            items.append(
                Paragraph(
                    "<i>No verified skills or capabilities have been selected or authorized for this credential export.</i>",
                    self.styles["BodyText"],
                )
            )
            return items

        # Render verified skills
        for idx, skill in enumerate(verified_skills):
            skill_flowables = self._build_single_verified_skill_flowables(skill, evidence_by_id)
            items.extend(skill_flowables)
            items.append(Spacer(1, 8))

        # Render user-declared custom skills (Honest Labeling)
        if custom_skills:
            items.append(Spacer(1, 6))
            items.append(Paragraph("Candidate-Declared Custom Skills", self.styles["SubHeader"]))
            items.append(
                Paragraph(
                    "<i>These competencies have been declared directly by the candidate and have not completed independent automated verification.</i>",
                    self.styles["EvidenceMeta"],
                )
            )
            items.append(Spacer(1, 4))

            for cskill in custom_skills:
                c_flowables = self._build_single_custom_skill_flowables(cskill, evidence_by_id)
                items.extend(c_flowables)
                items.append(Spacer(1, 6))

        return items

    def _build_single_verified_skill_flowables(self, skill: Dict[str, Any], evidence_by_id: Dict[str, Any]) -> List[Any]:
        """Renders one verified skill along with its verified badge and individual evidence items."""
        skill_name = skill.get("canonicalName") or "Technical Competency"
        category = skill.get("category") or "Engineering"
        proficiency = skill.get("verifiedProficiency") or "Practitioner"
        description = skill.get("description") or ""
        evidence_ids = skill.get("authorizedEvidenceIds") or []

        # Header bar table: Skill Name + Category + Proficiency + Verified Badge
        left_header = f"<b>{escape_xml(skill_name)}</b>  <font color='#6B7280' size='7.5'>[{escape_xml(category)}]</font>"
        right_header = f"<font color='#059669'><b>✓ VERIFIED · {escape_xml(proficiency).upper()}</b></font>"

        header_table = Table(
            [[Paragraph(left_header, self.styles["SkillTitle"]), Paragraph(right_header, self.styles["SkillProficiency"])]],
            colWidths=[USABLE_WIDTH * 0.68, USABLE_WIDTH * 0.32],
        )
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_SAND),
                ("BOX", (0, 0), (-1, -1), 0.7, COLOR_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )

        leading_block = [header_table]
        if description:
            leading_block.append(Spacer(1, 2))
            leading_block.append(Paragraph(escape_xml(description), self.styles["SkillDescription"]))

        supporting_ev = [evidence_by_id[eid] for eid in evidence_ids if eid in evidence_by_id]
        if supporting_ev:
            ev_count_label = f"Supporting Proof Artifacts ({len(supporting_ev)}):"
            ev_hdr = Paragraph(ev_count_label, self.styles["EvidenceSectionHeader"])
            leading_block.append(Spacer(1, 3))
            leading_block.append(ev_hdr)

            # Pair header with first evidence item so header is never orphaned alone
            first_ev = self._build_evidence_entry(supporting_ev[0])
            leading_block.extend(first_ev)

            flowables = [KeepTogether(leading_block)]

            # Remaining evidence items flow naturally across pages
            for ev in supporting_ev[1:]:
                flowables.extend(self._build_evidence_entry(ev))
            return flowables
        else:
            leading_block.append(Spacer(1, 2))
            leading_block.append(
                Paragraph(
                    "<i>Verified competency based on evaluated code contributions and repository assessment.</i>",
                    self.styles["EvidenceMeta"],
                )
            )
            return [KeepTogether(leading_block)]

    def _build_evidence_entry(self, ev: Dict[str, Any]) -> List[Any]:
        """
        Builds a single evidence artifact entry with working clickable hyperlink,
        metadata badge (GitHub, Jira, Document), observed date, and summary.
        """
        items = []
        title = ev.get("title") or "Proof Artifact"
        source_type = ev.get("sourceType") or ev.get("sourceProvider") or "Artifact"
        project = ev.get("project") or ""
        date = ev.get("date") or ""
        if date and len(date) >= 10:
            date = date[:10]
        claimed_contrib = ev.get("claimedContribution") or "Author"
        summary = ev.get("shortSummary") or ev.get("extractedExcerpt") or ""

        # Determine target clickable URL
        token = self.projection.get("shareId", "export")
        ev_id = ev.get("id")

        target_url = ev.get("externalUrl") or ev.get("sourceUrl")
        # If relative or stream URL, convert to accessible web viewer URL
        if not target_url or not (target_url.startswith("http://") or target_url.startswith("https://")):
            if ev_id:
                target_url = f"{self.base_url}/p/{token}/evidence/{ev_id}"
            else:
                target_url = None

        # Format title with hyperlink
        link_markup = format_hyperlink(title, target_url)

        # Meta string
        meta_parts = [f"<b>Source:</b> {escape_xml(source_type.title())}"]
        if project:
            meta_parts.append(f"<b>Project:</b> {escape_xml(project)}")
        if date:
            meta_parts.append(f"<b>Observed:</b> {escape_xml(date)}")
        if claimed_contrib:
            meta_parts.append(f"<b>Role:</b> {escape_xml(claimed_contrib)}")

        meta_line = "  ·  ".join(meta_parts)

        # Entry layout
        entry_content = [
            Paragraph(link_markup, self.styles["EvidenceTitle"]),
            Paragraph(meta_line, self.styles["EvidenceMeta"]),
        ]

        if summary:
            # Clean summary to 1-2 concise lines
            clean_summary = summary.strip().replace("\n", " ")
            if len(clean_summary) > 220:
                clean_summary = clean_summary[:217] + "..."
            entry_content.append(Paragraph(f'"{escape_xml(clean_summary)}"', self.styles["EvidenceExcerpt"]))

        # Wrap entry in a mini sub-table with left border
        entry_table = Table([[entry_content]], colWidths=[USABLE_WIDTH - 24])
        entry_table.setStyle(
            TableStyle([
                ("LINELEFT", (0, 0), (-1, -1), 2, COLOR_AMBER),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        items.append(entry_table)
        items.append(Spacer(1, 2))
        return items

    def _build_single_custom_skill_flowables(self, cskill: Dict[str, Any], evidence_by_id: Dict[str, Any]) -> List[Any]:
        """Renders one user-declared custom skill with explicit unverified disclosure."""
        title = cskill.get("title") or "Custom Skill"
        level = cskill.get("selfAssessedLevel") or "Self-Assessed"
        desc = cskill.get("description") or cskill.get("context") or ""
        tags = cskill.get("tags") or []
        attached_ids = cskill.get("attachedEvidenceIds") or []
        ext_url = cskill.get("externalProjectUrl")

        left_header = f"<b>{escape_xml(title)}</b>"
        if ext_url:
            left_header += f"  {format_hyperlink('[Project Link]', ext_url)}"
        right_header = f"<font color='#4B5563'><b>SELF-DECLARED · {escape_xml(level).upper()}</b></font>"

        header_table = Table(
            [[Paragraph(left_header, self.styles["SkillTitle"]), Paragraph(right_header, self.styles["BadgeText"])]],
            colWidths=[USABLE_WIDTH * 0.68, USABLE_WIDTH * 0.32],
        )
        header_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_UNVERIFIED_BG),
                ("BOX", (0, 0), (-1, -1), 0.7, COLOR_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )

        leading_block = [header_table]
        if desc:
            leading_block.append(Spacer(1, 2))
            leading_block.append(Paragraph(escape_xml(desc), self.styles["SkillDescription"]))
        if tags:
            tag_str = " · ".join([escape_xml(t) for t in tags])
            leading_block.append(Spacer(1, 1))
            leading_block.append(Paragraph(f"<b>Tags:</b> {tag_str}", self.styles["EvidenceMeta"]))

        attached_ev = [evidence_by_id[eid] for eid in attached_ids if eid in evidence_by_id]
        if attached_ev:
            leading_block.append(Spacer(1, 2))
            leading_block.append(Paragraph("Attached Reference Proof:", self.styles["EvidenceSectionHeader"]))
            first_ev = self._build_evidence_entry(attached_ev[0])
            leading_block.extend(first_ev)

            flowables = [KeepTogether(leading_block)]
            for ev in attached_ev[1:]:
                flowables.extend(self._build_evidence_entry(ev))
            return flowables
        else:
            return [KeepTogether(leading_block)]

    # -----------------------------------------------------------------------
    # Section: Target Role Alignment & Gap Analysis
    # -----------------------------------------------------------------------
    def _build_role_alignment_story(self) -> List[Any]:
        items = []
        ra = self.projection.get("roleAlignment")
        if not ra:
            return items

        title = SECTION_DISPLAY_TITLES["role_alignment"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        target_role = ra.get("targetRoleTitle") or "Target Role"
        score = ra.get("alignmentScore", 0)
        summary = ra.get("alignmentSummary") or ""
        strengths = ra.get("strengths") or []
        unsupported = ra.get("unsupportedAreas") or []
        note = ra.get("coverageNote") or "Alignment computed strictly against candidate's verified competencies."

        card_flowables = [
            Paragraph(
                f"<b>Target Role:</b> {escape_xml(target_role)}  ·  <font color='#059669'><b>Match Score: {score}%</b></font>",
                self.styles["SubHeader"],
            ),
            Spacer(1, 2),
            Paragraph(escape_xml(summary), self.styles["BodyText"]),
            Spacer(1, 4),
        ]

        if strengths:
            str_html = "<b>Verified Strengths:</b> " + " · ".join([f"<font color='#059669'>✓</font> {escape_xml(s)}" for s in strengths])
            card_flowables.append(Paragraph(str_html, self.styles["BodyText"]))

        if unsupported:
            gap_html = "<b>Growth / Evidence Gaps:</b> " + " · ".join([f"<font color='#D97706'>△</font> {escape_xml(u)}" for u in unsupported])
            card_flowables.append(Paragraph(gap_html, self.styles["BodyText"]))

        card_flowables.append(Spacer(1, 3))
        card_flowables.append(Paragraph(f"<i>{escape_xml(note)}</i>", self.styles["EvidenceMeta"]))

        box_table = Table([[card_flowables]], colWidths=[USABLE_WIDTH])
        box_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_WARM_CARD),
                ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ])
        )
        items.append(box_table)
        return items

    # -----------------------------------------------------------------------
    # Section: Portfolio Projects
    # -----------------------------------------------------------------------
    def _build_portfolio_projects_story(self) -> List[Any]:
        items = []
        projects = self.projection.get("portfolioProjects") or self.projection.get("projects") or []
        if not projects:
            return items

        title = SECTION_DISPLAY_TITLES["portfolio_projects"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for proj in projects:
            p_name = proj.get("title") or proj.get("name") or "Project"
            p_role = proj.get("role") or ""
            p_url = proj.get("url") or proj.get("project_url") or proj.get("github_url")
            p_desc = proj.get("description") or ""
            p_skills = proj.get("skills") or proj.get("technologies") or []

            p_title_markup = format_hyperlink(p_name, p_url)
            left_text = f"<b>{p_title_markup}</b>"
            if p_role:
                left_text += f" <font color='#6B7280' size='8'>({escape_xml(p_role)})</font>"

            proj_table = Table(
                [[Paragraph(left_text, self.styles["SubHeader"])]],
                colWidths=[USABLE_WIDTH],
            )
            proj_table.setStyle(
                TableStyle([
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(proj_table)

            if p_desc:
                items.append(Paragraph(escape_xml(p_desc), self.styles["BodyText"]))

            if p_skills:
                skills_str = " · ".join([escape_xml(s) for s in p_skills])
                items.append(Paragraph(f"<b>Technologies:</b> {skills_str}", self.styles["EvidenceMeta"]))

            items.append(Spacer(1, 6))

        return items

    # -----------------------------------------------------------------------
    # Section: Professional Experience
    # -----------------------------------------------------------------------
    def _build_work_experience_story(self) -> List[Any]:
        items = []
        experiences = self.projection.get("workExperience") or self.projection.get("workExperiences") or []
        if not experiences:
            return items

        title = SECTION_DISPLAY_TITLES["work_experience"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for exp in experiences:
            title_text = exp.get("title") or exp.get("role") or "Role"
            company = exp.get("company") or exp.get("organization") or ""
            start_date = exp.get("startDate") or exp.get("start_date") or ""
            end_date = exp.get("endDate") or exp.get("end_date") or "Present"
            desc = exp.get("description") or ""

            left_str = f"<b>{escape_xml(title_text)}</b>"
            if company:
                left_str += f" · <font color='#4B5563'>{escape_xml(company)}</font>"

            date_str = f"{escape_xml(start_date)} - {escape_xml(end_date)}" if start_date else ""

            exp_table = Table(
                [[Paragraph(left_str, self.styles["SubHeader"]), Paragraph(date_str, self.styles["DateMeta"])]],
                colWidths=[USABLE_WIDTH * 0.75, USABLE_WIDTH * 0.25],
            )
            exp_table.setStyle(
                TableStyle([
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(exp_table)

            if desc:
                items.append(Paragraph(escape_xml(desc), self.styles["BodyText"]))

            items.append(Spacer(1, 6))

        return items

    # -----------------------------------------------------------------------
    # Section: Education
    # -----------------------------------------------------------------------
    def _build_education_story(self) -> List[Any]:
        items = []
        educations = self.projection.get("education") or self.projection.get("educationEntries") or []
        if not educations:
            return items

        title = SECTION_DISPLAY_TITLES["education"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for edu in educations:
            degree = edu.get("degree") or edu.get("qualification") or "Degree"
            inst = edu.get("institution") or edu.get("school") or ""
            grad_year = edu.get("graduationYear") or edu.get("dates") or ""
            details = edu.get("description") or edu.get("details") or ""

            left_str = f"<b>{escape_xml(degree)}</b>"
            if inst:
                left_str += f" · <font color='#4B5563'>{escape_xml(inst)}</font>"

            edu_table = Table(
                [[Paragraph(left_str, self.styles["SubHeader"]), Paragraph(escape_xml(str(grad_year)), self.styles["DateMeta"])]],
                colWidths=[USABLE_WIDTH * 0.75, USABLE_WIDTH * 0.25],
            )
            edu_table.setStyle(
                TableStyle([
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(edu_table)

            if details:
                items.append(Paragraph(escape_xml(details), self.styles["BodyText"]))

            items.append(Spacer(1, 5))

        return items

    # -----------------------------------------------------------------------
    # Section: Certifications
    # -----------------------------------------------------------------------
    def _build_certifications_story(self) -> List[Any]:
        items = []
        certs = self.projection.get("certifications") or []
        if not certs:
            return items

        title = SECTION_DISPLAY_TITLES["certifications"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for c in certs:
            c_name = c.get("name") or c.get("title") or "Certification"
            issuer = c.get("issuer") or c.get("authority") or ""
            issue_date = c.get("issueDate") or c.get("date") or ""
            c_url = c.get("credentialUrl") or c.get("url")

            cert_markup = format_hyperlink(c_name, c_url)
            left_str = f"<b>{cert_markup}</b>"
            if issuer:
                left_str += f" · <font color='#4B5563'>{escape_xml(issuer)}</font>"

            cert_table = Table(
                [[Paragraph(left_str, self.styles["SubHeader"]), Paragraph(escape_xml(issue_date), self.styles["DateMeta"])]],
                colWidths=[USABLE_WIDTH * 0.75, USABLE_WIDTH * 0.25],
            )
            cert_table.setStyle(
                TableStyle([
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(cert_table)
            items.append(Spacer(1, 4))

        return items

    # -----------------------------------------------------------------------
    # Section: Publications
    # -----------------------------------------------------------------------
    def _build_publications_story(self) -> List[Any]:
        items = []
        pubs = self.projection.get("publications") or []
        if not pubs:
            return items

        title = SECTION_DISPLAY_TITLES["publications"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for p in pubs:
            p_title = p.get("title") or "Publication"
            publisher = p.get("publisher") or p.get("venue") or ""
            p_url = p.get("url")
            p_date = p.get("date") or ""

            pub_markup = format_hyperlink(p_title, p_url)
            left_str = f"<b>{pub_markup}</b>"
            if publisher:
                left_str += f" · <font color='#4B5563'>{escape_xml(publisher)}</font>"

            pub_table = Table(
                [[Paragraph(left_str, self.styles["SubHeader"]), Paragraph(escape_xml(p_date), self.styles["DateMeta"])]],
                colWidths=[USABLE_WIDTH * 0.75, USABLE_WIDTH * 0.25],
            )
            pub_table.setStyle(
                TableStyle([
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(pub_table)
            items.append(Spacer(1, 4))

        return items

    # -----------------------------------------------------------------------
    # Section: Achievements / Honors
    # -----------------------------------------------------------------------
    def _build_achievements_story(self) -> List[Any]:
        items = []
        achievements = self.projection.get("achievements") or []
        if not achievements:
            return items

        title = SECTION_DISPLAY_TITLES["achievements"]
        items.append(Paragraph(title, self.styles["SectionHeader"]))
        items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))

        for a in achievements:
            a_title = a.get("title") or "Achievement"
            a_org = a.get("organization") or ""
            a_date = a.get("date") or ""
            a_desc = a.get("description") or ""

            left_str = f"<b>{escape_xml(a_title)}</b>"
            if a_org:
                left_str += f" · <font color='#4B5563'>{escape_xml(a_org)}</font>"

            ach_table = Table(
                [[Paragraph(left_str, self.styles["SubHeader"]), Paragraph(escape_xml(a_date), self.styles["DateMeta"])]],
                colWidths=[USABLE_WIDTH * 0.75, USABLE_WIDTH * 0.25],
            )
            ach_table.setStyle(
                TableStyle([
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ])
            )
            items.append(ach_table)
            if a_desc:
                items.append(Paragraph(escape_xml(a_desc), self.styles["BodyText"]))
            items.append(Spacer(1, 4))

        return items

    # -----------------------------------------------------------------------
    # Section: Custom Sections
    # -----------------------------------------------------------------------
    def _build_custom_sections_story(self) -> List[Any]:
        items = []
        custom_secs = self.projection.get("customSections") or []
        if not custom_secs:
            return items

        for csec in custom_secs:
            sec_title = csec.get("title") or "Additional Section"
            content = csec.get("content") or ""
            if not content:
                continue

            items.append(Paragraph(escape_xml(sec_title), self.styles["SectionHeader"]))
            items.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_INK, spaceBefore=1, spaceAfter=8))
            items.append(Paragraph(escape_xml(content), self.styles["BodyText"]))
            items.append(Spacer(1, 6))

        return items

    # -----------------------------------------------------------------------
    # 4. Verification & Cryptographic Guarantee Block
    # -----------------------------------------------------------------------
    def _build_verification_guarantee_story(self) -> List[Any]:
        items = []
        token = self.projection.get("shareId", "SP-CANONICAL-EXPORT")
        token_upper = token[-12:].upper() if len(token) >= 12 else token.upper()
        now_utc = datetime.now(timezone.utc).isoformat()

        guarantee_html = f"""
        <b>SkillPassport™ Trust &amp; Verification Guarantee</b><br/>
        This document contains an official SkillPassport export powered by the GrowthLens Continuous Talent Intelligence Engine.
        Every verified competency included herein is backed by auditable, tamper-resistant PostgreSQL records mapped to authentic
        workplace proof artifacts (commits, pull requests, issue resolutions, or verified credentials). Unverified or self-declared
        claims are explicitly marked.
        <br/><br/>
        <b>Audit Reference:</b> {escape_xml(token_upper)} &nbsp;·&nbsp;
        <b>Projection Timestamp:</b> {escape_xml(now_utc)} &nbsp;·&nbsp;
        <b>Verification Protocol:</b> v1.0.0-PG-AUDITED
        """

        box_table = Table([[Paragraph(guarantee_html, self.styles["GuaranteeBox"])]], colWidths=[USABLE_WIDTH])
        box_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_SAND),
                ("BOX", (0, 0), (-1, -1), 1, COLOR_INK),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ])
        )
        items.append(box_table)
        return items


def generate_passport_pdf(
    projection: Dict[str, Any],
    config: Optional[Dict[str, Any]] = None,
    base_url: str = "http://localhost:3001",
) -> bytes:
    """Convenience helper to generate passport PDF bytes from canonical projection."""
    generator = PassportPdfGenerator(projection=projection, config=config, base_url=base_url)
    return generator.generate_pdf()
