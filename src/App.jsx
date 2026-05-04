import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://bnipigbonmxqqdofeopx.supabase.co";
const SUPABASE_KEY = "sb_publishable_4oKGWnINPQz4doCuKMu3iQ_ajlUYaUp";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const CLIENTES   = ["OPET","MLETRAS","GOV SP","POLIEDRO","Outro"];
const STATUSES   = ["Em processo","Validação","Ajustes","Finalizado","Atrasado"];
const NF_OPTS    = ["A emitir","Emitida","Não aplicável"];
const TABS       = ["inicio","prazos","financeiro","clientes","lista"];
const TAB_ICONS  = { inicio:"◈", prazos:"◷", financeiro:"₢", clientes:"⬡", lista:"≡" };
const TAB_LABELS = { inicio:"Início", prazos:"Prazos", financeiro:"Financeiro", clientes:"Clientes", lista:"Lista" };
const STATUS_SUSPENDE_PRAZO = ["Validação","Ajustes","Finalizado"];

const C = {
  bg:"#0D0D0D", card:"#141414", card2:"#1A1A1A", border:"#242424",
  amber:"#E8A44A", teal:"#4AADA8", red:"#D95F5F", green:"#5FA86D",
  purple:"#8B6FBE", yellow:"#D4A843", text:"#F0EDE6", sub:"#6B6560", sub2:"#9A9390",
};

const CLIENT_COLOR = {
  "OPET":C.amber,"MLETRAS":C.purple,"GOV SP":C.teal,"POLIEDRO":C.yellow,"Outro":C.sub2,
};

const STATUS_CFG = {
  "Em processo":{ color:C.amber,  bg:"#E8A44A18", border:"#E8A44A30" },
  "Validação":  { color:C.purple, bg:"#8B6FBE18", border:"#8B6FBE30" },
  "Ajustes":    { color:C.teal,   bg:"#4AADA818", border:"#4AADA830" },
  "Finalizado": { color:C.green,  bg:"#5FA86D18", border:"#5FA86D30" },
  "Atrasado":   { color:C.red,    bg:"#D95F5F18", border:"#D95F5F30" },
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const brl = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtDate = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const mesKey  = iso => iso ? iso.slice(0,7) : "";
const nomeMes = ym => { if(!ym) return ""; const [y,m]=ym.split("-"); return new Date(y,m-1,1).toLocaleString("pt-BR",{month:"long",year:"numeric"}); };

function prazoEfetivo(f) {
  return (f.status==="Ajustes" && f.prazo_ajuste) ? f.prazo_ajuste : f.prazo;
}
function diasRestantes(f) {
  const prazo = prazoEfetivo(f);
  if (!prazo) return null;
  if (STATUS_SUSPENDE_PRAZO.includes(f.status) && f.status!=="Ajustes") return null;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const p=new Date(prazo); p.setHours(0,0,0,0);
  return Math.round((p-hoje)/86400000);
}
function isRealmenteAtrasado(f) {
  if (STATUS_SUSPENDE_PRAZO.includes(f.status)) return false;
  const d=diasRestantes(f); return d!==null && d<0;
}
function urgencia(f) {
  if (f.status==="Finalizado") return "done";
  if (isRealmenteAtrasado(f)) return "atrasado";
  if (f.status==="Validação") return "suspenso";
  const d=diasRestantes(f);
  if (d===null) return "ok";
  if (d<=2) return "critico";
  if (d<=5) return "urgente";
  return "ok";
}
function isConcluido(f) { return f.status==="Finalizado" && f.pago; }
function saudacao() {
  const h=new Date().getHours();
  if (h>=5&&h<12) return {texto:"Bom dia",emoji:"☀️"};
  if (h>=12&&h<18) return {texto:"Boa tarde",emoji:"🌤️"};
  return {texto:"Boa noite",emoji:"🌙"};
}

// ── DB HELPERS ────────────────────────────────────────────────────────────────
// Mapeia snake_case do banco para camelCase do app
function fromDB(f) {
  return {
    id: f.id, cliente: f.cliente, projeto: f.projeto,
    inicio: f.inicio||"", prazo: f.prazo||"",
    prazoAjuste: f.prazo_ajuste||"", valor: parseFloat(f.valor)||0,
    status: f.status, pago: f.pago, nf: f.nf||"", obs: f.obs||"",
  };
}
function toDB(f, userId) {
  return {
    user_id: userId, cliente: f.cliente, projeto: f.projeto,
    inicio: f.inicio||null, prazo: f.prazo||null,
    prazo_ajuste: f.prazoAjuste||null, valor: parseFloat(f.valor)||0,
    status: f.status, pago: f.pago, nf: f.nf||"", obs: f.obs||"",
  };
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSession]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_,s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <Splash/>;
  if (!session) return <LoginScreen/>;
  return <MainApp session={session}/>;
}

