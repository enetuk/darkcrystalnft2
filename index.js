//Solana Integration
const mint_nft = require("./solana_integration/metaplex/js/packages/cli/build/commands/mint-nft");
const anchor = require("./solana_integration/metaplex/js/node_modules/@project-serum/anchor");
const various = require("./solana_integration/metaplex/js/packages/cli/build/helpers/various");
const accounts = require("./solana_integration/metaplex/js/packages/cli/build/helpers/accounts");
const commander = require("./solana_integration/metaplex/js/packages/cli/node_modules/commander");
const web3 = require("./solana_integration/metaplex/js/node_modules/@solana/web3.js");
const mpl_token_metadata = require("./solana_integration/metaplex/js/node_modules/@metaplex-foundation/mpl-token-metadata");


const sft = require("./solana_integration/fungible_assets.js")


//Work with files
const fs = require("fs");
const { exec } = require('child_process');
const fetch = require('node-fetch');


//Game Realted
const dark_metadata = require("./game_related/dark_metadata")



commander.program.version('1.0.0');
//Получение списка транзакций
commander.program
    .command("transactions")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Количество последних транзакций
    .option("-l, --limit <number>", "Get list of transactions")
    .action(async (directory, cmd) => {
        //Параметры командной строки
        const { keypair, env, limit} = cmd.opts();
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);
        console.log("Get transactions for " + walletKeyPair.publicKey.toBase58());
        //Соединяемся с блокчейном
        const solConnection = new web3.Connection(various.getCluster(env));

        //Получаем limit последних транзакций
        var txs = await solConnection.getConfirmedSignaturesForAddress2(walletKeyPair.publicKey, {limit: parseInt(limit)});
        for(var i = 0; i < txs.length; i++){
            console.log("N" + (i+1).toString());
            console.log(txs[i]);
            //Получаем информацию о транзакции
            var tx_info = await solConnection.getConfirmedTransaction(txs[i].signature);
            console.log("tx info:");
            console.log(tx_info);
            console.log("---");
        };    
});
//Создание одного лутбокса
commander.program
    .command("create_lootbox")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Мод лутбокса (0 - Simple, 1 - Rare, 2 - Legendary , 3 - Epic)
    .requiredOption('-m, --mod <number>', `Mod Number, 0 - Simple, 1 - Rare, 2 - Legendary , 3 - Epic`, '--mod not provided')
    //Коллеция (PubKey). Коллекция - такой же NFT который должен быть сгенерирован
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.')
	.action(async (directory, cmd) => {
	    console.log("create_lootbox");
        //Получаем параметры запуска команды
        const { keypair, env, url, collection, mod} = cmd.opts();
        //Соединяемся с блокчейном        
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));
        //Коллекция
        let collectionKey;
        if (collection !== undefined) {
            collectionKey = new web3.PublicKey(collection);
        }
        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);


        console.log("Generate NFT for " + walletKeyPair.publicKey.toBase58());
        //Временная метка генерации (можно сделать синхронизацию с БД по ID в БД, а не использовать время)
        var gen_id = new Date().getTime();
        //Имя файла
        var fname = "lootbox" + mod + "_0";
        //Генерируем NFT-metadata
        dark_metadata.generateLootboxJSON(walletKeyPair.publicKey.toBase58(), gen_id, fname, parseInt(mod),  dark_metadata.config["seller_fee_basis_points"]);
        console.log("mint NFT from metadata: " + dark_metadata.urlMetadata(gen_id, fname));
        var new_mint =await (0, mint_nft.mintNFT)(solConnection, walletKeyPair, dark_metadata.urlMetadata(gen_id, fname), true, collectionKey, 0);
        //Выводим адрес NFT
        console.log("new mint address:" + new_mint.mint.toBase58());

});


