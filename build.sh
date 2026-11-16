#!/bin/sh
# Builds index.html from the shell + source modules (order matters).
cd "$(dirname "$0")"
{ cat shell.html sprites.js src/bossart.js src/bossart3.js src/data.js src/engine.js src/meta.js src/names.js src/sprites_fn.js src/audio.js src/fx.js src/anim.js src/worldart.js src/ui.js; printf '</script>\n</body>\n</html>\n'; } > index.html
# syntax-check the game script (the last <script> block)
python3 -c "
s=open('index.html').read();i=s.rindex('<script>')+len('<script>');j=s.rindex('</script>');open('/tmp/c.js','w').write(s[i:j])" && node --check /tmp/c.js && echo BUILD_OK
