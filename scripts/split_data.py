#!/usr/bin/env python3
"""
Split CoNLL dataset into training and testing sets.
Keeps entire resumes together (no splitting across train/test).
"""

import random
from pathlib import Path


def read_conll_sentences(file_path: str) -> list:
    """Read CoNLL file and return list of sentences (each sentence is a list of token-label pairs)."""
    sentences = []
    current_sentence = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:  # Non-empty line (token-label pair)
                parts = line.split('\t')
                if len(parts) == 2:
                    token, label = parts
                    current_sentence.append((token, label))
            else:  # Empty line (sentence boundary)
                if current_sentence:
                    sentences.append(current_sentence)
                    current_sentence = []
    
    # Add the last sentence if file doesn't end with empty line
    if current_sentence:
        sentences.append(current_sentence)
    
    return sentences


def write_conll_sentences(sentences: list, output_path: str):
    """Write sentences to CoNLL format file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for sentence in sentences:
            for token, label in sentence:
                f.write(f"{token}\t{label}\n")
            f.write("\n")  # Empty line between sentences


def split_dataset(sentences: list, train_ratio: float = 0.8, random_seed: int = 42):
    """Split sentences into train and test sets."""
    random.seed(random_seed)
    
    # Shuffle sentences for random split
    shuffled_sentences = sentences.copy()
    random.shuffle(shuffled_sentences)
    
    # Calculate split point
    total_sentences = len(shuffled_sentences)
    train_size = int(total_sentences * train_ratio)
    
    # Split
    train_sentences = shuffled_sentences[:train_size]
    test_sentences = shuffled_sentences[train_size:]
    
    return train_sentences, test_sentences


def main():
    """Main splitting function."""
    input_file = "data/converted/dataset.conll"
    output_dir = "data/splits"
    train_file = f"{output_dir}/train.conll"
    test_file = f"{output_dir}/test.conll"
    
    # Check if input file exists
    if not Path(input_file).exists():
        print(f"❌ Input file not found: {input_file}")
        return
    
    print("🔄 SPLITTING DATASET")
    print("=" * 50)
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Read all sentences
    print(f"📖 Reading {input_file}...")
    sentences = read_conll_sentences(input_file)
    total_resumes = len(sentences)
    
    print(f"✅ Found {total_resumes} resumes")
    
    # Split dataset
    print("🔀 Splitting into 80% train / 20% test...")
    train_sentences, test_sentences = split_dataset(sentences, train_ratio=0.8)
    
    # Write split files
    print(f"💾 Writing training data to {train_file}...")
    write_conll_sentences(train_sentences, train_file)
    
    print(f"💾 Writing test data to {test_file}...")
    write_conll_sentences(test_sentences, test_file)
    
    # Calculate statistics
    train_count = len(train_sentences)
    test_count = len(test_sentences)
    train_tokens = sum(len(sentence) for sentence in train_sentences)
    test_tokens = sum(len(sentence) for sentence in test_sentences)
    
    print("\n📊 SPLIT SUMMARY")
    print("=" * 50)
    print(f"📄 Total resumes: {total_resumes}")
    print(f"🚂 Training resumes: {train_count} ({train_count/total_resumes*100:.1f}%)")
    print(f"🧪 Test resumes: {test_count} ({test_count/total_resumes*100:.1f}%)")
    print(f"🔤 Training tokens: {train_tokens}")
    print(f"🔤 Test tokens: {test_tokens}")
    
    # Verify split integrity
    print(f"\n✅ Split completed successfully!")
    print(f"📁 Training data: {train_file}")
    print(f"📁 Test data: {test_file}")
    
    # Show sample from each split
    print(f"\n📄 SAMPLE FROM TRAINING DATA:")
    print("-" * 30)
    for i, (token, label) in enumerate(train_sentences[0][:5]):
        print(f"{token:<15} {label}")
    if len(train_sentences[0]) > 5:
        print(f"... ({len(train_sentences[0]) - 5} more tokens)")
    
    print(f"\n📄 SAMPLE FROM TEST DATA:")
    print("-" * 30)
    for i, (token, label) in enumerate(test_sentences[0][:5]):
        print(f"{token:<15} {label}")
    if len(test_sentences[0]) > 5:
        print(f"... ({len(test_sentences[0]) - 5} more tokens)")


if __name__ == "__main__":
    main()
