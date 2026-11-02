# Turing DApp

DApp de votação dos projetos finais da disciplina, baseada no token **Turing (TUR)**.
Desenvolvida a partir do [Hardhat Boilerplate](https://github.com/NomicFoundation/hardhat-boilerplate) (Atividade 12).

- **Contrato:** `contracts/Turing.sol`, um token **ERC-20** (OpenZeppelin) com estratégia *Uncapped Lazy Supply*
- **Frontend:** React + ethers.js + MetaMask
- **Blockchain:** Hardhat Network local (chain ID 31337)

---

## Como executar

Pré-requisitos: Node.js, Git e a extensão MetaMask no navegador.

```bash
git clone <URL_DESTE_REPOSITORIO>
cd turing-dapp
npm install
cd frontend && npm install && cd ..
```

São necessários **três terminais**:

**Terminal 1: blockchain local (manter aberto)**
```bash
npx hardhat node
```

**Terminal 2: deploy do contrato**
```bash
npx hardhat run scripts/deploy.js --network localhost
```
O script publica o contrato e grava o endereço e a ABI em `frontend/src/contracts/`.

**Terminal 3: frontend (manter aberto)**
```bash
cd frontend
npm run start
```
A dApp abre em `http://localhost:3000`.

### Configurando o MetaMask

1. Adicione a rede: RPC `http://127.0.0.1:8545/`, chain ID `31337`.
2. Importe as contas pelas chaves privadas exibidas no Terminal 1:
   - **Account #0:** owner (superusuário)
   - **Accounts #1 a #19:** alunos `nome1` a `nome19`
3. Sempre que reiniciar o `npx hardhat node`, refaça o deploy e use *Configurações → Avançado → Limpar dados da guia de atividades* no MetaMask (evita erro de *nonce*).

### Testes

```bash
npx hardhat test test/Turing.js
```

---

## O contrato

### Estado

| Variável | Descrição |
|---|---|
| `owner` | Conta que fez o deploy |
| `voting` | Votação ativa? Inicializada em `true` |
| `users` | `codinome → endereço` (pedido na especificação) |
| `codinomeOf` | `endereço → codinome` (mapa reverso, para identificar quem vota) |
| `codinomes` | Lista de todos os codinomes (mappings não são iteráveis) |
| `hasVote` | `votante → (alvo → bool)`: quem já votou em quem |
| `voteCount` | Quantos votos cada codinome já deu (para o bônus) |

### Funções

| Função | Quem pode | O que faz |
|---|---|---|
| `updateUser(codinome, addr)` | owner ou professora | Atualiza o endereço do codinome (o endereço antigo perde o acesso) |
| `votingOn()` | owner ou professora | `voting = true` |
| `votingOff()` | owner ou professora | `voting = false` |
| `issueToken(codinome, qtde)` | owner ou professora | Cria (*mint*) `qtde` Turings na carteira do codinome |
| `vote(codinome, qtde)` | usuários da tabela | Cria `qtde` Turings para o codinome votado; a cada 10 votos, o votante ganha 1 Turing |
| `getCodinomes()` | qualquer um (leitura) | Retorna a lista de codinomes (usada pelo frontend) |

A restrição "apenas owner ou professora" é implementada pelo modifier `onlyOwnerOrProfessora`, e "apenas usuários pré-autorizados" pelo modifier `onlyAuthorized`.

### Regras do `vote`

1. A votação deve estar ativa.
2. Só usuários pré-autorizados (da tabela).
3. Não é possível votar em si mesmo.
4. `0 < qtde ≤ 2` Turings.
5. Cada usuário vota uma única vez em cada codinome.

### Unidades

O Turing tem **18 casas decimais** (como ETH/wei): 1 TUR = 10¹⁸ unidades. Por isso o limite do voto é `2 * 10**decimals()` e o bônus é `10**decimals()`. O frontend converte os valores digitados com `parseUnits`/`formatUnits`.

---

## O frontend

| Arquivo | Responsabilidade |
|---|---|
| `Dapp.js` | Conexão com o MetaMask, identificação do usuário, envio de transações, ranking |
| `Vote.js` | Formulário de voto |
| `SuperUser.js` | Painel do superusuário: `issueToken`, `votingOn` e `votingOff` |
| `Ranking.js` | Tabela do ranking por saldo |

- **Interfaces diferentes:** usuários comuns veem só o formulário de voto; superusuários (owner ou professora) veem também o painel com `issueToken`, `votingOn` e `votingOff`.
- **Selects de codinome:** listam apenas alunos (a professora é excluída). No voto, o próprio usuário também é excluído.
- **Ranking por eventos:** os saldos são carregados uma vez ao conectar e, depois, atualizados a cada evento `Transfer` emitido pelo contrato (todo `_mint`, em `vote` e `issueToken`, emite `Transfer(0x0, destino, valor)`).
- **Erros:** a mensagem do `require` do contrato é exibida ao usuário (ex.: *"Already voted for this user"*).

---

## Decisões de projeto

- **ERC-20 via OpenZeppelin 4.9.6.** A versão 5.x exige Solidity ≥ 0.8.20, cujo bytecode padrão usa o opcode `PUSH0`, não suportado pelo Hardhat 2.12.5 do boilerplate.
- **Endereços em formato checksum (EIP-55)** no construtor, como o compilador Solidity exige.
- **Professora consultada dinamicamente** (`users["roberta"]`), de modo que um `updateUser` da professora atualiza também a sua permissão.
- **O owner local não vota.** Na blockchain local, o owner é a conta #0 do Hardhat, que não está na tabela de usuários. Pela regra "apenas usuários pré-autorizados", o contrato rejeita o voto dele com *"User not authorized"*. Em um deploy real, em que o owner é um aluno cadastrado, ele vota normalmente.
- **Professora nos testes:** o endereço da professora não pertence às contas do Hardhat. Nos testes, `updateUser("roberta", ...)` aponta o codinome para uma carteira de teste, validando as permissões de superusuário.
- **Requires extras:** `issueToken` e `vote` rejeitam codinomes inexistentes com *"User not found"*.
- **Checks-effects-interactions** no `vote`: `hasVote` é marcado antes do `_mint`.