from pathlib import Path

base = Path(__file__).resolve().parent
css = (base / 'v2.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'v21.css').read_text(encoding='utf-8')
js = (base / 'v2.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'v21.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'v211.js').read_text(encoding='utf-8')
# Normalize one source typo introduced while converting the legacy shell API.
js = js.replace("function shell(content,{title='',back:false,search=false,footer=false,sub='',bell=false,cart=true,noNav=false}={})", "function shell(content,{title='',back=false,search=false,footer=false,sub='',bell=false,cart=true,noNav=false}={})")
(base / 'v2.built.js').write_text(js, encoding='utf-8')
html = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5b3fd2">
<title>Sticker Market — UI Rebuild v2.0 / Interaction v2.1.1</title>
<style>\n{css}\n</style>
</head>
<body>
<a class="skip-link" href="#main">本文へ移動</a>
<div id="app" class="app"></div>
<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
<div id="loading" class="loading hidden" role="status" aria-live="polite"><span class="spin"></span><span id="loadingText">処理しています…</span></div>
<div id="modal"></div>
<script>\n{js}\n</script>
</body>
</html>'''
(base / 'index.html').write_text(html, encoding='utf-8')
print('built Sticker Market v2.0 + interaction patch v2.1.1 single HTML')