//Генерирование nft-лутбоксов по нужным вероятностям в количестве --cont-nft
commander.program
    .command("create_lootboxes")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Количество лутбоксов
    .requiredOption("-cn, --count-nft <number>")
    //Коллеция (PubKey). Коллекция - такой же NFT который должен быть сгенерирован
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.')

    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, collection, countNft} = cmd.opts();
        console.log("Generate " + countNft + " lootboxes...");
        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);
        //Временная метка генерации
        var gen_id = new Date().getTime();
        //Соединяемся с блокчейном
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));


        //Получаем баланс
        var balance = await solConnection.getBalance(walletKeyPair.publicKey)
        console.log("Balance: " + (balance / 1000000000).toString() + " SOL"); 



        let collectionKey;
        if (collection !== undefined) {
            console.log("collection: " + collection);
            collectionKey = new web3.PublicKey(collection);
        }

        //Временная метка генерации
        var gen_id = new Date().getTime();

        //Цикл по видам лутбокса (обычный - эпический)
        for(var mod=0; mod<dark_metadata.modChances.length; mod++){
            var fname = "lootboxes" + mod;

            var count = Math.round(countNft*dark_metadata.modChances[mod]);
            if(count > 0){
                console.log("Count  " + dark_metadata.modNames[parseInt(mod)] + " Lootboxes: " + count)
                //Генерируем NFT-metadata
                dark_metadata.generateLootboxJSON(walletKeyPair.publicKey.toBase58(), gen_id, fname, parseInt(mod),  dark_metadata.config["seller_fee_basis_points"]);
                //Минтим Fungible Assets

                var new_mint = await (0, sft.mintAsset)(solConnection, walletKeyPair, dark_metadata.urlMetadata(gen_id, fname), true, collectionKey, count);
                //Выводим адрес NFT
                console.log("new mint address:" + new_mint.mint.toBase58());

                //Подтверждаем колллекцию
                if (collection !== undefined) {
                    console.log("Verify collection...")
                    await (0, mint_nft.verifyCollection)(new_mint.mint, solConnection, walletKeyPair, collectionKey);
                };

            };


        };

        //Получаем баланс
        var new_balance = await solConnection.getBalance(walletKeyPair.publicKey)
        console.log("Balance: " + (new_balance / 1000000000).toString() + " SOL (change: " + ((new_balance - balance)/1000000000) + " SOL)"); 

});



//Генерация агента
commander.program
    .command("generate_agent_nft")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Модификатор
    .requiredOption("-m, --mod <number>", `Mod`, '--mod not provided')
    //Фракция
    .requiredOption("-f, --fraction <number>", `Fraction`, '--fraction not provided')
    //Коллеция (PubKey). Коллекция - такой же NFT который должен быть сгенерирован
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.')
    //Получатель NFT (кому его перевести после минтинга)
    .option('-w, --to-wallet <string>', 'Optional: Wallet to receive nft. Defaults to keypair public key')

    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, url, collection, mod, fraction, toWallet} = cmd.opts();
        console.log("Generate agent mod " + dark_metadata.modNames[parseInt(mod)] + " " + dark_metadata.fractionNames[parseInt(fraction)])


        //Соединяемся с блокчейном        
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));
        //Коллекция
        let collectionKey;
        if (collection !== undefined) {
            collectionKey = new web3.PublicKey(collection);
            console.log("collection: " + collection)
        }
        //Получатель NFT
        let receivingWallet;
        if (toWallet) {
            receivingWallet = new web3.PublicKey(toWallet);
        }

        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);


        console.log("Generate NFT for " + walletKeyPair.publicKey.toBase58());
        //Временная метка генерации (можно сделать синхронизацию с БД по ID в БД, а не использовать время)
        var gen_id = new Date().getTime();
        //Имя файла
        var fname = "agent" + mod + "_0";
        //Генерируем NFT-metadata
        dark_metadata.generateAgentJSON(walletKeyPair.publicKey.toBase58(), dark_metadata.pathImage(gen_id, fname), dark_metadata.urlImage(gen_id, fname) , parseInt(fraction), parseInt(mod), dark_metadata.config["seller_fee_basis_points"], dark_metadata.pathMetadata(gen_id, fname));

        console.log("mint NFT from metadata: " + dark_metadata.urlMetadata(gen_id, fname));
        var new_mint = await (0, mint_nft.mintNFT)(solConnection, walletKeyPair, dark_metadata.urlMetadata(gen_id, fname), true, collectionKey, 0, null, null, receivingWallet);


        //Подтверждаем колллекцию
        if (collection !== undefined) {
            console.log("Verify collection...")
            await (0, mint_nft.verifyCollection)(new_mint.mint, solConnection, walletKeyPair, collectionKey);
        };

       
        //Выводим адрес NFT
        console.log("new mint address:" + new_mint.mint.toBase58());


});

