#!/usr/bin/env python3
"""
Manual Label Loader - Loads ONLY manually verified Label Studio annotations.
Ignores all synthetic/auto-generated labels.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
from collections import Counter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ManualLabelLoader:
    """
    Loads only manually verified Label Studio JSON files.
    Completely ignores synthetic/auto-generated labels.
    """
    
    # ONLY these 3 files will be loaded - NOTHING ELSE
    MANUAL_LABEL_FILES = [
        "labelfiledata.json",
        "labelfiledata1.json",
        "labelfiledata2.json"
    ]
    
    def __init__(self, data_dir: str = "training/data"):
        self.data_dir = Path(data_dir)
        logger.info("=" * 80)
        logger.info("🎯 MANUAL LABEL LOADER - CLEAN TRAINING MODE")
        logger.info("=" * 80)
        logger.info("✅ Loading ONLY manually verified Label Studio files")
        logger.info("❌ Ignoring ALL synthetic/auto-generated labels")
        logger.info("=" * 80)
    
    def load_all_manual_labels(self) -> List[Dict]:
        """
        Load all manually labeled data from the 3 specified files ONLY.
        
        Returns:
            List of labeled examples with text and entity annotations
        """
        all_tasks = []
        
        logger.info(f"\n📂 Loading from directory: {self.data_dir}")
        logger.info(f"📋 Target files: {len(self.MANUAL_LABEL_FILES)}")
        
        for filename in self.MANUAL_LABEL_FILES:
            filepath = self.data_dir / filename
            
            if not filepath.exists():
                logger.error(f"❌ File not found: {filepath}")
                continue
            
            logger.info(f"\n📄 Loading: {filename}")
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Validate format
                if not isinstance(data, list):
                    logger.error(f"❌ Invalid format: Expected list, got {type(data)}")
                    continue
                
                # Count valid tasks
                valid_tasks = 0
                for task in data:
                    if self._validate_task(task):
                        all_tasks.append(task)
                        valid_tasks += 1
                
                logger.info(f"✅ Loaded {valid_tasks:,} valid tasks from {filename}")
                logger.info(f"   File size: {filepath.stat().st_size / 1024 / 1024:.1f} MB")
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON decode error in {filename}: {e}")
            except Exception as e:
                logger.error(f"❌ Error loading {filename}: {e}")
        
        logger.info("\n" + "=" * 80)
        logger.info(f"✅ TOTAL MANUAL LABELS LOADED: {len(all_tasks):,}")
        logger.info("=" * 80)
        
        # Show statistics
        self._show_statistics(all_tasks)
        
        return all_tasks
    
    def _validate_task(self, task: Dict) -> bool:
        """Validate Label Studio task format."""
        required_keys = ['text', 'label']
        
        if not all(key in task for key in required_keys):
            return False
        
        if not isinstance(task['text'], str) or not task['text'].strip():
            return False
        
        if not isinstance(task['label'], list):
            return False
        
        return True
    
    def _show_statistics(self, tasks: List[Dict]):
        """Show dataset statistics."""
        if not tasks:
            logger.warning("⚠️ No tasks loaded!")
            return
        
        # Count labels
        label_counts = Counter()
        total_entities = 0
        
        for task in tasks:
            for label in task.get('label', []):
                # Handle Label Studio format: {"labels": ["COMPANY"], ...}
                if isinstance(label, dict) and 'labels' in label:
                    for label_type in label['labels']:
                        label_counts[label_type] += 1
                        total_entities += 1
                # Handle simple list format: ["COMPANY", 0, 10]
                elif isinstance(label, list) and len(label) > 0:
                    label_type = label[0]
                    label_counts[label_type] += 1
                    total_entities += 1
        
        logger.info(f"\n📊 Dataset Statistics:")
        logger.info(f"   Total tasks: {len(tasks):,}")
        logger.info(f"   Total entities: {total_entities:,}")
        logger.info(f"   Avg entities per task: {total_entities / len(tasks):.1f}")
        
        logger.info(f"\n🏷️  Entity Distribution:")
        for label, count in sorted(label_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_entities) * 100
            logger.info(f"   {label:20s}: {count:6,} ({percentage:5.1f}%)")
    
    def convert_to_ner_format(self, tasks: List[Dict]) -> List[Dict]:
        """
        Convert Label Studio format to NER training format.
        
        Label Studio format:
        {
            "text": "John Doe worked at Google",
            "label": [
                {
                    "start": 0,
                    "end": 8,
                    "text": "John Doe",
                    "labels": ["PERSON"]
                },
                {
                    "start": 19,
                    "end": 25,
                    "text": "Google",
                    "labels": ["COMPANY"]
                }
            ]
        }
        
        NER format:
        {
            "text": "John Doe worked at Google",
            "entities": [
                {"start": 0, "end": 8, "label": "PERSON"},
                {"start": 19, "end": 25, "label": "COMPANY"}
            ]
        }
        """
        logger.info("\n🔄 Converting to NER format...")
        
        ner_data = []
        skipped = 0
        
        for task in tasks:
            try:
                text = task['text']
                entities = []
                
                for label in task.get('label', []):
                    # Handle Label Studio format: {"start": 0, "end": 8, "labels": ["COMPANY"]}
                    if isinstance(label, dict):
                        start = label.get('start')
                        end = label.get('end')
                        label_types = label.get('labels', [])
                        
                        if start is not None and end is not None and label_types:
                            # Validate indices
                            if 0 <= start < end <= len(text):
                                # Use first label if multiple
                                entity_type = label_types[0]
                                entities.append({
                                    "start": start,
                                    "end": end,
                                    "label": entity_type
                                })
                            else:
                                skipped += 1
                    
                    # Handle simple list format: ["COMPANY", 0, 10]
                    elif isinstance(label, list) and len(label) >= 3:
                        entity_type, start, end = label[0], label[1], label[2]
                        
                        # Validate indices
                        if 0 <= start < end <= len(text):
                            entities.append({
                                "start": start,
                                "end": end,
                                "label": entity_type
                            })
                        else:
                            skipped += 1
                
                if entities:  # Only add if has valid entities
                    ner_data.append({
                        "text": text,
                        "entities": entities
                    })
            
            except Exception as e:
                logger.debug(f"Skipped task due to error: {e}")
                skipped += 1
        
        logger.info(f"✅ Converted {len(ner_data):,} tasks to NER format")
        if skipped > 0:
            logger.info(f"⚠️  Skipped {skipped:,} invalid entities")
        
        return ner_data
    
    def split_train_val(self, data: List[Dict], val_split: float = 0.15) -> Tuple[List[Dict], List[Dict]]:
        """
        Split data into train and validation sets.
        
        Args:
            data: List of NER examples
            val_split: Validation set ratio (default 15%)
        
        Returns:
            (train_data, val_data)
        """
        import random
        
        # Shuffle data
        random.seed(42)
        shuffled = data.copy()
        random.shuffle(shuffled)
        
        # Split
        val_size = int(len(shuffled) * val_split)
        val_data = shuffled[:val_size]
        train_data = shuffled[val_size:]
        
        logger.info(f"\n📊 Train/Val Split:")
        logger.info(f"   Training set: {len(train_data):,} examples ({(1-val_split)*100:.0f}%)")
        logger.info(f"   Validation set: {len(val_data):,} examples ({val_split*100:.0f}%)")
        
        return train_data, val_data


def main():
    """Test the loader."""
    loader = ManualLabelLoader()
    
    # Load all manual labels
    tasks = loader.load_all_manual_labels()
    
    if not tasks:
        logger.error("❌ No data loaded! Check your files.")
        return
    
    # Convert to NER format
    ner_data = loader.convert_to_ner_format(tasks)
    
    # Split train/val
    train_data, val_data = loader.split_train_val(ner_data)
    
    # Show sample
    logger.info(f"\n📝 Sample training example:")
    if train_data:
        sample = train_data[0]
        logger.info(f"   Text: {sample['text'][:100]}...")
        logger.info(f"   Entities: {len(sample['entities'])}")
        for ent in sample['entities'][:3]:
            logger.info(f"      - {ent['label']}: '{sample['text'][ent['start']:ent['end']]}'")
    
    logger.info("\n✅ Manual label loading complete!")


if __name__ == "__main__":
    main()
