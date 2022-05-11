

var fs = require('fs');


//Читаем настройки (данный файл создается скриптом ./setup_domain.sh)
//"url_path": "https://$domain/nft/" - URL-путь по которому будут зранится NFT
//"file_path": "/home/ubuntu/www/$domain/nft/" - Путь в файловой системе где будут хранится NFT
//"seller_fee_basis_points": 100 -  комиссия создателя при перепродаже
//
var config = JSON.parse(fs.readFileSync("./config.json"));
exports.config = config;



//Работа с изоборажениями
const { createCanvas, loadImage } = require("canvas");


/*
Шансы выпадения:
Обычные: 57.5%
Редкие: 31.25%
Легендарные: 10%
Эпические: 1.25%
*/
const modChances = [0.575, 0.3125, 0.1, 0.0125];
exports.modChances = modChances;

//Названия фракций
const fractionNames = ["Сommittee", "Picnic", "Church", "Phalanx", "Fops"];
exports.fractionNames = fractionNames;


//Названия классов
const classNames =  ["Recon", "Ranger", "Supporter", "Defender", "Assaulter"];
exports.classNames = classNames;


//Названия модификаторов
const modNames = ["", "Rare ", "Legendary ", "Epic "];
exports.modNames = modNames;

//Символ лутбокса
const modSymbols = ["DLB", "DLBR", "DLBL", "DLBE"]


//Генерирует случайное число от 0 до max-1
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
};
exports.getRandomInt = getRandomInt;

//Проверка существования файла
exports.fileExists = fileExists;

function fileExists(path) {
  var fs = require('fs');
  try  {
    return fs.statSync(path).isFile();
  }
  catch (e) {
    return false;
  }
};



//Путь на сервере к NFT-metadata
function pathMetadata(gen_id, fname){
  return config["file_path"] + gen_id + "/" + fname + ".json"
}
exports.pathMetadata = pathMetadata;

//Путь к исзображению на сервере
function pathImage(gen_id, fname){
  return config["file_path"] + gen_id + "/" + fname + ".png"
}
exports.pathImage = pathImage;

//URL на сервере к NFT-metadata
function urlMetadata(gen_id, fname){
  return config["url_path"] + gen_id + "/" + fname + ".json"
};
exports.urlMetadata = urlMetadata;

//URL на сервере к изображению NFT
function urlImage(gen_id, fname){
  return config["url_path"] + gen_id + "/" + fname + ".png"
};
exports.urlImage = urlImage;



//Ф-я для демонстрации. Генерация изображения NFT-лутбокаса, в зависимости от mod -  разный фон
function genNFTLootboxImage(mod, nft_hash, image_filename){
  var  canvas = createCanvas(400, 400);
  
  //Фон для лутбокса
  var Canvas = require('canvas');
  var bgimg = new Canvas.Image;
  //Подгружаем шаблон с фоном изображения 
  bgimg.src = fs.readFileSync("./game_related/img_tmpls/lootbox_" + mod + ".png");
  var ctx = canvas.getContext("2d");
  //Рисуем фон
  ctx.drawImage(bgimg, 0, 0, bgimg.width, bgimg.height);
  //Пишем поверх фона надпись с названием
  ctx.fillStyle = "black";
  ctx.font = "24px serif";
  ctx.fillText(nft_hash["name"], 20, 40);
  //Сохраняем изображение
  fs.writeFileSync(
    image_filename,
    canvas.toBuffer("image/png")
  );

}


//Создание лутбокса
exports.generateLootboxJSON = generateLootboxJSON;

function generateLootboxJSON(
  creator_pub_key,//адрес создателя
  gen_id,//id-генерации (уникальное значение, временная метка или можно брать из связанно записи в БД)
  fname,//Имя файла (без расширения)
  //Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический
  mod,
  //Комиссия создателя, 100 = 1%
  seller_fee_basis_points
){


  var nft_name = modNames[mod];
  if(nft_name != ""){
    nft_name = nft_name + " ";
  };
  nft_name = nft_name + "Lootbox"
  //Заполняем свойства NFT-токена
  var nft_hash = {
    //Имя токена = модификатор + "Lootbox"
    "name": nft_name,
    "symbol": modSymbols[mod],
    //Описание токена
    "description": nft_name,
    //Комиссия которую получает создатель токена (игра), при вторичных продажах
    //Royalty basis points that goes to creators in secondary sales (0-10000).
    "seller_fee_basis_points": seller_fee_basis_points,
    //Изображение токена
    "image": urlImage(gen_id, fname),
    //Харкатеристики (заполняем ниже)
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Lootbox",
      },
      {
        //Модификатор
        "trait_type": "Mod",
        "value": modNames[mod]
      }
    ],
    //Информация о создателе токена (кошелек игры)
    "properties": {
      "creators": [
        {
          "address": creator_pub_key,
          "share": 100
        }
      ]
    }
  };

  //Сохраняем в файл JSON с информацией об агенте
  var fs = require('fs');
  //Создаем директорию (если нет)
  var dir = require('path').dirname(pathMetadata(gen_id, fname));
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  };

  //Записываем файл 
  fs.writeFileSync(pathMetadata(gen_id, fname), JSON.stringify(nft_hash), 'utf8');

  //Для примера Генерируем изображение с изображением NFT,
  //можно закомментировать если изображение уже есть по указанному пути
  genNFTLootboxImage(mod, nft_hash, pathImage(gen_id, fname));



  //log.info(nft_hash);
  return nft_hash;

};



