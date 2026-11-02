import React from "react";
import { ethers } from "ethers";

// Ranking dos alunos por saldo de Turings.
// Props:
//   ranking: objeto { codinome: BigNumber (saldo em unidades de 18 casas) }
//   meuCodinome: codinome do usuário conectado (para destacar a linha)
//   lastEvent: último evento Transfer recebido { de, para, valor }
//   symbol: símbolo do token ("TUR")
export function Ranking({ ranking, meuCodinome, lastEvent, symbol }) {
  if (!ranking) {
    return <p>Carregando ranking...</p>;
  }

  // Ordena do maior saldo para o menor; empate: ordem alfabética
  const linhas = Object.entries(ranking).sort(([nomeA, a], [nomeB, b]) => {
    if (b.gt(a)) return 1;
    if (b.lt(a)) return -1;
    return nomeA.localeCompare(nomeB, undefined, { numeric: true });
  });

  return (
    <div>
      <h4>Ranking</h4>

      {lastEvent && (
        <p className="text-muted small">
          Último evento Transfer: <b>{lastEvent.de}</b> → <b>{lastEvent.para}</b>{" "}
          ({lastEvent.valor} {symbol})
        </p>
      )}

      <table className="table table-sm table-striped">
        <thead>
          <tr>
            <th>#</th>
            <th>Codinome</th>
            <th className="text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(([codinome, saldo], i) => (
            <tr
              key={codinome}
              className={codinome === meuCodinome ? "table-primary" : ""}
            >
              <td>{i + 1}</td>
              <td>{codinome}</td>
              <td className="text-right">
                {ethers.utils.formatUnits(saldo, 18)} {symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}