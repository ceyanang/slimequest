# Builds a tiny pixel font with just the digits 0-9 (clear 2s and 5s) and prints a base64 @font-face rule.
import base64, io
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

D = {
 '0':[".###.","#...#","#..##","#.#.#","##..#","#...#",".###."],
 '1':["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
 '2':[".###.","#...#","....#","...#.","..#..",".#...","#####"],
 '3':[".###.","#...#","....#","..##.","....#","#...#",".###."],
 '4':["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."],
 '5':["#####","#....","####.","....#","....#","#...#",".###."],
 '6':[".###.","#....","#....","####.","#...#","#...#",".###."],
 '7':["#####","....#","...#.","..#..",".#...",".#...",".#..."],
 '8':[".###.","#...#","#...#",".###.","#...#","#...#",".###."],
 '9':[".###.","#...#","#...#",".####","....#","....#",".###."],
}
PX, ADV = 100, 620          # pixel size and advance width in font units (1000 per em)
names = ['.notdef'] + ['d' + k for k in D]
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({ord(k): 'd' + k for k in D})
glyphs = {}
pen = TTGlyphPen(None); glyphs['.notdef'] = pen.glyph()
for k, rows in D.items():
    pen = TTGlyphPen(None)
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != '#': continue
            x0, y1 = 35 + c * PX, (7 - r) * PX; x1, y0 = x0 + PX, y1 - PX
            pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
    glyphs['d' + k] = pen.glyph()
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: (ADV if n != '.notdef' else 500, 0) for n in names})
fb.setupHorizontalHeader(ascent=850, descent=-200)
fb.setupNameTable({'familyName': 'SQDigits', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=850, sTypoDescender=-200, usWinAscent=850, usWinDescent=200)
fb.setupPost()
buf = io.BytesIO(); fb.save(buf)
b64 = base64.b64encode(buf.getvalue()).decode()
print("  @font-face { font-family:'SQDigits'; src:url(data:font/ttf;base64," + b64 + ") format('truetype'); unicode-range:U+0030-0039; }")
