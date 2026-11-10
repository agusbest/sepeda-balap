import json, sys
from playwright.sync_api import sync_playwright
URL = 'file:///home/claude/bike-challenge/dist/index.html'
FUZZ = """
([trackId, strat, seed])=>{
 let rs=seed; const rnd=()=>{rs=(rs*1664525+1013904223)>>>0; return rs/4294967296;};
 const g=window.__game; g.startRace({mode:'champ', trackId});
 const R=g.race, P=g.bike; const issues=[]; const add=(m)=>{ if(issues.length<8) issues.push(m+' @s='+P.s.toFixed(0)); };
 let t=0, held=0, stuck=0, falls=0, quizzes=0, maxSp=0, maxY=0;
 const keys=g.input.keys; let steerKey=null, steerT=0;
 const ev0=P.update.bind(P); P.update=(dt,c,tr,col,ev)=>{ev0(dt,c,tr,col,ev); ev.forEach(e=>{if(e.type==='fall')falls++;});};
 while(t<330 && R.state!=='finished'){
   if(g.quizOpen){ quizzes++; if(rnd()<0.3) g.skipQuiz(); else { g.answerQuiz(Math.floor(rnd()*3)); g.closeQuiz(); } continue; }
   if(R.state==='racing'){
     keys.clear();
     if(strat==='hold'){ keys.add('KeyW'); }
     else if(strat==='random'){ if(rnd()<0.8) keys.add('KeyW'); steerT-=1/60; if(steerT<=0){ steerKey=['KeyA','KeyD',null][Math.floor(rnd()*3)]; steerT=0.2+rnd()*1.2; } if(steerKey) keys.add(steerKey); if(rnd()<0.03) g.input.jumpQueued=true; if(rnd()<0.01) keys.add('ShiftLeft'); if(rnd()<0.03) {keys.delete('KeyW'); keys.add('KeyS');} }
     else if(strat==='jump'){ keys.add('KeyW'); keys.add('ShiftLeft'); if(rnd()<0.2) g.input.jumpQueued=true; if(rnd()<0.5) keys.add(rnd()<0.5?'KeyA':'KeyD'); }
     else if(strat==='brake'){ if(rnd()<0.5) keys.add('KeyS'); else keys.add('KeyW'); if(rnd()<0.2) keys.add('KeyA'); }
   }
   g.stepRace(1/60); g.syncModels(1/60); t+=1/60;
   const vals=[P.s,P.x,P.y,P.speed,P.vx,P.vy]; if(vals.some(v=>!Number.isFinite(v))) { add('NaN '+JSON.stringify(vals)); break; }
   if(Math.abs(P.x)>7) add('x out '+P.x.toFixed(1)); if(P.y<-2||P.y>9) add('y out '+P.y.toFixed(1)); if(P.speed>32) add('speed '+P.speed.toFixed(1));
   maxSp=Math.max(maxSp,P.speed); maxY=Math.max(maxY,P.y);
   if(R.state==='racing' && keys.has('KeyW') && !keys.has('KeyS') && P.speed<0.3 && P.fallT<=0){ stuck+=1/60; if(stuck>8){ add('stuck'); stuck=0; } } else stuck=0;
   for(const r of g.ai.rivals){ if(![r.s,r.x,r.speed].every(Number.isFinite)) { add('rival NaN '+r.def.name); } }
 }
 // biarkan lawan menyelesaikan
 let extra=0; while(R.state==='finished' && !g.ai.rivals.every(r=>r.finished) && extra<120){ g.stepRace(1/60); extra+=1/60; }
 clearTimeout(g.resultTimer); if(R.state==='finished') g.showResult();
 return {trackId,strat,t:+t.toFixed(0),state:R.state,pos:R.position,falls,quizzes,maxSp:+maxSp.toFixed(1),maxY:+maxY.toFixed(1),rivalsDone:g.ai.rivals.every(r=>r.finished),issues};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':800,'height':450}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto(URL); pg.wait_for_timeout(1500)
    allissues=0
    for tid in ['kampung-1','kampung-2','dirt-1']:
        for strat in ['hold','random','jump','brake']:
            r = pg.evaluate(FUZZ, [tid, strat, 12345+len(strat)])
            allissues+=len(r['issues'])
            print(json.dumps(r))
    # kebocoran memori: ganti lintasan berulang kali
    mem=[]
    for i in range(9):
        pg.evaluate(f"window.__game.loadTrack(['kampung-1','kampung-2','dirt-1'][{i}%3])")
        mem.append(pg.evaluate("(()=>{const m=window.__game.renderer.info.memory; return [m.geometries,m.textures]})()"))
    print('mem', mem)
    print('errors', errs[:5], 'issues', allissues); b.close()
