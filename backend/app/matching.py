"""Motor local y explicable de compatibilidad (NLP léxico; no modelo generativo)."""
import re,unicodedata
STOP={'para','con','del','las','los','una','uno','por','que','sobre','desde','como','trabajo','experiencia','conocimientos','buscamos','empresa','desarrollo','requisitos','debe','tener','esta','este'}
def tokens(text):
    text=unicodedata.normalize('NFKD',text.lower())
    text=''.join(c for c in text if not unicodedata.combining(c))
    return {x for x in re.findall(r'[a-z0-9+#.]{2,}',text) if x not in STOP}
def score(profile,requirements):
    required=tokens(requirements)
    found=tokens(profile)
    matches=sorted(required & found)
    missing=sorted(required-found)
    percentage=round(100*len(matches)/len(required)) if required else 0
    return {'puntuacion':percentage,'coincidencias':matches,'faltantes':missing,'metodo':'Coincidencia léxica explicable; orientativa, no decisión automática'}
