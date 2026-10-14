# Persona check (dev tool, needs Python Playwright + Chromium): answers the whole assessment the way
# a realistic person would (not tailored to any career) and checks that sensible careers show up.
# usage: python3 tools/personas.py [index.html] [--verbose]
import os, sys, json
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
from playwright.sync_api import sync_playwright

# enjoy/ability: 1-5 per RIASEC letter. b5: 1-5 per trait (agree with positively keyed items).
# sl: slider values. tf/ab: answers. sj/pa: option index. sub: subject picks. expect: any of these words in the top 10.
P = [
 dict(name="Caregiver nurse type", field="healthcare", edu="1", years="2", enjoy=dict(R=3,I=3,A=2,S=5,E=2,C=3), ab=dict(R=3,I=3,A=2,S=4,E=2,C=3),
      b5=dict(E=4,A=5,C=4,N=3,O=3), sl=dict(s_travel=0,s_coding=0,s_comm=0,s_hours=48,s_onsite=95,s_people=85,s_school=3,s_minpay=50,s_target=90),
      tf=dict(tf16="t",tf3="t",tf17="t",tf15="f",tf2="t",tf9="t"), ab_=dict(ab1="a",ab3="b"), sub=["health","mind"],
      expect=["nurse","therap","medical","physician","health"]),
 dict(name="Introvert software developer", field="tech", edu="2", years="2", enjoy=dict(R=3,I=5,A=3,S=1,E=2,C=4), ab=dict(R=3,I=5,A=3,S=2,E=2,C=4),
      b5=dict(E=2,A=3,C=4,N=3,O=5), sl=dict(s_travel=0,s_coding=95,s_comm=0,s_hours=42,s_onsite=10,s_people=15,s_school=2,s_minpay=70,s_target=150),
      tf=dict(tf2="t",tf5="f",tf7="f",tf15="t",tf17="f",tf12="f"), ab_=dict(ab1="a",ab2="a",ab9="b"), sub=["tech"],
      expect=["software","developer","programmer","data","computer","cloud","web"]),
 dict(name="Hands-on electrician type", field="trades", edu="0", years="2", enjoy=dict(R=5,I=4,A=2,S=2,E=2,C=3), ab=dict(R=5,I=3,A=2,S=2,E=2,C=3),
      b5=dict(E=3,A=3,C=4,N=4,O=3), sl=dict(s_travel=10,s_coding=5,s_comm=0,s_hours=50,s_onsite=100,s_people=30,s_school=3,s_minpay=45,s_target=95),
      tf=dict(tf17="t",tf15="f",tf2="t",tf8="t",tf14="t"), ab_=dict(ab1="a",ab12="a"), sub=["electric","build","machines"],
      expect=["electric","line install","wiring","trades","hvac","heating"]),
 dict(name="Money-driven salesperson", field="sales", edu="2", years="2", enjoy=dict(R=1,I=2,A=2,S=3,E=5,C=2), ab=dict(R=1,I=2,A=3,S=3,E=5,C=2),
      b5=dict(E=5,A=3,C=3,N=4,O=3), sl=dict(s_travel=30,s_coding=0,s_comm=80,s_hours=55,s_onsite=50,s_people=90,s_school=1,s_minpay=60,s_target=200),
      tf=dict(tf2="f",tf5="t",tf9="t",tf15="f",tf16="f"), ab_=dict(ab1="b",ab11="b",ab3="a",ab7="b"), sub=["money"],
      expect=["sales","account","real estate","advisor","broker","agent"]),
 dict(name="Elementary teacher type", field="education", edu="2", years="2", enjoy=dict(R=2,I=3,A=4,S=5,E=2,C=3), ab=dict(R=2,I=3,A=3,S=5,E=2,C=3),
      b5=dict(E=4,A=5,C=4,N=3,O=4), sl=dict(s_travel=0,s_coding=0,s_comm=0,s_hours=45,s_onsite=90,s_people=90,s_school=3,s_minpay=40,s_target=65),
      tf=dict(tf16="t",tf12="t",tf5="t",tf2="t"), ab_=dict(ab3="b"), sub=["kids","teach"],
      expect=["teacher","school","instructional","tutor","childcare"]),
 dict(name="Graphic artist", field="creative", edu="2", years="2", enjoy=dict(R=2,I=2,A=5,S=2,E=3,C=1), ab=dict(R=2,I=2,A=5,S=2,E=2,C=2),
      b5=dict(E=3,A=3,C=3,N=3,O=5), sl=dict(s_travel=5,s_coding=20,s_comm=0,s_hours=42,s_onsite=30,s_people=35,s_school=1,s_minpay=45,s_target=85),
      tf=dict(tf15="f",tf2="t",tf13="t",tf17="f"), ab_=dict(ab1="a",ab3="b"), sub=["art","media"],
      expect=["design","artist","art director","animator","video","photo","graphic"]),
 dict(name="Detail-oriented accountant", field="finance", edu="2", years="2", enjoy=dict(R=1,I=4,A=1,S=2,E=3,C=5), ab=dict(R=1,I=4,A=1,S=2,E=2,C=5),
      b5=dict(E=2,A=3,C=5,N=3,O=2), sl=dict(s_travel=5,s_coding=20,s_comm=0,s_hours=45,s_onsite=30,s_people=30,s_school=3,s_minpay=55,s_target=110),
      tf=dict(tf15="t",tf2="t",tf1="f",tf13="f",tf17="f"), ab_=dict(ab2="a",ab7="a"), sub=["money"],
      expect=["accountant","auditor","bookkeep","financial","budget","tax","actuar"]),
 dict(name="Chef / food lover", field="service", edu="0", years="5", enjoy=dict(R=4,I=2,A=4,S=3,E=4,C=2), ab=dict(R=4,I=2,A=4,S=3,E=3,C=2),
      b5=dict(E=4,A=3,C=3,N=3,O=4), sl=dict(s_travel=0,s_coding=0,s_comm=10,s_hours=55,s_onsite=100,s_people=60,s_school=1,s_minpay=40,s_target=80),
      tf=dict(tf17="t",tf9="t",tf15="f",tf3="t"), ab_=dict(ab1="a"), sub=["food"],
      expect=["chef","cook","baker","food","restaurant","bartender"]),
 dict(name="Animal lover", field="general", edu="1", years="0.5", enjoy=dict(R=4,I=4,A=2,S=4,E=1,C=2), ab=dict(R=3,I=3,A=2,S=3,E=1,C=2),
      b5=dict(E=3,A=5,C=4,N=3,O=4), sl=dict(s_travel=0,s_coding=0,s_comm=0,s_hours=42,s_onsite=95,s_people=40,s_school=3,s_minpay=35,s_target=70),
      tf=dict(tf16="t",tf17="t",tf15="f",tf2="t"), ab_=dict(ab3="b"), sub=["animals","health"],
      expect=["veterinar","animal","zoolog"]),
 dict(name="Outdoors / nature", field="general", edu="1", years="2", enjoy=dict(R=5,I=4,A=2,S=2,E=1,C=2), ab=dict(R=4,I=3,A=2,S=2,E=1,C=2),
      b5=dict(E=2,A=3,C=3,N=4,O=4), sl=dict(s_travel=20,s_coding=0,s_comm=0,s_hours=45,s_onsite=100,s_people=20,s_school=2,s_minpay=40,s_target=70),
      tf=dict(tf17="t",tf15="f",tf2="t"), ab_=dict(ab1="a"), sub=["nature"],
      expect=["forest","conservation","farm","landscap","tree","agricultur","wildlife","range","fish","soil"]),
 dict(name="Future lawyer", field="legal", edu="2", years="2", enjoy=dict(R=1,I=4,A=3,S=3,E=5,C=4), ab=dict(R=1,I=4,A=3,S=3,E=4,C=4),
      b5=dict(E=4,A=3,C=5,N=3,O=4), sl=dict(s_travel=10,s_coding=0,s_comm=0,s_hours=55,s_onsite=50,s_people=60,s_school=4,s_minpay=60,s_target=180),
      tf=dict(tf5="t",tf9="t",tf8="f",tf2="t"), ab_=dict(ab2="a"), sub=["law"], field_answers=dict(lg1=0),
      expect=["attorney","lawyer","judge","paralegal","legal"]),
 dict(name="Truck driver type", field="general", edu="0", years="5", enjoy=dict(R=4,I=1,A=1,S=1,E=2,C=3), ab=dict(R=4,I=2,A=1,S=2,E=2,C=3),
      b5=dict(E=2,A=3,C=4,N=4,O=2), sl=dict(s_travel=70,s_coding=0,s_comm=0,s_hours=55,s_onsite=100,s_people=10,s_school=1,s_minpay=45,s_target=75),
      tf=dict(tf17="t",tf15="f",tf5="f",tf2="t",tf7="f"), ab_=dict(), sub=["transport"],
      expect=["truck","driver","delivery","bus","locomotive","transport"]),
 dict(name="Business owner / president", field="exec", edu="2", years="18", enjoy=dict(R=2,I=3,A=2,S=3,E=5,C=3), ab=dict(R=2,I=3,A=2,S=4,E=5,C=4),
      b5=dict(E=5,A=3,C=4,N=4,O=4), sl=dict(s_travel=30,s_coding=0,s_comm=40,s_hours=55,s_onsite=60,s_people=80,s_school=0,s_minpay=120,s_target=300),
      tf=dict(tf7="t",tf5="t",tf9="t",tf16="f"), ab_=dict(ab1="b",ab7="b"), sub=["money"],
      expect=["chief exec","general and operations","manager","entrepreneur","consult","sales manager"]),
 dict(name="First responder", field="publicsafety", edu="1", years="2", enjoy=dict(R=5,I=3,A=1,S=4,E=3,C=2), ab=dict(R=4,I=3,A=1,S=4,E=3,C=2),
      b5=dict(E=4,A=4,C=4,N=5,O=3), sl=dict(s_travel=0,s_coding=0,s_comm=0,s_hours=55,s_onsite=100,s_people=70,s_school=2,s_minpay=45,s_target=80),
      tf=dict(tf17="t",tf3="t",tf9="t",tf16="t",tf15="f"), ab_=dict(), sub=["safety","health"],
      expect=["firefight","police","emt","paramedic","public safety","sheriff","dispatcher","emergency"]),
 dict(name="Undecided new grad (all middle)", field="general", edu="2", years="0.5", enjoy=dict(R=3,I=3,A=3,S=3,E=3,C=3), ab=dict(R=3,I=3,A=3,S=3,E=3,C=3),
      b5=dict(E=3,A=3,C=3,N=3,O=3), sl={}, tf={}, ab_={}, sub=[], expect=[]),
]

