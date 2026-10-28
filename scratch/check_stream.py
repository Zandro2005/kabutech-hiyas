import subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
out = subprocess.check_output(['git', 'show', '7713d4e:firmware/kabutech_prototype/kabutech_prototype.ino'], encoding='utf-8', errors='replace')
lines = out.splitlines()
for i, line in enumerate(lines, 1):
    if 'void streamCallback(' in line:
        for j in range(i-1, i+60):
            print(f'{j+1}: {lines[j]}')
        break

