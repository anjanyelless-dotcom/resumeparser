#!/usr/bin/env python3
"""
Simple training script using existing training.py structure with improved data
"""

import os
import subprocess
import sys
from pathlib import Path

def main():
    """Run training with improved dataset"""
    print("🚀 STARTING TRAINING WITH IMPROVED DATASET")
    print("=" * 60)
    
    # Check if dataset files exist
    base_dir = Path(__file__).parent / "data"
    train_file = base_dir / "dataset_train.conll"
    test_file = base_dir / "dataset_test.conll"
    
    if not train_file.exists():
        print(f"❌ Training file not found: {train_file}")
        return 1
    
    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return 1
    
    print(f"✅ Training file: {train_file}")
    print(f"✅ Test file: {test_file}")
    
    # Count lines in files
    train_lines = sum(1 for _ in open(train_file, 'r', encoding='utf-8'))
    test_lines = sum(1 for _ in open(test_file, 'r', encoding='utf-8'))
    
    print(f"📊 Training lines: {train_lines}")
    print(f"📊 Test lines: {test_lines}")
    
    # Copy the original training script and modify paths
    original_script = Path(__file__).parent / "train.py"
    if not original_script.exists():
        print(f"❌ Original training script not found: {original_script}")
        return 1
    
    # Read and modify the training script
    with open(original_script, 'r', encoding='utf-8') as f:
        script_content = f.read()
    
    # Update file paths and parameters
    script_content = script_content.replace(
        'train_file = "data/splits/train.conll"',
        'train_file = "data/dataset_train.conll"'
    )
    script_content = script_content.replace(
        'test_file = "data/splits/test.conll"',
        'test_file = "data/dataset_test.conll"'
    )
    script_content = script_content.replace(
        'max_length = 512',
        'max_length = 1024'
    )
    script_content = script_content.replace(
        'epochs = 5',
        'epochs = 8'
    )
    script_content = script_content.replace(
        'learning_rate = 2e-5',
        'learning_rate = 3e-5'
    )
    
    # Save modified script
    modified_script = Path(__file__).parent / "train_improved.py"
    with open(modified_script, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print(f"📝 Created modified training script: {modified_script}")
    
    # Run the training
    print("🏋️  Starting training...")
    print("This will take 2-3 hours depending on your hardware...")
    print("You can monitor progress in the terminal.")
    print()
    
    try:
        # Run the training script
        result = subprocess.run([
            sys.executable, 
            str(modified_script)
        ], capture_output=False, text=True)
        
        if result.returncode == 0:
            print("✅ Training completed successfully!")
            print("🎉 Model saved to: models/resume-ner-final")
        else:
            print(f"❌ Training failed with exit code: {result.returncode}")
            return 1
            
    except KeyboardInterrupt:
        print("\n⚠️ Training interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Training error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
