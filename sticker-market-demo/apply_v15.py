from pathlib import Path
p=Path('sticker-market-demo/index.html')
s=p.read_text(encoding='utf-8')
css=Path('sticker-market-demo/v15.css').read_text(encoding='utf-8')
js=Path('sticker-market-demo/v15.js').read_text(encoding='utf-8')
for start,end in [('/* V15_CSS_START */','/* V15_CSS_END */'),('/* V15_JS_START */','/* V15_JS_END */')]:
    while start in s and end in s:
        a=s.index(start); b=s.index(end,a)+len(end)
        s=s[:a]+s[b:]
s=s.replace('Public Demo v1.4.0','Public Demo v1.5.0')
s=s.replace('</style>',f'\n/* V15_CSS_START */\n{css}\n/* V15_CSS_END */\n</style>',1)
s=s.replace('</body>',f'\n<script>\n/* V15_JS_START */\n{js}\n/* V15_JS_END */\n</script>\n</body>',1)
p.write_text(s,encoding='utf-8')
