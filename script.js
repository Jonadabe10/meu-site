// ========================
// FIREBASE CONFIG
// ========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIt4LdDEqExw7X_54jcyuDvbh6hF1vj9U",
    authDomain: "minhas-financas-90805.firebaseapp.com",
    projectId: "minhas-financas-90805",
    storageBucket: "minhas-financas-90805.firebasestorage.app",
    messagingSenderId: "258392006644",
    appId: "1:258392006644:web:85fc447639637a6ffde3a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================
// ESTADO GLOBAL
// ========================
const CORES = ["#534AB7","#0F6E56","#D85A30","#D4537E","#185FA5","#BA7517","#639922","#993556","#A32D2D","#3C3489","#059669","#7C3AED"];
const CATS_SUGERIDAS = ["Alimentação","Saúde","Educação","Lazer","Academia","Streaming","Internet","Luz","Água","Farmácia","Roupas","Pets","Seguros","Outros"];
const CORES_ITEM = {
    Casa:"#22c55e", Cartão:"#60a5fa", Viagem:"#f59e0b", Consórcio:"#c084fc",
    Carro:"#f87171", Alimentação:"#fb923c", Saúde:"#ec4899", Lazer:"#34d399", Outros:"#94a3b8"
};

let donutChart = null, barraChart = null, historicoChart = null;
let outroIdCounter = 0;
let usuarioAtual = null;

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();

let cacheGastos = {};
let cacheSalarios = {};
let cacheMetas = [];

// ========================
// AUTENTICAÇÃO
// ========================
window.fazerLoginGoogle = async function() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch(e) {
        showToast("global", "❌ Erro ao fazer login. Tente novamente.");
    }
};

window.fazerLogout = async function(e) {
    if (e) e.stopPropagation();
    await signOut(auth);
    cacheGastos = {};
    cacheSalarios = {};
    cacheMetas = [];
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        document.getElementById("tela-login").style.display = "none";
        document.getElementById("tela-loading").style.display = "flex";
        document.getElementById("app-principal").style.display = "none";

        await carregarTodosOsDados();

        document.getElementById("tela-loading").style.display = "none";
        document.getElementById("app-principal").style.display = "block";

        document.getElementById("user-nome").textContent = user.displayName?.split(" ")[0] || "Usuário";
        document.getElementById("user-foto").src = user.photoURL || "";
        document.getElementById("dropdown-email").textContent = user.email;

        carregarTema();
        atualizarTudo();
    } else {
        usuarioAtual = null;
        document.getElementById("tela-loading").style.display = "none";
        document.getElementById("app-principal").style.display = "none";
        document.getElementById("tela-login").style.display = "block";
    }
});

// ========================
// FIRESTORE — HELPERS
// ========================
function getChaveMes(m, a) {
    return `${a}_${String(m+1).padStart(2,'0')}`;
}

async function carregarTodosOsDados() {
    if (!usuarioAtual) return;
    const uid = usuarioAtual.uid;

    const gastosRef = collection(db, "usuarios", uid, "gastos");
    const snap = await getDocs(gastosRef);
    cacheGastos = {};
    snap.forEach(d => { cacheGastos[d.id] = d.data().lista || []; });

    const salRef = collection(db, "usuarios", uid, "salarios");
    const salSnap = await getDocs(salRef);
    cacheSalarios = {};
    salSnap.forEach(d => { cacheSalarios[d.id] = d.data().valor || 0; });

    const metasRef = collection(db, "usuarios", uid, "metas");
    const metasSnap = await getDocs(metasRef);
    cacheMetas = [];
    metasSnap.forEach(d => cacheMetas.push({ id: d.id, ...d.data() }));

    const cfgRef = doc(db, "usuarios", uid, "config", "geral");
    const cfgSnap = await getDoc(cfgRef);
    if (cfgSnap.exists()) {
        let cfg = cfgSnap.data();
        if (cfg.tema) localStorage.setItem("tema", cfg.tema);
        if (cfg.limiteAlerta) document.getElementById("limite-alerta").value = cfg.limiteAlerta;
    }
}

async function salvarGastosFirestore(m, a) {
    if (!usuarioAtual) return;
    const chave = getChaveMes(m, a);
    const ref = doc(db, "usuarios", usuarioAtual.uid, "gastos", chave);
    await setDoc(ref, { lista: cacheGastos[chave] || [] });
}

