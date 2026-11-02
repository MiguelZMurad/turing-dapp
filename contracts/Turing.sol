// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Turing is ERC20 {
    // Variaveis de Estado
    address public owner; // quem fez o deploy
    string private constant PROFESSORA = "roberta";
    bool public voting = true;  // votação ativa?
    mapping(string => address) public users; // codinome -> endereco
    mapping(address => string) public codinomeOf; // endereço -> codinome (pra n poder votar em si mesmo)
    string[] public codinomes; // lista de todos os codinomes
    mapping(string => mapping(string => bool)) public hasVote; // quem votou em quem (pra n poder votar duas vezes no msm codinome)
    mapping(string => uint256) public voteCount; // quantos votos cada codinome ja deu (para o bonus a cada 10)


    constructor() ERC20("Turing", "TUR") {
        owner = msg.sender;
        _setUser("roberta", 0x502542668aF09fa7aea52174b9965A7799343Df7);
        _setUser("nome1",  0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        _setUser("nome2",  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        _setUser("nome3",  0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        _setUser("nome4",  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        _setUser("nome5",  0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
        _setUser("nome6",  0x976EA74026E726554dB657fA54763abd0C3a0aa9);
        _setUser("nome7",  0x14dC79964da2C08b23698B3D3cc7Ca32193d9955);
        _setUser("nome8",  0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f);
        _setUser("nome9",  0xa0Ee7A142d267C1f36714E4a8F75612F20a79720);
        _setUser("nome10", 0xBcd4042DE499D14e55001CcbB24a551F3b954096);
        _setUser("nome11", 0x71bE63f3384f5fb98995898A86B02Fb2426c5788);
        _setUser("nome12", 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a);
        _setUser("nome13", 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec);
        _setUser("nome14", 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097);
        _setUser("nome15", 0xcd3B766CCDd6AE721141F452C550Ca635964ce71);
        _setUser("nome16", 0x2546BcD3c84621e976D8185a91A922aE77ECEc30);
        _setUser("nome17", 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E);
        _setUser("nome18", 0xdD2FD4581271e230360230F9337D5c0430Bf44C0);
        _setUser("nome19", 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199);
    }

    // Modifiers:
    modifier onlyOwnerOrProfessora() {
        require(
            msg.sender == owner || msg.sender == users[PROFESSORA],
            "Only owner or professora"
        );
        _;
    }

    // So quem ta no mapping pode votar
    modifier onlyAuthorized() {
        require(bytes(codinomeOf[msg.sender]).length > 0, "User not authorized");
        _;
    }


    // Cadastra ou atualiza um usuario
    function _setUser(string memory codinome, address addr) internal {
        address antigo = users[codinome];

        if (antigo == address(0)) {
            codinomes.push(codinome);
        } else {
            delete codinomeOf[antigo];
        }

        users[codinome] = addr;
        codinomeOf[addr] = codinome;
    }

    
    function updateUser(string memory codinome, address user_addr)
        external
        onlyOwnerOrProfessora
    {
        require(bytes(codinome).length > 0, "Codinome cannot be empty"); // Tem q converter pra bytes

        _setUser(codinome, user_addr);
    }


    function votingOn() external onlyOwnerOrProfessora {
        voting = true;
    }

    function votingOff() external onlyOwnerOrProfessora {
        voting = false;
    }


    function issueToken(string memory codinome, uint256 qtde_de_Turings)
        external
        onlyOwnerOrProfessora
    {
        address destino = users[codinome]; // Traduzir codinome em endereco
        require(destino != address(0), "User not found");

        _mint(destino, qtde_de_Turings);
    }


    function vote(string memory codinome, uint256 qtde_de_Turings)
        external
        onlyAuthorized // 2: so usuarios autorizados
    {

        require(voting, "Voting is not active"); // 1: a votacao tem que estar ativa

        string memory votante = codinomeOf[msg.sender];
        address destino = users[codinome];

        require(destino != address(0), "User not found");

        require(destino != msg.sender, "Cannot vote for yourself"); // 3: nao pode votar em si mesmo

        require(
            qtde_de_Turings > 0 && qtde_de_Turings <= 2 * 10 ** decimals(),
            "Amount must be > 0 and <= 2 Turings" // 4: 0 < qtde <= 2 Turings
        );

        require(!hasVote[votante][codinome], "Already voted for this user"); // 5: so pode votar uma vez no mesmo codinome

        hasVote[votante][codinome] = true;
        _mint(destino, qtde_de_Turings);

        // Bonus:
        voteCount[votante] += 1;
        if (voteCount[votante] % 10 == 0) {
            _mint(msg.sender, 10 ** decimals()); // a cada 10 votos, ganha 1 Turing
        }
    }


    function getCodinomes() external view returns (string[] memory) {
        return codinomes;
    }
}