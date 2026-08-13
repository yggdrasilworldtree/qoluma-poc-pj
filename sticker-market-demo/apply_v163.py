from pathlib import Path
import re

root = Path(__file__).resolve().parent
index = root / 'index.html'
css_file = root / 'v163.css'
text = index.read_text(encoding='utf-8')
css = css_file.read_text(encoding='utf-8').rstrip()

old = 'modal(`<div class="row"><div><h2 style="margin:0">AIスタジオの使い方</h2>'
new = 'modal(`<div class="row v163-ai-help-head"><div><h2 style="margin:0">AIスタジオの使い方</h2>'
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('AI Studio help header markup was not found')

text = re.sub(
    r'\n<style>\n/\* V163_CSS_START \*/.*?/\* V163_CSS_END \*/\n</style>\n?',
    '\n',
    text,
    flags=re.S,
)
block = f'\n<style>\n/* V163_CSS_START */\n{css}\n/* V163_CSS_END */\n</style>\n'
if '</body>' not in text:
    raise SystemExit('</body> was not found')
text = text.replace('</body>', block + '\n</body>', 1)
index.write_text(text, encoding='utf-8')
