yarn install
cd solana_integration && git clone https://github.com/metaplex-foundation/metaplex.git
cd metaplex/js && yarn install && yarn bootstrap && yarn build
cd ../../../
cd solana_integration && git clone https://github.com/metaplex-foundation/metaplex-program-library.git
cd metaplex-program-library && cargo build
cd ../../
sudo ./setup_domain.sh

