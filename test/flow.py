from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/bike-challenge/dist/index.html'
# paksa balapan selesai cepat: teleport pemain ke dekat finish lalu simulasi
FINISH = """()=>{const g=window.__game; const R=g.race, P=g.bike;
  g.race.countdown=0; for(let i=0;i<70;i++) g.stepRace(1/60);
  P.s=g.track.finishS-40; P.x=0; P.speed=15; g.ai.rivals.forEach((r,i)=>{r.s=g.track.finishS-60-i*25; r.speed=14;});
  g.input.keys.add('KeyW'); let n=0; while(R.state!=='finished' && n<900){ if(g.quizOpen){g.skipQuiz(); g.input.keys.add("KeyW");} g.stepRace(1/60); n++;} g.showResult(); return {state:R.state,pos:R.position}}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500); pg.screenshot(path='m_menu.png')
    pg.click('text=FREE RIDE'); pg.wait_for_timeout(500)
    pg.click('text=Kampung Race 2') if False else None
    pg.screenshot(path='m_tracks.png')
    pg.click('text=MULAI FREE RIDE'); pg.wait_for_timeout(2500)
    pg.evaluate("()=>{const g=window.__game; g.race.countdown=0; for(let i=0;i<100;i++) g.stepRace(1/60); g.bike.s=300; }")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600); pg.screenshot(path='m_free_pause.png')
    pg.click('text=Selesai & Ambil Koin'); pg.wait_for_timeout(600); pg.screenshot(path='m_free_result.png')
    pg.click('text=Menu'); pg.wait_for_timeout(500)
    # championship
    pg.click('text=CHAMPIONSHIP'); pg.wait_for_timeout(1200); pg.screenshot(path='m_champ.png')
    pg.click('text=MULAI RONDE 1'); pg.wait_for_timeout(1500)
    print('r1', pg.evaluate(FINISH)); pg.wait_for_timeout(800); pg.screenshot(path='m_result1.png')
    pg.click('text=Lanjut'); pg.wait_for_timeout(1500)
    pg.click('text=LANJUT RONDE 2'); pg.wait_for_timeout(2000); pg.screenshot(path='m_sunset.png')
    print('r2', pg.evaluate(FINISH)); pg.click('text=Lanjut'); pg.wait_for_timeout(800)
    pg.click('text=LANJUT RONDE 3'); pg.wait_for_timeout(2000); pg.screenshot(path='m_dirt.png')
    print('r3', pg.evaluate(FINISH)); pg.wait_for_timeout(800); pg.screenshot(path='m_result3.png')
    pg.click('text=Ke Championship'); pg.wait_for_timeout(1200); pg.screenshot(path='m_champ_done.png')
    pg.click('text=Kembali'); pg.wait_for_timeout(300)
    pg.click('text=Achievement'); pg.wait_for_timeout(500); pg.screenshot(path='m_ach.png')
    pg.click('text=Kembali'); pg.click('text=Pengaturan'); pg.wait_for_timeout(500); pg.screenshot(path='m_settings.png')
    print(pg.evaluate("JSON.parse(localStorage.getItem('bikechallenge.save.v1')).stats"), pg.evaluate("JSON.parse(localStorage.getItem('bikechallenge.save.v1')).unlockedTracks"))
    print(errs); b.close()