//Создание коллекции
commander.program
    .command("create_collection")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Название коллекции
    .requiredOption('-n, --name <string>', `Collection Name`, '--name not provided')
    //Описание коллекции
    .requiredOption('-d, --desc <string>', `Collection Description`, '--desc not provided')
    //Коллеция (PubKey). Коллекция - такой же NFT который должен быть сгенерирован
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.')
    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, url, name, desc, collection} = cmd.opts();

        //Соединяемся с блокчейном
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));

        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);

        //Коллекция
        let collectionKey;
        if (collection !== undefined) {
            collectionKey = new web3.PublicKey(collection);
            console.log("collection: " + collection)
        }


        console.log("Generate collection " + name)

        //Временная метка генерации
        var gen_id = new Date().getTime();

        var fname = "collection";

        //Генерируем json
        dark_metadata.generateCollectionJSON(name, desc, walletKeyPair.publicKey.toBase58(), gen_id, fname, dark_metadata.config["seller_fee_basis_points"])

        console.log("mint NFT from metadata: " + dark_metadata.urlMetadata(gen_id, fname));
       
        var new_mint = await (0, mint_nft.mintNFT)(solConnection, walletKeyPair, dark_metadata.urlMetadata(gen_id, fname), true, collectionKey, 0, null, null);

        //Выводим адрес NFT
        console.log("new mint address:" + new_mint.mint.toBase58());




});



//Ниже старые версии
//Старая версия! Генерирование nft-лутбоксов по нужным вероятностям в количестве --cont-nft как NFT
commander.program
    .command("create_lootboxes_as_nft")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Количество лутбоксов
    .requiredOption("-cn, --count-nft <number>")
    //Коллеция (PubKey). Коллекция - такой же NFT который должен быть сгенерирован
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.')

    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, collection, countNft} = cmd.opts();
        console.log("Generate " + countNft + " lootboxes...");
        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);
        //Временная метка генерации
        var gen_id = new Date().getTime();
        //Соединяемся с блокчейном
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));

        let collectionKey;
        if (collection !== undefined) {
            console.log("collection:  " + collection);
            collectionKey = new web3.PublicKey(collection);
        }
        //Получаем баланс
        var balance = await solConnection.getBalance(walletKeyPair.publicKey)
        console.log("Balance: " + (balance / 1000000000).toString() + " SOL"); 

        //Цикл по видам лутбокса (обычный - эпический)
        for(var mod=0; mod<dark_metadata.modChances.length; mod++){
            console.log("Count NFT Lootboxes " + dark_metadata.modNames[parseInt(mod)] + ": " + Math.round(countNft*dark_metadata.modChances[mod]))
            for(var i = 0; i<Math.round(countNft*dark_metadata.modChances[mod]); i ++){
                var fname = "lootbox" + mod + "_" + i;

                //Геренируем metadata
                dark_metadata.generateLootboxJSON(walletKeyPair.publicKey.toBase58(), gen_id, fname, mod, dark_metadata.config["seller_fee_basis_points"]);
                console.log("mint NFT from metadata: " + dark_metadata.urlMetadata(gen_id, fname));
                //Минтим NFT
                var new_mint = await (0, mint_nft.mintNFT)(solConnection, walletKeyPair, dark_metadata.urlMetadata(gen_id, fname), true, collectionKey, 0);
                //Выводим адрес NFT
                console.log("new mint address:" + new_mint.mint.toBase58());

                //Подтверждаем колллекцию
                if (collection !== undefined) {
                    await (0, mint_nft.verifyCollection)(new_mint.mint, solConnection, walletKeyPair, collectionKey);
                };
            };

        };
        //Получаем баланс
        var new_balance = await solConnection.getBalance(walletKeyPair.publicKey)
        console.log("Balance: " + (new_balance / 1000000000).toString() + " SOL (change: " + ((new_balance - balance)/1000000000) + " SOL)"); 


});


