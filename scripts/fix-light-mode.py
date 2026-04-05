"""
NioSports Pro — Light Mode Fix Script
Replaces hardcoded dark-mode colors with CSS variables.
Run: py scripts/fix-light-mode.py
"""

import os
import re
import glob

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src')

files = []
for p in [
    os.path.join(ROOT, 'routes', '**', '*.svelte'),
    os.path.join(ROOT, 'lib', 'components', '**', '*.svelte'),
]:
    files.extend(glob.glob(p, recursive=True))

print(f"Found {len(files)} .svelte files")

REPLACEMENTS = [
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)', 'color: var(--color-text-primary)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.8\)', 'color: var(--color-text-primary)'),
    (r'color:\s*#ededed', 'color: var(--color-text-primary)'),
    (r'color:\s*#e2e8f0', 'color: var(--color-text-primary)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.7\)', 'color: var(--color-text-secondary)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.6\)', 'color: var(--color-text-secondary)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.55\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.5\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.45\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.4\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.35\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.3\)', 'color: var(--color-text-muted)'),
    (r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.25\)', 'color: var(--color-text-muted)'),
    (r'color:\s*#94a3b8', 'color: var(--color-text-muted)'),
    (r'color:\s*#64748b', 'color: var(--color-text-muted)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.03\)', 'background: var(--color-bg-card)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.04\)', 'background: var(--color-bg-card)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.05\)', 'background: var(--color-bg-elevated)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)', 'background: var(--color-bg-elevated)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)', 'background: var(--color-bg-elevated)'),
    (r'background:\s*#111318', 'background: var(--color-bg-elevated)'),
    (r'background:\s*#060912', 'background: var(--color-bg-base)'),
    (r'background:\s*rgba\(255,\s*255,\s*255,\s*0\.02\)', 'background: var(--color-bg-card)'),
    (r'border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.04\)', 'border: 1px solid var(--color-border)'),
    (r'border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.06\)', 'border: 1px solid var(--color-border)'),
    (r'border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.08\)', 'border: 1px solid var(--color-border)'),
    (r'border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.1\b\)', 'border: 1px solid var(--color-border-hover)'),
    (r'border:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.15\)', 'border: 1px solid var(--color-border-hover)'),
    (r'border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)', 'border-color: var(--color-border)'),
    (r'border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)', 'border-color: var(--color-border)'),
    (r'border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.15\)', 'border-color: var(--color-border-hover)'),
    (r'border-bottom:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.04\)', 'border-bottom: 1px solid var(--color-border)'),
    (r'border-bottom:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.06\)', 'border-bottom: 1px solid var(--color-border)'),
    (r'border-top:\s*1px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.06\)', 'border-top: 1px solid var(--color-border)'),
]

total_replacements = 0

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    counter = [0]

    def do_replace(match, c=counter):
        prefix = match.group(1)
        style = match.group(2)
        suffix = match.group(3)
        for pat, rep in REPLACEMENTS:
            new_style, n = re.subn(pat, rep, style)
            if n > 0:
                c[0] += n
                style = new_style
        return prefix + style + suffix

    content = re.sub(r'(<style[^>]*>)(.*?)(</style>)', do_replace, content, flags=re.DOTALL)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        rel = os.path.relpath(filepath, os.path.join(ROOT, '..'))
        print(f"  ✓ {rel}: {counter[0]} replacements")
        total_replacements += counter[0]

print(f"\nTotal: {total_replacements} replacements")
print("Done! Test light mode.")