// ── SPLASH ────────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,gap:16}}>
      <div style={{fontSize:32}}>💼</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text}}>AmigoFreela</div>
      <div style={{width:24,height:24,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.amber}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [msg,      setMsg]      = useState("");

  async function handleEmail() {
    setLoading(true); setError(""); setMsg("");
    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = await fn({ email, password });
    if (error) setError(error.message);
    else if (isSignUp) setMsg("Verifique seu email para confirmar o cadastro.");
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div style={{...S.root,justifyContent:"center",alignItems:"center",minHeight:"100vh",padding:24}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:8}}>💼</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:C.text}}>AmigoFreela</div>
          <div style={{fontSize:13,color:C.sub,marginTop:4}}>Gestão de freelances, simples assim.</div>
        </div>

        {/* Google */}
        <button style={S.googleBtn} onClick={handleGoogle} disabled={loading}>
          <span style={{fontSize:16}}>G</span>
          Entrar com Google
        </button>

        <div style={S.divider}><span style={S.dividerText}>ou</span></div>

        {/* Email */}
        <div style={{marginBottom:12}}>
          <input style={S.inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div style={{marginBottom:16}}>
          <input style={S.inp} type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}
        {msg   && <div style={S.msgBox}>{msg}</div>}

        <button style={S.saveBtn} onClick={handleEmail} disabled={loading||!email||!password}>
          {loading ? "Aguarde…" : isSignUp ? "Criar conta" : "Entrar"}
        </button>

        <button style={S.linkBtn} onClick={()=>{setIsSignUp(!isSignUp);setError("");setMsg("");}}>
          {isSignUp ? "Já tenho conta — Entrar" : "Não tenho conta — Criar"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function MainApp({ session }) {
  const [data,       setData]       = useState([]);
  const [loadingDB,  setLoadingDB]  = useState(true);
  const [tab,        setTab]        = useState("inicio");
  const [view,       setView]       = useState(null);
  const [toast,      setToast]      = useState("");
  const [ajusteModal,setAjusteModal]= useState(null);
  const [avatar,     setAvatar]     = useState(() => localStorage.getItem("fl_avatar")||"");

  const userId = session.user.id;
  const userEmail = session.user.email;
  const userName = userEmail?.split("@")[0] || "você";

  // Carrega dados do Supabase
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingDB(true);
    const { data: rows, error } = await supabase
      .from("freelances")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setData(rows.map(fromDB));
    setLoadingDB(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(""),2200); }

  async function save(f) {
    if (f.status==="Ajustes" && !f.prazoAjuste) {
      setAjusteModal(f); return;
    }
    if (f.id && f.id.length < 20) {
      // ID numérico = dado local antigo, criar novo
      f = { ...f, id: undefined };
    }
    if (f.id) {
      const { error } = await supabase
        .from("freelances")
        .update(toDB(f, userId))
        .eq("id", f.id);
      if (!error) { await loadData(); showToast("Atualizado ✓"); }
      else showToast("Erro ao salvar");
    } else {
      const { error } = await supabase
        .from("freelances")
        .insert(toDB(f, userId));
      if (!error) { await loadData(); showToast("Adicionado ✓"); }
      else showToast("Erro ao salvar");
    }
    setView(null);
  }

  async function confirmAjuste(f, novoPrazo) {
    const fFinal = { ...f, prazoAjuste: novoPrazo };
    await save(fFinal);
    setAjusteModal(null);
  }

  async function del(id) {
    const { error } = await supabase.from("freelances").delete().eq("id", id);
    if (!error) { await loadData(); showToast("Removido"); }
    setView(null);
  }

  async function togglePago(id) {
    const f = data.find(x=>x.id===id);
    if (!f) return;
    await supabase.from("freelances").update({ pago: !f.pago }).eq("id", id);
    await loadData();
  }

  function exportCSV() {
    const header = "Cliente,Projeto,Início,Prazo,Prazo Ajuste,Valor,Status,Pago,NF,Obs\n";
    const rows = data.map(f =>
      [f.cliente,`"${f.projeto}"`,f.inicio,f.prazo,f.prazoAjuste||"",f.valor,f.status,f.pago?"Sim":"Não",f.nf,`"${f.obs||""}"`].join(",")
    ).join("\n");
    const blob = new Blob([header+rows],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`amigofreela_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado ✓");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  const titleMap = { inicio:"Início",prazos:"Prazos",financeiro:"Financeiro",clientes:"Clientes",lista:"Lista" };

  if (loadingDB) return <Splash/>;

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <header style={S.header}>
        {view
          ? <button style={S.iconBtn} onClick={()=>setView(null)}>←</button>
          : <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={S.avatarWrap} onClick={()=>document.getElementById("avatarInput").click()}>
                {avatar
                  ? <img src={avatar} style={S.avatarImg} alt="avatar"/>
                  : <div style={S.avatarPlaceholder}>{userName.slice(0,2).toUpperCase()}</div>}
                <input id="avatarInput" type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{
                    const f=e.target.files[0]; if(!f) return;
                    const r=new FileReader(); r.onload=ev=>{
                      setAvatar(ev.target.result);
                      localStorage.setItem("fl_avatar",ev.target.result);
                    }; r.readAsDataURL(f);
                  }}/>
              </div>
              <button style={S.logoutBtn} onClick={logout} title="Sair">⏻</button>
            </div>}
        <span style={S.headerTitle}>
          {view ? (view.payload?.id?"Editar":"Novo Freelance") : titleMap[tab]}
        </span>
        {!view
          ? <button style={S.iconBtnAmber} onClick={()=>setView({type:"form",payload:{}})}>＋</button>
          : <span style={{width:36}}/>}
      </header>

      <main style={S.main}>
        {!view && tab==="inicio"     && <Inicio data={data} userName={userName} onOpen={f=>setView({type:"form",payload:f})} onTogglePago={togglePago} onExport={exportCSV}/>}
        {!view && tab==="prazos"     && <Prazos data={data} onOpen={f=>setView({type:"form",payload:f})}/>}
        {!view && tab==="financeiro" && <Financeiro data={data}/>}
        {!view && tab==="clientes"   && <Clientes data={data} onOpen={f=>setView({type:"form",payload:f})}/>}
        {!view && tab==="lista"      && <Lista data={data} onOpen={f=>setView({type:"form",payload:f})} onTogglePago={togglePago}/>}
        {view?.type==="form"         && <Form initial={view.payload} onSave={save} onDelete={del}/>}
      </main>

      {!view && (
        <nav style={S.nav}>
          {TABS.map(k=>(
            <button key={k} style={{...S.navBtn,...(tab===k?S.navActive:{})}} onClick={()=>setTab(k)}>
              <span style={{fontSize:16}}>{TAB_ICONS[k]}</span>
              <span style={{fontSize:9,letterSpacing:0.5}}>{TAB_LABELS[k]}</span>
            </button>
          ))}
        </nav>
      )}

      {ajusteModal && <AjusteModal freelance={ajusteModal} onConfirm={confirmAjuste} onCancel={()=>setAjusteModal(null)}/>}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

// ── INICIO ────────────────────────────────────────────────────────────────────
function Inicio({ data, userName, onOpen, onTogglePago, onExport }) {
  const s = saudacao();
  const total     = data.reduce((s,f)=>s+f.valor,0);
  const recebido  = data.filter(f=>f.pago).reduce((s,f)=>s+f.valor,0);
  const aReceber  = data.filter(f=>!f.pago&&f.status!=="Finalizado").reduce((s,f)=>s+f.valor,0);
  const nfPend    = data.filter(f=>f.nf==="A emitir").length;
  const atrasados = data.filter(f=>isRealmenteAtrasado(f));
  const proximos  = data
    .filter(f=>!isConcluido(f)&&urgencia(f)!=="done"&&urgencia(f)!=="suspenso")
    .sort((a,b)=>(diasRestantes(a)??999)-(diasRestantes(b)??999))
    .slice(0,5);

  return (
    <div style={S.section}>
      <div style={S.saudacao}>
        <span style={{fontSize:26}}>{s.emoji}</span>
        <div>
          <div style={S.saudacaoTexto}>{s.texto}, {userName}!</div>
          <div style={S.saudacaoSub}>{data.length} projetos · {data.filter(f=>!isConcluido(f)).length} em andamento</div>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPI label="Total geral" value={brl(total)}    accent={C.amber}/>
        <KPI label="Recebido"    value={brl(recebido)} accent={C.green}/>
        <KPI label="A receber"   value={brl(aReceber)} accent={C.yellow}/>
        <KPI label="NF pendente" value={String(nfPend)} accent={C.purple} small/>
      </div>

      {atrasados.length>0 && (
        <div style={S.alertBox}>
          <div style={S.alertTitle}>🚨 Realmente atrasados</div>
          {atrasados.map(f=>(
            <div key={f.id} style={S.alertItem} onClick={()=>onOpen(f)}>
              <span>{f.projeto}</span>
              <span style={{color:C.red,fontWeight:700}}>{Math.abs(diasRestantes(f))}d atraso</span>
            </div>
          ))}
        </div>
      )}

      <div style={S.blockTitle}>Próximos prazos</div>
      {proximos.length===0 && <div style={S.empty}>Nenhum prazo próximo.</div>}
      {proximos.map(f=><CardCompact key={f.id} f={f} onOpen={onOpen} onTogglePago={onTogglePago}/>)}

      <button style={S.exportBtn} onClick={onExport}>⬇ Exportar dados (CSV)</button>
    </div>
  );
}

// ── PRAZOS ────────────────────────────────────────────────────────────────────
function Prazos({ data, onOpen }) {
  const ativos = data.filter(f=>f.status!=="Finalizado");
  const grupos = {
    "🚨 Atrasados":     ativos.filter(f=>isRealmenteAtrasado(f)),
    "🔴 Hoje / amanhã": ativos.filter(f=>{ const d=diasRestantes(f); return d!==null&&d>=0&&d<=1; }),
    "🟡 Esta semana":   ativos.filter(f=>{ const d=diasRestantes(f); return d!==null&&d>=2&&d<=7; }),
    "⏸ Suspensos":      ativos.filter(f=>f.status==="Validação"),
    "📋 Ajustes":       ativos.filter(f=>f.status==="Ajustes"),
    "🟢 No prazo":      ativos.filter(f=>{ const d=diasRestantes(f); return d!==null&&d>7; }),
  };
  return (
    <div style={{padding:"12px 16px 80px"}}>
      {Object.entries(grupos).map(([label,items])=>{
        if(!items.length) return null;
        return (
          <div key={label}>
            <div style={S.blockTitle}>{label}</div>
            {items.map(f=><CardPrazo key={f.id} f={f} onOpen={onOpen}/>)}
          </div>
        );
      })}
    </div>
  );
}

// ── FINANCEIRO ────────────────────────────────────────────────────────────────
function Financeiro({ data }) {
  const meses = [...new Set(data.map(f=>mesKey(f.prazo)).filter(Boolean))].sort().reverse();
  return (
    <div style={{padding:"12px 16px 80px"}}>
      <div style={S.blockTitle}>Por mês</div>
      {meses.map(mes=>{
        const items    = data.filter(f=>mesKey(f.prazo)===mes);
        const total    = items.reduce((s,f)=>s+f.valor,0);
        const recebido = items.filter(f=>f.pago).reduce((s,f)=>s+f.valor,0);
        const pend     = items.filter(f=>!f.pago).reduce((s,f)=>s+f.valor,0);
        return (
          <div key={mes} style={S.mesCard}>
            <div style={S.mesNome}>{nomeMes(mes)}</div>
            <div style={S.mesRow}>
              <div style={S.mesKpi}><div style={{color:C.amber,fontWeight:700,fontSize:14}}>{brl(total)}</div><div style={S.mesKpiLabel}>Total</div></div>
              <div style={S.mesKpi}><div style={{color:C.green,fontWeight:700,fontSize:14}}>{brl(recebido)}</div><div style={S.mesKpiLabel}>Recebido</div></div>
              <div style={S.mesKpi}><div style={{color:C.yellow,fontWeight:700,fontSize:14}}>{brl(pend)}</div><div style={S.mesKpiLabel}>Pendente</div></div>
            </div>
            <div style={S.mesItens}>
              {items.map(f=>(
                <div key={f.id} style={S.mesItem}>
                  <span style={{fontSize:12,color:C.sub2,flex:1}}>{f.projeto}</span>
                  <span style={{fontSize:12,color:f.pago?C.green:C.sub2,fontWeight:600}}>{brl(f.valor)}</span>
                  <span style={{...S.statusPill,...STATUS_CFG[f.status],marginLeft:6}}>{f.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function Clientes({ data, onOpen }) {
  const [open,setOpen]=useState(null);
  return (
    <div style={{padding:"12px 16px 80px"}}>
      {CLIENTES.filter(c=>data.some(f=>f.cliente===c)).map(c=>{
        const items    = data.filter(f=>f.cliente===c);
        const ativos   = items.filter(f=>!isConcluido(f));
        const total    = items.reduce((s,f)=>s+f.valor,0);
        const recebido = items.filter(f=>f.pago).reduce((s,f)=>s+f.valor,0);
        const cor      = CLIENT_COLOR[c]||C.sub2;
        const isOpen   = open===c;
        return (
          <div key={c} style={{...S.clienteCard,borderLeft:`3px solid ${cor}`}}>
            <div style={S.clienteHeader} onClick={()=>setOpen(isOpen?null:c)}>
              <div>
                <div style={{...S.clienteNome,color:cor}}>{c}</div>
                <div style={S.clienteSub}>{items.length} projetos · {ativos.length} ativos</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{brl(total)}</div>
                <div style={{fontSize:11,color:C.green}}>{brl(recebido)} recebido</div>
              </div>
              <span style={{color:C.sub,marginLeft:8,fontSize:16}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={S.clienteItens}>
                {items.sort((a,b)=>(b.prazo||"").localeCompare(a.prazo||"")).map(f=>(
                  <div key={f.id} style={S.clienteItem} onClick={()=>onOpen(f)}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:C.text,fontWeight:500}}>{f.projeto}</div>
                      <div style={{fontSize:11,color:C.sub}}>Prazo: {fmtDate(prazoEfetivo(f))}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{brl(f.valor)}</div>
                      <div style={{...S.statusPill,...STATUS_CFG[f.status]}}>{f.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── LISTA ─────────────────────────────────────────────────────────────────────
function Lista({ data, onOpen, onTogglePago }) {
  const [busca,setBusca]         = useState("");
  const [filterCliente,setFC]    = useState("todos");
  const [filterStatus,setFS]     = useState("todos");
  const [showConcluidos,setSC]   = useState(false);
  const [sortBy,setSort]         = useState("prazo");
  const [filterMes,setFM]        = useState("todos");
  const meses = [...new Set(data.map(f=>mesKey(f.prazo)).filter(Boolean))].sort().reverse();

  const filtrar = arr => arr
    .filter(f=>filterCliente==="todos"||f.cliente===filterCliente)
    .filter(f=>filterStatus==="todos"||f.status===filterStatus)
    .filter(f=>filterMes==="todos"||mesKey(f.prazo)===filterMes)
    .filter(f=>!busca||f.projeto.toLowerCase().includes(busca.toLowerCase())||f.cliente.toLowerCase().includes(busca.toLowerCase()))
    .sort((a,b)=>{
      if(sortBy==="prazo")   return (prazoEfetivo(a)||"").localeCompare(prazoEfetivo(b)||"");
      if(sortBy==="valor")   return b.valor-a.valor;
      if(sortBy==="cliente") return a.cliente.localeCompare(b.cliente);
      return 0;
    });

  const ativosF   = filtrar(data.filter(f=>!isConcluido(f)));
  const cluidosF  = filtrar(data.filter(f=>isConcluido(f)));

  return (
    <div>
      <div style={S.searchWrap}>
        <input style={S.searchInput} placeholder="🔍  Buscar…" value={busca} onChange={e=>setBusca(e.target.value)}/>
      </div>
      <div style={{overflowX:"auto",display:"flex",gap:8,padding:"8px 16px"}}>
        <Chip active={filterCliente==="todos"} onClick={()=>setFC("todos")}>Todos</Chip>
        {CLIENTES.filter(c=>data.some(f=>f.cliente===c)).map(c=>(
          <Chip key={c} active={filterCliente===c} onClick={()=>setFC(c)} color={CLIENT_COLOR[c]}>{c}</Chip>
        ))}
      </div>
      <div style={{overflowX:"auto",display:"flex",gap:8,padding:"0 16px 6px"}}>
        <Chip active={filterMes==="todos"} onClick={()=>setFM("todos")} small>Todos meses</Chip>
        {meses.map(m=><Chip key={m} active={filterMes===m} onClick={()=>setFM(m)} small>{nomeMes(m).split(" ")[0]}</Chip>)}
      </div>
      <div style={{overflowX:"auto",display:"flex",gap:8,padding:"0 16px 6px"}}>
        <Chip active={filterStatus==="todos"} onClick={()=>setFS("todos")} small>Todos</Chip>
        {STATUSES.map(s=><Chip key={s} active={filterStatus===s} onClick={()=>setFS(s)} color={STATUS_CFG[s]?.color} small>{s}</Chip>)}
      </div>
      <div style={{display:"flex",gap:6,padding:"0 16px 8px",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.sub}}>Ord:</span>
        {[["prazo","Prazo"],["valor","Valor"],["cliente","Cliente"]].map(([k,l])=>(
          <Chip key={k} active={sortBy===k} onClick={()=>setSort(k)} small>{l}</Chip>
        ))}
      </div>
      <div style={{padding:"0 16px 80px"}}>
        <div style={S.listCount}>{ativosF.length} projeto{ativosF.length!==1?"s":""} ativos</div>
        {ativosF.map(f=><CardLista key={f.id} f={f} onOpen={onOpen} onTogglePago={onTogglePago}/>)}
        {cluidosF.length>0 && (
          <button style={S.concluidosToggle} onClick={()=>setSC(!showConcluidos)}>
            {showConcluidos?"▲":"▼"} {cluidosF.length} concluído{cluidosF.length!==1?"s":""} e pagos
          </button>
        )}
        {showConcluidos && cluidosF.map(f=><CardLista key={f.id} f={f} onOpen={onOpen} onTogglePago={onTogglePago} dim/>)}
      </div>
    </div>
  );
}

// ── CARDS ─────────────────────────────────────────────────────────────────────
function CardCompact({ f, onOpen, onTogglePago }) {
  const urg=urgencia(f), d=diasRestantes(f), sc=STATUS_CFG[f.status]||STATUS_CFG["Em processo"];
  const urgColor=urg==="atrasado"||urg==="critico"?C.red:urg==="urgente"?C.yellow:C.sub2;
  return (
    <div style={{...S.card,borderLeft:`2px solid ${CLIENT_COLOR[f.cliente]||C.sub}`}} onClick={()=>onOpen(f)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:CLIENT_COLOR[f.cliente]||C.sub2,fontWeight:700,marginBottom:2}}>{f.cliente}</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600,lineHeight:1.3}}>{f.projeto}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{brl(f.valor)}</div>
          <div style={{...S.statusPill,...sc,marginTop:4}}>{f.status}</div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <span style={{fontSize:12,color:urgColor,fontWeight:urg==="atrasado"?700:400}}>
          {urg==="suspenso"?"⏸ Prazo suspenso":urg==="atrasado"?`🚨 ${Math.abs(d)}d atraso`:urg==="critico"?`🔴 ${d}d restantes`:urg==="urgente"?`🟡 ${d}d restantes`:d!==null?`📅 ${fmtDate(prazoEfetivo(f))}`:"—"}
        </span>
        <button style={{...S.pagoBtn,...(f.pago?S.pagoBtnSim:S.pagoBtnNao)}}
          onClick={e=>{e.stopPropagation();onTogglePago(f.id);}}>
          {f.pago?"✓ Pago":"Pend."}
        </button>
      </div>
    </div>
  );
}

function CardPrazo({ f, onOpen }) {
  const d=diasRestantes(f), urg=urgencia(f), sc=STATUS_CFG[f.status];
  return (
    <div style={{...S.card,opacity:urg==="suspenso"?0.7:1}} onClick={()=>onOpen(f)}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:CLIENT_COLOR[f.cliente]||C.sub2,fontWeight:700,marginBottom:2}}>{f.cliente}</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600}}>{f.projeto}</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4}}>{f.status==="Ajustes"?"Prazo ajuste: ":"Prazo: "}{fmtDate(prazoEfetivo(f))}</div>
        </div>
        <div style={{textAlign:"right"}}>
          {d!==null && <div style={{fontSize:20,fontWeight:800,color:urg==="atrasado"||urg==="critico"?C.red:urg==="urgente"?C.yellow:C.teal}}>{d<0?`-${Math.abs(d)}`:d}d</div>}
          {d===null && <div style={{fontSize:12,color:C.purple}}>⏸</div>}
          <div style={{...S.statusPill,...sc,marginTop:4}}>{f.status}</div>
        </div>
      </div>
    </div>
  );
}

function CardLista({ f, onOpen, onTogglePago, dim }) {
  const sc=STATUS_CFG[f.status]||STATUS_CFG["Em processo"], urg=urgencia(f), d=diasRestantes(f);
  return (
    <div style={{...S.card,opacity:dim?0.5:1}} onClick={()=>onOpen(f)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:CLIENT_COLOR[f.cliente]||C.sub2,fontWeight:700,marginBottom:2}}>{f.cliente}</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600,lineHeight:1.3}}>{f.projeto}</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span>📅 {fmtDate(prazoEfetivo(f))}</span>
            {d!==null&&!dim&&<span style={{color:urg==="atrasado"||urg==="critico"?C.red:urg==="urgente"?C.yellow:C.sub}}>{d<0?`${Math.abs(d)}d atraso`:d===0?"Hoje!":urg==="urgente"?`${d}d`:""}</span>}
            {f.nf&&<span>🧾 {f.nf}</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{brl(f.valor)}</div>
          <div style={{...S.statusPill,...sc,marginTop:4}}>{f.status}</div>
          <button style={{...S.pagoBtn,...(f.pago?S.pagoBtnSim:S.pagoBtnNao),marginTop:6}}
            onClick={e=>{e.stopPropagation();onTogglePago(f.id);}}>
            {f.pago?"✓ Pago":"Pend."}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FORM ──────────────────────────────────────────────────────────────────────
function Form({ initial, onSave, onDelete }) {
  const [f,setF]=useState({cliente:"",projeto:"",inicio:"",prazo:"",prazoAjuste:"",valor:"",status:"Em processo",pago:false,nf:"",obs:"",...initial});
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const valid=f.cliente&&f.projeto&&f.valor;
  return (
    <div style={S.formWrap}>
      <FRow label="Cliente">
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
          {CLIENTES.map(c=><Chip key={c} active={f.cliente===c} onClick={()=>u("cliente",c)} color={CLIENT_COLOR[c]}>{c}</Chip>)}
        </div>
        <input style={{...S.inp,marginTop:8}} placeholder="Ou digite…" value={f.cliente} onChange={e=>u("cliente",e.target.value)}/>
      </FRow>
      <FRow label="Projeto / Serviço *">
        <input style={S.inp} placeholder="Ex: Revisão EF6-HIS-U1-C1" value={f.projeto} onChange={e=>u("projeto",e.target.value)}/>
      </FRow>
      <FRow label="Valor (R$) *">
        <input style={S.inp} type="number" placeholder="0" value={f.valor} onChange={e=>u("valor",parseFloat(e.target.value)||"")}/>
      </FRow>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <div style={{flex:1}}><div style={S.fLabel}>Início</div><input style={S.inp} type="date" value={f.inicio} onChange={e=>u("inicio",e.target.value)}/></div>
        <div style={{flex:1}}><div style={S.fLabel}>Prazo</div><input style={S.inp} type="date" value={f.prazo} onChange={e=>u("prazo",e.target.value)}/></div>
      </div>
      {f.status==="Ajustes"&&(
        <FRow label="Prazo do ajuste">
          <input style={S.inp} type="date" value={f.prazoAjuste} onChange={e=>u("prazoAjuste",e.target.value)}/>
        </FRow>
      )}
      <FRow label="Status">
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
          {STATUSES.map(s=><Chip key={s} active={f.status===s} onClick={()=>u("status",s)} color={STATUS_CFG[s]?.color}>{s}</Chip>)}
        </div>
      </FRow>
      <FRow label="Nota Fiscal">
        <div style={{display:"flex",gap:8,marginTop:6}}>
          {NF_OPTS.map(n=><Chip key={n} active={f.nf===n} onClick={()=>u("nf",n)} small>{n}</Chip>)}
        </div>
      </FRow>
      <FRow label="Pago?">
        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button style={{...S.toggleBtn,...(f.pago?S.toggleOn:S.toggleOff)}} onClick={()=>u("pago",true)}>✓ Sim</button>
          <button style={{...S.toggleBtn,...(!f.pago?S.toggleOn:S.toggleOff)}} onClick={()=>u("pago",false)}>✗ Não</button>
        </div>
      </FRow>
      <FRow label="Observações">
        <textarea style={{...S.inp,height:72,resize:"none"}} value={f.obs} onChange={e=>u("obs",e.target.value)} placeholder="Anotações opcionais"/>
      </FRow>
      <button style={{...S.saveBtn,opacity:valid?1:0.4}} disabled={!valid} onClick={()=>onSave(f)}>
        {f.id?"Salvar alterações":"Adicionar freelance"}
      </button>
      {f.id&&<button style={S.delBtn} onClick={()=>{if(window.confirm("Excluir?"))onDelete(f.id);}}>Excluir</button>}
    </div>
  );
}

// ── MODAL AJUSTE ──────────────────────────────────────────────────────────────
function AjusteModal({ freelance:f, onConfirm, onCancel }) {
  const [prazo,setPrazo]=useState("");
  return (
    <div style={S.modalOverlay}>
      <div style={S.modalBox}>
        <div style={S.modalTitle}>Prazo do ajuste</div>
        <div style={S.modalSub}>"{f.projeto}" foi movido para Ajustes. Qual é o novo prazo?</div>
        <input style={{...S.inp,marginTop:12}} type="date" value={prazo} onChange={e=>setPrazo(e.target.value)}/>
        <button style={{...S.saveBtn,opacity:prazo?1:0.4,marginTop:12}} disabled={!prazo} onClick={()=>onConfirm(f,prazo)}>Confirmar</button>
        <button style={{...S.delBtn,marginTop:8}} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function KPI({label,value,accent,small}) {
  return (
    <div style={{...S.kpi,borderTop:`2px solid ${accent}`}}>
      <div style={{fontSize:small?13:17,fontWeight:800,color:accent,lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:C.sub,marginTop:5,textTransform:"uppercase",letterSpacing:0.6}}>{label}</div>
    </div>
  );
}
function FRow({label,children}) { return <div style={{marginBottom:16}}><div style={S.fLabel}>{label}</div>{children}</div>; }
function Chip({children,active,onClick,color,small}) {
  return (
    <button style={{...S.chip,...(small?{padding:"4px 10px",fontSize:11}:{}),...(active&&color?{background:color+"22",color,borderColor:color}:{}),...(active&&!color?S.chipActive:{})}} onClick={onClick}>{children}</button>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Archivo:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:#0D0D0D;}
  input,textarea,button,select{font-family:'Archivo',sans-serif;}
  ::-webkit-scrollbar{display:none;}
  @keyframes spin{to{transform:rotate(360deg);}}
`;

const S={
  root:{fontFamily:"'Archivo',sans-serif",background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",color:C.text},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:20},
  headerTitle:{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:18,color:C.text},
  iconBtn:{background:"none",border:"none",color:C.text,fontSize:22,cursor:"pointer",padding:"4px 8px"},
  iconBtnAmber:{background:C.amber,color:"#0D0D0D",border:"none",borderRadius:"50%",width:34,height:34,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700},
  logoutBtn:{background:"none",border:"none",color:C.sub,fontSize:16,cursor:"pointer",padding:"4px"},
  avatarWrap:{width:34,height:34,cursor:"pointer"},
  avatarImg:{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.amber}`},
  avatarPlaceholder:{width:34,height:34,borderRadius:"50%",background:C.amber+"30",border:`2px solid ${C.amber}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.amber},
  main:{flex:1,overflowY:"auto",paddingBottom:72},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20},
  navBtn:{flex:1,background:"none",border:"none",color:C.sub,padding:"10px 0 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3},
  navActive:{color:C.amber},
  toast:{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:C.card2,color:C.text,padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.6)",zIndex:30,border:`1px solid ${C.border}`},
  section:{padding:"16px 16px 24px"},
  saudacao:{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:C.card2,borderBottom:`1px solid ${C.border}`},
  saudacaoTexto:{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:C.text},
  saudacaoSub:{fontSize:12,color:C.sub,marginTop:2},
  kpiGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,marginTop:16},
  kpi:{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`},
  alertBox:{background:"#D95F5F12",border:`1px solid ${C.red}40`,borderRadius:12,padding:"12px 14px",marginBottom:16},
  alertTitle:{fontSize:12,fontWeight:700,color:C.red,marginBottom:8},
  alertItem:{display:"flex",justifyContent:"space-between",fontSize:13,color:C.text,padding:"4px 0",cursor:"pointer"},
  blockTitle:{fontSize:11,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10,marginTop:8},
  card:{background:C.card,borderRadius:12,padding:"14px",marginBottom:10,cursor:"pointer",border:`1px solid ${C.border}`},
  statusPill:{borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600,display:"inline-block",border:"1px solid"},
  pagoBtn:{borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit"},
  pagoBtnSim:{background:"#5FA86D25",color:C.green},
  pagoBtnNao:{background:C.card2,color:C.sub},
  empty:{textAlign:"center",color:C.sub,padding:"32px 20px",fontSize:14},
  exportBtn:{width:"100%",background:"none",color:C.teal,border:`1px solid ${C.teal}40`,borderRadius:12,padding:"11px",fontSize:13,fontWeight:600,cursor:"pointer",marginTop:16},
  searchWrap:{padding:"12px 16px 0"},
  searchInput:{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,color:C.text,outline:"none"},
  listCount:{fontSize:11,color:C.sub,padding:"8px 0 4px",textTransform:"uppercase",letterSpacing:0.5},
  concluidosToggle:{width:"100%",background:"none",color:C.sub,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",marginTop:8,fontFamily:"inherit"},
  mesCard:{background:C.card,borderRadius:14,marginBottom:14,overflow:"hidden",border:`1px solid ${C.border}`},
  mesNome:{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:C.text,padding:"14px 16px 8px",textTransform:"capitalize"},
  mesRow:{display:"flex",borderBottom:`1px solid ${C.border}`},
  mesKpi:{flex:1,padding:"8px 16px 10px",borderRight:`1px solid ${C.border}`},
  mesKpiLabel:{fontSize:10,color:C.sub,marginTop:2,textTransform:"uppercase"},
  mesItens:{padding:"8px 0"},
  mesItem:{display:"flex",alignItems:"center",padding:"6px 16px",gap:8},
  clienteCard:{background:C.card,borderRadius:14,marginBottom:12,overflow:"hidden",border:`1px solid ${C.border}`},
  clienteHeader:{display:"flex",alignItems:"center",gap:8,padding:"14px 16px",cursor:"pointer"},
  clienteNome:{fontSize:15,fontWeight:700},
  clienteSub:{fontSize:12,color:C.sub,marginTop:2},
  clienteItens:{borderTop:`1px solid ${C.border}`,padding:"8px 0"},
  clienteItem:{display:"flex",gap:8,padding:"10px 16px",cursor:"pointer",borderBottom:`1px solid ${C.border}40`},
  chip:{background:C.card2,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 14px",fontSize:13,color:C.sub,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"},
  chipActive:{background:C.amber+"22",color:C.amber,borderColor:C.amber},
  formWrap:{padding:"16px 16px 60px"},
  fLabel:{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4},
  inp:{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",fontSize:14,color:C.text,outline:"none",marginTop:4},
  toggleBtn:{flex:1,border:"none",borderRadius:10,padding:"10px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  toggleOn:{background:C.amber+"25",color:C.amber},
  toggleOff:{background:C.card2,color:C.sub},
  saveBtn:{width:"100%",background:C.amber,color:"#0D0D0D",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:8,fontFamily:"inherit"},
  delBtn:{width:"100%",background:"none",color:C.red,border:`1px solid ${C.red}40`,borderRadius:12,padding:"11px",fontSize:14,cursor:"pointer",marginTop:10,fontFamily:"inherit"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20},
  modalBox:{background:C.card,borderRadius:16,padding:24,width:"100%",maxWidth:400,border:`1px solid ${C.border}`},
  modalTitle:{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.text,marginBottom:6},
  modalSub:{fontSize:13,color:C.sub,lineHeight:1.5},
  // Login
  googleBtn:{width:"100%",background:C.card2,color:C.text,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"inherit",marginBottom:8},
  divider:{position:"relative",textAlign:"center",margin:"16px 0"},
  dividerText:{background:C.bg,padding:"0 12px",fontSize:12,color:C.sub,position:"relative",zIndex:1},
  errorBox:{background:"#D95F5F18",border:`1px solid ${C.red}40`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:12},
  msgBox:{background:"#5FA86D18",border:`1px solid ${C.green}40`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.green,marginBottom:12},
  linkBtn:{width:"100%",background:"none",border:"none",color:C.sub,fontSize:13,cursor:"pointer",marginTop:12,fontFamily:"inherit"},
};
