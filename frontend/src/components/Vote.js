import React from "react";

// Formulário de votação.
// Props:
//   codinomes: lista de codinomes que podem receber voto (já sem a professora)
//   vote(codinome, qtde): função do Dapp que envia a transação
//   voting: estado da votação (true/false), só para avisar o usuário
export function Vote({ codinomes, vote, voting }) {
  return (
    <div>
      <h4>Votar</h4>

      {!voting && (
        <div className="alert alert-secondary">
          A votação está pausada. O contrato vai rejeitar votos até ela ser
          ativada.
        </div>
      )}

      <form
        onSubmit={(event) => {
          // Impede o navegador de recarregar a página
          event.preventDefault();

          const formData = new FormData(event.target);
          const codinome = formData.get("codinome");
          const qtde = formData.get("qtde");

          if (codinome && qtde) {
            vote(codinome, qtde);
          }
        }}
      >
        <div className="form-group">
          <label>Codinome</label>
          <select className="form-control" name="codinome" required>
            <option value="">Selecione um aluno...</option>
            {codinomes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quantidade de Turings (maior que 0 e até 2)</label>
          <input
            className="form-control"
            type="number"
            step="0.01"
            min="0.01"
            max="2"
            name="qtde"
            placeholder="Ex.: 1.5"
            required
          />
        </div>

        <div className="form-group">
          <input className="btn btn-primary" type="submit" value="Votar" />
        </div>
      </form>
    </div>
  );
}