//Открытие лутбокса
commander.program
    .command("open_lootbox_as_nft")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Адрес токена
    .option("-ma, --mint-address <string>")
    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, mintAddress } = cmd.opts();
        console.log("Open lootbox " + mintAddress);
        //Соединяемся с блокчейном
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));
        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);


        let collectionKey;
    
        var mint_public_key = new web3.PublicKey(mintAddress);
        //Получаем аккаунт с metadata
        var metadataAccount = await accounts.getMetadata(mint_public_key);


        //Получаем metadata
        var info = await solConnection.getAccountInfo(metadataAccount);
        var meta = mpl_token_metadata.MetadataData.deserialize(info.data);

        //Получаем json-meta-дата лутбокса
        var metadata = await (await fetch(meta.data.uri, { method: 'GET' })).json();

        //Получаем тип NFT
        var nft_type = metadata['attributes'].find(element => (element['trait_type'] == "Type"));
        //Получаем модификатор (обычный...легендарный)
        var nft_mod = metadata['attributes'].find(element => (element['trait_type'] == "Mod"));
        //Проверяем создателя токена
        //console.log(meta.data.creators);
        //Если создатель токена совпадает с адресом кошелька и создатель подписан
        var nft_creator = meta.data.creators.find(element => (element.address == walletKeyPair.publicKey.toBase58()));
        if(nft_creator == undefined || nft_creator.verified != 1){
            //if(token_creator != walletKeyPair.publicKey.toBase58()){
            console.log("Address " + mint_public_key + " not created by " + walletKeyPair.publicKey.toBase58());
        }else 
        if(nft_type['value'] != "Lootbox"){
            console.log("NFT " + mint_public_key + " is not Lootbox");
        }else{
            console.log("Generate agent from lootbox...")

            //Меняем информацию о токене
            //Генерируем агента
            var fraction = dark_metadata.getRandomInt(5);
            console.log("fraction: " + fraction);
            //Генерируем агента
            //ПОлучаем модификатор лутбокса из метадаты лутбокса (имя в индекс)
            var mod = dark_metadata.modNames.indexOf(nft_mod["value"]);
            if(nft_mod < 0){
                console.log("Undefined mod " + nft_mod["value"]);
            }else{


                //Генерируем нового агента
                //Получаем локальный путь из URL
                var agent_file_path = meta.data.uri.replace(dark_metadata.config["url_path"], dark_metadata.config["file_path"]);
                //Путь к изобржению
                var agent_image_path = agent_file_path.replace(".json", ".png");
                //url изображения
                var image_url = meta.data.uri.replace(".json", ".png") + "?opened=1";
                //console.log(agent_file_path);
                dark_metadata.generateAgentJSON(walletKeyPair.publicKey.toBase58(), agent_image_path, image_url , fraction, mod, dark_metadata.config["seller_fee_basis_points"], agent_file_path);

               //Отправляем данные в блокчейн
                await mint_nft.updateMetadata(
                    mint_public_key,
                    solConnection,
                    walletKeyPair,
                    meta.data.uri + "?opened=1",
                    collectionKey,
                    undefined
                );
            };
        };
});



//Сжигание токена
commander.program
    .command("burn")
    //Сеть Solana: mainnet-beta, testnet, devnet
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    //Ключ кошелька
    .requiredOption('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
    //Ключ кошелька
    .requiredOption('-m, --mint <string>', `Address of mint for burn`, '--mint not provided')

    .action(async (directory, cmd) => {
        //Получаем параметры запуска команды
        const { keypair, env, mint} = cmd.opts();
        console.log("Burn " + mint);
        //Объект с кошельком из файла с ключем
        const walletKeyPair = (0, accounts.loadWalletKey)(keypair);
        //Соединяемся с блокчейном
        const solConnection = new anchor.web3.Connection((0, various.getCluster)(env));

        //Адрес токена
        var nft_public_key = new web3.PublicKey(mint);
        //Адрес аккаунта
        var token_accounts = await solConnection.getTokenAccountsByOwner(walletKeyPair.publicKey, {mint: nft_public_key});
        console.log("token_accounts");
        var token_account_address = token_accounts.value[0].pubkey.toString();
        var burn_cmd = "spl-token burn " + token_account_address + " 1";
        console.log(burn_cmd);
        exec(burn_cmd, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

});


commander.program.parse(process.argv);

