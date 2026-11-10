import json
from playwright.sync_api import sync_playwright
URL='file:///home/claude/bike-challenge/dist/index.html'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx=b.new_context(viewport={'width':844,'height':390},has_touch=True,is_mobile=True,device_scale_factor=1)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto(URL); pg.wait_for_timeout(1500)
    pg.screenshot(path='/home/claude/test/m_menu.png')
    pg.tap('text=FREE RIDE'); pg.wait_for_timeout(300)
    pg.screenshot(path='/home/claude/test/m_tracks.png')
    pg.tap('text=MULAI FREE RIDE'); pg.wait_for_timeout(400)
    # lewati hitung mundur manual
    pg.evaluate("()=>{const g=window.__game; for(let i=0;i<260;i++){g.stepRace(1/60);} g.syncModels(0);}")
    print('state', pg.evaluate("window.__game.race.state"), 'touchUI', pg.locator('.touch').count())
    pg.screenshot(path='/home/claude/test/m_race.png')
    def hold(sel, ms):
        box=pg.locator(sel).bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
        cdp=ctx.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
        pg.evaluate(f"()=>{{const g=window.__game; for(let i=0;i<{ms};i++){{g.stepRace(1/60); g.syncModels(1/60);}}}}")
        return cdp,x,y
    s0=pg.evaluate("window.__game.bike.s")
    cdp,x,y=hold('.gas-b',120)
    s1=pg.evaluate("window.__game.bike.s"); sp=pg.evaluate("window.__game.bike.speed")
    print('gas -> s',round(s0,1),'->',round(s1,1),'speed',round(sp,1), 'touch.gas', pg.evaluate("window.__game.input.touch.gas"))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    # belok kiri sambil gas (dua jari)
    cdp2=ctx.new_cdp_session(pg)
    lb=pg.locator('.touch-left button').first.bounding_box(); gb=pg.locator('.gas-b').bounding_box()
    cdp2.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':lb['x']+10,'y':lb['y']+10,'id':1},{'x':gb['x']+10,'y':gb['y']+10,'id':2}]})
    print('multi', pg.evaluate("JSON.stringify(window.__game.input.touch)"))
    x0=pg.evaluate("window.__game.bike.x")
    pg.evaluate("()=>{const g=window.__game; for(let i=0;i<60;i++){g.stepRace(1/60); g.syncModels(1/60);}}")
    print('x', round(x0,2),'->',round(pg.evaluate("window.__game.bike.x"),2))
    cdp2.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    # lompat + putar di udara
    jb=pg.locator('.jump-b').bounding_box()
    pg.touchscreen.tap(jb['x']+10,jb['y']+10)
    pg.evaluate("()=>{const g=window.__game; for(let i=0;i<10;i++){g.stepRace(1/60);}}")
    print('airborne y', round(pg.evaluate("window.__game.bike.y"),2), 'grounded', pg.evaluate("window.__game.bike.grounded"))
    pg.screenshot(path='/home/claude/test/m_air.png')
    pg.tap('.hud-pause, button:has-text("II"), button:has-text("⏸")') if pg.locator('.hud-pause, button:has-text("⏸")').count() else None
    # portrait hint
    ctx2=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    p2=ctx2.new_page(); p2.goto(URL); p2.wait_for_timeout(1200)
    print('rotate hint visible', p2.locator('.rotate-hint').is_visible())
    p2.screenshot(path='/home/claude/test/m_portrait.png')
    print('errors',errs[:5]); b.close()
