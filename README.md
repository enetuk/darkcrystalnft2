# Настройка сервера

Настройка сервера описана в файле docs/server_setup.md

# Установка

```bash
cd ~/ && git clone https://enetuk@github.com/enetuk/darkcrystalnft2.git
```

>Скрипт установки metaplex, зависимостей, установка домена для загрузки metadata и картинок

```bash
cd ~/darkcrystalnft2 && ./install.sh
```

# Использование клиента

> Генерирование одного лутбокса 0 - Simple, 1 - Rare, 2 - Legendary , 3 - Epic

```bash
cd ~/darkcrystalnft2/ && node index.js create_lootbox --keypair ~/.config/solana/id.json  --mod 0
```


> Генерирование лутбоксов в количестве -count-nft  согласно вероятностям

```bash
cd ~/darkcrystalnft2/ && node index.js create_lootboxes --keypair ~/.config/solana/id.json  --count-nft 4
```

> Генерация агента

Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический

Фракция: 0 - Комитет, 1 - Пикник, 2 - Церковь, 3 - Фаланга, 4 - Хлыщи


```bash
cd ~/darkcrystalnft2/ && node index.js generate_agent_nft --keypair ~/.config/solana/id.json  --mod 1 --fraction 1
```




