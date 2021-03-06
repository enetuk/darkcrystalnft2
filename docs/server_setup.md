# Установка (Ubuntu)

>Обновляем Linux

```bash
sudo apt update && sudo apt upgrade -y
```

>Устанавливаем Solana

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.9.9/install)"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"
```


>Генерируем ключ кошелька

```bash
solana-keygen new
```

>Переключаемся на тестовую сеть

```bash
solana config set --url https://api.devnet.solana.com
```


>Переводим себе 2 токена в тестовой сети

```bash
solana airdrop 2
```



>Устанавливаем nginx + SSL

```bash
sudo apt install nginx certbot -y

sudo mkdir /var/www/letsencrypt && sudo chown www-data:www-data /var/www/letsencrypt

sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096
```




>Устанавливаем nvm + nodejs

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

>Устанавливаем CARGO (компилятор rust)

```bash
sudo apt  install cargo libudev-dev
```

>Перед установкой должны быть настроены A-записи домена (@ + www) который будет использоваться для загрузки NFT

```bash
nvm install 14.17.6

npm install -g yarn 
```

>Устанавливаем код

cd ~/ && git clone https://enetuk@github.com/enetuk/darkcrystalnft2.git

>Скрипт установки metaplex, зависимостей, установка домена для загрузки metadata и картинок

cd ~/darkcrystalnft2 && ./install.sh

```

```bash
>Обновление кода

cd ~/darkcrystalnft && git pull
```


>Чтобы переустановить домен выполнить: (config.json будет перезаписан)

```bash
cd ~/darkcrystalnft && sudo chmod +x setup_domain.sh

sudo ~/darkcrystalnft/setup_domain.sh
```

>Вводим имя домена


