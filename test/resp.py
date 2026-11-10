from playwright.sync_api import sync_playwright
URL='file:///home/claude/bike-challenge/dist/index.html'
SIZES=[('land_short',760,340),('land_phone',844,390),('land_big',915,412),('portrait',390,844)]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,w,h in SIZES:
        ctx=b.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True)
        pg=ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1300)
        info=pg.evaluate("()=>{const m=document.querySelector('.menu'); const btns=[...document.querySelectorAll('.menu .btn')].map(b=>Math.round(b.getBoundingClientRect().bottom)); return {sh:m.scrollHeight,ch:m.clientHeight,lastBtnBottom:Math.max(...btns)}}")
        print(name,w,h,info)
        pg.screenshot(path=f'/home/claude/test/r_{name}.png')
        for scr,sel in [('settings','text=Pengaturan'),('champ','text=CHAMPIONSHIP')]:
            pg.tap(sel); pg.wait_for_timeout(500)
            i2=pg.evaluate("()=>{const s=document.querySelector('.screen'); return s?{sh:s.scrollHeight,ch:s.clientHeight}:null}")
            print('  ',scr,i2); pg.screenshot(path=f'/home/claude/test/r_{name}_{scr}.png')
            pg.evaluate("window.__game.backToMenu()"); pg.wait_for_timeout(300)
        ctx.close()
    b.close()
