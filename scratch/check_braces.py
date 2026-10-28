import sys

for p in ['firmware/kabutech_prototype/kabutech_prototype.ino', 'firmware/kabutech_prototype/tft_display.h']:
    lines = open(p, encoding='utf-8').readlines()
    depth = 0
    in_str = False
    in_chr = False
    in_line_cmt = False
    in_blk_cmt = False
    for line_idx, line in enumerate(lines, 1):
        i = 0
        while i < len(line):
            c = line[i]
            nxt = line[i+1] if i+1 < len(line) else ''
            if in_line_cmt:
                if c == '\n': in_line_cmt = False
            elif in_blk_cmt:
                if c == '*' and nxt == '/': in_blk_cmt = False; i += 1
            elif in_str:
                if c == '\\': i += 1
                elif c == '"': in_str = False
            elif in_chr:
                if c == '\\': i += 1
                elif c == "'": in_chr = False
            else:
                if c == '/' and nxt == '/': in_line_cmt = True; i += 1
                elif c == '/' and nxt == '*': in_blk_cmt = True; i += 1
                elif c == '"': in_str = True
                elif c == "'": in_chr = True
                elif c == '{': depth += 1
                elif c == '}':
                    depth -= 1
                    if depth < 0:
                        print(f"Negative depth in {p} at line {line_idx}")
            i += 1
    print(f"{p}: final clean brace depth = {depth}, lines = {len(lines)}")

