from pathlib import Path

base = Path(__file__).resolve().parent
css = (base / 'v2.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'v21.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'v212.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'scenario_v1.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'commercial_mvp.css').read_text(encoding='utf-8')
css += '\n\n' + (base / 'commercial_mvp_delta_v1.css').read_text(encoding='utf-8')
js = (base / 'v2.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'v21.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'v211.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'v212.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_core.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_compat.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_market.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_ops.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_stabilize.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'scenario_v1_final.js').read_text(encoding='utf-8')
js += '\n\n/* Sticker Market Commercial MVP v1.0 */\n' + (base / 'commercial_mvp_core.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_checkout.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_ops.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_existing_flows.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_finalize.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_hotfix.js').read_text(encoding='utf-8')
js += '\n\n/* Sticker Market MVP formal differential v1.0 */\n' + (base / 'commercial_mvp_delta_v1.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_delta_v1_cancel.js').read_text(encoding='utf-8')
js += '\n\n' + (base / 'commercial_mvp_delta_v1_admin.js').read_text(encoding='utf-8')
# Normalize one source typo introduced while converting the legacy shell API.
js = js.replace("function shell(content,{title='',back:false,search=false,footer=false,sub='',bell=false,cart=true,noNav=false}={})", "function shell(content,{title='',back=false,search=false,footer=false,sub='',bell=false,cart=true,noNav=false}={})")
(base / 'v2.built.js').write_text(js, encoding='utf-8')
html = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5b3fd2">
<meta name="sticker-market-scenario-fit" content="v1.0">
<meta name="sticker-market-commercial-mvp" content="v1.0">
<meta name="sticker-market-mvp-delta" content="v1.0">
<title>Sticker Market — Commercial MVP v1.0</title>
<style>\n{css}\n</style>
<script src="https://js.stripe.com/v3/" defer></script>
</head>
<body>
<!-- Sticker Market scenario-fit v1.0 + commercial MVP v1.0 + formal MVP delta v1.0 -->
<a class="skip-link" href="#main">本文へ移動</a>
<div id="app" class="app"></div>
<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
<div id="loading" class="loading hidden" role="status" aria-live="polite"><span class="spin"></span><span id="loadingText">処理しています…</span></div>
<div id="modal"></div>
<script>\n{js}\n</script>
</body>
</html>'''
(base / 'index.html').write_text(html, encoding='utf-8')
print('built Sticker Market v2 + scenario-fit v1.0 + commercial MVP v1.0 + formal delta v1.0 single HTML')