//Создание JSON агента
exports.generateAgentJSON = generateAgentJSON;

function generateAgentJSON(
  creator_pub_key,//адрес создателя
  //Имя файла для Изображения NFT-токена
  image_filename,
  //url Изображения NFT-токена
  image_url,
  //Фракция: 0 - Комитет, 1 - Пикник, 2 - Церковь, 3 - Фаланга, 4 - Хлыщи
  fraction,
  //Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический
  mod,
  //Комиссия создателя, 100 = 1%
  seller_fee_basis_points,
  //Имя файла для сохранения информации об NFT-токене
  filename,
){
  
  //Случайным образом выбираем класс
  var class_number = getRandomInt(6);


  //Заполняем свойства NFT-токена
  var nft_hash = {
    //Имя токена модификатор + фракция + класс
    "name": modNames[mod] + fractionNames[fraction] + " " + classNames[class_number],
    "symbol": "",
    //Описание токена
    "description": modNames[mod] + fractionNames[fraction] + " " + classNames[class_number],
    //Комиссия которую получает создатель токена (игра), при вторичных продажах
    //Royalty basis points that goes to creators in secondary sales (0-10000).
    "seller_fee_basis_points": seller_fee_basis_points,
    //Изображение токена
    "image": image_url,
    //Описание коллекции в которой будет этот NFT
    "collection": {
       "name": "DarkCrystal Agents",
       "family": "DarkCrystal" 
    },
    //Харкатеристики (заполняем ниже)
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Agent"
      },

      {
        "trait_type": "Fraction",
        "value": fractionNames[fraction]
      },
      {
        "trait_type": "Class",
        "value": classNames[class_number]
      },
      {
        "trait_type": "Mod",
        "value": modNames[mod]
      }
    ],
    //Информация о создателе токена (кошелек игры)
    "properties": {
      "creators": [
        {
          "address": creator_pub_key,
          "share": 100
        }
      ]
    }
  };

  //Заполняем Харкатеристики агента
  /*
  Комитет:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 125 - 150
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
  */
  var attributes = {};

  if(fraction == 0){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 125 + getRandomInt(26);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };
/*
Пикник:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 5 - 10
*/
  if(fraction == 1){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 5 + getRandomInt(6);
  };

/*
Церковь:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/
  if(fraction == 2){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };

/*
Фаланга:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 5 - 10
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/

  if(fraction == 3){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 5 + getRandomInt(6);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };

/*
Хлыщи:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 20 - 25 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/

  if(fraction == 4){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 20 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };  

  //Добавляем Влияние Модификаторов рангов на стартовые бонусы к статам
  /*
Редкий агент
Скорость: +1 – 2
Уклонение: +1 – 2
Физическая защита: +1 - 3
Псионическая защита: +1 - 3
Удача: +1 - 2
*/
  if(class_number == 1){
      attributes["Speed"] += (1 + getRandomInt(2));
      attributes["Evasion"] += (1 + getRandomInt(2));
      attributes["PhysicalResistance"] += (1 + getRandomInt(3));
      attributes["PsionicResistance"] += (1 + getRandomInt(3));
      attributes["Fortune"] += (1 + getRandomInt(2));
  };

  /*
Легендарный агент
Скорость: +3 - 4
Уклонение: +3 - 4
Физическая защита: +4 - 7
Псионическая защита: +4 - 7
Удача: +3 - 4
*/
  if(class_number == 2){
      attributes["Speed"] += (3 + getRandomInt(2));
      attributes["Evasion"] += (3 + getRandomInt(2));
      attributes["PhysicalResistance"] += (4 + getRandomInt(4));
      attributes["PsionicResistance"] += (4 + getRandomInt(4));
      attributes["Fortune"] += (3 + getRandomInt(2));
  };

  /*
Эпический агент
Скорость: +5 - 6
Уклонение: +5 - 6
Физическая защита: +8 - 10
Псионическая защита: +8 - 10
Удача: +5
*/
  if(class_number == 3){
      attributes["Speed"] += (5 + getRandomInt(2));
      attributes["Evasion"] += (5 + getRandomInt(2));
      attributes["PhysicalResistance"] += (8 + getRandomInt(3));
      attributes["PsionicResistance"] += (8 + getRandomInt(3));
      attributes["Fortune"] += 5;
  };

  Object.keys(attributes).forEach(function (key) {
    nft_hash["attributes"].push({"trait_type": key,  "value": attributes[key]});
  });

  //Сохраняем в файл JSON с информацией об агенте
  fs.writeFileSync(filename, JSON.stringify(nft_hash), 'utf8');
  //metadata = JSON.parse(fs.readFileSync(metadataLink));

  //Генерируем изображение


  var  canvas = createCanvas(400, 400);
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "blue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "24px serif";
  ctx.fillText(nft_hash["name"], 20, 100);

  //Сохраняем изображение
  fs.writeFileSync(
    image_filename,
    canvas.toBuffer("image/png")
  );


  //log.info(nft_hash);
  return nft_hash;
};

