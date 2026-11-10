from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/bike-challenge/dist/index.html'
RUN = """
()=>{
 const g=window.__game; g.startRace({mode:'champ', trackId:'kampung-1'});
 const R=g.race, P=g.bike; let t=0; const qlog=[]; let step=0;
 while(t<200 && !(R.state==='finished')){
   if(g.quizOpen){ const q=g.currentQuiz; qlog.push([q.cat,q.id,q.index]); 
      if(step%3===2) g.skipQuiz(); else { const pick = step%3===0 ? q.correct : (q.correct+1)%3; g.answerQuiz(pick); g.closeQuiz(); } step++; continue; }
   if(R.state==='racing'){
     const k=g.input.keys; k.clear(); k.add('KeyW'); let tx=0;
     for(const o of g.aiObstacles){ if(o.s<P.s+2||o.s>P.s+16) continue; const half=o.t==='ramp'?2.3:(o.t==='puddle'?2.2:1.5);
        if(Math.abs(P.x-o.x)<half+0.6){ tx=o.x+(P.x>=o.x?1:-1)*(half+0.9); if(Math.abs(tx)>3.3) tx=o.x-Math.sign(tx)*(half+0.9); break; } }
     if(g.track.bridgeAt(P.s-8)||g.track.bridgeAt(P.s+8)) tx=0;
     const kap=Math.abs(g.track.sample(P.s+12).kappa); if(kap>0.02 && P.speed>11.5) k.delete('KeyW');
     const err=tx-P.x; if(err>0.35) k.add('KeyD'); else if(err<-0.35) k.add('KeyA');
   }
   g.stepRace(1/60); g.syncModels(1/60); t+=1/60;
 }
 g.showResult();
 return {qlog, edu:R.edu, pos:R.position, save:JSON.parse(localStorage.getItem('bikechallenge.save.v1')).stats, result:window.__lastRes||null};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    # 1) kuis membekukan simulasi
    pg.evaluate("window.__game.startRace({mode:'champ',trackId:'kampung-1'})")
    print(pg.evaluate("""()=>{const g=window.__game; g.race.countdown=0; g.input.keys.add('KeyW'); for(let i=0;i<80;i++) g.stepRace(1/60); g.bike.s=g.race.checkpoints[0]-1; let n=0; while(!g.quizOpen&&n<200){g.stepRace(1/60);n++;} return {open:g.quizOpen, s:g.bike.s, q:g.currentQuiz&&g.currentQuiz.cat}}"""))
    s0 = pg.evaluate("window.__game.bike.s"); pg.wait_for_timeout(800); s1 = pg.evaluate("window.__game.bike.s")
    print('frozen', s0==s1)
    pg.wait_for_timeout(300); pg.screenshot(path='q_open.png')
    pg.keyboard.press('Digit1'); pg.wait_for_timeout(300); pg.screenshot(path='q_answered.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    print('closed', pg.evaluate("window.__game.quizOpen"))
    print(pg.evaluate(RUN))
    pg.wait_for_timeout(800); pg.screenshot(path='q_result.png')
    pg.evaluate("window.__game.backToMenu()"); pg.evaluate("document.querySelector('.menu') ? 0 : 0")
    pg.click('text=Achievement'); pg.wait_for_timeout(500); pg.screenshot(path='q_ach.png')
    print(errs); b.close()