async function salvarSalarioFirestore(m, a, val) {
    if (!usuarioAtual) return;
    const chave = getChaveMes(m, a);
    cacheSalarios[chave] = val;
    const ref = doc(db, "usuarios", usuarioAtual.uid, "salarios", chave);
    await setDoc(ref, { valor: val });
}

async function salvarMetasFirestore() {
    if (!usuarioAtual) return;
    const uid = usuarioAtual.uid;
    const metasRef = collection(db, "usuarios", uid, "metas");
    const snap = await getDocs(metasRef);
    for (let d of snap.docs) await deleteDoc(d.ref);
    for (let meta of cacheMetas) {
        const ref = doc(db, "usuarios", uid, "metas", String(meta.id));
        await setDoc(ref, meta);
    }
}

async function salvarConfig(cfg) {
    if (!usuarioAtual) return;
    const ref = doc(db, "usuarios", usuarioAtual.uid, "config", "geral");
    await setDoc(ref, cfg, { merge: true });
}

// ========================
// CACHE — getters/setters
// ========================
function getGastos() {
    return cacheGastos[getChaveMes(mesAtual, anoAtual)] || [];
}

function setGastos(arr) {
    const chave = getChaveMes(mesAtual, anoAtual);
    cacheGastos[chave] = arr;
    salvarGastosFirestore(mesAtual, anoAtual);
}

function getSalario() {
    const fixo = cacheSalarios["fixo"];
    if (fixo) return fixo;
    return cacheSalarios[getChaveMes(mesAtual, anoAtual)] || 0;
}

// ========================
// UTILS
// ========================
function fmt(v) {
    return "R$ " + Math.abs(Math.round(v)).toLocaleString("pt-BR");
}

function showToast(id, msg) {
    if (id === "global") {
        let el = document.getElementById("toast-global");
        el.textContent = msg || "✓ Feito!";
        el.style.display = "flex";
        setTimeout(() => el.style.display = "none", 2800);
        return;
    }
    let el = document.getElementById(id);
    if (!el) return;
    el.style.display = "flex";
    setTimeout(() => el.style.display = "none", 2500);
}

function showErro(id) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 3000);
}

