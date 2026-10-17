import re
import io
import hashlib
import asyncio
import concurrent.futures
from typing import Dict, Any, List, Optional
from pathlib import Path

from backend.app.core.logging import get_logger
from backend.app.extraction.ocr_service import ocr_service
from backend.app.ai.extractor import is_insufficient_or_identity_only

logger = get_logger("extraction.documents")


def clean_text(text: str) -> str:
    """Normalizes whitespace and removes control characters."""
    if not text:
        return ""
    text = re.sub(r"[\r\t\f\v]", " ", text)
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


class DocumentExtractor:
    """
    Unified multi-format document parser.
    Extracts structured text from PDF, DOCX, PPTX, TXT, MD, and image files.
    Grounded extraction: automatically triggers OCR on image/scanned content,
    merges digital and visual text layers, and never fabricates missing text.
    """

    async def extract_async(self, file_bytes: bytes, filename: str, mime_type: str = "") -> Dict[str, Any]:
        """Asynchronous extraction pipeline."""
        ext = Path(filename).suffix.lower()

        if ext == ".pdf" or "pdf" in mime_type:
            return await self._extract_pdf_async(file_bytes, filename)
        elif ext in [".docx", ".doc"] or "wordprocessingml" in mime_type:
            return self._extract_docx(file_bytes, filename)
        elif ext in [".pptx", ".ppt"] or "presentationml" in mime_type:
            return self._extract_pptx(file_bytes, filename)
        elif ext in [".txt", ".md", ".json", ".csv"]:
            return self._extract_plaintext(file_bytes, filename)
        elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
            return await self._extract_image_async(file_bytes, filename, mime_type)
        else:
            return self._extract_plaintext(file_bytes, filename)

    def extract(self, file_bytes: bytes, filename: str, mime_type: str = "") -> Dict[str, Any]:
        """Synchronous wrapper supporting legacy calls and test clients."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(asyncio.run, self.extract_async(file_bytes, filename, mime_type)).result()
            else:
                return loop.run_until_complete(self.extract_async(file_bytes, filename, mime_type))
        except RuntimeError:
            return asyncio.run(self.extract_async(file_bytes, filename, mime_type))

    async def _extract_pdf_async(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        meta = doc.metadata or {}
        title = meta.get("title") or filename

        chunks = []
        full_text_parts = []
        ocr_candidates = 0
        ocr_processed = 0
        last_ocr_error = None

        for page_num in range(page_count):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            cleaned = clean_text(text)

            image_list = page.get_images()
            needs_ocr = (
                len(cleaned) < 150
                or len(cleaned.split()) < 25
                or is_insufficient_or_identity_only(cleaned)
            ) and (len(image_list) > 0 or page.rect.width > 0)

            extraction_method = "pymupdf_direct"
            if needs_ocr:
                ocr_candidates += 1
                ocr_res = await ocr_service.ocr_fitz_page(page, page_num + 1)
                if ocr_res.get("success") and ocr_res.get("char_count", 0) > 0:
                    ocr_text = ocr_res.get("text", "")
                    ocr_processed += 1
                    # Merge digital text (e.g. name, date) with OCR visual text if digital text wasn't already included
                    if cleaned and cleaned.lower() not in ocr_text.lower():
                        merged = f"{ocr_text}\nRecipient: {cleaned}"
                    else:
                        merged = ocr_text or cleaned
                    cleaned = clean_text(merged)
                    extraction_method = "pymupdf_ocr_merged"
                else:
                    last_ocr_error = ocr_res.get("error")
                    extraction_method = "pymupdf_direct"
                    if last_ocr_error:
                        logger.warning(f"OCR failed for PDF page {page_num + 1}: {last_ocr_error}")

            if cleaned:
                full_text_parts.append(cleaned)
                chunk_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
                chunks.append({
                    "page_or_slide_number": page_num + 1,
                    "section_title": f"Page {page_num + 1}",
                    "chunk_index": len(chunks),
                    "original_text": text or cleaned,
                    "normalized_text": cleaned,
                    "extraction_method": extraction_method,
                    "chunk_hash": chunk_hash,
                })

        doc.close()
        full_text = "\n\n".join(full_text_parts)
        words = full_text.split()
        word_count = len(words)
        char_count = len(full_text)
        excerpt = clean_text(full_text[:400])

        # Evaluate extraction quality
        if word_count < 15 or is_insufficient_or_identity_only(full_text):
            extraction_quality = "insufficient_content"
            quality_reason = f"Extracted only {word_count} word(s). Text is insufficient to substantiate candidate competencies."
            if ocr_candidates > 0 and ocr_processed == 0:
                quality_reason += f" OCR could not be completed: {last_ocr_error or 'OCR unavailable'}."
        else:
            extraction_quality = "verified_content"
            quality_reason = f"Successfully extracted {word_count} words across {page_count} page(s)."

        return {
            "title": title,
            "page_count": page_count,
            "char_count": char_count,
            "word_count": word_count,
            "chunks": chunks,
            "full_text": full_text,
            "excerpt": excerpt,
            "ocr_pages_detected": ocr_candidates,
            "ocr_pages_processed": ocr_processed,
            "ocr_error": last_ocr_error,
            "extraction_quality": extraction_quality,
            "quality_reason": quality_reason,
            "extractor": "PyMuPDF+OCR" if ocr_processed > 0 else "PyMuPDF",
        }

    def _extract_docx(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        import docx

        doc_io = io.BytesIO(file_bytes)
        doc = docx.Document(doc_io)

        chunks = []
        full_text_parts = []
        current_section = "Introduction"
        current_section_text = []

        for p in doc.paragraphs:
            text = clean_text(p.text)
            if not text:
                continue

            if p.style and "heading" in p.style.name.lower():
                if current_section_text:
                    sec_content = "\n".join(current_section_text)
                    full_text_parts.append(sec_content)
                    chunks.append({
                        "page_or_slide_number": 1,
                        "section_title": current_section,
                        "chunk_index": len(chunks),
                        "original_text": sec_content,
                        "normalized_text": sec_content,
                        "extraction_method": "docx_parser",
                        "chunk_hash": hashlib.sha256(sec_content.encode("utf-8")).hexdigest(),
                    })
                    current_section_text = []
                current_section = text
                current_section_text.append(text)
            else:
                current_section_text.append(text)

        if current_section_text:
            sec_content = "\n".join(current_section_text)
            full_text_parts.append(sec_content)
            chunks.append({
                "page_or_slide_number": 1,
                "section_title": current_section,
                "chunk_index": len(chunks),
                "original_text": sec_content,
                "normalized_text": sec_content,
                "extraction_method": "docx_parser",
                "chunk_hash": hashlib.sha256(sec_content.encode("utf-8")).hexdigest(),
            })

        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                row_cells = [clean_text(cell.text) for cell in row.cells]
                table_rows.append(" | ".join(row_cells))
            if table_rows:
                table_content = "\n".join(table_rows)
                full_text_parts.append(table_content)
                chunks.append({
                    "page_or_slide_number": 1,
                    "section_title": "Data Table",
                    "chunk_index": len(chunks),
                    "original_text": table_content,
                    "normalized_text": table_content,
                    "extraction_method": "docx_parser_table",
                    "chunk_hash": hashlib.sha256(table_content.encode("utf-8")).hexdigest(),
                })

        full_text = "\n\n".join(full_text_parts)
        words = full_text.split()
        word_count = len(words)
        char_count = len(full_text)
        excerpt = clean_text(full_text[:400])

        extraction_quality = "verified_content" if word_count >= 15 else "insufficient_content"
        quality_reason = f"Extracted {word_count} words from Word document."

        return {
            "title": Path(filename).stem.replace("_", " ").title(),
            "page_count": 1,
            "char_count": char_count,
            "word_count": word_count,
            "chunks": chunks,
            "full_text": full_text,
            "excerpt": excerpt,
            "ocr_pages_detected": 0,
            "ocr_pages_processed": 0,
            "ocr_error": None,
            "extraction_quality": extraction_quality,
            "quality_reason": quality_reason,
            "extractor": "python-docx",
        }

    def _extract_pptx(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        import pptx

        prs_io = io.BytesIO(file_bytes)
        prs = pptx.Presentation(prs_io)

        chunks = []
        full_text_parts = []
        slide_count = len(prs.slides)

        for i, slide in enumerate(prs.slides):
            slide_texts = []
            slide_title = f"Slide {i + 1}"

            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        txt = clean_text(para.text)
                        if txt:
                            slide_texts.append(txt)

            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes = clean_text(slide.notes_slide.notes_text_frame.text)
                if notes:
                    slide_texts.append(f"[Presenter Notes: {notes}]")

            if slide_texts:
                if len(slide_texts) > 0 and len(slide_texts[0]) < 80:
                    slide_title = slide_texts[0]

                slide_content = "\n".join(slide_texts)
                full_text_parts.append(slide_content)
                chunks.append({
                    "page_or_slide_number": i + 1,
                    "section_title": slide_title,
                    "chunk_index": len(chunks),
                    "original_text": slide_content,
                    "normalized_text": slide_content,
                    "extraction_method": "pptx_parser",
                    "chunk_hash": hashlib.sha256(slide_content.encode("utf-8")).hexdigest(),
                })

        full_text = "\n\n".join(full_text_parts)
        words = full_text.split()
        word_count = len(words)
        char_count = len(full_text)
        excerpt = clean_text(full_text[:400])

        extraction_quality = "verified_content" if word_count >= 15 else "insufficient_content"
        quality_reason = f"Extracted {word_count} words across {slide_count} slide(s)."

        return {
            "title": Path(filename).stem.replace("_", " ").title(),
            "page_count": slide_count,
            "char_count": char_count,
            "word_count": word_count,
            "chunks": chunks,
            "full_text": full_text,
            "excerpt": excerpt,
            "ocr_pages_detected": 0,
            "ocr_pages_processed": 0,
            "ocr_error": None,
            "extraction_quality": extraction_quality,
            "quality_reason": quality_reason,
            "extractor": "python-pptx",
        }

    def _extract_plaintext(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("latin-1", errors="replace")

        cleaned = clean_text(text)
        paragraphs = [clean_text(p) for p in cleaned.split("\n\n") if clean_text(p)]

        chunks = []
        for i, para in enumerate(paragraphs):
            chunks.append({
                "page_or_slide_number": 1,
                "section_title": f"Paragraph {i + 1}",
                "chunk_index": i,
                "original_text": para,
                "normalized_text": para,
                "extraction_method": "plaintext_direct",
                "chunk_hash": hashlib.sha256(para.encode("utf-8")).hexdigest(),
            })

        words = cleaned.split()
        word_count = len(words)
        excerpt = clean_text(cleaned[:400])

        extraction_quality = "verified_content" if word_count >= 15 else "insufficient_content"
        quality_reason = f"Extracted {word_count} words from text file."

        return {
            "title": Path(filename).stem.replace("_", " ").title(),
            "page_count": 1,
            "char_count": len(cleaned),
            "word_count": word_count,
            "chunks": chunks,
            "full_text": cleaned,
            "excerpt": excerpt,
            "ocr_pages_detected": 0,
            "ocr_pages_processed": 0,
            "ocr_error": None,
            "extraction_quality": extraction_quality,
            "quality_reason": quality_reason,
            "extractor": "plaintext",
        }

    async def _extract_image_async(self, file_bytes: bytes, filename: str, mime_type: str = "") -> Dict[str, Any]:
        """
        Extracts text from images using real OCR without fabricating credential claims.
        """
        clean_title = Path(filename).stem.replace("_", " ").replace("-", " ").title()
        ocr_res = await ocr_service.extract_text_from_image_bytes(file_bytes, mime_type=mime_type or "image/png")

        if ocr_res.get("success") and ocr_res.get("text"):
            extracted_text = clean_text(ocr_res["text"])
            words = extracted_text.split()
            word_count = len(words)
            char_count = len(extracted_text)
            chunks = [{
                "page_or_slide_number": 1,
                "section_title": clean_title,
                "chunk_index": 0,
                "original_text": extracted_text,
                "normalized_text": extracted_text,
                "extraction_method": f"image_ocr_{ocr_res.get('ocr_engine', 'ocr')}",
                "chunk_hash": hashlib.sha256(extracted_text.encode("utf-8")).hexdigest(),
            }]
            return {
                "title": clean_title,
                "page_count": 1,
                "char_count": char_count,
                "word_count": word_count,
                "chunks": chunks,
                "full_text": extracted_text,
                "excerpt": clean_text(extracted_text[:400]),
                "ocr_pages_detected": 1,
                "ocr_pages_processed": 1,
                "ocr_error": None,
                "extraction_quality": "verified_content" if word_count >= 15 else "insufficient_content",
                "quality_reason": f"Extracted {word_count} words via OCR ({ocr_res.get('ocr_engine')}).",
                "extractor": f"ImageOCR ({ocr_res.get('ocr_engine', 'OCR')})",
            }
        else:
            err = ocr_res.get("error", "OCR failed to detect legible text")
            logger.warning(f"Image OCR failed for {filename}: {err}")
            return {
                "title": clean_title,
                "page_count": 1,
                "char_count": 0,
                "word_count": 0,
                "chunks": [],
                "full_text": "",
                "excerpt": f"[Image contains no legible machine-readable text: {err}]",
                "ocr_pages_detected": 1,
                "ocr_pages_processed": 0,
                "ocr_error": err,
                "extraction_quality": "insufficient_content",
                "quality_reason": f"No machine-readable text could be extracted from image ({err}).",
                "extractor": "ImageOCR_Failed",
            }


document_extractor = DocumentExtractor()
