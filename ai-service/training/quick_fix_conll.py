#!/usr/bin/env python3
"""
Quick fix: Add sentence separators to original CoNLL files
"""

def fix_conll_by_record_separation(input_file, output_file):
    """Add empty lines between records in CoNLL file"""
    print(f"🔧 Fixing CoNLL file: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed_lines = []
    record_count = 0
    
    for line in lines:
        line = line.strip()
        if line:  # Non-empty line
            parts = line.split('\t')
            if len(parts) == 2:
                token, label = parts
                fixed_lines.append(f"{token}\t{label}")
        else:
            # Add sentence separator for each record
            if fixed_lines:  # Only add if we have content
                fixed_lines.append("")
                record_count += 1
    
    # Add final separator
    if fixed_lines and fixed_lines[-1] != "":
        fixed_lines.append("")
        record_count += 1
    
    # Write fixed file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(fixed_lines))
    
    print(f"✅ Fixed CoNLL file saved to: {output_file}")
    print(f"   Records: {record_count}")
    print(f"   Lines: {len(fixed_lines)}")
    
    return output_file

def create_simple_conll_from_json():
    """Create simple CoNLL format treating each JSON record as one sentence"""
    import json
    from pathlib import Path
    
    base_dir = Path(__file__).parent / "data"
    input_file = base_dir / "merged_dataset.json"
    
    print(f"📖 Reading JSON from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Processing {len(data)} records...")
    
    conll_lines = []
    
    for idx, record in enumerate(data):
        if idx % 1000 == 0:
            print(f"   Processing record {idx}/{len(data)}")
        
        text = record.get('text', '')
        labels = record.get('label', [])
        
        if not text or not labels:
            continue
        
        # Simple tokenization - split by whitespace and common delimiters
        tokens = text.replace('|', ' ').replace('::', ' : ').split()
        
        # Create a mapping of entity text to labels
        entity_map = {}
        for label_info in labels:
            if 'labels' in label_info:
                entity_text = text[label_info['start']:label_info['end']]
                entity_label = label_info['labels'][0]
                entity_map[entity_text] = entity_label
        
        # Process tokens
        for token in tokens:
            label = 'O'  # Default
            
            # Check if token matches any entity
            for entity_text, entity_label in entity_map.items():
                if token in entity_text or entity_text in token:
                    label = f"B-{entity_label}"
                    break
            
            conll_lines.append(f"{token}\t{label}")
        
        # Add sentence separator
        conll_lines.append("")
    
    # Write CoNLL file
    output_file = base_dir / "simple_dataset.conll"
    print(f"💾 Writing CoNLL to: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(conll_lines))
    
    print(f"✅ Simple CoNLL created!")
    print(f"   Records: {len([line for line in conll_lines if line == ''])}")
    print(f"   Tokens: {len([line for line in conll_lines if line != ''])}")
    
    return output_file

def split_simple_conll(conll_file, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1):
    """Split simple CoNLL data"""
    from pathlib import Path
    print(f"📂 Splitting CoNLL data from: {conll_file}")
    
    with open(conll_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by double newlines (sentence separators)
    sentences = content.strip().split('\n\n')
    
    print(f"📊 Total sentences: {len(sentences)}")
    
    # Calculate split indices
    total = len(sentences)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)
    
    # Split sentences
    train_sentences = sentences[:train_end]
    val_sentences = sentences[train_end:val_end]
    test_sentences = sentences[val_end:]
    
    print(f"   Train: {len(train_sentences)} sentences")
    print(f"   Val:   {len(val_sentences)} sentences")
    print(f"   Test:  {len(test_sentences)} sentences")
    
    # Write split files
    base_dir = Path(conll_file).parent
    base_name = Path(conll_file).stem
    
    splits = [
        (train_sentences, base_dir / f"{base_name}_train.conll"),
        (val_sentences, base_dir / f"{base_name}_val.conll"),
        (test_sentences, base_dir / f"{base_name}_test.conll")
    ]
    
    for sentences, output_path in splits:
        with open(output_path, 'w', encoding='utf-8') as f:
            for sentence in sentences:
                f.write(sentence)
                f.write('\n\n')  # Double newline between sentences
        
        print(f"💾 Saved: {output_path}")
    
    return splits

def main():
    """Main function"""
    print("🚀 Creating simple CoNLL format...")
    
    # Create simple CoNLL
    conll_file = create_simple_conll_from_json()
    
    # Split into train/val/test
    split_files = split_simple_conll(conll_file)
    
    print("✅ Simple CoNLL files created!")
    print("\n📁 Generated files:")
    print(f"   - {conll_file}")
    for _, file_path in split_files:
        print(f"   - {file_path}")

if __name__ == "__main__":
    main()