function getMesNome(m, a) {
    return new Date(a, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ========================
// TEMA
// ========================
window.toggleTema = async function() {
    let html = document.documentElement;
    let novo = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", novo);
    localStorage.setItem("tema", novo);
    document.getElementById("btn-theme").textContent = novo === "dark" ? "🌙" : "☀️";
    await salvarConfig({ tema: novo });
    atualizarAnalise();
};

function carregarTema() {
    let tema = localStorage.getItem("tema") || "dark";
    document.documentElement.setAttribute("data-theme", tema);
    document.getElementById("btn-theme").textContent = tema === "dark" ? "🌙" : "☀️";
}

// ========================
// USER MENU
// ========================
window.toggleUserMenu = function() {
    let dd = document.getElementById("user-dropdown");
    dd.style.display = dd.style.display === "none" ? "block" : "none";
};

document.addEventListener("click", e => {
    let menu = document.getElementById("user-menu");
    let dd = document.getElementById("user-dropdown");
    if (dd && menu && !menu.contains(e.target)) dd.style.display = "none";

    let modal = document.getElementById("modal-meta");
    if (modal && e.target === modal) fecharModal();
});

// ========================
// NAVEGAÇÃO DE MESES
// ========================
function atualizarNavMes() {
    let label = getMesNome(mesAtual, anoAtual);
    document.getElementById("nav-mes-label").textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

window.mesAnterior = function() {
    mesAtual--;
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    atualizarTudo();
};

// ✅ CORREÇÃO: removido o bloqueio que impedia navegar para meses futuros
window.mesProximo = function() {
    mesAtual++;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    atualizarTudo();
};

function atualizarTudo() {
    atualizarNavMes();
    atualizarHeader();
    atualizarLista();
    atualizarResumo();
    gerarCamposSimulacao();
    atualizarAnalise();
    atualizarMetas();
    document.getElementById("salario").value = getSalario() || "";
}

// ========================
// HEADER
// ========================
function atualizarHeader() {
    let mes = getMesNome(mesAtual, anoAtual);
    document.getElementById("header-mes").textContent = mes.charAt(0).toUpperCase() + mes.slice(1);
    let gastos = getGastos();
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let salario = getSalario();
    let saldo = salario - total;
    let badge = document.getElementById("header-saldo");
    badge.textContent = "Saldo: " + (saldo < 0 ? "-" : "") + fmt(saldo);
    let isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (saldo >= 0) {
        badge.style.color = isDark ? "#60a5fa" : "#1d4ed8";
        badge.style.borderColor = isDark ? "#1e3a5f" : "#c3d3f7";
        badge.style.background = isDark ? "#0d2137" : "#e8f0fe";
    } else {
        badge.style.color = "#f87171";
        badge.style.borderColor = "#3f0e0e";
        badge.style.background = "#1f0606";
    }
}

// ========================
// SALÁRIO
// ========================
window.salvarSalario = async function() {
    let val = Number(document.getElementById("salario").value);
    if (!val || val <= 0) return;
    let fixo = document.getElementById("salario-recorrente").checked;
    if (fixo) {
        cacheSalarios["fixo"] = val;
        await salvarConfig({ salarioFixo: val });
    } else {
        await salvarSalarioFirestore(mesAtual, anoAtual, val);
    }
    document.getElementById("sim-salario").value = val;
    showToast("toast-salario");
    atualizarHeader();
    atualizarResumo();
    atualizarAnalise();
};

// ========================
// CATEGORIA
// ========================
window.selecionarCategoria = function(e, cat) {
    document.getElementById("categoriaSelecionada").value = cat;
    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));
    e.currentTarget.classList.add("ativo");
    document.getElementById("erro-categoria").style.display = "none";
    document.getElementById("subcategoria-row").style.display = "block";
};

// ========================
// ADICIONAR GASTO
// ========================
window.adicionarGasto = function() {
    let desc = document.getElementById("descricao").value.trim();
    let valor = document.getElementById("valor").value;
    let categoria = document.getElementById("categoriaSelecionada").value;
    let subcategoria = document.getElementById("subcategoria").value.trim();
    let recorrente = document.getElementById("gasto-recorrente").checked;
    let limite = Number(document.getElementById("limite-alerta").value) || 0;
    if (limite > 0) salvarConfig({ limiteAlerta: limite });

    let ok = true;
    if (!categoria) { showErro("erro-categoria"); ok = false; }
    if (!desc || !valor || Number(valor) <= 0) { showErro("erro-campos"); ok = false; }
    if (!ok) return;

    let gastos = getGastos();
    gastos.push({ desc, valor: Number(valor), categoria, subcategoria, recorrente, id: Date.now() });
    setGastos(gastos);

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("categoriaSelecionada").value = "";
    document.getElementById("subcategoria").value = "";
    document.getElementById("gasto-recorrente").checked = false;
    document.getElementById("subcategoria-row").style.display = "none";
    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));

    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let limiteG = Number(document.getElementById("limite-alerta").value) || 0;
    if (limiteG > 0 && total >= limiteG) {
        showToast("global", `⚠️ Limite de ${fmt(limiteG)} atingido!`);
    } else {
        showToast("toast-gasto");
    }

    atualizarLista();
    atualizarResumo();
    atualizarAnalise();
    atualizarHeader();
};

// ========================
// LISTA
// ========================
function atualizarLista() {
    let lista = document.getElementById("lista");
    lista.innerHTML = "";
    let gastos = getGastos();
    if (gastos.length === 0) {
        lista.innerHTML = `<li style='text-align:center;color:var(--text-muted);font-size:13px;padding:14px 0;'>Nenhum gasto neste mês</li>`;
        return;
    }
    let sorted = [...gastos].sort((a, b) => (b.id || 0) - (a.id || 0));
    sorted.forEach(g => {
        let index = gastos.findIndex(x => x.id === g.id);
        let cor = CORES_ITEM[g.categoria] || "#94a3b8";
        let subLabel = g.subcategoria ? ` · ${g.subcategoria}` : "";
        let recLabel = g.recorrente ? `<span style='font-size:10px;color:#f59e0b;'>🔄</span>` : "";
        let item = document.createElement("li");
        item.innerHTML = `
            <div class="item">
                <div class="item-left">
                    <div class="item-dot" style="background:${cor};"></div>
                    <div>
                        <div class="item-nome">${g.desc}</div>
                        <div class="item-cat">${g.categoria}${subLabel} ${recLabel}</div>
                    </div>
                </div>
                <span class="item-valor" style="color:${cor};">${fmt(g.valor)}</span>
                <button class="btn btn-danger" onclick="removerGasto(${index})">✕</button>
            </div>`;
        lista.appendChild(item);
    });
}