def run(path, verbose):
    out=[]
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(); pg.goto("file://"+path)
        for per in P:
            r=pg.evaluate("""(per)=>{state.answers={};const A=state.answers;
              state.profile=Object.assign(blankProfile(),{stage:"early",years:per.years,edu:per.edu,field:per.field});
              for(const it of allItems()){
                if(it.t==="lik"&&it.ri){A[it.id]=per.enjoy[it.ri];A[it.id+"_ab"]=per.ab[it.ri]}
                else if(it.t==="lik"){const v=per.b5[it.b5];A[it.id]=it.k>0?v:6-v}
                else if(it.t==="sl"&&it.id in per.sl)A[it.id]=per.sl[it.id];
                else if(it.t==="tf"&&per.tf[it.id])A[it.id]=per.tf[it.id];
                else if(it.t==="ab"&&per.ab_[it.id])A[it.id]=per.ab_[it.id];
                else if(it.t==="pick"&&per.sub.length)A[it.id]=per.sub;
                else if(it.t==="rank")A[it.id]=VALUES.map(v=>v[0]);
                else if(per.field_answers&&it.id in per.field_answers)A[it.id]=per.field_answers[it.id];
              }
              const {scored,ready}=analyze();
              return {ready:ready.ready,top:scored.slice(0,10).map(s=>({n:s.car.n,fit:s.fit,why:s.why,flags:s.flags}))}}""",per)
            names=[t["n"].lower() for t in r["top"]]
            hit=[e for e in per["expect"] if any(e in n for n in names)]
            ok=(not per["expect"]) or bool(hit)
            out.append((per["name"],ok,r))
            print(("OK  " if ok else "MISS")+" "+per["name"]+": "+"; ".join(f'{t["n"][:34]} {t["fit"]}' for t in r["top"][:6]))
            if verbose:
                for t in r["top"][:3]: print("      why:",t["why"],"| flags:",t["flags"])
        b.close()
    return out

if __name__=="__main__":
    path=os.path.abspath(next((a for a in sys.argv[1:] if not a.startswith("--")),os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","index.html")))
    res=run(path,"--verbose" in sys.argv)
    print(f"\n{sum(ok for _,ok,_ in res)}/{len(res)} personas got a sensible top 10")
