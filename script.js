let gastos = JSON.parse(localStorage.getItem("gastos")) || [];
let salario = Number(localStorage.getItem("salario")) || 0;

// SALÁRIO
function salvarSalario() {
    salario = Number(document.getElementById("salario").value);
    localStorage.setItem("salario", salario);
    atualizarResumo();
}

// GASTOS
function adicionarGasto() {
    let desc = document.getElementById("descricao").value;
    let valor = document.getElementById("valor").value;
    let categoria = document.getElementById("categoria").value;

    if (!desc || !valor) {
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
    let total = gastos.reduce((soma, g) => soma + g.valor, 0);
    let saldo = salario - total;

    document.getElementById("totalGastos").innerText = "Total gasto: R$ " + total;

    let saldoEl = document.getElementById("saldo");
    saldoEl.innerText = "Saldo: R$ " + saldo;

    saldoEl.classList.remove("positivo", "negativo");
    saldoEl.classList.add(saldo >= 0 ? "positivo" : "negativo");
}

function mostrarResumo() {
    atualizarResumo();
}

// ANÁLISE INTELIGENTE
function analisarGastos() {
    let total = gastos.reduce((soma, g) => soma + g.valor, 0);
    let categorias = {};
    let alerta = "";

    gastos.forEach(g => {
        categorias[g.categoria] = (categorias[g.categoria] || 0) + g.valor;
    });

    for (let cat in categorias) {
        let porcentagem = (categorias[cat] / total) * 100;

        if (porcentagem > 40) {
            alerta += `⚠️ Muito gasto com ${cat} (${porcentagem.toFixed(1)}%)\n`;
        }

        if (cat === "Outros" && porcentagem > 20) {
            alerta += `💡 Muitos gastos em "Outros". Organize melhor.\n`;
        }

        if (cat === "Carro" && porcentagem > 30) {
            alerta += `🚗 Carro está alto. Considere reduzir custos.\n`;
        }
    }

    if (alerta === "") {
        alerta = "✅ Seus gastos estão equilibrados!";
    }

    document.getElementById("analise").innerText = alerta;
}

// VIAGEM
function mostrarOpcoes() {
    let destino = document.getElementById("destino").value;
    let dias = document.getElementById("dias").value;

    if (!destino || !dias) {
        alert("Preencha destino e dias!");
        return;
    }

    document.getElementById("opcoes").style.display = "block";
}

function calcularViagem() {
    let destino = document.getElementById("destino").value;
    let dias = Number(document.getElementById("dias").value);
    let transporte = Number(document.getElementById("transporte").value);
    let hospedagem = Number(document.getElementById("hospedagem").value);
    let mesesPlano = Number(document.getElementById("mesesPlano").value);

    let custo = transporte + (dias * hospedagem);
    let totalGastos = gastos.reduce((s, g) => s + g.valor, 0);
    let sobra = salario - totalGastos;

    if (sobra <= 0) {
        document.getElementById("resultado").innerText =
            "Você não consegue economizar atualmente 😬";
        return;
    }

    let meses = custo / sobra;
    let meta = mesesPlano > 0 ? custo / mesesPlano : 0;

    document.getElementById("resultado").innerText =
        `Viagem para ${destino}\nCusto: R$ ${custo}\n\n` +
        `Sobra mensal: R$ ${sobra}\n` +
        `Tempo necessário: ${meses.toFixed(1)} meses\n\n` +
        (mesesPlano > 0
            ? `Para viajar em ${mesesPlano} meses: R$ ${meta.toFixed(2)}/mês`
            : "");
}

// LINKS
function buscarVoos() {
    let destino = encodeURIComponent(document.getElementById("destino").value);
    window.open(`https://www.skyscanner.com.br/transport/flights-to/${destino}`, "_blank");
}

function buscarOnibus() {
    let destino = encodeURIComponent(document.getElementById("destino").value);
    window.open(`https://www.clickbus.com.br/busca/${destino}`, "_blank");
}

function buscarHotel() {
    let destino = encodeURIComponent(document.getElementById("destino").value);
    window.open(`https://www.booking.com/searchresults.pt-br.html?ss=${destino}`, "_blank");
}

// INICIAR
atualizarLista();
atualizarResumo();