window.removerGasto = function(index) {
    let gastos = getGastos();
    gastos.splice(index, 1);
    setGastos(gastos);
    atualizarLista();
    atualizarResumo();
    atualizarAnalise();
    atualizarHeader();
};

// ========================
// RESUMO
// ========================
function atualizarResumo() {
    let gastos = getGastos();
    let salario = getSalario();
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;
    let cats = {};
    gastos.forEach(g => { cats[g.categoria] = (cats[g.categoria] || 0) + g.valor; });
    let listaEl = document.getElementById("resumo-lista");
    listaEl.innerHTML = "";
    if (Object.keys(cats).length === 0) {
        listaEl.innerHTML = "<p class='empty-msg'>Nenhum gasto registrado</p>";
    } else {
        Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([cat, val]) => {
            let row = document.createElement("div");
            row.className = "resumo-row";
            row.innerHTML = `<span class="resumo-lbl">${cat}</span><span class="resumo-val">${fmt(val)}</span>`;
            listaEl.appendChild(row);
        });
    }
    let saldoEl = document.getElementById("saldo");
    saldoEl.textContent = (saldo < 0 ? "-" : "") + fmt(saldo);
    saldoEl.className = "saldo-val " + (saldo >= 0 ? "positivo" : "negativo");

    let limiteG = Number(document.getElementById("limite-alerta")?.value) || 0;
    let barraWrap = document.getElementById("barra-limite-wrap");
    if (limiteG > 0 && total > 0) {
        barraWrap.style.display = "block";
        let pct = Math.min((total / limiteG) * 100, 100);
        document.getElementById("barra-limite-txt").textContent = `Gasto: ${fmt(total)} / Limite: ${fmt(limiteG)}`;
        document.getElementById("barra-limite-pct").textContent = pct.toFixed(0) + "%";
        let fill = document.getElementById("barra-limite-fill");
        fill.style.width = pct + "%";
        fill.style.background = pct >= 100 ? "#f87171" : pct >= 80 ? "#f59e0b" : "#22c55e";
    } else {
        barraWrap.style.display = "none";
    }
}

// ========================
// METAS
// ========================
window.adicionarMeta = function() {
    document.getElementById("meta-nome").value = "";
    document.getElementById("meta-valor").value = "";
    document.getElementById("meta-atual").value = "";
    document.getElementById("meta-icone").value = "🎯";
    document.getElementById("modal-meta").style.display = "flex";
};

window.fecharModal = function() {
    document.getElementById("modal-meta").style.display = "none";
};

window.salvarMeta = async function() {
    let nome = document.getElementById("meta-nome").value.trim();
    let valor = Number(document.getElementById("meta-valor").value);
    let atual = Number(document.getElementById("meta-atual").value) || 0;
    let icone = document.getElementById("meta-icone").value.trim() || "🎯";
    if (!nome || !valor || valor <= 0) { showToast("global", "⚠️ Preencha nome e valor!"); return; }
    cacheMetas.push({ id: Date.now(), nome, valor, atual, icone });
    await salvarMetasFirestore();
    fecharModal();
    atualizarMetas();
    showToast("global", "✓ Meta criada!");
};

function atualizarMetas() {
    let lista = document.getElementById("metas-lista");
    lista.innerHTML = "";
    if (cacheMetas.length === 0) {
        lista.innerHTML = "<p class='empty-msg'>Nenhuma meta criada ainda.</p>";
        return;
    }
    cacheMetas.forEach((meta, i) => {
        let pct = Math.min((meta.atual / meta.valor) * 100, 100);
        let div = document.createElement("div");
        div.className = "meta-item";
        div.innerHTML = `
            <div class="meta-header">
                <span class="meta-icone">${meta.icone}</span>
                <span class="meta-nome">${meta.nome}</span>
                <button class="meta-btn-remove" onclick="removerMeta(${i})">✕</button>
            </div>
            <div class="meta-valores">
                <span class="meta-atual">${fmt(meta.atual)}</span>
                <span class="meta-total">/ ${fmt(meta.valor)}</span>
            </div>
            <div class="barra-meta-bg"><div class="barra-meta-fill" style="width:${pct}%;background:${pct>=100?"#f59e0b":"#22c55e"}"></div></div>
            <div class="meta-pct">${pct.toFixed(0)}% concluído</div>
            <div class="meta-edicao">
                <input type="number" id="meta-add-${i}" placeholder="Adicionar R$...">
                <button class="btn btn-primary" onclick="adicionarValorMeta(${i})">+ Depositar</button>
            </div>`;
        lista.appendChild(div);
    });
}

