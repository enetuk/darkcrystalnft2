# Устанавливаем код

cd ~/ && git clone https://enetuk@github.com/enetuk/darkcrystalnft2.git

>Скрипт установки metaplex, зависимостей, установка домена для загрузки metadata и картинок

cd ~/darkcrystalnft2 && ./install.sh


# Использование клиента

> Генерирование одного лутбокса 0 - Simple, 1 - Rare, 2 - Legendary , 3 - Epic

cd ~/darkcrystalnft2/ && node index.js create_lootbox --keypair ~/.config/solana/id.json  --mod 0