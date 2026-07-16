#!/usr/bin/env python3
"""
Fix CoNLL file by adding proper sentence separators
"""

def fix_conll_file(input_file, output_file):
    """Add sentence separators to CoNLL file"""
    print(f"🔧 Fixing CoNLL file: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Process lines to add sentence separators
    fixed_lines = []
    current_sentence = []
    
    for line in lines:
        line = line.strip()
        if line:  # Non-empty line
            parts = line.split('\t')
            if len(parts) == 2:
                token, label = parts
                current_sentence.append(f"{token}\t{label}")
        else:
            # Empty line - end of sentence
            if current_sentence:
                fixed_lines.extend(current_sentence)
                fixed_lines.append("")  # Add empty line separator
                current_sentence = []
    
    # Add last sentence if file doesn't end with empty line
    if current_sentence:
        fixed_lines.extend(current_sentence)
        fixed_lines.append("")
    
    # Write fixed file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(fixed_lines))
    
    print(f"✅ Fixed CoNLL file saved to: {output_file}")
    print(f"   Original lines: {len(lines)}")
    print(f"   Fixed lines: {len(fixed_lines)}")
    print(f"   Sentences: {len([line for line in fixed_lines if line == ''])}")
    
    return output_file

def main():
    """Main function"""
    import os
    from pathlib import Path
    
    base_dir = Path(__file__).parent / "data"
    
    # Fix train file
    train_input = base_dir / "dataset_train.conll"
    train_output = base_dir / "dataset_train_fixed.conll"
    fix_conll_file(train_input, train_output)
    
    # Fix test file
    test_input = base_dir / "dataset_test.conll"
    test_output = base_dir / "dataset_test_fixed.conll"
    fix_conll_file(test_input, test_output)
    
    # Replace original files
    os.replace(train_output, train_input)
    os.replace(test_output, test_input)
    
    print("✅ All CoNLL files fixed!")

if __name__ == "__main__":
    main()
