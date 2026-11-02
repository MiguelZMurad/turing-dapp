import React from "react";

// Painel exclusivo dos superusuários (owner e professora).
// Props:
//   codinomes: alunos que podem receber Turings (já sem a professora)
//   voting: estado atual da votação
//   issueToken(codinome, qtde), votingOn(), votingOff(): funções do Dapp
export function SuperUser({ codinomes, voting, issueToken, votingOn, votingOff }) {
  return (
    <div>
      <h4>Painel do superusuário</h4>

      {/* ---------- votingOn / votingOff ---------- */}
      <div className="mb-4">
        <label className="d-block">Controle da votação</label>
        <button
          className="btn btn-success mr-2"
          onClick={() => votingOn()}
          disabled={voting}
        >
          Ativar votação
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => votingOff()}
          disabled={!voting}
        >
          Pausar votação
        </button>
      </div>

      {/* ---------- issueToken ---------- */}
      <h5>Emitir Turings (issueToken)</h5>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.target);
          const codinome = formData.get("codinome");
          const qtde = formData.get("qtde");

          if (codinome && qtde) {
            issueToken(codinome, qtde);
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
          <label>Quantidade de Turings</label>
          <input
            className="form-control"
            type="number"
            step="any"
            min="0"
            name="qtde"
            placeholder="Ex.: 10"
            required
          />
        </div>

        <div className="form-group">
          <input className="btn btn-warning" type="submit" value="Emitir" />
        </div>
      </form>
    </div>
  );
}