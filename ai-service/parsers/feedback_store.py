"""
Feedback store for capturing low confidence cases and user corrections.
This data will be used for future training and model improvement.
"""

import json
import uuid
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


class FeedbackStore:
    """
    Stores feedback data for improving parsing accuracy over time.
    Captures both low-confidence cases and user corrections.
    """
    
    def __init__(self, storage_dir: str = "data/feedback"):
        """
        Initialize the feedback store.
        
        Args:
            storage_dir: Directory to store feedback data
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    def save_low_confidence_parse(self, parsed_data: dict, confidence_scores: dict, raw_text: str):
        """
        Save parsing results when confidence is low for future review.
        
        Args:
            parsed_data: The parsed resume data
            confidence_scores: Confidence scores from the parser
            raw_text: Raw resume text
        """
        overall = confidence_scores.get('overall', 1.0)
        if overall >= 0.75:
            return  # Only save uncertain cases
        
        record = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'type': 'low_confidence',
            'overall_confidence': overall,
            'section_scores': confidence_scores.get('sections', {}),
            'field_scores': confidence_scores.get('fields', {}),
            'parsed_data': parsed_data,
            'raw_text_snippet': raw_text[:500],  # First 500 chars only
            'human_correction': None,  # To be filled in later
            'reviewed': False
        }
        
        self._write(record)
        print(f"💾 Saved low confidence case (confidence: {overall:.2f})")
    
    def save_user_correction(self, original_parse_id: str, field: str, wrong_value, correct_value):
        """
        Save user corrections for training data.
        
        Args:
            original_parse_id: ID of the original parsing record
            field: Field that was corrected
            wrong_value: Original incorrect value
            correct_value: User-provided correct value
        """
        record = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'type': 'user_correction',
            'original_parse_id': original_parse_id,
            'field_corrected': field,
            'wrong_value': wrong_value,
            'correct_value': correct_value,
            'processed': False  # For training pipeline
        }
        
        self._write(record)
        
        # Also update the original record if it exists
        self._mark_original_corrected(original_parse_id)
        
        print(f"💾 Saved user correction for field '{field}'")
    
    def get_low_confidence_cases(self, limit: int = 100, unreviewed_only: bool = True) -> List[Dict[str, Any]]:
        """
        Get low confidence parsing cases for review.
        
        Args:
            limit: Maximum number of cases to return
            unreviewed_only: Only return cases that haven't been reviewed
            
        Returns:
            List of low confidence case records
        """
        cases = []
        files = sorted(self.storage_dir.glob('*.json'), reverse=True)
        
        for file_path in files[:limit]:
            try:
                data = json.loads(file_path.read_text())
                if data.get('type') == 'low_confidence':
                    if unreviewed_only and data.get('reviewed', False):
                        continue
                    cases.append(data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️ Error reading feedback file {file_path}: {e}")
                continue
        
        return cases
    
    def get_user_corrections(self, limit: int = 100, unprocessed_only: bool = True) -> List[Dict[str, Any]]:
        """
        Get user corrections for training data.
        
        Args:
            limit: Maximum number of corrections to return
            unprocessed_only: Only return unprocessed corrections
            
        Returns:
            List of user correction records
        """
        corrections = []
        files = sorted(self.storage_dir.glob('*.json'), reverse=True)
        
        for file_path in files[:limit]:
            try:
                data = json.loads(file_path.read_text())
                if data.get('type') == 'user_correction':
                    if unprocessed_only and data.get('processed', False):
                        continue
                    corrections.append(data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️ Error reading feedback file {file_path}: {e}")
                continue
        
        return corrections
    
    def mark_case_reviewed(self, case_id: str, reviewer_notes: str = None):
        """
        Mark a low confidence case as reviewed.
        
        Args:
            case_id: ID of the case to mark as reviewed
            reviewer_notes: Optional notes from the reviewer
        """
        file_path = self.storage_dir / f"{case_id}.json"
        
        if file_path.exists():
            try:
                data = json.loads(file_path.read_text())
                data['reviewed'] = True
                data['reviewer_notes'] = reviewer_notes
                data['review_timestamp'] = datetime.datetime.utcnow().isoformat()
                
                file_path.write_text(json.dumps(data, indent=2))
                print(f"✅ Marked case {case_id} as reviewed")
                
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️ Error updating case {case_id}: {e}")
        else:
            print(f"⚠️ Case {case_id} not found")
    
    def mark_correction_processed(self, correction_id: str):
        """
        Mark a user correction as processed for training.
        
        Args:
            correction_id: ID of the correction to mark as processed
        """
        file_path = self.storage_dir / f"{correction_id}.json"
        
        if file_path.exists():
            try:
                data = json.loads(file_path.read_text())
                data['processed'] = True
                data['processed_timestamp'] = datetime.datetime.utcnow().isoformat()
                
                file_path.write_text(json.dumps(data, indent=2))
                print(f"✅ Marked correction {correction_id} as processed")
                
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️ Error updating correction {correction_id}: {e}")
        else:
            print(f"⚠️ Correction {correction_id} not found")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get feedback store statistics.
        
        Returns:
            Dictionary with statistics about stored feedback
        """
        total_files = len(list(self.storage_dir.glob('*.json')))
        low_confidence_count = 0
        user_corrections_count = 0
        reviewed_count = 0
        processed_count = 0
        
        for file_path in self.storage_dir.glob('*.json'):
            try:
                data = json.loads(file_path.read_text())
                
                if data.get('type') == 'low_confidence':
                    low_confidence_count += 1
                    if data.get('reviewed', False):
                        reviewed_count += 1
                elif data.get('type') == 'user_correction':
                    user_corrections_count += 1
                    if data.get('processed', False):
                        processed_count += 1
                        
            except (json.JSONDecodeError, IOError):
                continue
        
        return {
            'total_records': total_files,
            'low_confidence_cases': low_confidence_count,
            'user_corrections': user_corrections_count,
            'reviewed_cases': reviewed_count,
            'processed_corrections': processed_count,
            'pending_review': low_confidence_count - reviewed_count,
            'pending_processing': user_corrections_count - processed_count
        }
    
    def export_training_data(self, output_file: str = None) -> str:
        """
        Export feedback data for training.
        
        Args:
            output_file: Optional output file path
            
        Returns:
            Path to the exported file
        """
        if not output_file:
            timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            output_file = f"training_data_{timestamp}.json"
        
        training_data = {
            'export_timestamp': datetime.datetime.utcnow().isoformat(),
            'statistics': self.get_statistics(),
            'low_confidence_cases': self.get_low_confidence_cases(limit=1000, unreviewed_only=False),
            'user_corrections': self.get_user_corrections(limit=1000, unprocessed_only=False)
        }
        
        output_path = self.storage_dir / output_file
        output_path.write_text(json.dumps(training_data, indent=2))
        
        print(f"📦 Exported training data to {output_path}")
        return str(output_path)
    
    def _write(self, record: Dict[str, Any]):
        """
        Write a record to storage.
        
        Args:
            record: Record to write
        """
        filename = self.storage_dir / f"{record['id']}.json"
        filename.write_text(json.dumps(record, indent=2))
    
    def _mark_original_corrected(self, original_parse_id: str):
        """
        Mark the original parse record as having received corrections.
        
        Args:
            original_parse_id: ID of the original parsing record
        """
        file_path = self.storage_dir / f"{original_parse_id}.json"
        
        if file_path.exists():
            try:
                data = json.loads(file_path.read_text())
                if data.get('type') == 'low_confidence':
                    data['has_corrections'] = True
                    data['last_correction_timestamp'] = datetime.datetime.utcnow().isoformat()
                    
                    file_path.write_text(json.dumps(data, indent=2))
                    
            except (json.JSONDecodeError, IOError):
                pass  # Ignore errors in marking
    
    def cleanup_old_records(self, days: int = 90):
        """
        Clean up old feedback records.
        
        Args:
            days: Age in days after which to delete records
        """
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
        deleted_count = 0
        
        for file_path in self.storage_dir.glob('*.json'):
            try:
                data = json.loads(file_path.read_text())
                timestamp = datetime.datetime.fromisoformat(data.get('timestamp', ''))
                
                if timestamp < cutoff_date:
                    file_path.unlink()
                    deleted_count += 1
                    
            except (json.JSONDecodeError, IOError, ValueError):
                # Delete files that can't be read or have invalid timestamps
                file_path.unlink()
                deleted_count += 1
        
        print(f"🧹 Cleaned up {deleted_count} old feedback records")
