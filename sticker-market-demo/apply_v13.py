from pathlib import Path

root = Path(__file__).resolve().parent
index = root / 'index.html'
css = (root / 'v13.css').read_text(encoding='utf-8')
js = (root / 'v13.js').read_text(encoding='utf-8')
html = index.read_text(encoding='utf-8')

html = html.replace('Sticker Market — Public Demo v1.2.0', 'Sticker Market — Public Demo v1.3.0')
html = html.replace('Sticker Market — Public Demo v1.1.0', 'Sticker Market — Public Demo v1.3.0')

css_marker = 'Sticker Market v1.3 — responsive/mobile UX'
js_marker = 'Sticker Market v1.3 — responsive/search/product/shop/auth UX'

if css_marker not in html:
    pos = html.find('</style>')
    if pos < 0:
        raise SystemExit('style close tag not found')
    html = html[:pos] + '\n\n' + css + '\n' + html[pos:]

if js_marker not in html:
    pos = html.rfind('</body>')
    if pos < 0:
        raise SystemExit('body close tag not found')
    html = html[:pos] + '\n<script>\n' + js + '\n</script>\n' + html[pos:]

index.write_text(html, encoding='utf-8')
print('patched', index)
