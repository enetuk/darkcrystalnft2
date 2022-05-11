const mpl_token_metadata_1 = require("../solana_integration/metaplex/js/node_modules/@metaplex-foundation/mpl-token-metadata");
const anchor = require("../solana_integration/metaplex/js/node_modules/@project-serum/anchor");

const spl_token_1 = require("../solana_integration/metaplex/js/node_modules/@solana/spl-token");
const web3_js_1 = require("../solana_integration/metaplex/js/node_modules/@solana/web3.js");
const accounts_1 = require("../solana_integration/metaplex/js/packages/cli/build/helpers/accounts");

const mint_nft = require("../solana_integration/metaplex/js/packages/cli/build/commands/mint-nft");



const createMetadata = async (metadataLink, verifyCreators, collection, uses) => {
    // Metadata
    let metadata;
    try {
        metadata = await (await (0, node_fetch_1.default)(metadataLink, { method: 'GET' })).json();
    }
    catch (e) {
        //loglevel_1.default.debug(e);
        //loglevel_1.default.error('Invalid metadata at', metadataLink);
        console.log('Invalid metadata at', metadataLink);
        return;
    }
    return (0, mint_nft.validateMetadata)({
        metadata,
        uri: metadataLink,
        verifyCreators,
        collection,
        uses,
    });
};
exports.createMetadata = createMetadata;


const mintAsset = async (connection, walletKeypair, metadataLink, mutableMetadata = true, collection = null, maxSupply = 0, verifyCreators, use = null, receivingWallet = null) => {
    // Retrieve metadata
    const data = await (0, mint_nft.createMetadata)(metadataLink, verifyCreators, collection, use);
    if (!data)
        return;
    // Create wallet from keypair
    const wallet = new anchor.Wallet(walletKeypair);
    if (!(wallet === null || wallet === void 0 ? void 0 : wallet.publicKey))
        return;
    // Allocate memory for the account
    const mintRent = await connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span);
    // Generate a mint
    const mint = anchor.web3.Keypair.generate();
    const instructions = [];
    const signers = [mint, walletKeypair];
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: mintRent,
        space: spl_token_1.MintLayout.span,
        programId: spl_token_1.TOKEN_PROGRAM_ID,
    }));
    instructions.push(spl_token_1.Token.createInitMintInstruction(spl_token_1.TOKEN_PROGRAM_ID, mint.publicKey, 0, wallet.publicKey, wallet.publicKey));
    const userTokenAccoutAddress = await (0, accounts_1.getTokenWallet)(wallet.publicKey, mint.publicKey);
    instructions.push(spl_token_1.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccoutAddress, wallet.publicKey, wallet.publicKey));
    // Create metadata
    const metadataAccount = await (0, accounts_1.getMetadata)(mint.publicKey);
    instructions.push(...new mpl_token_metadata_1.CreateMetadataV2({ feePayer: wallet.publicKey }, {
        metadata: metadataAccount,
        metadataData: data,
        updateAuthority: wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
    }).instructions);
    instructions.push(spl_token_1.Token.createMintToInstruction(spl_token_1.TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccoutAddress, wallet.publicKey, [], 1));
    // Create master edition
    const editionAccount = await (0, accounts_1.getMasterEdition)(mint.publicKey);
    instructions.push(...new mpl_token_metadata_1.CreateMasterEditionV3({
        feePayer: wallet.publicKey,
    }, {
        edition: editionAccount,
        metadata: metadataAccount,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
        updateAuthority: wallet.publicKey,
        maxSupply: new anchor.BN(maxSupply),
    }).instructions);
    if (!mutableMetadata) {
        instructions.push(...new mpl_token_metadata_1.UpdateMetadataV2({}, {
            metadata: metadataAccount,
            metadataData: data,
            updateAuthority: walletKeypair.publicKey,
            primarySaleHappened: null,
            isMutable: false,
        }).instructions);
    }
    if (receivingWallet) {
        const derivedAccount = await (0, accounts_1.getTokenWallet)(receivingWallet, mint.publicKey);
        const createdAccountIx = spl_token_1.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, mint.publicKey, derivedAccount, receivingWallet, wallet.publicKey);
        const transferIx = spl_token_1.Token.createTransferInstruction(spl_token_1.TOKEN_PROGRAM_ID, userTokenAccoutAddress, derivedAccount, wallet.publicKey, signers, 1);
        const closeAccountIx = spl_token_1.Token.createCloseAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, userTokenAccoutAddress, wallet.publicKey, wallet.publicKey, signers);
        instructions.push(createdAccountIx, transferIx, closeAccountIx);
    }
    const res = await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, walletKeypair, instructions, signers);
    try {
        await connection.confirmTransaction(res.txid, 'max');
    }
    catch {
        // ignore
    }
    // Force wait for max confirmations
    await connection.getParsedTransaction(res.txid, 'confirmed');
    loglevel_1.default.info('NFT created', res.txid);
    loglevel_1.default.info('\nNFT: Mint Address is ', mint.publicKey.toBase58());
    loglevel_1.default.info('NFT: Metadata address is ', metadataAccount.toBase58());
    return { metadataAccount, mint: mint.publicKey };
};
exports.mintAsset = mintAsset;

