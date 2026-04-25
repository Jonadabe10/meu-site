let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let salario = Number(localStorage.getItem("salario")) || 0;

// SALÁRIO
function salvarSalario() {
    salario = Number(document.getElementById("salario").value);
    localStorage.setItem("salario", salario);
    atualizarResumo();
}

// CATEGORIA
function selecionarCategoria(e, cat) {
    document.getElementById("categoriaSelecionada").value = cat;

    document.querySelectorAll(".card-cat").forEach(c => c.classList.remove("ativo"));
    e.currentTarget.classList.add("ativo");
}

// GASTOS
function adicionarGasto() {
    let desc = document.getElementById("descricao").value;
    let valor = document.getElementById("valor").value;
    let categoria = document.getElementById("categoriaSelecionada").value;

    if (!desc || !valor || !categoria) {
        alert("Preencha tudo!");
        return;
    }

    gastos.push({ desc, valor: Number(valor), categoria });
    localStorage.setItem("gastos", JSON.stringify(gastos));

    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";

    atualizarLista();
    atualizarResumo();
}

// LISTA
function atualizarLista() {
    let lista = document.getElementById("lista");
    lista.innerHTML = "";

    gastos.forEach((g, index) => {
        let item = document.createElement("li");

        item.innerHTML = `
            <div class="item">
                <div>
                    <span>${g.desc}</span><br>
                    <small>${g.categoria}</small>
                </div>
                <strong>R$ ${g.valor}</strong>
                <button onclick="removerGasto(${index})">❌</button>
            </div>
        `;

        lista.appendChild(item);
    });
}

function removerGasto(index) {
    gastos.splice(index, 1);
    localStorage.setItem("gastos", JSON.stringify(gastos));
    atualizarLista();
    atualizarResumo();
}

// RESUMO
function atualizarResumo() {
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let saldo = salario - total;

    document.getElementById("totalGastos").innerText = "Total: R$ " + total;

    let saldoEl = document.getElementById("saldo");
    saldoEl.innerText = "Saldo: R$ " + saldo;

    saldoEl.className = saldo >= 0 ? "positivo" : "negativo";
}

function mostrarResumo() {
    atualizarResumo();
}

// ANÁLISE
function analisarGastos() {
    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let categorias = {};
    let alerta = "";

    gastos.forEach(g => {
        categorias[g.categoria] = (categorias[g.categoria] || 0) + g.valor;
    });

    for (let cat in categorias) {
        let pct = (categorias[cat] / total) * 100;

        if (pct > 40) alerta += `⚠️ Muito gasto com ${cat}\n`;
        if (cat === "Outros" && pct > 20) alerta += `💡 Organize melhor "Outros"\n`;
    }

    if (!alerta) alerta = "✅ Tudo equilibrado";

    document.getElementById("analise").innerText = alerta;
}

// VIAGEM
function mostrarOpcoes() {
    let destino = document.getElementById("destino").value;
    let dias = document.getElementById("dias").value;

    if (!destino || !dias) return alert("Preencha!");

    document.getElementById("opcoes").style.display = "block";
}

function calcularViagem() {
    let dias = Number(document.getElementById("dias").value);
    let transporte = Number(document.getElementById("transporte").value);
    let hospedagem = Number(document.getElementById("hospedagem").value);
    let mesesPlano = Number(document.getElementById("mesesPlano").value);

    let custo = transporte + dias * hospedagem;

    let total = gastos.reduce((s, g) => s + g.valor, 0);
    let sobra = salario - total;

    if (sobra <= 0) {
        document.getElementById("resultado").innerText = "Sem economia 😬";
        return;
    }

    let meses = custo / sobra;
    let meta = mesesPlano ? custo / mesesPlano : 0;

    document.getElementById("resultado").innerText =
        `Custo: R$ ${custo}\nMeses: ${meses.toFixed(1)}\n` +
        (mesesPlano ? `Guardar: R$ ${meta.toFixed(2)}/mês` : "");
}

// LINKS
function buscarVoos() {
    let destino = document.getElementById("destino").value;
    window.open(`https://www.skyscanner.com.br/transport/flights-to/${destino}`);
}

function buscarOnibus() {
    let destino = document.getElementById("destino").value;
    window.open(`https://www.clickbus.com.br`);
}

function buscarHotel() {
    let destino = document.getElementById("destino").value;
    window.open(`https://www.booking.com/searchresults.pt-br.html?ss=${destino}`);
}

// INICIAR
atualizarLista();
atualizarResumo();