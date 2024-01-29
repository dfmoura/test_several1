import time
import sys

def contador(segundos):
    for i in range(segundos):
        min, seg = divmod(segundos-i,60)
        texto = f"{min:02d}:{seg:02d}"
        print(texto,end="\r")
        sys.stdout.flush()
        time.sleep(1)


contador(10)        