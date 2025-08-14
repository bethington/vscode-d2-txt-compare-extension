#!/usr/bin/env python3
"""
Generate comprehensive header mappings for D2 TXT files.
"""

import os
import re
from typing import Set, Dict

def abbreviate_word(word: str) -> str:
    """Create smart abbreviations for long words."""
    if len(word) <= 6:
        return word
    
    # Common abbreviation patterns
    abbreviations = {
        'minimum': 'Min',
        'maximum': 'Max', 
        'magic': 'Mag',
        'level': 'Lvl',
        'damage': 'Dmg',
        'requirement': 'Req',
        'requirements': 'Req',
        'strength': 'Str',
        'dexterity': 'Dex',
        'intelligence': 'Int',
        'vitality': 'Vit',
        'durability': 'Dur',
        'inventory': 'Inv',
        'graphics': 'Gfx',
        'function': 'Func',
        'server': 'Srv',
        'missile': 'Mis',
        'calculate': 'Calc',
        'calculation': 'Calc',
        'program': 'Prg',
        'overlay': 'Ovl',
        'passive': 'Pass',
        'description': 'Desc',
        'character': 'Char',
        'alternative': 'Alt',
        'component': 'Comp',
        'stackable': 'Stack',
        'spawnable': 'Spawn',
        'transform': 'Trans',
        'upgrade': 'Upg',
        'nightmare': 'NM',
        'warning': 'Wrn',
        'treasure': 'Tres',
        'experience': 'Exp',
        'environment': 'Env',
        'lightning': 'Light',
        'resistance': 'Res',
        'modifier': 'Mod',
        'parameter': 'Param',
        'multiplicative': 'Mult',
        'exclusive': 'Excl',
        'equipment': 'Equip',
        'direction': 'Dir',
        'velocity': 'Vel',
        'collision': 'Coll',
        'automatic': 'Auto',
        'percentage': 'Pct',
        'desecrated': 'Dsec',
        'champion': 'Champ',
        'unique': 'Uniq',
        'random': 'Rand',
        'probability': 'Prob',
        'multiplier': 'Mult',
        'animation': 'Anim',
        'coordinates': 'Coord',
        'position': 'Pos',
        'distance': 'Dist',
        'monster': 'Mon',
        'elemental': 'Elem',
        'frequency': 'Freq',
        'material': 'Mat',
        'ambience': 'Amb',
        'reverb': 'Rev',
        'reflect': 'Refl',
        'environ': 'Env',
        'tracking': 'Track',
        'priority': 'Prio',
        'redirect': 'Redir',
        'channel': 'Chan',
        'filename': 'File',
        'volume': 'Vol',
        'compound': 'Comp',
        'falloff': 'Fall',
        'streaming': 'Stream',
        'blocking': 'Block',
        'threshold': 'Thresh',
        'density': 'Dense',
        'selected': 'Sel',
        'selectable': 'Sel',
        'collision': 'Coll',
        'attackable': 'Att',
        'orientation': 'Orient',
        'operate': 'Op',
        'populate': 'Pop',
        'restore': 'Rest',
        'damage': 'Dmg',
        'lockable': 'Lock',
        'synchronize': 'Sync',
        'substitute': 'Sub',
        'missile': 'Mis',
        'automap': 'Map',
        'groups': 'Grp',
        'hireling': 'Hire',
        'mercenary': 'Merc',
        'equivalent': 'Equiv',
        'chance': 'Chance',
        'resurrect': 'Res',
        'difference': 'Diff',
        'divisor': 'Div',
        'class': 'Cls'
    }
    
    lower = word.lower()
    if lower in abbreviations:
        return abbreviations[lower]
    
    # Handle numbered suffixes
    if re.match(r'.*\d+$', word):
        base = re.sub(r'\d+$', '', word)
        num = re.search(r'\d+$', word).group()
        if len(base) > 6:
            abbreviated_base = abbreviate_word(base)
            return abbreviated_base + num
        return word
    
    # Vowel removal strategy for very long words
    if len(word) > 8:
        result = word[0]
        for i in range(1, len(word)):
            char = word[i]
            if not re.match(r'[aeiouAEIOU]', char) or i == len(word) - 1:
                result += char
        if len(result) <= 6:
            return result
    
    # Fallback: first 6 characters
    return word[:6]

def generate_smart_abbreviation(header: str) -> str:
    """Generate smart abbreviation for a header."""
    # Break into words by camelCase, underscores, and other separators
    words = re.sub(r'([a-z])([A-Z])', r'\1 \2', header)  # camelCase
    words = re.sub(r'[_\-()]', ' ', words)  # underscores, hyphens, parentheses
    words = words.split()
    words = [w for w in words if w]
    
    if len(words) == 1:
        word = words[0]
        if len(word) <= 6:
            return word
        return abbreviate_word(word)
    
    # Multiple words - abbreviate each if needed
    result_words = []
    for word in words:
        if len(word) <= 6:
            result_words.append(word)
        else:
            result_words.append(abbreviate_word(word))
    
    # Join words but keep reasonable length
    result = ''.join(result_words)
    if len(result) > 8:
        # Try with just first letter of each word except the last
        if len(words) > 1:
            result = ''.join([w[0] for w in result_words[:-1]]) + result_words[-1]
    
    return result[:8] if len(result) > 8 else result

def extract_headers_from_file(filepath: str) -> Set[str]:
    """Extract headers from a single TXT file."""
    headers = set()
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if first_line:
                # Split by tab and clean up headers
                file_headers = [h.strip() for h in first_line.split('\t') if h.strip()]
                headers.update(file_headers)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return headers

def main():
    """Main function to process all TXT files and generate header mappings."""
    sample_data_dir = "sample-data"
    all_headers = set()
    
    # Process all TXT files
    for filename in os.listdir(sample_data_dir):
        if filename.endswith('.txt'):
            filepath = os.path.join(sample_data_dir, filename)
            headers = extract_headers_from_file(filepath)
            all_headers.update(headers)
            print(f"Processed {filename}: {len(headers)} headers")
    
    print(f"\nTotal unique headers found: {len(all_headers)}")
    
    # Generate mappings
    mappings = {}
    for header in sorted(all_headers):
        # Skip empty headers or comments
        if not header or header.startswith('*') or header.startswith('#'):
            continue
        
        abbreviated = generate_smart_abbreviation(header)
        mappings[header] = abbreviated
    
    # Output as TypeScript object
    print(f"\nGenerated {len(mappings)} header mappings:\n")
    print("const DEFAULT_HEADER_MAPPINGS: { [key: string]: string } = {")
    
    for header, abbrev in sorted(mappings.items()):
        print(f'    "{header}": "{abbrev}",')
    
    print("};")
    
    # Also save to a file
    with open('header_mappings.ts', 'w', encoding='utf-8') as f:
        f.write("// Auto-generated header mappings for D2 TXT files\n")
        f.write("const DEFAULT_HEADER_MAPPINGS: { [key: string]: string } = {\n")
        for header, abbrev in sorted(mappings.items()):
            f.write(f'    "{header}": "{abbrev}",\n')
        f.write("};\n")
    
    print(f"\nMappings saved to header_mappings.ts")

if __name__ == "__main__":
    main()
