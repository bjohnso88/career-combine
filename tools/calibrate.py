# Calibration check (dev tool, needs Python Playwright + Chromium): python3 tools/calibrate.py [index.html] [sample every Nth generated career]
# Ideal-respondent calibration: for each career, answer every question the way a perfect fit would,
# then see where that career ranks. usage: python3 calib.py [path-to-index.html] [every-nth-generated]
import os,sys,json,statistics as st
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH","/opt/pw-browsers")
from playwright.sync_api import sync_playwright
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","index.html"))
nth=int(sys.argv[2]) if len(sys.argv)>2 else 15
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto("file://"+path)
    r=pg.evaluate("""(nth)=>{
      const dist=(eff,d)=>{let s=0,n=0;for(const k in eff){if(k==="pay"||k==="pat")continue;s+=Math.abs(eff[k]-(d[k]||0));n++}return n?s/n:9};
      const answer=c=>{state.answers={};const A=state.answers,d=c.d;
        const ex=(c.bls&&c.bls.exp)||"";state.profile=Object.assign(blankProfile(),{stage:"established",years:/5 years or more/i.test(ex)?"10":/less than 5/i.test(ex)?"5":"2",edu:String(c.edu),field:"general"});
        for(const it of allItems()){
          if(it.t==="open")continue;
          if(it.t==="lik"&&it.ri){if(c.ri){const x=c.ri["RIASEC".indexOf(it.ri)];A[it.id]=1+Math.round(x*4);A[it.id+"_ab"]=Math.max(2,Math.round(1+x*4))}else{const pos=c.r.indexOf(it.ri);A[it.id]=pos===0||pos===1?5:pos===2?4:1;A[it.id+"_ab"]=pos>=0?4:2}}
          else if(it.t==="lik"){A[it.id]=3}
          else if(it.t==="sl"){const m={s_travel:(d.tr||0)*70,s_coding:(d.c||0)*100,s_comm:(d.rp||0)*100,s_hours:38+(d.h||0)*27,s_onsite:(d.o||0)*100,s_people:(d.cu||0)*100,s_school:[0,2,4,4][c.edu]};if(it.id in m)A[it.id]=Math.max(it.min,Math.min(it.max,Math.round(m[it.id]/it.step)*it.step))}
          else if(it.t==="tf"){A[it.id]=dist(it.T,d)<=dist(it.F,d)?"t":"f"}
          else if(it.t==="ab"){A[it.id]=dist(it.A,d)<=dist(it.B,d)?"a":"b"}
          else if(it.t==="pick"&&it.pickFor){A[it.id]=it.pickFor(c)}
          else if(it.opts){let best=0,bd=9;it.opts.forEach((o,i)=>{const e=dist(o[1]||{},d);if(e<bd){bd=e;best=i}});A[it.id]=best}
          else if(it.t==="rank"){A[it.id]=VALUES.map(v=>v[0])}
        }};
      const sample=C.filter((c,i)=>!c.gen||i%nth===0);const out=[];const wins={};
      for(const c of sample){answer(c);const {scored}=analyze();const rank=scored.findIndex(s=>s.car===c)+1;wins[scored[0].car.n]=(wins[scored[0].car.n]||0)+1;
        out.push({n:c.n,gen:!!c.gen,rank,top:scored[0].car.n})}
      return {out,wins:Object.entries(wins).sort((a,b)=>b[1]-a[1]).slice(0,8)}}""",nth)
    b.close()
out=r["out"]
for g in (False,True):
    rs=[x["rank"] for x in out if x["gen"]==g]
    print(("generated" if g else "hand-tuned").ljust(10),len(rs),"| median rank",st.median(rs),"| #1:",sum(x==1 for x in rs),"| top10:",sum(x<=10 for x in rs),"| top50:",sum(x<=50 for x in rs))
print("most frequent #1:",r["wins"])
print("worst:",[(x["rank"],x["n"][:40]) for x in sorted(out,key=lambda x:-x["rank"])[:12]])
