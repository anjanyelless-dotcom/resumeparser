#!/usr/bin/env python3
"""
AWS Textract Extractor — uses Amazon Textract for OCR and table extraction.

Handles:
- Scanned PDF / image-based PDFs (poor text layer)
- Table-format resumes where pdfplumber loses column order
- Multi-column layouts

Tier placement in text_extractor.py:
  Tier 1: pdfplumber  (digital text PDFs)
  Tier 2: AWS Textract  ← THIS MODULE  (scanned / table PDFs)
  Tier 3: Tesseract OCR (local fallback when AWS unavailable)

Usage:
    extractor = AwsTextractExtractor()
    result = extractor.extract_from_pdf(file_path)
    # result = {'text': '...', 'method_used': 'aws_textract', 'char_count': N}
"""

import os
import io
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Optional dependencies ───────────────────────────────────────────────────
try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3 not installed — AWS Textract will not be available. Run: pip install boto3")

try:
    import fitz  # pymupdf — used to convert PDF pages to images
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# ── Module-level availability flag ─────────────────────────────────────────
TEXTRACT_AVAILABLE = BOTO3_AVAILABLE


class AwsTextractExtractor:
    """
    Extracts text from PDFs using AWS Textract.

    Supports two modes:
    1. Synchronous (single-page images): PDF pages are rendered to PNG and
       sent one at a time via detect_document_text / analyze_document.
    2. Async (multi-page PDFs from S3): Not implemented here — use sync mode.

    Table extraction:
    - Textract FORMS_AND_TABLES feature is used when 'analyze_tables=True'.
    - Table cells are concatenated row-by-row, separated by tabs/newlines.
    - This preserves column relationships lost by pdfplumber on table resumes.
    """

    def __init__(
        self,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-east-1",
        analyze_tables: bool = True,
    ):
        """
        Initialize with AWS credentials.

        Args:
            aws_access_key_id:     Overrides AWS_ACCESS_KEY_ID env var.
            aws_secret_access_key: Overrides AWS_SECRET_ACCESS_KEY env var.
            region_name:           AWS region for Textract (default us-east-1).
            analyze_tables:        If True, uses AnalyzeDocument (tables + forms).
                                   If False, uses DetectDocumentText (faster, text only).
        """
        self.analyze_tables = analyze_tables
        self.region_name = region_name
        self._client = None
        self._available = False

        # Resolve credentials: explicit > env var > IAM role
        self._access_key = aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID", "")
        self._secret_key = aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY", "")

        if not BOTO3_AVAILABLE:
            logger.warning("⚠️  boto3 not installed — AwsTextractExtractor is disabled.")
            return

        try:
            kwargs: Dict = {"region_name": region_name}
            if self._access_key:
                kwargs["aws_access_key_id"] = self._access_key
            if self._secret_key:
                kwargs["aws_secret_access_key"] = self._secret_key

            self._client = boto3.client("textract", **kwargs)
            self._available = True
            logger.info("✅ AWS Textract client initialized (region: %s, tables: %s)", region_name, analyze_tables)
        except Exception as exc:
            logger.error("❌ Failed to initialize AWS Textract client: %s", exc)
            self._available = False

    # ── Public API ──────────────────────────────────────────────────────────

    def is_available(self) -> bool:
        """Return True if Textract is configured and ready."""
        return self._available

    def extract_from_pdf(self, file_path: str) -> Dict:
        """
        Extract text from a PDF file using AWS Textract.

        Each page is rendered to a PNG image and sent to Textract individually.
        Results from all pages are concatenated.

        Args:
            file_path: Absolute path to the PDF file.

        Returns:
            Dict with keys:
              - text (str): Extracted text, tables flattened to tab-separated rows.
              - method_used (str): 'aws_textract'
              - char_count (int): Length of extracted text.
              - page_count (int): Number of pages processed.
              - has_tables (bool): Whether any table blocks were detected.
        """
        if not self._available:
            raise RuntimeError("AWS Textract is not available. Check credentials and boto3 installation.")
        if not PYMUPDF_AVAILABLE:
            raise ImportError("pymupdf (fitz) is required to convert PDF pages to images for Textract.")

        file_path = str(file_path)
        logger.info("[TEXTRACT] Starting extraction: %s", Path(file_path).name)

        doc = fitz.open(file_path)
        page_texts: List[str] = []
        has_tables = False
        total_pages = len(doc)

        for page_num in range(total_pages):
            page = doc[page_num]
            # Render at 300 DPI — AWS Textract recommends ≥300 DPI for accurate OCR
            mat = fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")

            logger.debug("[TEXTRACT] Processing page %d/%d (%d bytes)", page_num + 1, total_pages, len(img_bytes))

            try:
                page_text, page_has_tables = self._call_textract(img_bytes)
                page_texts.append(page_text)
                if page_has_tables:
                    has_tables = True
            except Exception as exc:
                logger.error("[TEXTRACT] Page %d failed: %s", page_num + 1, exc)
                page_texts.append("")  # Keep page count consistent

        doc.close()

        full_text = "\n\n".join(p for p in page_texts if p.strip())
        full_text = self._post_process(full_text)
        char_count = len(full_text.strip())

        logger.info(
            "[TEXTRACT] Extraction complete: %d chars, %d pages, tables=%s",
            char_count, total_pages, has_tables
        )

        return {
            "text": full_text,
            "method_used": "aws_textract",
            "char_count": char_count,
            "page_count": total_pages,
            "has_tables": has_tables,
        }

    # ── Internal helpers ────────────────────────────────────────────────────

    def _call_textract(self, image_bytes: bytes) -> Tuple[str, bool]:
        """
        Send image bytes to Textract and extract text.

        Returns:
            (extracted_text, has_tables)
        """
        has_tables = False

        if self.analyze_tables:
            response = self._client.analyze_document(
                Document={"Bytes": image_bytes},
                FeatureTypes=["TABLES", "FORMS"],
            )
            text = self._parse_analyze_response(response)
            # Check if any TABLE block was found
            has_tables = any(b.get("BlockType") == "TABLE" for b in response.get("Blocks", []))
        else:
            response = self._client.detect_document_text(
                Document={"Bytes": image_bytes}
            )
            text = self._parse_detect_response(response)

        return text, has_tables

    def _parse_detect_response(self, response: Dict) -> str:
        """Parse DetectDocumentText response into plain text."""
        lines = []
        for block in response.get("Blocks", []):
            if block.get("BlockType") == "LINE":
                lines.append(block.get("Text", ""))
        return "\n".join(lines)

    def _parse_analyze_response(self, response: Dict) -> str:
        """
        Parse AnalyzeDocument response into text with table-aware formatting.

        Tables are reconstructed row-by-row with tab separators so downstream
        parsers can detect column relationships (e.g., company | dates | location).
        Non-table text (LINE blocks) is appended after tables.
        """
        blocks_by_id: Dict[str, Dict] = {}
        table_blocks: List[Dict] = []
        line_blocks: List[Dict] = []

        for block in response.get("Blocks", []):
            block_id = block.get("Id", "")
            blocks_by_id[block_id] = block
            bt = block.get("BlockType", "")
            if bt == "TABLE":
                table_blocks.append(block)
            elif bt == "LINE":
                line_blocks.append(block)

        parts: List[str] = []
        table_line_ids: set = set()

        # ── Extract TABLE content ──────────────────────────────────────────
        for table in table_blocks:
            rows: Dict[int, Dict[int, str]] = {}
            for rel in table.get("Relationships", []):
                if rel.get("Type") != "CHILD":
                    continue
                for cell_id in rel.get("Ids", []):
                    cell = blocks_by_id.get(cell_id, {})
                    if cell.get("BlockType") != "CELL":
                        continue
                    row_idx = cell.get("RowIndex", 0)
                    col_idx = cell.get("ColumnIndex", 0)
                    cell_text_parts: List[str] = []
                    for word_rel in cell.get("Relationships", []):
                        if word_rel.get("Type") != "CHILD":
                            continue
                        for word_id in word_rel.get("Ids", []):
                            word = blocks_by_id.get(word_id, {})
                            if word.get("BlockType") == "WORD":
                                cell_text_parts.append(word.get("Text", ""))
                                table_line_ids.add(word_id)
                    if row_idx not in rows:
                        rows[row_idx] = {}
                    rows[row_idx][col_idx] = " ".join(cell_text_parts)

            # Reconstruct table as tab-separated rows
            table_rows: List[str] = []
            for row_idx in sorted(rows.keys()):
                cols = rows[row_idx]
                row_text = "\t".join(cols.get(c, "") for c in sorted(cols.keys()))
                if row_text.strip():
                    table_rows.append(row_text)
            if table_rows:
                parts.append("\n".join(table_rows))

        # ── Append LINE blocks not already inside tables, sorted by reading order ──
        # Sort by vertical position (top coordinate) to preserve top-to-bottom order
        def _line_top(line: Dict) -> float:
            bbox = line.get("Geometry", {}).get("BoundingBox", {})
            return bbox.get("Top", 0.0)

        for line in sorted(line_blocks, key=_line_top):
            # Skip lines that are part of a table (their words are in table_line_ids)
            line_word_ids = set()
            for rel in line.get("Relationships", []):
                if rel.get("Type") == "CHILD":
                    line_word_ids.update(rel.get("Ids", []))
            if line_word_ids & table_line_ids:
                continue  # This line is in a table — already extracted
            line_text = line.get("Text", "")
            if line_text.strip():
                parts.append(line_text)

        return "\n".join(parts)

    def _post_process(self, text: str) -> str:
        """
        Normalize Textract output for downstream parsing.
        - Collapse excessive blank lines
        - Normalize tabs from table cells to spaces
        - Remove control characters
        """
        # Tab-separated table columns → space-separated for single-column parsers,
        # but preserve as-is so section splitter can detect column data.
        # Just normalize double spaces.
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Remove only true control characters (C0/C1); preserve unicode like •, –, ₹, accented chars
        text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]", "", text)
        return text.strip()
