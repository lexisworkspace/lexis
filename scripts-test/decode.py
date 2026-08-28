import base64,sys;data=sys.stdin.read().strip();open(sys.argv[1],'wb').write(base64.b64decode(data))
