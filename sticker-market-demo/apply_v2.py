from pathlib import Path

base = Path(__file__).resolve().parent
css = (base / 'v2.css').read_text(encoding='utf-8')
js = (base / 'v2.js').read_text(encoding='utf-8')
html = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5b3fd2">
<title>Sticker Market — UI Rebuild v2.0</title>
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
print('built Sticker Market v2 single HTML')
