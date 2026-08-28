import base64,sys
b64=open(sys.argv[1]).read().strip()
with open(sys.argv[2],"wb") as f:
    f.write(base64.b64decode(b64))
print("Done")
