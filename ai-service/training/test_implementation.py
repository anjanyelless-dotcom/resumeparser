#!/usr/bin/env python3
"""
Test script to verify the DeBERTa NER implementation.

This script tests:
1. Model loader functionality
2. Label mappings
3. Import statements
4. Basic functionality
"""

import sys
import os

def test_imports():
    """Test that all modules can be imported"""
    print("=" * 60)
    print("TEST 1: Module Imports")
    print("=" * 60)
    
    try:
        from model_loader import (
            ModelLoader, 
            get_label_mappings, 
            load_for_training, 
            load_for_inference,
            LABELS,
            LABEL_TO_ID,
            ID_TO_LABEL
        )
        print("✅ model_loader imports successful")
    except Exception as e:
        print(f"❌ model_loader import failed: {e}")
        return False
    
    try:
        from predict import ResumeNERPredictor
        print("✅ predict imports successful")
    except Exception as e:
        print(f"❌ predict import failed: {e}")
        return False
    
    try:
        from convert_doccano_to_training import (
            ENTITY_MAPPING,
            create_bio_tags,
            convert_doccano_to_training_format
        )
        print("✅ convert_doccano_to_training imports successful")
    except Exception as e:
        print(f"❌ convert_doccano_to_training import failed: {e}")
        return False
    
    return True


def test_label_mappings():
    """Test label mappings"""
    print("\n" + "=" * 60)
    print("TEST 2: Label Mappings")
    print("=" * 60)
    
    from model_loader import LABELS, LABEL_TO_ID, ID_TO_LABEL
    
    # Check label count
    expected_labels = [
        'O',
        'B-PERSON', 'I-PERSON',
        'B-COMPANY', 'I-COMPANY',
        'B-CLIENT', 'I-CLIENT',
        'B-ROLE', 'I-ROLE',
        'B-LOCATION', 'I-LOCATION',
        'B-START_DATE', 'I-START_DATE',
        'B-END_DATE', 'I-END_DATE',
        'B-EDUCATION', 'I-EDUCATION',
        'B-DEGREE', 'I-DEGREE'
    ]
    
    if len(LABELS) != len(expected_labels):
        print(f"❌ Expected {len(expected_labels)} labels, got {len(LABELS)}")
        return False
    
    print(f"✅ Label count correct: {len(LABELS)} labels")
    
    # Check all expected labels are present
    for label in expected_labels:
        if label not in LABELS:
            print(f"❌ Missing label: {label}")
            return False
    
    print("✅ All expected labels present")
    
    # Check mappings
    if len(LABEL_TO_ID) != len(LABELS):
        print(f"❌ LABEL_TO_ID mapping incomplete")
        return False
    
    if len(ID_TO_LABEL) != len(LABELS):
        print(f"❌ ID_TO_LABEL mapping incomplete")
        return False
    
    print("✅ Label mappings complete")
    
    # Print sample mappings
    print("\nSample label mappings:")
    for i, label in enumerate(LABELS[:5]):
        print(f"  {i} → {label} → {LABEL_TO_ID[label]}")
    
    return True


def test_entity_mapping():
    """Test entity mapping in convert_doccano_to_training"""
    print("\n" + "=" * 60)
    print("TEST 3: Entity Mapping")
    print("=" * 60)
    
    from convert_doccano_to_training import ENTITY_MAPPING
    
    # Check required mappings
    required_mappings = {
        'PERSON': ['PERSON', 'NAME', 'PERSON_NAME'],
        'COMPANY': ['COMPANY', 'ORGANIZATION', 'ORG'],
        'CLIENT': ['CLIENT'],
        'ROLE': ['ROLE', 'TITLE', 'JOB_TITLE'],
        'LOCATION': ['LOCATION', 'LOC'],
        'START_DATE': ['START_DATE'],
        'END_DATE': ['END_DATE'],
        'EDUCATION': ['EDUCATION', 'UNIVERSITY', 'COLLEGE'],
        'DEGREE': ['DEGREE']
    }
    
    for target, sources in required_mappings.items():
        for source in sources:
            if source not in ENTITY_MAPPING:
                print(f"❌ Missing mapping: {source}")
                return False
            if ENTITY_MAPPING[source] != target:
                print(f"❌ Wrong mapping: {source} → {ENTITY_MAPPING[source]} (expected {target})")
                return False
    
    print(f"✅ Entity mappings correct ({len(ENTITY_MAPPING)} mappings)")
    
    # Print sample mappings
    print("\nSample entity mappings:")
    for source, target in list(ENTITY_MAPPING.items())[:10]:
        print(f"  {source} → {target}")
    
    return True


def test_model_loader():
    """Test ModelLoader class"""
    print("\n" + "=" * 60)
    print("TEST 4: ModelLoader Class")
    print("=" * 60)
    
    from model_loader import ModelLoader, get_label_mappings
    
    # Test get_label_mappings
    mappings = get_label_mappings()
    if 'labels' not in mappings or 'label2id' not in mappings or 'id2label' not in mappings:
        print("❌ get_label_mappings() missing keys")
        return False
    
    print("✅ get_label_mappings() works")
    
    # Test ModelLoader initialization
    try:
        loader = ModelLoader()
        print(f"✅ ModelLoader initialized")
        print(f"   Device: {loader.device}")
    except Exception as e:
        print(f"❌ ModelLoader initialization failed: {e}")
        return False
    
    return True


def test_predictor_class():
    """Test ResumeNERPredictor class structure"""
    print("\n" + "=" * 60)
    print("TEST 5: ResumeNERPredictor Class")
    print("=" * 60)
    
    from predict import ResumeNERPredictor
    
    # Check methods exist
    required_methods = [
        'predict',
        'extract_entities',
        'predict_experience_section',
        'predict_education_section',
        'predict_batch'
    ]
    
    for method in required_methods:
        if not hasattr(ResumeNERPredictor, method):
            print(f"❌ Missing method: {method}")
            return False
    
    print("✅ All required methods present")
    print("   Methods:", ", ".join(required_methods))
    
    return True


def test_bio_conversion():
    """Test BIO tag conversion"""
    print("\n" + "=" * 60)
    print("TEST 6: BIO Tag Conversion")
    print("=" * 60)
    
    from convert_doccano_to_training import create_bio_tags
    
    # Test case
    text = "John Doe works at Acme Corp"
    entities = [
        [0, 8, 'PERSON'],      # John Doe
        [18, 27, 'COMPANY']    # Acme Corp
    ]
    
    tokens, ner_tags = create_bio_tags(text, entities)
    
    print(f"Text: {text}")
    print(f"Tokens: {tokens}")
    print(f"Tags: {ner_tags}")
    
    # Verify
    if 'B-PERSON' not in ner_tags:
        print("❌ Missing B-PERSON tag")
        return False
    
    if 'B-COMPANY' not in ner_tags:
        print("❌ Missing B-COMPANY tag")
        return False
    
    print("✅ BIO conversion works correctly")
    
    return True


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("DeBERTa NER Implementation Verification")
    print("=" * 60 + "\n")
    
    tests = [
        ("Module Imports", test_imports),
        ("Label Mappings", test_label_mappings),
        ("Entity Mapping", test_entity_mapping),
        ("ModelLoader Class", test_model_loader),
        ("ResumeNERPredictor Class", test_predictor_class),
        ("BIO Tag Conversion", test_bio_conversion),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Implementation verified.")
        print("\nNext steps:")
        print("1. Prepare training data (see QUICK_START.md)")
        print("2. Run: python train.py")
        print("3. Run: python predict.py --text 'your text here'")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
