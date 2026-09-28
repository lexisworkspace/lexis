import sys
data = open("/dev/stdin").read()
with open("src/components/layout/IntroFlow.tsx", "w") as out:
    out.write(data)
print(f"Written {len(data)} bytes")
