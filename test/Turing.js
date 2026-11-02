const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const T = (n) => ethers.utils.parseUnits(String(n), 18); // Converte Turings para unidades de 18 casas

describe("Turing contract", function () {
  async function deployTuringFixture() {
    const signers = await ethers.getSigners(); // pega as contas
    const owner = signers[0]; // quem fez o deploy
    const nome = (i) => signers[i]; // atalho
    const Turing = await ethers.getContractFactory("Turing");
    const turing = await Turing.deploy();
    await turing.deployed();

    return { turing, owner, nome, signers };
  }

  // criamos uma carteira aleatoria, damos ETH para pagar o gas 
  // e apontamos "roberta" para ela.
  async function professoraFixture() {
    const base = await deployTuringFixture();
    const professora = ethers.Wallet.createRandom().connect(ethers.provider); // carteira aleatoria
    await base.owner.sendTransaction({ to: professora.address, value: T(1) }); // ETH para pagar gas
    await base.turing.updateUser("roberta", professora.address); //
    return { ...base, professora };
  }

  // CONSTRUCTOR
  describe("Deployment", function () {
    it("Should set name, symbol and owner", async function () {
      const { turing, owner } = await loadFixture(deployTuringFixture);
      expect(await turing.name()).to.equal("Turing");
      expect(await turing.symbol()).to.equal("TUR");
      expect(await turing.owner()).to.equal(owner.address);
    });

    it("Should start with zero supply (no minting in constructor)", async function () {
      const { turing, owner } = await loadFixture(deployTuringFixture);
      expect(await turing.totalSupply()).to.equal(0);
      expect(await turing.balanceOf(owner.address)).to.equal(0);
    });

    it("Should initialize the users mapping with the table", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      expect(await turing.users("roberta")).to.equal(
        "0x502542668aF09fa7aea52174b9965A7799343Df7"
      );
      expect(await turing.users("nome1")).to.equal(nome(1).address);
      expect(await turing.users("nome19")).to.equal(nome(19).address);
    });

    it("Should start with voting on", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      expect(await turing.voting()).to.equal(true);
    });

    it("Should return all 20 codinomes", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      const lista = await turing.getCodinomes();
      expect(lista.length).to.equal(20);
      expect(lista[0]).to.equal("roberta");
      expect(lista[19]).to.equal("nome19");
    });
  });


  // UPDATEUSER
  describe("updateUser", function () {
    it("Should let the owner update a user's address", async function () {
      const { turing, signers } = await loadFixture(deployTuringFixture);
      const novo = signers[19].address;
      await turing.updateUser("nome1", novo);
      expect(await turing.users("nome1")).to.equal(novo);
    });

    it("Should let the professora update a user's address", async function () {
      const { turing, professora, nome } = await loadFixture(professoraFixture);
      const novo = ethers.Wallet.createRandom().address;
      await turing.connect(professora).updateUser("nome1", novo);
      expect(await turing.users("nome1")).to.equal(novo);
    });

    it("Should fail if caller is not owner or professora", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(
        turing.connect(nome(1)).updateUser("nome2", nome(1).address)
      ).to.be.revertedWith("Only owner or professora");
    });

    it("Should fail if codinome is empty", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(
        turing.updateUser("", nome(1).address)
      ).to.be.revertedWith("Codinome cannot be empty");
    });

    it("Should remove authorization from the old address", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      const novo = ethers.Wallet.createRandom().address;
      await turing.updateUser("nome1", novo);
      await turing.votingOn();

      // o endereco antigo do nome1 n pode mais votar
      await expect(
        turing.connect(nome(1)).vote("nome2", T(1))
      ).to.be.revertedWith("User not authorized");
    });

    it("Should not change the voting state", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await turing.votingOff();
      await turing.updateUser("nome1", nome(1).address);
      expect(await turing.voting()).to.equal(false);
    });
  });


  // VOTING ON / VOTING OFF
  describe("votingOn / votingOff", function () {
    it("Should let the owner turn voting on and off", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      await turing.votingOn();
      expect(await turing.voting()).to.equal(true);
      await turing.votingOff();
      expect(await turing.voting()).to.equal(false);
    });

    it("Should let the professora turn voting on and off", async function () {
      const { turing, professora } = await loadFixture(professoraFixture);
      await turing.connect(professora).votingOn();
      expect(await turing.voting()).to.equal(true);
      await turing.connect(professora).votingOff();
      expect(await turing.voting()).to.equal(false);
    });

    it("Should fail if a common user calls votingOn", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(
        turing.connect(nome(1)).votingOn()
      ).to.be.revertedWith("Only owner or professora");
    });

    it("Should fail if a common user calls votingOff", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await turing.votingOn();
      await expect(
        turing.connect(nome(1)).votingOff()
      ).to.be.revertedWith("Only owner or professora");
    });
  });


  // ISSUE TOKEN
  describe("issueToken", function () {
    it("Should mint Turings to the codinome's wallet", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(
        turing.issueToken("nome3", T(5))
      ).to.changeTokenBalance(turing, nome(3), T(5));
      expect(await turing.totalSupply()).to.equal(T(5)); // supply cresce sob demanda
    });

    it("Should let the professora issue tokens", async function () {
      const { turing, professora, nome } = await loadFixture(professoraFixture);
      await expect(
        turing.connect(professora).issueToken("nome3", T(2))
      ).to.changeTokenBalance(turing, nome(3), T(2));
    });

    it("Should emit a Transfer event from the zero address", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(turing.issueToken("nome3", T(5)))
        .to.emit(turing, "Transfer")
        .withArgs(ethers.constants.AddressZero, nome(3).address, T(5));
    });

    it("Should fail if caller is not owner or professora", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(
        turing.connect(nome(1)).issueToken("nome1", T(100))
      ).to.be.revertedWith("Only owner or professora");
    });

    it("Should fail if codinome does not exist", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      await expect(
        turing.issueToken("fulano", T(1))
      ).to.be.revertedWith("User not found");
    });
  });


  // VOTE
  describe("vote", function () {
    // deploy + votacao ja ligada
    async function votingFixture() {
      const base = await deployTuringFixture();
      await base.turing.votingOn();
      return base;
    }

    it("Should mint Turings to the voted codinome", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await expect(
        turing.connect(nome(1)).vote("nome2", T(1.5))
      ).to.changeTokenBalance(turing, nome(2), T(1.5));
      expect(await turing.hasVote("nome1", "nome2")).to.equal(true);
    });

    it("Should accept exactly 2 Turings (upper limit)", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await expect(
        turing.connect(nome(1)).vote("nome2", T(2))
      ).to.changeTokenBalance(turing, nome(2), T(2));
    });

    // 1: votação ativa
    it("Should fail after votingOff", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await turing.votingOff();
      await expect(
        turing.connect(nome(1)).vote("nome2", T(1))
      ).to.be.revertedWith("Voting is not active");
    });

    // 2: apenas pre-autorizados
    it("Should fail if caller is not a pre-authorized user (owner)", async function () {
      const { turing, owner } = await loadFixture(votingFixture);
      await expect(
        turing.connect(owner).vote("nome2", T(1))
      ).to.be.revertedWith("User not authorized");
    });

    // 3: nao votar em si mesmo
    it("Should fail if user votes for himself", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await expect(
        turing.connect(nome(1)).vote("nome1", T(1))
      ).to.be.revertedWith("Cannot vote for yourself");
    });

    // 4: 0 < qtde <= 2
    it("Should fail if amount is zero", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await expect(
        turing.connect(nome(1)).vote("nome2", 0)
      ).to.be.revertedWith("Amount must be > 0 and <= 2 Turings");
    });

    it("Should fail if amount is greater than 2 Turings", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      // 2 Turings + 1 unidade: o menor valor acima do limite
      await expect(
        turing.connect(nome(1)).vote("nome2", T(2).add(1))
      ).to.be.revertedWith("Amount must be > 0 and <= 2 Turings");
    });

    // 5: uma vez por codinome
    it("Should fail if user votes twice for the same codinome", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await turing.connect(nome(1)).vote("nome2", T(1));
      await expect(
        turing.connect(nome(1)).vote("nome2", T(1))
      ).to.be.revertedWith("Already voted for this user");
    });

    it("Should allow different users to vote for the same codinome", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await turing.connect(nome(1)).vote("nome3", T(1));
      await turing.connect(nome(2)).vote("nome3", T(1));
      expect(await turing.balanceOf(nome(3).address)).to.equal(T(2));
    });

    it("Should fail if voted codinome does not exist", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      await expect(
        turing.connect(nome(1)).vote("fulano", T(1))
      ).to.be.revertedWith("User not found");
    });

    // Bonus: a cada 10 votos, +1 Turing para quem votou
    it("Should give 1 Turing to the voter on every 10th vote", async function () {
      const { turing, nome } = await loadFixture(votingFixture);
      const votante = nome(1);

      // 9 votos (nome2 ... nome10): ainda sem bonus
      for (let i = 2; i <= 10; i++) {
        await turing.connect(votante).vote(`nome${i}`, T(1));
      }
      expect(await turing.balanceOf(votante.address)).to.equal(0);
      expect(await turing.voteCount("nome1")).to.equal(9);

      // 10º voto (nome11): ganha 1 Turing
      await expect(
        turing.connect(votante).vote("nome11", T(1))
      ).to.changeTokenBalance(turing, votante, T(1));
      expect(await turing.voteCount("nome1")).to.equal(10);

      // 11º voto (nome12): sem bonus
      await expect(
        turing.connect(votante).vote("nome12", T(1))
      ).to.changeTokenBalance(turing, votante, 0);
    });
  });
});