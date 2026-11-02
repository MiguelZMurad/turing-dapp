import React from "react";
import { ethers } from "ethers";

// Gerados pelo scripts/deploy.js
import TuringArtifact from "../contracts/Turing.json";
import contractAddress from "../contracts/contract-address.json";

// Componentes reaproveitados do boilerplate (Atividade 12)
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

// Componentes novos do Turing
import { Vote } from "./Vote";
import { SuperUser } from "./SuperUser";
import { Ranking } from "./Ranking";

// Rede local do Hardhat: chainId 31337 = 0x7a69 em hexadecimal
const HARDHAT_CHAIN_ID = "0x7a69";

// Codinome da professora no contrato
const PROFESSORA = "roberta";

// Código de erro quando o usuário clica em "Rejeitar" no MetaMask
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      // Dados fixos do token
      tokenData: undefined,      // { name, symbol }
      codinomes: [],             // todos os codinomes do contrato

      // Quem está conectado
      selectedAddress: undefined,
      codinome: undefined,       // "" se o endereço não está no mapping
      isSuper: false,            // owner ou professora

      // Dados que mudam (atualizados por polling)
      balance: undefined,
      voting: undefined,

      // Ranking (atualizado por eventos)
      ranking: undefined,        // { codinome: saldo }
      lastEvent: undefined,      // último Transfer recebido

      // Transações
      txBeingSent: undefined,    // hash da transação aguardando mineração
      transactionError: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    // 1. Sem MetaMask instalado
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // 2. Carteira ainda não conectada
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // 3. Conectada, mas dados do contrato ainda carregando
    if (
      !this.state.tokenData ||
      this.state.balance === undefined ||
      this.state.codinome === undefined
    ) {
      return <Loading />;
    }

    const {
      tokenData, codinomes, selectedAddress, codinome, isSuper,
      balance, voting, txBeingSent, transactionError, ranking, lastEvent,
    } = this.state;
    const autorizado = codinome !== "";

    // Alunos = todos os codinomes menos a professora (exigência do PDF)
    const alunos = codinomes.filter((c) => c !== PROFESSORA);

    // Para votar, também tiramos o próprio usuário (não pode votar em si mesmo)
    const alunosParaVoto = alunos.filter((c) => c !== codinome);

    // 4. Tela principal
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              {tokenData.name} ({tokenData.symbol}) — Votação
            </h1>

            <p>
              Conectado como{" "}
              <b>{autorizado ? codinome : "(sem codinome)"}</b>{" "}
              <small className="text-muted">{selectedAddress}</small>{" "}
              {isSuper ? (
                <span className="badge badge-warning">Superusuário</span>
              ) : autorizado ? (
                <span className="badge badge-info">Usuário comum</span>
              ) : null}
            </p>

            <p>
              Saldo:{" "}
              <b>
                {ethers.utils.formatUnits(balance, 18)} {tokenData.symbol}
              </b>
            </p>

            <p>
              Votação:{" "}
              {voting ? (
                <span className="badge badge-success">ATIVA</span>
              ) : (
                <span className="badge badge-secondary">PAUSADA</span>
              )}
            </p>
          </div>
        </div>

        <hr />

        {/* Mensagens de transação */}
        <div className="row">
          <div className="col-12">
            {txBeingSent && <WaitingForTransactionMessage txHash={txBeingSent} />}
            {transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>

        {/* Endereço fora da tabela e que não é owner: sem acesso */}
        {!autorizado && !isSuper && (
          <div className="alert alert-danger">
            Este endereço não está autorizado a usar o contrato Turing.
          </div>
        )}

        <div className="row">
          {/* Votar: usuários comuns e superusuários */}
          {(autorizado || isSuper) && (
            <div className="col-md-6">
              <Vote
                codinomes={alunosParaVoto}
                voting={voting}
                vote={(c, qtde) => this._vote(c, qtde)}
              />
            </div>
          )}

          {/* Painel extra: só superusuários (owner ou professora) */}
          {isSuper && (
            <div className="col-md-6">
              <SuperUser
                codinomes={alunos}
                voting={voting}
                issueToken={(c, qtde) => this._issueToken(c, qtde)}
                votingOn={() => this._votingOn()}
                votingOff={() => this._votingOff()}
              />
            </div>
          )}
        </div>

        <hr />

        {/* Ranking: visível para todos */}
        <div className="row">
          <div className="col-md-6">
            <Ranking
              ranking={ranking}
              meuCodinome={codinome}
              lastEvent={lastEvent}
              symbol={tokenData.symbol}
            />
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    this._stopPollingData();
  }

  // ------------------------------------------------------------------
  // Conexão com a carteira
  // ------------------------------------------------------------------
  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Garante que o MetaMask está na rede local do Hardhat
    const ok = await this._checkNetwork();
    if (!ok) return;

    this._initialize(selectedAddress);

    // Trocou de conta no MetaMask: recarrega tudo para a conta nova
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      if (newAddress === undefined) {
        return this._resetState();
      }
      this._initialize(newAddress);
    });

    // Trocou de rede: volta para a tela inicial
    window.ethereum.on("chainChanged", () => {
      this._stopPollingData();
      this._resetState();
    });
  }

  async _initialize(userAddress) {
    this.setState({
      ...this.initialState,
      selectedAddress: userAddress,
    });

    this._initializeEthers();
    const codinomes = await this._getTokenData();
    await this._identifyUser(userAddress);
    this._startPollingData();

    // Ranking: carga inicial + escuta de eventos
    await this._loadRanking(codinomes);
    this._listenToTransferEvents();
  }

  _initializeEthers() {
    // Se havia um contrato anterior (ex.: troca de conta), para de escutar eventos dele
    this._stopListeningEvents();

    this._provider = new ethers.providers.Web3Provider(window.ethereum);
    this._provider.pollingInterval = 1000; // checa eventos novos a cada 1 s

    // Contrato conectado ao signer: as transações saem da conta do MetaMask
    this._turing = new ethers.Contract(
      contractAddress.Turing,
      TuringArtifact.abi,
      this._provider.getSigner(0)
    );
  }

  // ------------------------------------------------------------------
  // Leitura de dados do contrato
  // ------------------------------------------------------------------
  async _getTokenData() {
    const name = await this._turing.name();
    const symbol = await this._turing.symbol();
    const codinomes = await this._turing.getCodinomes();
    this.setState({ tokenData: { name, symbol }, codinomes });
    return codinomes;
  }

  // Descobre se o endereço é aluno, professora, owner ou ninguém
  async _identifyUser(address) {
    const codinome = await this._turing.codinomeOf(address);
    const owner = await this._turing.owner();
    const professora = await this._turing.users(PROFESSORA);

    const addr = address.toLowerCase();
    const isSuper =
      addr === owner.toLowerCase() || addr === professora.toLowerCase();

    this.setState({ codinome, isSuper });
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateData(), 1000);
    this._updateData();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
    this._stopListeningEvents();
  }

  async _updateData() {
    const balance = await this._turing.balanceOf(this.state.selectedAddress);
    const voting = await this._turing.voting();
    this.setState({ balance, voting });
  }

  // ------------------------------------------------------------------
  // Ranking por eventos
  // ------------------------------------------------------------------

  // Carga inicial: um balanceOf por aluno (só uma vez, ao conectar)
  async _loadRanking(codinomes) {
    const alunos = codinomes.filter((c) => c !== PROFESSORA);

    this._addrToCodinome = {}; // endereço (minúsculo) -> codinome
    const ranking = {};

    await Promise.all(
      alunos.map(async (c) => {
        const addr = await this._turing.users(c);
        this._addrToCodinome[addr.toLowerCase()] = c;
        ranking[c] = await this._turing.balanceOf(addr);
      })
    );

    this.setState({ ranking });
  }

  // A cada evento Transfer emitido pelo contrato, atualiza só quem foi afetado.
  // _mint (em vote e issueToken) emite Transfer(0x0, destino, valor).
  _listenToTransferEvents() {
    this._turing.on("Transfer", async (from, to, value) => {
      const nomeDe =
        from === ethers.constants.AddressZero
          ? "mint"
          : this._addrToCodinome[from.toLowerCase()] || from;
      const nomePara = this._addrToCodinome[to.toLowerCase()] || to;

      // Relê o saldo de quem participou do evento (de e/ou para)
      const ranking = { ...this.state.ranking };
      for (const addr of [from, to]) {
        const c = this._addrToCodinome[addr.toLowerCase()];
        if (c) {
          ranking[c] = await this._turing.balanceOf(addr);
        }
      }

      this.setState({
        ranking,
        lastEvent: {
          de: nomeDe,
          para: nomePara,
          valor: ethers.utils.formatUnits(value, 18),
        },
      });
    });
  }

  _stopListeningEvents() {
    if (this._turing) {
      this._turing.removeAllListeners("Transfer");
    }
  }

  // ------------------------------------------------------------------
  // Transações
  // ------------------------------------------------------------------

  // Envia qualquer transação e cuida das mensagens de espera/erro.
  // Recebe uma função que devolve a transação (ex.: () => contrato.vote(...)).
  // Será reaproveitada na etapa 5c (issueToken, votingOn, votingOff).
  async _sendTransaction(sendFn) {
    try {
      this._dismissTransactionError();

      const tx = await sendFn();            // MetaMask abre aqui
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();      // espera a mineração
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateData();
    } catch (error) {
      // Usuário clicou em "Rejeitar" no MetaMask: não é erro
      if (
        error.code === ERROR_CODE_TX_REJECTED_BY_USER ||
        error.code === "ACTION_REJECTED"
      ) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }

  async _vote(codinome, qtde) {
    // "1.5" Turings -> 1500000000000000000 unidades (18 casas)
    const amount = ethers.utils.parseUnits(qtde, 18);
    await this._sendTransaction(() => this._turing.vote(codinome, amount));
  }

  async _issueToken(codinome, qtde) {
    const amount = ethers.utils.parseUnits(qtde, 18);
    await this._sendTransaction(() => this._turing.issueToken(codinome, amount));
  }

  async _votingOn() {
    await this._sendTransaction(() => this._turing.votingOn());
  }

  async _votingOff() {
    await this._sendTransaction(() => this._turing.votingOff());
  }

  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // Extrai a mensagem do require do contrato (ex.: "Cannot vote for yourself")
  _getRpcErrorMessage(error) {
    const msg =
      error?.error?.data?.message ||
      error?.data?.message ||
      error?.error?.message ||
      error?.reason ||
      error?.message ||
      String(error);

    const match = msg.match(/reverted with reason string '([^']+)'/);
    return match ? match[1] : msg;
  }

  // ------------------------------------------------------------------
  // Rede
  // ------------------------------------------------------------------
  async _checkNetwork() {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId === HARDHAT_CHAIN_ID) return true;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
      return true;
    } catch (error) {
      this.setState({
        networkError:
          "Selecione a rede local do Hardhat (chain ID 31337) no MetaMask.",
      });
      return false;
    }
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _resetState() {
    this.setState(this.initialState);
  }
}