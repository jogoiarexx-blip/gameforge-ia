"""Teste integrado real: backup, restauração, recarga, desfazer e falha de armazenamento."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json, tempfile, zipfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass

def run():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/'
 with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
  errors=[]
  try:
   context=browser.new_context(viewport={'width':1400,'height':950},accept_downloads=True)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
   page.locator('#example-navinha').click();page.locator('#generate').click()
   page.locator('#api-token').fill('PRIVATE_TOKEN_NEVER_EXPORT')
   page.locator('#instruction').fill('adicione uma fase "Portal Final"')
   page.locator('#improve').click()
   page.wait_for_function("document.querySelector('#feedback').textContent.includes('Melhoria salva')",timeout=35000)
   with page.expect_download() as d:page.locator('#project-backup').click()
   target=Path(tmp)/'game.gameforge.json';d.value.save_as(target)
   raw=target.read_text();snap=json.loads(raw)['project']
   assert 'PRIVATE_TOKEN_NEVER_EXPORT' not in raw
   assert len(snap['history'])==1
   assert 'Portal Final' in snap['files']['game.js']
   with page.expect_download() as d:page.locator('#export').click()
   zpath=Path(tmp)/'game.zip';d.value.save_as(zpath)
   with zipfile.ZipFile(zpath) as z:
    assert json.loads(z.read('PROJETO.gameforge.json'))['project']['files']['game.js']==snap['files']['game.js']
   page.reload();page.locator('#project-backup').wait_for()
   assert page.locator('#file-list').get_by_text('game.js',exact=True).count()==1
   # Abrir em contexto sem acesso ao armazenamento do primeiro navegador.
   second=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
   restored=second.new_page();restored.on('pageerror',lambda e:errors.append(str(e)));restored.goto(url)
   restored.locator('#project-file').set_input_files(target)
   restored.locator('#project-restore-dialog').wait_for(state='visible')
   assert 'ARMADA DO ECLIPSE' in restored.locator('#project-restore-summary').inner_text()
   assert restored.locator('#preview').get_attribute('srcdoc') is None
   restored.locator('#project-restore-cancel').click()
   assert restored.locator('#preview').get_attribute('srcdoc') is None
   restored.locator('#project-file').set_input_files(target)
   restored.locator('#project-restore-confirm').click()
   restored.locator('#file-list').get_by_text('game.js',exact=True).click()
   assert restored.locator('#file-editor').input_value()==snap['files']['game.js']
   assert restored.locator('#undo-improvement').is_enabled()
   assert restored.locator('#qa-report').inner_text()=='Nenhuma inspeção realizada.'
   restored.reload()
   restored.locator('#instruction').fill('adicione uma fase "Além do Portal"')
   restored.locator('#improve').click()
   restored.wait_for_function("document.querySelector('#feedback').textContent.includes('Melhoria salva')",timeout=35000)
   restored.locator('#file-list').get_by_text('game.js',exact=True).click()
   code=restored.locator('#file-editor').input_value()
   assert 'Portal Final' in code and 'Além do Portal' in code
   restored.locator('#undo-improvement').click()
   restored.locator('#file-list').get_by_text('game.js',exact=True).click()
   assert restored.locator('#file-editor').input_value()==snap['files']['game.js']
   invalid=Path(tmp)/'invalid.json';invalid.write_text('{"format":"gameforge-project","version":99}')
   restored.locator('#project-file').set_input_files(invalid)
   assert restored.locator('#project-restore-dialog').is_hidden()
   assert restored.locator('#file-editor').input_value()==snap['files']['game.js']
   assert restored.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'overflow mobile'
   # GDD extenso via backup sem código: preserva documento inteiro e última tarefa.
   snap['gdd']='# Grande\r\n'+''.join(f'## Fase {i}\r\n'+('Mecânica. '*120)+'\r\n' for i in range(300))
   snap['files']={};snap['history']=[];snap['roadmapRecords']=[]
   huge=Path(tmp)/'huge.json';huge.write_text(json.dumps({'format':'gameforge-project','version':1,'project':snap}))
   restored.locator('#project-file').set_input_files(huge);restored.locator('#project-restore-confirm').click()
   assert restored.locator('#gdd').input_value().replace('\r\n','\n')==snap['gdd'].replace('\r\n','\n')
   restored.locator('#roadmap-search').fill('Fase 299');restored.locator('.roadmap-task').click()
   assert '## Fase 299' in restored.locator('#roadmap-selected').inner_text()
   # Falha real na fronteira da API de armazenamento (quota/privacidade).
   restored.evaluate("Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}")
   restored.locator('#project-name').fill('Protegido');restored.locator('#project-name').blur()
   restored.wait_for_function("document.querySelector('#project-storage-status').textContent.includes('Não salvo')")
   assert restored.locator('#project-backup').is_enabled()
   assert not errors,errors
   print('OK Chromium: criar, melhorar, ZIP+backup, confirmar/cancelar restauração, outro navegador, recarregar, melhorar novamente, desfazer, JSON inválido, GDD >300 KB, mobile e quota')
  finally: browser.close();server.shutdown()
if __name__=='__main__':run()
