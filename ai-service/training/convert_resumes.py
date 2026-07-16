#!/usr/bin/env python3
"""
Convert resume files (PDF/DOCX) to text format for training.
"""

import os
import sys
from pathlib import Path

def convert_pdf_to_text(pdf_path):
    """Convert PDF to text using PyPDF2 (more reliable than PyMuPDF)."""
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
    except ImportError:
        print("PyPDF2 not installed, trying with pdfplumber...")
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                return text
        except ImportError:
            print("Neither PyPDF2 nor pdfplumber available. Please install one:")
            print("pip install PyPDF2")
            print("or")
            print("pip install pdfplumber")
            return None
    except Exception as e:
        print(f"Error converting PDF {pdf_path}: {e}")
        return None

def convert_docx_to_text(docx_path):
    """Convert DOCX to text using python-docx."""
    try:
        from docx import Document
        doc = Document(docx_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except ImportError:
        print("python-docx not installed. Please install with:")
        print("pip install python-docx")
        return None
    except Exception as e:
        print(f"Error converting DOCX {docx_path}: {e}")
        return None

def main():
    """Convert all resume files to text format."""
    resumes_dir = Path("data/resumes")
    output_dir = Path("data/text_resumes")
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    # Supported file extensions
    supported_extensions = ['.pdf', '.docx']
    
    converted_files = []
    failed_files = []
    
    print("🔄 Converting resume files to text...")
    
    # Process each file
    for file_path in resumes_dir.iterdir():
        if file_path.suffix.lower() in supported_extensions:
            print(f"\n📄 Processing: {file_path.name}")
            
            # Convert based on file type
            if file_path.suffix.lower() == '.pdf':
                text = convert_pdf_to_text(file_path)
            elif file_path.suffix.lower() == '.docx':
                text = convert_docx_to_text(file_path)
            else:
                continue
            
            if text and text.strip():
                # Create output filename
                output_filename = file_path.stem + '.txt'
                output_path = output_dir / output_filename
                
                # Save text file
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                
                print(f"✅ Converted to: {output_filename}")
                print(f"📊 Text length: {len(text)} characters")
                converted_files.append(output_filename)
            else:
                print(f"❌ Failed to convert: {file_path.name}")
                failed_files.append(file_path.name)
    
    # Summary
    print(f"\n📋 Conversion Summary:")
    print(f"✅ Successfully converted: {len(converted_files)} files")
    print(f"❌ Failed to convert: {len(failed_files)} files")
    
    if converted_files:
        print(f"\n📁 Converted files saved to: {output_dir}")
        for filename in sorted(converted_files):
            print(f"   - {filename}")
    
    if failed_files:
        print(f"\n❌ Failed files:")
        for filename in failed_files:
            print(f"   - {filename}")

if __name__ == "__main__":
    main()
