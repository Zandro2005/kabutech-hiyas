with open('firmware/kabutech_prototype/kabutech_prototype.ino', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if 'bool resyncCloudSetpoints(' in line and not line.strip().endswith(';'):
            for j in range(i-1, i+60):
                print(f'{j+1}: {lines[j]}', end='')
            break

