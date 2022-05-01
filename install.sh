yarn install
cd solana_integration && git clone https://github.com/metaplex-foundation/metaplex.git
cd solana_integration/metaplex/js && yarn install && yarn bootstrap && yarn build
cd ~/darkcrystalnft2 && sudo ./setup_domain.sh
