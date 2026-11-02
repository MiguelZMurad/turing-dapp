# Turing DApp — Frontend

Frontend em React da Turing DApp. Usa ethers.js para falar com o contrato `Turing` e o MetaMask para assinar as transações.

As instruções completas de execução e a explicação do projeto estão no [README principal](../README.md).

## Executar

Com a blockchain local rodando e o contrato publicado (ver README principal):

    npm install
    npm run start

A dApp abre em `http://localhost:3000`.

## Componentes (`src/components/`)

| Arquivo | Responsabilidade |
|---|---|
| `Dapp.js` | Conexão com o MetaMask, identificação do usuário, envio de transações e ranking |
| `Vote.js` | Formulário de voto |
| `SuperUser.js` | Painel do superusuário: `issueToken`, `votingOn` e `votingOff` |
| `Ranking.js` | Tabela do ranking por saldo, atualizada por eventos `Transfer` |

Os arquivos de `src/contracts/` (`contract-address.json` e `Turing.json`) são gerados automaticamente pelo `scripts/deploy.js`.