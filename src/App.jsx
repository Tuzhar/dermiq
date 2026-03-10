import { useState, useRef } from "react";

const SKIN_TYPES = ["Oily","Dry","Combination","Sensitive","Normal"];
const SKIN_CONCERNS = ["Acne & Breakouts","Dryness & Dehydration","Oiliness","Dark Spots","Anti-Aging","Redness & Sensitivity","Dull Skin","Large Pores","Dark Circles","Uneven Skin Tone"];
const SKIN_GOALS = ["Glass Skin","Glowing Skin","Clear & Acne-Free","Even Skin Tone","Youthful & Firm","Hydrated & Plump","Minimal Pores","Natural & Healthy Look"];
const AVOID_LIST = ["Fragrance","Alcohol","Parabens","Sulfates","Silicones","Mineral Oil","Retinol","AHA/BHA","Essential Oils","Dyes"];
const BUDGET_PRESETS = ["Under ₹500","₹500–₹1500","₹1500–₹3000","₹3000+"];

const C = {
  bg:"#F8F7F4", surface:"#FFFFFF", border:"#E8E4DC",
  text:"#1A1814", muted:"#8A8278", gold:"#C9A84C",
  soft:"#F2EFE8", danger:"#B83232", success:"#2E7D52",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Figtree:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#D0CBC0;border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:0.4;}50%{opacity:1;}}
  .fu{animation:fadeUp 0.4s ease forwards;}
  .spin{animation:spin 0.85s linear infinite;}
  .pulse{animation:pulse 1.8s ease infinite;}
`;


const Pill = ({label, active, onClick, danger}) => (
  <button onClick={onClick} style={{
    background: active?(danger?C.danger:C.text):"transparent",
    color: active?"#fff":(danger?C.danger:C.muted),
    border:`1.5px solid ${active?(danger?C.danger:C.text):C.border}`,
    borderRadius:100, padding:"7px 16px", fontSize:13,
    fontFamily:"'Figtree',sans-serif", fontWeight:500, cursor:"pointer", transition:"all 0.15s"
  }}>{label}</button>
);

const Btn = ({children, onClick, secondary, disabled, small, style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:secondary?"transparent":C.text, color:secondary?C.muted:"#fff",
    border:secondary?`1.5px solid ${C.border}`:"none",
    borderRadius:8, padding:small?"9px 18px":(secondary?"11px 24px":"13px 28px"),
    fontSize:small?12:14, fontFamily:"'Figtree',sans-serif", fontWeight:600,
    cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, transition:"all 0.18s", ...style
  }}>{children}</button>
);

const Tag = ({children, color=C.gold}) => (
  <span style={{
    background:color+"18", color, border:`1px solid ${color}30`,
    borderRadius:100, fontSize:11, fontWeight:700, padding:"3px 10px",
    fontFamily:"'Figtree',sans-serif", letterSpacing:"0.06em", textTransform:"uppercase"
  }}>{children}</span>
);

const Stars = ({rating=4}) => (
  <span>{Array.from({length:5},(_,i)=>(
    <span key={i} style={{color:i<Math.round(rating)?C.gold:C.border, fontSize:12}}>★</span>
  ))}</span>
);

const Spinner = ({text, sub}) => (
  <div style={{textAlign:"center", padding:"60px 0"}}>
    <div className="spin" style={{width:36,height:36,border:`2.5px solid ${C.border}`,borderTop:`2.5px solid ${C.text}`,borderRadius:"50%",margin:"0 auto 20px"}}/>
    <p className="pulse" style={{color:C.muted, fontSize:14, fontFamily:"'Figtree',sans-serif"}}>{text}</p>
    {sub && <p style={{fontSize:12, color:C.muted, marginTop:8}}>{sub}</p>}
  </div>
);

// API stuff 
const GROQ_KEY = import.meta.env.VITE_API_KEY;
const callClaude = async (prompt) => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{"Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}`},
    body: JSON.stringify({model:"llama-3.3-70b-versatile", messages:[{role:"user", content:prompt}], max_tokens:4000})
  });
  const d = await res.json();
  if(d.error) throw new Error(d.error.message);
  const text = d.choices[0].message.content;
  const start=text.indexOf("{"), end=text.lastIndexOf("}");
  if(start===-1||end===-1) throw new Error("No JSON in response");
  return JSON.parse(text.slice(start,end+1));
};