window.adicionarValorMeta = async function(i) {
    let val = Number(document.getElementById("meta-add-" + i).value);
    if (!val || val <= 0) return;
    cacheMetas[i].atual = Math.min(cacheMetas[i].atual + val, cacheMetas[i].valor);
    await salvarMetasFirestore();
    atualizarMetas();
    if (cacheMetas[i].atual >= cacheMetas[i].valor) showToast("global", `🎉 Meta "${cacheMetas[i].nome}" concluída!`);
    else showToast("global", `✓ ${fmt(val)} adicionado!`);
};

window.removerMeta = async function(i) {
    cacheMetas.splice(i, 1);
    await salvarMetasFirestore();
    atualizarMetas();
};

// ========================
// HISTÓRICO COMPLETO
// ========================
window.verHistorico = function(e) {
    if (e) e.stopPropagation();
    document.getElementById("user-dropdown").style.display = "none";
    let card = document.getElementById("card-historico");
    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth" });
    renderHistoricoCompleto();
};

window.fecharHistorico = function() {
    document.getElementById("card-historico").style.display = "none";
};

function renderHistoricoCompleto() {
    let lista = document.getElementById("historico-lista");
    lista.innerHTML = "";
    let chaves = Object.keys(cacheGastos).sort().reverse();
    if (chaves.length === 0) {
        lista.innerHTML = "<p class='empty-msg'>Nenhum histórico ainda.</p>";
        return;
    }
    chaves.forEach(chave => {
        let gastos = cacheGastos[chave] || [];
        if (gastos.length === 0) return;
        let [a, m] = chave.split("_");
        let nomeMes = new Date(Number(a), Number(m)-1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        let total = gastos.reduce((s, g) => s + g.valor, 0);
        let salario = cacheSalarios[chave] || 0;
        let saldo = salario - total;

        let secao = document.createElement("div");
        secao.className = "historico-secao";
        secao.innerHTML = `
            <div class="historico-mes-header">
                <span class="historico-mes-nome">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</span>
                <div class="historico-mes-vals">
                    <span style="color:#22c55e;">Sal: ${fmt(salario)}</span>
                    <span style="color:#f87171;">Gasto: ${fmt(total)}</span>
                    <span style="color:${saldo>=0?"#60a5fa":"#f87171"};">Saldo: ${(saldo<0?"-":"")+fmt(saldo)}</span>
                </div>
            </div>
            <div class="historico-gastos">
                ${gastos.map(g => {
                    let cor = CORES_ITEM[g.categoria] || "#94a3b8";
                    return `<div class="historico-item">
                        <div class="item-dot" style="background:${cor};margin-right:8px;flex-shrink:0;"></div>
                        <span style="flex:1;font-size:13px;">${g.desc} <span style="color:var(--text-muted);font-size:11px;">${g.categoria}</span></span>
                        <span style="font-size:13px;font-weight:700;color:${cor};">${fmt(g.valor)}</span>
                    </div>`;
                }).join("")}
            </div>`;
        lista.appendChild(secao);
    });
}

// ========================
// EXPORTAR
// ========================
window.exportarCSV = function() {
    let gastos = getGastos();
    let salario = getSalario();
    let mes = getMesNome(mesAtual, anoAtual);
    let linhas = ["Descrição,Categoria,Subcategoria,Valor,Recorrente"];
    gastos.forEach(g => {
        linhas.push(`"${g.desc}","${g.categoria}","${g.subcategoria||""}",${g.valor},"${g.recorrente?"Sim":"Não"}"`);
    });
    linhas.push(`"SALÁRIO","","",${salario},""`);
    let blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financas_${mes.replace(/ /g,"_")}.csv`;
    a.click();
    showToast("global", "✓ CSV exportado!");
};

window.exportarTudo = function(e) {
    if (e) e.stopPropagation();
    document.getElementById("user-dropdown").style.display = "none";
    let linhas = ["Mês,Descrição,Categoria,Valor"];
    Object.entries(cacheGastos).sort().forEach(([chave, gastos]) => {
        let [a, m] = chave.split("_");
        let nomeMes = new Date(Number(a), Number(m)-1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        gastos.forEach(g => {
            linhas.push(`"${nomeMes}","${g.desc}","${g.categoria}",${g.valor}`);
        });
    });
    let blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financas_completo_${usuarioAtual?.displayName||"dados"}.csv`;
    a.click();
    showToast("global", "✓ Todos os dados exportados!");
};

window.exportarPDF = function() {
    let gastos = getGastos();
    let salario = getSalario();
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;
    let mes = getMesNome(mesAtual, anoAtual);
    let cats = {};
    gastos.forEach(g => { cats[g.categoria] = (cats[g.categoria] || 0) + g.valor; });
    let linhas = gastos.map(g => `<tr><td>${g.desc}</td><td>${g.categoria}${g.subcategoria?" / "+g.subcategoria:""}</td><td style="text-align:right;font-weight:600;color:#dc2626;">${fmt(g.valor)}</td></tr>`).join("");
    let resumoCats = Object.entries(cats).map(([c,v]) => `<tr><td>${c}</td><td style="text-align:right;font-weight:600;">${fmt(v)}</td></tr>`).join("");
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Finanças - ${mes}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1a2740;max-width:700px;margin:auto;}h1{color:#1d4ed8;font-size:22px;margin-bottom:4px;}h2{color:#374151;font-size:15px;margin:20px 0 8px;}table{width:100%;border-collapse:collapse;font-size:13px;}th{background:#f0f4f8;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b829a;}td{padding:8px 10px;border-bottom:1px solid #e5eaf0;}.resumo{background:#f0f4f8;border-radius:10px;padding:16px;margin-top:16px;display:flex;gap:20px;flex-wrap:wrap;}.card-r{flex:1;min-width:120px;}.card-r label{font-size:11px;color:#6b829a;display:block;text-transform:uppercase;}.card-r span{font-size:18px;font-weight:800;}.verde{color:#16a34a;}.vermelho{color:#dc2626;}</style></head><body>
    <h1>💰 Minhas Finanças</h1><p style="color:#6b829a;font-size:13px;">${mes.charAt(0).toUpperCase()+mes.slice(1)} · ${usuarioAtual?.displayName||""}</p>
    <div class="resumo"><div class="card-r"><label>Salário</label><span>${fmt(salario)}</span></div><div class="card-r"><label>Total gasto</label><span class="vermelho">${fmt(total)}</span></div><div class="card-r"><label>Saldo</label><span class="${saldo>=0?"verde":"vermelho"}">${(saldo<0?"-":"")+fmt(saldo)}</span></div></div>
    <h2>Por categoria</h2><table><thead><tr><th>Categoria</th><th style="text-align:right;">Total</th></tr></thead><tbody>${resumoCats}</tbody></table>
    <h2>Todos os gastos</h2><table><thead><tr><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${linhas}</tbody></table>
    </body></html>`;
    let win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
};

// ========================
// ANÁLISE
// ========================
function atualizarAnalise() {
    try {
        let gastos = getGastos();
        let cats = {};
        gastos.forEach(g => { cats[g.categoria] = (cats[g.categoria] || 0) + g.valor; });
        document.querySelectorAll(".sim-fixo-input").forEach(inp => {
            let cat = inp.dataset.cat, val = parseFloat(inp.value) || 0;
            if (val > 0) cats[cat] = val;
        });
        let outrosLista = document.getElementById("outros-lista");
        if (outrosLista) {
            outrosLista.querySelectorAll(".outro-row").forEach(row => {
                let id = row.dataset.id;
                let nome = (document.getElementById("outro-nome-"+id)?.value||"").trim();
                let val = parseFloat(document.getElementById("outro-val-"+id)?.value)||0;
                if (nome && val > 0) cats[nome] = val;
            });
        }
        let labels = Object.keys(cats), valores = Object.values(cats);
        let total = valores.reduce((a,b)=>a+b,0);
        let simSal = parseFloat(document.getElementById("sim-salario")?.value)||getSalario()||0;
        let sobrou = simSal - total;
        let pct = simSal > 0 ? ((total/simSal)*100).toFixed(1) : 0;
        document.getElementById("an-salario").textContent = fmt(simSal);
        document.getElementById("an-total").textContent = fmt(total);
        document.getElementById("an-sobrou").textContent = (sobrou<0?"-":"")+fmt(sobrou);
        document.getElementById("an-pct").textContent = pct+"%";

        let isDark = document.documentElement.getAttribute("data-theme") === "dark";
        let gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
        let tickColor = isDark ? "#4b6080" : "#6b829a";

        if (labels.length === 0) {
            if (donutChart) { donutChart.destroy(); donutChart = null; }
            if (barraChart) { barraChart.destroy(); barraChart = null; }
            document.getElementById("legenda-donut").innerHTML = "<span style='color:var(--text-muted);font-size:12px;'>Adicione gastos para ver a análise</span>";
            document.getElementById("analise-alertas").textContent = "";
            renderHistorico(isDark, gridColor, tickColor);
            return;
        }
        let cores = labels.map((_,i) => CORES[i%CORES.length]);

        let ctxD = document.getElementById("graficoDonut").getContext("2d");
        if (donutChart) donutChart.destroy();
        donutChart = new Chart(ctxD, {
            type: "doughnut",
            data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 2, borderColor: isDark?"#111827":"#ffffff" }] },
            options: { responsive: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => " "+fmt(ctx.parsed) } } }, cutout: "65%" }
        });
        document.getElementById("legenda-donut").innerHTML = labels.map((l,i)=>`<div class="legenda-item"><div class="legenda-cor" style="background:${cores[i]}"></div><span>${l}</span></div>`).join("");

        let canvasBarra = document.getElementById("graficoBarra");
        canvasBarra.height = Math.max(180, labels.length*42+50);
        let ctxB = canvasBarra.getContext("2d");
        if (barraChart) barraChart.destroy();
        barraChart = new Chart(ctxB, {
            type: "bar",
            data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderRadius: 5, borderSkipped: false }] },
            options: { indexAxis: "y", responsive: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => " "+fmt(ctx.parsed.x) } } }, scales: { x: { ticks: { color: tickColor, font: { size: 10 }, callback: v=>"R$"+(v>=1000?(v/1000).toFixed(1)+"k":v) }, grid: { color: gridColor } }, y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } } } }
        });

        let alertas = [];
        labels.forEach((cat,i) => { let p = total>0?(valores[i]/total)*100:0; if(p>40) alertas.push(`⚠️ Muito gasto com ${cat} (${p.toFixed(0)}%)`); });
        let limiteG = Number(document.getElementById("limite-alerta")?.value)||0;
        if (limiteG>0 && total>=limiteG) alertas.push(`🔴 Limite de ${fmt(limiteG)} atingido!`);
        if (sobrou<0) alertas.push(`🔴 Gastos ultrapassam o salário em ${fmt(Math.abs(sobrou))}!`);
        if (pct>80 && pct<100) alertas.push(`🟡 ${pct}% do salário comprometido!`);
        if (alertas.length===0 && total>0) alertas.push("✅ Tudo equilibrado!");
        document.getElementById("analise-alertas").textContent = alertas.join("\n");
        renderHistorico(isDark, gridColor, tickColor);
    } catch(e) { console.error("Erro análise:", e); }
}

function renderHistorico(isDark, gridColor, tickColor) {
    let meses = [], totais = [], salarios = [];
    for (let i=5; i>=0; i--) {
        let m = mesAtual-i, a = anoAtual;
        while (m<0) { m+=12; a--; }
        let chave = getChaveMes(m,a);
        let gastos = cacheGastos[chave]||[];
        let total = gastos.reduce((s,g)=>s+g.valor,0);
        let sal = cacheSalarios[chave]||cacheSalarios["fixo"]||0;
        meses.push(new Date(a,m,1).toLocaleDateString("pt-BR",{month:"short"}));
        totais.push(total);
        salarios.push(sal);
    }
    let canvas = document.getElementById("graficoHistorico");
    canvas.style.width = "100%";
    let ctxH = canvas.getContext("2d");
    if (historicoChart) historicoChart.destroy();
    historicoChart = new Chart(ctxH, {
        type: "bar",
        data: { labels: meses, datasets: [
            { label: "Salário", data: salarios, backgroundColor: "rgba(96,165,250,0.2)", borderColor: "#60a5fa", borderWidth: 2, borderRadius: 5, type: "line", fill: true, tension: 0.4, pointBackgroundColor: "#60a5fa" },
            { label: "Gastos", data: totais, backgroundColor: CORES.slice(0,6), borderRadius: 5 }
        ]},
        options: { responsive: true, plugins: { legend: { labels: { color: tickColor, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => " "+fmt(ctx.parsed.y) } } }, scales: { x: { ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } }, y: { ticks: { color: tickColor, font: { size: 10 }, callback: v=>"R$"+(v>=1000?(v/1000).toFixed(0)+"k":v) }, grid: { color: gridColor } } } }
    });
}

// ========================
// SIMULAÇÃO
// ========================
function gerarCamposSimulacao() {
    let fixos = ["Casa","Aluguel","Carro","Consórcio","Alimentação"];
    let grid = document.getElementById("sim-fixos");
    grid.innerHTML = "";
    let gastos = getGastos();
    fixos.forEach(cat => {
        let valAtual = gastos.filter(g=>g.categoria===cat).reduce((s,g)=>s+g.valor,0);
        let div = document.createElement("div");
        div.className = "sim-field";
        div.innerHTML = `<label>${cat} (R$)</label><input type="number" class="sim-fixo-input" data-cat="${cat}" value="${valAtual||""}">`;
        grid.appendChild(div);
    });
    document.getElementById("sim-salario").value = getSalario()||"";
}

window.adicionarOutro = function(nome="", valor="") {
    let id = outroIdCounter++;
    let div = document.createElement("div");
    div.className = "outro-row";
    div.dataset.id = id;
    let opts = CATS_SUGERIDAS.map(c=>`<option value="${c}">`).join("");
    div.innerHTML = `<div><label>Categoria</label><input type="text" id="outro-nome-${id}" list="dl-${id}" placeholder="Ex: Alimentação" value="${nome}"><datalist id="dl-${id}">${opts}</datalist></div><div><label>Valor (R$)</label><input type="number" id="outro-val-${id}" placeholder="0" value="${valor}"></div><button class="btn-remover-outro" onclick="removerOutro(this)">✕</button>`;
    document.getElementById("outros-lista").appendChild(div);
};

window.removerOutro = function(btn) { btn.closest(".outro-row").remove(); atualizarAnalise(); };
window.atualizarAnalise = atualizarAnalise;

// ========================
// VIAGEM
// ========================
window.mostrarOpcoes = function() {
    let destino = document.getElementById("destino").value.trim();
    let dias = document.getElementById("dias").value;
    if (!destino || !dias) { showToast("global","⚠️ Preencha destino e dias!"); return; }
    document.getElementById("opcoes").style.display = "flex";
};

window.calcularViagem = function() {
    let mesesPlano = Number(document.getElementById("mesesPlano").value);
    let dias = Number(document.getElementById("dias").value)||1;
    let custoTotal = Number(document.getElementById("custo-viagem").value)||0;
    let gastos = getGastos();
    let total = gastos.reduce((s,g)=>s+g.valor,0);
    let sobra = getSalario()-total;
    let resultado = document.getElementById("resultado");
    let custoDiarioBox = document.getElementById("custo-diario-box");
    if (sobra<=0) { resultado.textContent = "😬 Sem saldo disponível para poupar."; return; }
    if (!mesesPlano||mesesPlano<=0) { resultado.textContent = "Informe em quantos meses quer viajar!"; return; }
    let linhas = [`💰 Você tem ${fmt(sobra)} sobrando por mês.`,`📅 Meta: viajar em ${mesesPlano} ${mesesPlano===1?"mês":"meses"}.`,`🎯 Guardar ${fmt(sobra/mesesPlano)}/mês`];
    if (custoTotal>0) {
        linhas.push(`💸 Custo estimado: ${fmt(custoTotal)} → ${Math.ceil(custoTotal/sobra)} meses guardando tudo.`);
        custoDiarioBox.style.display = "block";
        custoDiarioBox.textContent = `📆 Custo por dia: ${fmt(custoTotal/dias)}/dia (${dias} dias)`;
    } else custoDiarioBox.style.display = "none";
    resultado.textContent = linhas.join("\n");
};

window.buscarVoos = () => window.open(`https://www.skyscanner.com.br/transport/flights-to/${encodeURIComponent(document.getElementById("destino").value)}`);
window.buscarOnibus = () => window.open("https://www.clickbus.com.br");
window.buscarHotel = () => window.open(`https://www.booking.com/searchresults.pt-br.html?ss=${encodeURIComponent(document.getElementById("destino").value)}`);