const ROUTINE_SHAPE = `{
  "routine":[{"step":"","purpose":"","ingredientToLookFor":"","ingredientToAvoid":"","topPick":{"name":"","brand":"","price":"₹XXX","keyIngredients":[""],"whyItWorks":"","rating":4.5,"reviews":""},"budgetPick":{"name":"","brand":"","price":"₹XXX","keyIngredients":[""],"whyItWorks":"","rating":4.2,"reviews":""}}],
  "totalBestPrice":"₹XXXX","totalBudgetPrice":"₹XXXX",
  "heroIngredient":"","heroWhy":"","watchOut":"",
  "proTips":["","",""]
}`;


function ProductCard({product, badge, badgeColor=C.gold}) {
  const [simpMode, setSimpMode] = useState(false);
  const [simpText, setSimpText] = useState("");
  const [loadingSimp, setLoadingSimp] = useState(false);

  const simplify = async () => {
    if (simpText) { setSimpMode(s=>!s); return; }
    setLoadingSimp(true);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}`},
        body: JSON.stringify({model:"llama-3.3-70b-versatile", messages:[{role:"user", content:`Explain "${product.name}" by ${product.brand} in 1-2 sentences like you're talking to someone who knows nothing about skincare. No jargon, super simple.`}], max_tokens:120})
      });
      const d = await res.json();
      setSimpText(d.choices[0].message.content || "Couldn't simplify right now.");
      setSimpMode(true);
    } catch { setSimpText("Couldn't simplify right now."); setSimpMode(true); }
    setLoadingSimp(false);
  };

  if (!product) return null;

  return (
    <div style={{background:C.surface, border:`1.5px solid ${badgeColor===C.text?C.text:C.border}`, borderRadius:12, padding:22, flex:1, minWidth:220, position:"relative"}}>
      {badge && <div style={{position:"absolute",top:-11,left:16}}><Tag color={badgeColor}>{badge}</Tag></div>}
      <div style={{marginTop:badge?8:0}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{product.brand}</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:C.text,lineHeight:1.25,marginBottom:6}}>{product.name}</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>{product.price}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
          <Stars rating={product.rating}/><span style={{fontSize:12,color:C.muted}}>{product.rating} · {product.reviews} reviews</span>
        </div>
        <div style={{background:C.soft,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
          <p style={{fontSize:13,color:C.text,lineHeight:1.65,marginBottom:8}}>{simpMode?simpText:product.whyItWorks}</p>
          <button onClick={simplify} style={{
            background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
            padding:"4px 12px",fontSize:11,fontWeight:600,color:C.muted,
            cursor:"pointer",fontFamily:"'Figtree',sans-serif"
          }}>{loadingSimp?"...":simpMode?"↩ Original":"✦ Simplify"}</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {product.keyIngredients?.map(ing=>(
            <span key={ing} style={{background:C.soft,color:C.muted,fontSize:11,padding:"3px 10px",borderRadius:100,border:`1px solid ${C.border}`}}>{ing}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// natural sols
function NaturalTab({concerns, goals}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    setLoading(true); setFetched(true);
    try {
      const res = await callClaude(`Person has skin concerns: ${concerns.join(", ")} and goals: ${goals.join(", ")}.
Give 5 natural home remedies. Return ONLY valid JSON:
{"remedies":[{"name":"","targets":"","ingredients":[""],"howTo":"","frequency":"","tip":""}]}`);
      setData(res);
    } catch { setData({error:true}); }
    setLoading(false);
  };

  if (!fetched) return (
    <div style={{textAlign:"center",padding:"40px 0"}}>
      <p style={{color:C.muted,fontSize:14,marginBottom:20,lineHeight:1.7}}>Get natural home remedies tailored to your exact skin concerns.</p>
      <Btn onClick={load}>🌿 Show Natural Remedies</Btn>
    </div>
  );
  if (loading) return <Spinner text="Finding remedies for you..."/>;
  if (data?.error) return <div style={{textAlign:"center",padding:"32px",color:C.muted}}>Something went wrong. <span onClick={load} style={{color:C.text,cursor:"pointer",fontWeight:700}}>Retry</span></div>;

  return (
    <div className="fu" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
      {data?.remedies?.map((r,i)=>(
        <div key={i} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:C.text,maxWidth:"60%",lineHeight:1.2}}>{r.name}</div>
            <Tag color={C.success}>{r.targets}</Tag>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
            {r.ingredients?.map(ing=><span key={ing} style={{background:"#2E7D5215",color:C.success,fontSize:11,padding:"3px 9px",borderRadius:100,fontWeight:500}}>{ing}</span>)}
          </div>
          <p style={{fontSize:13,color:C.text,lineHeight:1.65,marginBottom:12}}>{r.howTo}</p>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.muted}}>📅 {r.frequency}</span>
            <span style={{fontSize:12,color:C.gold,fontWeight:500,maxWidth:"55%",textAlign:"right"}}>💡 {r.tip}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// find products
function FindProducts() {
  const [productName, setProductName] = useState("");
  const [budget, setBudget] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const budgetStr = budget==="Custom"?`₹${customBudget}`:budget;

  const search = async () => {
    if (!productName||!budgetStr) return;
    setLoading(true); setResults(null);
    try {
      const data = await callClaude(`User wants to buy: "${productName}" with budget ${budgetStr} in India.
Return ONLY valid JSON:
{"summary":"","ingredientToLookFor":"","ingredientToAvoid":"","buyingTip":"","options":[{"badge":"Best Overall","name":"","brand":"","price":"₹XXX","rating":4.5,"reviews":"","keyIngredients":[""],"whyItWorks":"","pros":[""],"cons":[""]},{"badge":"Best Budget","name":"","brand":"","price":"₹XXX","rating":4.2,"reviews":"","keyIngredients":[""],"whyItWorks":"","pros":[""],"cons":[""]},{"badge":"Best Quality","name":"","brand":"","price":"₹XXX","rating":4.7,"reviews":"","keyIngredients":[""],"whyItWorks":"","pros":[""],"cons":[""]}]}`);
      setResults(data);
    } catch { setResults({error:true}); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:28,marginBottom:24}}>
        <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,display:"block",marginBottom:10}}>What product are you looking for?</label>
        <input value={productName} onChange={e=>setProductName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
          placeholder="e.g. Vitamin C serum, SPF 50 sunscreen, moisturizer..."
          style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"13px 16px",fontSize:15,fontFamily:"'Figtree',sans-serif",color:C.text,background:C.bg,outline:"none",marginBottom:22}}/>
        <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,display:"block",marginBottom:10}}>Your Budget</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {[...BUDGET_PRESETS,"Custom"].map(b=><Pill key={b} label={b} active={budget===b} onClick={()=>setBudget(b)}/>)}
        </div>
        {budget==="Custom" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>₹</span>
            <input type="number" value={customBudget} onChange={e=>setCustomBudget(e.target.value)} placeholder="Exact amount"
              style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"11px 14px",fontSize:15,fontFamily:"'Figtree',sans-serif",color:C.text,background:C.bg,outline:"none",width:200}}/>
          </div>
        )}
        <div style={{marginTop:22}}><Btn onClick={search} disabled={!productName||!budget||(budget==="Custom"&&!customBudget)}>Search Products →</Btn></div>
      </div>

      {loading && <Spinner text="Finding the best options for you..."/>}
      {results?.error && <div style={{textAlign:"center",padding:"40px",background:C.surface,borderRadius:12,border:`1.5px solid ${C.border}`}}><p style={{color:C.muted,marginBottom:16}}>Something went wrong.</p><Btn onClick={search}>Retry</Btn></div>}
      {results && !results.error && (
        <div className="fu">
          <p style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:14}}>{results.summary}</p>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:22}}>
            <span style={{fontSize:13,color:C.success,fontWeight:500}}>✓ Look for: <strong style={{color:C.text}}>{results.ingredientToLookFor}</strong></span>
            <span style={{fontSize:13,color:C.danger,fontWeight:500}}>✗ Skip: <strong>{results.ingredientToAvoid}</strong></span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
            {results.options?.map((opt,i)=>(
              <div key={i} style={{background:C.surface,border:`1.5px solid ${i===0?C.text:C.border}`,borderRadius:12,padding:22,position:"relative"}}>
                <div style={{position:"absolute",top:-11,left:16}}><Tag color={i===0?C.text:C.gold}>{opt.badge}</Tag></div>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginTop:8}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{opt.brand}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:C.text,marginBottom:5}}>{opt.name}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:C.text,marginBottom:7}}>{opt.price}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}><Stars rating={opt.rating}/><span style={{fontSize:12,color:C.muted}}>{opt.rating} · {opt.reviews} reviews</span></div>
                    <p style={{fontSize:13,color:C.text,lineHeight:1.65,marginBottom:12}}>{opt.whyItWorks}</p>
                    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                      <div>{opt.pros?.map(p=><div key={p} style={{fontSize:12,color:C.success,marginBottom:3}}>✓ {p}</div>)}</div>
                      <div>{opt.cons?.map(c=><div key={c} style={{fontSize:12,color:C.danger,marginBottom:3}}>✗ {c}</div>)}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,alignContent:"flex-start",maxWidth:180}}>
                    {opt.keyIngredients?.map(ing=><span key={ing} style={{background:C.soft,color:C.muted,fontSize:11,padding:"3px 10px",borderRadius:100,border:`1px solid ${C.border}`}}>{ing}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {results.buyingTip && (
            <div style={{background:`${C.gold}12`,border:`1px solid ${C.gold}35`,borderRadius:10,padding:"14px 18px",display:"flex",gap:10}}>
              <span>💡</span><p style={{fontSize:13,color:C.text,lineHeight:1.65}}><strong>Buying Tip:</strong> {results.buyingTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function RoutineSection({skinType, concerns, goals, budgetStr, totalBudgetStr, avoid}) {
  const [routineMode, setRoutineMode] = useState("full");
  const [fullResults, setFullResults] = useState(null);
  const [fullLoading, setFullLoading] = useState(true); // starts true since we fetch immediately
  const [essentialResults, setEssentialResults] = useState(null);
  const [essentialLoading, setEssentialLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState("routine");
  const hasFetchedEssential = useRef(false);

  const profile = `Skin Type: ${skinType}, Concerns: ${concerns.join(", ")}, Goals: ${goals.join(", ")}, Budget per product: ${budgetStr}, Total routine budget cap: ${totalBudgetStr}, Avoid: ${avoid.length>0?avoid.join(", "):"Nothing"}. Products must be available in India. Keep individual products within the per-product budget AND keep the total routine cost within the total budget cap.`;

  // Fetch full routine
  useState(() => {
    (async () => {
      try {
        const data = await callClaude(`You are a top dermatologist. Build a COMPLETE 4-5 step skincare routine.
Profile: ${profile}
Cover all necessary steps (cleanser, toner/essence, serum, moisturizer, SPF). Each step must directly address the user's concerns and goals.
Return ONLY valid JSON: ${ROUTINE_SHAPE}`);
        setFullResults(data);
      } catch(e) { setFullResults({error:true, message:e.message}); }
      setFullLoading(false);
    })();
  }, []);

  const fetchEssentials = async () => {
    hasFetchedEssential.current = true;
    setEssentialLoading(true);
    setEssentialResults(null);
    try {
      const data = await callClaude(`You are a dermatologist helping someone who wants to spend LESS and use FEWER products but still get real results.
Profile: ${profile}

YOUR JOB: Choose ONLY 2-3 products max that give the highest ROI for this person's concerns (${concerns.join(", ")}) and goals (${goals.join(", ")}).

Rules:
- Max 3 products, ideally 2
- Prefer multitasking products that tackle multiple concerns at once
- Cut anything "nice to have" — only keep what makes a real visible difference
- A single good moisturizer with SPF beats separate moisturizer + sunscreen if budget is tight
- Think: if this person could only buy 2 things, what would move the needle most?

Return ONLY valid JSON (same format, but only 2-3 items in routine array): ${ROUTINE_SHAPE}`);
      setEssentialResults(data);
    } catch(e) { setEssentialResults({error:true, message:e.message}); }
    setEssentialLoading(false);
  };

  const switchMode = (mode) => {
    setRoutineMode(mode);
    setActiveStep(0);
    if (mode === "essential" && !hasFetchedEssential.current) {
      fetchEssentials();
    }
  };

  const activeResults = routineMode === "full" ? fullResults : essentialResults;
  const isLoading = routineMode === "full" ? fullLoading : essentialLoading;

  return (
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1.5px solid ${C.border}`,marginBottom:26}}>
        {[["routine","My Routine"],["natural","🌿 Natural Solutions"]].map(([k,label])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{
            background:"transparent", border:"none", padding:"11px 22px",
            fontSize:14, fontFamily:"'Figtree',sans-serif", fontWeight:600,
            color:activeTab===k?C.text:C.muted, cursor:"pointer",
            borderBottom:activeTab===k?`2px solid ${C.text}`:"2px solid transparent",
            marginBottom:-1.5, transition:"all 0.15s"
          }}>{label}</button>
        ))}
      </div>

      {activeTab === "routine" && (
        <div>
          {/* Mode toggle */}
          <div style={{display:"flex",gap:8,marginBottom:24,padding:"14px 16px",background:C.soft,borderRadius:10,border:`1px solid ${C.border}`,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:C.muted,marginRight:8,letterSpacing:"0.04em"}}>ROUTINE TYPE:</span>
            {[["full","Full Routine","4-5 products, best results"],["essential","Essentials Only","2-3 products, max ROI"]].map(([m,label,sub])=>(
              <button key={m} onClick={()=>switchMode(m)} style={{
                background:routineMode===m?C.text:"transparent",
                color:routineMode===m?"#fff":C.muted,
                border:`1.5px solid ${routineMode===m?C.text:C.border}`,
                borderRadius:8, padding:"9px 16px", cursor:"pointer",
                fontFamily:"'Figtree',sans-serif", transition:"all 0.18s",
                textAlign:"left"
              }}>
                <div style={{fontSize:12,fontWeight:700}}>{label}</div>
                <div style={{fontSize:11,opacity:0.7,marginTop:1}}>{sub}</div>
              </button>
            ))}
          </div>

          {/* Total Cost Bar — updates per mode */}
          {activeResults?.totalBestPrice && !isLoading && (
            <div className="fu" key={`cost-${routineMode}`} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
              <div style={{background:C.text,borderRadius:12,padding:"18px 20px"}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:6}}>
                  {routineMode==="essential"?"Essentials · Best Picks":"Full Routine · Best Picks"}
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:"#fff"}}>{activeResults.totalBestPrice}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{routineMode==="essential"?"2–3 top products":"4–5 top products"}</div>
              </div>
              <div style={{background:C.surface,border:`1.5px solid ${C.gold}40`,borderRadius:12,padding:"18px 20px"}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:C.gold,marginBottom:6}}>
                  {routineMode==="essential"?"Essentials · Budget Picks":"Full Routine · Budget Picks"}
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:C.text}}>{activeResults.totalBudgetPrice}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>{routineMode==="essential"?"Lowest cost option":"Most affordable full routine"}</div>
              </div>
              {routineMode==="essential" && fullResults?.totalBestPrice && (
                <div style={{background:C.soft,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px"}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>vs Full Routine</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:C.muted}}>{fullResults.totalBestPrice}</div>
                  <div style={{fontSize:11,color:C.success,marginTop:4,fontWeight:600}}>You save by going essential ↑</div>
                </div>
              )}
            </div>
          )}
          {isLoading ? (
            <Spinner
              text={routineMode==="essential"?"Finding your 2-3 highest-impact products...":"Building your full routine..."}
              sub={routineMode==="essential"?"Cutting the noise, keeping only what moves the needle":"Matching ingredients to your skin profile"}
            />
          ) : activeResults?.error ? (
            <div style={{textAlign:"center",padding:"40px",background:C.surface,borderRadius:12,border:`1.5px solid ${C.border}`}}>
              <p style={{color:C.muted,marginBottom:8}}>Something went wrong.</p>
              {activeResults.message && <p style={{fontSize:11,color:C.muted,fontFamily:"monospace",marginBottom:16}}>{activeResults.message}</p>}
              <Btn onClick={routineMode==="essential"?fetchEssentials:()=>{}}>Retry</Btn>
            </div>
          ) : activeResults?.routine ? (
            <div className="fu" key={routineMode}>
              {/* Step tabs */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22}}>
                {activeResults.routine.map((item,i)=>(
                  <button key={i} onClick={()=>setActiveStep(i)} style={{
                    background:activeStep===i?C.text:"transparent", color:activeStep===i?"#fff":C.muted,
                    border:`1.5px solid ${activeStep===i?C.text:C.border}`, borderRadius:8,
                    padding:"8px 16px", fontSize:12, fontFamily:"'Figtree',sans-serif",
                    fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s"
                  }}>{String(i+1).padStart(2,"0")} {item.step}</button>
                ))}
              </div>

              {/* Active step */}
              {activeResults.routine[activeStep] && (
                <div className="fu" key={`${routineMode}-${activeStep}`}>
                  <div style={{marginBottom:18}}>
                    <p style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:10}}>{activeResults.routine[activeStep].purpose}</p>
                    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:500,color:C.success}}>✓ Look for: <strong style={{color:C.text}}>{activeResults.routine[activeStep].ingredientToLookFor}</strong></span>
                      <span style={{fontSize:13,fontWeight:500,color:C.danger}}>✗ Avoid: <strong>{activeResults.routine[activeStep].ingredientToAvoid}</strong></span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    <ProductCard product={activeResults.routine[activeStep].topPick} badge="Best Pick" badgeColor={C.text}/>
                    {activeResults.routine[activeStep].budgetPick && <ProductCard product={activeResults.routine[activeStep].budgetPick} badge="Budget Pick" badgeColor={C.gold}/>}
                  </div>
                </div>
              )}

              {/* Pro tips */}
              {activeResults.proTips && (
                <div style={{marginTop:36,paddingTop:28,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:14}}>Pro Tips For You</div>
                  {activeResults.proTips.map((tip,i)=>(
                    <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:C.border,minWidth:20}}>{i+1}</span>
                      <p style={{fontSize:14,color:C.muted,lineHeight:1.65}}>{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {activeTab === "natural" && <NaturalTab concerns={concerns} goals={goals}/>}
    </div>
  );
}

// main app
export default function DermIQ() {
  const [view, setView] = useState("home");
  const [quizStep, setQuizStep] = useState(0);
  const [skinType, setSkinType] = useState("");
  const [concerns, setConcerns] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budget, setBudget] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [customTotalBudget, setCustomTotalBudget] = useState("");
  const [avoid, setAvoid] = useState([]);
  const [submitted, setSubmitted] = useState(false); // triggers results 
  const topRef = useRef(null);

  const toggle = (arr, setArr, val) => setArr(p=>p.includes(val)?p.filter(x=>x!==val):[...p,val]);
  const budgetStr = budget==="Custom"?`₹${customBudget}`:budget;
  const totalBudgetStr = totalBudget==="Custom"?`₹${customTotalBudget}`:totalBudget;

  const submit = () => {
    setSubmitted(false); // reset first so routineSection remounts fresh
    setTimeout(() => {
      setSubmitted(true);
      setView("results");
      setTimeout(()=>topRef.current?.scrollIntoView({behavior:"smooth"}),80);
    }, 0);
  };

  const reset = () => {
    setView("home"); setQuizStep(0); setSkinType(""); setConcerns([]); setGoals([]);
    setBudget(""); setCustomBudget(""); setTotalBudget(""); setCustomTotalBudget(""); setAvoid([]); setSubmitted(false);
  };

  const quizSteps = [
    {
      title:"What's your skin type?", sub:"The foundation of every good routine.",
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {SKIN_TYPES.map(t=>(
            <button key={t} onClick={()=>{setSkinType(t);setQuizStep(1);}} style={{
              background:skinType===t?C.text:"transparent", color:skinType===t?"#fff":C.text,
              border:`1.5px solid ${skinType===t?C.text:C.border}`, borderRadius:10,
              padding:"14px 20px", fontSize:15, fontFamily:"'Figtree',sans-serif",
              fontWeight:500, cursor:"pointer", textAlign:"left", transition:"all 0.15s"
            }}>{t}</button>
          ))}
        </div>
      )
    },
    {
      title:"What are your skin concerns?", sub:"Pick everything that bothers you.",
      content:(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
            {SKIN_CONCERNS.map(c=><Pill key={c} label={c} active={concerns.includes(c)} onClick={()=>toggle(concerns,setConcerns,c)}/>)}
          </div>
          <Btn onClick={()=>setQuizStep(2)} disabled={concerns.length===0}>Next →</Btn>
        </div>
      )
    },
    {
      title:"What's your skin goal?", sub:"What do you want your skin to look like?",
      content:(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
            {SKIN_GOALS.map(g=><Pill key={g} label={g} active={goals.includes(g)} onClick={()=>toggle(goals,setGoals,g)}/>)}
          </div>
          <Btn onClick={()=>setQuizStep(3)} disabled={goals.length===0}>Next →</Btn>
        </div>
      )
    },
    {
      title:"What's your budget?", sub:"Tell us both — we'll balance quality and total spend.",
      content:(
        <div>
          {/* Per product */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Per product</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Max you'd spend on a single product</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...BUDGET_PRESETS,"Custom"].map(b=>(
                <button key={b} onClick={()=>setBudget(b)} style={{
                  background:budget===b?C.text:"transparent", color:budget===b?"#fff":C.text,
                  border:`1.5px solid ${budget===b?C.text:C.border}`, borderRadius:10,
                  padding:"12px 18px", fontSize:14, fontFamily:"'Figtree',sans-serif",
                  fontWeight:500, cursor:"pointer", textAlign:"left", transition:"all 0.15s"
                }}>{b}</button>
              ))}
            </div>
            {budget==="Custom" && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>₹</span>
                <input type="number" value={customBudget} onChange={e=>setCustomBudget(e.target.value)} placeholder="Exact amount per product"
                  style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"12px 14px",fontSize:15,fontFamily:"'Figtree',sans-serif",color:C.text,background:C.bg,outline:"none",width:210}}/>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{borderTop:`1px solid ${C.border}`,marginBottom:24}}/>

          {/* Total routine budget */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Total routine budget</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Max you want to spend across all products combined</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Under ₹1500","₹1500–₹3000","₹3000–₹6000","₹6000+","Custom"].map(b=>(
                <button key={b} onClick={()=>setTotalBudget(b)} style={{
                  background:totalBudget===b?C.text:"transparent", color:totalBudget===b?"#fff":C.text,
                  border:`1.5px solid ${totalBudget===b?C.text:C.border}`, borderRadius:10,
                  padding:"12px 18px", fontSize:14, fontFamily:"'Figtree',sans-serif",
                  fontWeight:500, cursor:"pointer", textAlign:"left", transition:"all 0.15s"
                }}>{b}</button>
              ))}
            </div>
            {totalBudget==="Custom" && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>₹</span>
                <input type="number" value={customTotalBudget} onChange={e=>setCustomTotalBudget(e.target.value)} placeholder="Total amount for full routine"
                  style={{border:`1.5px solid ${C.border}`,borderRadius:8,padding:"12px 14px",fontSize:15,fontFamily:"'Figtree',sans-serif",color:C.text,background:C.bg,outline:"none",width:210}}/>
              </div>
            )}
          </div>

          <Btn
            onClick={()=>setQuizStep(4)}
            disabled={!budget||(budget==="Custom"&&!customBudget)||!totalBudget||(totalBudget==="Custom"&&!customTotalBudget)}
          >Next →</Btn>
        </div>
      )
    },
    {
      title:"Anything to avoid?", sub:"Allergies, sensitivities, or just personal preference.",
      content:(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
            {AVOID_LIST.map(a=><Pill key={a} label={a} active={avoid.includes(a)} onClick={()=>toggle(avoid,setAvoid,a)} danger/>)}
          </div>
          <p style={{fontSize:13,color:C.muted,marginBottom:20}}>Don't want to avoid anything? Just skip below.</p>
          <Btn onClick={submit}>✦ Build My Routine</Btn>
        </div>
      )
    }
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Figtree',sans-serif"}}>
      <style>{css}</style>

      {/* NAV */}
      <nav style={{borderBottom:`1px solid ${C.border}`,padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,position:"sticky",top:0,zIndex:100}}>
        <div onClick={reset} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:`radial-gradient(circle at 38% 38%,${C.gold},#7a5500)`}}/>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,letterSpacing:"-0.03em"}}>DermIQ</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {view!=="home"&&<Btn secondary small onClick={reset}>← Home</Btn>}
          {view==="home"&&<Btn secondary small onClick={()=>setView("find")}>Find a Product</Btn>}
          {view==="home"&&<Btn small onClick={()=>setView("quiz")}>Make My Report</Btn>}
        </div>
      </nav>

      {/* HOME */}
      {view==="home" && (
        <div style={{maxWidth:720,margin:"0 auto",padding:"80px 24px 60px",textAlign:"center"}} className="fu">
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:100,padding:"6px 18px",marginBottom:32}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.success,display:"inline-block"}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>No Ads · No Paid Promos · Science-Backed</span>
          </div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(42px,6.5vw,72px)",fontWeight:800,lineHeight:1.06,letterSpacing:"-0.03em",marginBottom:22}}>
            Skincare that's<br/><span style={{color:C.gold}}>actually for you.</span>
          </h1>
          <p style={{fontSize:17,color:C.muted,lineHeight:1.8,maxWidth:480,margin:"0 auto 48px",fontWeight:400}}>
            Stop getting lost in 1000 products and paid YouTube reviews. Tell us about your skin — we build a routine around ingredients, not brand deals.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:72}}>
            <button onClick={()=>setView("quiz")} style={{background:C.text,color:"#fff",border:"none",borderRadius:10,padding:"16px 36px",fontSize:15,fontFamily:"'Figtree',sans-serif",fontWeight:700,cursor:"pointer",boxShadow:"0 8px 28px rgba(26,24,20,0.16)"}}>✦ Make My Report</button>
            <button onClick={()=>setView("find")} style={{background:C.surface,color:C.text,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"16px 36px",fontSize:15,fontFamily:"'Figtree',sans-serif",fontWeight:600,cursor:"pointer"}}>🔍 Find a Product</button>
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:52,flexWrap:"wrap"}}>
            {[["Ingredient-First","Matched by what's in the bottle"],["Zero Bias","No brand partnerships, ever"],["Budget Smart","Best pick + cheapest option, always"]].map(([t,s])=>(
              <div key={t} style={{textAlign:"center",maxWidth:150}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.gold,margin:"0 auto 12px"}}/>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:5}}>{t}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.65}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUIZ */}
      {view==="quiz" && (
        <div style={{maxWidth:560,margin:"0 auto",padding:"56px 24px"}}>
          <div style={{display:"flex",gap:5,marginBottom:48}}>
            {quizSteps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=quizStep?C.text:C.border,transition:"background 0.3s"}}/>)}
          </div>
          <div className="fu" key={quizStep}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Step {quizStep+1} of {quizSteps.length}</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,letterSpacing:"-0.02em",lineHeight:1.2,marginBottom:8}}>{quizSteps[quizStep].title}</h2>
            <p style={{fontSize:14,color:C.muted,marginBottom:26,lineHeight:1.65}}>{quizSteps[quizStep].sub}</p>
            {quizSteps[quizStep].content}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {view==="results" && submitted && (
        <div ref={topRef} style={{maxWidth:980,margin:"0 auto",padding:"44px 24px"}}>
          <div className="fu">
            {/* Header */}
            <div style={{marginBottom:32}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Your Skin Report</div>
              <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:800,letterSpacing:"-0.025em",marginBottom:14,lineHeight:1.1}}>{skinType} Skin</h2>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{[...concerns,...goals].map(t=><Tag key={t} color={C.muted}>{t}</Tag>)}</div>
            </div>

            {/* Routine Section — self-contained component that manages its own fetching */}
            <RoutineSection skinType={skinType} concerns={concerns} goals={goals} budgetStr={budgetStr} totalBudgetStr={totalBudgetStr} avoid={avoid}/>

            <div style={{marginTop:36,paddingTop:24,borderTop:`1px solid ${C.border}`,display:"flex",gap:10,flexWrap:"wrap"}}>
              <Btn secondary small onClick={reset}>Start Over</Btn>
              <Btn secondary small onClick={()=>{setView("quiz");setQuizStep(0);setSubmitted(false);}}>Change My Profile</Btn>
            </div>
          </div>
        </div>
      )}

      {/* FIND PRODUCTS */}
      {view==="find" && (
        <div style={{maxWidth:740,margin:"0 auto",padding:"56px 24px"}} className="fu">
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:8}}>Product Finder</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,letterSpacing:"-0.025em",marginBottom:8,lineHeight:1.1}}>Find the best product<br/>in your budget.</h2>
          <p style={{fontSize:14,color:C.muted,marginBottom:32,lineHeight:1.7}}>Tell us what you're looking for. We'll rank Best Overall, Best Budget, and Best Quality — no brand bias.</p>
          <FindProducts/>
        </div>
      )}
    </div>
  );
}
